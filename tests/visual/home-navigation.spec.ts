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


  test('muestra la sección editorial de casos OOH y DOOH sin atribuir campañas o resultados no verificados', async ({ page }) => {
    const section = page.getByRole('region', { name: 'Casos de éxito' });
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Casos de éxito' })).toBeVisible();
    await expect(section.getByText('OOH · Buenos Aires')).toBeVisible();
    await expect(section.getByText('DOOH · Mendoza')).toBeVisible();
    await expect(section.getByText(/no representan campañas de anunciantes ni resultados medidos/i)).toBeVisible();
    await expect(section.getByRole('link', { name: 'Desarrollá tu próxima campaña' })).toHaveAttribute('href', '/contacto');
  });

  test('la página Nosotros presenta el contenido institucional y las dos plazas', async ({ page }) => {
    await page.goto('/nosotros');
    await expect(page.getByRole('heading', { name: 'Conectamos marcas con audiencias en movimiento.' })).toBeVisible();
    await expect(page.getByText(/más de 20 años en la industria del OOH/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Buenos Aires', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mendoza', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explorar soportes' }).first()).toHaveAttribute('href', '/inventario?plaza=buenos-aires');
    await expect(page.getByRole('link', { name: 'Explorar soportes' }).nth(1)).toHaveAttribute('href', '/inventario?plaza=mendoza');
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
