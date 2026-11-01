import { test, expect } from '@playwright/test';

const image = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#e5e7eb"/><rect x="70" y="70" width="1460" height="760" rx="28" fill="#cbd5e1"/><circle cx="800" cy="390" r="100" fill="#94a3b8"/><path d="M650 610h300" stroke="#64748b" stroke-width="28" stroke-linecap="round"/></svg>',
);

const fixture = {
  status: 'success',
  data: [
    { canonical_id: 'qa-tradicional-01', name: 'Pórtico Acceso Norte', ciudad: 'mendoza', tipo_soporte: 'tradicional', family: 'traditional', address: 'Acceso Norte · Mendoza', lat: -32.86, lng: -68.83, description: 'Soporte tradicional de prueba visual.', characteristics: 'Formato premium', disponibilidad: 'disponible', imageUrls: [image], technical: { measures: '12 × 5 m', caras: 2, monthly_impacts: 125000 } },
    { canonical_id: 'qa-led-01', name: 'Pantalla LED Centro', ciudad: 'mendoza', tipo_soporte: 'led', family: 'led', address: 'Centro · Mendoza', lat: -32.89, lng: -68.84, description: 'Pantalla LED de prueba visual.', characteristics: 'Alta resolución', disponibilidad: 'disponible', imageUrls: [image], technical: { measures: '8 × 4 m', resolution: 'P6', monthly_impacts: 240000 } },
    { canonical_id: 'qa-led-movil-01', name: 'Circuito LED Móvil', ciudad: 'mendoza', tipo_soporte: 'led_movil', family: 'led_mobile', description: 'Circuito móvil de prueba visual.', characteristics: 'Ruta urbana', disponibilidad: 'reservado', imageUrls: [image], duration: '8 h', schedule: 'Lun–Vie', waypoints: [{ name: 'Centro', lat: -32.89, lng: -68.84 }], routePath: [[-32.89, -68.84]], technical: { spot_duration_seconds: 15, monthly_impacts: 180000 } },
  ],
};

test.describe('Inventario · regresión visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/supports', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
    });
    await page.goto('/inventario?vista=catalogo');
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByText('Impactos / mes').first()).toBeVisible();
    // UI readiness is established by the assertions above. Avoid networkidle: analytics,
    // map tiles, and deployment-level requests can keep the browser network active indefinitely.
  });

  test('desktop mantiene jerarquía, estados y atributos de las tarjetas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Snapshot desktop solo en proyecto desktop');
    await expect(page.locator('article').first().getByText('Disponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar disponibilidad' })).toBeVisible();
    if (process.env.VISUAL_BASELINE_MODE !== 'true') {
      await expect(page.getByText('12 × 5 m')).toBeVisible();
      await expect(page.getByText('P6')).toBeVisible();
      await expect(page.getByText('8 h')).toBeVisible();
      await expect(page.getByRole('article').nth(1).getByText('Pendiente de mapeo')).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath('candidate-inventory-catalog-desktop.png') });
    await expect(page).toHaveScreenshot('inventory-catalog-desktop.png', { stylePath: 'tests/visual/screenshot.css' });
  });

  test('mobile mantiene tarjetas legibles y acciones accesibles', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Snapshot mobile solo en proyecto mobile');
    await expect(page.getByRole('button', { name: 'Seleccionar' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar disponibilidad' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('candidate-inventory-catalog-mobile.png') });
    await expect(page).toHaveScreenshot('inventory-catalog-mobile.png', { stylePath: 'tests/visual/screenshot.css' });
  });


  test('mapa responsive: marcadores y encuadre', async ({ page }, testInfo) => {
    await page.getByRole('radio', { name: 'Mapa' }).click();
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
    await map.screenshot({ path: testInfo.outputPath('candidate-inventory-map-responsive.png') });
    await expect(map).toHaveScreenshot('inventory-map-responsive.png', { stylePath: 'tests/visual/screenshot.css' });
  });

  test('mapa mantiene tipologías normalizadas y detalle en escritorio/móvil', async ({ page }) => {
    await page.getByRole('radio', { name: 'Mapa' }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers).toHaveCount(2);
    await markers.first().hover();
    await expect(page.locator('.leaflet-tooltip').first()).toContainText('Tradicional');
    await markers.nth(1).click();
    await expect(page.getByText('Soporte seleccionado')).toBeVisible();
    await expect(page.getByRole('article').getByText('Pendiente de mapeo')).toBeVisible();
  });

  test('soporte destacado muestra la etiqueta editorial', async ({ page }) => {
    await page.route('**/api/supports', async (route) => {
      const featuredFixture = {
        ...fixture,
        data: fixture.data.map((item, index) => index === 0 ? { ...item, isFeatured: true } : item),
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(featuredFixture) });
    });
    await page.reload();
    await expect(page.getByRole('article').first().getByText('Destacado')).toBeVisible();
  });

  test('el filtro distingue Pantallas LED de registros heredados sin mapear', async ({ page }) => {
    const typeFilter = page.getByRole('combobox', { name: 'Filtrar por tipo de soporte' });
    await typeFilter.selectOption('pantallas_led');
    await expect(page.getByText('Sin resultados con estos filtros')).toBeVisible();
    await expect(page.getByText('Con los filtros actuales no hay soportes confirmados como Pantallas LED.')).toBeVisible();
    await typeFilter.selectOption('pendiente_mapeo');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article').getByText('Pendiente de mapeo')).toBeVisible();
    await expect(page.getByText('Pórtico Acceso Norte')).toHaveCount(0);
  });

  test('selección cambia el estado visual sin perder la acción secundaria', async ({ page }, testInfo) => {
    await page.getByRole('button', { name: 'Seleccionar' }).first().click();
    await expect(page.getByRole('button', { name: 'Quitar selección' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver soporte' }).first()).toBeVisible();
    await page.locator('article').first().screenshot({ path: testInfo.outputPath('candidate-inventory-card-selected.png') });
    await expect(page.locator('article').first()).toHaveScreenshot('inventory-card-selected.png', { stylePath: 'tests/visual/screenshot.css' });
  });


  test('limpiar filtros aparece con filtros activos y restaura el inventario', async ({ page }) => {
    const plaza = page.getByRole('combobox', { name: 'Filtrar por plaza' });
    const clear = page.getByRole('button', { name: 'Limpiar todos los filtros' });
    await expect(clear).toHaveCount(0);
    await plaza.selectOption('mendoza');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(plaza).toHaveValue('todos');
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(clear).toHaveCount(0);
  });
});
