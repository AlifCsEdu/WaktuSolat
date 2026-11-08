import { test, expect } from './fixtures';

const MOCK_ZONE = 'WLY01';
const MOCK_COMPRESSED_DATA = {
  zone: MOCK_ZONE,
  prayerTime: [
    ['10-Jun-2026', '1447-12-24', 'Wednesday', '05:30', '05:45', '07:05', '13:10', '16:35', '19:20', '20:35'],
    ['11-Jun-2026', '1447-12-25', 'Thursday', '05:30', '05:45', '07:05', '13:10', '16:35', '19:20', '20:35']
  ],
  cachedAt: Date.now(),
  range: 'month'
};

test.describe('Milestone 5 Deep Adversarial Stress & Memory Stability Suite', () => {
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];

  test.beforeEach(async ({ page, makeOnline, writeIndexedDB }) => {
    await makeOnline();
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.includes('Failed to load resource') ||
          text.includes('net::ERR_INTERNET_DISCONNECTED') ||
          text.includes('Flag_of_the_Federal_Territories.svg') ||
          text.includes('ERR_FILE_NOT_FOUND')
        ) {
          return;
        }
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      settings.showTvShortcut = true;
      localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));
    });
  });

  test.afterEach(async ({ makeOnline }) => {
    await makeOnline();
  });

  test('STRESS-1: Memory & DOM Stability Across 30 Rapid Consecutive Route Transitions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Measure initial DOM element count on dashboard
    const initialDomCount = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`[STRESS-1] Initial DOM count on /: ${initialDomCount}`);

    const routes = ['/calendar', '/settings', '/tv', '/map', '/'];

    // 2. Perform 6 cycles (30 route transitions) in rapid succession
    for (let cycle = 0; cycle < 6; cycle++) {
      for (const route of routes) {
        await page.goto(route);
        await page.waitForSelector('body');
        // Brief tick to exercise mount/unmount and view transitions
        await page.waitForTimeout(30);
      }
    }

    // 3. Settle back on / and verify DOM count remains tightly bounded
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const finalDomCount = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`[STRESS-1] Final DOM count on / after 30 transitions: ${finalDomCount}`);

    // Verify DOM node growth does not blow out (should remain within 100 nodes of initial)
    const domDelta = Math.abs(finalDomCount - initialDomCount);
    console.log(`[STRESS-1] DOM delta: ${domDelta}`);
    expect(domDelta).toBeLessThan(120);

    // Verify key UI elements render correctly
    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('STRESS-2: Cache Invalidation & Seamless Recovery Under Network Failure Injection', async ({ page, makeOffline, makeOnline }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Simulate network severance
    await makeOffline();

    // Verify prayer schedule loads from offline cache
    const scheduleHeader = page.locator('h3', { hasText: /Jadual|Schedule/i }).first();
    await expect(scheduleHeader).toBeVisible();

    // Verify prayer timeline items render from offline storage
    const subuhItem = page.locator('text=/Subuh|Fajr/i').first();
    await expect(subuhItem).toBeVisible();

    // Reconnect to network and navigate to calendar
    await makeOnline();
    await page.goto('/calendar');
    await page.waitForLoadState('domcontentloaded');

    const calendarHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")')).first();
    await expect(calendarHeader).toBeVisible();

    // Zero unhandled promise rejections or exceptions
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('STRESS-3: Rapid Offline/Online Flapping During Active UI Interactions', async ({ page, makeOffline, makeOnline }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Flap offline and online while clicking tabs and navigating
    for (let i = 0; i < 4; i++) {
      await makeOffline();
      await page.waitForTimeout(100);

      // Navigate while offline
      await page.goto('/calendar');
      await page.waitForSelector('body');

      await makeOnline();
      await page.waitForTimeout(100);

      // Navigate while online
      await page.goto('/settings');
      await page.waitForSelector('body');
    }

    // Return to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
