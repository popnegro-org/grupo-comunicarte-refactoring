import { pool, isDatabaseConfigured } from '../db/index.ts';


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

let tableReady = false;

async function ensureTables(): Promise<void> {
  if (!isDatabaseConfigured || tableReady) return;

  // P1 persistence is initialized lazily on first management operation.
  // This deliberately avoids adding DDL to the application cold-start path.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mediakits (
      id SERIAL PRIMARY KEY,
      kit_id TEXT UNIQUE NOT NULL,
      source_request_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_company TEXT,
      client_phone TEXT,
      support_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      approved_prices JSONB NOT NULL DEFAULT '{}'::jsonb,
      total_amount NUMERIC,
      currency TEXT NOT NULL DEFAULT 'ARS',
      notes TEXT,
      metadata JSONB,
      pdf_url TEXT,
      ppt_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mediakit_items (
      id SERIAL PRIMARY KEY,
      kit_id TEXT NOT NULL,
      support_id TEXT NOT NULL,
      approved_price NUMERIC,
      sort_order INTEGER NOT NULL DEFAULT 0,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Existing databases may contain an older mediakits table created before
    -- the management schema was introduced. Keep the runtime bootstrap
    -- additive/idempotent so those databases are upgraded without dropping
    -- existing data.
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS kit_id TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS source_request_id TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_name TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_email TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_company TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS client_phone TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS support_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS approved_prices JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ARS';
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS metadata JSONB;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS pdf_url TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS ppt_url TEXT;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE mediakits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS kit_id TEXT;
    ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS support_id TEXT;
    ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS approved_price NUMERIC;
    ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS metadata JSONB;
    ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE mediakit_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_mediakits_kit_id ON mediakits(kit_id);
    CREATE INDEX IF NOT EXISTS idx_mediakits_status ON mediakits(status);
    CREATE INDEX IF NOT EXISTS idx_mediakits_source_request ON mediakits(source_request_id);
    CREATE INDEX IF NOT EXISTS idx_mediakit_items_kit_id ON mediakit_items(kit_id);
  `);
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

  const rawApprovedPrices = input.approvedPrices ?? {};
  if (!rawApprovedPrices || typeof rawApprovedPrices !== 'object' || Array.isArray(rawApprovedPrices)) {
    throw new Error('Los precios aprobados deben tener un formato válido.');
  }
  const approvedPrices: Record<string, string> = {};
  for (const [supportId, rawPrice] of Object.entries(rawApprovedPrices)) {
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

  const status = normalizeStatus(input.status);
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
        currency === 'POR DEFINIR' ? 'Por definir' : currency,
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
  await ensureTables();
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
  await ensureTables();
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
  await ensureTables();
  if (!['draft', 'ready', 'sent', 'archived'].includes(status)) {
    throw new Error('Estado de Media Kit inválido.');
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
