import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'reduce',
  });
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('button', { name: 'Explore the demo workspace' }).click();
  await page.getByRole('heading', { name: 'A little clarity, Alex.' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });
  await page.getByRole('navigation').getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await page.getByRole('button', { name: 'Design the homepage experience', exact: true }).waitFor();
  await page.screenshot({ path: 'docs/screenshots/board.png', fullPage: true });
  await page.getByRole('navigation').getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('heading', { name: 'Website relaunch', exact: true }).waitFor();
  await page.screenshot({ path: 'docs/screenshots/projects.png', fullPage: true });
  const storageState = await page.context().storageState();
  for (const [name, width, height] of [
    ['mobile', 390, 844],
    ['tablet', 834, 1112],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      storageState,
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    const responsivePage = await context.newPage();
    await responsivePage.goto('http://127.0.0.1:5173/');
    await responsivePage.getByRole('heading', { name: 'A little clarity, Alex.' }).waitFor();
    await responsivePage.evaluate(() => document.fonts.ready);
    if (await responsivePage.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error(name + ' has viewport overflow');
    await responsivePage.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
    await context.close();
  }
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor();
  await page.screenshot({ path: 'docs/screenshots/login.png', fullPage: true });
  console.log('Captured dashboard, board, projects, mobile, tablet, and login screens.');
} finally {
  await browser.close();
}
