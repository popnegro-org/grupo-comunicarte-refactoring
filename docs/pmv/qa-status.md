# PMV candidate QA status

**Candidate:** `pmv-validation-candidate`  
**Documentation verified:** 2026-11-01  
**Code commit used for automated QA:** `e72686373327637a9e750be9313aeb8d9073f3da`  
**Main:** unchanged. No merge or production deployment performed.

## Automated verification

| Check | Result | Evidence |
|---|---|---|
| TypeScript / current `npm run lint` script | PASS | CI Candidate run [41278596901](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41278596901), Typecheck step |
| Unit tests | PASS | CI Candidate run [41278596901](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41278596901), Unit tests step |
| Build | PASS | CI Candidate run [41278596901](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41278596901), Build step |
| Production dependency audit | PASS | CI Candidate run [41278596901](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41278596901), `npm audit --omit=dev --audit-level=high` |
| Playwright functional + visual suite | PASS | Visual QA run [41278596909](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41278596909): 28 tests, 26 passed, 2 skipped (22.1s) |
| Visual baseline regression | PASS | Same Visual QA run; restored trusted candidate baseline from `27604cf...`, Playwright passed and new baseline cached for `e726863...` |
| Vercel Preview / Neon runtime integration | BLOCKED | Vercel deployment listing for `grupocomunicate-serverless` candidate branch returned zero deployments; previous Git status reported `build-rate-limit`. No deployed candidate runtime available. |

The repository's `lint` script currently runs TypeScript checking (`tsc --noEmit`); a separate ESLint configuration/script is not present. Do not describe this as an independent ESLint pass.

Playwright runs against the CI Vite preview with mocked API responses. It validates browser flows and visual snapshots, but it does not replace a deployed API/Neon integration test. The two skipped Playwright cases remain visible in the run summary and must not be silently counted as passed.

## Implemented hardening

- Admin password equality uses `crypto.timingSafeEqual`.
- Login rate-limit IP derives from Express `req.ip`; only one Vercel ingress hop is trusted.
- Multimedia uploads verify binary signatures against the declared MIME type.
- Media Kit API rejects invalid/negative amounts, unapproved currencies and prices for unselected supports.
- Client PDF/PPT exports omit internal support pricing; an unset global amount remains unset rather than being derived from internal catalog prices.
- Admin-only bulk pricing endpoint feeds the quote UI without exposing pricing through public inventory endpoints.
- Media Kit request validation resolves selected supports from one catalog read rather than N+1 detail queries.

## Remaining blockers

1. **Tenant isolation:** see [tenant-isolation-blocker.md](./tenant-isolation-blocker.md). The server has no tenant context or tenant predicates for support/request operations; key tables have RLS disabled. Three existing requests contain supports from both tenants, and ten inactive supports have no city. No ownership backfill or production schema changes were made.
2. **Distributed login rate limiting:** the current attempt counter remains process-local in a Vercel serverless environment. Trusted proxy IP extraction is fixed, but the limiter is not shared across instances.
3. **Vercel Preview:** deployment is blocked by the team's build rate limit. Runtime API checks against a candidate deployment cannot be completed until Vercel permits a Preview build.
4. **Independent lint:** ESLint is not configured; current CI `npm run lint` performs TypeScript checking but does not run a separate lint engine.
5. **Bundle size:** the production build still emits the existing warning for a JavaScript chunk above 500 kB; splitting/lazy-loading should be addressed before performance sign-off.

## Release gate

Do not declare the PMV complete or merge to `main` until tenant ownership rules are confirmed, tenant isolation is implemented and tested, distributed rate limiting is addressed, and the candidate is verified against a Vercel Preview with Neon integration. Production data and `main` remain untouched.

## PR consolidation

- PR #85 and PR #88 remain open Draft PRs and are mergeable against their original feature bases.
- PR #86 and PR #87 remain open Draft PRs and are non-mergeable against their original feature bases.
- Their selected UI, Media Kit delivery/export, inventory accessibility, and responsive request-table changes have been ported into `pmv-validation-candidate`.
- Do not merge #85–#88 independently. The intended release artifact remains one final PR from the candidate to `main`, after the blockers above are resolved.

## QA addendum — filter pipeline coverage (2026-11-01)

**Latest implementation commit:** `a03fc20c4368595ff5191dde263800cf47f8df58`

The administrative support-list filter pipeline was extracted as the pure function `filterAndSortSupports()` in `src/hooks/useSupportListFilters.ts`. The React hook delegates to this function, preserving the existing filter semantics. Added `tests/unit/support-list-filters.test.ts` covering neutral filters, trimmed/case-insensitive search, AND composition, active/archive behavior, price sorting and input immutability.

- CI Candidate [run 41279271866](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41279271866): **PASS** — production dependency audit (0 vulnerabilities), TypeScript, unit tests and build.
- Unit suite: **19 passed, 0 failed** on the successful run. An initial test expectation was corrected to match the documented alphabetical sort order; the corrected suite passed.
- Visual QA [run 41279271863](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41279271863): last observed still executing the trusted-baseline Playwright comparison. Do not infer a result until the workflow completes.

This addendum documents the implementation evidence; it does not change the tenant isolation, distributed rate-limit, or Vercel Preview release blockers above.

## QA addendum — tenant isolation foundation (2026-11-01)

Decisions confirmed: preserve the one existing admin/login; that authenticated admin operates both tenants; global commercial requests are allowed; supports without city remain quarantined. Individual-user memberships are future compatibility only, not a prerequisite for the current account.

- Added fail-closed authorization primitives in `src/server/tenantAccess.ts`, including a single-admin compatibility resolver that must only be called from backend-authenticated `requireAdmin` context.
- Added six unit tests for missing identity, inactive membership, client tenant spoofing, multi-membership selection, global-admin scope, single-admin compatibility and pending ownership.
- Added proposed additive SQL migration `db/migrations/20261101_001_tenant_foundation.sql`; it is versioned only and has **not** been executed. User/membership tables are future optional infrastructure.
- Added implementation and activation plan in `docs/pmv/tenant-isolation-implementation.md`.
- `npm ci`: PASS, 0 reported vulnerabilities.
- `npm run lint` (TypeScript): PASS.
- `npm run test:unit`: PASS, 25/25.
- `npm run build`: PASS; existing >500 kB JS chunk warning remains.
- Visual QA GitHub Actions run [41349229900](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41349229900): **PASS**. Build, preview server, trusted-baseline comparison and baseline save completed successfully. The report upload also completed and the workflow concluded successfully. The local ephemeral runner lacked Chromium, but the canonical CI visual workflow ran successfully.

**Runtime audit finding (P0):** `requireAdmin` verifies the shared admin token but has no tenant context. All `/api/admin/supports`, `/api/admin/support-pricing`, `/api/admin/mediakits`, and `/api/admin/requests` routes currently operate across the full dataset. `supports` has no persisted tenant ownership field in the runtime schema; city-based dashboard grouping is not a valid ownership control. The single administrator can continue operating both tenants, but effective tenant isolation and ownership-safe cross-tenant reporting are not implemented. Do not pretend this foundation enforces isolation.

**Remaining activation work:** introduce verified support/operation ownership without guessing; keep the ten supports without city pending; model global requests as a parent with tenant-scoped child items; audit and scope each endpoint and export; test tenant boundary behavior; then run migration only after isolated staging validation. Distributed rate limiting, Vercel Preview/Neon runtime validation, independent ESLint and bundle splitting remain separate release blockers listed above. No SQL was run; no production data, deployment, or `main` was changed.
