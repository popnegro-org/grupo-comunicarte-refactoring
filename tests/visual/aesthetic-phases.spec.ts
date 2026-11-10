import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/supports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [{
        canonical_id: 'SUP-AESTHETIC-001',
        name: 'Soporte editorial de prueba',
        ciudad: 'mendoza',
        tipo_soporte: 'tradicional',
        disponibilidad: 'disponible',
        address: 'Av. San Martín 100, Mendoza',
        lat: -32.8895,
        lng: -68.8458,
        imageUrls: [],
      }] }),
    });
  });
  await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
});

test('navegación de escritorio conserva una sola línea en tablet landscape y desktop', async ({ page }) => {
  for (const width of [1024, 1050, 1152, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    const sales = page.getByRole('link', { name: 'Hablar con ventas' }).last();
    await expect(sales).toBeVisible();
    const box = await sales.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('menú móvil y tablet mantiene navegación accesible en 900px', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Abrir menú' });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: /Inventario/ })).toBeVisible();
});

test('páginas comerciales muestran fotografía real y mantienen el layout responsive', async ({ page }) => {
  for (const route of ['/soportes', '/soluciones', '/nosotros', '/contacto']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    if (route !== '/contacto') {
      const heroImage = page.locator('header img').first();
      await expect(heroImage).toBeVisible();
      expect(await heroImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('el mapa ofrece un listado sincronizado de soportes solo en escritorio amplio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/inventario');
  await expect(page.getByRole('complementary', { name: 'Listado de soportes del mapa' })).toBeVisible();
  const supportInMapList = page.getByRole('complementary', { name: 'Listado de soportes del mapa' }).getByRole('button', { name: /Soporte editorial de prueba/ });
  await expect(supportInMapList).toBeVisible();
  await supportInMapList.click();
  await expect(page.getByText('Soporte seleccionado')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('complementary', { name: 'Listado de soportes del mapa' })).toBeHidden();
});
