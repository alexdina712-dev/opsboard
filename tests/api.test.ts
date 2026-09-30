import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/app.js';
import { db } from '../server/db.js';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
const client = request.agent(app);
const outsider = request.agent(app);
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let orgId: string,
  otherOrg: string,
  projectId: string,
  taskId: string,
  userId: string,
  otherUser: string;
beforeAll(async () => {
  const a = await client.post('/api/auth/register').send({
    name: 'Test Owner',
    email: `owner-${suffix}@example.com`,
    password: 'strongPassword!123',
  });
  expect(a.status).toBe(201);
  userId = a.body.id;
  const b = await outsider.post('/api/auth/register').send({
    name: 'Test Outsider',
    email: `outsider-${suffix}@example.com`,
    password: 'strongPassword!123',
  });
  otherUser = b.body.id;
  orgId = (await client.post('/api/organizations').send({ name: 'Test workspace' })).body.id;
  otherOrg = (await outsider.post('/api/organizations').send({ name: 'Other workspace' })).body.id;
});
afterAll(async () => {
  await db.organization.deleteMany({ where: { id: { in: [orgId, otherOrg].filter(Boolean) } } });
  await db.user.deleteMany({ where: { id: { in: [userId, otherUser].filter(Boolean) } } });
  await db.$disconnect();
});
describe('authentication and security', () => {
  it('stores token digests and refuses expired sessions', async () => {
    const fresh = request.agent(app);
    const login = await fresh
      .post('/api/auth/login')
      .send({ email: `owner-${suffix}@example.com`, password: 'strongPassword!123' });
    const cookies = login.headers['set-cookie'] as unknown as string[];
    const token = cookies
      .find((c) => /^opsboard_session=[a-f0-9]{64};/.test(c))!
      .split(';')[0]
      .split('=')[1];
    const digest = createHash('sha256').update(token).digest('hex');
    expect(await db.session.findUnique({ where: { id: token } })).toBeNull();
    expect((await db.session.findUniqueOrThrow({ where: { id: digest } })).userId).toBe(userId);
    await db.session.update({ where: { id: digest }, data: { expiresAt: new Date(0) } });
    expect((await fresh.get('/api/auth/me')).status).toBe(401);
  });
  it('hashes passwords and persists session across requests', async () => {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.passwordHash).not.toBe('strongPassword!123');
    expect(await bcrypt.compare('strongPassword!123', user.passwordHash)).toBe(true);
    expect((await client.get('/api/auth/me')).body.id).toBe(userId);
  });
  it('rejects unauthenticated and wrong-password requests', async () => {
    expect((await request(app).get('/api/organizations')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: `owner-${suffix}@example.com`, password: 'wrong' })
      ).status,
    ).toBe(401);
  });
  it('validates registration and avoids duplicate accounts', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/register')
          .send({ name: 'X', email: 'bad', password: 'short' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test',
            email: `owner-${suffix}@example.com`,
            password: 'strongPassword!123',
          })
      ).status,
    ).toBe(409);
  });
  it('blocks cross-origin mutations', async () => {
    expect(
      (
        await client
          .post('/api/organizations')
          .set('Origin', 'https://evil.example')
          .send({ name: 'Nope' })
      ).status,
    ).toBe(403);
  });
});
describe('project and task lifecycle', () => {
  it('creates and updates projects with validation', async () => {
    const res = await client
      .post(`/api/organizations/${orgId}/projects`)
      .send({ name: 'Launch', ownerId: userId });
    expect(res.status).toBe(201);
    projectId = res.body.id;
    const edit = await client
      .put(`/api/organizations/${orgId}/projects/${projectId}`)
      .send({ name: 'Launch revised', status: 'ON_HOLD' });
    expect(edit.body.status).toBe('ON_HOLD');
    expect(
      (await client.post(`/api/organizations/${orgId}/projects`).send({ name: '' })).status,
    ).toBe(400);
  });
  it('creates a task and stores a completion timestamp', async () => {
    const res = await client
      .post(`/api/organizations/${orgId}/tasks`)
      .send({ title: 'Review launch', projectId, assigneeId: userId, tags: ['Design'] });
    expect(res.status).toBe(201);
    taskId = res.body.id;
    const done = await client
      .patch(`/api/organizations/${orgId}/tasks/${taskId}/status`)
      .send({ status: 'DONE' });
    expect(done.body.status).toBe('DONE');
    expect(done.body.completedAt).toBeTruthy();
    const dashboard = await client.get(`/api/organizations/${orgId}/dashboard`);
    expect(dashboard.body.completedThisWeek).toBe(1);
    expect(dashboard.body.tasksByStatus.DONE).toBe(1);
  });
  it('clears completion when reopened and validates statuses', async () => {
    const res = await client
      .patch(`/api/organizations/${orgId}/tasks/${taskId}/status`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.body.completedAt).toBeNull();
    expect(
      (
        await client
          .patch(`/api/organizations/${orgId}/tasks/${taskId}/status`)
          .send({ status: 'FAKE' })
      ).status,
    ).toBe(400);
  });
  it('filters tasks and records comments and activity', async () => {
    expect(
      (await client.get(`/api/organizations/${orgId}/tasks?tag=Design&q=launch`)).body,
    ).toHaveLength(1);
    expect(
      (await client.get(`/api/organizations/${orgId}/tasks?priority=URGENT`)).body,
    ).toHaveLength(0);
    expect(
      (
        await client
          .post(`/api/organizations/${orgId}/tasks/${taskId}/comments`)
          .send({ body: 'Ready for review.' })
      ).status,
    ).toBe(201);
    expect(
      (await client.get(`/api/organizations/${orgId}/tasks/${taskId}/comments`)).body[0].body,
    ).toBe('Ready for review.');
    expect(
      (await client.get(`/api/organizations/${orgId}/activity`)).body.some(
        (a: { action: string }) => a.action === 'completed task',
      ),
    ).toBe(true);
  });
  it('archives and restores projects without deleting tasks', async () => {
    await client
      .patch(`/api/organizations/${orgId}/projects/${projectId}/archive`)
      .send({ archived: true });
    expect((await client.get(`/api/organizations/${orgId}/tasks`)).body).toHaveLength(0);
    expect(
      (await client.post(`/api/organizations/${orgId}/tasks`).send({ title: 'Blocked', projectId }))
        .status,
    ).toBe(400);
    await client
      .patch(`/api/organizations/${orgId}/projects/${projectId}/archive`)
      .send({ archived: false });
    expect((await client.get(`/api/organizations/${orgId}/tasks`)).body).toHaveLength(1);
  });
});
describe('tenant authorization', () => {
  it('rejects foreign project owners and validates comments without writing activity', async () => {
    expect(
      (
        await client
          .post(`/api/organizations/${orgId}/projects`)
          .send({ name: 'Invalid owner', ownerId: otherUser })
      ).status,
    ).toBe(400);
    const before = await db.activity.count({ where: { organizationId: orgId } });
    expect(
      (
        await client
          .post(`/api/organizations/${orgId}/tasks/${taskId}/comments`)
          .send({ body: '   ' })
      ).status,
    ).toBe(400);
    expect(await db.activity.count({ where: { organizationId: orgId } })).toBe(before);
    expect(
      (await outsider.get(`/api/organizations/${otherOrg}/tasks/${taskId}/comments`)).status,
    ).toBe(404);
  });
  it('blocks all routes in another organization', async () => {
    for (const endpoint of ['projects', 'tasks', 'dashboard', 'activity', 'members', 'invitation'])
      expect((await outsider.get(`/api/organizations/${orgId}/${endpoint}`)).status).toBe(403);
    expect(
      (
        await outsider
          .patch(`/api/organizations/${orgId}/tasks/${taskId}/status`)
          .send({ status: 'DONE' })
      ).status,
    ).toBe(403);
  });
  it('rejects foreign IDs and foreign assignees even within an authorized route', async () => {
    expect(
      (
        await outsider
          .patch(`/api/organizations/${otherOrg}/tasks/${taskId}/status`)
          .send({ status: 'DONE' })
      ).status,
    ).toBe(404);
    expect(
      (
        await outsider
          .post(`/api/organizations/${otherOrg}/tasks`)
          .send({ title: 'Wrong project', projectId })
      ).status,
    ).toBe(404);
    expect(
      (
        await client
          .post(`/api/organizations/${orgId}/tasks`)
          .send({ title: 'Wrong assignee', projectId, assigneeId: otherUser })
      ).status,
    ).toBe(400);
  });
  it('joins by invitation without granting admin privileges; rotation invalidates old code', async () => {
    const invitation = (await client.get(`/api/organizations/${orgId}/invitation`)).body.inviteCode;
    expect((await outsider.post('/api/organizations/join').send({ code: invitation })).status).toBe(
      200,
    );
    expect((await outsider.get(`/api/organizations/${orgId}/projects`)).status).toBe(200);
    expect((await outsider.get(`/api/organizations/${orgId}/invitation`)).status).toBe(403);
    await client.post(`/api/organizations/${orgId}/invitation/rotate`);
    expect((await outsider.post('/api/organizations/join').send({ code: invitation })).status).toBe(
      404,
    );
  });
  it('logs in and revokes sessions on logout', async () => {
    const fresh = request.agent(app);
    const login = await fresh
      .post('/api/auth/login')
      .send({ email: `owner-${suffix}@example.com`, password: 'strongPassword!123' });
    expect(login.status).toBe(200);
    expect(String(login.headers['set-cookie'])).toContain('HttpOnly');
    await fresh.post('/api/auth/logout');
    expect((await fresh.get('/api/auth/me')).status).toBe(401);
  });
});
