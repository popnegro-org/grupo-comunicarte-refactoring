-- PROPOSAL ONLY — NOT EXECUTED.
-- Neon preview branch audit confirms public.tenants exists with tenant-ba and tenant-default.
-- Additive ownership fields; existing rows remain NULL until provenance is verified.
BEGIN;

ALTER TABLE public.supports
  ADD COLUMN IF NOT EXISTS tenant_id text NULL
  REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.mediakit_request_items
  ADD COLUMN IF NOT EXISTS tenant_id text NULL
  REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.mediakit_requests
  ADD COLUMN IF NOT EXISTS request_scope text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mediakit_requests_request_scope_check'
      AND conrelid = 'public.mediakit_requests'::regclass
  ) THEN
    ALTER TABLE public.mediakit_requests
      ADD CONSTRAINT mediakit_requests_request_scope_check
      CHECK (request_scope IS NULL OR request_scope IN ('tenant', 'global'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS supports_tenant_id_idx ON public.supports (tenant_id);
CREATE INDEX IF NOT EXISTS mediakit_request_items_tenant_id_idx ON public.mediakit_request_items (tenant_id);
CREATE INDEX IF NOT EXISTS mediakit_requests_request_scope_idx ON public.mediakit_requests (request_scope);

COMMENT ON COLUMN public.supports.tenant_id IS 'Tenant ownership. NULL means pending/quarantined; never infer from city.';
COMMENT ON COLUMN public.mediakit_request_items.tenant_id IS 'Tenant ownership of this selected support item. NULL means unassigned.';
COMMENT ON COLUMN public.mediakit_requests.request_scope IS 'Commercial request scope: tenant or global. NULL means legacy/unclassified.';

COMMIT;

-- No backfill, city-based ownership inference, RLS activation, or credential changes.
