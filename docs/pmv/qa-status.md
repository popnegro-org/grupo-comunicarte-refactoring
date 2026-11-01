# PMV candidate QA status

**Candidate:** `pmv-validation-candidate`  
**Verified source commit:** `27604cf15e81edb82c06fbe7ad3b5ebb5745c935`  
**Current candidate head:** `9ad5c58cb2540de5aeb25ec0d286217c0a7ef08e` (includes CI-generated patched `package-lock.json`)  
**Main:** unchanged. No merge or production deployment performed.

## Automated verification

| Check | Result | Evidence |
|---|---|---|
| TypeScript / current `npm run lint` script | PASS | CI Candidate `41274545834`, Typecheck step |
| Unit tests | PASS | CI Candidate `41274545834`, Unit tests step |
| Build | PASS | CI Candidate `41274545834`, Build step |
| Playwright functional + visual suite | PASS | Visual QA `41274545831`: 28 tests, 26 passed, 2 skipped (21.7s) |
| Visual baseline comparison | PASS | Compared against cached candidate baseline `e0ad60ceea5c4a5a84d2a1443815f93803e80408`; saved baseline for `27604cf15e81edb82c06fbe7ad3b5ebb5745c935` |
| Production dependency audit | PASS | `npm audit --omit=dev --audit-level=high`: 0 production vulnerabilities |\n| Vercel Preview | BLOCKED | GitHub commit status for current head reports Vercel failure with `build-rate-limit`; no candidate Preview available for runtime/Neon integration QA |

The repository's `lint` script currently runs TypeScript checking (`tsc --noEmit`); a separate ESLint configuration/script is not present. Do not describe this as an independent ESLint pass.

Playwright tests run against the CI Vite preview with mocked API responses. The CI job tests source commit `27604cf...`; the subsequent bot commit `9ad5c58...` only persists the generated lockfile from that same successful audited build. The two skipped Playwright cases are explicitly reported by the test runner. They validate browser flows, layout and export behavior, but do not replace a deployed API/Neon integration test.

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
3. **Vercel Preview:** deployment is blocked by the team's build rate limit. Runtime API checks against the candidate deployment cannot be completed until Vercel permits a Preview build.
4. **Independent lint:** ESLint is not configured; current CI `npm run lint` performs TypeScript checking but does not run a separate lint engine.\n5. **Bundle size:** the production build still emits the existing warning for a JavaScript chunk above 500 kB; splitting/lazy-loading should be addressed before performance sign-off.

## Release gate

Do not create the final PR as PMV-complete or merge to `main` until tenant ownership rules are confirmed, tenant isolation is implemented and tested, distributed rate limiting is addressed, and the candidate is verified against a Vercel Preview with Neon integration. Production data and `main` remain untouched.


## PR consolidation

- PR #85 and PR #88 remain open Draft PRs and are currently marked mergeable against their original feature bases.
- PR #86 and PR #87 remain open Draft PRs and are currently marked non-mergeable against their original feature bases.
- Their selected UI, Media Kit delivery/export, inventory accessibility, and responsive request-table changes have been ported into `pmv-validation-candidate`.
- Do not merge #85–#88 independently. The intended release artifact remains one final PR from the candidate to `main`, after the blockers above are resolved.
