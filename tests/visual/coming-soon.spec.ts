import { test, expect } from '@playwright/test';

test.describe('Coming Soon · contacto comercial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/coming-soon');
    await expect(page.getByRole('heading', { name: 'Publicidad exterior en Mendoza y Buenos Aires' })).toBeVisible();
  });

  test('envía los campos del formulario al endpoint y confirma el resultado', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;

    await page.route('**/api/contact', async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          message: 'Tu consulta fue enviada. Nos pondremos en contacto a la brevedad.',
        }),
      });
    });

    const form = page.locator('form');
    await form.locator('[name="name"]').fill('María Pérez');
    await form.locator('[name="company"]').fill('Agencia Ejemplo');
    await form.locator('[name="email"]').fill('maria@example.com');
    await form.locator('[name="phone"]').fill('+54 261 555 0101');
    await form.locator('[name="message"]').fill('Necesito una propuesta de publicidad exterior en Mendoza.');

    await form.getByRole('button', { name: 'Enviar consulta' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Tu consulta fue enviada. Nos pondremos en contacto a la brevedad.',
    );
    expect(submittedPayload).toMatchObject({
      name: 'María Pérez',
      company: 'Agencia Ejemplo',
      email: 'maria@example.com',
      phone: '+54 261 555 0101',
      message: 'Necesito una propuesta de publicidad exterior en Mendoza.',
      website: '',
    });
    await expect(form.locator('[name="email"]')).toHaveValue('');
  });

  test('conserva los datos y muestra el error cuando el servidor rechaza el envío', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          message: 'El formulario todavía no está configurado.',
        }),
      });
    });

    const form = page.locator('form');
    await form.locator('[name="name"]').fill('María Pérez');
    await form.locator('[name="email"]').fill('maria@example.com');
    await form.locator('[name="message"]').fill('Quiero consultar disponibilidad para una campaña.');

    await form.getByRole('button', { name: 'Enviar consulta' }).click();

    await expect(page.getByRole('alert')).toHaveText('El formulario todavía no está configurado.');
    await expect(form.locator('[name="name"]')).toHaveValue('María Pérez');
    await expect(form.locator('[name="email"]')).toHaveValue('maria@example.com');
  });

  test('publica metadatos, datos estructurados y archivos SEO locales', async ({ page, request }) => {
    await expect(page).toHaveTitle('Publicidad exterior en Mendoza y Buenos Aires | Grupo Comunicarte');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://grupocomunicarte.com.ar/',
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /publicidad exterior OOH, DOOH y LED móvil en Mendoza y Buenos Aires/i,
    );
    await expect(page.locator('h1')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    const structuredData = JSON.parse(jsonLd ?? '{}');
    expect(structuredData['@graph']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          '@type': 'Organization',
          name: 'Grupo Comunicarte',
          email: 'comercial@grupocomunicarte.com.ar',
          telephone: '+542615830208',
          address: expect.objectContaining({
            streetAddress: '9 de Julio 891',
            addressLocality: 'Godoy Cruz',
            postalCode: 'M5501',
            addressCountry: 'AR',
          }),
          areaServed: expect.arrayContaining([
            expect.objectContaining({ name: 'Ciudad Autónoma de Buenos Aires, Argentina' }),
            expect.objectContaining({ name: 'Provincia de Buenos Aires, Argentina' }),
          ]),
        }),
        expect.objectContaining({
          '@type': 'AdvertisingAgency',
          address: expect.objectContaining({ streetAddress: '9 de Julio 891' }),
        }),
        expect.objectContaining({
          '@type': 'Service',
          name: 'Publicidad exterior OOH, DOOH y LED móvil',
        }),
      ]),
    );

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain('https://grupocomunicarte.com.ar/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('<loc>https://grupocomunicarte.com.ar/</loc>');
  });

  test('mantiene el diseño sin desbordamiento horizontal en móvil y escritorio', async ({ page }) => {
    for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1368, height: 770 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/coming-soon');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Enviar consulta' })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
      await expect(page.getByRole('heading', { name: 'Nuestra oficina en Mendoza' })).toBeAttached();
    }
  });

  test('muestra el widget flotante de WhatsApp después de hacer scroll vertical', async ({ page }) => {
    const floatingWhatsApp = page.getByRole('link', { name: 'Contactar a Grupo Comunicarte por WhatsApp' });
    await expect(floatingWhatsApp).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect(floatingWhatsApp).toBeVisible();
    await expect(floatingWhatsApp).toHaveAttribute('href', 'https://wa.me/542615830208');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(floatingWhatsApp).toHaveCount(0);
  });

  test('muestra el acceso alternativo a email, WhatsApp y ubicación', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'comercial@grupocomunicarte.com.ar' }).first())
      .toHaveAttribute('href', 'mailto:comercial@grupocomunicarte.com.ar');
    await expect(page.getByRole('link', { name: 'WhatsApp comercial' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cómo llegar' }))
      .toHaveAttribute('href', /google.com\/maps\/search/);
    await expect(page.getByText('9 de Julio 891, M5501 Godoy Cruz, Mendoza, Argentina')).toBeVisible();
  });
});
