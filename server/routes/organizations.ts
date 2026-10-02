import express from 'express';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { ApiError } from '../errors.js';
import { scopeOrganization } from '../auth.js';
import {
  organizationSchema,
  joinSchema,
  projectSchema,
  taskSchema,
  commentSchema,
  statuses,
  priorities,
} from '../../shared/validation.js';
import {
  person,
  taskInclude,
  projectInclude,
  findProject,
  findTask,
  activity,
  saveProject,
  saveTask,
} from '../services/work.js';
export const organizationRoutes = express.Router();
organizationRoutes.get('/', async (req, res) => {
  res.json(
    await db.organization.findMany({
      where: { memberships: { some: { userId: req.userId } } },
      select: {
        id: true,
        name: true,
        memberships: { where: { userId: req.userId }, select: { role: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  );
});
organizationRoutes.post('/', async (req, res) => {
  const input = organizationSchema.parse(req.body);
  res.status(201).json(
    await db.organization.create({
      data: {
        name: input.name,
        inviteCode: randomBytes(24).toString('hex'),
        memberships: { create: { userId: req.userId, role: 'ADMIN' } },
      },
    }),
  );
});
organizationRoutes.post('/join', async (req, res) => {
  const { code } = joinSchema.parse(req.body);
  const org = await db.organization.findUnique({ where: { inviteCode: code } });
  if (!org) throw new ApiError(404, 'That invitation code is not valid.');
  await db.membership.upsert({
    where: { userId_organizationId: { userId: req.userId, organizationId: org.id } },
    update: {},
    create: { userId: req.userId, organizationId: org.id },
  });
  res.json({ id: org.id, name: org.name });
});
organizationRoutes.use('/:orgId', scopeOrganization);
const base = '/:orgId';
organizationRoutes.get(`${base}/members`, async (req, res) => {
  res.json(
    await db.membership.findMany({
      where: { organizationId: req.organizationId },
      select: { role: true, user: { select: person } },
    }),
  );
});
organizationRoutes.get(`${base}/invitation`, async (req, res) => {
  if (req.role !== 'ADMIN')
    throw new ApiError(403, 'Only organization admins can manage invitations.');
  res.json(
    await db.organization.findUnique({
      where: { id: req.organizationId },
      select: { inviteCode: true },
    }),
  );
});
organizationRoutes.post(`${base}/invitation/rotate`, async (req, res) => {
  if (req.role !== 'ADMIN')
    throw new ApiError(403, 'Only organization admins can manage invitations.');
  res.json(
    await db.organization.update({
      where: { id: req.organizationId },
      data: { inviteCode: randomBytes(24).toString('hex') },
      select: { inviteCode: true },
    }),
  );
});
organizationRoutes.get(`${base}/projects`, async (req, res) => {
  res.json(
    await db.project.findMany({
      where: { organizationId: req.organizationId },
      include: projectInclude,
      orderBy: { createdAt: 'asc' },
    }),
  );
});
organizationRoutes.post(`${base}/projects`, async (req, res) => {
  res
    .status(201)
    .json(await saveProject(req.organizationId, req.userId, projectSchema.parse(req.body)));
});
organizationRoutes.put(`${base}/projects/:id`, async (req, res) => {
  res.json(
    await saveProject(
      req.organizationId,
      req.userId,
      projectSchema.parse(req.body),
      String(req.params.id),
    ),
  );
});
organizationRoutes.patch(`${base}/projects/:id/archive`, async (req, res) => {
  const { archived } = z.object({ archived: z.boolean() }).parse(req.body);
  const project = await findProject(req.organizationId, String(req.params.id));
  res.json(
    await db.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: project.id },
        data: { archived },
        include: projectInclude,
      });
      await activity(
        tx,
        req.organizationId,
        req.userId,
        archived ? 'archived project' : 'restored project',
        project.name,
      );
      return updated;
    }),
  );
});
organizationRoutes.get(`${base}/tasks`, async (req, res) => {
  const filters = z
    .object({
      q: z.string().max(160).optional(),
      project: z.string().optional(),
      user: z.string().optional(),
      status: z.enum(statuses).optional(),
      priority: z.enum(priorities).optional(),
      tag: z.string().max(30).optional(),
      due: z.enum(['overdue', 'week', 'none']).optional(),
    })
    .parse(req.query);
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const where: Prisma.TaskWhereInput = {
    organizationId: req.organizationId,
    project: { archived: false },
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: 'insensitive' } },
            { description: { contains: filters.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(filters.project ? { projectId: filters.project } : {}),
    ...(filters.user ? { assigneeId: filters.user } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.tag ? { tags: { has: filters.tag } } : {}),
    ...(filters.due === 'overdue'
      ? {
          dueDate: { lt: new Date() },
          AND: [{ status: { not: 'DONE' } }],
        }
      : filters.due === 'week'
        ? { dueDate: { gte: new Date(), lte: end } }
        : filters.due === 'none'
          ? { dueDate: null }
          : {}),
  };
  res.json(
    await db.task.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  );
});
organizationRoutes.post(`${base}/tasks`, async (req, res) => {
  res.status(201).json(await saveTask(req.organizationId, req.userId, taskSchema.parse(req.body)));
});
organizationRoutes.put(`${base}/tasks/:id`, async (req, res) => {
  res.json(
    await saveTask(
      req.organizationId,
      req.userId,
      taskSchema.parse(req.body),
      String(req.params.id),
    ),
  );
});
organizationRoutes.patch(`${base}/tasks/:id/status`, async (req, res) => {
  const { status } = z.object({ status: z.enum(statuses) }).parse(req.body);
  const task = await findTask(req.organizationId, String(req.params.id));
  res.json(
    await saveTask(
      req.organizationId,
      req.userId,
      taskSchema.parse({ ...task, status, dueDate: task.dueDate?.toISOString() ?? null }),
      task.id,
    ),
  );
});
organizationRoutes.get(`${base}/tasks/:id/comments`, async (req, res) => {
  await findTask(req.organizationId, String(req.params.id));
  res.json(
    await db.comment.findMany({
      where: { taskId: String(req.params.id) },
      include: { author: { select: person } },
      orderBy: { createdAt: 'asc' },
    }),
  );
});
organizationRoutes.post(`${base}/tasks/:id/comments`, async (req, res) => {
  const input = commentSchema.parse(req.body);
  const task = await findTask(req.organizationId, String(req.params.id));
  res.status(201).json(
    await db.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { body: input.body, taskId: task.id, authorId: req.userId },
        include: { author: { select: person } },
      });
      await activity(tx, req.organizationId, req.userId, 'commented on', task.title);
      return comment;
    }),
  );
});
organizationRoutes.get(`${base}/activity`, async (req, res) => {
  res.json(
    await db.activity.findMany({
      where: { organizationId: req.organizationId },
      include: { actor: { select: person } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  );
});
organizationRoutes.get(`${base}/dashboard`, async (req, res) => {
  const where = { organizationId: req.organizationId, project: { archived: false } };
  const week = new Date();
  week.setUTCHours(0, 0, 0, 0);
  week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
  const [activeProjects, overdueTasks, completedThisWeek, grouped, recentActivity] =
    await Promise.all([
      db.project.count({
        where: { organizationId: req.organizationId, archived: false, status: 'ACTIVE' },
      }),
      db.task.count({ where: { ...where, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
      db.task.count({ where: { ...where, status: 'DONE', completedAt: { gte: week } } }),
      db.task.groupBy({ by: ['status'], where, _count: { _all: true } }),
      db.activity.findMany({
        where: { organizationId: req.organizationId },
        include: { actor: { select: person } },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  res.json({
    activeProjects,
    overdueTasks,
    completedThisWeek,
    tasksByStatus: Object.fromEntries(
      statuses.map((s) => [s, grouped.find((g) => g.status === s)?._count._all || 0]),
    ),
    recentActivity,
  });
});
