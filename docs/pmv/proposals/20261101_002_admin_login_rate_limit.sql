-- Historical proposal. The matching table, primary key, CHECK constraint and index are verified in Neon Preview.
-- Do not apply to Production without separate migration review and HUMAN GATE.
-- IP addresses are stored only as keyed HMAC-SHA256 digests, never in clear text.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 1),
  window_started_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_updated_at_idx
  ON admin_login_attempts (updated_at);

COMMENT ON TABLE admin_login_attempts IS
  'Atomic distributed admin login rate limits; ip_hash is HMAC-SHA256, not a raw IP address.';
