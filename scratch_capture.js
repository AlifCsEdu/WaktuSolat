import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Seed localStorage
  await page.addInitScript(() => {
    localStorage.setItem('waktu-solat-onboarding-completed', 'true');
    localStorage.setItem('waktu-solat-zone', 'WLY01');
    localStorage.setItem('waktu-solat-settings', JSON.stringify({
      language: "ms",
      timeFormat: "12h",
      mazhab: "shafii",
      notificationType: "in-app",
      showTvShortcut: true,
      tvModeEnabled: false,
      themeDark: false,
      themeColor: "#006c54",
      visualStyle: "default",
      themeShape: "rounded",
      wallpaperEnabled: true,
      wallpaperBlur: 10,
      wallpaperDim: 40
    }));
  });

  console.log("Navigating to calendar page...");
  await page.goto('http://localhost:8085/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // wait for transitions

  const screenshotPath = 'C:/Users/alif325/.gemini/antigravity/brain/34d1ee56-8302-4bf6-b495-b4394d5b70b0/scratch_calendar_default.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // Inspect the HTML of the body
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('C:/Users/alif325/.gemini/antigravity/brain/34d1ee56-8302-4bf6-b495-b4394d5b70b0/scratch/calendar_body.html', bodyHtml);
  console.log("Saved body HTML to scratch/calendar_body.html");

  // Check if glass style causes it
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('waktu-solat-settings') || '{}');
    settings.visualStyle = 'glass';
    localStorage.setItem('waktu-solat-settings', JSON.stringify(settings));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const screenshotPathGlass = 'C:/Users/alif325/.gemini/antigravity/brain/34d1ee56-8302-4bf6-b495-b4394d5b70b0/scratch_calendar_glass.png';
  await page.screenshot({ path: screenshotPathGlass });
  console.log(`Saved glass style screenshot to ${screenshotPathGlass}`);

  await browser.close();
}

run().catch(console.error);
