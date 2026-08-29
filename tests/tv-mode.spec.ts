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

test.describe('Mosque TV Mode Visual Configurations & Local Assets E2E', () => {

  test.beforeEach(async ({ page, makeOffline, writeIndexedDB }) => {
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`[BROWSER PAGEERROR] ${err.message}\n${err.stack}`);
    });

    // Seed prayer times so TV Mode view can render next prayer time while online
    await writeIndexedDB('prayer-times', MOCK_ZONE, MOCK_COMPRESSED_DATA);
    
    // Run all TV Mode tests in offline mode to force IndexedDB database retrieval
    await makeOffline();
    await page.addInitScript(() => {
      localStorage.setItem('waktu-solat-onboarding-completed', 'true');
      localStorage.setItem('waktu-solat-zone', 'WLY01');
      // Enable TV mode shortcut
      const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
      settings.showTvShortcut = true;
      localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));
    });
  });

  test('TV-1: Style Configurations (Patterns, Effects, and Border Colors)', async ({ page }) => {
    // Inject a TV mode reminder with custom style parameters
    await page.addInitScript(() => {
      const reminders = [
        {
          id: 'style-test-1',
          enabled: true,
          type: 'info',
          texts: [{ id: 'text-1', content: 'Style Test Notice', type: 'body' }],
          bgPattern: 'dots',
          bgEffect: 'ambient-pulses',
          borderHighlight: 'all',
          borderColor: '#ff00ff',
          bgGlowColor: '#00ffff'
        }
      ];
      localStorage.setItem('waktu-solat-settings', JSON.stringify({
        showTvShortcut: true,
        tvModeCenterWidget: 'reminders',
        tvModeRemindersList: reminders,
        tvModeReminderInterval: 60
      }));
    });

    await page.goto('/');
    // Navigate to TV Mode
    const tvBtn = page.locator('button[title="Mosque TV Mode"], button[title="Mod TV Masjid"], button[aria-label="Mosque TV Mode"], button[aria-label="Mod TV Masjid"]').first();
    await tvBtn.waitFor({ state: 'visible' });
    await tvBtn.click();

    // Verify reminder card container is visible
    const reminderCard = page.locator('.tv-reminder-card-container').first();
    await expect(reminderCard).toBeVisible();

    // Verify background pattern overlay is present (dots pattern)
    const patternOverlay = reminderCard.locator('.pattern-dots');
    await expect(patternOverlay).toBeVisible();

    // Verify background effect overlay is present (ambient-pulses)
    const effectOverlay = reminderCard.locator('.effect-ambient-pulses');
    await expect(effectOverlay).toBeVisible();

    // Verify custom border style and colors are applied
    await expect(reminderCard).toHaveClass(/tv-card-border-all/);
    
    // Check border color inline styles
    const borderStyleAttr = await reminderCard.getAttribute('style');
    expect(borderStyleAttr).toContain('border-color: rgb(255, 0, 255)');
    expect(borderStyleAttr).toContain('rgb(0, 255, 255)');
  });

  test('TV-2: Typography & Alignment Customizations', async ({ page }) => {
    // Inject a TV mode reminder with typography details
    await page.addInitScript(() => {
      const reminders = [
        {
          id: 'typo-test-1',
          enabled: true,
          type: 'info',
          texts: [
            {
              id: 'text-1',
              content: 'Custom Typography Content',
              type: 'title',
              size: 'xl',
              font: 'mono',
              weight: 'bold',
              align: 'right',
              color: '#e74c3c',
              glow: true,
              marquee: true
            }
          ]
        }
      ];
      localStorage.setItem('waktu-solat-settings', JSON.stringify({
        showTvShortcut: true,
        tvModeCenterWidget: 'reminders',
        tvModeRemindersList: reminders,
        tvModeReminderInterval: 60
      }));
    });

    await page.goto('/');
    const tvBtn = page.locator('button[title="Mosque TV Mode"], button[title="Mod TV Masjid"], button[aria-label="Mosque TV Mode"], button[aria-label="Mod TV Masjid"]').first();
    await tvBtn.click();

    // Find the text block container
    const marqueeContainer = page.locator('.card-marquee-container');
    await expect(marqueeContainer).toBeVisible();

    // Verify font classes robustly via attribute checks
    const classAttr = await marqueeContainer.getAttribute('class') || '';
    expect(classAttr).toContain('text-3xl'); // xl size in TV mode maps to text-3xl
    expect(classAttr).toContain('font-mono');
    expect(classAttr).toContain('font-bold');

    // Verify color, text shadow glow, and marquee content
    const styleAttr = await marqueeContainer.getAttribute('style');
    expect(styleAttr).toContain('color: rgb(231, 76, 60)');
    expect(styleAttr).toContain('text-shadow: rgb(231, 76, 60) 0px 0px 10px');

    const marqueeContent = marqueeContainer.locator('.card-marquee-content');
    await expect(marqueeContent).toBeVisible();
    await expect(marqueeContent).toContainText('Custom Typography Content');
  });

  test('TV-3: Dynamic Countdown Target (next-prayer)', async ({ page }) => {
    // Dhuhr is 13:10. Mock the clock at 13:00 on June 10, 2026. Next prayer (Dhuhr) is in 10 minutes.
    await page.clock.install({ time: new Date('2026-06-10T13:00:00').getTime() });

    await page.addInitScript(() => {
      const reminders = [
        {
          id: 'countdown-test-1',
          enabled: true,
          type: 'info',
          texts: [{ id: 'text-1', content: 'Prayer Countdown', type: 'body' }],
          countdownTarget: 'next-prayer',
          countdownLabel: 'Time until next prayer'
        }
      ];
      localStorage.setItem('waktu-solat-settings', JSON.stringify({
        showTvShortcut: true,
        tvModeCenterWidget: 'reminders',
        tvModeRemindersList: reminders,
        tvModeReminderInterval: 60
      }));
    });

    await page.goto('/');
    const tvBtn = page.locator('button[title="Mosque TV Mode"], button[title="Mod TV Masjid"], button[aria-label="Mosque TV Mode"], button[aria-label="Mod TV Masjid"]').first();
    await tvBtn.click();

    // Verify the countdown label
    await expect(page.locator('text=Time until next prayer')).toBeVisible();

    // Log the card text content for debugging
    await page.waitForTimeout(500);
    const cardText = await page.locator('.tv-reminder-card-container').first().innerText();
    console.log('--- CARD TEXT INITIAL ---', cardText);
    console.log('--- BODY TEXT INITIAL ---', await page.textContent('body'));

    // Verify the ticking countdown display (should show 10 or 9 minutes depending on execution delay)
    const card = page.locator('.tv-reminder-card-container').first();
    await expect(card).toContainText(/(09|10)\s*(Min|Mins)/);

    // Advance clock by 1 minute
    await page.clock.fastForward(60000);
    await page.waitForTimeout(100);
    const cardTextAfter = await page.locator('.tv-reminder-card-container').first().innerText();
    console.log('--- CARD TEXT AFTER ADVANCE ---', cardTextAfter);
    console.log('--- BODY TEXT AFTER ADVANCE ---', await page.textContent('body'));

    await expect(card).toContainText(/(08|09)\s*(Min|Mins)/);
  });

  test('TV-4: IndexedDB Offline Image Loading & Hydration', async ({ page }) => {
    // Reconstruct the 1x1 transparent PNG image Blob directly inside the browser's IndexedDB environment
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    await page.goto('/');
    await page.evaluate(async ({ base64 }) => {
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const pngBlob = new Blob([bytes], { type: 'image/png' });

      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('waktu-solat-db', 2);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('assets', 'readwrite');
          const store = tx.objectStore('assets');
          store.put(pngBlob, 'slideshow-image-test-key-1');
          store.put(pngBlob, 'reminder-image-test-key-1');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    }, { base64: base64Png });

    // Update settings with local slideshow URL and a reminder with the local image
    const reminders = [
      {
        id: 'local-media-reminder-1',
        enabled: true,
        type: 'info',
        texts: [{ id: 'text-1', content: 'Local Media Notice', type: 'body' }],
        images: [
          {
            id: 'img-1',
            isUploaded: true,
            assetKey: 'reminder-image-test-key-1',
            position: 'left',
            align: 'center',
            width: 150,
            shape: 'rounded-xl'
          }
        ]
      }
    ];

    await page.evaluate(({ rems }) => {
      localStorage.setItem('waktu-solat-settings', JSON.stringify({
        showTvShortcut: true,
        tvModeCenterWidget: 'slideshow',
        tvModeSlideshowUrls: 'local:slideshow-image-test-key-1',
        tvModeSlideshowInterval: 60,
        tvModeRemindersList: rems,
        tvModeReminderInterval: 60
      }));
    }, { rems: reminders });

    // Reload page to pick up updated localStorage settings
    await page.reload();

    const tvBtn = page.locator('button[title="Mosque TV Mode"], button[title="Mod TV Masjid"], button[aria-label="Mosque TV Mode"], button[aria-label="Mod TV Masjid"]').first();
    await tvBtn.click();

    // Verify slideshow element resolves to a local blob URL
    const slideshowImage = page.locator('img[alt="Slide 1"]').first();
    await expect(slideshowImage).toBeVisible();
    const slideSrc = await slideshowImage.getAttribute('src');
    expect(slideSrc).toMatch(/^blob:/);

    // Switch to reminders widget dynamically to verify local reminder notice image
    await page.evaluate(() => {
      (window as any).appSettings.updateSettings({ tvModeCenterWidget: 'reminders' });
    });

    // Verify reminder left image resolves to local blob URL
    const reminderImage = page.locator('img[alt="Reminder Media"]').first();
    await expect(reminderImage).toBeVisible();
    const reminderSrc = await reminderImage.getAttribute('src');
    expect(reminderSrc).toMatch(/^blob:/);

    // Verify width class and shape are applied correctly
    const styleAttr = await reminderImage.locator('..').getAttribute('style');
    expect(styleAttr).toContain('width: 150%');
    await expect(reminderImage.locator('..')).toHaveClass(/rounded-xl/);
  });
});
