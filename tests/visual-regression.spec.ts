import { test, expect } from '@playwright/test';
import path from 'path';

test('Visual Regression Testing', async ({ page, browserName }, testInfo) => {
  // Wait for the app to be fully loaded and animations to settle
  await page.goto('/');
  await page.waitForTimeout(2000); // Wait for GSAP/initial loading

  // Take full page screenshot of the main dashboard
  await page.screenshot({ path: `tests/artifacts/${browserName}_${testInfo.project.name.replace(' ', '_')}_01_dashboard.png`, fullPage: true });

});
