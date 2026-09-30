import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
const db = new PrismaClient();
async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') throw new Error('Set ALLOW_DEMO_SEED=true intentionally to seed a public demo.');
  if (await db.user.findUnique({ where: { email: 'demo@opsboard.app' } })) { console.log('Demo already exists; no data changed.'); return; }
  const passwordHash = await bcrypt.hash('OpsBoardDemo!2026', 12);
  await db.$transaction(async tx => {
    const users = await Promise.all(['Alex Morgan', 'Jamie Chen', 'Sam Rivera', 'Taylor Brooks'].map((name, i) => tx.user.create({ data: { name, email: i ? ['','jamie','sam','taylor'][i] + '@northstar.example' : 'demo@opsboard.app', passwordHash } })));
    const org = await tx.organization.create({ data: { name: 'Northstar Studio', inviteCode: randomBytes(24).toString('hex'), memberships: { create: users.map((u, i) => ({ userId: u.id, role: i === 0 ? 'ADMIN' : 'MEMBER' })) } } });
    const day = (offset: number) => { const d = new Date(); d.setUTCHours(23, 59, 0, 0); d.setUTCDate(d.getUTCDate() + offset); return d; };
    const projects = await Promise.all([
      ['Website relaunch', 'A clearer story, a faster site, and a better first impression. Launch the new Northstar website.', 14],
      ['Client onboarding', 'Make every new client feel at home with a repeatable, thoughtful onboarding experience.', 21],
      ['Q4 operations', 'Build the systems that give our team more time for meaningful work.', 35],
      ['Brand refresh', 'Bring our visual identity into the next chapter of Northstar.', 28]
    ].map(([name, description, deadline], i) => tx.project.create({ data: { name: String(name), description: String(description), deadline: day(Number(deadline)), organizationId: org.id, ownerId: users[i].id } })));
    const rows = [
      ['Map the new site architecture', 0, 'DONE', 'HIGH', 1, -2, ['Strategy']],
      ['Design the homepage experience', 0, 'IN_PROGRESS', 'HIGH', 1, 2, ['Design', 'Website']],
      ['Write customer success stories', 0, 'BACKLOG', 'MEDIUM', 0, 5, ['Content']],
      ['Review mobile navigation', 0, 'IN_REVIEW', 'HIGH', 2, 1, ['Design']],
      ['Set up performance monitoring', 0, 'BACKLOG', 'LOW', 2, 9, ['Engineering']],
      ['Create a client welcome kit', 1, 'IN_PROGRESS', 'MEDIUM', 3, 4, ['Operations']],
      ['Audit onboarding touchpoints', 1, 'IN_REVIEW', 'MEDIUM', 0, -1, ['Research']],
      ['Automate the kickoff checklist', 1, 'BACKLOG', 'HIGH', 2, 7, ['Operations']],
      ['Update the project brief template', 1, 'DONE', 'LOW', 3, -1, ['Operations']],
      ['Finalize the Q4 capacity plan', 2, 'IN_PROGRESS', 'URGENT', 0, -2, ['Planning']],
      ['Review vendor subscriptions', 2, 'BACKLOG', 'MEDIUM', 3, 3, ['Finance']],
      ['Publish team working agreements', 2, 'DONE', 'MEDIUM', 0, 0, ['Team']],
      ['Explore the new color palette', 3, 'IN_PROGRESS', 'MEDIUM', 1, 5, ['Design']],
      ['Present identity directions', 3, 'IN_REVIEW', 'HIGH', 1, 3, ['Design']],
      ['Organize the asset library', 3, 'BACKLOG', 'LOW', 3, 10, ['Brand']],
      ['Collect stakeholder feedback', 3, 'DONE', 'MEDIUM', 0, -1, ['Research']]
    ];
    for (const [title, p, status, priority, u, due, tags] of rows) {
      const task = await tx.task.create({ data: { title: String(title), description: 'Coordinate with the team, document decisions, and share the final deliverable for review.', projectId: projects[Number(p)].id, organizationId: org.id, status: String(status), priority: String(priority), assigneeId: users[Number(u)].id, dueDate: day(Number(due)), tags: tags as string[], completedAt: status === 'DONE' ? new Date() : null } });
      await tx.activity.create({ data: { organizationId: org.id, actorId: users[Number(u)].id, action: status === 'DONE' ? 'completed task' : 'created task', subject: task.title, createdAt: new Date(Date.now() - Number(due) * 120000 - 3600000) } });
      if (status === 'IN_REVIEW') await tx.comment.create({ data: { taskId: task.id, authorId: users[0].id, body: 'The first pass looks great. Please check the acceptance criteria before we sign this off.' } });
    }
  });
  console.log('Demo ready: demo@opsboard.app / OpsBoardDemo!2026');
}
seed().finally(() => db.$disconnect());
