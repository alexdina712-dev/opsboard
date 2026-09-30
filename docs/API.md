# REST API reference

All routes start with `/api`. Bodies and responses use JSON, except successful logout (`204`). Authentication uses the `opsboard_session` cookie; the browser fetch client sends credentials automatically. Mutation requests in production must include an `Origin` exactly equal to `APP_ORIGIN`.

Errors have the shape `{ "error": "Human-readable explanation" }`.

| Status | Meaning                                                              |
| ------ | -------------------------------------------------------------------- |
| 400    | Validation error or an invalid related record/archived project       |
| 401    | Missing, expired, or invalid session; invalid credentials            |
| 403    | Foreign organization, non-admin invitation access, or invalid Origin |
| 404    | Record does not exist within the requested organization              |
| 409    | Duplicate registration email                                         |
| 429    | Authentication rate limit reached                                    |
| 500    | Unexpected server error; details are kept in server logs             |

## Authentication

| Method | Path             | Request / result                                            |
| ------ | ---------------- | ----------------------------------------------------------- |
| POST   | `/auth/register` | `{name,email,password}`; 201 public user and session cookie |
| POST   | `/auth/login`    | `{email,password}`; public user and session cookie          |
| POST   | `/auth/logout`   | Revokes current session; 204                                |
| GET    | `/auth/me`       | Current public user `{id,name,email}`                       |
| GET    | `/health`        | Database connectivity check; `{status:"ok"}`                |

Names must be 2–80 characters. Registration passwords must be 10–72 characters and at most 72 UTF-8 bytes (the bcrypt limit). Email is normalized to lowercase. Public user responses never include the password hash.

## Organizations

| Method | Path                                      | Request / result                                                 |
| ------ | ----------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/organizations`                          | Organizations the current user belongs to, with their role       |
| POST   | `/organizations`                          | `{name}`; creates an organization with the current user as admin |
| POST   | `/organizations/join`                     | `{code}`; joins the matching organization as member              |
| GET    | `/organizations/:orgId/members`           | Members with role and public user                                |
| GET    | `/organizations/:orgId/invitation`        | Admin only; `{inviteCode}`                                       |
| POST   | `/organizations/:orgId/invitation/rotate` | Admin only; replaces invitation code                             |

Joining is idempotent and cannot upgrade an existing member's role.

## Projects

All following paths are relative to `/organizations/:orgId` and require membership.

| Method | Path                    | Request / result                                                       |
| ------ | ----------------------- | ---------------------------------------------------------------------- |
| GET    | `/projects`             | All projects, including archived, with owner and task status summaries |
| POST   | `/projects`             | Project input; 201 created project                                     |
| PUT    | `/projects/:id`         | Full project input; updated project                                    |
| PATCH  | `/projects/:id/archive` | `{archived: boolean}`; updated project                                 |

Project input:

```json
{
  "name": "Website relaunch",
  "description": "A faster and clearer customer experience.",
  "status": "ACTIVE",
  "ownerId": null,
  "deadline": "2026-11-15T23:59:00.000Z"
}
```

Statuses: `PLANNED`, `ACTIVE`, `ON_HOLD`, `COMPLETED`. Name: 2–100 characters. Description: up to 3000 characters. Nullable dates must be ISO datetime strings. Owners must belong to the same organization.

## Tasks and comments

| Method | Path                  | Request / result                                                           |
| ------ | --------------------- | -------------------------------------------------------------------------- |
| GET    | `/tasks`              | Up to 500 current-project tasks, with project, assignee, and comment count |
| POST   | `/tasks`              | Task input; 201 created task                                               |
| PUT    | `/tasks/:id`          | Full task input; updated task                                              |
| PATCH  | `/tasks/:id/status`   | `{status}`; updated task                                                   |
| GET    | `/tasks/:id/comments` | Comments in ascending time order with public authors                       |
| POST   | `/tasks/:id/comments` | `{body}`; 201 comment; body 1–2000 characters                              |

Task input:

```json
{
  "title": "Review mobile navigation",
  "description": "Verify keyboard behavior and the small-screen menu.",
  "projectId": "a-real-project-id",
  "assigneeId": null,
  "status": "IN_REVIEW",
  "priority": "HIGH",
  "dueDate": null,
  "tags": ["Design", "Website"]
}
```

Statuses: `BACKLOG`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Title: 2–160 characters; description up to 5000; up to 8 tags of 1–30 characters each. Duplicated tags are removed. Projects and assignees must belong to the organization. Archived projects cannot receive task writes until restored.

Query filters can be combined:

```text
/tasks?q=mobile&project=<id>&user=<id>&status=IN_REVIEW&priority=HIGH&tag=Design&due=week
```

`q` matches title/description case-insensitively. `tag` is an exact match. `due` is `overdue`, `week` (next seven days), or `none`. Overdue excludes done tasks; combining overdue with done returns no tasks. Lists are sorted by newest creation first.

## Reporting

| Method | Path         | Result                                                                                   |
| ------ | ------------ | ---------------------------------------------------------------------------------------- |
| GET    | `/dashboard` | `activeProjects`, `overdueTasks`, `completedThisWeek`, `tasksByStatus`, `recentActivity` |
| GET    | `/activity`  | Latest 100 events, newest first, with public actor                                       |

All reporting is organization-scoped. Current metrics exclude archived projects. Weekly completion uses Monday 00:00 UTC and `completedAt`, not the last generic edit timestamp. Activity records preserve a human-readable subject so earlier events remain understandable after renames.
