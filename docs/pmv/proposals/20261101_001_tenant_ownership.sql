-- PROPOSAL ONLY — NOT EXECUTED.
-- Additive tenant ownership fields. Existing records intentionally remain NULL
-- until an authoritative ownership source is reviewed; never backfill by city.
BEGIN;

ALTER TABLE supports ADD COLUMN IF NOT EXISTS tenant_id text NULL;
ALTER TABLE mediakit_request_items ADD COLUMN IF NOT EXISTS tenant_id text NULL;
ALTER TABLE mediakit_requests ADD COLUMN IF NOT EXISTS request_scope text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mediakit_requests_request_scope_check'
      AND conrelid = 'mediakit_requests'::regclass
  ) THEN
    ALTER TABLE mediakit_requests
      ADD CONSTRAINT mediakit_requests_request_scope_check
      CHECK (request_scope IS NULL OR request_scope IN ('tenant', 'global'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS supports_tenant_id_idx ON supports (tenant_id);
CREATE INDEX IF NOT EXISTS mediakit_request_items_tenant_id_idx ON mediakit_request_items (tenant_id);
CREATE INDEX IF NOT EXISTS mediakit_requests_request_scope_idx ON mediakit_requests (request_scope);

COMMENT ON COLUMN supports.tenant_id IS 'Tenant ownership. NULL means pending/quarantined; do not infer from city.';
COMMENT ON COLUMN mediakit_request_items.tenant_id IS 'Tenant ownership of this selected support item. NULL means unassigned.';
COMMENT ON COLUMN mediakit_requests.request_scope IS 'Commercial request scope: tenant or global. NULL means legacy/unclassified.';

COMMIT;

-- Deliberately omitted: data backfill, city-based ownership inference, FK to tenants,
-- RLS activation, and any change to the existing single-admin login.
