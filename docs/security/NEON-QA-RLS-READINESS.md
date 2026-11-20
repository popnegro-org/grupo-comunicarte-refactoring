# Neon QA — PostgreSQL roles and RLS readiness

> **Addendum runtime (2026-11-12):** las 27 políticas descritas aquí son staged/inertes: QA tiene 0 tablas con RLS habilitado; Preview tiene 0 políticas y 0 tablas con RLS. El rol `app_runtime_qa` mencionado en el análisis es el rol NOLOGIN de staging; el runtime Render QA usa `app_runtime_qa_login`. Preview usa `app_runtime_preview`. Ambos roles runtime tienen `BYPASSRLS=false`. Mantener las políticas staged sin activar ni eliminar; ver [PROJECT-CONTROL.md](../pmv/PROJECT-CONTROL.md).


**Date:** 2026-11-11  
**Scope:** Neon project `grupocomunicarte-serverless`, QA branch `qa/pr96-ownership-20261105`  
**Branch ID:** `br-bold-block-aua43ua0`  
**Application ref inspected:** `pmv-validation-candidate`  
**Production:** not modified.

## Executive decision

**RLS must remain disabled in QA.** The current PMV contract deliberately retains one authenticated global administrator; `tenant_id` is operational/commercial ownership, not per-user authorization. The database role and policy definitions are staged drafts only and are not a working application security boundary. The policy set must not be activated or treated as an implementation of the current PMV access model.

The current backend still uses one configured `ADMIN_USER/ADMIN_PASSWORD` principal. `resolveExistingSingleAdminAccess()` explicitly resolves that principal as a global administrator. The request handlers use the shared `pool` and Drizzle database client; the inspected code does not establish `app.tenant_id` transaction-locally before database operations. The public inventory route also reads the combined catalog, which cannot be preserved by a tenant-only policy on `supports` without a separate public-read design.

Enabling the prepared policies now would therefore either break existing app queries (no tenant context) or leave the application running as the table owner, bypassing RLS.

## Verified QA database state

- 37 public tables exist on QA.
- `supports`: 46 rows; 10 assigned to `tenant-ba`, 18 assigned to `tenant-default`, and 18 with `tenant_id IS NULL`.
- The 18 unassigned supports are quarantined and must not be inferred into a tenant by city.
- `tenants` contains `tenant-ba` and `tenant-default`.
- `users` contains 2 rows; `user_roles` contains 0 rows.
- QA has `integration_outbox`; this table is not present on the previously inspected main and preview branches.

## Role staged on QA

Role: `app_runtime_qa`

Verified attributes:
- NOLOGIN
- NOSUPERUSER
- NOCREATEDB
- NOCREATEROLE
- NOBYPASSRLS
- no membership in `neon_superuser`
- no table or sequence grants
- no application connection has been issued or installed

This is currently a non-login role, not an application credential. The Neon SQL connector also rejected `SET ROLE app_runtime_qa`; a runtime test must use an actual login credential and a supported connection path.

## Policy definitions staged on QA

27 policies named `tenant_scope_app_runtime_qa` exist for:

`campaign_screens`, `campaigns`, `clientes`, `google_credentials`, `leads`, `media`, `media_kit_comments`, `media_kit_screens`, `mediakit_items`, `mediakit_request_items`, `mediakit_requests`, `mediakits`, `metrics`, `screen_tags`, `screens`, `support_faces`, `support_locations`, `support_media`, `support_pricing`, `support_routes`, `support_technical`, `supports`, `sync_errors`, `sync_history`, `tenants`, `user_roles`, and `users`.

They use `current_setting('app.tenant_id', true)` and fail closed when the setting is absent. Related tables use EXISTS checks against their owning tenant-aware record.

**Important:** these policies are staged definitions only. They have not been validated under the runtime role, and RLS is disabled on all 37 public tables. No table grants were left in place. Do not enable RLS or grant the role broad access based only on policy existence.

## Architecture blockers found in the candidate application

1. **Single global administrator is intentional for this PMV:** `docs/pmv/tenant-isolation-implementation.md` explicitly requires retaining the existing `ADMIN_USER/ADMIN_PASSWORD` principal and forbids creating users, invitations or mandatory memberships. This is not an unresolved implementation defect for the current PMV.
2. **No tenant transaction context:** shared pool/Drizzle calls do not consistently wrap work in a transaction that first applies a trusted server-derived tenant with `SET LOCAL app.tenant_id`.
3. **Public catalog needs a separate access model:** `GET /api/supports` reads the combined assigned catalog. A tenant-only policy would return no rows without context and would not implement the intended public catalogue contract.
4. **Cross-tenant commercial records:** `mediakit_requests` has no direct tenant column; its scope is derived from child items. Mixed-tenant requests are explicitly global in the domain model. Policy semantics must preserve this without leaking unrelated child data.
5. **Legacy/auxiliary tables:** `categories`, `cities`, `locations`, `tags`, `roles`, `permissions`, `role_permissions`, `changelogs`, `admin_login_attempts`, and `integration_outbox` require explicit classification (global reference data, privileged operational data, or tenant-owned data) before runtime grants.
6. **Policy dependency grants:** EXISTS-based policies query parent tables. The runtime role will need narrowly scoped privileges on those referenced relations as well as on its target tables. Those grants have not been applied.

## Correct continuation for the current PMV contract

The current contract is intentionally single-admin/global. Do **not** create tenant users, memberships, invitations or a tenant-scoped login flow as part of this PMV. Do not derive `app.tenant_id` from a request header/body, and do not set a tenant context merely to make the staged policies appear usable.

The existing PMV isolation controls are domain-level ownership and quarantine controls: explicit ownership evidence, fail-closed selection, stable transactional locks, item/support ownership consistency, and rejection of pending ownership for commercial transitions. Their remaining acceptance work is the real Preview transaction matrix and authenticated Media Kit QA documented in `docs/pmv/QA-OWNERSHIP-REVALIDATION-PREVIEW.md` and `docs/pmv/HUMAN_GATE_VALIDATION.md`.

The 27 staged RLS policies are **not compatible evidence of an active security boundary** for this single-global-admin contract. A future RLS initiative needs a separately approved authorization design that preserves global administrator operations, the public combined catalogue, mixed Media Kit requests, reference data and operational tables. Only after that design is approved should a dedicated LOGIN role, exact grants, transaction-local context and runtime tests be implemented. Do not enable RLS or FORCE RLS as part of the current continuation.

For this PMV, continue with:
1. Fix the current candidate's CI/Visual QA harness and authenticated Preview/QA failures without weakening acceptance criteria.
2. Run the ownership transaction matrix and Media Kit persistence/recovery checks against the isolated QA deployment, recording request IDs and HTTP outcomes.
3. Keep the staged role/policies inert and retain the existing global admin.
4. Keep `main`, Neon Production, and production service configuration unchanged until the separate Human Gate.

## Rollback / safety

- No data was changed by this work.
- No RLS enablement or FORCE RLS was applied.
- No runtime credential was created or installed.
- Do not drop the staged policies or role automatically until the migration owner has reviewed their exact names and dependencies.
- If a later QA activation causes failures, first disable RLS on the exact QA tables in the same controlled migration; do not alter production.

## Current acceptance status

| Criterion | Status |
|---|---|
| Dedicated non-BYPASSRLS QA role exists | PASS (NOLOGIN staging role only) |
| Policy definitions exist for identified tenant tables | PASS (staged, not runtime-validated) |
| All QA public tables classified | BLOCKED |
| Current PMV uses the documented single global administrator | PASS (intentional contract) |
| Tenant-scoped transaction context | NOT IN CURRENT PMV SCOPE |
| Runtime LOGIN role and grants validated | BLOCKED |
| Domain-level ownership/quarantine transaction tests | BLOCKED (Preview QA evidence pending) |
| RLS enabled on QA | INTENTIONALLY NOT ENABLED |
| Production untouched | PASS |

**Conclusion:** do not connect `app_runtime_qa` to Render/Vercel and do not enable RLS yet. The next safe code change is the transaction-scoped tenant context and authenticated membership integration, not a database-wide RLS switch.


## Contract alignment note — 2026-11-11

The PMV architecture decision in `docs/pmv/tenant-isolation-implementation.md` supersedes the earlier assumption that tenant membership must be implemented before PMV release. The only current authenticated principal is intentionally global. `users`/`user_roles` rows are not to be invented or populated to satisfy a future multi-user design. The staged policies and `app_runtime_qa` role remain inert QA artifacts; no RLS, FORCE RLS, grants or runtime credentials were applied by this alignment.
