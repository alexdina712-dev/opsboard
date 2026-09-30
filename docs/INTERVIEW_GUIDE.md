# OpsBoard interview study guide

This is a learning checklist, not a statement that every topic has already been mastered. Work through it before presenting the project in a technical interview.

## Explain a complete user action

Create a task, find its form and shared Zod schema, follow the API request into Express, identify the session and membership checks, and explain the service transaction and Prisma relation. Change its status and show the resulting activity and dashboard metric.

## Explain security boundaries

Why are passwords hashed? Why is the raw session token absent from the database? What makes logout revoke access? What prevents an authenticated user from reading another organization? Open tests/api.test.ts and run the authorization tests. Explain how production HTTPS, cookies and same-origin API routing work together.

## Demonstrate debugging and change ownership

Make a small change yourself, such as a filter, then explain its schema, frontend and backend effects. Add a behavior test, run the checks, and commit the change with a clear message. Use a Playwright trace to explain a failing browser action.

## Discuss tradeoffs honestly

Explain archive/restore, completedAt, transactional activity logs, UTC deadlines, last-write-wins edits, and the query limit. Identify limitations that matter at larger scale. Distinguish deployment files from a deployment you have actually tested.

## Still needed for an employer presentation

The public HTTPS demo is complete: https://opsboard-dina19.vercel.app. A short 60–90 second demonstration video and a software-focused CV can follow after more apps. Pin OpsBoard on the GitHub profile. Describe AI assistance honestly and demonstrate the parts of the system you understand and have changed. Additional applications are separate projects and are not implemented by this task.
