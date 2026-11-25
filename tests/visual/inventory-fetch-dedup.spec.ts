import { test, expect } from '@playwright/test';

test('Inventario comparte una única carga de soportes entre Navbar, SearchModal y página', async ({ page }) => {
  let requests = 0;
  const requestOrder: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/supports')) requestOrder.push('supports');
    if (request.url().includes('/assets/Inventario-')) requestOrder.push('inventario-chunk');
  });
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.route('**/api/supports', async (route) => {
    requests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [] }),
    });
  });

  await page.goto('/inventario');
  await expect(page.getByRole('heading', { name: 'Inventario de soportes publicitarios' })).toBeVisible();
  await expect(page.getByText('Sin resultados con estos filtros')).toBeVisible();
  expect(requests).toBe(1);
  expect(requestOrder.indexOf('supports')).toBeGreaterThanOrEqual(0);
  expect(requestOrder.indexOf('inventario-chunk')).toBeGreaterThanOrEqual(0);
  expect(requestOrder.indexOf('supports')).toBeLessThan(requestOrder.indexOf('inventario-chunk'));
});
