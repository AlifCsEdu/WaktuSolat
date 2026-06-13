import { chromium } from '@playwright/test';

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Seed local storage before navigation
  await context.addInitScript(() => {
    localStorage.setItem('waktu-solat-onboarding-completed', 'true');
    localStorage.setItem('waktu-solat-zone', 'WLY01');
    localStorage.setItem('azan-alert-dismissed', 'true');
  });

  const page = await context.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error(`[BROWSER EXCEPTION] ${err.message}`);
  });

  try {
    console.log("Navigating to http://localhost:8085...");
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(2500); // Let layout render and mock data load
    
    console.log("Current URL:", page.url());
    
    // Check map button
    const mapBtn = page.locator('[style*="view-transition-name: map-transition"] md-filled-tonal-icon-button, md-filled-tonal-icon-button[title*="eta"]').first();
    const mapBtnCount = await mapBtn.count();
    console.log(`Found ${mapBtnCount} map button(s).`);
    if (mapBtnCount > 0) {
      console.log("Clicking map button...");
      await mapBtn.click();
      await page.waitForTimeout(1000);
      console.log("Is MapModal open? Let's check map modal text...");
      const mapHeader = page.locator('h3:has-text("Peta")');
      const mapVisible = await mapHeader.isVisible().catch(() => false);
      console.log("MapModal header visible:", mapVisible);
    }

    // Go back to home
    await page.goto('http://localhost:8085');
    await page.waitForTimeout(1000);

    // Check weather card click
    const weatherCard = page.locator('[style*="view-transition-name: weather-transition"]').first();
    const weatherCardCount = await weatherCard.count();
    console.log(`Found ${weatherCardCount} weather card(s).`);
    if (weatherCardCount > 0) {
      console.log("Clicking weather card...");
      await weatherCard.click();
      await page.waitForTimeout(1000);
      console.log("Is WeatherModal open?");
      const weatherHeader = page.locator('h2:has-text("Cuaca")').or(page.locator('h2:has-text("Weather")'));
      const weatherVisible = await weatherHeader.first().isVisible().catch(() => false);
      console.log("WeatherModal header visible:", weatherVisible);
    }

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
