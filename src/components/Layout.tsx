import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Layers3,
  LayoutDashboard,
  FolderKanban,
  SquareCheck,
  Activity,
  Users,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { Avatar, Loading, ErrorNotice, Empty } from './ui';
const navigation = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/tasks', label: 'Tasks', icon: SquareCheck },
  { path: '/activity', label: 'Activity', icon: Activity },
  { path: '/team', label: 'Team & workspace', icon: Users },
];
export function Layout() {
  const { user, logout } = useAuth(),
    ws = useWorkspace(),
    location = useLocation();
  const [open, setOpen] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/" className="brand">
          <span className="brand-icon">
            <Layers3 size={22} />
          </span>
          OpsBoard<span className="brand-dot">.</span>
        </NavLink>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="workspace-select">
          <span className="workspace-logo">N</span>
          <div>
            <span className="tiny-label">WORKSPACE</span>
            <select
              aria-label="Current organization"
              value={ws.org?.id || ''}
              onChange={(e) => ws.select(e.target.value)}
            >
              {ws.organizations.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
              {!ws.org && <option value="">Your workspace</option>}
            </select>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink
              aria-label={label}
              end={path === '/'}
              key={path}
              to={path}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
              {path === '/tasks' && (
                <span className="nav-counter">
                  {ws.projects.reduce(
                    (sum, p) =>
                      sum + (p.archived ? 0 : p.tasks.filter((t) => t.status !== 'DONE').length),
                    0,
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-symbol">✳</span>
          <h4>Small steps. Big progress.</h4>
          <p>Your next great outcome starts with one clear task.</p>
          <NavLink to="/tasks">
            Find your focus <ArrowUpRight size={15} />
          </NavLink>
        </div>
        <div className="user-menu">
          <Avatar name={user!.name} />
          <div>
            <strong>{user!.name}</strong>
            <span>
              {ws.org?.memberships[0]?.role === 'ADMIN' ? 'Workspace admin' : 'Team member'}
            </span>
          </div>
          <button
            aria-label="Log out"
            title="Log out"
            className="icon-button"
            onClick={() => {
              void logout().catch((e) => setError(e.message));
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{' '}
              <strong>
                {navigation.find((n) => n.path === location.pathname)?.label || 'Overview'}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="live-dot" />
            Workspace connected <Avatar name={user!.name} small />
          </div>
        </header>
        <main>
          <ErrorNotice message={error || ws.error} />
          {ws.error ? (
            <button className="button" onClick={() => void ws.reload()}>
              Retry loading workspace
            </button>
          ) : ws.loading ? (
            <Loading />
          ) : !ws.org && location.pathname !== '/team' ? (
            <Empty
              title="Your team starts here"
              detail="Create a workspace or join your team with an invitation code."
              action={
                <NavLink className="button primary" to="/team">
                  Set up workspace
                </NavLink>
              }
            />
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="app-footer">
          <span>
            OpsBoard <span>·</span> A calmer way to work
          </span>
          <span>{ws.org?.name || 'Your next chapter'}</span>
        </footer>
      </div>
    </div>
  );
}
