import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

const rawConnectionString = process.env.DATABASE_URL?.trim();
// Normalize legacy pg connection-string modes to the explicit secure semantics used by current pg versions.
const connectionString = rawConnectionString?.replace(/([?&])sslmode=(?:prefer|require|verify-ca)(?=&|$)/i, '$1sslmode=verify-full');
export const isDatabaseConfigured = Boolean(connectionString);

if (!connectionString) {
  throw new Error('DATABASE_URL es obligatorio. Grupo Comunicarte no ejecuta inventario ni operaciones comerciales sin Neon configurado.');
}
const isVercelRuntime = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

const pool = new Pool({
  connectionString,
  ssl: connectionString!.includes('neon.tech') || connectionString!.includes('sslmode=verify-full') ? { rejectUnauthorized: true } : undefined,
});

export const db = drizzle(pool, { schema });

/**
 * Database bootstrap is intentionally disabled inside Vercel serverless
 * requests. Schema/seed work is deployment/startup responsibility for the
 * persistent Render runtime, never a request/cold-start dependency.
 */
const BOOTSTRAP_RETRIES = 3;
const BOOTSTRAP_RETRY_DELAY_MS = 500;

function isTransientBootstrapError(err: unknown) {
  if (!err || typeof err !== 'object') return false;
  const error = err as { name?: string; message?: string; code?: string; type?: string };
  const message = String(error.message ?? '').toLowerCase();
  return error.name === 'ErrorEvent' || error.type === 'error' || /connection|websocket|socket|timeout|econnreset|enotfound|etimedout/.test(message) || ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'].includes(String(error.code ?? ''));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initDatabase() {
  if (isVercelRuntime) {
    console.info('Database bootstrap skipped in Vercel runtime; schema/seed must be managed outside serverless requests.');
    return;
  }
  for (let attempt = 1; attempt <= BOOTSTRAP_RETRIES; attempt += 1) {
    try {
      await initializeDatabaseOnce();
      return;
    } catch (err) {
      if (attempt === BOOTSTRAP_RETRIES || !isTransientBootstrapError(err)) {
        console.error('Database initialization failed:', err);
        return;
      }
      console.warn(`Transient database bootstrap failure; retrying (${attempt}/${BOOTSTRAP_RETRIES - 1})`);
      await sleep(BOOTSTRAP_RETRY_DELAY_MS * attempt);
    }
  }
}

async function initializeDatabaseOnce() {
  try {
    // 1. Create tables if not exist and ensure columns exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS supports (
        id SERIAL PRIMARY KEY,
        canonical_id TEXT UNIQUE,
        name TEXT,
        ciudad TEXT,
        tipo_soporte TEXT,
        family TEXT DEFAULT 'traditional',
        active BOOLEAN DEFAULT TRUE,
        lat NUMERIC,
        lng NUMERIC,
        address TEXT,
        description TEXT,
        characteristics TEXT,
        mapa_url TEXT,
        image_urls JSONB,
        disponibilidad TEXT DEFAULT 'disponible',
        available_from TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        schedule TEXT,
        duration TEXT,
        waypoints JSONB,
        route_path JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE supports ADD COLUMN IF NOT EXISTS family TEXT DEFAULT 'traditional';
      ALTER TABLE supports ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

      CREATE SEQUENCE IF NOT EXISTS supports_id_seq;
      ALTER TABLE supports ALTER COLUMN id SET DEFAULT nextval('supports_id_seq');
      ALTER SEQUENCE supports_id_seq OWNED BY supports.id;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_supports_canonical_id ON supports(canonical_id);

      CREATE TABLE IF NOT EXISTS support_locations (
        support_canonical_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ciudad TEXT NOT NULL,
        family TEXT NOT NULL,
        category TEXT NOT NULL,
        lat NUMERIC,
        lng NUMERIC,
        address TEXT,
        mapa_url TEXT,
        availability TEXT NOT NULL DEFAULT 'disponible',
        available_from TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_faces (
        id SERIAL PRIMARY KEY,
        support_canonical_id TEXT NOT NULL,
        face_key TEXT NOT NULL,
        label TEXT NOT NULL,
        side TEXT,
        width_meters NUMERIC,
        height_meters NUMERIC,
        width_pixels INTEGER,
        height_pixels INTEGER,
        substrate TEXT,
        notes TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_technical (
        support_canonical_id TEXT PRIMARY KEY,
        summary TEXT,
        measures TEXT,
        monthly_impacts NUMERIC,
        resolution TEXT,
        turn_on_schedule TEXT,
        daily_frequency TEXT,
        requirements TEXT,
        spot_duration_seconds INTEGER,
        minimum_daily_outings INTEGER,
        max_advertisers INTEGER,
        route_duration_hours NUMERIC,
        operation_days TEXT,
        video_mode TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE support_technical ADD COLUMN IF NOT EXISTS monthly_impacts NUMERIC;

      CREATE TABLE IF NOT EXISTS support_pricing (
        support_canonical_id TEXT PRIMARY KEY,
        exhibition_price NUMERIC,
        installation_price NUMERIC,
        printing_price NUMERIC,
        monthly_price NUMERIC,
        exclusive_price NUMERIC,
        currency TEXT NOT NULL DEFAULT 'ARS',
        tax_included BOOLEAN NOT NULL DEFAULT FALSE,
        price_public BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_media (
        id SERIAL PRIMARY KEY,
        support_canonical_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        alt TEXT,
        mime_type TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        metadata JSONB,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_routes (
        support_canonical_id TEXT PRIMARY KEY,
        route_name TEXT,
        route_mode TEXT,
        route_path JSONB,
        waypoints JSONB,
        default_route BOOLEAN NOT NULL DEFAULT FALSE,
        schedule TEXT,
        duration TEXT,
        hours TEXT,
        weekdays TEXT,
        max_advertisers INTEGER,
        spot_duration_seconds INTEGER,
        minimum_daily_outings INTEGER,
        metadata JSONB,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mediakit_requests (
        id SERIAL PRIMARY KEY,
        request_id TEXT UNIQUE,
        requester_name TEXT,
        requester_email TEXT,
        requester_company TEXT,
        requester_phone TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );


      CREATE SEQUENCE IF NOT EXISTS mediakit_requests_id_seq;
      ALTER TABLE mediakit_requests ALTER COLUMN id SET DEFAULT nextval('mediakit_requests_id_seq');
      ALTER SEQUENCE mediakit_requests_id_seq OWNED BY mediakit_requests.id;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_mediakit_requests_request_id ON mediakit_requests(request_id);

      CREATE TABLE IF NOT EXISTS mediakit_request_items (
        id SERIAL PRIMARY KEY,
        request_id TEXT,
        support_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );


      CREATE SEQUENCE IF NOT EXISTS mediakit_request_items_id_seq;
      ALTER TABLE mediakit_request_items ALTER COLUMN id SET DEFAULT nextval('mediakit_request_items_id_seq');
      ALTER SEQUENCE mediakit_request_items_id_seq OWNED BY mediakit_request_items.id;
    `);

    // 1.b Add Foreign Key Constraints & Cleanup Orphans (P0-4)
    await pool.query(`

      ALTER TABLE mediakit_request_items DROP CONSTRAINT IF EXISTS fk_mediakit_request_items_request;
      ALTER TABLE mediakit_request_items DROP CONSTRAINT IF EXISTS fk_mediakit_request_items_support;

      ALTER TABLE mediakit_request_items 
        ADD CONSTRAINT fk_mediakit_request_items_request 
        FOREIGN KEY (request_id) REFERENCES mediakit_requests(request_id) ON DELETE CASCADE;

      ALTER TABLE mediakit_request_items 
        ADD CONSTRAINT fk_mediakit_request_items_support 
        FOREIGN KEY (support_id) REFERENCES supports(canonical_id) ON DELETE CASCADE;

      ALTER TABLE support_locations DROP CONSTRAINT IF EXISTS fk_support_locations_support;
      ALTER TABLE support_faces DROP CONSTRAINT IF EXISTS fk_support_faces_support;
      ALTER TABLE support_technical DROP CONSTRAINT IF EXISTS fk_support_technical_support;
      ALTER TABLE support_pricing DROP CONSTRAINT IF EXISTS fk_support_pricing_support;
      ALTER TABLE support_media DROP CONSTRAINT IF EXISTS fk_support_media_support;
      ALTER TABLE support_routes DROP CONSTRAINT IF EXISTS fk_support_routes_support;

      ALTER TABLE support_locations
        ADD CONSTRAINT fk_support_locations_support
        FOREIGN KEY (support_canonical_id) REFERENCES supports(canonical_id) ON DELETE CASCADE;

      ALTER TABLE support_faces
        ADD CONSTRAINT fk_support_faces_support
        FOREIGN KEY (support_canonical_id) REFERENCES supports(canonical_id) ON DELETE CASCADE;

      ALTER TABLE support_technical
        ADD CONSTRAINT fk_support_technical_support
        FOREIGN KEY (support_canonical_id) REFERENCES supports(canonical_id) ON DELETE CASCADE;

      ALTER TABLE support_pricing
        ADD CONSTRAINT fk_support_pricing_support
        FOREIGN KEY (support_canonical_id) REFERENCES supports(canonical_id) ON DELETE CASCADE;

      ALTER TABLE support_media
        ADD CONSTRAINT fk_support_media_support
        FOREIGN KEY (support_canonical_id) REFERENCES supports(canonical_id) ON DELETE CASCADE;

      ALTER TABLE support_routes
        ADD CONSTRAINT fk_support_routes_support
        FOREIGN KEY (support_canonical_id) REFERENCES supports(canonical_id) ON DELETE CASCADE;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_support_faces_unique_face_key
        ON support_faces(support_canonical_id, face_key);
    `);

    await pool.query(`
      UPDATE supports
      SET family = CASE
        WHEN tipo_soporte = 'led_movil' THEN 'led_mobile'
        WHEN tipo_soporte = 'led' THEN 'led'
        ELSE 'traditional'
      END
      WHERE family IS NULL OR family = '';

      UPDATE supports
      SET active = FALSE
      WHERE canonical_id IS NULL OR canonical_id = '' OR name IS NULL OR name = '' OR ciudad IS NULL OR ciudad = '' OR tipo_soporte IS NULL OR tipo_soporte = '';
    `);

    console.log('Database tables and foreign key constraints verified/created successfully.');


  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}


export { pool };
