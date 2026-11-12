# Ownership trigger — QA evidence

**Date:** 2026-11-12  
**Repository:** popnegro-org/grupo-comunicarte-refactoring  
**Candidate:** pmv-validation-candidate  
**Migration:** [20261112_request_item_tenant_inheritance.sql](./migrations/20261112_request_item_tenant_inheritance.sql)  
**Rollback test:** [20261112_request_item_tenant_inheritance.rollback.sql](./tests/20261112_request_item_tenant_inheritance.rollback.sql)  
**Corrective migration:** [20261112_reject_quarantine_support_reassignment.sql](./migrations/20261112_reject_quarantine_support_reassignment.sql)

## Scope and safety

The base migration was applied transactionally to the two explicitly allowlisted Neon branches. The corrective migration was subsequently applied transactionally to those same two branches only:

| Environment | Branch | Branch ID | Result |
|---|---|---|---|
| QA | qa/pr96-ownership-20261105 | br-bold-block-aua43ua0 | APPLIED |
| Preview | preview/pmv-validation-candidate | br-muddy-cell-au64infb | APPLIED |

Both migration preflights checked the exact Neon branch ID and database. The corrective migration also verified the existing table, function and enabled trigger. It replaces only the invoker-security trigger function; it does not update existing rows, change roles/grants, enable RLS, or alter Production.

**Neon Production br-wandering-sky-aunq6lad was not targeted or modified.**

## Corrective finding — 2026-11-12

A further adversarial review found an UPDATE path not covered by the original rollback test: a historical request item with `tenant_id IS NULL` could retain NULL while changing `support_id` from one quarantined support to another. The original trigger checked the new support's NULL tenant but did not require the historical support association to remain unchanged.

This means the original QA/Preview PASS evidence below remains valid only for the scenarios explicitly listed; it did **not** prove rejection of cross-support reassignment into quarantine. The candidate now contains a corrective migration and a regression assertion for this case.

**Current status of correction:** applied transactionally to Neon QA (`br-bold-block-aua43ua0`) and Preview (`br-muddy-cell-au64infb`). The expanded rollback-only test was executed successfully on both branches. Production was not targeted.

## Enforced behavior

1. On INSERT, the trigger locks the parent request first, then the support, matching the request-status lock order; a missing parent request is rejected.
2. New or updated request items referencing an assigned support inherit that support's exact tenant when omitted.
3. A mismatching tenant is rejected.
4. A new request item cannot reference a quarantined support, even when tenant_id is NULL.
5. A historical pending item may remain NULL on an explicit update even after its support is assigned later; it is not silently reclassified.
6. A missing support is rejected.
7. Clearing an item's tenant on an assigned support re-inherits the tenant.
8. An already assigned support cannot be reassigned to another tenant or cleared.
9. Historical request items whose tenant is already NULL remain pending until explicit reconciliation; the application gate must block commercial advancement.

This preserves the business rule that historical/pending request lines are not retroactively attributed.

## Rollback-only integration tests

The same single-statement PL/pgSQL test file was executed successfully on both QA and Preview. It creates temporary request items, asserts expected behavior, deletes those test rows, and uses a nested exception subtransaction to roll back a simulated support assignment. No test fixture remains.

| Scenario | QA | Preview |
|---|---|---|
| Assigned support + omitted tenant inherits | PASS | PASS |
| Assigned item tenant cleared → re-inherited | PASS | PASS |
| Mismatched tenant rejected | PASS | PASS |
| Missing parent request rejected | PASS | PASS |
| New request item + pending support + NULL tenant rejected | PASS | PASS |\n| Historical item reassignment to a different quarantined support rejected | PASS | PASS |
| Historical pending item UPDATE + NULL preserved after support assignment | PASS | PASS |
| Pending support + non-NULL tenant rejected | PASS | PASS |
| Missing support rejected | PASS | PASS |
| Assigned support ownership change rejected | PASS | PASS |
| Assigned support ownership clear rejected | PASS | PASS |
| Historical pending item UPDATE with NULL is preserved before support assignment | PASS | PASS |
| Historical pending item remains NULL after support assignment | PASS | PASS |
| Test mutations rolled back / cleaned | PASS | PASS |

The Neon SQL connector returned successful execution for the expanded rollback-only test on both branches, including the cross-support reassignment rejection assertion.

The expanded rollback-only test completed without exception on both QA and Preview after the corrective migration. Postflight confirms zero request-item orphan/mismatch rows, 46 supports per branch, 18 unassigned supports per branch, and two remaining historical NULL request items per branch. Current request-item counts are 43 in QA and 37 in Preview; Media Kit item counts are 9 and 4 respectively. These are current post-E2E snapshots, not immutable acceptance totals.

## Postflight — data unchanged and consistent

| Control | QA | Preview |
|---|---:|---:|
| Supports | 46 | 46 |
| Unassigned supports | 18 | 18 |
| Request items | 43 | 37 |
| Historical pending request items | 2 | 2 |
| Media Kit items | 9 | 4 |
| Pending Media Kit items | 0 | 0 |
| Enabled request-item inheritance trigger | 1 | 1 |
| Enabled support ownership immutability trigger | 1 | 1 |
| Request-item orphan/mismatch count | 0 | 0 |
| Media Kit item orphan/mismatch count | 0 | 0 |

Postflight also confirmed the exact branch ID in each database, both trigger functions present, the request-header-first lock (`FOR KEY SHARE`) in the INSERT path, and no test data persisted.

## Remaining scope\n\n- **P1 remains open:** apply the corrective migration only to QA and Preview after the migration is reviewed, then run the expanded rollback test and verify unchanged row counts. Production is excluded.

- The nullable historical request items (3 QA, 2 Preview) remain intentionally pending. Do not infer tenant ownership or auto-classify them.
- The privileged `neondb_owner` role retains `BYPASSRLS=true` and administrative privileges; it is not the Render QA/Preview runtime identity. Current runtime roles are `app_runtime_qa_login` and `app_runtime_preview`, both with `rolsuper=false`, `rolbypassrls=false`, `rolcreatedb=false`, and `rolcreaterole=false`. QA has 27 staged policies but no RLS-enabled tables; Preview has no policies and no RLS-enabled tables. Keep all staged policies inert; do not enable or delete them in this PMV.
- GitHub/Neon main branch protection remains unresolved due integration permissions and Neon plan limits.
- No Production migration, merge, or promotion was performed.
