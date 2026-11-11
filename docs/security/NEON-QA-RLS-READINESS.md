# Neon QA — PostgreSQL roles and RLS readiness

**Date:** 2026-11-11  
**Scope:** Neon project `grupocomunicarte-serverless`, QA branch `qa/pr96-ownership-20261105`  
**Branch ID:** `br-bold-block-aua43ua0`  
**Application ref inspected:** `pmv-validation-candidate`  
**Production:** not modified.

## Executive decision

**RLS must remain disabled in QA until the backend is tenant-context aware and runs through a dedicated runtime login.** The database role and policy definitions are staged, but they are not a working application security boundary yet.

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

1. **No authenticated tenant identity:** the current admin login is one environment-backed principal. It is deliberately mapped to global-admin compatibility mode, not to a persisted user membership.
2. **No tenant transaction context:** shared pool/Drizzle calls do not consistently wrap work in a transaction that first applies a trusted server-derived tenant with `SET LOCAL app.tenant_id`.
3. **Public catalog needs a separate access model:** `GET /api/supports` reads the combined assigned catalog. A tenant-only policy would return no rows without context and would not implement the intended public catalogue contract.
4. **Cross-tenant commercial records:** `mediakit_requests` has no direct tenant column; its scope is derived from child items. Mixed-tenant requests are explicitly global in the domain model. Policy semantics must preserve this without leaking unrelated child data.
5. **Legacy/auxiliary tables:** `categories`, `cities`, `locations`, `tags`, `roles`, `permissions`, `role_permissions`, `changelogs`, `admin_login_attempts`, and `integration_outbox` require explicit classification (global reference data, privileged operational data, or tenant-owned data) before runtime grants.
6. **Policy dependency grants:** EXISTS-based policies query parent tables. The runtime role will need narrowly scoped privileges on those referenced relations as well as on its target tables. Those grants have not been applied.

## Required implementation sequence

1. Introduce a verified server-side identity/membership resolver. Do not accept a tenant ID as authority from request payloads or headers.
2. Add a transaction helper that checks out one pool client, begins a transaction, applies the resolved tenant using parameterized `set_config('app.tenant_id', $1, true)`, executes every query in that transaction, and commits/rolls back safely.
3. Refactor all tenant-owned read/write paths to use that helper. Explicitly separate global-admin operations and public catalogue reads from tenant runtime operations.
4. Decide and document policies for global/mixed requests, reference data, audit, rate-limit and outbox tables.
5. Create a LOGIN runtime role with no elevated attributes, limited to the exact database/schema and the required table/sequence privileges. Do not use the database owner credential for application runtime.
6. Test under that actual role: no tenant context returns no tenant rows; tenant A cannot read/write tenant B; tenant B cannot read/write tenant A; NULL ownership stays invisible; cross-tenant request behavior matches the domain contract; public catalogue remains correct; sequence-backed inserts work.
7. Only after those tests pass, enable RLS on QA tables in a controlled migration, then consider FORCE RLS where the ownership model supports it.
8. Validate login, inventory, support CRUD, Media Kit create/read/update, outbox, health, build, unit tests and deployment E2E on QA.
9. Keep production and `main` unchanged until the separate Human Gate.

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
| App derives trusted tenant identity | BLOCKED |
| Tenant context set transaction-locally | BLOCKED |
| Runtime LOGIN role and grants validated | BLOCKED |
| Cross-tenant negative tests under runtime role | BLOCKED |
| RLS enabled on QA | INTENTIONALLY NOT ENABLED |
| Production untouched | PASS |

**Conclusion:** do not connect `app_runtime_qa` to Render/Vercel and do not enable RLS yet. The next safe code change is the transaction-scoped tenant context and authenticated membership integration, not a database-wide RLS switch.
