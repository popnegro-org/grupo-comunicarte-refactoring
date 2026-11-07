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

  test('el CTA del hero queda separado del buscador y funciona en todos los anchos PMV', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const cta = page.getByRole('link', { name: 'Explorar inventario' }).first();
      const searchForm = page.locator('form').first();
      await expect(cta).toBeVisible();
      await expect(searchForm).toBeVisible();
      const ctaBox = await cta.boundingBox();
      const searchBox = await searchForm.boundingBox();
      expect(ctaBox).not.toBeNull();
      expect(searchBox).not.toBeNull();
      expect(searchBox!.y).toBeGreaterThanOrEqual(ctaBox!.y + ctaBox!.height + 12);
      const hasHorizontalOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
      await cta.click();
      await expect(page).toHaveURL(/\/inventario$/);
    }
  });

  test('el buscador del hero envía la consulta al inventario', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Buscar soportes' }).fill('Mendoza');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page).toHaveURL(/\/inventario\?q=Mendoza$/);
  });

});
