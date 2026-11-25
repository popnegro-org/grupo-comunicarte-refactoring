-- Persist documentary provenance for support ownership assignments.
-- Existing assignments are backfilled only from the approved 28-row mapping.
ALTER TABLE public.supports
  ADD COLUMN IF NOT EXISTS tenant_ownership_evidence TEXT,
  ADD COLUMN IF NOT EXISTS tenant_ownership_assigned_by TEXT,
  ADD COLUMN IF NOT EXISTS tenant_ownership_assigned_at TIMESTAMPTZ;

UPDATE public.supports
   SET tenant_ownership_evidence = CASE
         WHEN canonical_id ~ '^bue-trad-(0[1-9]|10)$' AND tenant_id = 'tenant-ba'
           THEN 'docs/inventario/source/soportes-buenos-aires.pdf · posición ' || lpad(substring(canonical_id from '([0-9]+)$'), 2, '0')
         WHEN canonical_id ~ '^mza-trad-(0[1-9]|1[0-5])$' AND tenant_id = 'tenant-default'
           THEN 'docs/inventario/source/soportes-mendoza.pdf · posición ' || lpad(substring(canonical_id from '([0-9]+)$'), 2, '0')
         WHEN canonical_id = 'mza-led-01' AND tenant_id = 'tenant-default'
           THEN 'docs/inventario/source/soportes-mendoza.pdf · posición 16'
         WHEN canonical_id = 'mza-led-02' AND tenant_id = 'tenant-default'
           THEN 'docs/inventario/source/soportes-mendoza.pdf · posición 17'
         WHEN canonical_id = 'mza-led-movil-01' AND tenant_id = 'tenant-default'
           THEN 'docs/inventario/source/soportes-ledmovil-mendoza.pdf · producto/ruta único'
         ELSE tenant_ownership_evidence
       END,
       tenant_ownership_assigned_by = COALESCE(tenant_ownership_assigned_by, 'documented-reconciliation'),
       tenant_ownership_assigned_at = COALESCE(tenant_ownership_assigned_at, TIMESTAMPTZ '2026-11-01 00:00:00+00')
 WHERE tenant_id IS NOT NULL
   AND tenant_ownership_evidence IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.supports
     WHERE tenant_id IS NOT NULL
       AND (tenant_ownership_evidence IS NULL OR tenant_ownership_assigned_by IS NULL OR tenant_ownership_assigned_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'A support tenant assignment has no documentary evidence or assignment provenance';
  END IF;
END $$;
