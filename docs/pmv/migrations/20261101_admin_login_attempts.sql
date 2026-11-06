-- Distributed admin login limiter.
-- Verified present in Neon Preview; Production remains untouched and requires separate HUMAN GATE.
-- Store only keyed HMAC-SHA256 IP digests, never raw IP addresses.
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 1),
  window_started_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_updated_at_idx
  ON public.admin_login_attempts (updated_at);

COMMENT ON TABLE public.admin_login_attempts IS
  'Atomic distributed admin login rate limits; ip_hash is HMAC-SHA256, not a raw IP address.';
