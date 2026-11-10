import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

test('Media Kit: cotizar, preparar archivos y confirmar entrega en dos pasos', async ({ page }) => {
  let requestStatus = 'pending';
  let savedKit: Record<string, unknown> | null = null;
  let kitStatus = '';
  let deliveryChannel = '';
  const uploadedFormats: string[] = [];
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

  await page.route('**/api/admin/support-pricing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          'SUP-001': {
            exhibition_price: '99999',
            installation_price: '0',
            printing_price: '0',
            currency: 'ARS',
            tax_included: false,
          },
        },
      }),
    });
  });

  await page.route('**/api/admin/mediakits/KIT-REQ-001', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'error', message: 'Media Kit no encontrado.' }) });
  });

  await page.route('**/api/admin/mediakits/by-request/REQ-001', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: {
        kitId: 'KIT-REQ-001', sourceRequestId: 'REQ-001', status: 'ready',
        totalAmount: '50000', currency: 'ARS', supportIds: ['SUP-001'],
        createdAt: '2026-10-30T11:00:00.000Z', updatedAt: '2026-10-30T12:00:00.000Z',
        pdfUrl: '/api/admin/mediakits/KIT-REQ-001/exports/pdf', pptUrl: '/api/admin/mediakits/KIT-REQ-001/exports/pptx',
      } }),
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

  await page.route('**/api/admin/mediakits/KIT-REQ-001/exports/**', async (route) => {
    if (route.request().method() === 'PUT') {
      const format = route.request().url().endsWith('/pdf') ? 'pdf' : 'pptx';
      uploadedFormats.push(format);
      expect(route.request().headers()['content-type']).toBe(format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect((await route.request().postDataBuffer())?.length || 0).toBeGreaterThan(1000);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { format, url: `/api/admin/mediakits/KIT-REQ-001/exports/${format}` } }) });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/admin/mediakits/KIT-REQ-001/status', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      kitStatus = body.status;
      deliveryChannel = body.deliveryChannel;
      if (kitStatus === 'sent') requestStatus = 'enviado';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: {
          kitId: 'KIT-REQ-001', sourceRequestId: 'REQ-001', status: kitStatus,
          totalAmount: 25000, currency: 'ARS', supportIds: ['SUP-001'],
          pdfUrl: '/api/admin/mediakits/KIT-REQ-001/exports/pdf',
          pptUrl: '/api/admin/mediakits/KIT-REQ-001/exports/pptx',
          metadata: { deliveryEvents: kitStatus === 'sent' ? [{ type: 'delivery_confirmed', actor: 'global_admin', channel: deliveryChannel, confirmedAt: '2026-11-09T20:00:00.000Z' }] : [] },
        } }),
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
  await expect(dialog.getByRole('heading', { name: 'Cliente', exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Oportunidad comercial' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Actividad registrada' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Media Kit asociado' })).toBeVisible();
  await expect(dialog.getByText('KIT-REQ-001', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'PDF' })).toHaveAttribute('href', '/api/admin/mediakits/KIT-REQ-001/exports/pdf');
  await expect(dialog.getByRole('link', { name: 'Presentación' })).toHaveAttribute('href', '/api/admin/mediakits/KIT-REQ-001/exports/pptx');
  await dialog.getByLabel('Duración contratada').selectOption('7:días');
  await dialog.getByRole('button', { name: 'Marcar en proceso' }).click();
  await expect(dialog.getByRole('button', { name: 'Preparar entrega' })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
  const panel = dialog.locator('div').first();
  const panelBox = await panel.boundingBox();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  expect(panelBox?.width).toBe(viewportWidth >= 768 ? 560 : viewportWidth);

  const numberInputs = dialog.locator('input[type="number"]');
  await numberInputs.nth(0).fill('25000');
  await numberInputs.nth(1).fill('25000');

  await expect(dialog.getByRole('button', { name: 'Preparar entrega' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Preparar entrega' }).click();
  await expect(page.getByRole('status')).toContainText('PDF y PPTX guardados en el Media Kit');
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
  await expect(dialog.getByText('Entregada', { exact: true }).first()).toBeVisible();
  expect(savedKit).not.toBeNull();
  expect((savedKit as Record<string, unknown>).totalAmount).toBe(25000);
  expect(kitStatus).toBe('sent');
  expect(deliveryChannel).toBe('share_sheet');
  expect(uploadedFormats.sort()).toEqual(['pdf', 'pptx']);
  expect(requestPatchStatuses).toEqual(['contactado']);
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
  await page.route('**/api/admin/support-pricing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          'SUP-001': {
            exhibition_price: '99999',
            installation_price: '0',
            printing_price: '0',
            currency: 'ARS',
            tax_included: false,
          },
        },
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
  await page.getByLabel('Duración contratada').selectOption('15:días');
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

  const pptDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PPT', exact: true }).click();
  const pptDownload = await pptDownloadPromise;
  const pptPath = (await pptDownload.path())!;
  const pptArchive = await JSZip.loadAsync(await readFile(pptPath));
  const pptSlideFiles = Object.entries(pptArchive.files)
    .filter(([path, file]) => /^ppt\/slides\/slide\d+\.xml$/.test(path) && !file.dir);
  const pptSlides = (await Promise.all(pptSlideFiles.map(([, file]) => file.async('string')))).join(' ');
  expect(pptSlides).toContain('Inversión sujeta a cotización');
  expect(pptSlides).not.toContain('99999');
});

test('solicitud con ownership pendiente queda en cuarentena comercial', async ({ page }) => {
  await page.route('**/api/admin/mediakits/by-request/REQ-PENDING-OWNERSHIP', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'error', message: 'Media Kit no encontrado.' }) });
  });
  await page.route('**/api/admin/stats', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });
  await page.route('**/api/admin/requests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [{
        id: 99,
        requestId: 'REQ-PENDING-OWNERSHIP',
        requesterName: 'Cliente en revisión',
        requesterEmail: 'review@example.com',
        requesterCompany: 'Campaña en revisión',
        status: 'pending',
        supportIds: ['mza-trad-16'],
        supportNames: ['Soporte sin conciliar'],
        requestScope: null,
        tenantIds: [],
        pendingOwnershipCount: 1,
        createdAt: '2026-11-01T10:00:00.000Z',
      }] }),
    });
  });

  await page.goto('/dashboard/solicitudes');
  const ownershipLabel = (page.viewportSize()?.width ?? 0) < 768
    ? page.locator('[aria-label="Solicitudes en tarjetas"]').getByText('Ownership pendiente')
    : page.locator('tbody').getByText('Ownership pendiente');
  await expect(ownershipLabel).toBeVisible();
  await page.getByRole('button', { name: 'Ver solicitud' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Solicitud en cuarentena comercial', { exact: false })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Marcar en proceso' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Guardar cotización' })).toBeDisabled();
});


test('Media Kit asociado distingue el estado Enviado de Cotizado', async ({ page }) => {
  await page.route('**/api/admin/stats', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });
  await page.route('**/api/admin/requests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [{
        id: 701,
        requestId: 'REQ-SENT-STATUS',
        requesterName: 'Cliente Enviado',
        requesterEmail: 'qa-sent@example.com',
        requesterCompany: 'QA',
        status: 'pending',
        supportIds: ['SUP-SENT'],
        supportNames: ['Soporte QA'],
        createdAt: '2026-11-07T10:00:00.000Z',
      }] }),
    });
  });
  await page.route('**/api/admin/mediakits/KIT-REQ-SENT-STATUS', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'error', message: 'Media Kit no encontrado.' }) });
  });
  await page.route('**/api/supports', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [{ canonical_id: 'SUP-SENT', name: 'Soporte QA', ciudad: 'mendoza', tipo_soporte: 'tradicional', address: 'Mendoza', description: 'Soporte de prueba', characteristics: [] }] }) });
  });
  await page.route('**/api/admin/support-pricing', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { 'SUP-SENT': null } }) });
  });
  await page.route('**/api/admin/mediakits/by-request/REQ-SENT-STATUS', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: {
        kitId: 'MK-ARBITRARY-2026-042',
        sourceRequestId: 'REQ-SENT-STATUS',
        status: 'sent',
        totalAmount: '10000',
        currency: 'ARS',
        supportIds: ['SUP-SENT'],
        createdAt: '2026-11-07T10:00:00.000Z',
        updatedAt: '2026-11-07T11:00:00.000Z',
      } }),
    });
  });

  await page.goto('/dashboard/solicitudes');
  await page.getByRole('button', { name: 'Ver solicitud' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('MK-ARBITRARY-2026-042', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Enviado', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Cotizado', { exact: true })).toHaveCount(0);
});

test('Media Kit constructor mobile no genera overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/admin/stats', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });
  await page.route('**/api/admin/requests', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
  });
  await page.route('**/api/supports', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
  });
  await page.route('**/api/admin/support-pricing', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });
  await page.route('**/api/admin/mediakits/KIT-MOBILE', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'error' }) });
  });

  await page.goto('/dashboard/mediakits/nuevo?kitId=KIT-MOBILE');
  await expect(page.getByRole('heading', { name: 'Constructor de Media Kit' })).toBeVisible();
  await expect(page.getByPlaceholder('Nombre *')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBe(dimensions.viewport);
  expect(dimensions.body).toBe(dimensions.viewport);
});


test('Media Kit: recuperación de PDF/PPTX accesible en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/admin/stats', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });
  await page.route('**/api/admin/requests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [{
        id: 902,
        requestId: 'REQ-MOBILE-EXPORT',
        requesterName: 'Cliente móvil',
        requesterEmail: 'mobile@example.invalid',
        requesterCompany: 'QA móvil',
        status: 'enviado',
        supportIds: ['SUP-MOBILE'],
        supportNames: ['Soporte móvil'],
        createdAt: '2026-11-09T10:00:00.000Z',
      }] }),
    });
  });
  await page.route('**/api/admin/mediakits/by-request/REQ-MOBILE-EXPORT', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: {
        kitId: 'KIT-REQ-MOBILE-EXPORT',
        sourceRequestId: 'REQ-MOBILE-EXPORT',
        status: 'sent',
        totalAmount: 25000,
        currency: 'ARS',
        supportIds: ['SUP-MOBILE'],
        createdAt: '2026-11-09T10:00:00.000Z',
        updatedAt: '2026-11-09T11:00:00.000Z',
        pdfUrl: '/api/admin/mediakits/KIT-REQ-MOBILE-EXPORT/exports/pdf',
        pptUrl: '/api/admin/mediakits/KIT-REQ-MOBILE-EXPORT/exports/pptx',
        metadata: {
          deliveryEvents: [{
            type: 'delivery_confirmed',
            actor: 'global_admin',
            channel: 'mailto_draft',
            confirmedAt: '2026-11-09T11:00:00.000Z',
          }],
        },
      } }),
    });
  });
  await page.route('**/api/supports', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
  });
  await page.route('**/api/admin/support-pricing', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: {} }) });
  });

  await page.goto('/dashboard/solicitudes');
  await page.getByRole('button', { name: 'Ver solicitud' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Entrega confirmada · Administrador global')).toBeVisible();
  const pdfLink = dialog.getByRole('link', { name: 'PDF' });
  const pptLink = dialog.getByRole('link', { name: 'Presentación' });
  await expect(pdfLink).toHaveAttribute('href', '/api/admin/mediakits/KIT-REQ-MOBILE-EXPORT/exports/pdf');
  await expect(pptLink).toHaveAttribute('href', '/api/admin/mediakits/KIT-REQ-MOBILE-EXPORT/exports/pptx');
  expect((await pdfLink.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
  expect((await pptLink.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBe(dimensions.viewport);
});
