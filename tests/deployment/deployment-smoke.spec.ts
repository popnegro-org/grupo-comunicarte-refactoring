import { test, expect } from '@playwright/test';

// Avoid recording browser state, form values or traces in deployment artifacts.
// The suite keeps its explicit non-sensitive screenshots via page.screenshot().
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

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

  test('las rutas administrativas críticas rechazan peticiones sin sesión', async ({ request }) => {
    for (const path of [
      '/api/admin/session',
      '/api/admin/stats',
      '/api/admin/supports',
      '/api/admin/support-pricing',
      '/api/admin/requests',
      '/api/admin/mediakits',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
      expect(await response.json()).toMatchObject({ status: 'error' });
    }
  });

  test('inventario público carga soportes y no desborda en anchos PMV', async ({ page }, testInfo) => {
    await page.goto('/inventario?vista=catalogo');
    await expect(page.getByRole('heading', { name: 'Inventario de soportes publicitarios' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Seleccionar' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Av. J. B. Justo y Lope de Vega' })).toBeVisible();

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
    test.setTimeout(60_000);
    const supportsResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/supports' && response.ok(),
      { timeout: 45_000 },
    );
    await page.goto('/inventario?vista=catalogo', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await supportsResponse;
    await expect(page.getByRole('button', { name: 'Seleccionar' }).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Seleccionar' }).first().click();
    await expect(page.getByRole('button', { name: 'Quitar selección' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Abrir Media Kit/ }).click();
    await expect(page.getByRole('link', { name: 'Solicitar propuesta' })).toBeVisible();
    await page.getByRole('link', { name: 'Solicitar propuesta' }).click();

    await expect(page).toHaveURL(/\/contacto\?origen=mediakit$/);
    await expect(page.getByRole('heading', { name: 'Tu selección, lista para avanzar.' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('No perdés tu selección')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('mediakit-contact.png'), fullPage: true });
  });

  test.describe('Autenticación administrativa', () => {
    test('administrador global puede iniciar sesión cuando se configuró la cuenta QA', async ({ page }) => {
      test.setTimeout(60_000);
      test.skip(
        !process.env.E2E_ADMIN_USER || !process.env.E2E_ADMIN_PASSWORD,
        'Configurar E2E_ADMIN_USER y E2E_ADMIN_PASSWORD como secretos del repositorio para habilitar el login autenticado.',
      );

      await page.goto('/login');
      const passwordInput = page.getByRole('textbox', { name: 'Contraseña' });
      await page.getByLabel('Usuario / Correo Electrónico').fill(process.env.E2E_ADMIN_USER!);
      await passwordInput.fill(process.env.E2E_ADMIN_PASSWORD!);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();

      const alert = page.getByRole('alert');
      const outcome = await Promise.race([
        page.waitForURL(/\/dashboard$/, { timeout: 20_000 }).then(() => 'authenticated' as const).catch(() => 'timeout' as const),
        alert.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'rejected' as const).catch(() => 'timeout' as const),
      ]);

      if (outcome === 'rejected') {
        const message = (await alert.innerText()).toLowerCase();
        await passwordInput.fill('');
        throw new Error(
          message.includes('credenciales inválidas') || message.includes('credenciales invalidas')
            ? 'El backend rechazó las credenciales QA configuradas. Verificar que coincidan con ADMIN_USER y ADMIN_PASSWORD del entorno Preview.'
            : 'El inicio de sesión fue rechazado. Revisar el estado de autenticación sin registrar credenciales.',
        );
      }

      if (outcome === 'timeout') {
        await passwordInput.fill('');
        throw new Error('El inicio de sesión no completó la redirección al dashboard dentro del plazo esperado.');
      }

      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });

      const adminStats = await page.evaluate(async () => {
        const response = await fetch('/api/admin/stats', { credentials: 'include' });
        return { status: response.status, body: await response.json() };
      });
      expect(adminStats.status).toBe(200);
      expect(adminStats.body.status).toBe('success');

      await page.getByRole('link', { name: 'Inventario', exact: true }).first().click();
      await page.waitForURL((url) => url.pathname === '/dashboard/soportes');
      await expect(page.getByRole('heading', { name: 'Gestión de Soportes' })).toBeVisible();

      await page.getByRole('link', { name: /Solicitudes Media Kits/ }).first().click();
      await page.waitForURL((url) => url.pathname === '/dashboard/solicitudes');
      await expect(page.getByRole('heading', { name: 'Solicitudes de Media Kit' })).toBeVisible();

      await page.getByRole('link', { name: 'Crear Media Kit', exact: true }).click();
      await page.waitForURL((url) => url.pathname === '/dashboard/mediakits/nuevo');
      await expect(page.getByRole('heading', { name: 'Constructor de Media Kit' })).toBeVisible();
      const inventoryGroup = page.getByRole('group', { name: 'Soportes del inventario' });
      await expect(inventoryGroup).toBeVisible();
      await expect(inventoryGroup.getByRole('button').first()).toBeVisible();
    });

    test('ownership, tenant spoofing, quarantine and pricing remain fail-closed', async ({ page }) => {
      test.setTimeout(60_000);
      test.skip(
        !process.env.E2E_ADMIN_USER || !process.env.E2E_ADMIN_PASSWORD,
        'Configurar E2E_ADMIN_USER y E2E_ADMIN_PASSWORD para habilitar QA autenticado.',
      );

      await page.goto('/login');
      await page.getByLabel('Usuario / Correo Electrónico').fill(process.env.E2E_ADMIN_USER!);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(process.env.E2E_ADMIN_PASSWORD!);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });

      const result = await page.evaluate(async () => {
        const json = async (response: Response) => ({ status: response.status, body: await response.json() });
        const hasSensitiveKey = (value: any): boolean => Array.isArray(value)
          ? value.some(hasSensitiveKey)
          : value && typeof value === 'object'
            ? Object.entries(value).some(([key, nested]) => /tenant|ownership|pricing|price|cost|margin/i.test(key) || hasSensitiveKey(nested))
            : false;
        const [publicResponse, adminResponse] = await Promise.all([
          fetch('/api/supports', { credentials: 'include' }),
          fetch('/api/admin/supports', { credentials: 'include' }),
        ]);
        const publicData = await json(publicResponse);
        const adminData = await json(adminResponse);
        const pending = adminData.body.data?.find((item: any) => item.canonical_id === 'mza-trad-16');
        const assigned = adminData.body.data?.find((item: any) => item.canonical_id === 'bue-trad-06');
        const pendingDetail = await json(await fetch('/api/supports/mza-trad-16', { credentials: 'include' }));
        const invalidPendingSubmission = await json(await fetch('/api/mediakit/request', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead: { name: 'QA invalid pending', email: 'qa-invalid-pending@example.invalid', company: 'QA', message: 'QA synthetic request; no customer contact' },
            selectedIds: ['mza-trad-16'],
            idempotencyKey: '00000000-0000-4000-8000-000000000005',
          }),
        }));
        const invalidMissingSubmission = await json(await fetch('/api/mediakit/request', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead: { name: 'QA invalid support', email: 'qa-invalid-support@example.invalid', company: 'QA', message: 'QA synthetic request; no customer contact' },
            selectedIds: ['qa-support-does-not-exist'],
            idempotencyKey: '00000000-0000-4000-8000-000000000006',
          }),
        }));

        const missingTenant = await json(await fetch('/api/admin/supports', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'QA sin tenant', ciudad: 'mendoza', tipo_soporte: 'tradicional', active: false }),
        }));
        const invalidTenant = await json(await fetch('/api/admin/supports', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'QA tenant inválido', ciudad: 'mendoza', tipo_soporte: 'tradicional', tenant_id: 'tenant-spoof', active: false }),
        }));
        const reassignment = await json(await fetch('/api/admin/supports/bue-trad-06', {
          method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: 'tenant-default' }),
        }));
        const pendingKit = await json(await fetch('/api/admin/mediakits', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName: 'QA Pending', supportIds: ['mza-trad-16'], tenantId: 'tenant-ba', status: 'draft' }),
        }));
        const reloadedAssigned = await json(await fetch('/api/admin/supports/bue-trad-06', { credentials: 'include' }));
        return {
          publicStatus: publicData.status,
          publicHasPendingSupport: publicData.body.data?.some((item: any) => item.canonical_id === 'mza-trad-16'),
          publicHasSensitiveKeys: hasSensitiveKey(publicData.body.data),
          pendingDetailStatus: pendingDetail.status,
          invalidPendingSubmissionStatus: invalidPendingSubmission.status,
          invalidMissingSubmissionStatus: invalidMissingSubmission.status,
          adminStatus: adminData.status,
          pendingTenant: pending?.tenant_id ?? null,
          assignedTenant: assigned?.tenant_id ?? null,
          missingTenantStatus: missingTenant.status,
          invalidTenantStatus: invalidTenant.status,
          reassignmentStatus: reassignment.status,
          pendingKitStatus: pendingKit.status,
          assignedTenantAfterAttempt: reloadedAssigned.body.data?.tenant_id ?? null,
        };
      });

      expect(result.publicStatus).toBe(200);
      expect(result.publicHasPendingSupport).toBe(false);
      expect(result.publicHasSensitiveKeys).toBe(false);
      expect(result.pendingDetailStatus).toBe(404);
      expect(result.invalidPendingSubmissionStatus).toBe(404);
      expect(result.invalidMissingSubmissionStatus).toBe(404);
      expect(result.adminStatus).toBe(200);
      expect(result.pendingTenant).toBe(null);
      expect(result.assignedTenant).toBe('tenant-ba');
      expect(result.missingTenantStatus).toBe(400);
      expect(result.invalidTenantStatus).toBe(400);
      expect(result.reassignmentStatus).toBe(400);
      expect(result.pendingKitStatus).toBe(409);
      expect(result.assignedTenantAfterAttempt).toBe('tenant-ba');
    });

    test('C1/C3/C4/C6: transición válida, ownership NULL, solicitud vacía y concurrencia', async ({ page }) => {
      test.setTimeout(60_000);
      test.skip(
        !process.env.E2E_ADMIN_USER || !process.env.E2E_ADMIN_PASSWORD,
        'Configurar E2E_ADMIN_USER y E2E_ADMIN_PASSWORD para habilitar QA autenticado.',
      );

      await page.goto('/login');
      await page.getByLabel('Usuario / Correo Electrónico').fill(process.env.E2E_ADMIN_USER!);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(process.env.E2E_ADMIN_PASSWORD!);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });

      const result = await page.evaluate(async () => {
        const stableRequestId = 'REQ-2026-b342e5ef-833d-4c10-97af-faff81f9a996';
        const nullOwnershipRequestId = 'REQ-2026-00000000-0000-4000-8000-000000000003';
        const noItemsRequestId = 'REQ-2026-00000000-0000-4000-8000-000000000004';
        const patch = async (requestId: string, status: string) => {
          const response = await fetch(`/api/admin/requests/${requestId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          });
          return { status: response.status, body: await response.json() };
        };
        const output: any = {};

        try {
          const c1 = await patch(stableRequestId, 'quoted');
          output.c1Status = c1.status;
          output.c1After = c1.body.data?.status ?? null;
          const c1Restore = await patch(stableRequestId, 'pending');
          output.c1RestoreStatus = c1Restore.status;

          const c3 = await patch(nullOwnershipRequestId, 'quoted');
          output.c3Status = c3.status;

          const c4 = await patch(noItemsRequestId, 'closed');
          output.c4Status = c4.status;

          const [c6a, c6b] = await Promise.all([
            patch(stableRequestId, 'quoted'),
            patch(stableRequestId, 'closed'),
          ]);
          output.c6Statuses = [c6a.status, c6b.status];
          output.c6States = [c6a.body.data?.status ?? null, c6b.body.data?.status ?? null];
        } finally {
          const restored = await patch(stableRequestId, 'pending');
          output.restoredStatus = restored.status;
          output.finalState = restored.body.data?.status ?? null;
        }

        return output;
      });

      expect(result.c1Status).toBe(200);
      expect(result.c1After).toBe('quoted');
      expect(result.c1RestoreStatus).toBe(200);
      expect(result.c3Status).toBe(409);
      expect(result.c4Status).toBe(409);
      expect(result.c6Statuses.every((status) => [200, 409].includes(status))).toBe(true);
      expect(result.c6Statuses).toContain(200);
      expect(result.c6States.some((status) => ['quoted', 'closed'].includes(status))).toBe(true);
      expect(result.c6States.every((status) => status === null || ['quoted', 'closed'].includes(status))).toBe(true);
      expect(result.restoredStatus).toBe(200);
      expect(result.finalState).toBe('pending');
    });
  });
});


test.describe('Media Kit exports · R2 Preview isolated', () => {
  test('PDF/PPTX se persisten, se recuperan con autorización y la entrega queda auditada', async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(
      !process.env.E2E_ADMIN_USER || !process.env.E2E_ADMIN_PASSWORD,
      'Configurar E2E_ADMIN_USER y E2E_ADMIN_PASSWORD para habilitar QA de exportaciones.',
    );

    await page.goto('/login');
    await page.getByLabel('Usuario / Correo Electrónico').fill(process.env.E2E_ADMIN_USER!);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
    const authCookieHeader = (await page.context().cookies()).map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    const appOrigin = new URL(page.url()).origin;
    const authHeaders = { Cookie: authCookieHeader, Origin: appOrigin, Referer: page.url() };

    const supportsResponse = await page.request.get('/api/supports', { headers: authHeaders });
    expect(supportsResponse.status()).toBe(200);
    const supportsPayload = await supportsResponse.json();
    const support = (supportsPayload.data || []).find((item: any) =>
      item.canonical_id === 'bue-trad-05' && item.active !== false && item.disponibilidad === 'disponible'
    );
    expect(support, 'Preview debe exponer al menos un soporte público y disponible').toBeTruthy();

    // Reuse one synthetic QA request/kit so reruns never accumulate orphan rows.
    const idempotencyKey = 'b342e5ef-833d-4c10-97af-faff81f9a996';
    const kitId = 'KIT-QA-EXPORT-C4A280BC3D34';
    let kitSaved = false;
    let requestId: string | null = null;
    const pdfBytes = Buffer.from('%PDF-1.4\\n% Grupo Comunicarte QA export\\n1 0 obj <<>> endobj\\ntrailer <<>>\\n%%EOF', 'ascii');
    // The storage smoke validates ZIP signature and round-trip bytes. Real PPTX generation
    // is covered by the dedicated export unit tests and browser workflow tests.
    const pptxBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);

    try {
      const requestResponse = await page.request.post('/api/mediakit/request', {
        headers: authHeaders,
        data: {
          lead: {
            name: 'QA Export Recovery',
            email: 'qa-export-recovery@example.invalid',
            company: 'QA',
            phone: '',
            message: 'Solicitud sintética para validar persistencia y recuperación de exportaciones.',
          },
          selectedIds: [support.canonical_id],
          idempotencyKey,
        },
      });
      const requestPayload = await requestResponse.json();
      expect([200, 201], JSON.stringify(requestPayload)).toContain(requestResponse.status());
      requestId = requestPayload.requestId;
      expect(requestId).toBeTruthy();
      await page.request.patch(`/api/admin/requests/${requestId}`, { headers: authHeaders, data: { status: 'pending' } });

      const save = await page.request.post('/api/admin/mediakits', {
        headers: authHeaders,
        data: {
          kitId,
          sourceRequestId: requestId,
          status: 'ready',
          clientName: 'QA Export Recovery',
          clientEmail: 'qa-export-recovery@example.invalid',
          clientCompany: 'QA',
          clientPhone: '',
          supportIds: [support.canonical_id],
          approvedPrices: { [support.canonical_id]: '10000' },
          totalAmount: 10000,
          currency: 'ARS',
          metadata: { qaTest: true, testSuite: 'ci-candidate-e2e', proposalPeriod: { duracionValor: 7, duracionUnidad: 'días' } },
        },
      });
      expect(save.status()).toBe(201);
      kitSaved = true;

      const pdfUpload = await page.request.put(`/api/admin/mediakits/${kitId}/exports/pdf`, {
        data: pdfBytes,
        headers: { ...authHeaders, 'Content-Type': 'application/pdf' },
      });
      expect(pdfUpload.status()).toBe(201);
      expect((await pdfUpload.json()).data.url).toBe(`/api/admin/mediakits/${kitId}/exports/pdf`);

      const pptUpload = await page.request.put(`/api/admin/mediakits/${kitId}/exports/pptx`, {
        data: pptxBytes,
        headers: { ...authHeaders, 'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      });
      expect(pptUpload.status()).toBe(201);

      const saved = await page.request.get(`/api/admin/mediakits/${kitId}`, { headers: authHeaders });
      expect(saved.status()).toBe(200);
      const savedPayload = (await saved.json()).data;
      expect(savedPayload.pdfUrl).toBe(`/api/admin/mediakits/${kitId}/exports/pdf`);
      expect(savedPayload.pptUrl).toBe(`/api/admin/mediakits/${kitId}/exports/pptx`);
      expect(savedPayload.metadata.exports.pdf.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(savedPayload.metadata.exports.pptx.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(savedPayload.metadata)).not.toContain('storageKey');

      const pdfDownload = await page.request.get(`/api/admin/mediakits/${kitId}/exports/pdf`, { headers: authHeaders });
      expect(pdfDownload.status()).toBe(200);
      expect((await pdfDownload.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');

      const pptDownload = await page.request.get(`/api/admin/mediakits/${kitId}/exports/pptx`, { headers: authHeaders });
      expect(pptDownload.status()).toBe(200);
      expect((await pptDownload.body()).subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

      const sent = await page.request.patch(`/api/admin/mediakits/${kitId}/status`, {
        headers: authHeaders,
        data: { status: 'sent', deliveryChannel: 'manual' },
      });
      expect(sent.status()).toBe(200);
      const sentPayload = (await sent.json()).data;
      expect(sentPayload.status).toBe('sent');
      expect(sentPayload.metadata.deliveryEvents.at(-1)).toMatchObject({
        type: 'delivery_confirmed',
        actor: 'global_admin',
        channel: 'manual',
      });
      expect(sentPayload.metadata.deliveryEvents.at(-1).confirmedAt).toBeTruthy();

      const requestsResponse = await page.request.get('/api/admin/requests', { headers: authHeaders });
      expect(requestsResponse.status()).toBe(200);
      const requestsPayload = await requestsResponse.json();
      const sentRequest = (requestsPayload.data || []).find((item: any) => item.requestId === requestId);
      expect(sentRequest?.status).toBe('enviado');
    } finally {
      if (kitSaved) {
        await page.request.patch(`/api/admin/mediakits/${kitId}/status`, { headers: authHeaders, data: { status: 'draft' } }).catch(() => null);
        const currentKitResponse = await page.request.get(`/api/admin/mediakits/${kitId}`, { headers: authHeaders }).catch(() => null);
        if (currentKitResponse?.ok()) {
          const currentKit = (await currentKitResponse.json()).data;
          if (currentKit?.pdfUrl) {
            const removedPdf = await page.request.delete(`/api/admin/mediakits/${kitId}/exports/pdf`, { headers: authHeaders });
            expect(removedPdf.status()).toBe(200);
          }
          if (currentKit?.pptUrl) {
            const removedPptx = await page.request.delete(`/api/admin/mediakits/${kitId}/exports/pptx`, { headers: authHeaders });
            expect(removedPptx.status()).toBe(200);
          }
        }
      }
      if (requestId) {
        await page.request.patch(`/api/admin/requests/${requestId}`, { headers: authHeaders, data: { status: 'pending' } }).catch(() => null);
      }
    }
  });
});


test('el catálogo mantiene los soportes sin ownership en cuarentena', async ({ request }) => {
  const listResponse = await request.get('/api/supports');
  expect(listResponse.status()).toBe(200);
  const payload = await listResponse.json();
  expect(payload.data.some((item: any) => item.canonical_id === 'mza-trad-16')).toBe(false);

  const detailResponse = await request.get('/api/supports/mza-trad-16');
  expect(detailResponse.status()).toBe(404);
});

test('LED Móvil publica imagen y tres atributos canónicos sin inventar impactos', async ({ page, request }) => {
  const supportsResponse = await request.get('/api/supports');
  expect(supportsResponse.status()).toBe(200);
  const payload = await supportsResponse.json();
  const mobile = payload.data.find((item: any) => item.canonical_id === 'mza-led-movil-01');
  expect(mobile).toBeTruthy();

  const imageUrl = mobile.imageUrls?.[0] || mobile.media?.find((item: any) => item.media_type === 'image')?.url;
  expect(imageUrl).toMatch(/^\/images\/[A-Za-z0-9._/-]+\.(?:avif|gif|jpe?g|png|webp)$/i);
  const imageResponse = await request.get(imageUrl);
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toContain('image/');

  const browserImageResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === imageUrl && response.ok(),
    { timeout: 45_000 },
  );
  await page.goto('/inventario?vista=catalogo', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByPlaceholder('Buscar soporte o ubicación...').fill('Camión LED Móvil');
  const card = page.getByRole('article').filter({ hasText: 'Camión LED Móvil' }).first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  await expect(card.getByText('Duración', { exact: true })).toBeVisible();
  await expect(card.getByText('Spot', { exact: true })).toBeVisible();
  await expect(card.getByText('Impactos / mes', { exact: true })).toBeVisible();

  const impacts = mobile.technical?.monthly_impacts;
  if (impacts === null || impacts === undefined || impacts === '') {
    await expect(card.getByText('A confirmar', { exact: true })).toBeVisible();
  }

  const image = card.locator('img').first();
  await expect(image).toHaveAttribute('src', imageUrl);
  await image.scrollIntoViewIfNeeded();
  await browserImageResponse;
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth), { timeout: 5_000 }).toBeGreaterThan(0);
});
