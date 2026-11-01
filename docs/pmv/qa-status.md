# PMV candidate QA status

**Candidate:** `pmv-validation-candidate`  
**Verified commit:** `0a078ff5b694f55792cbb9ccec4b13f68bf8e81c`  
**Main:** unchanged. No merge or production deployment performed.

## Automated verification

| Check | Result | Evidence |
|---|---|---|
| TypeScript / current `npm run lint` script | PASS | CI Candidate, Typecheck step |
| Unit tests | PASS | CI Candidate, Unit tests step |
| Build | PASS | CI Candidate, Build step |
| Playwright functional + visual suite | PASS | Visual QA: 26 passed, 2 skipped |
| Visual baseline comparison | PASS | Compared with reviewed baseline; saved current candidate baseline |
| Vercel Preview | BLOCKED | Vercel Git status reports `build-rate-limit`; no Preview deployment exists for the verified candidate SHA |

The repository's `lint` script currently runs TypeScript checking (`tsc --noEmit`); a separate ESLint configuration/script is not present. Do not describe this as an independent ESLint pass.

Playwright tests run against the CI Vite preview with mocked API responses. They validate browser flows, layout and export behavior, but do not replace a deployed API/Neon integration test.

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
4. **Independent lint:** ESLint is not configured; current CI typechecks but does not run a separate lint engine.

## Release gate

Do not create the final PR as PMV-complete or merge to `main` until tenant ownership rules are confirmed, tenant isolation is implemented and tested, distributed rate limiting is addressed, and the candidate is verified against a Vercel Preview with Neon integration. Production data and `main` remain untouched.
