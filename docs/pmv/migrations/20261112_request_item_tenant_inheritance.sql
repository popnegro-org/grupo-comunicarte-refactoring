-- Enforce ownership inheritance for nullable request-item tenant_id.
--
-- Context:
-- mediakit_request_items.tenant_id intentionally remains NULL for legacy items
-- whose referenced support is still quarantined (supports.tenant_id IS NULL).
-- PostgreSQL composite FKs use MATCH SIMPLE by default, so a NULL child
-- tenant_id bypasses the composite FK even when the support is assigned.
--
-- This trigger closes that gap without assigning ownership to pending supports:
--   * assigned support + omitted tenant_id -> inherit exact support tenant;
--   * assigned support + matching tenant_id -> accept;
--   * assigned support + mismatching tenant_id -> reject;
--   * pending support + NULL tenant_id -> preserve quarantine;
--   * pending support + non-NULL tenant_id -> reject;
--   * missing support -> reject.
--
-- Apply to an isolated Neon QA/Preview branch only after verifying branch ID.
-- This migration is additive and transactional. It does not alter existing rows,
-- roles, grants, RLS, or Production. Production requires a separate HUMAN GATE.

BEGIN;

DO $preflight$
DECLARE
  v_missing_tenants TEXT[];
  v_bad_rows BIGINT;
BEGIN
  IF to_regclass('public.supports') IS NULL
     OR to_regclass('public.mediakit_request_items') IS NULL
     OR to_regclass('public.tenants') IS NULL THEN
    RAISE EXCEPTION 'Ownership trigger preflight failed: required public tables are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='supports'
      AND column_name='tenant_id' AND data_type='text'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='mediakit_request_items'
      AND column_name='tenant_id' AND data_type='text'
  ) THEN
    RAISE EXCEPTION 'Ownership trigger preflight failed: tenant_id columns must exist and be TEXT';
  END IF;

  SELECT array_agg(expected.id ORDER BY expected.id)
    INTO v_missing_tenants
  FROM (VALUES ('tenant-ba'::text), ('tenant-default'::text)) AS expected(id)
  LEFT JOIN public.tenants tenant ON tenant.id=expected.id
  WHERE tenant.id IS NULL;

  IF COALESCE(array_length(v_missing_tenants, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Ownership trigger preflight failed: missing tenants %', v_missing_tenants;
  END IF;

  SELECT count(*) INTO v_bad_rows
  FROM public.mediakit_request_items item
  LEFT JOIN public.supports support ON support.canonical_id=item.support_id
  WHERE support.canonical_id IS NULL
     OR (support.tenant_id IS NULL AND item.tenant_id IS NOT NULL)
     OR (support.tenant_id IS NOT NULL AND item.tenant_id IS NOT NULL
         AND item.tenant_id IS DISTINCT FROM support.tenant_id);

  IF v_bad_rows <> 0 THEN
    RAISE EXCEPTION 'Ownership trigger preflight failed: % orphaned or mismatched request items', v_bad_rows;
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.enforce_mediakit_request_item_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_support_tenant_id TEXT;
BEGIN
  -- SHARE lock prevents a concurrent ownership update while this line is checked.
  SELECT support.tenant_id
    INTO v_support_tenant_id
  FROM public.supports AS support
  WHERE support.canonical_id = NEW.support_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request item references an unknown support: %', NEW.support_id
      USING ERRCODE = '23503',
            CONSTRAINT = 'mediakit_request_items_support_tenant_fkey';
  END IF;

  IF v_support_tenant_id IS NULL THEN
    IF NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'A quarantined support cannot receive a tenant-scoped request item: %', NEW.support_id
        USING ERRCODE = '23514',
              CONSTRAINT = 'mediakit_request_items_tenant_inheritance_check';
    END IF;
    -- Preserve NULL while the source support remains unassigned.
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := v_support_tenant_id;
  ELSIF NEW.tenant_id IS DISTINCT FROM v_support_tenant_id THEN
    RAISE EXCEPTION 'Request item tenant does not match its support: %', NEW.support_id
      USING ERRCODE = '23514',
            CONSTRAINT = 'mediakit_request_items_tenant_inheritance_check';
  END IF;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS mediakit_request_items_tenant_inheritance
  ON public.mediakit_request_items;

CREATE TRIGGER mediakit_request_items_tenant_inheritance
BEFORE INSERT OR UPDATE OF support_id, tenant_id
ON public.mediakit_request_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_mediakit_request_item_tenant();

COMMENT ON FUNCTION public.enforce_mediakit_request_item_tenant() IS
  'Inherits tenant_id from the exact support; preserves NULL only for quarantined supports and rejects mismatches.';

COMMIT;

-- POSTFLIGHT — execute separately on the same branch:
-- SELECT to_regprocedure('public.enforce_mediakit_request_item_tenant()');
-- SELECT tgname, tgenabled FROM pg_trigger
--  WHERE tgrelid='public.mediakit_request_items'::regclass
--    AND tgname='mediakit_request_items_tenant_inheritance'
--    AND NOT tgisinternal;
-- Expected: function exists, exactly one enabled trigger.
-- Existing rows remain unchanged; verify their NULL/match counts against the
-- branch-specific preflight snapshot. Then test insert cases inside ROLLBACK:
-- assigned + omitted tenant => inherited; assigned + mismatch => rejected;
-- pending + NULL => accepted; pending + tenant => rejected; missing support => rejected.
