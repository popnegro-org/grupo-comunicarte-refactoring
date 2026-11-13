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
    if (testInfo.project.name !== 'chromium-desktop') {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.reload();
      await expect(page.getByRole('article')).toHaveCount(3);
    }
    await expect(page.locator('article').first().getByText('Disponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar disponibilidad' })).toBeVisible();
    if (process.env.VISUAL_BASELINE_MODE !== 'true') {
      await expect(page.getByText('12 × 5 m')).toBeVisible();
      await expect(page.getByText('P6')).toBeVisible();
      await expect(page.getByText('8 h')).toBeVisible();
      await expect(page.getByRole('article').nth(1).getByText('Pantallas LED')).toBeVisible();
    }
    if (testInfo.project.name === 'chromium-desktop') {
      await expect(page.getByTestId('page-transition')).toHaveCSS('opacity', '1');
      await page.screenshot({ path: testInfo.outputPath('candidate-inventory-catalog-desktop.png') });
      await expect(page).toHaveScreenshot('inventory-catalog-desktop.png', { stylePath: 'tests/visual/screenshot.css' });
    }
  });

  test('mobile mantiene tarjetas legibles y acciones accesibles', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'chromium-mobile') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expect(page.getByRole('article')).toHaveCount(3);
    }
    await expect(page.getByRole('button', { name: 'Seleccionar' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar disponibilidad' })).toBeVisible();
    if (testInfo.project.name === 'chromium-mobile') {
      await expect(page.getByTestId('page-transition')).toHaveCSS('opacity', '1');
      await page.screenshot({ path: testInfo.outputPath('candidate-inventory-catalog-mobile.png') });
      await expect(page).toHaveScreenshot('inventory-catalog-mobile.png', { stylePath: 'tests/visual/screenshot.css' });
    }
  });


  test('mapa responsive: marcadores y encuadre', async ({ page }, testInfo) => {
    await page.getByRole('group', { name: 'Modo de visualización del inventario' }).getByRole('button', { name: 'Mapa' }).click();
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
    if (testInfo.project.name === 'chromium-mobile') {
      // The snapshot isolates the map; normalize the toolbar's newer 40px touch targets
      // to the base branch's 36px layout so the map comparison excludes toolbar-only height changes.
      await page.addStyleTag({ content: `
        button[aria-label="Buscar soportes cerca de mi ubicación"],
        select[aria-label="Filtrar por plaza"] {
          height: 36px !important;
          min-height: 36px !important;
        }
      ` });
      // Recalculate Leaflet's viewport after normalizing the map container height.
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    }
    await expect(page.getByTestId('page-transition')).toHaveCSS('opacity', '1');
      await map.screenshot({ path: testInfo.outputPath('candidate-inventory-map-responsive.png') });
    await expect(map).toHaveScreenshot('inventory-map-responsive.png', { stylePath: 'tests/visual/screenshot.css' });
  });

  test('mapa mantiene tipologías normalizadas y detalle en escritorio/móvil', async ({ page }) => {
    await page.getByRole('group', { name: 'Modo de visualización del inventario' }).getByRole('button', { name: 'Mapa' }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers).toHaveCount(2);
    await markers.first().hover();
    await expect(page.locator('.leaflet-tooltip').first()).toContainText('Tradicional');
    await markers.nth(1).click();
    await expect(page.getByText('Soporte seleccionado')).toBeVisible();
    await expect(page.getByRole('article').getByText('Pantallas LED')).toBeVisible();
  });

  test('elimina encabezado redundante y contadores duplicados del mapa y toolbar', async ({ page }) => {
    await expect(page.getByText('Grupo Comunicarte · OOH')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Inventario de soportes', exact: true })).toHaveCount(0);
    await expect(page.getByText('Explorá ubicaciones, compará formatos y armá tu selección.')).toHaveCount(0);
    await expect(page.getByText(/\d+ resultados/)).toHaveCount(0);
    await page.getByRole('group', { name: 'Modo de visualización del inventario' }).getByRole('button', { name: 'Mapa' }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByText(/\d+ soportes en esta vista/)).toHaveCount(0);
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

  test('el filtro comercial muestra las Pantallas LED tipificadas en Neon y oculta estados internos', async ({ page }) => {
    const typeFilter = page.getByRole('combobox', { name: 'Filtrar por tipo de soporte' });
    await typeFilter.selectOption('pantallas_led');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article').getByText('Pantallas LED')).toBeVisible();
    await expect(typeFilter.locator('option')).toHaveCount(4);
    await expect(typeFilter.locator('option', { hasText: 'Pendiente de mapeo' })).toHaveCount(0);
    await expect(page.getByText('Pórtico Acceso Norte')).toHaveCount(0);
  });

  test('selección cambia el estado visual sin perder la acción secundaria', async ({ page }, testInfo) => {
    await page.getByRole('button', { name: 'Seleccionar' }).first().click();
    await expect(page.getByRole('button', { name: 'Quitar selección' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver soporte' }).first()).toBeVisible();
    if (testInfo.project.name === 'chromium-mobile') {
      // Give the card enough vertical viewport to capture it without the sticky header or fixed selection bar covering its edges.
      await page.setViewportSize({ width: 390, height: 1000 });
    }
    await page.locator('article').first().evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await expect(page.getByTestId('page-transition')).toHaveCSS('opacity', '1');
      await page.locator('article').first().screenshot({ path: testInfo.outputPath('candidate-inventory-card-selected.png') });
    await expect(page.locator('article').first()).toHaveScreenshot('inventory-card-selected.png', { stylePath: 'tests/visual/screenshot.css' });
  });


  test('los controles del inventario respetan objetivos táctiles de 44px en móvil', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'chromium-mobile') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
    }
    const controls = [
      page.getByRole('textbox', { name: 'Buscar soportes' }),
      page.getByRole('button', { name: 'Buscar soportes cerca de mi ubicación' }),
      page.getByRole('combobox', { name: 'Filtrar por plaza' }),
      page.getByRole('combobox', { name: 'Filtrar por tipo de soporte' }),
      page.getByRole('combobox', { name: 'Filtrar por disponibilidad' }),
      page.getByRole('group', { name: 'Modo de visualización del inventario' }).getByRole('button', { name: 'Mapa' }),
      page.getByRole('group', { name: 'Modo de visualización del inventario' }).getByRole('button', { name: 'Catálogo' }),
    ];
    for (const control of controls) {
      await expect(control).toBeVisible();
      const cssHeight = await control.evaluate((element) => Number.parseFloat(window.getComputedStyle(element).height));
      expect(cssHeight).toBeCloseTo(44, 1);
      const bounds = await control.boundingBox();
      // Chromium can report a sub-pixel box such as 43.99998 for a 44px CSS control.
      expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(43.9);
    }
  });

  test('la barra de selección acompaña al catálogo y abre el Media Kit', async ({ page }) => {
    await expect(page.getByText('soportes seleccionados', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Seleccionar' }).first().click();
    const selectionBar = page.locator('div.fixed.inset-x-0.bottom-0').filter({ has: page.getByRole('link', { name: 'Revisar selección' }) });
    await expect(selectionBar).toBeVisible();
    await expect(selectionBar).toContainText('1 soporte seleccionado');
    await selectionBar.getByRole('link', { name: 'Revisar selección' }).click();
    await expect(page).toHaveURL(/\/mediakits$/);
    await expect(page.getByText('1 soporte', { exact: false }).first()).toBeVisible();
  });

  test('la barra de selección no tapa el mapa y solo aparece en catálogo', async ({ page }) => {
    await page.getByRole('button', { name: 'Seleccionar' }).first().click();
    await expect(page.getByRole('link', { name: 'Revisar selección' })).toBeVisible();
    await page.getByRole('group', { name: 'Modo de visualización del inventario' }).getByRole('button', { name: 'Mapa' }).click();
    await expect(page.getByRole('link', { name: 'Revisar selección' })).toHaveCount(0);
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
