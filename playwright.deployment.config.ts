import { defineConfig, devices } from '@playwright/test';

if (!process.env.PLAYWRIGHT_BASE_URL) {
  throw new Error('PLAYWRIGHT_BASE_URL es obligatorio para el smoke test de deployment.');
}

export default defineConfig({
  testDir: './tests/deployment',
  outputDir: './test-results/deployment',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Mendoza',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
