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
/**
 * Emits a secret-free snapshot of the effective PostgreSQL identity used by
 * the persistent Render runtime. This is diagnostic only: it does not change
 * roles, grants, RLS, or tenant context.
 */
async function logDatabaseSecurityContext() {
  try {
    const result = await pool.query<{
      current_user: string;
      session_user: string;
      current_database: string;
      bypass_rls: boolean;
      superuser: boolean;
      database_create: boolean;
      public_schema_create: boolean;
      public_table_count: number;
      rls_enabled_table_count: number;
      select_table_count: number;
      insert_table_count: number;
      update_table_count: number;
      delete_table_count: number;
    }>(`
      SELECT
        current_user,
        session_user,
        current_database(),
        role.rolbypassrls AS bypass_rls,
        role.rolsuper AS superuser,
        has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
        has_schema_privilege(current_user, 'public', 'CREATE') AS public_schema_create,
        counts.public_table_count,
        counts.rls_enabled_table_count,
        counts.select_table_count,
        counts.insert_table_count,
        counts.update_table_count,
        counts.delete_table_count
      FROM pg_roles role
      CROSS JOIN (
        SELECT
          COUNT(*)::int AS public_table_count,
          COUNT(*) FILTER (WHERE c.relrowsecurity)::int AS rls_enabled_table_count,
          COUNT(*) FILTER (WHERE has_table_privilege(current_user, c.oid, 'SELECT'))::int AS select_table_count,
          COUNT(*) FILTER (WHERE has_table_privilege(current_user, c.oid, 'INSERT'))::int AS insert_table_count,
          COUNT(*) FILTER (WHERE has_table_privilege(current_user, c.oid, 'UPDATE'))::int AS update_table_count,
          COUNT(*) FILTER (WHERE has_table_privilege(current_user, c.oid, 'DELETE'))::int AS delete_table_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
      ) counts
      WHERE role.rolname = current_user
    `);
    console.info('[db-security] Effective runtime database context (no credentials):', result.rows[0]);
  } catch (error) {
    console.warn('[db-security] Runtime identity diagnostic unavailable:', error instanceof Error ? error.message : 'unknown error');
  }
}

const REQUIRED_RUNTIME_TABLES = [
  'supports',
  'support_locations',
  'support_faces',
  'support_technical',
  'support_pricing',
  'support_media',
  'support_routes',
  'mediakit_requests',
  'mediakit_request_items',
  'mediakits',
  'mediakit_items',
  'admin_login_attempts',
] as const;

/**
 * Runtime startup must never perform schema mutations. Bootstrap remains an
 * explicit migration-only escape hatch for isolated database provisioning.
 */
async function verifyRuntimeSchema() {
  const result = await pool.query<{ table_name: string }>(
    `SELECT required.table_name
       FROM unnest($1::text[]) AS required(table_name)
       LEFT JOIN information_schema.tables actual
         ON actual.table_schema = 'public'
        AND actual.table_name = required.table_name
      WHERE actual.table_name IS NULL
      ORDER BY required.table_name`,
    [REQUIRED_RUNTIME_TABLES],
  );
  if (result.rows.length > 0) {
    throw new Error(`Database schema incomplete; apply reviewed migrations before starting runtime: ${result.rows.map((row) => row.table_name).join(', ')}`);
  }
}

export async function initDatabase() {
  if (isVercelRuntime) {
    console.info('Database schema verification skipped in Vercel serverless runtime.');
    return;
  }

  await logDatabaseSecurityContext();
  await verifyRuntimeSchema();
  console.info('Database bootstrap disabled; required runtime schema verified.');
}

export { pool };
