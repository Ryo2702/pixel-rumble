import { test, expect } from '@playwright/test';

test('arena starts while its backdrop is still downloading and panels load on demand', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/neon-district*.webp', async route => { requested = true; await pending; await route.continue(); });
  const dialogs: string[] = [];
  page.on('request', request => { if (request.url().includes('/Dialogs')) dialogs.push(request.url()); });
  try {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.arena-loading')).toHaveCount(0, { timeout: 20000 });
    await expect.poll(() => requested).toBe(true);
    expect(dialogs).toHaveLength(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(dialogs.length).toBeGreaterThan(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('how-it-works metadata and navigation work with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveTitle('Pixel Rumble | 2D Pixel Auto-Battle Game');
    await expect(page.getByRole('heading', { name: 'What is Pixel Rumble?' })).toBeVisible();
    await page.getByRole('link', { name: 'How It Works', exact: true }).click();
    await expect(page.getByRole('heading', { name: /HOW IT WORKS/ })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Designed & Developed by');
    await expect(page.locator('body')).not.toContainText('Developer Portfolio');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: '/tmp/pixel-rumble-how-it-works-mobile.png', fullPage: true });
    await page.getByRole('link', { name: 'Back to the arena' }).click();
    await expect(page).toHaveURL('/');
  } finally {
    await context.close();
  }
});

test('desktop predictions, profiles, settings, market, and a live round', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.arena-loading')).toHaveCount(0, { timeout: 20000 });
  await page.getByLabel('Choose fighter').selectOption('nova');
  await page.getByRole('spinbutton', { name: /BET AMOUNT/ }).fill('5.00');
  await page.getByRole('button', { name: 'PLACE BET' }).click();
  await expect(page.getByText("YOU'RE IN.")).toBeVisible();
  await expect(page.locator('.balance-button')).toContainText('79.50 SOL');
  await expect(page.locator('.confirmed-prediction')).toContainText('NOVA');
  await page.locator('.selected-name').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.profile-hero')).toContainText('NOVA');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion' }).check();
  await page.getByRole('switch', { name: 'Screen shake' }).uncheck();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'View market', exact: true }).click();
  const marketDialog = page.getByRole('dialog');
  await expect(marketDialog).toContainText('REAL SOLANA DATA · READ ONLY');
  await expect(marketDialog.getByText(/NEW TOKENS|REAL SOLANA DATA TEMPORARILY UNAVAILABLE/)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'My activity', exact: true }).click();
  await expect(page.locator('.history-row')).toContainText('NOVA');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Game speed/ }).click();
  await page.getByRole('button', { name: /Game speed/ }).click();
  await expect(page.locator('.phase-indicator')).toHaveText('LIVE RUMBLE', { timeout: 30000 });
  await page.waitForTimeout(7000);
  await expect(page.locator('.arena-bottom')).not.toContainText('0 ELIMINATIONS');
  await page.screenshot({ path: '/tmp/pixel-rumble-live.png', fullPage: true });
  await expect(page.locator('.phase-indicator')).toHaveText('ROUND COMPLETE', { timeout: 50000 });
  await expect(page.locator('.confirmed-prediction')).not.toContainText("YOU'RE IN.");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-rumble-v3')!));
  expect(stored.roundsWatched).toBe(1);
  expect(stored.predictions[0].status).not.toBe('pending');
  const balance = stored.balance;
  await page.reload();
  await expect(page.locator('.arena-round')).toContainText('002');
  await expect(page.locator('.balance-button')).toContainText(`${(balance / 1_000_000_000).toFixed(2)} SOL`);
  expect(errors).toEqual([]);
});

test('mobile arena, fighter drawer, prediction, and reload refund fit without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.arena-loading')).toHaveCount(0, { timeout: 20000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/pixel-rumble-mobile.png', fullPage: true });
  await page.locator('.mobile-panel-tabs').getByRole('button', { name: 'Fighters' }).click();
  await expect(page.locator('.roster-panel')).toBeVisible();
  await page.getByRole('button', { name: /Select KIRA/ }).click();
  await page.getByRole('button', { name: 'Make a prediction', exact: true }).click();
  await expect(page.locator('.selected-name')).toHaveText('KIRA');
  await page.getByRole('spinbutton', { name: /BET AMOUNT/ }).fill('1.00');
  await page.getByRole('button', { name: 'PLACE BET' }).click();
  await expect(page.locator('.confirmed-prediction')).toContainText('KIRA');
  await page.reload();
  await expect(page.locator('.balance-button')).toContainText('84.50 SOL');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/pixel-rumble-settings-mobile.png' });
});
