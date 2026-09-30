import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Modal, ErrorNotice, Avatar } from './ui';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, json } from '../lib/api';
import { errorMessage, inputDate, isoDate, labels, timeAgo } from '../lib/format';
import { taskSchema, statuses, priorities, commentSchema } from '../../shared/validation';
import type { Task, Comment } from '../types';
export function TaskEditor({
  task,
  initialStatus = 'BACKLOG',
  initialProject,
  close,
  saved,
}: {
  task?: Task;
  initialStatus?: string;
  initialProject?: string;
  close: () => void;
  saved: () => void;
}) {
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [comments, setComments] = useState<Comment[]>([]),
    [comment, setComment] = useState(''),
    [commentBusy, setCommentBusy] = useState(false);
  useEffect(() => {
    if (task)
      void api<Comment[]>(ws.path(`/tasks/${task.id}/comments`))
        .then(setComments)
        .catch((e) => setError(errorMessage(e)));
  }, [task?.id, ws.org?.id]);
  async function submit(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    try {
      const parsed = taskSchema.safeParse({
        ...values,
        assigneeId: values.assigneeId || null,
        dueDate: isoDate(String(values.dueDate)),
        tags: String(values.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await api(
        ws.path(`/tasks${task ? '/' + task.id : ''}`),
        json(task ? 'PUT' : 'POST', parsed.data),
      );
      await ws.reload();
      saved();
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function addComment() {
    setCommentBusy(true);
    setError('');
    try {
      const input = commentSchema.parse({ body: comment });
      const c = await api<Comment>(ws.path(`/tasks/${task!.id}/comments`), json('POST', input));
      setComments([...comments, c]);
      setComment('');
      saved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCommentBusy(false);
    }
  }
  return (
    <Modal title={task ? 'Task details' : 'Create a task'} close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
        className="editor-form"
      >
        <ErrorNotice message={error} />
        <label>
          Task title
          <input
            name="title"
            required
            minLength={2}
            maxLength={160}
            defaultValue={task?.title}
            placeholder="What needs to happen?"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={5000}
            rows={3}
            defaultValue={task?.description}
            placeholder="Add context and acceptance criteria…"
          />
        </label>
        <div className="form-grid">
          <label>
            Project
            <select
              name="projectId"
              required
              defaultValue={task?.projectId || initialProject || ''}
            >
              <option value="" disabled>
                Choose a project
              </option>
              {ws.projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Assignee
            <select name="assigneeId" defaultValue={task?.assigneeId || ''}>
              <option value="">Unassigned</option>
              {ws.members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={task?.status || initialStatus}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue={task?.priority || 'MEDIUM'}>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {labels[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input type="date" name="dueDate" defaultValue={inputDate(task?.dueDate)} />
          </label>
          <label>
            Tags <span className="field-hint">comma separated</span>
            <input
              name="tags"
              defaultValue={task?.tags.join(', ')}
              placeholder="Design, Operations"
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button" onClick={close}>
            Cancel
          </button>
          <button disabled={busy} className="button primary">
            {busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
      {task && (
        <section className="comments">
          <h3>
            Conversation <span>{comments.length}</span>
          </h3>
          {comments.length ? (
            comments.map((c) => (
              <div className="comment" key={c.id}>
                <Avatar name={c.author.name} small />
                <div>
                  <strong>{c.author.name}</strong>
                  <time>{timeAgo(c.createdAt)}</time>
                  <p>{c.body}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">Start the conversation. Share an update or ask a question.</p>
          )}
          <form
            className="comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              void addComment();
            }}
          >
            <label className="sr-only" htmlFor="comment">
              Add a comment
            </label>
            <textarea
              id="comment"
              required
              maxLength={2000}
              rows={2}
              placeholder="Write a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button disabled={commentBusy} className="button primary" aria-label="Post comment">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </Modal>
  );
}
