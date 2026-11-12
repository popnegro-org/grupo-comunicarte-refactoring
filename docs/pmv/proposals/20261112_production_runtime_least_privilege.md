# Production runtime role remediation plan

Date: 2026-11-12  
Repository: `popnegro-org/grupo-comunicarte-refactoring`  
Candidate: `pmv-validation-candidate`  
Status: **PROPOSAL ONLY — NOT EXECUTED**

## Confirmed finding

The Vercel Production API uses the Neon Production role `neondb_owner` for application queries. PostgreSQL reports:

- `rolsuper = false`
- `rolbypassrls = true`
- `rolcreatedb = true`
- `rolcreaterole = true`
- `rolcanlogin = true`

This role is not appropriate for application runtime. The frontend is same-origin on Vercel; `VITE_API_URL` is not the remedy. Vercel's `/api/*` handler reads `DATABASE_URL`.

## Runtime contract found in candidate source

`src/db/index.ts` explicitly disables schema mutations during Vercel runtime and verifies the required schema for persistent runtime. Its current `REQUIRED_RUNTIME_TABLES` allowlist is:

- `supports`
- `support_locations`
- `support_faces`
- `support_technical`
- `support_pricing`
- `support_media`
- `support_routes`
- `mediakit_requests`
- `mediakit_request_items`
- `mediakits`
- `mediakit_items`
- `admin_login_attempts`

The application schema also defines `tenants`. This list is a bootstrap verification list, **not yet a complete privilege allowlist**. Before provisioning, enumerate every table, sequence, view, function and SQL path actually used by all enabled API routes, including legacy integrations. Do not infer permissions from this list alone.

## Proposed role properties

Create a dedicated login role `app_runtime_prod` in Neon Production with:

- LOGIN, no superuser, no database/role creation, no replication, no inheritance, no RLS bypass.
- No membership in `neondb_owner`, `cloud_admin`, or any privileged role.
- CONNECT to the application database and USAGE on `public`.
- Explicit table-level DML grants only for the verified runtime dependency inventory.
- Explicit USAGE/SELECT grants only on sequences actually used by those tables.
- No CREATE on database or schema; no TRUNCATE, REFERENCES, TRIGGER, ownership, or migration privileges.
- No automatic default grants to future tables; migrations must explicitly review and grant each new runtime dependency.

Do not enable RLS as part of this role migration. Current ownership is a commercial partitioning/quarantine mechanism, not yet a complete database authorization policy. Enabling RLS without policy design and route-specific tenant context could break service operations or create a false security boundary.

## Required staged rollout

1. Inventory actual SQL/table/sequence/function dependencies across every enabled API route and compare them to Production's live catalog.
2. Reproduce Production schema on an isolated Neon branch. Create a candidate role there with no elevated attributes and only explicit grants.
3. Run the full unit, integration, authenticated API, Media Kit, export, upload, login, and E2E suites using that role. Include negative checks: CREATE TABLE, CREATE ROLE, CREATE DATABASE, TRUNCATE, and ungranted table access must fail.
4. Run a least-privilege diagnostic using the candidate role: `current_user`, `session_user`, role flags, schema CREATE, database CREATE, and per-table SELECT/INSERT/UPDATE/DELETE counts. Confirm schema verification succeeds without DDL.
5. Prepare a rollback path using a separately controlled prior connection reference. Do not put credentials in GitHub, logs, PR comments, shell history, or this document.
6. Only after staging passes, request HUMAN GATE for the Production change window. The operator must enter the new credential directly into the Vercel Production `DATABASE_URL` secret field; never pass it through chat or source control.
7. Deploy/activate the connection change only with explicit approval. Verify Production health, read/write workflows, API ownership filtering, DB session identity, role flags and logs. Keep a documented rollback to the prior connection only for service recovery, then immediately disable the overprivileged credential after stable verification.
8. Revoke the old `neondb_owner` application credential from the app after successful cutover; do not drop the owner role or remove owner access needed for migrations/audits.

## Independent release blocker: ownership filter

Live Production currently returns `mza-trad-16` from `GET /api/supports/mza-trad-16` with `active=true`, `disponibilidad=disponible`, and `tenant_id=null`. Candidate code filters unassigned supports from public catalog and detail queries. This correction must be released and verified independently of the role cutover; do not conflate role creation with the data exposure fix.

## Execution boundary

No Production role, grant, secret, deployment, data, or Vercel setting was changed while preparing this proposal. This document is not executable SQL and does not authorize a Production change. The following require explicit HUMAN GATE:

- Creating the Production runtime role and granting privileges.
- Changing Vercel Production `DATABASE_URL`.
- Deploying the candidate ownership-filter correction to Production.
- Revoking the old Production application credential.

## Acceptance criteria

- Runtime identity is exactly `app_runtime_prod`.
- `rolsuper=false`, `rolbypassrls=false`, `rolcreatedb=false`, `rolcreaterole=false`, `rolcanlogin=true`.
- No privileged role memberships.
- No schema/database CREATE or table ownership; only verified object-level permissions.
- All supported API workflows pass against isolated Neon with the candidate role.
- Production API never returns an unassigned support in public catalog or detail endpoints.
- Production health, functional E2E, and session identity evidence are recorded after approved cutover.
