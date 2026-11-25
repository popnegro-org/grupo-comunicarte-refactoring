import { test, expect } from '@playwright/test';

test.describe('Coming Soon · contacto comercial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

  test('muestra el acceso alternativo a email y WhatsApp', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'comercial@grupocomunicarte.com.ar' }).first())
      .toHaveAttribute('href', 'mailto:comercial@grupocomunicarte.com.ar');
    await expect(page.getByRole('link', { name: 'Contactar a Grupo Comunicarte por WhatsApp' }))
      .toHaveAttribute('href', 'https://wa.me/542615830208');
  });
});
