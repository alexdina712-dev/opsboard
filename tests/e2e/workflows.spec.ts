import { test, expect, type Page } from '@playwright/test';
async function demo(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Explore the demo workspace' }).click();
  await expect(page.getByRole('heading', { name: 'A little clarity, Alex.' })).toBeVisible();
}
async function navigate(page: Page, name: string) {
  if (await page.getByRole('button', { name: 'Open navigation' }).isVisible())
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
}
test('protected routes, login validation, demo session persistence and logout', async ({
  page,
}) => {
  await page.goto('/projects');
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('Email address').fill('demo@opsboard.app');
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect');
  await demo(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A little clarity, Alex.' })).toBeVisible();
  if (await page.getByRole('button', { name: 'Open navigation' }).isVisible())
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});
test('creates and edits a project, creates a task, updates status, and comments', async ({
  page,
}) => {
  const unique = Date.now() + '-' + test.info().project.name;
  await demo(page);
  await navigate(page, 'Projects');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name').fill('E2E launch ' + unique);
  await page.getByLabel('Description').fill('A launch verified in the browser.');
  await page.getByLabel('Project owner').selectOption({ label: 'Alex Morgan' });
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E launch ' + unique })).toBeVisible();
  await page.getByRole('button', { name: 'Edit E2E launch ' + unique, exact: true }).click();
  await page.getByLabel('Project name').fill('E2E revised ' + unique);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E revised ' + unique })).toBeVisible();
  await navigate(page, 'Tasks');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await page.getByLabel('Task title').fill('E2E review ' + unique);
  await page
    .getByRole('combobox', { name: 'Project', exact: true })
    .selectOption({ label: 'E2E revised ' + unique });
  await page
    .getByRole('combobox', { name: 'Assignee', exact: true })
    .selectOption({ label: 'Alex Morgan' });
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('HIGH');
  await page.getByLabel('Tags').fill('E2E, Design');
  await page.getByRole('dialog').getByRole('button', { name: 'Create task', exact: true }).click();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  const status = page.getByLabel('Status for E2E review ' + unique);
  await expect(status).toBeVisible();
  await status.selectOption('DONE');
  await expect(status).toHaveValue('DONE');
  await page.getByRole('button', { name: 'E2E review ' + unique, exact: true }).click();
  await page.getByLabel('Add a comment').fill('Browser verified and ready.');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText('Browser verified and ready.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'E2E review ' + unique, exact: true }).click();
  await page.getByLabel('Description').fill('Updated acceptance criteria from the browser.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'E2E review ' + unique, exact: true }).click();
  await expect(page.getByLabel('Description')).toHaveValue(
    'Updated acceptance criteria from the browser.',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await navigate(page, 'Activity');
  await expect(page.getByText('E2E review ' + unique, { exact: true }).first()).toBeVisible();
  await navigate(page, 'Projects');
  await page.getByRole('button', { name: 'Archive E2E revised ' + unique, exact: true }).click();
  await page.getByRole('button', { name: /^Archived/ }).click();
  await expect(page.getByRole('heading', { name: 'E2E revised ' + unique })).toBeVisible();
});
test('search, advanced filtering, board and table views, and CSV export', async ({ page }) => {
  await demo(page);
  await navigate(page, 'Tasks');
  await page.getByLabel('Search tasks').fill('homepage');
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Design the homepage experience', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('URGENT');
  await expect(page.getByRole('heading', { name: 'No tasks match these filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('opsboard-tasks.csv');
});
test('registration and organization onboarding', async ({ page }) => {
  const unique = Date.now() + '-' + test.info().project.name;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Full name').fill('Browser Tester');
  await page.getByLabel('Email address').fill(`browser-${unique}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('BrowserPassword!123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your team starts here' })).toBeVisible();
  await page.getByRole('link', { name: 'Set up workspace' }).click();
  await page.getByRole('button', { name: 'New workspace', exact: true }).click();
  await page.getByLabel('Workspace name').fill('Browser Company ' + unique);
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browser Company ' + unique })).toBeVisible();
  await expect(page.getByLabel('Invitation code')).not.toHaveValue('');
  const invitation = await page.getByLabel('Invitation code').inputValue();
  await page.getByRole('button', { name: 'Join workspace', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Invitation code').fill(invitation);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Join workspace', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Browser Company ' + unique })).toBeVisible();
  await page.getByRole('button', { name: 'New workspace', exact: true }).click();
  await page.getByLabel('Workspace name').fill('Second Company ' + unique);
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Second Company ' + unique })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Current organization' })
    .selectOption({ label: 'Browser Company ' + unique });
  await expect(page.getByRole('heading', { name: 'Browser Company ' + unique })).toBeVisible();
});
test('responsive layout stays within viewport and navigation works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await demo(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await navigate(page, 'Tasks');
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
