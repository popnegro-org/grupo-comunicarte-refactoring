import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Media Kit: cotizar, preparar archivos y confirmar entrega en dos pasos', async ({ page }) => {
  let requestStatus = 'pending';
  let savedKit: Record<string, unknown> | null = null;
  let kitStatus = '';
  const requestPatchStatuses: string[] = [];

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload: { files?: File[] }) => {
        const files = payload.files || [];
        const pdf = files.find((file) => file.type === 'application/pdf');
        (window as Window & { __mediaKitShare?: unknown }).__mediaKitShare = {
          names: files.map((file) => file.name),
          types: files.map((file) => file.type),
          pdfText: pdf ? await pdf.text() : '',
        };
      },
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
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [{
            id: 1,
            requestId: 'REQ-001',
            requesterName: 'Cliente Demo',
            requesterEmail: 'cliente@example.com',
            requesterCompany: 'Empresa Demo',
            requesterPhone: '2615550000',
            message: 'Campaña de prueba',
            status: requestStatus,
            supportIds: ['SUP-001'],
            supportNames: ['Soporte Demo'],
            createdAt: '2026-10-30T10:00:00.000Z',
          }],
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/admin/requests/REQ-001', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      requestPatchStatuses.push(body.status);
      requestStatus = body.status;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { status: requestStatus } }),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/supports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: [{
          canonical_id: 'SUP-001',
          name: 'Soporte Demo',
          ciudad: 'mendoza',
          tipo_soporte: 'tradicional',
          address: 'Mendoza',
          description: 'Soporte para campaña de prueba',
          characteristics: 'Tradicional',
          pricing: {
            exhibition_price: 99999,
            installation_price: 0,
            printing_price: 0,
            currency: 'ARS',
          },
        }],
      }),
    });
  });

  await page.route('**/api/admin/mediakits/KIT-REQ-001', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'error', message: 'Media Kit no encontrado.' }),
    });
  });

  await page.route('**/api/admin/mediakits', async (route) => {
    if (route.request().method() === 'POST') {
      savedKit = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { kitId: 'KIT-REQ-001' } }),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/admin/mediakits/KIT-REQ-001/status', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      kitStatus = body.status;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { status: kitStatus } }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/dashboard/solicitudes');
  const request = page.getByRole('button', { name: 'Ver solicitud' });
  await expect(request).toBeVisible();
  await request.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Cliente Demo' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Marcar en proceso' }).click();
  await expect(dialog.getByRole('button', { name: 'Preparar entrega' })).toBeVisible();

  const panel = dialog.locator('div').first();
  const panelBox = await panel.boundingBox();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  expect(panelBox?.width).toBe(viewportWidth >= 768 ? 460 : viewportWidth);

  const numberInputs = dialog.locator('input[type="number"]');
  await numberInputs.nth(0).fill('25000');
  await numberInputs.nth(2).fill('25000');

  await expect(dialog.getByRole('button', { name: 'Preparar entrega' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Preparar entrega' }).click();
  await expect(page.getByRole('status')).toContainText('Archivos preparados para compartir');
  await expect(dialog.getByRole('button', { name: 'Confirmar entrega realizada' })).toBeVisible();

  const share = await page.evaluate(() =>
    (window as Window & { __mediaKitShare?: { names: string[]; types: string[]; pdfText: string } }).__mediaKitShare
  );
  expect(share?.names).toEqual(['media-kit-REQ-001.pdf', 'media-kit-REQ-001.pptx']);
  expect(share?.types).toContain('application/pdf');
  expect(share?.types).toContain('application/vnd.openxmlformats-officedocument.presentationml.presentation');
  expect(share?.pdfText).toContain('ARS 25.000');
  expect(share?.pdfText).not.toContain('99999');

  await dialog.getByRole('button', { name: 'Confirmar entrega realizada' }).click();
  await expect(dialog.getByText('Entregada', { exact: true })).toBeVisible();
  expect(savedKit).not.toBeNull();
  expect((savedKit as Record<string, unknown>).totalAmount).toBe(25000);
  expect(kitStatus).toBe('sent');
  expect(requestPatchStatuses).toEqual(['contactado', 'enviado']);
});


test('Media Kit constructor: el PDF no expone tarifas base si el monto global no fue definido', async ({ page }) => {
  let savedPayload: Record<string, any> | null = null;

  await page.route('**/api/admin/stats', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });
  await page.route('**/api/admin/requests', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
  });
  await page.route('**/api/supports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: [{
          canonical_id: 'SUP-001',
          name: 'Soporte Demo',
          ciudad: 'mendoza',
          tipo_soporte: 'tradicional',
          disponibilidad: 'disponible',
          address: 'Mendoza',
          description: 'Soporte de prueba',
          characteristics: 'Tradicional',
          pricing: { exhibition_price: 99999, installation_price: 0, printing_price: 0, currency: 'ARS' },
        }],
      }),
    });
  });
  await page.route('**/api/admin/mediakits/KIT-TEST', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'error' }) });
  });
  await page.route('**/api/admin/mediakits', async (route) => {
    if (route.request().method() === 'POST') {
      savedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { kitId: 'KIT-TEST' } }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/dashboard/mediakits/nuevo?kitId=KIT-TEST');
  await expect(page.getByRole('heading', { name: 'Constructor de Media Kit' })).toBeVisible();
  await page.getByPlaceholder('Nombre *').fill('Cliente Demo');
  await page.getByRole('button', { name: /Soporte Demo/ }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const download = await downloadPromise;
  const pdf = await readFile((await download.path())!);
  const pdfText = pdf.toString('latin1');

  expect(savedPayload).not.toBeNull();
  expect(savedPayload?.totalAmount).toBeNull();
  expect(savedPayload?.metadata?.proposalAmount?.amount).toBeNull();
  expect(pdfText).toContain('sujeta a');
  expect(pdfText).not.toContain('99999');
});
