import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mockPublicSupports(page: import('@playwright/test').Page) {
  await page.route('**/api/supports', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [] }),
    });
  });
}

test.describe('Accesibilidad · navegación y formularios', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicSupports(page);
  });

  test('permite saltar la navegación y enfocar el contenido principal', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('traslada el foco al contenido principal al navegar entre rutas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Nosotros' }).click();

    await expect(page).toHaveURL(/\/nosotros$/);
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('el selector Mapa/Catálogo expone el estado seleccionado como botones toggle', async ({ page }) => {
    await page.goto('/inventario');
    const group = page.getByRole('group', { name: 'Modo de visualización del inventario' });
    const mapButton = group.getByRole('button', { name: 'Mapa' });
    const catalogButton = group.getByRole('button', { name: 'Catálogo' });

    await expect(mapButton).toHaveAttribute('aria-pressed', 'true');
    await expect(catalogButton).toHaveAttribute('aria-pressed', 'false');
    await catalogButton.click();
    await expect(catalogButton).toHaveAttribute('aria-pressed', 'true');
    await expect(mapButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('anuncia y enfoca la confirmación de envío del formulario', async ({ page }) => {
    await page.route('**/api/mediakit/request', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', requestId: 'REQ-TEST-001' }),
      });
    });

    await page.goto('/contacto');
    await expect(page.getByLabel('Nombre completo *')).toHaveAttribute('autocomplete', 'name');
    await expect(page.getByLabel('Email *')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('Teléfono')).toHaveAttribute('type', 'tel');
    await expect(page.getByLabel('Teléfono')).toHaveAttribute('autocomplete', 'tel');

    await page.getByLabel('Nombre completo *').fill('Equipo de prueba');
    await page.getByLabel('Email *').fill('qa@example.com');
    await page.getByRole('button', { name: 'Enviar consulta' }).click();

    const confirmation = page.getByRole('heading', { name: 'Solicitud enviada' });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toBeFocused();
    await expect(page.getByRole('status').filter({ has: confirmation })).toBeVisible();
  });

  test('mantiene conformidad automatizada WCAG 2.2 AA en páginas públicas principales', async ({ page }) => {
    for (const path of ['/', '/nosotros', '/soluciones', '/inventario', '/contacto', '/mediakits']) {
      await page.goto(path);
      await page.locator('#main-content').waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(
        results.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })),
        })),
        `Violaciones WCAG en ${path}`,
      ).toEqual([]);
    }
  });
});
