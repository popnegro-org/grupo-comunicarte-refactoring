-- Add tenant ownership to each persisted Media Kit line item.
-- Apply to the Preview branch first; Production requires a separate HUMAN GATE.
ALTER TABLE public.mediakit_items
  ADD COLUMN IF NOT EXISTS tenant_id TEXT
  REFERENCES public.tenants(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_mediakit_items_tenant_id
  ON public.mediakit_items (tenant_id);

-- Backfill only from an exact canonical_id join to the already reconciled supports table.
-- NULL remains quarantined when the source support has no assigned tenant.
UPDATE public.mediakit_items AS item
   SET tenant_id = support.tenant_id
  FROM public.supports AS support
 WHERE item.support_id = support.canonical_id
   AND item.tenant_id IS NULL
   AND support.tenant_id IS NOT NULL;
