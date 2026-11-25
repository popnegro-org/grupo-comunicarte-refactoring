import { createHmac } from 'node:crypto';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type QueryResult = { rows: Array<{ attempt_count: number | string }> };
type Queryable = { query: (sql: string, values?: unknown[]) => Promise<QueryResult> };

/**
 * Distributed, atomic login limiter. The table is provisioned only by the
 * reviewed SQL migration; request handling never performs schema changes.
 * IPs are HMACed before persistence. Database errors deliberately propagate.
 */
export async function allowLoginAttempt(
  database: Queryable,
  ip: string,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!secret) throw new Error('A secret is required to hash login rate-limit keys.');
  const ipHash = createHmac('sha256', secret).update(ip || 'unknown').digest('hex');
  const result = await database.query(
    `INSERT INTO admin_login_attempts (ip_hash, attempt_count, window_started_at, updated_at)
     VALUES ($1, 1, $2, $2)
     ON CONFLICT (ip_hash) DO UPDATE SET
       attempt_count = CASE
         WHEN admin_login_attempts.window_started_at <= $2 - $3 THEN 1
         ELSE admin_login_attempts.attempt_count + 1
       END,
       window_started_at = CASE
         WHEN admin_login_attempts.window_started_at <= $2 - $3 THEN $2
         ELSE admin_login_attempts.window_started_at
       END,
       updated_at = $2
     RETURNING attempt_count`,
    [ipHash, now, WINDOW_MS],
  );

  return Number(result.rows[0]?.attempt_count ?? MAX_ATTEMPTS + 1) <= MAX_ATTEMPTS;
}

export const loginRateLimitPolicy = Object.freeze({
  windowMs: WINDOW_MS,
  maxAttempts: MAX_ATTEMPTS,
});
