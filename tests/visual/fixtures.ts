import { test as base, expect } from '@playwright/test';

/**
 * Dashboard visual tests exercise authenticated UI states with deterministic
 * fixtures. The app's HttpOnly session probe is mocked here; each spec remains
 * responsible for mocking the data endpoints it actually exercises.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/admin/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { authenticated: true } }),
      });
    });
    await use(page);
  },
});

export { expect };
