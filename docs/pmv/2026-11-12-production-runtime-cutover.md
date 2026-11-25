# Vercel Production runtime identity cutover

Date: 2026-11-12 (UTC)  
Authorization: `HUMAN GATE: AUTORIZO MIGRACIÓN VERCEL PRODUCTION A app_runtime_prod`  
Vercel project: `grupo-comunicarte-refactoring` (`prj_LocmTWT0E6LyQ2p0dtGRsUmDj54m`)  
Neon project: `mute-math-07036388`  
Neon Production branch: `br-wandering-sky-aunq6lad`

## Result

**CUTOVER COMPLETED — Vercel Production now connects as `app_runtime_prod`.**

- New Neon login role: `app_runtime_prod`.
- New Production deployment: `dpl_2niRf3aieFh7nVxVfAiQU9myGpbt`.
- Deployment URL: `https://grupo-comunicarte-refactoring-q2e0224s4-popnegros-projects.vercel.app`.
- Production commit preserved: `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70` on `main`; no application source code was promoted in this cutover.
- Vercel custom aliases attached to the new READY deployment: `www.grupocomunicarte.com.ar` and `grupocomunicarte.com.ar`.

## Neon role security properties

Verified from `pg_roles` after provisioning:

| Attribute | Value |
|---|---:|
| LOGIN | true |
| SUPERUSER | false |
| INHERIT | false |
| CREATEROLE | false |
| CREATEDB | false |
| REPLICATION | false |
| BYPASSRLS | false |
| Database CREATE | false |
| Schema `public` CREATE | false |

The runtime role has no membership in an elevated role. Neon records the reverse membership `neondb_owner -> app_runtime_prod` with admin option; this does not grant `app_runtime_prod` membership in `neondb_owner`. The runtime role is `NOINHERIT`.

The initial Neon role provisioning grants were narrowed before cutover. All table and sequence privileges were revoked and then only the route dependency grants below were reapplied. Default privileges for future tables and sequences owned by `neondb_owner` were explicitly revoked from `app_runtime_prod`.

## Explicit table grants

| Table | Granted privileges |
|---|---|
| `supports` | SELECT, INSERT, UPDATE |
| `support_locations`, `support_faces`, `support_technical`, `support_pricing`, `support_media`, `support_routes` | SELECT, INSERT, UPDATE, DELETE |
| `tenants` | SELECT |
| `mediakit_requests`, `mediakits` | SELECT, INSERT, UPDATE |
| `mediakit_request_items`, `clientes` | SELECT, INSERT |
| `mediakit_items` | SELECT, INSERT, DELETE |
| `admin_login_attempts` | SELECT, INSERT, UPDATE |

Sequence privileges (USAGE, SELECT) are limited to:
- `supports_id_seq`
- `support_faces_id_seq`
- `support_media_id_seq`
- `mediakit_items_id_seq`
- `mediakit_request_items_id_seq`
- `mediakit_requests_id_seq`

Postflight across 37 public base tables:
- 14 tables have SELECT.
- 13 tables have INSERT.
- 10 tables have UPDATE.
- 7 tables have DELETE.
- 0 tables have TRUNCATE.
- Unrelated legacy tables have no table privileges for this runtime role.
- No default table/sequence ACL entry remains for `app_runtime_prod`.

The runtime role successfully executed read queries as `current_user=app_runtime_prod` against `supports`, `support_pricing` and `mediakits`.

## Vercel environment separation

The application source reads `process.env.DATABASE_URL` in `src/db/index.ts`. The Vercel environment was split without replacing Preview credentials:

- New variable ID `ckDAphjTKktCRRhy`: `DATABASE_URL`, target **Production only**, sensitive, Neon Production connection for `app_runtime_prod`.
- Existing variable ID `KryEkjCe4W82D97e`: retained with its previous value, target changed to **Preview only**.
- Branch-specific Preview `DATABASE_URL` entries were preserved.
- No `VITE_API_URL`, `GC_*` integration-store variable, Render setting, or source secret was changed.

Credential values are intentionally not recorded in Git, logs, PR text, or this document.

## Deployment and runtime verification

Vercel deployment:
- State: **READY**.
- Target: Production.
- Commit: unchanged `main` SHA `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70`.
- Runtime: Node.js 24, region iad1.

HTTP smoke checks against the custom domain:
- `GET /api/health`: **200**, `{"status":"ok","database":"connected"}`.
- `GET /api/supports`: **200**, 29 records.
- Neon `pg_stat_activity` after new deployment requests: Vercel sessions present as `app_runtime_prod` (PgBouncer), including sessions started after the cutover.
- Vercel runtime errors in the first 10 minutes after cutover: **none found**.
- Existing warnings: Vite CJS Node API deprecation; no database connection or permission errors.

## Independent unresolved Production release blocker

The role migration does **not** resolve the existing ownership publication defect:
- `GET /api/supports/mza-trad-16` still returns **HTTP 200**.
- The support remains active and marked available while its `tenant_id` is NULL.
- This is a previously identified public exposure; this migration did not alter support data or API code.
- Release remains **NO-GO** until the candidate ownership filter is deployed and verified on Production.

## Change boundary

Executed:
- Created the dedicated Production login role.
- Narrowed its table, sequence, schema and database permissions.
- Removed automatic default grants for future tables/sequences.
- Split the Vercel `DATABASE_URL` environment targets.
- Created a new Production deployment on the exact existing `main` commit.
- Performed read-only HTTP and database postflight checks.

Not executed:
- No application data INSERT/UPDATE/DELETE.
- No schema migration, RLS change, trigger change, or ownership reassignment.
- No revocation/deletion of `neondb_owner`; it remains available for controlled migrations and recovery.
- No Preview runtime migration.
- No Render configuration change.
- No merge of PR #90.

The old `neondb_owner` application credential is retained in the Preview-only Vercel environment variable for compatibility/rollback of Preview deployments. Production no longer uses that variable.
