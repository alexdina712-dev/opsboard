# Desktop setup

OpsBoard lives in the Desktop folder Apps I am Working On/OpsBoard. Start OpsBoard.cmd builds the app, starts PostgreSQL, applies migrations, seeds demo data and starts the API and frontend. Open OpsBoard.url opens the app; Stop OpsBoard.cmd preserves your database.

## Verification: September 30, 2026

Dependencies were independently installed in the Desktop repository. All 19 unit/API tests and 10 desktop/mobile browser tests passed there. Startup, safe shutdown and restart were checked.

## Portable backups

Install Node.js 22+ and pnpm 11.19.0 on a new computer, extract the Desktop package and run its launcher. Initial startup needs internet for dependencies and creates a fresh demo database. The source archives and Git bundle exclude local settings, database state, dependencies and runtime logs.

Drive contains uploaded snapshots, not automatic synchronization. These packages do not back up later changes made inside the running app. Public deployment is prepared but has not been provisioned.
