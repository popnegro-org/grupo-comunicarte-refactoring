import { test, expect } from '@playwright/test';

const image = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#e5e7eb"/><rect x="70" y="70" width="1460" height="760" rx="28" fill="#cbd5e1"/><circle cx="800" cy="390" r="100" fill="#94a3b8"/><path d="M650 610h300" stroke="#64748b" stroke-width="28" stroke-linecap="round"/></svg>',
);

const fixture = {
  status: 'success',
  data: [
    { canonical_id: 'qa-tradicional-01', name: 'Pórtico Acceso Norte', ciudad: 'mendoza', tipo_soporte: 'tradicional', family: 'traditional', address: 'Acceso Norte · Mendoza', description: 'Soporte tradicional de prueba visual.', characteristics: 'Formato premium', disponibilidad: 'disponible', imageUrls: [image], technical: { measures: '12 × 5 m', caras: 2, monthly_impacts: 125000 } },
    { canonical_id: 'qa-led-01', name: 'Pantalla LED Centro', ciudad: 'mendoza', tipo_soporte: 'led', family: 'led', address: 'Centro · Mendoza', description: 'Pantalla LED de prueba visual.', characteristics: 'Alta resolución', disponibilidad: 'disponible', imageUrls: [image], technical: { measures: '8 × 4 m', resolution: 'P6', monthly_impacts: 240000 } },
    { canonical_id: 'qa-led-movil-01', name: 'Circuito LED Móvil', ciudad: 'mendoza', tipo_soporte: 'led_movil', family: 'led_mobile', description: 'Circuito móvil de prueba visual.', characteristics: 'Ruta urbana', disponibilidad: 'reservado', imageUrls: [image], duration: '8 h', schedule: 'Lun–Vie', waypoints: [{ name: 'Centro', lat: -32.89, lng: -68.84 }], routePath: [[-32.89, -68.84]], technical: { spot_duration_seconds: 15, monthly_impacts: 180000 } },
  ],
};

test.describe('Inventario · regresión visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/supports', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
    });
    await page.goto('/inventario?vista=catalogo');

    // Public routes intentionally render Coming Soon during this migration phase.
    // Keep inventory regression coverage for the day the public catalog is restored.
    if (await page.getByRole('heading', { name: 'Publicidad exterior en Mendoza y Buenos Aires' }).isVisible().catch(() => false)) {
      test.skip(true, 'El inventario público está temporalmente reemplazado por Coming Soon.');
    }

    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByText('Impactos / mes').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test('desktop mantiene jerarquía, estados y atributos de las tarjetas', async ({ page }) => {
    await expect(page.locator('article').first().getByText('Disponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar disponibilidad' })).toBeVisible();
    await expect(page.getByText('12 × 5 m')).toBeVisible();
    await expect(page.getByText('P6')).toBeVisible();
    await expect(page.getByText('8 h')).toBeVisible();
    await expect(page).toHaveScreenshot('inventory-catalog-desktop.png', { stylePath: 'tests/visual/screenshot.css' });
  });

  test('mobile mantiene tarjetas legibles y acciones accesibles', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Seleccionar' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar disponibilidad' })).toBeVisible();
    await expect(page).toHaveScreenshot('inventory-catalog-mobile.png', { stylePath: 'tests/visual/screenshot.css' });
  });

  test('selección cambia el estado visual sin perder la acción secundaria', async ({ page }) => {
    await page.getByRole('button', { name: 'Seleccionar' }).first().click();
    await expect(page.getByRole('button', { name: 'Quitar selección' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver soporte' }).first()).toBeVisible();
    await expect(page.locator('article').first()).toHaveScreenshot('inventory-card-selected.png', { stylePath: 'tests/visual/screenshot.css' });
  });
});
