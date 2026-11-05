# PMV — validación HUMAN GATE

**Estado release:** NO-GO hasta completar checklist P0.  
**Fecha de actualización:** 2026-11-05  
**Línea de integración única:** `pmv-validation-candidate`  
**Rama de trabajo P0 ownership/cuarentena:** `pmv/p0-ownership-quarantine-gate` (incluye commits de `fix/request-ownership-revalidation` / PR #96)

## 1. Principios innegociables

1. Fail closed ante identidad, tenant, ownership o autorización desconocidos.
2. No merge a `main`, no despliegue Production, no DDL/backfill Neon Production sin aprobación humana explícita.
3. Una sola línea de integración PMV. No mergear `canonical-refinement` (#89) ni stacks UX #85–#88 de forma completa.
4. Evidencia debe referenciar el **SHA exacto** validado (CI, Preview, Playwright, smoke HTTP).
5. Integraciones HubSpot / email / WhatsApp API no acreditadas no se declaran listas.

## 2. Alcance de la candidata actual

| Área | Estado en código | Gate pendiente |
|------|------------------|----------------|
| Revalidación ownership al avanzar solicitud (`quoted`/`enviado`/`closed`) | Implementado en `updateRequestStatusByAdmin` + locks estables | QA transaccional Neon Preview |
| Cuarentena catálogo público (`tenant_id` NULL / inactivo) | SQL + `isSupportEligibleForPublicCatalog` | Smoke Preview: 404 detalle, exclusión listado |
| Alta solicitud pública | Locks + eligibility comercial + scope | Smoke Preview con soporte pendiente rechazado |
| Media Kit listo/enviado | Bloquea ownership pendiente y revalida en transacción | QA autenticado Media Kit |
| CORS same-origin Preview | En ramas #91/#92; incorporar solo tras CI verde | Login Preview same-origin |
| Drawer comercial mobile | #93 draft apilado | QA visual mobile autenticado |
| Asociación Media Kit por `source_request_id` | #95 merged en candidata | Fixture Visual QA verde |

## 3. Checklist automatizado (obligatorio en el SHA)

Ejecutar en el SHA candidato antes de pedir gate humano:

```bash
npm ci
npm run lint          # tsc --noEmit
npm run test:unit     # todos tests/unit/*.test.ts
npm run build
git diff --check
```

CI requerido:

- [ ] Workflow **CI Candidate** PASS en el SHA
- [ ] Workflow **Visual QA** PASS en el SHA (baseline confiable; no aceptar baselines nuevos sin revisión)
- [ ] Vercel Preview **READY** del mismo SHA
- [ ] `GET /api/health` → 200 `database: connected`
- [ ] `GET /api/supports` → solo soportes con ownership asignado

## 4. Checklist humano — ownership y cuarentena (P0)

Usar usuario QA y datos aislados en **Neon Preview** (nunca Production).

### 4.1 Catálogo y selección

1. Listar inventario público: no aparece ningún soporte con ownership pendiente.
2. Detalle de un `canonical_id` pendiente conocido (p. ej. `mza-trad-16` si sigue sin asignar) → 404.
3. Intentar `POST /api/mediakit/request` incluyendo un soporte pendiente o reservado → error 4xx; no se crea cabecera.

### 4.2 Avance comercial de solicitud (PR #96)

Preparar en Preview (o usar fixtures existentes):

| Caso | Acción | Resultado esperado |
|------|--------|--------------------|
| Match OK | Solicitud con ítems cuyo `tenant_id` coincide con `supports.tenant_id` → status `quoted` | 200; status actualizado |
| Drift | Cambiar ownership del soporte (solo Preview) o usar ítem con tenant distinto al soporte actual → `quoted` | Error; status de la solicitud **sin cambio** |
| Ownership pendiente | Ítem o soporte con `tenant_id` NULL → `quoted`/`enviado`/`cerrado` | Error; status intacto |
| Sin ítems | Solicitud sin líneas → avance comercial | Error explícito |
| Soporte eliminado | `support_id` huérfano en ítem | Error; status intacto |
| Concurrencia | Dos mutaciones simultáneas sobre la misma solicitud/soportes | Una gana; la otra falla limpio o ve estado consistente (sin partial update) |

Estados que **requieren** ownership: `quoted`, `enviado`, `closed`, `cerrado`.  
Estados que **no** deben exigir revalidación fuerte de ownership de inventario: `pending`/`nuevo`, `contacted`/`contactado`, `cancelled` (salvo regla comercial futura documentada).

### 4.3 Media Kit

1. No se puede marcar `ready`/`sent` si algún soporte del kit quedó sin ownership.
2. Asociación por `source_request_id` exacto; sin inferencia por prefijo de ID.
3. Export PDF/PPT no expone precios internos.

### 4.4 Auth / Preview

1. Login admin desde origen exacto del host Preview permitido.
2. Origen externo en mutación cookie → 403.
3. Endpoints admin sin sesión → 401.

### 4.5 UX mínimo (desktop 1440×900 y móvil 390×844)

1. Dashboard → Solicitudes → drawer/detalle sin overflow horizontal.
2. Inventario mapa/lista operable; selección no incluye cuarentena.
3. Teclado: foco visible en CTAs principales del flujo comercial.

## 5. Consolidación de ramas (mejora prioritaria 4)

**Permitido integrar en la candidata (tras CI + QA del SHA):**

- `fix/request-ownership-revalidation` / `pmv/p0-ownership-quarantine-gate` (ownership + cuarentena + tests)
- Fix CORS same-origin Preview (#92) si aún no está en el HEAD de la candidata
- Commits ya merged de asociación Media Kit (#95)

**No integrar como bloque:**

- `canonical-refinement` / PR #89 (referencia UX únicamente)
- PR #85–#88 completos (apilados / divergentes)
- Ramas históricas `feat/dashboard-*`, `feat/uxui-pmv*`, `uxui/paralelo-prod*` sin split revisado

Cualquier cherry-pick UX debe ser **selectivo**, con diff revisado y sin traer modelos duplicados ni fallbacks localStorage.

## 6. Evidencias a adjuntar al pedir HUMAN GATE hacia `main`

1. SHA candidato y URL del commit.
2. Links de runs CI Candidate + Visual QA PASS.
3. URL Preview READY + resultados smoke HTTP (health, supports count, 401 admin, 403 origen externo).
4. Resultados de la matriz §4.2 (ownership) y §4.3 (Media Kit).
5. Capturas o notas de §4.5 (desktop/móvil).
6. Confirmación explícita: **no** se modificó `main` ni Neon Production.

## 7. Regla de liberación

- **NO-GO** si queda cualquier ítem P0 del contrato abierto, un soporte sin ownership puede venderse, hay drift de tenant en avance comercial, o CI/Preview del SHA no está verde.
- **GO para revisión humana de merge a `main`** solo con P0/P1 cerrados y evidencias del SHA exacto.
- Merge a `main` y promoción Production permanecen **HUMAN GATE** (no automatizar).

## 8. Referencias

- Contrato: `docs/PMV-CONTRACT-AND-ACCEPTANCE.md`
- Ownership fuente: `docs/inventario/processed/TENANT-OWNERSHIP-MAPPING.md`
- Bloqueante aislamiento: `docs/pmv/tenant-isolation-blocker.md`
- Plan QA ownership Preview: `docs/pmv/QA-OWNERSHIP-REVALIDATION-PREVIEW.md`
