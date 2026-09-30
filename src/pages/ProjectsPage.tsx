import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowUpRight,
  CalendarDays,
  Archive,
  Pencil,
  RotateCcw,
  FolderKanban,
} from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { ProjectEditor } from '../components/ProjectEditor';
import { PageHeading, Badge, Avatar, Empty, ErrorNotice } from '../components/ui';
import { api, json } from '../lib/api';
import { dateLabel, errorMessage } from '../lib/format';
import type { Project } from '../types';
export function ProjectsPage() {
  const ws = useWorkspace();
  const [editor, setEditor] = useState<Project | 'new' | null>(null),
    [archived, setArchived] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  const projects = ws.projects.filter((p) => p.archived === archived);
  async function archive(project: Project) {
    setBusy(project.id);
    setError('');
    try {
      await api(
        ws.path(`/projects/${project.id}/archive`),
        json('PATCH', { archived: !project.archived }),
      );
      await ws.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="THE BIG PICTURE"
        title="Projects"
        description="Keep every initiative moving in the right direction."
        action={
          <button className="button primary" onClick={() => setEditor('new')}>
            <Plus size={17} />
            New project
          </button>
        }
      />
      <ErrorNotice message={error} />
      <div className="section-toolbar">
        <div className="tabs">
          <button className={!archived ? 'selected' : ''} onClick={() => setArchived(false)}>
            Current projects <span>{ws.projects.filter((p) => !p.archived).length}</span>
          </button>
          <button className={archived ? 'selected' : ''} onClick={() => setArchived(true)}>
            Archived <span>{ws.projects.filter((p) => p.archived).length}</span>
          </button>
        </div>
        <span className="muted text-small">A shared direction for your team</span>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p, i) => {
            const complete = p.tasks.filter((t) => t.status === 'DONE').length,
              progress = p.tasks.length ? Math.round((complete / p.tasks.length) * 100) : 0;
            return (
              <article className="project-card" key={p.id}>
                <div className="project-card-top">
                  <span className={`project-icon tone-${i % 4}`}>
                    <FolderKanban size={22} />
                  </span>
                  <Badge value={p.status} />
                </div>
                <h2>{p.name}</h2>
                <p className="project-description">
                  {p.description || 'Add a description to give your team a shared direction.'}
                </p>
                <div className="progress-caption">
                  <span>Task progress</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="project-meta">
                  <span>
                    {complete} of {p.tasks.length} tasks done
                  </span>
                  <span>
                    <CalendarDays size={14} />
                    {dateLabel(p.deadline)}
                  </span>
                </div>
                <div className="project-card-footer">
                  <span className="owner">
                    {p.owner ? (
                      <>
                        <Avatar name={p.owner.name} small />
                        {p.owner.name}
                      </>
                    ) : (
                      'No owner assigned'
                    )}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => setEditor(p)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      disabled={busy === p.id}
                      className="icon-button"
                      aria-label={`${p.archived ? 'Restore' : 'Archive'} ${p.name}`}
                      onClick={() => void archive(p)}
                    >
                      {p.archived ? <RotateCcw size={15} /> : <Archive size={15} />}
                    </button>
                    {!p.archived && (
                      <Link
                        aria-label={`View tasks for ${p.name}`}
                        className="icon-button"
                        to={`/tasks?project=${p.id}`}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title={archived ? 'No archived projects' : 'Every great outcome starts here'}
          detail={
            archived
              ? 'Archived projects will stay here with their tasks intact.'
              : 'Create your first project, give it an owner, and start breaking it into tasks.'
          }
          action={
            !archived && (
              <button className="button primary" onClick={() => setEditor('new')}>
                Create a project
              </button>
            )
          }
        />
      )}
      {editor && (
        <ProjectEditor
          project={editor === 'new' ? undefined : editor}
          close={() => setEditor(null)}
          saved={() => {}}
        />
      )}
    </>
  );
}
