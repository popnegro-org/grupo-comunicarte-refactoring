# Ownership trigger — QA evidence

**Date:** 2026-11-12  
**Repository:** popnegro-org/grupo-comunicarte-refactoring  
**Candidate:** pmv-validation-candidate  
**Migration:** [20261112_request_item_tenant_inheritance.sql](./migrations/20261112_request_item_tenant_inheritance.sql)  
**Rollback test:** [20261112_request_item_tenant_inheritance.rollback.sql](./tests/20261112_request_item_tenant_inheritance.rollback.sql)

## Scope and safety

The migration was applied transactionally to the two explicitly allowlisted Neon branches only:

| Environment | Branch | Branch ID | Result |
|---|---|---|---|
| QA | qa/pr96-ownership-20261105 | br-bold-block-aua43ua0 | APPLIED |
| Preview | preview/pmv-validation-candidate | br-muddy-cell-au64infb | APPLIED |

The migration preflight checked the Neon branch ID, database name, required tables/columns, tenant existence, and orphan/mismatch counts. It was run through a single transaction per branch. The migration adds two triggers and two invoker-security functions; it does not update existing rows, change roles/grants, enable RLS, or alter Production.

**Neon Production br-wandering-sky-aunq6lad was not targeted or modified.**

## Enforced behavior

1. New or updated request items referencing an assigned support inherit that support's exact tenant when omitted.
2. A mismatching tenant is rejected.
3. A request item cannot assign a tenant to a quarantined support.
4. A missing support is rejected.
5. Clearing an item's tenant on an assigned support re-inherits the tenant.
6. An already assigned support cannot be reassigned to another tenant or cleared.
7. Historical request items whose tenant is already NULL remain pending, even if their support is assigned later. They are not silently reclassified; the existing application gate must continue to block commercial advancement until explicit reconciliation.

This preserves the business rule that historical/pending request lines are not retroactively attributed.

## Rollback-only integration tests

The same single-statement PL/pgSQL test file was executed successfully on both QA and Preview. It creates temporary request items, asserts expected behavior, deletes those test rows, and uses a nested exception subtransaction to roll back a simulated support assignment. No test fixture remains.

| Scenario | QA | Preview |
|---|---|---|
| Assigned support + omitted tenant inherits | PASS | PASS |
| Assigned item tenant cleared → re-inherited | PASS | PASS |
| Mismatched tenant rejected | PASS | PASS |
| Pending support + NULL remains pending | PASS | PASS |
| Pending support + non-NULL tenant rejected | PASS | PASS |
| Missing support rejected | PASS | PASS |
| Assigned support ownership change rejected | PASS | PASS |
| Assigned support ownership clear rejected | PASS | PASS |
| Historical pending item remains NULL after support assignment attempt | PASS | PASS |
| Test mutations rolled back / cleaned | PASS | PASS |

The Neon SQL connector returned successful execution for both test statements with no exception.

## Postflight — data unchanged and consistent

| Control | QA | Preview |
|---|---:|---:|
| Supports | 46 | 46 |
| Unassigned supports | 18 | 18 |
| Request items | 44 | 34 |
| Historical pending request items | 3 | 2 |
| Media Kit items | 9 | 3 |
| Pending Media Kit items | 0 | 0 |
| Enabled request-item inheritance trigger | 1 | 1 |
| Enabled support ownership immutability trigger | 1 | 1 |
| Request-item orphan/mismatch count | 0 | 0 |
| Media Kit item orphan/mismatch count | 0 | 0 |

Postflight also confirmed the exact branch ID in each database, both trigger functions present, and no test data persisted.

## Remaining scope

- The nullable historical request items (3 QA, 2 Preview) remain intentionally pending. Do not infer tenant ownership or auto-classify them.
- The privileged runtime identity (neondb_owner, BYPASSRLS=true) remains a separate security debt; this migration does not attempt role or grant changes.
- GitHub/Neon main branch protection remains unresolved due integration permissions and Neon plan limits.
- No Production migration, merge, or promotion was performed.
