export interface Person {
  id: string;
  name: string;
  email: string;
}
export interface Organization {
  id: string;
  name: string;
  memberships: { role: string }[];
}
export interface Member {
  role: string;
  user: Person;
}
export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  archived: boolean;
  ownerId: string | null;
  owner: Person | null;
  deadline: string | null;
  tasks: { id: string; status: string }[];
}
export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: string;
  project: { id: string; name: string };
  assigneeId: string | null;
  assignee: Person | null;
  dueDate: string | null;
  tags: string[];
  _count: { comments: number };
}
export interface Activity {
  id: string;
  actor: Person;
  action: string;
  subject: string;
  createdAt: string;
}
export interface Comment {
  id: string;
  body: string;
  author: Person;
  createdAt: string;
}
export interface Dashboard {
  activeProjects: number;
  overdueTasks: number;
  completedThisWeek: number;
  tasksByStatus: Record<string, number>;
  recentActivity: Activity[];
}
