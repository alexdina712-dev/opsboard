# Verification record

Local verification completed on **September 30, 2026**. This record distinguishes checks actually run from configuration prepared for another environment.

## Environment

Windows, Node.js 24.19.0, pnpm 11.19.0, real PostgreSQL 18.4, Prisma 6.19.0, and Chromium supplied by Playwright. A fresh UTF-8 database was migrated and seeded. PostgreSQL 16 is the configured CI/Docker database version; compatibility on that environment is to be confirmed by the hosted CI run.

## Executed checks

| Check                                          | Result                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Prisma client generation                       | Passed                                                            |
| Both committed migrations on an empty database | Passed                                                            |
| Realistic demo seed                            | Passed; idempotent behavior also exercised                        |
| Strict TypeScript check                        | Passed for frontend, backend, and tests                           |
| Production frontend and compiled-server build  | Passed, with route splitting and production React runtime         |
| Vitest / Supertest                             | **19 passed**: 15 real-database API tests, 4 validation tests     |
| Playwright                                     | **10 passed**: five workflows each on desktop and mobile Chromium |
| Compiled-server smoke test                     | Passed                                                            |
| Browser screenshots                            | Captured from the real application and visually inspected         |

The initial browser flows revealed unstable task-navigation naming and test selectors that were not scoped to dialogs. These were corrected, and the flows were rerun successfully. A password-boundary test prevents bcrypt truncation; a session test verifies that stored tokens are digests and expired sessions are rejected.

The final browser suite includes project edits and archiving, task creation/completion/editing, comments, keyboard dismissal of dialogs, search and priority filters, view switching, CSV export, protected routes, registration, joining an existing organization, creating a second organization, and switching organizations. It checks viewport overflow and JavaScript errors for the main responsive navigation flow.

The compiled-server smoke check starts the emitted JavaScript with production flags. It verifies built SPA deep-route serving, Origin enforcement, Secure/HttpOnly/SameSite cookies, `no-store`, and logout revocation. Its HTTP requests attach cookies manually; this verifies server behavior and configuration, **not real HTTPS termination**. Public hosting still needs a deployment smoke test.

## Screenshots

`dashboard.png`, `board.png`, `projects.png`, `login.png`, `mobile.png`, and `tablet.png` are actual Playwright captures in `docs/screenshots`. Desktop uses 1440px width, mobile 390px, and tablet 834px. Screenshots use reduced motion to avoid capturing intermediate navigation transitions. Browser-test fixtures were removed from the local demo after tests; the seeded company remains intact.

## Prepared, not executed here

- Docker image and Compose environment: Docker was not installed on this machine.
- Vercel/Render/Neon deployment: no public service or database was provisioned. Generate `vercel.json` with the actual backend URL and follow the README.
- Real mobile Safari, Firefox, and automated accessibility audits.
- Load, penetration, backup/recovery, and production monitoring exercises.

## Reproduce

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
node scripts/smoke-built.mjs
```

Use a dedicated test database and the local default Origin. The API tests remove their own records. Browser tests write fixtures, so retain a separate database for testing versus the public demo.

To refresh screenshots, start the local application at `http://127.0.0.1:5173` with the demo seeded, then run `node scripts/screenshots.mjs`.

## GitHub publication and hosted verification

Published publicly at https://github.com/alexdina712-dev/opsboard on September 30, 2026. The first hosted Linux run passed dependency installation, Prisma generation, migrations, seeding, the production build, all 19 unit/API tests and all 10 desktop/mobile Playwright tests.

Verified run: https://github.com/alexdina712-dev/opsboard/actions/runs/36739318722
Verified implementation commit: 992fd80357938e451206afbfa19025318ff85123. Later documentation commits do not change application behavior. The Desktop repository tracks origin/main, and portable source/Git-history snapshots are copied to Desktop Backups and Google Drive. GitHub and Drive copies are updated explicitly; they do not automatically synchronize later edits.
