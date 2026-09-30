import { z } from 'zod';
export const statuses = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const projectStatuses = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
const date = z.string().datetime().nullable().optional();
const id = z.string().min(1).max(100);
const password = (minimum: number) =>
  z
    .string()
    .min(minimum)
    .max(72)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      'Password must be at most 72 UTF-8 bytes.',
    );
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: password(1),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(80),
  password: password(10),
});
export const organizationSchema = z.object({ name: z.string().trim().min(2).max(80) });
export const joinSchema = z.object({ code: z.string().trim().min(10).max(100) });
export const projectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(3000).default(''),
  ownerId: id.nullable().optional(),
  deadline: date,
  status: z.enum(projectStatuses).default('ACTIVE'),
});
export const taskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().max(5000).default(''),
  projectId: id,
  assigneeId: id.nullable().optional(),
  status: z.enum(statuses).default('BACKLOG'),
  priority: z.enum(priorities).default('MEDIUM'),
  dueDate: date,
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
});
export const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) });
export type ProjectInput = z.infer<typeof projectSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
