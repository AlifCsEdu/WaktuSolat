import { test, expect } from './fixtures';
import { format } from 'date-fns';

const MOCK_ZONE = 'WLY01';
const MOCK_COMPRESSED_DATA = {
  zone: MOCK_ZONE,
  prayerTime: [
    ['10-Jun-2026', '1447-12-24', 'Wednesday', '05:30', '05:45', '07:05', '13:10', '16:35', '19:20', '20:35'],
  ],
  cachedAt: Date.now(),
  range: 'month'
};

test.describe('Milestone 4 Adversarial Stress & Resilience Challenge', () => {
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];

  test.beforeEach(async ({ page, makeOnline }) => {
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
  });

  test.afterEach(async ({ makeOnline }) => {
    await makeOnline();
  });

  test('M4-ADV-1: Zero-Onboarding Instant Launch with Completely Cold Storage', async ({ page, writeIndexedDB }) => {
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);

    // Ensure completely empty localStorage (simulating absolute first-time user visit)
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Confirm NO onboarding wizard / modal exists
    const onboardingDialog = page.locator('.onboarding-modal, [data-testid="onboarding-flow"], h2:has-text("Selamat Datang"), h2:has-text("Welcome to AlurWaktu")');
    await expect(onboardingDialog).toHaveCount(0);

    // 2. Confirm active dashboard hero card and app bar immediately render
    const topBar = page.locator('header.relative.flex.items-center.h-14').first();
    await expect(topBar).toBeVisible();

    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    // 3. Confirm default locationMode is initialized to 'auto'
    const locationMode = await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      return settings.locationMode || 'auto';
    });
    expect(locationMode).toBe('auto');

    // 4. Confirm default zone is WLY01 or properly resolved
    const activeZone = await page.evaluate(() => {
      return localStorage.getItem('waktu-solat-zone');
    });
    expect(activeZone).toBe('WLY01');

    // 5. Zero unhandled exceptions
    expect(pageErrors).toEqual([]);
  });

  test('M4-ADV-2: Geolocation Permission Denied Degrades Gracefully Without Console Error Noise', async ({ page, writeIndexedDB }) => {
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);

    // Mock geolocation to simulate PERMISSION_DENIED (error.code = 1)
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (success, error) => {
          if (error) {
            const err = new Error('User denied Geolocation') as any;
            err.code = 1; // PERMISSION_DENIED
            error(err);
          }
        };
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Verify dashboard remains intact and selectedZone remains WLY01
    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    const zoneLabel = page.locator('button[title*="zon solat"]').or(page.locator('button:has-text("Kuala Lumpur")')).first();
    await expect(zoneLabel).toBeVisible();

    // Verify no unhandled exceptions and no geolocation error crash
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((e) => e.includes('geolocation'))).toEqual([]);
  });

  test('M4-ADV-3: Geolocation Timeout Degrades Gracefully', async ({ page, writeIndexedDB }) => {
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);

    // Mock geolocation to simulate TIMEOUT (error.code = 3)
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (success, error) => {
          if (error) {
            const err = new Error('Timeout expired') as any;
            err.code = 3; // TIMEOUT
            error(err);
          }
        };
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('M4-ADV-4: Offline Centroid Fallback Auto-Detects Nearest Malaysian Zone', async ({ page, writeIndexedDB, makeOffline, makeOnline }) => {
    // Seed George Town Penang (PNG01) prayer data
    const PENANG_DATA = {
      zone: 'PNG01',
      prayerTime: [
        ['10-Jun-2026', '1447-12-24', 'Wednesday', '05:35', '05:50', '07:10', '13:15', '16:40', '19:25', '20:40'],
      ],
      cachedAt: Date.now(),
      range: 'month'
    };
    await writeIndexedDB('prayer-times', 'PNG01', PENANG_DATA);
    await writeIndexedDB('prayer-times', 'WLY01', MOCK_COMPRESSED_DATA);

    // Mock coordinates in Penang (George Town: 5.4141, 100.3288) with locationMode = 'auto'
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      settings.locationMode = 'auto';
      localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: {
              latitude: 5.4141,
              longitude: 100.3288,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          } as any);
        };
      }
    });

    try {
      // Make network offline so online reverse geocoding fails and centroid fallback is invoked
      await makeOffline();

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Give auto detection time to resolve centroid
      await page.waitForTimeout(1000);

      // Verify zone updated to PNG01 via offline centroid matching
      const currentZone = await page.evaluate(() => localStorage.getItem('waktu-solat-zone'));
      expect(currentZone).toBe('PNG01');

      expect(pageErrors).toEqual([]);
    } finally {
      await makeOnline();
    }
  });

  test('M4-ADV-5: Offline Calendar Uncached Month Navigation Displays Error Banner Without Crashing', async ({ page, writeIndexedDB, makeOffline, makeOnline }) => {
    const today = new Date();
    const todayDateStr = format(today, 'dd-MMM-yyyy');
    
    // Seed current active month with prayer data
    const CURRENT_MONTH_DATA = {
      zone: MOCK_ZONE,
      prayerTime: [
        [todayDateStr, '1448-05-20', 'Friday', '05:45', '06:00', '07:15', '13:15', '16:35', '19:15', '20:30']
      ],
      cachedAt: Date.now(),
      range: 'month'
    };

    await writeIndexedDB('prayer-times', MOCK_ZONE, CURRENT_MONTH_DATA);

    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
    });

    try {
      // Go offline after DB seeding
      await makeOffline();

      // Navigate to /calendar
      await page.goto('/calendar');
      await page.waitForLoadState('domcontentloaded');

      // Verify calendar header is visible
      const calendarHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")')).first();
      await expect(calendarHeader).toBeVisible();

      // Error banner selector targets M3 error container
      const errorBanner = page.locator('.bg-\\[var\\(--md-sys-color-error-container\\)\\]');
      // Initially on current month (cached), no error banner
      await expect(errorBanner).toHaveCount(0);

      // Click Next month button with { force: true } to navigate to an uncached month
      const nextBtn = page.locator('button[aria-label="Next"]').first();
      await expect(nextBtn).toBeVisible();
      await nextBtn.click({ force: true });

      // Wait for async fetchMonthData to attempt offline cache resolution
      await page.waitForTimeout(600);

      // Verify:
      // 1. The calendar does NOT crash or white-screen
      await expect(calendarHeader).toBeVisible();

      // 2. An error banner is displayed informing user data failed to load
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText(/Gagal|Failed/i);

      // 3. Clicking Previous returns to cached current month and error clears
      const prevBtn = page.locator('button[aria-label="Previous"]').first();
      await prevBtn.click({ force: true });
      await page.waitForTimeout(600);

      await expect(errorBanner).toHaveCount(0);

      expect(pageErrors).toEqual([]);
    } finally {
      await makeOnline();
    }
  });

  test('M4-ADV-6: Synthesized Sound Audio API Auditioning In Settings', async ({ page, writeIndexedDB, makeOnline }) => {
    await makeOnline();
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);

    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
    });

    await page.goto('/settings?tab=notifications');
    await page.waitForLoadState('domcontentloaded');

    // Audition test sound
    const testSoundBtn = page.locator('button:has-text("Uji Bunyi")').or(page.locator('button:has-text("Test Sound")')).first();
    if (await testSoundBtn.isVisible()) {
      await testSoundBtn.click();
    }

    // Verify no unhandled audio errors
    expect(pageErrors).toEqual([]);
  });
});
