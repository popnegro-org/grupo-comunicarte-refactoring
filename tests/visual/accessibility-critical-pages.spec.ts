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
    lat: -32.8895,
    lng: -68.8458,
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
    { path: '/soportes' },
    { path: '/inventario', heading: 'Inventario de soportes publicitarios' },
    { path: '/soluciones' },
    { path: '/nosotros' },
    { path: '/mediakits' },
    { path: '/contacto', heading: 'Hablemos de tu próxima campaña.' },
    { path: '/dashboard', heading: 'Dashboard' },
    { path: '/dashboard/solicitudes', heading: 'Solicitudes de Media Kit' },
    { path: '/dashboard/mediakits/nuevo', heading: 'Constructor de Media Kit' },
  ]) {
    test(route.path + ' cumple WCAG 2.1 AA y 2.2 AA sin errores JS', async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto(route.path);
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
      const transition = page.getByTestId('page-transition');
      if (await transition.count()) {
        await expect(transition).toHaveCSS('opacity', '1');
      }
      if (route.heading) {
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
      } else {
        await expect(page.getByRole('heading').first()).toBeVisible();
      }

      const accessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(
        accessibility.violations,
        route.path + ': ' + JSON.stringify(accessibility.violations, null, 2),
      ).toEqual([]);
      expect(pageErrors, route.path + ' uncaught browser exceptions').toEqual([]);
    });
  }
  test('las páginas públicas tienen un único landmark main y ofrecen salto al contenido', async ({ page }) => {
    for (const path of ['/', '/nosotros', '/inventario', '/mediakits', '/contacto']) {
      await page.goto(path);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toHaveCount(1);
    }
  });

  test('el enlace Saltar al contenido mueve el foco al landmark principal', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.getByRole('link', { name: 'Saltar al contenido' });
    await skipLink.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('la navegación SPA mueve el foco al contenido de la nueva ruta', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Navegación del pie de página' }).getByRole('link', { name: 'Nosotros' }).click();
    await expect(page).toHaveURL(/\/nosotros$/);
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('Mapa y Catálogo son botones accesibles y operables con teclado', async ({ page }) => {
    await page.goto('/inventario');
    const group = page.getByRole('group', { name: 'Modo de visualización del inventario' });
    const catalog = group.getByRole('button', { name: 'Catálogo' });
    await catalog.click();
    await expect(catalog).toHaveAttribute('aria-pressed', 'true');
    await catalog.focus();
    await page.keyboard.press('Space');
    await expect(catalog).toHaveAttribute('aria-pressed', 'false');
  });

  test('la confirmación del formulario anuncia el resultado y recibe el foco', async ({ page }) => {
    await page.route('**/api/mediakit/request', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', requestId: 'REQ-A11Y-001' }),
      });
    });
    await page.goto('/contacto');
    await page.getByLabel('Nombre completo *').fill('Prueba Accesibilidad');
    await page.getByLabel('Email *').fill('qa@example.com');
    await page.getByRole('button', { name: 'Enviar consulta' }).click();
    await expect(page.getByRole('status')).toHaveText('Enviando tu solicitud.');
    const confirmation = page.getByRole('status');
    await expect(confirmation).toContainText('Recibimos tu consulta.');
    await expect(page.getByRole('heading', { name: 'Solicitud enviada' })).toBeFocused();
  });

});
