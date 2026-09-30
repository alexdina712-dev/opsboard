# OpsBoard — portfolio case study

## Problem

Small companies often distribute their work across spreadsheets, chat messages, and disconnected to-do lists. That makes it difficult to answer basic questions: who owns this project, which tasks are overdue, and what changed since the last check-in? A credible solution needs both a clear interface and trustworthy data ownership.

## Solution

OpsBoard brings organizations, projects, tasks, and activity into one workspace. The dashboard helps a team decide what needs attention; the board and table provide two practical ways to act on that information. The demo company makes those flows immediately explorable without requiring a reviewer to invent data.

## Key features

Multi-organization accounts, invitation-based joining, project ownership and archiving, tasks with assignees/priorities/tags/deadlines, Kanban and table views, comments, combined search filters, CSV export, activity history, and dashboard metrics. The interface works at desktop, tablet, and mobile widths with explicit loading, empty, and error states.

## Technical challenges

**Tenant isolation.** A logged-in user is not automatically allowed to access every record. Middleware verifies membership in the requested organization; services look up projects and tasks within that organization; referenced owners and assignees are validated against membership. Tests attempt cross-tenant access through both foreign organization paths and foreign resource IDs inside authorized paths.

**Reliable authentication.** Sessions are generated from cryptographic randomness, stored as digests, and sent only through HttpOnly cookies. Persistent database sessions allow server-side logout revocation. Exact-Origin checks, SameSite cookies, password hashing, and request limits address the basic trust boundary. The reverse proxy gives the browser a same-origin API in production.

**Meaningful dashboard data.** Completion counts require a dedicated timestamp; an ordinary `updatedAt` would count unrelated edits. Completing sets that timestamp, reopening clears it, and archived projects are excluded from active work. UTC boundaries are explicit so the behavior is predictable and testable.

**Consistent writes and history.** A change and its activity event use one transaction. The code records whether an action created work, completed it, changed status, or changed an assignee. Archive/restore preserves records rather than silently losing a project's task history.

**Browser verification.** Actual browser testing exposed an unstable navigation accessible name caused by a task-count badge. Giving navigation a stable label improved both assistive-technology behavior and test reliability. API tests alone would not have found that issue.

## Architecture

The frontend is organized into route pages, reusable components, context hooks, typed API access, and presentation helpers. A shared Zod module supplies input contracts to the browser and server. Express handles transport and middleware; work services own project/task rules and transactions; Prisma maps the relational PostgreSQL schema. Committed migrations make setup and deployment reproducible. Route splitting reduces initial download size.

One repository and lockfile keep this small application approachable. The frontend and backend remain separate build/runtime artifacts and can be deployed independently. This avoids adding monorepo orchestration before the project needs it.

## Testing approach

Validation unit tests check input boundaries. Supertest integration tests exercise the real API and PostgreSQL, including negative authorization cases. Playwright covers the important UI journeys in desktop and mobile Chromium. A production build checks both browser and server TypeScript. GitHub Actions repeats those checks with its own PostgreSQL service and retains browser traces on failure.

The tests focus on behavior: a revoked session is rejected, a foreign project cannot be attached to a task, a completed task affects dashboard data, an archived project's tasks disappear and return on restoration, and a user can complete work through the browser.

## What I learned

This section is a study guide for the developer presenting the project; it should be personalized after working through the code, rather than claimed as experience without understanding it.

- Trace a browser mutation from a form through shared validation, fetch, authentication, membership checks, service rules, Prisma, and PostgreSQL.
- Explain why hashing a session token protects stored sessions and why logout requires a server-side action.
- Show how an organization boundary can be bypassed if related IDs are not validated, then point to the tests preventing that bug.
- Explain the difference between `completedAt` and `updatedAt`, and why archive semantics affect metrics.
- Use a failing browser trace to distinguish test-selector issues, network failures, and application defects.
- Explain what the deploy configuration prepares and what still requires a hosted deployment smoke test.

Useful exercises: add optimistic concurrency to task edits, implement pagination without breaking URL filters, or write a cross-tenant test for a new endpoint before implementing it.

## Possible future development

Expiring per-person invites, member management, email verification/recovery, attachments, real-time updates, optimistic version checks, pagination, notifications, richer reporting, accessibility audits, operational monitoring, and organization-specific time zones. Each should extend the same validation and tenant-authorization boundaries rather than create a separate path around them.

## Scope and verification

This is a working portfolio application, not a claim of production certification. Local verification and known limitations are recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md) and the README. Hosting, billing setup, and real-world production operations remain deployment responsibilities.
