import { db } from '../db.js';
import { ApiError } from '../errors.js';
import type { TaskInput, ProjectInput } from '../../shared/validation.js';
import type { Prisma } from '@prisma/client';
export const person = { id: true, name: true, email: true };
export const taskInclude = {
  assignee: { select: person },
  project: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
};
export const projectInclude = {
  owner: { select: person },
  tasks: { select: { id: true, status: true } },
};
export async function checkMember(organizationId: string, userId?: string | null) {
  if (
    userId &&
    !(await db.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    }))
  )
    throw new ApiError(400, 'The selected person is not a member of this organization.');
}
export async function findProject(organizationId: string, id: string) {
  const project = await db.project.findFirst({ where: { id, organizationId } });
  if (!project) throw new ApiError(404, 'Project not found.');
  return project;
}
export async function findTask(organizationId: string, id: string) {
  const task = await db.task.findFirst({ where: { id, organizationId } });
  if (!task) throw new ApiError(404, 'Task not found.');
  return task;
}
export function activity(
  tx: Prisma.TransactionClient,
  organizationId: string,
  actorId: string,
  action: string,
  subject: string,
) {
  return tx.activity.create({ data: { organizationId, actorId, action, subject } });
}
export async function saveProject(
  organizationId: string,
  actorId: string,
  input: ProjectInput,
  id?: string,
) {
  await checkMember(organizationId, input.ownerId);
  if (id) await findProject(organizationId, id);
  return db.$transaction(async (tx) => {
    const data = { ...input, deadline: input.deadline ? new Date(input.deadline) : null };
    const project = id
      ? await tx.project.update({ where: { id }, data, include: projectInclude })
      : await tx.project.create({ data: { ...data, organizationId }, include: projectInclude });
    await activity(
      tx,
      organizationId,
      actorId,
      id ? 'updated project' : 'created project',
      project.name,
    );
    return project;
  });
}
export async function saveTask(
  organizationId: string,
  actorId: string,
  input: TaskInput,
  id?: string,
) {
  await checkMember(organizationId, input.assigneeId);
  const project = await findProject(organizationId, input.projectId);
  if (project.archived)
    throw new ApiError(400, 'Restore the project before adding or editing its tasks.');
  const previous = id ? await findTask(organizationId, id) : null;
  return db.$transaction(async (tx) => {
    const data = {
      ...input,
      tags: [...new Set(input.tags)],
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      completedAt: input.status === 'DONE' ? previous?.completedAt || new Date() : null,
    };
    const task = id
      ? await tx.task.update({ where: { id }, data, include: taskInclude })
      : await tx.task.create({ data: { ...data, organizationId }, include: taskInclude });
    const action = !previous
      ? 'created task'
      : previous.status !== task.status
        ? task.status === 'DONE'
          ? 'completed task'
          : 'changed task status'
        : previous.assigneeId !== task.assigneeId
          ? 'changed assignee on'
          : 'updated task';
    await activity(tx, organizationId, actorId, action, task.title);
    return task;
  });
}
