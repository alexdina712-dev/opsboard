import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../server/app.js';
import { db } from '../server/db.js';
const created: string[] = [];
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});
describe('request boundary security', () => {
  it('rejects oversized JSON without caching or echoing content', async () => {
    const r = await request(app)
      .post('/api/auth/login')
      .send({ payload: 'x'.repeat(32 * 1024 + 1) });
    expect(r.status).toBe(413);
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.body.error).toMatch(/limit|large/i);
    expect(JSON.stringify(r.body).length).toBeLessThan(200);
  });
  it('does not cache malformed JSON errors', async () => {
    const r = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{invalid');
    expect(r.status).toBe(400);
    expect(r.headers['cache-control']).toBe('no-store');
  });
  it('supports DONE combined with overdue without a server error', async () => {
    const client = request.agent(app);
    const registered = await client
      .post('/api/auth/register')
      .send({
        name: 'Filter Tester',
        email: `filter-${Date.now()}@example.com`,
        password: 'SecurePassword!123',
      });
    expect(registered.status).toBe(201);
    created.push(registered.body.id);
    const organization = await client
      .post('/api/organizations')
      .send({ name: 'Filter regression' });
    try {
      const response = await client.get(
        `/api/organizations/${organization.body.id}/tasks?status=DONE&due=overdue`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    } finally {
      await db.organization.deleteMany({ where: { id: organization.body.id } });
    }
  });
});
