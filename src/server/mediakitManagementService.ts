import { pool, isDatabaseConfigured } from '../db/index.ts';
import { validateMediaKitFinancials } from './mediakitValidation';


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
  status: MediaKitStatus;
  createdAt: string;
  updatedAt: string;
}

let schemaReady = false;
let schemaCheck: Promise<void> | null = null;

async function ensureSchemaReady(): Promise<void> {
  if (!isDatabaseConfigured || schemaReady) return;

  if (!schemaCheck) {
    schemaCheck = (async () => {
      const requiredColumns: Record<string, string[]> = {
        mediakits: [
          'id', 'kit_id', 'source_request_id', 'status', 'client_name', 'client_email',
          'client_company', 'client_phone', 'support_ids', 'approved_prices', 'total_amount',
          'currency', 'notes', 'metadata', 'pdf_url', 'ppt_url', 'created_at', 'updated_at',
        ],
        mediakit_items: [
          'id', 'kit_id', 'support_id', 'approved_price', 'sort_order', 'metadata',
          'created_at', 'updated_at',
        ],
      };

      const result = await pool.query(
        `SELECT table_name, column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ANY($1::text[])`,
        [Object.keys(requiredColumns)],
      );
      const available = new Set(result.rows.map((row: { table_name: string; column_name: string }) =>
        `${row.table_name}.${row.column_name}`,
      ));
      const missing = Object.entries(requiredColumns).flatMap(([table, columns]) =>
        columns.filter((column) => !available.has(`${table}.${column}`)).map((column) => `${table}.${column}`),
      );

      if (missing.length > 0) {
        throw new Error(`Falta aplicar la migración de Media Kits: ${missing.join(', ')}. Consultá docs/pmv/migrations/20261125_mediakit_management_schema.sql.`);
      }
      schemaReady = true;
    })().catch((error) => {
      schemaCheck = null;
      throw error;
    });
  }

  await schemaCheck;
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

  if (!isDatabaseConfigured) {
    throw new Error('La persistencia de Media Kits requiere base de datos configurada.');
  }

  if (supportIds.length > 0) {
    const availability = await pool.query(
      `SELECT canonical_id, disponibilidad, active
       FROM supports
       WHERE canonical_id = ANY($1::text[])`,
      [supportIds],
    );
    const rows = new Map<string, { disponibilidad: string | null; active: boolean | null }>(
      availability.rows.map((row: any) => [String(row.canonical_id), { disponibilidad: row.disponibilidad, active: row.active }]),
    );
    const missing = supportIds.find((id) => !rows.has(id));
    if (missing) throw new Error(`El soporte '${missing}' no existe en el catálogo.`);
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

  const status = normalizeStatus(input.status);
  if (input.status === 'sent') {
    throw new Error('La entrega de un Media Kit solo puede confirmarse después de persistir sus archivos PDF y PPTX.');
  }
  const financials = validateMediaKitFinancials({
    supportIds,
    approvedPrices: input.approvedPrices,
    totalAmount: input.totalAmount,
    currency: input.currency,
    status,
  });
  const { approvedPrices, totalAmount, currency } = financials;
  const kitId = input.kitId?.trim() || makeKitId();

  await ensureSchemaReady();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO mediakits
        (kit_id, source_request_id, status, client_name, client_email, client_company, client_phone,
         support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13::jsonb,$14,$15,CURRENT_TIMESTAMP)
       ON CONFLICT (kit_id) DO UPDATE SET
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
         updated_at = CURRENT_TIMESTAMP
       RETURNING kit_id, status, client_name, client_email, client_company, client_phone,
                 support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
                 created_at, updated_at`,
      [
        kitId,
        input.sourceRequestId || null,
        status,
        clientName,
        input.clientEmail || null,
        input.clientCompany || null,
        input.clientPhone || null,
        JSON.stringify(supportIds),
        JSON.stringify(approvedPrices),
        Number.isFinite(totalAmount as number) ? totalAmount : null,
        currency,
        input.notes || null,
        JSON.stringify(input.metadata || {}),
        input.pdfUrl || null,
        input.pptUrl || null,
      ]
    );

    await client.query('DELETE FROM mediakit_items WHERE kit_id = $1', [kitId]);
    for (const [index, supportId] of supportIds.entries()) {
      const price = approvedPrices[supportId] == null ? null : Number(approvedPrices[supportId]);
      await client.query(
        `INSERT INTO mediakit_items (kit_id, support_id, approved_price, sort_order)
         VALUES ($1,$2,$3,$4)`,
        [kitId, supportId, Number.isFinite(price as number) ? price : null, index]
      );
    }

    await client.query('COMMIT');
    const row = result.rows[0];
    return {
      kitId: row.kit_id,
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
  await ensureSchemaReady();
  const result = await pool.query(
    `SELECT kit_id, source_request_id, status, client_name, client_email, client_company, client_phone,
            support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
            created_at, updated_at
     FROM mediakits WHERE kit_id = $1 LIMIT 1`,
    [kitId]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    kitId: row.kit_id,
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
  await ensureSchemaReady();
  const result = await pool.query(
    `SELECT kit_id, source_request_id, status, client_name, client_email, client_company, client_phone,
            support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
            created_at, updated_at
     FROM mediakits ORDER BY updated_at DESC`
  );
  return result.rows.map((row) => ({
    kitId: row.kit_id,
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
  await ensureSchemaReady();
  if (!['draft', 'ready', 'sent', 'archived'].includes(status)) {
    throw new Error('Estado de Media Kit inválido.');
  }
  if (status === 'sent') {
    const files = await pool.query(
      'SELECT pdf_url, ppt_url FROM mediakits WHERE kit_id = $1 LIMIT 1',
      [kitId],
    );
    if (!files.rows[0]) return null;
    if (!files.rows[0].pdf_url || !files.rows[0].ppt_url) {
      throw new Error('No se puede confirmar la entrega sin los archivos PDF y PPTX persistidos.');
    }
  }

  const result = await pool.query(
    `UPDATE mediakits SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE kit_id = $1
     RETURNING kit_id, source_request_id, status, client_name, client_email, client_company, client_phone,
               support_ids, approved_prices, total_amount, currency, notes, metadata, pdf_url, ppt_url,
               created_at, updated_at`,
    [kitId, status]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    kitId: row.kit_id,
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
