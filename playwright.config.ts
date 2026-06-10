import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false, // Turn off for offline tests to avoid parallel state contamination
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker avoids database locks and concurrency errors during IndexedDB manipulation
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
    video: 'on-first-retry',
    permissions: ['notifications', 'geolocation'],
    geolocation: { latitude: 3.1390, longitude: 101.6869 }, // Default coordinates (Kuala Lumpur)
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        bypassCSP: true, // Allows script injections to inspect Service Worker & DB caches
        launchOptions: {
          args: [
            '--enable-features=NetworkServiceInProcess',
            '--disable-features=IsolateOrigins,site-per-process' // Needed for cross-iframe/service-worker evaluations
          ]
        }
      },
    }
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 3001',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
