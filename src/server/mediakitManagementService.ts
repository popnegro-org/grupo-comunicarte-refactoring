import { randomUUID } from 'node:crypto';
import { pool, isDatabaseConfigured } from '../db/index.ts';
import { resolveMediaKitTenantId } from './tenantAccess.ts';
import { isProposalDurationValid, toLegacyMediaKitState } from '../lib/mediakitDuration.ts';


export type MediaKitStatus = 'draft' | 'ready' | 'sent' | 'archived';

export interface SaveMediaKitInput {
  kitId?: string;
  sourceRequestId?: string | null;
  status?: MediaKitStatus;
  clientName: string;
  clientEmail?: string | null;
  clientCompany?: string | null;
  clientPhone?: string | null;
  supportIds: string[];
  approvedPrices?: Record<string, string | number>;
  totalAmount?: number | string | null;
  currency?: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  pdfUrl?: string | null;
  pptUrl?: string | null;
}

export interface MediaKitRecord extends SaveMediaKitInput {
  kitId: string;
  tenantId?: string | null;
  status: MediaKitStatus;
  createdAt: string;
  updatedAt: string;
}

let tableReady = false;

async function ensureTables(): Promise<void> {
  if (!isDatabaseConfigured || tableReady) return;

  // Schema changes belong to reviewed SQL migrations, never to HTTP requests.
  const requiredColumns: Record<string, string[]> = {
    mediakits: [
      'id', 'kit_id', 'tenant_id', 'source_request_id', 'status', 'client_name', 'client_email',
      'client_company', 'client_phone', 'support_ids', 'approved_prices', 'total_amount',
      'currency', 'notes', 'metadata', 'pdf_url', 'ppt_url', 'created_at', 'updated_at',
      'nombre', 'cliente_id', 'cliente_nombre', 'ciudad', 'screen_ids', 'estado', 'fecha',
    ],
    clientes: ['id', 'tenant_id', 'nombre', 'empresa', 'email', 'telefono', 'categoria', 'created_at'],
    mediakit_items: ['id', 'kit_id', 'support_id', 'tenant_id', 'approved_price', 'sort_order', 'metadata', 'created_at', 'updated_at'],
  };
  const result = await pool.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [Object.keys(requiredColumns)],
  );
  const available = new Set(result.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missing = Object.entries(requiredColumns).flatMap(([table, columns]) =>
    columns.filter((column) => !available.has(`${table}.${column}`)).map((column) => `${table}.${column}`),
  );
  if (missing.length > 0) {
    throw new Error(`Falta aplicar la migración de Media Kits en esta base: ${missing.join(', ')}`);
  }
  tableReady = true;
}

function makeKitId(): string {
  const year = new Date().getFullYear();
  const a = Math.floor(1000 + Math.random() * 9000);
  const b = Math.floor(1000 + Math.random() * 9000);
  return `KIT-${year}-${a}-${b}`;
}

function normalizeStatus(value: unknown): MediaKitStatus {
  return value === 'ready' || value === 'sent' || value === 'archived' ? value : 'draft';
}

function normalizeSupportIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
}

export async function saveMediaKit(input: SaveMediaKitInput): Promise<MediaKitRecord> {
  const clientName = String(input.clientName || '').trim();
  if (clientName.length < 2) throw new Error('El nombre del cliente es obligatorio.');

  const supportIds = normalizeSupportIds(input.supportIds);
  const status = normalizeStatus(input.status);
  const proposalPeriod = input.metadata?.proposalPeriod as { duracionValor?: unknown; duracionUnidad?: unknown } | undefined;
  if ((status === 'ready' || status === 'sent') && !isProposalDurationValid({
    duracionValor: proposalPeriod?.duracionValor == null ? '' : String(proposalPeriod.duracionValor),
    duracionUnidad: proposalPeriod?.duracionUnidad === 'meses' ? 'meses' : 'días',
  })) {
    throw new Error('El Media Kit no puede marcarse como listo o enviado sin una duración estándar válida.');
  }
  let tenantId: string | null = null;
  const tenantBySupportId = new Map<string, string>();
  const rowsForKitCity = new Map<string, string>();

  if (!isDatabaseConfigured) {
    throw new Error('La persistencia de Media Kits requiere base de datos configurada.');
  }

  if (supportIds.length > 0) {
    const availability = await pool.query(
      `SELECT canonical_id, tenant_id, disponibilidad, active, ciudad
       FROM supports
       WHERE canonical_id = ANY($1::text[])`,
      [supportIds],
    );
    const rows = new Map<string, { tenant_id: string | null; disponibilidad: string | null; active: boolean | null; ciudad: string | null }>(
      availability.rows.map((row: any) => [String(row.canonical_id), { tenant_id: row.tenant_id, disponibilidad: row.disponibilidad, active: row.active, ciudad: row.ciudad ?? null }]),
    );
    const missing = supportIds.find((id) => !rows.has(id));
    if (missing) throw new Error(`El soporte '${missing}' no existe en el catálogo.`);
    const unassigned = supportIds.find((id) => !rows.get(id)?.tenant_id);
    if (unassigned) throw new Error(`El soporte '${unassigned}' está pendiente de conciliación de ownership y no puede incluirse en un Media Kit.`);
    const tenantIds = supportIds.map((id) => String(rows.get(id)!.tenant_id));
    for (const id of supportIds) {
      tenantBySupportId.set(id, String(rows.get(id)!.tenant_id));
      if (rows.get(id)?.ciudad) rowsForKitCity.set(id, String(rows.get(id)!.ciudad));
    }
    tenantId = resolveMediaKitTenantId(tenantIds);
    const unavailable = supportIds.find((id) => {
      const row = rows.get(id)!;
      return row.active === false || row.disponibilidad !== 'disponible';
    });
    if (unavailable) {
      const row = rows.get(unavailable)!;
      const state = row.active === false ? 'inactivo' : String(row.disponibilidad || 'sin disponibilidad');
      throw new Error(`El soporte '${unavailable}' no está disponible (estado: ${state}) y no puede incluirse en el Media Kit.`);
    }
  }

  const rawApprovedPrices = input.approvedPrices ?? {};
  if (!rawApprovedPrices || typeof rawApprovedPrices !== 'object' || Array.isArray(rawApprovedPrices)) {
    throw new Error('Los precios aprobados deben tener un formato válido.');
  }
  const approvedPrices: Record<string, string> = {};
  for (const [supportId, rawPrice] of Object.entries(rawApprovedPrices)) {
    if (rawPrice === '') continue;
    if (!supportIds.includes(supportId)) {
      throw new Error(`El precio aprobado referencia un soporte no seleccionado: '${supportId}'.`);
    }
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`El precio aprobado para '${supportId}' debe ser un número válido mayor o igual a cero.`);
    }
    approvedPrices[supportId] = String(price);
  }

  const currency = String(input.currency || 'ARS').trim().toUpperCase();
  if (!['ARS', 'USD', 'POR DEFINIR'].includes(currency)) {
    throw new Error('La moneda del Media Kit no está permitida.');
  }

  if ((status === 'ready' || status === 'sent') && supportIds.length === 0) {
    throw new Error('Un Media Kit listo o enviado debe incluir al menos un soporte conciliado.');
  }
  const kitId = input.kitId?.trim() || makeKitId();
  const totalAmount = input.totalAmount == null || input.totalAmount === '' ? null : Number(input.totalAmount);
  if (totalAmount !== null && (!Number.isFinite(totalAmount) || totalAmount < 0)) {
    throw new Error('El monto comercial global debe ser un número válido mayor o igual a cero.');
  }
  if (currency === 'POR DEFINIR' && totalAmount !== null) {
    throw new Error('No se puede asignar un monto global cuando la moneda está definida como Por definir.');
  }

  await ensureTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (supportIds.length > 0) {
      const locked = await client.query(
        `SELECT canonical_id, tenant_id, disponibilidad, active, ciudad
           FROM supports
          WHERE canonical_id = ANY($1::text[])
          FOR UPDATE`,
        [supportIds],
      );
      if (locked.rows.length !== supportIds.length) {
        throw new Error('El inventario cambió mientras se guardaba el Media Kit. Actualizá e intentá nuevamente.');
      }
      const pending = locked.rows.find((row) => !row.tenant_id);
      if (pending) throw new Error(`El soporte '${pending.canonical_id}' quedó sin ownership y no puede incluirse en un Media Kit.`);
      const unavailable = locked.rows.find((row) => row.active !== true || row.disponibilidad !== 'disponible');
      if (unavailable) throw new Error(`El soporte '${unavailable.canonical_id}' dejó de estar disponible.`);
      const lockedTenantIds = locked.rows.map((row) => String(row.tenant_id));
      tenantBySupportId.clear();
      for (const row of locked.rows) {
        tenantBySupportId.set(String(row.canonical_id), String(row.tenant_id));
        if (row.ciudad) rowsForKitCity.set(String(row.canonical_id), String(row.ciudad));
      }
      tenantId = resolveMediaKitTenantId(lockedTenantIds);
    }
    if (input.sourceRequestId) {
      const pendingRequestItems = await client.query(
        `SELECT 1 FROM mediakit_request_items
          WHERE request_id = $1 AND tenant_id IS NULL
          LIMIT 1`,
        [input.sourceRequestId],
      );
      if (pendingRequestItems.rows.length > 0) {
        throw new Error('No se puede generar un Media Kit desde una solicitud que contiene soportes sin ownership conciliado.');
      }
    }

    const clientEmail = String(input.clientEmail || '').trim();
    const clientCompany = String(input.clientCompany || '').trim() || clientName;
    const clientPhone = String(input.clientPhone || '').trim();
    const existingKit = await client.query(
      `SELECT m.cliente_id
         FROM mediakits m
         JOIN clientes c ON c.id = m.cliente_id
        WHERE m.kit_id = $1
          AND c.tenant_id IS NOT DISTINCT FROM $2
        FOR UPDATE OF m, c`,
      [kitId, tenantId],
    );
    const existingClientId = existingKit.rows[0]?.cliente_id as string | undefined;
    const customer = existingClientId
      ? { rows: [{ id: existingClientId }] }
      : clientEmail
        ? await client.query(
            `SELECT id
               FROM clientes
              WHERE LOWER(email) = LOWER($1)
                AND tenant_id IS NOT DISTINCT FROM $2
              ORDER BY created_at ASC
              LIMIT 1
              FOR UPDATE`,
            [clientEmail, tenantId],
          )
        : { rows: [] as Array<{ id: string }> };
    let clientId = customer.rows[0]?.id as string | undefined;
    if (!clientId) {
      clientId = 'cl-' + randomUUID();
      await client.query(
        'INSERT INTO clientes (id, tenant_id, nombre, empresa, email, telefono, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [clientId, tenantId, clientName, clientCompany, clientEmail, clientPhone, 'Media Kit'],
      );
    }
    const cityValues = [...new Set(
      supportIds.map((id) => rowsForKitCity.get(id)).filter((value): value is string => Boolean(value)),
    )];
    const legacyCity = cityValues.length === 0 ? 'Sin especificar' : cityValues.length === 1 ? cityValues[0] : 'Varias ciudades';
    const proposalStart = (input.metadata?.proposalPeriod as { fechaInicio?: unknown } | undefined)?.fechaInicio;
    const legacyDate = typeof proposalStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(proposalStart) ? proposalStart : new Date().toISOString().slice(0, 10);
    const result = await client.query(
      `INSERT INTO mediakits
        (id, kit_id, tenant_id, source_request_id, status, client_name, client_email, client_company, client_phone,
         support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url, updated_at, nombre, cliente_id, cliente_nombre, ciudad, screen_ids, estado, fecha)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb,$16,$17,CURRENT_TIMESTAMP,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (kit_id) DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         source_request_id = EXCLUDED.source_request_id,
         status = EXCLUDED.status,
         client_name = EXCLUDED.client_name,
         client_email = EXCLUDED.client_email,
         client_company = EXCLUDED.client_company,
         client_phone = EXCLUDED.client_phone,
         support_ids = EXCLUDED.support_ids,
         approved_prices = EXCLUDED.approved_prices,
         total_amount = EXCLUDED.total_amount,
         currency = EXCLUDED.currency,
         notes = EXCLUDED.notes,
         metadata = EXCLUDED.metadata,
         pdf_url = EXCLUDED.pdf_url,
         ppt_url = EXCLUDED.ppt_url,
         nombre = EXCLUDED.nombre,
         cliente_id = EXCLUDED.cliente_id,
         cliente_nombre = EXCLUDED.cliente_nombre,
         ciudad = EXCLUDED.ciudad,
         screen_ids = EXCLUDED.screen_ids,
         estado = EXCLUDED.estado,
         fecha = EXCLUDED.fecha,
         updated_at = CURRENT_TIMESTAMP
       RETURNING kit_id, tenant_id, status, client_name, client_email, client_company, client_phone,
                 support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
                 created_at, updated_at`,
      [
        kitId,
        kitId,
        tenantId,
        input.sourceRequestId || null,
        status,
        clientName,
        input.clientEmail || null,
        input.clientCompany || null,
        input.clientPhone || null,
        JSON.stringify(supportIds),
        JSON.stringify(approvedPrices),
        Number.isFinite(totalAmount as number) ? totalAmount : null,
        currency === 'POR DEFINIR' ? 'Por definir' : currency,
        input.notes || null,
        JSON.stringify(input.metadata || {}),
        input.pdfUrl || null,
        input.pptUrl || null,
        'Media Kit ' + kitId, clientId, clientCompany, legacyCity,
        JSON.stringify(supportIds), toLegacyMediaKitState(status), legacyDate,
      ]
    );

    await client.query('DELETE FROM mediakit_items WHERE kit_id = $1', [kitId]);
    for (const [index, supportId] of supportIds.entries()) {
      const price = approvedPrices[supportId] == null ? null : Number(approvedPrices[supportId]);
      await client.query(
        `INSERT INTO mediakit_items (kit_id, support_id, tenant_id, approved_price, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [kitId, supportId, tenantBySupportId.get(supportId) ?? null, Number.isFinite(price as number) ? price : null, index]
      );
    }

    await client.query('COMMIT');
    const row = result.rows[0];
    return {
      kitId: row.kit_id,
      tenantId: row.tenant_id ?? null,
      sourceRequestId: input.sourceRequestId || null,
      status: normalizeStatus(row.status),
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientCompany: row.client_company,
      clientPhone: row.client_phone,
      supportIds: row.support_ids || [],
      approvedPrices: row.approved_prices || {},
      totalAmount: row.total_amount,
      currency: row.currency,
      notes: row.notes,
      metadata: row.metadata || {},
      pdfUrl: row.pdf_url,
      pptUrl: row.ppt_url,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getMediaKit(kitId: string): Promise<MediaKitRecord | null> {
  if (!isDatabaseConfigured) return null;
  await ensureTables();
  const result = await pool.query(
    `SELECT kit_id, tenant_id, source_request_id, status, client_name, client_email, client_company, client_phone,
            support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
            created_at, updated_at
     FROM mediakits WHERE kit_id = $1 LIMIT 1`,
    [kitId]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    kitId: row.kit_id,
    tenantId: row.tenant_id ?? null,
    sourceRequestId: row.source_request_id,
    status: normalizeStatus(row.status),
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientCompany: row.client_company,
    clientPhone: row.client_phone,
    supportIds: row.support_ids || [],
    approvedPrices: row.approved_prices || {},
    totalAmount: row.total_amount,
    currency: row.currency,
    notes: row.notes,
    metadata: row.metadata || {},
    pdfUrl: row.pdf_url,
    pptUrl: row.ppt_url,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Resolve the persisted Media Kit relation for one onboarding request. */
export async function getMediaKitBySourceRequestId(sourceRequestId: string): Promise<MediaKitRecord | null> {
  if (!isDatabaseConfigured) return null;
  const normalizedRequestId = sourceRequestId.trim();
  if (!normalizedRequestId) return null;
  await ensureTables();
  const result = await pool.query(
    `SELECT kit_id, tenant_id, source_request_id, status, client_name, client_email, client_company, client_phone,
            support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
            created_at, updated_at
     FROM mediakits WHERE source_request_id = $1
     ORDER BY updated_at DESC LIMIT 1`,
    [normalizedRequestId]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    kitId: row.kit_id,
    tenantId: row.tenant_id ?? null,
    sourceRequestId: row.source_request_id,
    status: normalizeStatus(row.status),
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientCompany: row.client_company,
    clientPhone: row.client_phone,
    supportIds: row.support_ids || [],
    approvedPrices: row.approved_prices || {},
    totalAmount: row.total_amount,
    currency: row.currency,
    notes: row.notes,
    metadata: row.metadata || {},
    pdfUrl: row.pdf_url,
    pptUrl: row.ppt_url,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listMediaKits(): Promise<MediaKitRecord[]> {
  if (!isDatabaseConfigured) return [];
  await ensureTables();
  const result = await pool.query(
    `SELECT kit_id, tenant_id, source_request_id, status, client_name, client_email, client_company, client_phone,
            support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
            created_at, updated_at
     FROM mediakits ORDER BY updated_at DESC`
  );
  return result.rows.map((row) => ({
    kitId: row.kit_id,
    tenantId: row.tenant_id ?? null,
    sourceRequestId: row.source_request_id,
    status: normalizeStatus(row.status),
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientCompany: row.client_company,
    clientPhone: row.client_phone,
    supportIds: row.support_ids || [],
    approvedPrices: row.approved_prices || {},
    totalAmount: row.total_amount,
    currency: row.currency,
    notes: row.notes,
    metadata: row.metadata || {},
    pdfUrl: row.pdf_url,
    pptUrl: row.ppt_url,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function updateMediaKitStatus(kitId: string, status: MediaKitStatus): Promise<MediaKitRecord | null> {
  if (!isDatabaseConfigured) return null;
  await ensureTables();
  if (!['draft', 'ready', 'sent', 'archived'].includes(status)) {
    throw new Error('Estado de Media Kit inválido.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Keep the same lock order as saveMediaKit (supports, then kit) to avoid
    // deadlocks when a save races with approval or delivery.
    const snapshot = await client.query(
      'SELECT support_ids FROM mediakits WHERE kit_id = $1 LIMIT 1',
      [kitId],
    );
    if (!snapshot.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const snapshotSupportIds = normalizeSupportIds(snapshot.rows[0].support_ids);
    let lockedSupports: any[] = [];
    if ((status === 'ready' || status === 'sent') && snapshotSupportIds.length > 0) {
      const supportsResult = await client.query(
        `SELECT canonical_id, tenant_id, active, disponibilidad
           FROM supports
          WHERE canonical_id = ANY($1::text[])
          FOR UPDATE`,
        [snapshotSupportIds],
      );
      lockedSupports = supportsResult.rows;
    }

    const existing = await client.query(
      `SELECT kit_id, tenant_id, source_request_id, metadata, support_ids
         FROM mediakits
        WHERE kit_id = $1
        FOR UPDATE`,
      [kitId],
    );
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const current = existing.rows[0];
    if (status === 'ready' || status === 'sent') {
      const proposalPeriod = current.metadata?.proposalPeriod as { duracionValor?: unknown; duracionUnidad?: unknown } | undefined;
      if (!isProposalDurationValid({
        duracionValor: proposalPeriod?.duracionValor == null ? '' : String(proposalPeriod.duracionValor),
        duracionUnidad: proposalPeriod?.duracionUnidad === 'meses' ? 'meses' : 'días',
      })) {
        throw new Error('El Media Kit no puede marcarse como listo o enviado sin una duración estándar válida.');
      }

      const supportIds = normalizeSupportIds(current.support_ids);
      if (supportIds.length === 0) {
        throw new Error('El Media Kit no puede marcarse como listo o enviado: requiere al menos un soporte conciliado.');
      }
      if (supportIds.length !== snapshotSupportIds.length || supportIds.some((id, index) => id !== snapshotSupportIds[index])) {
        throw new Error('El Media Kit cambió mientras se validaba. Actualizá e intentá nuevamente.');
      }
      if (lockedSupports.length !== supportIds.length) {
        throw new Error('El Media Kit contiene soportes que ya no existen en el inventario.');
      }
      const invalid = lockedSupports.find((support) =>
        !support.tenant_id || support.active !== true || support.disponibilidad !== 'disponible'
      );
      if (invalid) {
        throw new Error(`El soporte '${invalid.canonical_id}' está pendiente de ownership o dejó de estar disponible.`);
      }

      const itemRows = await client.query(
        `SELECT support_id, tenant_id
           FROM mediakit_items
          WHERE kit_id = $1`,
        [kitId],
      );
      const itemTenantBySupport = new Map(itemRows.rows.map((item) => [String(item.support_id), item.tenant_id as string | null]));
      if (itemRows.rows.length !== supportIds.length || lockedSupports.some((support) =>
        itemTenantBySupport.get(String(support.canonical_id)) !== support.tenant_id
      )) {
        throw new Error('El ownership de las líneas del Media Kit no coincide con el inventario actual. Guardá nuevamente el Media Kit antes de aprobarlo.');
      }

      const derivedTenantId = resolveMediaKitTenantId(lockedSupports.map((support) => String(support.tenant_id)));
      if ((current.tenant_id ?? null) !== derivedTenantId) {
        throw new Error('El ownership de la cabecera del Media Kit no coincide con sus soportes. Guardá nuevamente el Media Kit antes de aprobarlo.');
      }
    }

    const result = await client.query(
      `UPDATE mediakits SET status = $2, estado = $3, updated_at = CURRENT_TIMESTAMP WHERE kit_id = $1
       RETURNING kit_id, tenant_id, source_request_id, status, client_name, client_email, client_company, client_phone,
                 support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
                 created_at, updated_at`,
      [kitId, status, toLegacyMediaKitState(status)],
    );
    await client.query('COMMIT');
    const row = result.rows[0];
    return {
      kitId: row.kit_id,
      tenantId: row.tenant_id ?? null,
      sourceRequestId: row.source_request_id,
      status: normalizeStatus(row.status),
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientCompany: row.client_company,
      clientPhone: row.client_phone,
      supportIds: row.support_ids || [],
      approvedPrices: row.approved_prices || {},
      totalAmount: row.total_amount,
      currency: row.currency,
      notes: row.notes,
      metadata: row.metadata || {},
      pdfUrl: row.pdf_url,
      pptUrl: row.ppt_url,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
