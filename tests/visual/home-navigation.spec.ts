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

  test('presenta el mensaje principal y accesos directos a inventario y ventas', async ({ page }) => {
    const heading = page.getByRole('heading', {
      level: 1,
      name: 'Tu marca, en los lugares que todos ven.',
    });
    await expect(heading).toBeVisible();

    const hero = page.locator('section').filter({ has: heading });
    await expect(hero.getByRole('link', { name: 'Explorar inventario' })).toHaveAttribute('href', '/inventario');
    await expect(hero.getByRole('link', { name: 'Hablar con ventas' })).toHaveAttribute('href', '/contacto');
    await expect(hero.getByRole('searchbox')).toHaveCount(0);
  });

  test('no genera desbordamiento horizontal y mantiene visible el CTA en anchos PMV', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      const heading = page.getByRole('heading', {
        level: 1,
        name: 'Tu marca, en los lugares que todos ven.',
      });
      const hero = page.locator('section').filter({ has: heading });
      const cta = hero.getByRole('link', { name: 'Explorar inventario' });
      await expect(cta).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

      const ctaBox = await cta.boundingBox();
      expect(ctaBox).not.toBeNull();
      expect(ctaBox!.x).toBeGreaterThanOrEqual(0);
      expect(ctaBox!.x + ctaBox!.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('el CTA principal navega al inventario', async ({ page }) => {
    const heading = page.getByRole('heading', {
      level: 1,
      name: 'Tu marca, en los lugares que todos ven.',
    });
    const hero = page.locator('section').filter({ has: heading });
    await hero.getByRole('link', { name: 'Explorar inventario' }).click();
    await expect(page).toHaveURL(/\/inventario$/);
  });
});
