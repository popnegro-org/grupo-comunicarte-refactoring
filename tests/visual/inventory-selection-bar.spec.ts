import { expect, test } from '@playwright/test';

const fixture = {
  status: 'success',
  data: [{
    canonical_id: 'qa-inventory-selection',
    name: 'Soporte de selección QA',
    ciudad: 'mendoza',
    tipo_soporte: 'tradicional',
    family: 'traditional',
    address: 'Centro · Mendoza',
    lat: -32.89,
    lng: -68.84,
    disponibilidad: 'disponible',
    technical: { measures: '12 × 5 m', caras: 2, monthly_impacts: 125000 },
  }],
};

test.describe('Inventario público · selección persistente', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/supports', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    }));
    await page.goto('/inventario?vista=catalogo');
    await expect(page.getByRole('article')).toHaveCount(1);
  });

  test('muestra la barra contextual y permite revisar la selección', async ({ page }) => {
    await page.getByRole('button', { name: 'Seleccionar' }).click();
    const review = page.getByRole('link', { name: 'Revisar selección' });
    await expect(review).toBeVisible();
    await expect(page.getByText('1 soporte seleccionado', { exact: true })).toBeVisible();
    await review.click();
    await expect(page).toHaveURL(/\/mediakits$/);
    await expect(page.getByText('Soporte de selección QA')).toBeVisible();
  });

  test('oculta la barra contextual al volver al mapa', async ({ page }) => {
    await page.getByRole('button', { name: 'Seleccionar' }).click();
    await expect(page.getByRole('link', { name: 'Revisar selección' })).toBeVisible();
    await page.getByRole('group', { name: 'Modo de visualización del inventario' }).getByRole('button', { name: 'Mapa' }).click();
    await expect(page.getByRole('link', { name: 'Revisar selección' })).toHaveCount(0);
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });
});
