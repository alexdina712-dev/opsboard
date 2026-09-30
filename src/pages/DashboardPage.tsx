import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Plus,
  FolderKanban,
  Clock3,
  CheckCheck,
  CalendarDays,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { labels, dateLabel, errorMessage } from '../lib/format';
import { PageHeading, Loading, ErrorNotice, Badge, Avatar, Empty } from '../components/ui';
import { ActivityList } from '../components/ActivityList';
import { TaskEditor } from '../components/TaskEditor';
import type { Dashboard, Task } from '../types';
export function DashboardPage() {
  const ws = useWorkspace(),
    { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null),
    [tasks, setTasks] = useState<Task[]>([]),
    [error, setError] = useState(''),
    [editor, setEditor] = useState<Task | 'new' | null>(null),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError('');
    void Promise.all([api<Dashboard>(ws.path('/dashboard')), api<Task[]>(ws.path('/tasks'))])
      .then(([d, t]) => {
        if (live) {
          setData(d);
          setTasks(t);
        }
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      });
    return () => {
      live = false;
    };
  }, [ws.org?.id, version]);
  const today = new Date().toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const due = tasks
    .filter((t) => t.status !== 'DONE')
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    .slice(0, 4);
  if (error)
    return (
      <>
        <ErrorNotice message={error} />
        <button className="button" onClick={() => setVersion((v) => v + 1)}>
          Retry
        </button>
      </>
    );
  if (!data) return <Loading />;
  const total = Object.values(data.tasksByStatus).reduce((a, b) => a + b, 0),
    done = data.tasksByStatus.DONE || 0;
  const colors: Record<string, string> = {
    BACKLOG: '#b6c4bb',
    IN_PROGRESS: '#2c7562',
    IN_REVIEW: '#d9a95b',
    DONE: '#86aa96',
  };
  let start = 0;
  const segments = Object.entries(data.tasksByStatus).map(([s, n]) => {
    const from = start;
    start += total ? (n / total) * 100 : 0;
    return `${colors[s]} ${from}% ${start}%`;
  });
  return (
    <>
      <PageHeading
        eyebrow={today.toUpperCase()}
        title={`A little clarity, ${user!.name.split(' ')[0]}.`}
        description="Here's where things stand. Let's make today a good one."
        action={
          <button
            className="button primary"
            onClick={() => setEditor('new')}
            disabled={!ws.projects.some((p) => !p.archived)}
          >
            <Plus size={17} />
            Create task
          </button>
        }
      />
      <div className="welcome-banner">
        <div className="banner-icon">
          <Sparkles size={23} />
        </div>
        <div>
          <strong>Your team's next chapter is taking shape.</strong>
          <p>
            {data.overdueTasks
              ? `${data.overdueTasks} tasks need a little attention. A quick check-in can make all the difference.`
              : 'You’re on top of your deadlines. Keep the momentum going.'}
          </p>
        </div>
        <Link to={data.overdueTasks ? '/tasks?due=overdue' : '/tasks'}>
          View priorities <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="stat-grid">
        <Link to="/projects" className="stat-card">
          <span>
            Active projects <FolderKanban size={19} />
          </span>
          <strong>
            {data.activeProjects}
            <span className="stat-decoration">↗</span>
          </strong>
          <p>
            <span className="stat-dot green" />
            Ideas becoming outcomes
          </p>
        </Link>
        <Link to="/tasks?due=overdue" className="stat-card">
          <span>
            Overdue tasks <Clock3 size={19} />
          </span>
          <strong>
            {data.overdueTasks}
            <span className="stat-decoration amber">!</span>
          </strong>
          <p>
            <span className="stat-dot amber" />
            {data.overdueTasks ? 'Ready for your attention' : 'All caught up'}
          </p>
        </Link>
        <Link to="/tasks?status=DONE" className="stat-card">
          <span>
            Completed this week <CheckCheck size={19} />
          </span>
          <strong>
            {data.completedThisWeek}
            <span className="stat-decoration green">✓</span>
          </strong>
          <p>
            <span className="stat-dot green" />
            Progress worth celebrating
          </p>
        </Link>
      </div>
      <div className="dashboard-grid">
        <section className="panel priorities-panel">
          <div className="panel-header">
            <div>
              <h2>Coming up next</h2>
              <p>A few things to keep on your radar.</p>
            </div>
            <Link to="/tasks">
              All tasks <ArrowUpRight size={16} />
            </Link>
          </div>
          {due.length ? (
            <div className="due-list">
              {due.map((t) => (
                <button className="due-row" key={t.id} onClick={() => setEditor(t)}>
                  <span className="task-check" />
                  <div>
                    <strong>{t.title}</strong>
                    <span>{t.project.name}</span>
                  </div>
                  <Badge value={t.priority} />
                  <span
                    className={`due-date ${t.dueDate && new Date(t.dueDate) < new Date() ? 'overdue' : ''}`}
                  >
                    <CalendarDays size={14} />
                    {dateLabel(t.dueDate)}
                  </span>
                  {t.assignee && <Avatar small name={t.assignee.name} />}
                </button>
              ))}
            </div>
          ) : (
            <Empty title="A clear runway" detail="No open tasks. Create one when you're ready." />
          )}
        </section>
        <section className="panel status-panel">
          <div className="panel-header">
            <div>
              <h2>Work in motion</h2>
              <p>A snapshot of your task flow.</p>
            </div>
          </div>
          <div className="chart-layout">
            <div
              className="donut"
              role="img"
              aria-label={`${done} of ${total} tasks completed`}
              style={{ background: total ? `conic-gradient(${segments.join(',')})` : '#e5eae5' }}
            >
              <div>
                <strong>{total}</strong>
                <span>total tasks</span>
              </div>
            </div>
            <div className="chart-legend">
              {Object.entries(data.tasksByStatus).map(([s, n]) => (
                <Link to={`/tasks?status=${s}`} key={s}>
                  <span style={{ background: colors[s] }} />
                  {labels[s]}
                  <strong>{n}</strong>
                </Link>
              ))}
            </div>
          </div>
          <div className="chart-foot">
            <span>{total ? Math.round((done / total) * 100) : 0}% of tasks complete</span>
            <CheckCheck size={16} />
          </div>
        </section>
        <section className="panel project-summary">
          <div className="panel-header">
            <div>
              <h2>Project pulse</h2>
              <p>The bigger picture, at a glance.</p>
            </div>
            <Link to="/projects">
              All projects <ArrowUpRight size={16} />
            </Link>
          </div>
          {ws.projects
            .filter((p) => !p.archived)
            .slice(0, 4)
            .map((p, i) => {
              const percent = p.tasks.length
                ? Math.round(
                    (p.tasks.filter((t) => t.status === 'DONE').length / p.tasks.length) * 100,
                  )
                : 0;
              return (
                <Link to={`/tasks?project=${p.id}`} className="pulse-row" key={p.id}>
                  <span className={`project-icon tone-${i % 4}`}>
                    <FolderKanban size={19} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      {p.owner?.name || 'No owner'} · {dateLabel(p.deadline)}
                    </span>
                  </div>
                  <div className="pulse-progress">
                    <span>{percent}%</span>
                    <div className="progress-track">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          {!ws.projects.filter((p) => !p.archived).length && (
            <Empty
              title="Make your first move"
              detail="Create a project to give your team's work a home."
              action={
                <Link className="button" to="/projects">
                  Create a project
                </Link>
              }
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Around the workspace</h2>
              <p>The latest from your team.</p>
            </div>
            <Link to="/activity">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>
          <ActivityList activities={data.recentActivity.slice(0, 4)} />
        </section>
      </div>
      {editor && (
        <TaskEditor
          task={editor === 'new' ? undefined : editor}
          close={() => setEditor(null)}
          saved={() => {
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
