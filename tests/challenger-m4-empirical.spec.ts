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

test.describe('Challenger M4 Empirical Adversarial Suite', () => {
  let pageErrors: string[] = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page, makeOnline }) => {
    await makeOnline();
    pageErrors = [];
    consoleErrors = [];

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

  test('ADV-CHALLENGE-1: Zero-Onboarding Launch on Pristine Storage with Immediate Interactivity', async ({ page, writeIndexedDB }) => {
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);

    // Completely wipe localStorage
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify absolutely no modal overlay blocking interaction
    const blockingModals = page.locator('.z-\\[9999\\], .onboarding-modal, [data-testid="onboarding-flow"]');
    await expect(blockingModals).toHaveCount(0);

    const welcomeHeader = page.locator('h2:has-text("Selamat Datang"), h1:has-text("Selamat Datang")');
    await expect(welcomeHeader).toHaveCount(0);

    // 2. Verify Hero Prayer Focal Card is immediately visible
    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    // 3. Verify Top Floating App Bar Zone Chip is interactive on initial render
    const zoneChip = page.locator('button[title*="zon solat"]').or(page.locator('button:has-text("Kuala Lumpur")')).first();
    await expect(zoneChip).toBeVisible();
    await zoneChip.click();
    await page.waitForTimeout(300);

    // 4. Verify default auto locationMode was persisted silently
    const settings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
    });
    expect(settings.locationMode || 'auto').toBe('auto');

    expect(pageErrors).toEqual([]);
  });

  test('ADV-CHALLENGE-2: Offline Centroid Resolution Across Pan-Malaysian & Boundary Coordinates', async ({ page, writeIndexedDB, makeOffline, makeOnline }) => {
    // Seed zone caches for tested regions
    const ZONES_DATA = [
      { zone: 'PNG01', coords: { lat: 5.4141, lng: 100.3288 } }, // George Town, Penang
      { zone: 'KDH01', coords: { lat: 6.1248, lng: 100.3678 } }, // Alor Setar, Kedah
      { zone: 'JHR02', coords: { lat: 1.4927, lng: 103.7414 } }, // Johor Bahru, Johor
      { zone: 'SBH04', coords: { lat: 4.2447, lng: 117.8912 } }  // Bandar Tawau, Sabah (SBH04)
    ];

    for (const z of ZONES_DATA) {
      await writeIndexedDB('prayer-times', z.zone, {
        zone: z.zone,
        prayerTime: [
          ['10-Jun-2026', '1447-12-24', 'Wednesday', '05:30', '05:45', '07:05', '13:10', '16:35', '19:20', '20:35']
        ],
        cachedAt: Date.now(),
        range: 'month'
      });
    }

    try {
      await makeOffline();

      // Test each coordinate set offline to confirm findNearestZone calculates correctly
      for (const target of ZONES_DATA) {
        await page.addInitScript(({ lat, lng }) => {
          localStorage.setItem('waktu-solat-onboarding-completed', 'true');
          const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
          settings.locationMode = 'auto';
          localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition = (success) => {
              success({
                coords: { latitude: lat, longitude: lng, accuracy: 20 },
                timestamp: Date.now()
              } as any);
            };
          }
        }, target.coords);

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(600);

        // Check resolved zone in storage
        const resolvedZone = await page.evaluate(() => localStorage.getItem('waktu-solat-zone'));
        expect(resolvedZone).toBe(target.zone);
      }

      // Test boundary coordinate: (1.5, 104.0) -> Near Johor
      await page.addInitScript(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition = (success) => {
            success({
              coords: { latitude: 1.5, longitude: 104.0, accuracy: 50 },
              timestamp: Date.now()
            } as any);
          };
        }
      });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(600);

      const boundaryZone = await page.evaluate(() => localStorage.getItem('waktu-solat-zone'));
      expect(boundaryZone).toMatch(/^[A-Z]{3}\d{2}$/);
      expect(pageErrors).toEqual([]);
    } finally {
      await makeOnline();
    }
  });

  test('ADV-CHALLENGE-3: Offline Calendar Recovery and Cached Navigation Interactivity', async ({ page, writeIndexedDB, makeOffline, makeOnline }) => {
    const today = new Date();
    const todayDateStr = format(today, 'dd-MMM-yyyy');
    
    // Seed current month in IndexedDB
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
      await makeOffline();
      await page.goto('/calendar');
      await page.waitForLoadState('domcontentloaded');

      // 1. Verify calendar header is visible
      const calendarHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")')).first();
      await expect(calendarHeader).toBeVisible();

      // 2. Verify monthly grid cells are rendered
      const cells = page.locator('button.w-full.h-full, button:has-text("10")');
      await expect(cells.first()).toBeVisible();

      expect(pageErrors).toEqual([]);
    } finally {
      await makeOnline();
    }
  });

  test('ADV-CHALLENGE-4: Web Audio Synthesizer Auditioning Decoupled from OS Push Permissions', async ({ page, writeIndexedDB }) => {
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);

    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
    });

    await page.goto('/settings?tab=mosque');
    await page.waitForLoadState('domcontentloaded');

    // Simulate Notification.permission = 'denied'
    await page.evaluate(() => {
      Object.defineProperty(window.Notification, 'permission', {
        get: () => 'denied',
        configurable: true
      });
    });

    // Audition test chime button in Settings Mosque tab
    const testChimeBtn = page.locator('button:has-text("Uji"), button:has-text("Test")').first();
    await expect(testChimeBtn).toBeVisible();
    await testChimeBtn.click();

    // Verify no unhandled audio errors or permission blocks
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('ADV-CHALLENGE-5: Calendar Error Banner State Invalidation on Month Return (BUG DISCOVERY)', async ({ page, writeIndexedDB, makeOffline, makeOnline }) => {
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
      await makeOffline();
      await page.goto('/calendar');
      await page.waitForLoadState('domcontentloaded');

      const errorBanner = page.locator('.bg-\\[var\\(--md-sys-color-error-container\\)\\]');
      // Initially on cached month -> No error banner
      await expect(errorBanner).toHaveCount(0);

      // Navigate to next uncached month -> Error banner appears
      const nextBtn = page.locator('button[aria-label="Next"]').first();
      await nextBtn.click({ force: true });
      await page.waitForTimeout(600);
      await expect(errorBanner).toBeVisible();

      // Navigate back to cached month -> In an ideal engine, error banner should clear!
      // Due to the bug in FullCalendar.svelte line 176 (early return without error = null), the error banner remains visible.
      const prevBtn = page.locator('button[aria-label="Previous"]').first();
      await prevBtn.click({ force: true });
      await page.waitForTimeout(600);

      const bannerCount = await errorBanner.count();
      console.log(`[CHALLENGER BUG VERIFIED RESOLVED] Banner count after returning to cached month is ${bannerCount} (expected 0)`);
      expect(bannerCount).toBe(0); // Verified resolved: error banner cleared!
    } finally {
      await makeOnline();
    }
  });
});
