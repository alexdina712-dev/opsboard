import { useEffect, useState } from 'react';
import { Plus, Copy, RotateCcw, Users, Check } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import { api, json } from '../lib/api';
import { errorMessage } from '../lib/format';
import { organizationSchema, joinSchema } from '../../shared/validation';
import { PageHeading, Avatar, Modal, ErrorNotice } from '../components/ui';
export function TeamPage() {
  const ws = useWorkspace(),
    { user } = useAuth();
  const [mode, setMode] = useState<'create' | 'join' | null>(null),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  const admin = ws.org?.memberships[0]?.role === 'ADMIN';
  useEffect(() => {
    setCode('');
    setError('');
    if (admin)
      void api<{ inviteCode: string }>(ws.path('/invitation'))
        .then((d) => setCode(d.inviteCode))
        .catch((e) => setError(errorMessage(e)));
  }, [ws.org?.id, admin]);
  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setError('');
    try {
      const input = Object.fromEntries(new FormData(form));
      const parsed = (mode === 'create' ? organizationSchema : joinSchema).safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const org = await api<{ id: string }>(
        '/organizations' + (mode === 'join' ? '/join' : ''),
        json('POST', parsed.data),
      );
      ws.select(org.id);
      setMode(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function rotate() {
    setBusy(true);
    setError('');
    try {
      const d = await api<{ inviteCode: string }>(ws.path('/invitation/rotate'), json('POST'));
      setCode(d.inviteCode);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="BETTER, TOGETHER"
        title="Team & workspace"
        description="The people behind the progress. Make room for your team."
        action={
          <div className="heading-actions">
            <button
              className="button"
              onClick={() => {
                setError('');
                setMode('join');
              }}
            >
              Join workspace
            </button>
            <button
              className="button primary"
              onClick={() => {
                setError('');
                setMode('create');
              }}
            >
              <Plus size={17} />
              New workspace
            </button>
          </div>
        }
      />
      {!mode && <ErrorNotice message={error} />}
      <div className="team-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{ws.org?.name || 'Your workspace'}</h2>
              <p>
                {ws.org
                  ? `${ws.members.length} people making things happen.`
                  : 'Create or join an organization to get started.'}
              </p>
            </div>
            <Users size={21} className="muted" />
          </div>
          <div className="member-list">
            {ws.members.map((m) => (
              <div className="member-row" key={m.user.id}>
                <Avatar name={m.user.name} />
                <div>
                  <strong>
                    {m.user.name}
                    {m.user.id === user?.id && <span className="you-label">You</span>}
                  </strong>
                  <span>{m.user.email}</span>
                </div>
                <span className={`role-badge ${m.role === 'ADMIN' ? 'admin' : ''}`}>
                  {m.role === 'ADMIN' ? 'Admin' : 'Member'}
                </span>
              </div>
            ))}
          </div>
        </section>
        <div>
          <section className="panel invitation-panel">
            <h2>Good work is a team sport.</h2>
            <p>
              {admin
                ? 'Share this invitation code with a teammate. They can create an account and join this workspace.'
                : 'Ask a workspace admin for an invitation code to bring another teammate on board.'}
            </p>
            {admin && (
              <>
                <label>
                  Workspace invitation code
                  <input readOnly aria-label="Invitation code" value={code} />
                </label>
                <div className="invitation-actions">
                  <button
                    className="button primary"
                    disabled={!code}
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(code)
                        .then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2500);
                        })
                        .catch((e) => setError(errorMessage(e)));
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}{' '}
                    {copied ? 'Copied' : 'Copy code'}
                  </button>
                  <button className="button" disabled={busy || !code} onClick={() => void rotate()}>
                    <RotateCcw size={15} />
                    Regenerate
                  </button>
                </div>
                <p className="text-small muted">
                  Regenerating invalidates the previous code. Existing members keep their access.
                </p>
              </>
            )}
          </section>
          <div className="workspace-tip">
            <span>✳</span>
            <div>
              <h3>A place for every team.</h3>
              <p>
                You can belong to multiple workspaces. Switch between them using the menu in the
                sidebar.
              </p>
            </div>
          </div>
        </div>
      </div>
      {mode && (
        <Modal
          title={mode === 'create' ? 'Create a workspace' : 'Join your team'}
          close={() => setMode(null)}
        >
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            <ErrorNotice message={error} />
            {mode === 'create' ? (
              <label>
                Workspace name
                <input
                  required
                  name="name"
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g. Northstar Studio"
                />
              </label>
            ) : (
              <label>
                Invitation code
                <input
                  required
                  name="code"
                  minLength={10}
                  maxLength={100}
                  placeholder="Paste the code from your admin"
                />
              </label>
            )}
            <p className="muted text-small">
              {mode === 'create'
                ? 'You will be the admin of this new workspace.'
                : 'Your teammates and projects will be ready when you join.'}
            </p>
            <div className="modal-actions">
              <button type="button" className="button" onClick={() => setMode(null)}>
                Cancel
              </button>
              <button disabled={busy} className="button primary">
                {busy ? 'Please wait…' : mode === 'create' ? 'Create workspace' : 'Join workspace'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
