import { test, expect } from '@playwright/test';

test.describe('Preview deployment · PMV smoke', () => {
  test('health y catálogo público están disponibles sin exponer datos internos', async ({ request }) => {
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.status()).toBe(200);
    const health = await healthResponse.json();
    expect(health).toMatchObject({ status: 'ok', database: 'connected' });
    if (process.env.EXPECTED_COMMIT_SHA) {
      expect(health.commit).toBe(process.env.EXPECTED_COMMIT_SHA);
    }

    const supportsResponse = await request.get('/api/supports');
    expect(supportsResponse.status()).toBe(200);
    const payload = await supportsResponse.json();
    expect(payload.status).toBe('success');
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.length).toBeGreaterThan(0);

    const forbiddenKeys: string[] = [];
    const inspect = (value: unknown, path = 'data') => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => inspect(item, `${path}[${index}]`));
        return;
      }
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (/(price|pricing|cost|margin|tariff|tenant|owner)/i.test(key)) {
          forbiddenKeys.push(`${path}.${key}`);
        }
        inspect(child, `${path}.${key}`);
      }
    };
    inspect(payload.data);
    expect(forbiddenKeys).toEqual([]);
  });

  test('login administrativo presenta los campos y la acción esperada', async ({ page }, testInfo) => {
    await page.goto('/login');
    await expect(page.getByText('Portal administrativo', { exact: false })).toBeVisible();
    await expect(page.getByLabel('Usuario / Correo Electrónico')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
  });

  test('las rutas administrativas redirigen a login cuando no hay sesión', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Usuario / Correo Electrónico')).toBeVisible();
  });

  test('la API administrativa rechaza peticiones sin sesión', async ({ request }) => {
    const response = await request.get('/api/admin/stats');
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ status: 'error' });
  });

  test('inventario público carga soportes y no desborda en anchos PMV', async ({ page }, testInfo) => {
    await page.goto('/inventario?vista=catalogo');
    await expect(page.getByRole('heading', { name: 'Inventario de soportes publicitarios' })).toBeVisible();
    await expect(page.getByText(/\d+ resultados/)).toBeVisible();

    for (const viewport of [
      { width: 320, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.viewport);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('inventory-mobile-390.png'), fullPage: true });
  });

  test('selección pública llega al cierre de Media Kit sin enviar una solicitud real', async ({ page }, testInfo) => {
    await page.goto('/inventario?vista=catalogo');
    await expect(page.getByRole('button', { name: 'Seleccionar' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Seleccionar' }).first().click();
    await expect(page.getByRole('button', { name: 'Quitar selección' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Abrir Media Kit/ }).click();
    await expect(page.getByRole('link', { name: 'Solicitar propuesta' })).toBeVisible();
    await page.getByRole('link', { name: 'Solicitar propuesta' }).click();

    await expect(page).toHaveURL(/\/contacto\?origen=mediakit$/);
    await expect(page.getByRole('heading', { name: 'Tu selección, lista para avanzar.' })).toBeVisible();
    await expect(page.getByText('No perdés tu selección')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('mediakit-contact.png'), fullPage: true });
  });

  test('administrador global puede iniciar sesión cuando se configuró la cuenta QA', async ({ page }) => {
    test.skip(
      !process.env.E2E_ADMIN_USER || !process.env.E2E_ADMIN_PASSWORD,
      'Configurar E2E_ADMIN_USER y E2E_ADMIN_PASSWORD como secretos del repositorio para habilitar el login autenticado.',
    );

    await page.goto('/login');
    await page.getByLabel('Usuario / Correo Electrónico').fill(process.env.E2E_ADMIN_USER!);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    const adminStats = await page.evaluate(async () => {
      const response = await fetch('/api/admin/stats', { credentials: 'include' });
      return { status: response.status, body: await response.json() };
    });
    expect(adminStats.status).toBe(200);
    expect(adminStats.body.status).toBe('success');
  });
});
