-- Rollback-only integration test for migration
-- docs/pmv/migrations/20261112_request_item_tenant_inheritance.sql
--
-- Run only after the migration has been applied to an isolated Neon QA branch.
-- This is one DO statement. Successful execution leaves no row or ownership
-- change behind: temporary request items are deleted and support assignment
-- propagation is tested inside a PL/pgSQL exception subtransaction that rolls
-- back before the outer DO block completes.
--
-- Expected: DO completes without exception. Any unexpected acceptance,
-- rejection, mismatch, or persistent test mutation raises an exception.

DO $test$
DECLARE
  v_request_id TEXT;
  v_assigned_support TEXT;
  v_assigned_tenant TEXT;
  v_other_tenant TEXT;
  v_pending_support TEXT;
  v_pending_request TEXT;
  v_inserted_id INTEGER;
  v_observed_tenant TEXT;
  v_remaining INTEGER;
BEGIN
  SELECT request_id
    INTO v_request_id
  FROM public.mediakit_requests
  ORDER BY id
  LIMIT 1;

  SELECT canonical_id, tenant_id
    INTO v_assigned_support, v_assigned_tenant
  FROM public.supports
  WHERE tenant_id IS NOT NULL
  ORDER BY canonical_id
  LIMIT 1;

  SELECT item.support_id, item.request_id
    INTO v_pending_support, v_pending_request
  FROM public.mediakit_request_items item
  JOIN public.supports support ON support.canonical_id=item.support_id
  WHERE item.tenant_id IS NULL
    AND support.tenant_id IS NULL
  ORDER BY item.id
  LIMIT 1;

  IF v_request_id IS NULL OR v_assigned_support IS NULL OR v_pending_support IS NULL THEN
    RAISE EXCEPTION 'Rollback test requires one request, one assigned support, and one pending support with a pending request item';
  END IF;

  v_other_tenant := CASE
    WHEN v_assigned_tenant = 'tenant-ba' THEN 'tenant-default'
    ELSE 'tenant-ba'
  END;

  -- Assigned support: tenant_id omitted must inherit exact source tenant.
  INSERT INTO public.mediakit_request_items (request_id, support_id)
  VALUES (v_request_id, v_assigned_support)
  RETURNING id, tenant_id INTO v_inserted_id, v_observed_tenant;

  IF v_observed_tenant IS DISTINCT FROM v_assigned_tenant THEN
    RAISE EXCEPTION 'Assigned support did not propagate tenant_id to request item';
  END IF;

  -- Clearing a child tenant on an assigned support must also re-inherit it.
  UPDATE public.mediakit_request_items
     SET tenant_id=NULL
   WHERE id=v_inserted_id
  RETURNING tenant_id INTO v_observed_tenant;

  IF v_observed_tenant IS DISTINCT FROM v_assigned_tenant THEN
    RAISE EXCEPTION 'Request item update bypassed tenant inheritance';
  END IF;

  DELETE FROM public.mediakit_request_items WHERE id=v_inserted_id;

  -- Assigned support: a spoofed/mismatching tenant must be rejected.
  BEGIN
    INSERT INTO public.mediakit_request_items (request_id, support_id, tenant_id)
    VALUES (v_request_id, v_assigned_support, v_other_tenant);
    RAISE EXCEPTION 'Mismatched tenant was unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- A new request item cannot reference a pending support, even with NULL tenant.
  BEGIN
    INSERT INTO public.mediakit_request_items (request_id, support_id, tenant_id)
    VALUES (v_pending_request, v_pending_support, NULL);
    RAISE EXCEPTION 'A quarantined support was unexpectedly accepted in a new request';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- A historical pending item may remain NULL when explicitly updated; it is
  -- not auto-classified while its source support remains quarantined.
  UPDATE public.mediakit_request_items
     SET tenant_id=NULL
   WHERE id=(
     SELECT item.id
     FROM public.mediakit_request_items item
     WHERE item.request_id=v_pending_request
       AND item.support_id=v_pending_support
       AND item.tenant_id IS NULL
     ORDER BY item.id
     LIMIT 1
   )
  RETURNING tenant_id INTO v_observed_tenant;

  IF v_observed_tenant IS NOT NULL THEN
    RAISE EXCEPTION 'Historical pending request item unexpectedly acquired tenant ownership';
  END IF;

  -- A caller cannot attach a tenant before the support is assigned.
  BEGIN
    INSERT INTO public.mediakit_request_items (request_id, support_id, tenant_id)
    VALUES (v_pending_request, v_pending_support, v_assigned_tenant);
    RAISE EXCEPTION 'Tenant was unexpectedly accepted for a pending support';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- Missing support must be rejected by the trigger itself, not only by a nullable composite FK.
  BEGIN
    INSERT INTO public.mediakit_request_items (request_id, support_id, tenant_id)
    VALUES (v_request_id, '__qa_missing_support__', NULL);
    RAISE EXCEPTION 'Unknown support was unexpectedly accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  -- Once assigned, support ownership cannot be changed or cleared.
  BEGIN
    UPDATE public.supports
       SET tenant_id=v_other_tenant
     WHERE canonical_id=v_assigned_support;
    RAISE EXCEPTION 'Assigned support ownership was unexpectedly mutable';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE public.supports
       SET tenant_id=NULL
     WHERE canonical_id=v_assigned_support;
    RAISE EXCEPTION 'Assigned support ownership was unexpectedly clearable';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- Assigning a pending support must not retroactively classify historical
  -- request items. They remain NULL/quarantined until explicitly reconciled.
  BEGIN
    UPDATE public.supports
       SET tenant_id=v_assigned_tenant,
           tenant_ownership_evidence='__qa_rollback_test__',
           tenant_ownership_assigned_by='__qa_rollback_test__',
           tenant_ownership_assigned_at=clock_timestamp()
     WHERE canonical_id=v_pending_support;

    SELECT tenant_id
      INTO v_observed_tenant
    FROM public.mediakit_request_items
    WHERE support_id=v_pending_support
      AND request_id=v_pending_request
    ORDER BY id
    LIMIT 1;

    IF v_observed_tenant IS NOT NULL THEN
      RAISE EXCEPTION 'Historical pending request item was unexpectedly reclassified';
    END IF;

    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='__ROLLBACK_EXPECTED__';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> '__ROLLBACK_EXPECTED__' THEN
      RAISE;
    END IF;
  END;

  SELECT tenant_id INTO v_observed_tenant
  FROM public.supports
  WHERE canonical_id=v_pending_support;

  SELECT count(*) INTO v_remaining
  FROM public.mediakit_request_items
  WHERE support_id=v_pending_support
    AND request_id=v_pending_request
    AND tenant_id IS NULL;

  IF v_observed_tenant IS NOT NULL OR v_remaining < 1 THEN
    RAISE EXCEPTION 'Rollback test leaked support or request-item mutations';
  END IF;

  RAISE NOTICE 'PASS: request-item tenant inheritance, quarantine, mismatch rejection, support immutability, and historical pending preservation all passed; no test data persisted.';
END
$test$;
