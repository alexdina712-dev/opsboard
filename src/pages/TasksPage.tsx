import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Columns3, List, SlidersHorizontal, X, Download } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, json } from '../lib/api';
import { dateLabel, errorMessage, labels } from '../lib/format';
import { statuses, priorities } from '../../shared/validation';
import { TaskEditor } from '../components/TaskEditor';
import { TaskCard } from '../components/TaskCard';
import { PageHeading, ErrorNotice, Loading, Empty, Badge, Avatar } from '../components/ui';
import type { Task } from '../types';
export function TasksPage() {
  const ws = useWorkspace();
  const [params, setParams] = useSearchParams(),
    [tasks, setTasks] = useState<Task[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [view, setView] = useState(localStorage.getItem('opsboard-view') || 'board'),
    [more, setMore] = useState(false),
    [editor, setEditor] = useState<Task | 'new' | null>(null),
    [initialStatus, setInitialStatus] = useState('BACKLOG'),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(''),
    [dragOver, setDragOver] = useState('');
  const query = params.toString();
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    const timeout = setTimeout(() => {
      void api<Task[]>(ws.path('/tasks') + (query ? '?' + query : ''))
        .then((t) => {
          if (live) {
            setTasks(t);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (live) {
            setError(errorMessage(e));
            setLoading(false);
          }
        });
    }, 180);
    return () => {
      live = false;
      clearTimeout(timeout);
    };
  }, [ws.org?.id, query, version]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  async function changeStatus(task: Task, status: string) {
    setBusy(task.id);
    setError('');
    try {
      const updated = await api<Task>(
        ws.path(`/tasks/${task.id}/status`),
        json('PATCH', { status }),
      );
      setTasks((old) => old.map((t) => (t.id === task.id ? updated : t)));
      void ws.reload();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  function create(status = 'BACKLOG') {
    setInitialStatus(status);
    setEditor('new');
  }
  function exportCsv() {
    const escape = (v: unknown) =>
      '"' +
      String(v ?? '')
        .replace(/"/g, '""')
        .replace(/^[=+@-]/, "'") +
      '"';
    const lines = [
      ['Title', 'Project', 'Status', 'Priority', 'Assignee', 'Due date', 'Tags'],
      ...tasks.map((t) => [
        t.title,
        t.project.name,
        labels[t.status],
        labels[t.priority],
        t.assignee?.name,
        t.dueDate,
        t.tags.join(', '),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + lines.map((l) => l.map(escape).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opsboard-tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  const hasProjects = ws.projects.some((p) => !p.archived),
    filterCount = [...params.keys()].filter((k) => k !== 'q').length;
  return (
    <>
      <PageHeading
        eyebrow="MAKE WORK HAPPEN"
        title="Tasks"
        description="From a good idea to a job well done. One step at a time."
        action={
          <button className="button primary" disabled={!hasProjects} onClick={() => create()}>
            <Plus size={17} />
            Create task
          </button>
        }
      />
      <div className="task-toolbar">
        <div className="view-switch">
          <button
            className={view === 'board' ? 'selected' : ''}
            onClick={() => {
              setView('board');
              localStorage.setItem('opsboard-view', 'board');
            }}
          >
            <Columns3 size={16} />
            Board
          </button>
          <button
            className={view === 'list' ? 'selected' : ''}
            onClick={() => {
              setView('list');
              localStorage.setItem('opsboard-view', 'list');
            }}
          >
            <List size={16} />
            List
          </button>
        </div>
        <div className="task-toolbar-right">
          <button
            className="button compact"
            onClick={exportCsv}
            disabled={loading || !tasks.length}
          >
            <Download size={15} />
            Export
          </button>
          <span className="muted text-small">{tasks.length} tasks</span>
        </div>
      </div>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={params.get('q') || ''}
            onChange={(e) => filter('q', e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by project"
          value={params.get('project') || ''}
          onChange={(e) => filter('project', e.target.value)}
        >
          <option value="">All projects</option>
          {ws.projects
            .filter((p) => !p.archived)
            .map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filter by user"
          value={params.get('user') || ''}
          onChange={(e) => filter('user', e.target.value)}
        >
          <option value="">All assignees</option>
          {ws.members.map((m) => (
            <option value={m.user.id} key={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </select>
        <button
          className={`button compact ${more ? 'active-filter' : ''}`}
          onClick={() => setMore(!more)}
        >
          <SlidersHorizontal size={15} />
          Filters {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
        </button>
        {params.size > 0 && (
          <button
            className="icon-button"
            aria-label="Clear all filters"
            onClick={() => setParams({})}
          >
            <X size={17} />
          </button>
        )}
      </div>
      {more && (
        <div className="advanced-filters">
          <label>
            Status
            <select
              value={params.get('status') || ''}
              onChange={(e) => filter('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option value={s} key={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={params.get('priority') || ''}
              onChange={(e) => filter('priority', e.target.value)}
            >
              <option value="">All priorities</option>
              {priorities.map((s) => (
                <option value={s} key={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <select value={params.get('due') || ''} onChange={(e) => filter('due', e.target.value)}>
              <option value="">Any time</option>
              <option value="overdue">Overdue</option>
              <option value="week">Next 7 days</option>
              <option value="none">No due date</option>
            </select>
          </label>
          <label>
            Tag
            <input
              value={params.get('tag') || ''}
              onChange={(e) => filter('tag', e.target.value)}
              placeholder="e.g. Design"
              maxLength={30}
            />
          </label>
        </div>
      )}
      <ErrorNotice message={error} />
      {error && (
        <button className="button" onClick={() => setVersion((v) => v + 1)}>
          Retry loading tasks
        </button>
      )}
      {loading ? (
        <Loading />
      ) : !hasProjects ? (
        <Empty
          title="Give your tasks a home"
          detail="Create a project first, then add tasks to move it forward."
        />
      ) : !tasks.length ? (
        <Empty
          title={params.size ? 'No tasks match these filters' : 'A fresh board, a new beginning'}
          detail={
            params.size
              ? 'Try a different search or clear your filters.'
              : 'Add the first task and give your team a clear next step.'
          }
          action={
            params.size ? (
              <button className="button" onClick={() => setParams({})}>
                Clear filters
              </button>
            ) : (
              <button className="button primary" onClick={() => create()}>
                Create a task
              </button>
            )
          }
        />
      ) : view === 'board' ? (
        <div className="kanban">
          {statuses.map((s) => (
            <section
              key={s}
              className={`kanban-column ${s.toLowerCase()} ${dragOver === s ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(s);
              }}
              onDragLeave={() => setDragOver('')}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver('');
                const task = tasks.find((t) => t.id === e.dataTransfer.getData('text/plain'));
                if (task && task.status !== s) void changeStatus(task, s);
              }}
            >
              <div className="column-heading">
                <h2>
                  <span className="status-dot" />
                  {labels[s]}
                  <span className="column-count">{tasks.filter((t) => t.status === s).length}</span>
                </h2>
                <button
                  className="icon-button"
                  aria-label={`Add task to ${labels[s]}`}
                  onClick={() => create(s)}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="column-tasks">
                {tasks
                  .filter((t) => t.status === s)
                  .map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      disabled={busy === t.id}
                      open={() => setEditor(t)}
                      changeStatus={(status) => void changeStatus(t, status)}
                    />
                  ))}
                {!tasks.some((t) => t.status === s) && (
                  <div className="column-empty">
                    Drop a task here
                    <br />
                    or create something new.
                  </div>
                )}
              </div>
              <button className="add-task" onClick={() => create(s)}>
                <Plus size={16} />
                Add task
              </button>
            </section>
          ))}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button className="table-task" onClick={() => setEditor(t)}>
                      {t.title}
                    </button>
                    <span className="table-tags">{t.tags.join(' · ')}</span>
                  </td>
                  <td>{t.project.name}</td>
                  <td>
                    <select
                      aria-label={`Status for ${t.title}`}
                      value={t.status}
                      disabled={busy === t.id}
                      onChange={(e) => void changeStatus(t, e.target.value)}
                    >
                      {statuses.map((s) => (
                        <option value={s} key={s}>
                          {labels[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Badge value={t.priority} />
                  </td>
                  <td>
                    {t.assignee ? (
                      <span className="owner">
                        <Avatar small name={t.assignee.name} />
                        {t.assignee.name}
                      </span>
                    ) : (
                      'Unassigned'
                    )}
                  </td>
                  <td
                    className={
                      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
                        ? 'overdue'
                        : ''
                    }
                  >
                    {dateLabel(t.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editor && (
        <TaskEditor
          task={editor === 'new' ? undefined : editor}
          initialStatus={initialStatus}
          initialProject={params.get('project') || undefined}
          close={() => setEditor(null)}
          saved={() => setVersion((v) => v + 1)}
        />
      )}
    </>
  );
}
