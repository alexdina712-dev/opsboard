import { useState } from 'react';
import { Modal, ErrorNotice } from './ui';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, json } from '../lib/api';
import { errorMessage, inputDate, isoDate, labels } from '../lib/format';
import { projectSchema, projectStatuses } from '../../shared/validation';
import type { Project } from '../types';
export function ProjectEditor({
  project,
  close,
  saved,
}: {
  project?: Project;
  close: () => void;
  saved: () => void;
}) {
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    try {
      const parsed = projectSchema.safeParse({
        ...values,
        ownerId: values.ownerId || null,
        deadline: isoDate(String(values.deadline)),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await api(
        ws.path(`/projects${project ? '/' + project.id : ''}`),
        json(project ? 'PUT' : 'POST', parsed.data),
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
  return (
    <Modal title={project ? 'Edit project' : 'Create a project'} close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
        className="editor-form"
      >
        <ErrorNotice message={error} />
        <label>
          Project name
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={project?.name}
            placeholder="e.g. Customer portal launch"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={3000}
            rows={4}
            defaultValue={project?.description}
            placeholder="What are we working toward?"
          />
        </label>
        <div className="form-grid">
          <label>
            Project owner
            <select name="ownerId" defaultValue={project?.ownerId || ''}>
              <option value="">No owner yet</option>
              {ws.members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={project?.status || 'ACTIVE'}>
              {projectStatuses.map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deadline
            <input type="date" name="deadline" defaultValue={inputDate(project?.deadline)} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button" onClick={close}>
            Cancel
          </button>
          <button disabled={busy} className="button primary">
            {busy ? 'Saving…' : project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
