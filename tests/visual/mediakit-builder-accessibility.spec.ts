import { test, expect } from '@playwright/test';

test('Media Kit builder: accessible controls, keyboard flow and mobile touch targets', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const exportChunkRequests: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('adminMediaKitExport-')) exportChunkRequests.push(request.url());
  });

  await page.route('**/api/admin/stats', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });
  await page.route('**/api/admin/requests', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
  });
  await page.route('**/api/supports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [{
        canonical_id: 'SUP-ACCESS-001',
        name: 'Soporte Demo Accesible',
        ciudad: 'Mendoza',
        tipo_soporte: 'LED',
        disponibilidad: 'disponible',
      }] }),
    });
  });
  await page.route('**/api/admin/support-pricing', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });

  await page.goto('/dashboard/mediakits/nuevo');
  await expect(page.getByRole('heading', { name: 'Constructor de Media Kit' })).toBeVisible();

  const clientName = page.getByLabel('Nombre *');
  const company = page.getByLabel('Empresa');
  const email = page.getByLabel('Email');
  const phone = page.getByLabel('Teléfono');
  const search = page.getByRole('searchbox', { name: 'Buscar soportes del inventario' });
  await expect(clientName).toBeVisible();
  await expect(company).toBeVisible();
  await expect(email).toHaveAttribute('type', 'email');
  await expect(phone).toHaveAttribute('type', 'tel');
  await expect(search).toBeVisible();

  await search.fill('sin-coincidencias');
  await expect(page.getByRole('status').filter({ hasText: 'No encontramos soportes que coincidan con la búsqueda.' })).toBeVisible();
  await search.clear();

  const supportToggle = page.getByRole('button', { name: 'Agregar Soporte Demo Accesible' });
  await search.focus();
  await page.keyboard.press('Tab');
  await expect(supportToggle).toBeFocused();
  await expect(supportToggle).toHaveAttribute('aria-pressed', 'false');
  await supportToggle.click();
  await expect(page.getByRole('button', { name: 'Quitar Soporte Demo Accesible' })).toHaveAttribute('aria-pressed', 'true');

  const remove = page.getByRole('button', { name: 'Quitar Soporte Demo Accesible del Media Kit' });
  const removeBox = await remove.boundingBox();
  expect(removeBox?.width).toBeGreaterThanOrEqual(44);
  expect(removeBox?.height).toBeGreaterThanOrEqual(44);

  const clientNameBox = await clientName.boundingBox();
  const searchBox = await search.boundingBox();
  expect(clientNameBox?.height).toBeGreaterThanOrEqual(44);
  expect(searchBox?.height).toBeGreaterThanOrEqual(44);

  const saveDraft = page.getByRole('button', { name: 'Guardar borrador' });
  const saveBox = await saveDraft.boundingBox();
  expect(saveBox?.height).toBeGreaterThanOrEqual(44);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
  expect(exportChunkRequests).toHaveLength(0);

  await remove.click();
  await expect(supportToggle).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(100);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
