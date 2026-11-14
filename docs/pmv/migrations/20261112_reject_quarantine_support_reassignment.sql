-- Corrective ownership guard: historical NULL items may not be moved to
-- another quarantined support. Preserve NULL only for the same historical
-- support association; never let an UPDATE re-point a request item into
-- quarantine.
--
-- Apply only to the allowlisted Neon QA/Preview branches after checking the
-- exact branch ID. This migration changes a function only; it does not update
-- rows, roles, grants, RLS, or Production.

BEGIN;

DO $preflight$
DECLARE
  v_branch_id TEXT := current_setting('neon.branch_id', true);
BEGIN
  IF v_branch_id IS NULL
     OR v_branch_id NOT IN ('br-muddy-cell-au64infb', 'br-bold-block-aua43ua0') THEN
    RAISE EXCEPTION 'Quarantine reassignment fix refused on unexpected Neon branch: %', COALESCE(v_branch_id, 'unknown');
  END IF;

  IF current_database() <> 'neondb' THEN
    RAISE EXCEPTION 'Quarantine reassignment fix refused on unexpected database: %', current_database();
  END IF;

  IF to_regclass('public.mediakit_request_items') IS NULL
     OR to_regclass('public.supports') IS NULL
     OR to_regprocedure('public.enforce_mediakit_request_item_tenant()') IS NULL THEN
    RAISE EXCEPTION 'Quarantine reassignment fix preflight failed: expected schema/function is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.mediakit_request_items'::regclass
      AND tgname = 'mediakit_request_items_tenant_inheritance'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Quarantine reassignment fix preflight failed: enabled inheritance trigger is missing';
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
  -- Match status-transition lock order on INSERT: request header first, then
  -- support. UPDATE already holds the request-item row lock.
  IF TG_OP = 'INSERT' THEN
    PERFORM 1
    FROM public.mediakit_requests AS request
    WHERE request.request_id = NEW.request_id
    FOR KEY SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Request item references an unknown request: %', NEW.request_id
        USING ERRCODE = '23503',
              CONSTRAINT = 'fk_mediakit_request_items_request';
    END IF;
  END IF;

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
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'A quarantined support cannot be added to a new request: %', NEW.support_id
        USING ERRCODE = '23514',
              CONSTRAINT = 'mediakit_request_items_tenant_inheritance_check';
    END IF;

    IF NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'A quarantined support cannot receive a tenant-scoped request item: %', NEW.support_id
        USING ERRCODE = '23514',
              CONSTRAINT = 'mediakit_request_items_tenant_inheritance_check';
    END IF;

    -- NULL is grandfathered only while the historical support association
    -- remains exactly the same. A reassignment to any quarantined support is
    -- rejected, even though both tenant_id values are NULL.
    IF TG_OP = 'UPDATE'
       AND OLD.support_id IS DISTINCT FROM NEW.support_id THEN
      RAISE EXCEPTION 'A historical pending request item cannot be reassigned to a quarantined support: %', NEW.support_id
        USING ERRCODE = '23514',
              CONSTRAINT = 'mediakit_request_items_tenant_inheritance_check';
    END IF;

    RETURN NEW;
  END IF;

  -- Keep historical NULL ownership pending when the same support was assigned
  -- later. Explicit reconciliation may set the exact tenant; routine updates
  -- must not silently classify the historical request item.
  IF TG_OP = 'UPDATE'
     AND OLD.support_id = NEW.support_id
     AND OLD.tenant_id IS NULL
     AND NEW.tenant_id IS NULL THEN
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

COMMENT ON FUNCTION public.enforce_mediakit_request_item_tenant() IS
  'Inherits exact support ownership, rejects new and reassigned quarantined supports, and preserves historical NULL items only while their original support association remains unchanged.';

COMMIT;

-- Postflight: verify the function exists and the inheritance trigger remains enabled.
-- SELECT to_regprocedure('public.enforce_mediakit_request_item_tenant()');
-- SELECT tgname, tgenabled FROM pg_trigger
-- WHERE tgrelid='public.mediakit_request_items'::regclass
--   AND tgname='mediakit_request_items_tenant_inheritance'
--   AND NOT tgisinternal;
