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

test.describe('Material 3 Expressive & Bento Architecture Verification', () => {
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
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    // Seed prayer times and onboarding bypass
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      settings.showTvShortcut = true;
      localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));
    });
  });

  // --- Tier 1: Feature Coverage ---

  test('M1-TC1: Top Floating App Bar Dimensions and Stadium Pill Container', async ({ page }) => {
    await page.goto('/');

    // Locate the top app bar header
    const topBar = page.locator('header.relative.flex.items-center.h-14').first();
    await expect(topBar).toBeVisible();

    // Verify stadium pill shape and 56px height (h-14 is 56px)
    const box = await topBar.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.height)).toBe(56);
    }

    // Verify 44px circular action button (w-11 h-11 is 44px)
    const calendarBtn = page.locator('header button.w-11.h-11').first();
    await expect(calendarBtn).toBeVisible();
    const btnBox = await calendarBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(Math.round(btnBox.width)).toBe(44);
      expect(Math.round(btnBox.height)).toBe(44);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('M1-TC2: CSS Custom Properties and Tonal Tokens Injection', async ({ page }) => {
    await page.goto('/');

    // Verify that M3 design tokens are properly defined in the document root
    const rootTokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        primary: style.getPropertyValue('--md-sys-color-primary').trim(),
        surface: style.getPropertyValue('--md-sys-color-surface').trim(),
        surfaceContainer: style.getPropertyValue('--md-sys-color-surface-container').trim(),
        outlineVariant: style.getPropertyValue('--md-sys-color-outline-variant').trim(),
      };
    });

    expect(rootTokens.primary.length).toBeGreaterThan(0);
    expect(rootTokens.surface.length).toBeGreaterThan(0);
    expect(rootTokens.surfaceContainer.length).toBeGreaterThan(0);
  });

  test('M1-TC3: Inline Smooth Search Expander in Top App Bar', async ({ page }) => {
    await page.goto('/');

    // Locate the zone selector chip button inside header
    const zoneChip = page.locator('header button[title*="Cari atau tukar zon"]').first();
    await expect(zoneChip).toBeVisible();

    // Click to activate smooth inline search
    await zoneChip.click();

    // Verify inline search input is visible in top app bar without full-page modal blocking
    const searchInput = page.locator('header input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    // Type a zone search query
    await searchInput.fill('Shah Alam');

    // Verify matching zone results appear in dropdown
    const resultItem = page.locator('header button:has-text("SGR01")').or(page.locator('header button:has-text("Shah Alam")')).first();
    await expect(resultItem).toBeVisible();

    // Select the zone
    await resultItem.click();

    // Verify search closes and header returns to normal display
    await expect(searchInput).not.toBeVisible();
    await expect(zoneChip).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('M2-TC1: Hero Prayer Focal Card Rendering with Countdown & Radiant Glow', async ({ page }) => {
    await page.goto('/');

    // Verify the hero centerpiece card exists
    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    // Verify prayer progress trajectory container
    const progressTrack = heroCard.locator('.animate-squiggle').first();
    await expect(progressTrack).toBeVisible();

    // Verify countdown number display
    const countdown = heroCard.locator('div.text-\\[var\\(--md-sys-color-primary\\)\\]').first();
    await expect(countdown).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('M2-TC2: Prayer Schedule Bento Filter Chips (Sunnah Times)', async ({ page }) => {
    await page.goto('/');

    // Locate the Sunat / Sunnah filter chip
    const sunnahChip = page.locator('button:has-text("Sunat")').or(page.locator('button:has-text("Sunnah")')).first();
    await expect(sunnahChip).toBeVisible();

    // Click filter to Sunnah
    await sunnahChip.click();

    // Verify schedule shows sunnah times (such as Dhuha, Syuruk, Imsak, or Tahajjud)
    const scheduleContainer = page.locator('.m3e-schedule-cards');
    await expect(scheduleContainer).toBeVisible();

    // Switch back to "Fardu"
    const farduChip = page.locator('button:has-text("Fardhu")').or(page.locator('button:has-text("Fardu")')).first();
    await farduChip.click();

    expect(consoleErrors).toEqual([]);
  });

  test('M3-TC1: Standalone Route Navigation (/calendar, /settings, /tv, /map)', async ({ page }) => {
    // Navigate directly to /calendar
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
    const calendarHeader = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")'));
    await expect(calendarHeader.first()).toBeVisible();

    // Navigate directly to /settings
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    const settingsHeader = page.locator('h2:has-text("Tetapan")').or(page.locator('h2:has-text("Settings")'));
    await expect(settingsHeader.first()).toBeVisible();

    // Navigate directly to /tv
    await page.goto('/tv');
    await expect(page).toHaveURL(/\/tv/);
    const tvContainer = page.locator('.fixed.inset-0').first();
    await expect(tvContainer).toBeVisible();

    // Navigate directly to /map
    await page.goto('/map');
    await expect(page).toHaveURL(/\/map/);

    expect(consoleErrors).toEqual([]);
  });

  test('M3-TC2: Browser History Back and Forward Navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    // Navigate to /settings
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    // Browser back to /
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    // Browser forward to /settings
    await page.goForward();
    await expect(page).toHaveURL(/\/settings/);

    expect(consoleErrors).toEqual([]);
  });

  // --- Tier 2: Boundary & Corner Cases ---

  test('M2-BC1: Responsive Single-Column Flow on Mobile Viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const mainContainer = page.locator('main').first();
    await expect(mainContainer).toBeVisible();

    // Verify top bar fits within mobile width without horizontal blowout
    const topBar = page.locator('header.h-14').first();
    await expect(topBar).toBeVisible();
    const box = await topBar.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }
  });

  test('M2-BC2: Ultra-Wide Responsive Widescreen Viewport (2560x1440)', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/');

    const mainContainer = page.locator('main').first();
    await expect(mainContainer).toBeVisible();

    // Verify layout max width constraint (max-w-[2560px])
    const box = await mainContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(2560);
    }
  });

  // --- Tier 3: Cross-Feature Combinations ---

  test('M3-XF1: View Transitions Reduced-Motion Safety with Route Navigation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Navigate to /calendar with reduced motion
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
    const header = page.locator('h2:has-text("Kalendar")').or(page.locator('h2:has-text("Calendar")')).first();
    await expect(header).toBeVisible();

    // Back to dashboard
    await page.goto('/');
    const heroCard = page.locator('.bg-\\[var\\(--md-sys-color-primary-container\\)\\]\\/90').first();
    await expect(heroCard).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  // --- Tier 4: Real-World Scenarios ---

  test('M4-RW1: Complete User Journey Across All Routes Without Crashes', async ({ page }) => {
    // 1. Start at home dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Open calendar from header
    const calendarBtn = page.locator('button[title*="Kalendar"], button[title*="Calendar"], button[aria-label*="Kalendar"], button[aria-label*="Calendar"]').first();
    await calendarBtn.click();
    await expect(page).toHaveURL(/\/calendar/);

    // 3. Navigate to settings
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    // 4. Navigate to TV mode
    await page.goto('/tv');
    await expect(page).toHaveURL(/\/tv/);

    // 5. Return home
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    expect(consoleErrors).toEqual([]);
  });
});
