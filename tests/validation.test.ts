import { describe, expect, it } from 'vitest';
import { taskSchema, projectSchema, registerSchema } from '../shared/validation.js';
describe('shared input contracts', () => {
  it('rejects passwords that bcrypt would silently truncate', () => {
    expect(
      registerSchema.safeParse({
        name: 'Alex',
        email: 'alex@example.com',
        password: 'a'.repeat(73),
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: 'Alex',
        email: 'alex@example.com',
        password: '🔥'.repeat(20),
      }).success,
    ).toBe(false);
  });
  it('rejects blank titles and oversized tags', () => {
    expect(taskSchema.safeParse({ title: '  ', projectId: 'p' }).success).toBe(false);
    expect(
      taskSchema.safeParse({ title: 'Task', projectId: 'p', tags: ['a'.repeat(31)] }).success,
    ).toBe(false);
  });
  it('requires ISO dates and permits clearing a deadline', () => {
    expect(projectSchema.safeParse({ name: 'Launch', deadline: 'tomorrow' }).success).toBe(false);
    expect(projectSchema.parse({ name: 'Launch', deadline: null }).deadline).toBeNull();
  });
  it('normalizes email and rejects weak passwords', () => {
    expect(
      registerSchema.parse({ name: 'Alex', email: 'Alex@Example.com', password: 'LongPassword!1' })
        .email,
    ).toBe('alex@example.com');
    expect(
      registerSchema.safeParse({ name: 'Alex', email: 'a@example.com', password: 'short' }).success,
    ).toBe(false);
  });
});
