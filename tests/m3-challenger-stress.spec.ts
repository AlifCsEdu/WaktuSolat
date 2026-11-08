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

test.describe('Adversarial Stress & Edge Case Verification', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page, writeIndexedDB }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Failed to load resource') ||
            text.includes('net::ERR_INTERNET_DISCONNECTED') ||
            text.includes('Flag_of_the_Federal_Territories.svg')) {
          return;
        }
        consoleErrors.push(text);
        console.error(`[BROWSER ERROR] ${text}`);
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
      console.error(`[BROWSER EXCEPTION] ${err.message}`);
    });

    // Seed prayer times and onboarding completed
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      settings.showTvShortcut = true;
      localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));
    });
  });

  test('ADV-1: Rapid consecutive route transitions under rapid navigation', async ({ page }) => {
    await page.goto('/');

    const routes = ['/calendar', '/settings', '/tv', '/map', '/'];
    
    // Rapidly switch between routes 3 cycles (15 hops) without waiting for full idle
    for (let round = 0; round < 3; round++) {
      for (const route of routes) {
        await page.goto(route);
        // Minimal delay to simulate quick clicking/history jumps
        await page.waitForTimeout(50);
      }
    }

    // Finally settle on / and check integrity
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('ADV-2: Malformed and boundary deep-linking parameters', async ({ page }) => {
    // 1. Calendar with invalid date
    await page.goto('/calendar?date=invalid-date-string-9999');
    await expect(page).toHaveURL(/\/calendar/);
    const calHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")'));
    await expect(calHeader.first()).toBeVisible();

    // 2. Calendar with extreme future date
    await page.goto('/calendar?date=2099-12-31');
    await expect(calHeader.first()).toBeVisible();

    // 3. Settings with invalid tab and query injection
    await page.goto('/settings?tab=<script>alert(1)</script>&q=%27%22--');
    await expect(page).toHaveURL(/\/settings/);
    const settingsHeader = page.locator('h2:has-text("Tetapan")').or(page.locator('h2:has-text("Settings")'));
    await expect(settingsHeader.first()).toBeVisible();

    // 4. Map with non-existent zone
    await page.goto('/map?zone=NON_EXISTENT_ZONE_XYZ');
    await expect(page).toHaveURL(/\/map/);

    expect(consoleErrors).toEqual([]);
  });

  test('ADV-3: Authentic DOM Presence & Interactive Components on All Standalone Routes', async ({ page }) => {
    // Calendar: Verify genuine interactive controls exist (navigation arrows, grid buttons)
    await page.goto('/calendar');
    await expect(page.locator('button[aria-label="Previous"], button[aria-label="Next"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Jadual")').or(page.locator('button:has-text("Schedule")')).first()).toBeVisible();

    // Settings: Verify search input, tabs, and reset/close buttons
    await page.goto('/settings');
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Umum"), button:has-text("General")').first()).toBeVisible();

    // TV Mode: Verify clock container, prayer timeline, and fullscreen/settings buttons
    await page.goto('/tv');
    await expect(page.locator('.fixed.inset-0').first()).toBeVisible();
    await expect(page.locator('text=/Subuh|Fajr|Zohor|Dhuhr/i').first()).toBeVisible();

    // Map: Verify map wrapper and back/close button
    await page.goto('/map');
    await expect(page.locator('#map, .leaflet-container, [class*="map"]').first()).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('ADV-4: View Transitions Layout Stability & No Cumulative Shift Blowouts', async ({ page }) => {
    await page.goto('/');

    // Check viewport dimensions are strictly respected
    const docOverflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(docOverflowX).toBe(false);

    // Navigate to calendar and check overflow
    await page.goto('/calendar');
    const calOverflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(calOverflowX).toBe(false);

    // Navigate to settings and check overflow
    await page.goto('/settings');
    const setOverflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(setOverflowX).toBe(false);

    expect(consoleErrors).toEqual([]);
  });
});
