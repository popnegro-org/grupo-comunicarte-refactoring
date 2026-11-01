# PMV candidate QA status

**Candidate:** pmv-validation-candidate
**Latest verified commit:** 67585d4d45a51ccc97a4eaede308c1204f1ab773
**Documentation updated:** 2026-11-01
**Main:** unchanged. No merge or Production deployment performed.

## Automated verification

| Check | Result | Evidence |
|---|---|---|
| TypeScript / npm run lint | PASS | CI Candidate run 41362963755 |
| Unit tests | PASS | 32/32 locally on 67585d4 |
| Build | PASS | CI Candidate run 41362963755 and local build |
| Production dependency audit | PASS | 0 vulnerabilities; CI run 41362963755 |
| Playwright functional + visual suite | PASS | Visual QA run 41362963754: 26 passed, 2 skipped of 28 |
| Visual baseline regression | PASS | Restored trusted candidate baseline from c3aae39685851218f7355b72d484f7089cd7fd85 |
| Vercel Preview / Neon runtime | PASS | Deployment dpl_DQGxATwWXUQzotwqz69cV61dVqCK READY; /api/health connected; /api/supports 200 |

The repository's lint script runs TypeScript checking (tsc --noEmit); a separate ESLint configuration/script is not present.

The two skipped Playwright cases remain visible and are not counted as passed. The CI visual workflow ran against the trusted cached baseline; it was a regression comparison, not a first-time baseline bootstrap.

## Implemented hardening

- Admin password equality uses crypto.timingSafeEqual.
- Login rate limiting uses an atomic PostgreSQL upsert and HMACed IP keys; the required table is still proposal-only and the runtime feature is not active until provisioned.
- Multimedia uploads verify binary signatures against declared MIME types.
- Media Kit API rejects invalid/negative amounts, unapproved currencies and prices for unselected supports.
- Client PDF/PPT exports omit internal support pricing; an unset global amount remains unset rather than derived from internal catalog prices.
- Admin-only bulk pricing endpoint feeds quote UI without exposing pricing through public inventory endpoints.
- Media Kit request validation resolves selected supports from one catalog read rather than N+1 detail queries.
- Supports without verified tenant ownership remain quarantined from the public catalogue and commercial flows.

## Current blockers

1. **Tenant isolation:** see tenant-isolation-blocker.md. Public inventory quarantine is implemented, and Media Kit/request ownership checks exist in key paths, but complete tenant-safe scoping across admin CRUD, pricing, requests, reporting, media and exports is not yet proven. The single existing administrator has global access to both tenants; this does not remove the requirement to retain verified ownership on each record and operation.
2. **Distributed login rate limiter activation:** code is database-backed, but admin_login_attempts exists only as a proposal in docs/pmv/proposals/20261101_002_admin_login_rate_limit.sql. No migration has been executed. The login route fails closed with 503 if the table is unavailable. Provision only after explicit review and isolated staging validation.
3. **Independent lint:** ESLint is not configured; npm run lint performs TypeScript checking.
4. **Visual QA skips and accessibility:** resolve or explicitly justify the two skipped browser cases and complete keyboard/focus/contrast review.
5. **Performance:** route-level lazy loading has reduced emitted chunks below 500 kB in the current build; no >500 kB warning was emitted. Runtime profiling remains part of P2 sign-off.

## Release gate

Do not declare the PMV complete or merge to main until tenant isolation is implemented and tested across all admin endpoints and exports, the login limiter table is safely provisioned, the skipped browser cases are resolved or justified, and the final QA evidence is reviewed. Production data and main remain untouched.

## PR consolidation

- PR #85 and PR #88 remain open Draft PRs and are mergeable against their original feature bases.
- PR #86 and PR #87 remain open Draft PRs and are non-mergeable against their original feature bases.
- Their selected UI, Media Kit delivery/export, inventory accessibility and responsive request-table changes have been ported into pmv-validation-candidate.
- Do not merge #85–#88 independently. The intended release artifact remains one final PR from the candidate to main after the blockers above are resolved.

## QA addendum — latest candidate and live Preview (2026-11-01)

**Branch:** pmv-validation-candidate
**Commit:** 67585d4d45a51ccc97a4eaede308c1204f1ab773
**Preview:** https://grupo-comunicarte-refactoring-k491ktv2n-popnegros-projects.vercel.app
**Deployment:** dpl_DQGxATwWXUQzotwqz69cV61dVqCK — READY.

### Fresh verification

- npm ci --no-audit --no-fund: PASS.
- npm run lint (TypeScript): PASS.
- npm run test:unit: PASS, 32/32.
- npm run build: PASS. Route-level chunks are split; no chunk above 500 kB warning.
- npm audit --omit=dev --audit-level=high: PASS, 0 vulnerabilities.
- GitHub CI Candidate run 41362963755: PASS.
- GitHub Visual QA run 41362963754: PASS, 26 passed and 2 skipped out of 28. It restored the trusted candidate baseline from c3aae39685851218f7355b72d484f7089cd7fd85 and compared against it.
- Preview routes /, /inventario, /contacto and /mediakits: HTTP 200.
- /api/health: HTTP 200, database=connected.
- /api/supports: HTTP 200; public inventory UI renders 28 results. Unassigned supports remain excluded from public inventory.
- Live browser QA: inventory map and catalogue render; 28 cards are available; selecting a support changes its state to En tu selección; Navbar Media Kit access is visible; Media Kit panel shows the selected support; Solicitar propuesta navigates to /contacto?origen=mediakit and preserves the selected support count (1) in the form.
- Mobile viewport 390×844: document width remains 390px; no horizontal overflow; compact Navbar Media Kit control remains visible.
- No form was submitted and no real commercial communication was sent.

### Corrections to earlier status

- A Vercel Preview now exists and is READY for the current candidate SHA. Earlier statements that no candidate deployment existed are historical and superseded.
- Login limiter implementation is database-backed, not process-local. However, the required table remains proposal-only and has not been provisioned; do not call it active until the table exists and login is verified on Preview.
- The current build has route-level code splitting and no longer emits the previous >500 kB chunk warning.
- The two skipped Visual QA cases remain unresolved and are not counted as passed.

No SQL migration was executed, no Production data or deployment was changed, and main remains untouched.
