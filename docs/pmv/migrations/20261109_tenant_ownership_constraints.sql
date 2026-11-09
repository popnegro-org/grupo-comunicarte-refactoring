-- Enforce the tenant attached to each persisted Media Kit line at database level.
-- Run only after verifying there are no null Media Kit line tenants and no
-- request/kit line ownership mismatches. This migration is for Preview first;
-- Production requires its own separately approved migration window.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.mediakit_items WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce mediakit_items.tenant_id NOT NULL: null ownership rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.mediakit_request_items AS item
      LEFT JOIN public.supports AS support ON support.canonical_id = item.support_id
     WHERE support.canonical_id IS NULL
        OR (item.tenant_id IS NOT NULL AND item.tenant_id IS DISTINCT FROM support.tenant_id)
  ) THEN
    RAISE EXCEPTION 'Cannot enforce request item ownership: orphan or mismatched tenant rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.mediakit_items AS item
      LEFT JOIN public.supports AS support ON support.canonical_id = item.support_id
     WHERE support.canonical_id IS NULL
        OR item.tenant_id IS DISTINCT FROM support.tenant_id
  ) THEN
    RAISE EXCEPTION 'Cannot enforce Media Kit item ownership: orphan or mismatched tenant rows exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS supports_canonical_tenant_unique
  ON public.supports (canonical_id, tenant_id);

ALTER TABLE public.mediakit_items
  ALTER COLUMN tenant_id SET NOT NULL;

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
