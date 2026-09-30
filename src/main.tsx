import React, { Component, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { WorkspaceProvider } from './hooks/useWorkspace';
import { Layout } from './components/Layout';
import { Loading, ErrorNotice } from './components/ui';
import { AuthPage } from './pages/AuthPage';
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProjectsPage = lazy(() =>
  import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const TasksPage = lazy(() => import('./pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const ActivityPage = lazy(() =>
  import('./pages/ActivityPage').then((m) => ({ default: m.ActivityPage })),
);
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })));
import './styles.css';
class ErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error(error);
  }
  render() {
    return this.state.failed ? (
      <div className="state">
        <h1>We hit an unexpected problem.</h1>
        <p>Reload OpsBoard to try again.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload application
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Protected() {
  const { user, loading, error, refresh } = useAuth();
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="state">
        <ErrorNotice message={error} />
        <button className="button" onClick={() => void refresh()}>
          Retry connection
        </button>
      </div>
    );
  return user ? (
    <WorkspaceProvider>
      <Outlet />
    </WorkspaceProvider>
  ) : (
    <Navigate to="/login" replace />
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route element={<Protected />}>
                <Route element={<Layout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="activity" element={<ActivityPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
