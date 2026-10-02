import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { db } from './db.js';
import { ApiError } from './errors.js';
import { authenticate } from './auth.js';
import { authRoutes } from './routes/auth.js';
import { organizationRoutes } from './routes/organizations.js';
export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
app.use(cors({ origin, credentials: true }));
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
// Origin verification protects cookie-authenticated mutations, including login CSRF.
app.use('/api', (req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== origin
  )
    return next(new ApiError(403, 'Request origin is not allowed.'));
  if (
    process.env.NODE_ENV === 'production' &&
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    !req.headers.origin
  )
    return next(new ApiError(403, 'An Origin header is required.'));
  next();
});
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: 'ok' });
});
app.use('/api/auth', authRoutes);
app.use('/api/organizations', authenticate, organizationRoutes);
if (process.env.SERVE_WEB === 'true') {
  app.use(express.static(resolve('dist')));
  app.get(/^(?!\/api(?:\/|$)).*$/, (_req, res) => res.sendFile(resolve('dist/index.html')));
}
app.use((_req, _res, next) => next(new ApiError(404, 'Endpoint not found.')));
app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return res.status(409).json({ error: 'This email is already registered.' });
    if (error instanceof Error && 'type' in error && error.type === 'entity.too.large')
      return res.status(413).json({ error: 'JSON request exceeds the 32 KB limit.' });
    if (error instanceof SyntaxError && 'body' in error)
      return res.status(400).json({ error: 'Invalid JSON request.' });
    console.error(error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  },
);
