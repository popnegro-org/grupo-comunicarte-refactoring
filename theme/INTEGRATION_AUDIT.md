# Theme template integration audit

**Scope:** PR #77, `feat/theme` → `main`
**Decision:** keep both archives as references; do not integrate either application wholesale.

## Current application baseline

The repository's root `package.json` identifies the current application as a Vite + React application with an Express server. Relevant dependencies include:

- React / React DOM 19
- Vite 6
- Tailwind CSS 4 and `@tailwindcss/vite`
- Leaflet 1.9 and React Leaflet 5
- React Router DOM 7
- Neon serverless driver and Drizzle ORM

Preserve the existing application architecture, route behavior, API contracts, authentication and inventory/reservation flow.

## 1. mapcn

**Archive:** `mapcn-main.zip`
**License file:** MIT; copyright notice must be retained for copied portions.
**Upstream stack declared in archive:** Next.js 16, React 19.2.3, Tailwind CSS 4, MapLibre GL 6.3.

### Assessment

Mapcn's composable map, marker, popup and control patterns are a useful reference. It is **not a drop-in replacement** for the current inventory map: this application already uses Leaflet / React Leaflet, while mapcn uses MapLibre GL. Importing the full template would introduce a second mapping engine and additional CSS/runtime behavior.

The archive README also states that its default CARTO basemap requires a CARTO Enterprise license for commercial use. Do not deploy that basemap for commercial use unless the applicable license is obtained. Select and validate an appropriate commercial tile provider before production.

### Acceptance criteria before any adoption

1. Inspect the current inventory map and its data/interaction contracts.
2. Prefer implementing the needed UX improvements in the existing Leaflet stack unless a documented technical requirement justifies MapLibre.
3. If MapLibre is justified, prototype it in an isolated branch and explicitly evaluate bundle size, mobile behavior, accessibility, marker selection, clustering, attribution and tile-provider terms.
4. Verify that selected, available and reserved states remain driven by the existing API; never replace real inventory with demo data.
5. Run build, type-check, API and visual QA before proposing the change for human review.

## 2. Studio Admin (next-shadcn-admin-dashboard)

**Archive:** `next-shadcn-admin-dashboard-main.zip`
**License file:** MIT; copyright notice must be retained for copied portions.
**Upstream stack declared in archive:** Next.js 16, React 19.3, Tailwind CSS 4, shadcn, Base UI and a newer set of UI/data-table dependencies.

### Assessment

Use it as a design and component reference for navigation, responsive layouts, tables, filters, forms and theme controls. Do not copy its application shell, routes, authentication, demo data or Next.js configuration into the Vite application.

Prefer porting small, self-contained components and adapt them to the repository's existing React Router, styling tokens and installed dependency versions. Avoid upgrading shared dependencies solely to match the template.

### Acceptance criteria before any adoption

1. Identify a concrete PMV usability issue the component resolves.
2. Port only the smallest required component and preserve current routes and authorization.
3. Verify keyboard navigation, focus visibility, responsive layout, loading/empty/error states and accessible labels.
4. Run the existing build, type-check, unit tests and visual QA.
5. Review the resulting preview before human approval and merge.

## Recommended implementation order

1. Treat this PR as a **reference-assets and documentation PR**, not as an application redesign.
2. Inspect the existing inventory map and admin navigation to identify one high-value, bounded improvement.
3. Implement that improvement in a separate, focused PR with a preview deployment.
4. Do not change Neon schema, backend endpoints, authentication, reservations or tenant behavior as part of a visual component port unless a separately tested requirement demands it.

## Verification status

- Both uploaded ZIP archives passed `unzip -t` integrity checks.
- Both archives contain an MIT license file.
- Their `package.json` files and README files were inspected.
- The current application's root `package.json` was fetched from `main` and `feat/theme`; both report the same Vite/React/Leaflet stack.
- This document does **not** claim that either template has been integrated, built inside the application, or tested against production data.
