import { test, expect } from '@playwright/test';

test.describe('Dashboard · bandeja de solicitudes', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/admin/stats', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
    });
  });

  test('adapta la lista a tarjetas móviles y tabla desktop', async ({ page }) => {
    await page.route('**/api/admin/requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: [{
          id: 1,
          requestId: 'REQ-UX-001',
          requesterName: 'Cliente de prueba',
          requesterEmail: 'cliente@example.com',
          requesterCompany: 'Empresa de prueba',
          status: 'pending',
          supportIds: ['SUP-001', 'SUP-002'],
          supportNames: ['Soporte 1', 'Soporte 2'],
          createdAt: '2026-11-01T10:00:00.000Z',
        }] }),
      });
    });

    await page.goto('/dashboard/solicitudes');
    await expect(page.getByRole('heading', { name: 'Solicitudes de Media Kit' })).toBeVisible();
    const mobileCards = page.locator('[aria-label="Solicitudes en tarjetas"]');
    const desktopTable = page.getByRole('table', { name: 'Tabla de solicitudes de Media Kit' });
    if ((page.viewportSize()?.width ?? 0) < 768) {
      await expect(mobileCards).toBeVisible();
      await expect(mobileCards.getByText('Cliente de prueba')).toBeVisible();
      await expect(desktopTable).toBeHidden();
      const action = mobileCards.getByRole('button', { name: 'Ver solicitud' });
      const bounds = await action.boundingBox();
      expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    } else {
      await expect(desktopTable).toBeVisible();
      await expect(desktopTable.getByText('Cliente de prueba')).toBeVisible();
      await expect(mobileCards).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('distingue error de carga del estado vacío y permite reintentar', async ({ page }) => {
    let attempts = 0;
    await page.route('**/api/admin/requests', async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'error', message: 'Servicio temporalmente no disponible.' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });

    await page.goto('/dashboard/solicitudes');
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar las solicitudes');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Todavía no hay solicitudes registradas.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    // React StrictMode may issue the initial request twice in development/QA.\n    // The failed first response plus a successful retry must both be observed.\n    expect(attempts).toBeGreaterThanOrEqual(2);
  });
});
