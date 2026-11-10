import { test, expect } from '@playwright/test';

test('Inventario adapta la vista inicial y carga Leaflet solo cuando se solicita el mapa', async ({ page }) => {
  const viewportWidth = page.viewportSize()?.width ?? 1280;
  const isMobile = viewportWidth < 768;
  const mapAssets: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/InventoryMap-') || request.url().includes('/assets/leaflet-')) {
      mapAssets.push(request.url());
    }
  });
  await page.route('**/api/supports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [{
        canonical_id: 'SUP-MAP-LAZY-001',
        name: 'Soporte Mapa Lazy',
        ciudad: 'mendoza',
        tipo_soporte: 'tradicional',
        disponibilidad: 'disponible',
        address: 'Av. San Martín 100, Mendoza',
        lat: -32.8895,
        lng: -68.8458,
        imageUrls: ['/mock-support-image.webp'],
      }] }),
    });
  });

  await page.route('**/mock-support-image.webp', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64') });
  });

  await page.goto('/inventario');
  await expect(page.getByRole('radiogroup', { name: 'Modo de visualización del inventario' })).toBeVisible();
  const catalog = page.getByRole('radio', { name: 'Catálogo' });
  const map = page.getByRole('radio', { name: 'Mapa' });
  await expect(isMobile ? catalog : map).toHaveAttribute('aria-checked', 'true');

  if (isMobile) {
    const firstCardImage = page.locator('article').first().locator('img').first();
    await expect(firstCardImage).toHaveAttribute('loading', 'eager');
    await expect(firstCardImage).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    expect(mapAssets).toHaveLength(0);
    await map.click();
  }

  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  await expect.poll(() => mapAssets.length).toBeGreaterThan(0);
});
