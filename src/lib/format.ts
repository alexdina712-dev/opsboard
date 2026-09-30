export const labels: Record<string, string> = {
  BACKLOG: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
};
export const dateLabel = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    : 'No due date';
export const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
export const inputDate = (value?: string | null) => value?.slice(0, 10) || '';
export const isoDate = (value: string) =>
  value ? new Date(value + 'T23:59:00.000Z').toISOString() : null;
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';
export const timeAgo = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 1
    ? 'Just now'
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
};
