import { test, expect } from '@playwright/test';

test.describe('Dashboard · estructura responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            total: 7,
            available: 5,
            reserved: 2,
            inactive: 0,
            mendozaTotal: 7,
            mendozaAvailable: 5,
            buenosAiresTotal: 0,
            buenosAiresAvailable: 0,
            tradicionalCount: 5,
            ledCount: 1,
            movilCount: 1,
            totalRequests: 3,
            pendingRequests: 1,
            plazaCount: 1,
          },
        }),
      });
    });
    await page.route('**/api/admin/requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: [] }),
      });
    });
    await page.goto('/dashboard');
  });

  test('mantiene navegación funcional y jerarquía del shell', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Grupo Comunicarte' }).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inventario', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Solicitudes Media Kits' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear Media Kit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inventario público' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clientes' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Inventario por tipología' })).toBeVisible();
    await expect(page.getByText('Tradicional', { exact: true })).toBeVisible();
    await expect(page.getByText('Pantallas LED', { exact: true })).toBeVisible();
    await expect(page.getByText('LED móvil', { exact: true })).toBeVisible();

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const sidebar = page.locator('aside');
    if (viewportWidth >= 768) {
      const sidebarBox = await sidebar.boundingBox();
      expect(sidebarBox?.width).toBe(256);
      const topbarBox = await page.locator('header').first().boundingBox();
      expect(topbarBox?.height).toBe(60);
    } else {
      const menuButton = page.getByRole('button', { name: 'Abrir menú' });
      const menuBounds = await menuButton.boundingBox();
      expect(menuBounds?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(menuBounds?.width ?? 0).toBeGreaterThanOrEqual(44);
      await menuButton.click();
      const sidebarBox = await sidebar.boundingBox();
      expect(sidebarBox?.width).toBe(256);
      await expect(sidebar.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
      const closeButton = sidebar.getByRole('button', { name: 'Cerrar menú' });
      const closeBounds = await closeButton.boundingBox();
      expect(closeBounds?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(closeBounds?.width ?? 0).toBeGreaterThanOrEqual(44);
    }

    const navLinks = sidebar.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link');
    for (let index = 0; index < await navLinks.count(); index += 1) {
      const bounds = await navLinks.nth(index).boundingBox();
      expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    for (const control of [
      sidebar.getByRole('link', { name: 'Inventario público' }),
      sidebar.getByRole('button', { name: 'Cerrar sesión' }),
      page.getByRole('link', { name: '0 solicitudes nuevas' }),
    ]) {
      const bounds = await control.boundingBox();
      expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const hasHorizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
