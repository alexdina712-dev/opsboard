import type { Activity } from '../types';
import { Avatar, Empty } from './ui';
import { timeAgo } from '../lib/format';
export function ActivityList({ activities }: { activities: Activity[] }) {
  return activities.length ? (
    <div className="activity-list">
      {activities.map((a) => (
        <div className="activity-row" key={a.id}>
          <Avatar name={a.actor.name} small />
          <div>
            <p>
              <strong>{a.actor.name}</strong> {a.action}
            </p>
            <span>{a.subject}</span>
          </div>
          <time dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time>
        </div>
      ))}
    </div>
  ) : (
    <Empty
      title="A fresh start"
      detail="Your team's activity will appear here as work gets moving."
    />
  );
}
