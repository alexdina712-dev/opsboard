import { randomBytes, createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { ApiError } from './errors.js';
declare global {
  namespace Express {
    interface Request {
      userId: string;
      organizationId: string;
      role: string;
    }
  }
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
export async function issueSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { id: hash(token), userId, expiresAt } });
  res.cookie('opsboard_session', token, { ...cookieOptions, expires: expiresAt });
}
export async function revokeSession(req: Request, res: Response) {
  if (req.cookies.opsboard_session)
    await db.session.deleteMany({ where: { id: hash(req.cookies.opsboard_session) } });
  res.clearCookie('opsboard_session', cookieOptions);
}
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies.opsboard_session;
    const session =
      typeof token === 'string'
        ? await db.session.findUnique({ where: { id: hash(token) } })
        : null;
    if (!session || session.expiresAt <= new Date())
      throw new ApiError(401, 'Please sign in to continue.');
    req.userId = session.userId;
    next();
  } catch (error) {
    next(error);
  }
}
export async function scopeOrganization(req: Request, _res: Response, next: NextFunction) {
  try {
    const organizationId = String(req.params.orgId);
    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: req.userId, organizationId } },
    });
    if (!membership) throw new ApiError(403, 'You do not have access to this organization.');
    req.organizationId = organizationId;
    req.role = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}
