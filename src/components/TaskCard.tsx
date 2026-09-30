import { CalendarDays, MessageSquare, GripVertical } from 'lucide-react';
import { Avatar, Badge } from './ui';
import { dateLabel, labels } from '../lib/format';
import { statuses } from '../../shared/validation';
import type { Task } from '../types';
export function TaskCard({
  task,
  open,
  changeStatus,
  disabled,
}: {
  task: Task;
  open: () => void;
  changeStatus: (status: string) => void;
  disabled: boolean;
}) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  return (
    <article
      className="task-card"
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="task-card-head">
        <span>{task.project.name}</span>
        <GripVertical aria-hidden="true" size={15} />
      </div>
      <button className="task-title" onClick={open}>
        {task.title}
      </button>
      <div className="task-tags">
        {task.tags.slice(0, 3).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="task-card-info">
        <Badge value={task.priority} />
        <span className={overdue ? 'overdue' : ''}>
          <CalendarDays size={13} />
          {dateLabel(task.dueDate)}
        </span>
      </div>
      <div className="task-card-bottom">
        <select
          aria-label={`Status for ${task.title}`}
          value={task.status}
          disabled={disabled}
          onChange={(e) => changeStatus(e.target.value)}
        >
          {statuses.map((s) => (
            <option value={s} key={s}>
              {labels[s]}
            </option>
          ))}
        </select>
        <span className="comment-count">
          <MessageSquare size={13} />
          {task._count.comments}
        </span>
        {task.assignee ? (
          <Avatar name={task.assignee.name} small />
        ) : (
          <span className="unassigned" title="Unassigned">
            —
          </span>
        )}
      </div>
    </article>
  );
}
