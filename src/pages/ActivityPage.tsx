import { useEffect, useState } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { api } from '../lib/api';
import { errorMessage } from '../lib/format';
import { PageHeading, Loading, ErrorNotice } from '../components/ui';
import { ActivityList } from '../components/ActivityList';
import type { Activity } from '../types';
export function ActivityPage() {
  const ws = useWorkspace();
  const [data, setData] = useState<Activity[] | null>(null),
    [error, setError] = useState(''),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError('');
    void api<Activity[]>(ws.path('/activity'))
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      });
    return () => {
      live = false;
    };
  }, [ws.org?.id, version]);
  return (
    <>
      <PageHeading
        eyebrow="THE STORY OF YOUR WORK"
        title="Activity"
        description="A shared record of the decisions, updates, and progress along the way."
      />
      <ErrorNotice message={error} />
      {error ? (
        <button className="button" onClick={() => setVersion((v) => v + 1)}>
          Retry
        </button>
      ) : data ? (
        <section className="panel activity-page-panel">
          <div className="panel-header">
            <div>
              <h2>Workspace timeline</h2>
              <p>The latest 100 updates from your team.</p>
            </div>
            <span className="muted text-small">{data.length} updates</span>
          </div>
          <ActivityList activities={data} />
        </section>
      ) : (
        <Loading />
      )}
    </>
  );
}
