import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const supportFixture = {
  status: 'success',
  data: [{
    canonical_id: 'A11Y-SUPPORT-001',
    name: 'Soporte accesibilidad QA',
    ciudad: 'mendoza',
    tipo_soporte: 'tradicional',
    family: 'traditional',
    address: 'Centro · Mendoza',
    description: 'Soporte de prueba para auditoría de accesibilidad.',
    disponibilidad: 'disponible',
    imageUrls: [],
  }],
};

test.describe('Accesibilidad WCAG · rutas críticas', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/supports', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(supportFixture),
      });
    });
    await page.route('**/api/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: {} }),
      });
    });
    await page.route('**/api/admin/requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: [] }),
      });
    });
    await page.route('**/api/admin/support-pricing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: {} }),
      });
    });
  });

  for (const route of [
    { path: '/', heading: 'Tu marca, en los lugares que todos ven.' },
    { path: '/inventario', heading: 'Inventario de soportes publicitarios' },
    { path: '/contacto', heading: 'Hablemos de tu próxima campaña.' },
    { path: '/dashboard', heading: 'Dashboard' },
    { path: '/dashboard/solicitudes', heading: 'Solicitudes de Media Kit' },
    { path: '/dashboard/mediakits/nuevo', heading: 'Constructor de Media Kit' },
  ]) {
    test(route.path + ' cumple WCAG 2.1 AA y 2.2 AA', async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();

      const accessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(
        accessibility.violations,
        route.path + ': ' + JSON.stringify(accessibility.violations, null, 2),
      ).toEqual([]);
    });
  }
});
