# OpsBoard deployment guide

## Deployment

Recommended topology: **Vercel frontend → Render API → Neon PostgreSQL**. No paid account or public deployment is provisioned by the source code. Choose current service plans and regions when deploying; free tiers may sleep or change limits.

1. Push this repository to a GitHub repository you own.
2. Create a Neon project and copy a direct PostgreSQL connection string with TLS enabled. For this small, single-instance API, direct connections are simplest. Set a modest `connection_limit=5` if needed. Use the provider's direct connection for migrations; if switching the runtime to a pooler later, configure a separate migration connection.
3. Create a Render Node web service from the repository, or import `render.yaml`. Set `DATABASE_URL` and `APP_ORIGIN` to the final Vercel/custom-domain browser origin. The Blueprint uses locked installation, Prisma generation, and `pnpm build`; startup applies migrations then starts the API. On a paid service, use Render's pre-deploy command `pnpm db:migrate` and change the start command to `pnpm start` so migrations run once per deployment rather than per replica.
4. Generate concrete frontend routing using the **actual backend URL**:

   ```sh
   node scripts/configure-vercel.mjs https://your-real-api.onrender.com
   ```

   Commit the generated `vercel.json`. This creates an `/api` reverse-proxy rewrite before the SPA fallback. Deploy the Vite project to Vercel from this repository with `dist` as output. The generated build/install commands are included. The frontend build does not need database credentials.

5. Confirm `APP_ORIGIN` matches the browser URL exactly and redeploy the API if it changes. Keep `NODE_ENV=production` and HTTPS. Use a separate backend/database for preview deployments, because production rejects other Origins.
6. If this is a public **sample-data-only** portfolio demo, intentionally seed from a trusted shell with the backend's environment:

   ```sh
   ALLOW_DEMO_SEED=true pnpm db:seed
   # PowerShell: $env:ALLOW_DEMO_SEED='true'; pnpm db:seed
   ```

   Do not seed the public account into a private company instance.

7. Verify `/api/health`, register a new user, create a workspace, log out/in, refresh a deep route, create a project/task, and verify a second organization cannot access it. Check that the cookie is Secure/HttpOnly and responses are not cached.

These deployment choices follow [Vercel's external rewrite documentation](https://vercel.com/docs/routing/rewrites), [Render's Prisma deployment guide](https://render.com/docs/deploy-prisma-orm), and the [Prisma 6 migration workflow](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/deploy-migrations-from-a-local-environment).

### Docker / self-hosting

```sh
docker compose up --build
docker compose exec app node dist-server/prisma/seed.js
```

Visit http://127.0.0.1:4000. The supplied Compose file is explicitly for local development (HTTP and development credentials). For public hosting use HTTPS termination, production environment, an exact HTTPS `APP_ORIGIN`, and your own database secrets. Do not publish the PostgreSQL port publicly. The image runs as the unprivileged `node` user. Docker configuration is provided but must be built on a Docker-enabled machine; Docker was unavailable in the development environment.


