-- HISTORICAL PRODUCTION MIGRATION RECORD — DO NOT REPLAY in any environment or candidate release workflow.
-- The original rollout is documented as applied on 2026-11-09; verify the external migration ledger before any re-execution.
-- Production rollout for the single global administrator PMV.
-- Applied to Neon project mute-math-07036388, branch main (br-wandering-sky-aunq6lad)
-- on 2026-11-09 after successful execution and postflight on a prepared Neon branch.
-- Ownership is documentary/commercial partitioning, not per-user authorization.
-- Intentionally does NOT enable RLS or change database/runtime roles.

ALTER TABLE public.supports
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS tenant_ownership_evidence TEXT,
  ADD COLUMN IF NOT EXISTS tenant_ownership_assigned_by TEXT,
  ADD COLUMN IF NOT EXISTS tenant_ownership_assigned_at TIMESTAMPTZ;
ALTER TABLE public.mediakit_request_items
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.mediakit_requests
  ADD COLUMN IF NOT EXISTS request_scope TEXT NULL,
  ADD CONSTRAINT mediakit_requests_request_scope_check CHECK (request_scope IS NULL OR request_scope IN ('tenant','global'));
ALTER TABLE public.mediakit_items
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS supports_tenant_id_idx ON public.supports (tenant_id);
CREATE INDEX IF NOT EXISTS mediakit_request_items_tenant_id_idx ON public.mediakit_request_items (tenant_id);
CREATE INDEX IF NOT EXISTS mediakit_requests_request_scope_idx ON public.mediakit_requests (request_scope);
CREATE INDEX IF NOT EXISTS idx_mediakit_items_tenant_id ON public.mediakit_items (tenant_id);

-- Exact 28-row documentary allowlist; no city-based inference.
UPDATE public.supports AS s
SET tenant_id=m.tenant_id,
    tenant_ownership_evidence=m.evidence,
    tenant_ownership_assigned_by=COALESCE(s.tenant_ownership_assigned_by,'documented-reconciliation'),
    tenant_ownership_assigned_at=COALESCE(s.tenant_ownership_assigned_at,TIMESTAMPTZ '2026-11-01 00:00:00+00')
FROM (VALUES
  ('bue-trad-01','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 01'),
  ('bue-trad-02','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 02'),
  ('bue-trad-03','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 03'),
  ('bue-trad-04','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 04'),
  ('bue-trad-05','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 05'),
  ('bue-trad-06','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 06'),
  ('bue-trad-07','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 07'),
  ('bue-trad-08','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 08'),
  ('bue-trad-09','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 09'),
  ('bue-trad-10','tenant-ba','docs/inventario/source/soportes-buenos-aires.pdf · posición 10'),
  ('mza-trad-01','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 01'),
  ('mza-trad-02','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 02'),
  ('mza-trad-03','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 03'),
  ('mza-trad-04','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 04'),
  ('mza-trad-05','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 05'),
  ('mza-trad-06','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 06'),
  ('mza-trad-07','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 07'),
  ('mza-trad-08','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 08'),
  ('mza-trad-09','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 09'),
  ('mza-trad-10','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 10'),
  ('mza-trad-11','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 11'),
  ('mza-trad-12','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 12'),
  ('mza-trad-13','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 13'),
  ('mza-trad-14','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 14'),
  ('mza-trad-15','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 15'),
  ('mza-led-01','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 16'),
  ('mza-led-02','tenant-default','docs/inventario/source/soportes-mendoza.pdf · posición 17'),
  ('mza-led-movil-01','tenant-default','docs/inventario/source/soportes-ledmovil-mendoza.pdf · producto/ruta único')
) AS m(canonical_id,tenant_id,evidence)
WHERE s.canonical_id=m.canonical_id
  AND (s.tenant_id IS NULL OR s.tenant_id=m.tenant_id);

UPDATE public.mediakit_request_items AS item
SET tenant_id=support.tenant_id
FROM public.supports AS support
WHERE item.support_id=support.canonical_id
  AND item.tenant_id IS NULL
  AND support.tenant_id IS NOT NULL;

UPDATE public.mediakit_requests AS request
SET request_scope = CASE
  WHEN ownership.has_pending THEN NULL
  WHEN ownership.tenant_count > 1 THEN 'global'
  WHEN ownership.tenant_count = 1 THEN 'tenant'
  ELSE NULL
END
FROM (
  SELECT item.request_id,
         count(DISTINCT support.tenant_id) FILTER (WHERE support.tenant_id IS NOT NULL) AS tenant_count,
         bool_or(support.canonical_id IS NULL OR support.tenant_id IS NULL) AS has_pending
  FROM public.mediakit_request_items AS item
  LEFT JOIN public.supports AS support ON support.canonical_id=item.support_id
  GROUP BY item.request_id
) AS ownership
WHERE request.request_id=ownership.request_id;

UPDATE public.mediakit_items AS item
SET tenant_id=support.tenant_id
FROM public.supports AS support
WHERE item.support_id=support.canonical_id
  AND item.tenant_id IS NULL
  AND support.tenant_id IS NOT NULL;

ALTER TABLE public.supports
  ADD CONSTRAINT supports_tenant_ownership_audit_check
  CHECK (tenant_id IS NULL OR (tenant_ownership_evidence IS NOT NULL AND tenant_ownership_assigned_by IS NOT NULL AND tenant_ownership_assigned_at IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS supports_canonical_tenant_unique
  ON public.supports (canonical_id, tenant_id);

ALTER TABLE public.mediakit_items ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.mediakit_request_items
  ADD CONSTRAINT mediakit_request_items_support_tenant_fkey
  FOREIGN KEY (support_id, tenant_id)
  REFERENCES public.supports (canonical_id, tenant_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public.mediakit_items
  ADD CONSTRAINT mediakit_items_support_tenant_fkey
  FOREIGN KEY (support_id, tenant_id)
  REFERENCES public.supports (canonical_id, tenant_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 1),
  window_started_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_login_attempts_updated_at_idx ON public.admin_login_attempts (updated_at);
COMMENT ON TABLE public.admin_login_attempts IS 'Atomic distributed admin login rate limits. IP hash is HMAC-SHA256, not a raw IP address.';
COMMENT ON COLUMN public.supports.tenant_id IS 'Tenant ownership. NULL means pending or quarantined. Never infer from city.';
COMMENT ON COLUMN public.supports.tenant_ownership_evidence IS 'Documentary source and exact inventory PDF position for ownership assignment.';
COMMENT ON COLUMN public.mediakit_request_items.tenant_id IS 'Tenant ownership of this selected support item. NULL means unassigned.';
COMMENT ON COLUMN public.mediakit_requests.request_scope IS 'Commercial request scope: tenant or global. NULL means legacy or unclassified.';
