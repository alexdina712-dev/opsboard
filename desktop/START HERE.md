# OpsBoard

Your complete operations and project-management application.

## Run it

1. Double-click **Start OpsBoard.cmd**. It starts the database, builds the app, applies migrations, and starts the local services. Startup runs in the background; allow a little time for the readiness message.
2. Double-click **Open OpsBoard.url** or visit http://127.0.0.1:5173.
3. Click **Explore the demo workspace**. Alternatively, sign in with `demo@opsboard.app` / `OpsBoardDemo!2026`.
4. When finished, double-click **Stop OpsBoard.cmd**. The local database is preserved for your next session.

The launchers use installed Node/pnpm or the existing Codex runtime on this computer. If dependencies are absent, the first start installs them. This requires internet access. Do not run the manual `pnpm dev`/`pnpm dev:db` commands at the same time as these launchers: they use the same ports.

## Folder guide

- **app/** — the actual Git repository, source code, tests, migrations, deployment files, and installed development dependencies. Make code changes here.
- **Documentation/** — README, portfolio case study, API reference, verification record, and deployment guide. The canonical editable documents also live in `app/`.
- **Screenshots/** — desktop, mobile, tablet, task-board, project, and login captures.
- **Backups/** — a portable source-code archive and a portable Desktop package with launchers. They exclude local environment settings, installed dependencies, runtime logs, and database data.

Local-only files are in **app/.env**, **app/.local-db/**, and **app/.runtime/**. Keep those out of public repositories and cloud source-code uploads. The Google Drive copy contains the portable project, documentation, deployment files, and screenshots.

## Develop and deploy

Read **Documentation/README.md** for setup, architecture, tests, and Vercel/Render/Neon deployment. Backend development with live reload uses `pnpm dev` after stopping the Desktop supervisor and starting the database separately as described there. Public demo: https://opsboard-dina19.vercel.app. It can take about a minute to wake after inactivity.

Drive backup: https://drive.google.com/drive/folders/1VkzY29idL4kwQERKNkNMHNPG_U8yRuH5

This OpsBoard folder is the working home for this app. Future applications can each have their own sibling folder under **Apps I am Working On**.

GitHub source and automated checks: https://github.com/alexdina712-dev/opsboard

Live portfolio demo: https://opsboard-dina19.vercel.app
