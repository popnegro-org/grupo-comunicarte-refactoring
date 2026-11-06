-- Additive integration outbox foundation. Apply only to isolated QA branches first.
-- No provider credentials, external requests, customer PII, or production writes are involved.

CREATE TABLE IF NOT EXISTS public.integration_outbox (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT integration_outbox_status_check
    CHECK (status IN ('pending', 'processing', 'delivered', 'retryable_error', 'permanent_error')),
  CONSTRAINT integration_outbox_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT integration_outbox_provider_idempotency_key_unique
    UNIQUE (provider, idempotency_key)
);

CREATE INDEX IF NOT EXISTS integration_outbox_dispatch_idx
  ON public.integration_outbox (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS integration_outbox_aggregate_idx
  ON public.integration_outbox (aggregate_type, aggregate_id);
