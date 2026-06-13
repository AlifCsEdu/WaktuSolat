import { test, expect } from './fixtures';

const MOCK_ZONE = 'WLY01';
const MOCK_COMPRESSED_DATA = {
  zone: MOCK_ZONE,
  prayerTime: [
    ['10-Jun-2026', '1447-12-24', 'Wednesday', '05:30', '05:45', '07:05', '13:10', '16:35', '19:20', '20:35'],
  ],
  cachedAt: Date.now(),
  range: 'month'
};

test.describe('Animations & Transitions Automated E2E Verification', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page, writeIndexedDB }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error(`[BROWSER ERROR] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
      console.error(`[BROWSER EXCEPTION] ${err.message}`);
    });

    // Seed prayer times and set onboarding completed
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
    });
  });

  test('TR-1: Simulate opening/closing Calendar modal and tab switching', async ({ page }) => {
    await page.goto('/');

    // Locate and click calendar trigger button
    const calendarBtn = page.locator('[style*="view-transition-name: calendar-transition"]');
    await calendarBtn.waitFor({ state: 'visible' });
    await calendarBtn.click();

    // Verify calendar content wrapper is visible and carries view-transition-name
    const calendarWrapper = page.locator('[style*="view-transition-name: calendar-transition"]');
    await expect(calendarWrapper).toHaveCount(2); // One is trigger, one is modal wrapper

    // Switch between grid and list tabs
    const scheduleTab = page.locator('button:has-text("Jadual")').or(page.locator('button:has-text("Schedule")'));
    await scheduleTab.waitFor({ state: 'visible' });
    await scheduleTab.click();

    // Verify list view is visible
    const listView = page.locator('div:has-text("Zohor")').or(page.locator('div:has-text("Dhuhr")'));
    await expect(listView.first()).toBeVisible();

    // Close the calendar modal
    const closeBtn = page.locator('md-filled-tonal-icon-button.cursor-pointer');
    await closeBtn.click();

    // Verify no console errors were thrown during transitions
    expect(consoleErrors).toEqual([]);
  });

  test('TR-2: Enforce prefers-reduced-motion compliance', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Locate and click calendar trigger button
    const calendarBtn = page.locator('[style*="view-transition-name: calendar-transition"]');
    await calendarBtn.waitFor({ state: 'visible' });
    await calendarBtn.click();

    // Verify calendar content is visible under reduced motion
    const headerTitle = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")'));
    await expect(headerTitle).toBeVisible();

    // Close the calendar modal
    const closeBtn = page.locator('md-filled-tonal-icon-button.cursor-pointer');
    await closeBtn.click();

    // Verify no console errors
    expect(consoleErrors).toEqual([]);
  });

  test('TR-3: Verify Overlay Priority Queue rendering and sequencing', async ({ page }) => {
    await page.goto('/');

    // Evaluate in browser to set mock location-toast active (priority 30) and update-toast active (priority 50)
    await page.evaluate(() => {
      // Trigger update-toast active
      (window as any).overlayManager.register('update-toast', true);
      // Trigger location-toast active
      (window as any).locationState.promptZone = 'JHR01';
      (window as any).overlayManager.register('location-toast', true);
    });

    // Verify update-toast (priority 50) is visible, and location-toast (priority 30) is NOT rendered
    const updateToast = page.locator('div:has-text("Kemas Kini")').or(page.locator('div:has-text("Update Available")'));
    await expect(updateToast.first()).toBeVisible();

    const locationToast = page.locator('h4:has-text("Lokasi Baharu")').or(page.locator('h4:has-text("New Location")'));
    await expect(locationToast).not.toBeVisible();

    // Dismiss update-toast
    await page.evaluate(() => {
      (window as any).overlayManager.register('update-toast', false);
    });

    // Now location-toast (priority 30) should become visible
    const locationToastH4 = page.locator('h4:has-text("Lokasi Baharu")').or(page.locator('h4:has-text("New Location")')).or(page.locator('h4:has-text("Sila tukar zon")'));
    await expect(locationToastH4.first()).toBeVisible();

    // Trigger azan-alert (priority 80)
    await page.evaluate(() => {
      (window as any).mosqueState.mockAzanAlert = { prayerName: 'Asar', style: 'standard', remainingSeconds: 20 };
      (window as any).overlayManager.register('azan-alert', true);
    });

    // Verify azan-alert (priority 80) is visible, location-toast is hidden
    const azanAlert = page.locator('h2:has-text("Bersedia untuk Azan")').or(page.locator('h2:has-text("Prepare for Azan")')).or(page.locator('h4:has-text("Azan")'));
    await expect(azanAlert.first()).toBeVisible();
    await expect(locationToastH4.first()).not.toBeVisible();

    // Dismiss azan-alert
    await page.evaluate(() => {
      (window as any).mosqueState.mockAzanAlert = null;
      (window as any).overlayManager.register('azan-alert', false);
    });

    // location-toast should become visible again
    await expect(locationToastH4.first()).toBeVisible();

    // Verify no console errors
    expect(consoleErrors).toEqual([]);
  });
});
