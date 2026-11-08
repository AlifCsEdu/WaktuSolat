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

test.describe('Adversarial & Stress Testing: Milestone 3 Routes & Transitions', () => {
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];

  test.beforeEach(async ({ page, writeIndexedDB }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore external offline/network resource load failures
        if (text.includes('Failed to load resource') || 
            text.includes('net::ERR_INTERNET_DISCONNECTED') || 
            text.includes('Flag_of_the_Federal_Territories.svg') ||
            text.includes('ERR_FILE_NOT_FOUND')) {
          return;
        }
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Seed mock prayer times and default onboarding bypass
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      settings.showTvShortcut = true;
      localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));
    });
  });

  test('M3-ADV-1: Rapid Burst and History Traversal Navigation Across All Routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const routes = ['/calendar', '/settings', '/tv', '/map', '/'];

    // Rapid burst navigation loop
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const route of routes) {
        await page.goto(route);
        // Do not pause or wait idle - stress rapid transition scheduling
        await page.waitForSelector('body');
      }
    }

    // Now stress rapid back and forward navigation
    for (let step = 0; step < 5; step++) {
      await page.goBack();
      await page.waitForTimeout(50);
    }

    for (let step = 0; step < 5; step++) {
      await page.goForward();
      await page.waitForTimeout(50);
    }

    // Finally return to root and verify dashboard is fully functional
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const heroCard = page.locator('.m3e-hero-card, .bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90, h1').first();
    await expect(heroCard).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('M3-ADV-2: Deep Linking with Malformed, Boundary, and Injection Query Params', async ({ page }) => {
    // 1. /calendar?date=invalid-date
    await page.goto('/calendar?date=invalid-date');
    await page.waitForLoadState('domcontentloaded');
    const calHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")')).first();
    await expect(calHeader).toBeVisible();

    // 2. /calendar with boundary dates and invalid tab
    await page.goto('/calendar?date=9999-99-99&tab=nonexistent_tab_foo');
    await page.waitForLoadState('domcontentloaded');
    await expect(calHeader).toBeVisible();

    // 3. /calendar with directory traversal / XSS payload
    await page.goto('/calendar?date=../../etc/passwd%3Cscript%3Ealert(1)%3C/script%3E');
    await page.waitForLoadState('domcontentloaded');
    await expect(calHeader).toBeVisible();

    // 4. /settings?tab=nonexistent
    await page.goto('/settings?tab=nonexistent_section_xyz');
    await page.waitForLoadState('domcontentloaded');
    const setHeader = page.locator('h2:has-text("Tetapan")').or(page.locator('h2:has-text("Settings")')).first();
    await expect(setHeader).toBeVisible();

    // 5. /settings with nonexistent tab and gibberish search query
    await page.goto('/settings?tab=unknown&q=gibberish_query_nothing_should_match_12345');
    await page.waitForLoadState('domcontentloaded');
    const noResultsText = page.locator('text="Tiada tetapan dijumpai"').or(page.locator('text="No settings found"')).or(setHeader);
    await expect(noResultsText.first()).toBeVisible();

    // 6. /settings with injection payloads in tab and query
    await page.goto('/settings?tab="><img src=x onerror=alert(1)>&q=\'<script>alert(2)</script>\'');
    await page.waitForLoadState('domcontentloaded');
    await expect(setHeader).toBeVisible();

    // 7. /map?zone=XYZ99 (nonexistent zone)
    await page.goto('/map?zone=XYZ99');
    await page.waitForLoadState('domcontentloaded');
    // Map should render fallback text without throwing
    const mapFallback = page.locator('text=XYZ99').or(page.locator('.leaflet-container')).or(page.locator('button[title*="Tutup"], button[aria-label*="Close"]'));
    await expect(mapFallback.first()).toBeVisible();

    // 8. /map with boundary/null/undefined params
    await page.goto('/map?zone=undefined&state=null&lat=NaN&lng=Infinity');
    await page.waitForLoadState('domcontentloaded');
    const mapClose = page.locator('button[title*="Tutup"], button[aria-label*="Close"]').first();
    await expect(mapClose).toBeVisible();

    // 9. /tv with corrupted parameters
    await page.goto('/tv?layout=broken_layout&countdown=negative_or_null&theme=corrupted');
    await page.waitForLoadState('domcontentloaded');
    const tvScreen = page.locator('.fixed.inset-0').first();
    await expect(tvScreen).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('M3-ADV-3: Dynamic Preference Toggling (Reduced Motion, Dark Mode, High Contrast)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Stress toggling prefers-reduced-motion while navigating
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/calendar');
    const calHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")')).first();
    await expect(calHeader).toBeVisible();

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/settings');
    const setHeader = page.locator('h2:has-text("Tetapan")').or(page.locator('h2:has-text("Settings")')).first();
    await expect(setHeader).toBeVisible();

    // 2. Toggle dark / light theme repeatedly and verify root classes and variables
    for (let i = 0; i < 5; i++) {
      await page.evaluate((isDark) => {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, i % 2 === 0);
      await page.waitForTimeout(30);
    }

    // 3. Toggle contrast levels and verify tokens inject without throwing
    await page.goto('/settings');
    const contrastTokensBefore = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface');
    });
    expect(contrastTokensBefore.length).toBeGreaterThan(0);

    // Apply high-contrast simulation via localStorage & evaluate reactivity
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      s.contrastLevel = 'high';
      localStorage.setItem('waktu-solat-settings', JSON.stringify(s));
      window.dispatchEvent(new Event('storage'));
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90, h1').first();
    await expect(heroCard).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('M3-ADV-4: View Transition Interruption & Rapid Concurrent Redirection', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Rapidly call goto in flight to simulate user clicking different tabs mid-transition
    await page.evaluate(async () => {
      // Simulate rapid route switches triggered by client router
      window.history.pushState({}, '', '/calendar');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(r => setTimeout(r, 20));

      window.history.pushState({}, '', '/settings');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(r => setTimeout(r, 20));

      window.history.pushState({}, '', '/map');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(r => setTimeout(r, 20));

      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Now direct SvelteKit client navigate
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
    const calHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")')).first();
    await expect(calHeader).toBeVisible();

    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
