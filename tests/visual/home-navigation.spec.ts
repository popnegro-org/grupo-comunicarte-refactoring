import { test, expect } from '@playwright/test';

test.describe('Inicio · navegación principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/supports', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: [] }),
      });
    });
    await page.goto('/');
  });

  test('ofrece accesos directos a inventario y ventas desde el hero', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Tu marca, en los lugares que todos ven.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explorar inventario' }).first()).toHaveAttribute('href', '/inventario');
    await expect(page.getByRole('link', { name: 'Hablar con ventas' }).first()).toHaveAttribute('href', '/contacto');
    await expect(page.getByRole('searchbox', { name: 'Buscar soportes' })).toBeVisible();
  });

  test('no genera desbordamiento horizontal en desktop ni móvil', async ({ page }) => {
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });
});
