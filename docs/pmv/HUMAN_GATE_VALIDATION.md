# PMV — validación HUMAN GATE

**Estado release:** NO-GO hasta completar checklist P0.  
**Fecha de actualización:** 2026-11-11  
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

Usar usuario QA y datos aislados en **Neon QA** (nunca Production).

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


## 9. Evidencia automatizada consolidada — 2026-11-11

**HEAD validado:** `1eef8db66944bdfbe9b8ad40244f8e2f7cf5481e`  
**Rama:** `pmv-validation-candidate`  
**PR:** [#90](https://github.com/popnegro-org/grupo-comunicarte-refactoring/pull/90), abierto y sin merge.  
**Neon QA:** `qa/pr96-ownership-20261105` (`br-bold-block-aua43ua0`).  
**Render QA:** deploy `dep-dbqc71p0bl5c73dtp7g0`, estado `live`, commit `1eef8db`.

| Validación | Run | Resultado |
|---|---:|---|
| CI | [43088688838](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43088688838) | PASS — lint, typecheck, 107/107 unit tests, build |
| CI Candidate | [43088688975](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43088688975) | PASS — validación, QA E2E autenticado 12/12 sin flaky |
| Visual QA | [43088688883](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43088688883) | PASS técnico — bootstrap de baseline faltante; sin comparación con baseline previamente aprobado |

El workflow de Preview Vercel fue omitido en este SHA porque el último commit solo modifica tests. La validación funcional solicitada se ejecutó en Render QA, que confirmó health HTTP 200, base conectada y branch Neon QA esperado. No se afirma un nuevo smoke autenticado Vercel para este SHA.

### Matriz transaccional C1–C6

La matriz completa está cerrada en [docs/pmv/C1-C6-TRANSACTIONAL-QA.md](https://github.com/popnegro-org/grupo-comunicarte-refactoring/blob/pmv-validation-candidate/docs/pmv/C1-C6-TRANSACTIONAL-QA.md).

- **C1 PASS:** ownership coincidente, PATCH `quoted` HTTP 200 y restauración `pending`.
- **C2 PASS:** la FK compuesta rechaza el tenant drift; guard de dominio PASS.
- **C3 PASS:** ownership NULL, PATCH `enviado` HTTP 409; Neon conserva `pending` y el `updated_at` original.
- **C4 PASS:** solicitud sin ítems, PATCH `closed` HTTP 409; Neon conserva `pending` y el `updated_at` original.
- **C5 PASS:** FK rechaza soporte inexistente; guard de dominio PASS.
- **C6 PASS:** PATCH concurrentes; resultados de dominio 200/409, al menos una transición aceptada y estados devueltos `quoted`/`closed`; restauración final `pending`.

C2/C5 se probaron con transacciones controladas en Neon QA sin desactivar constraints. Consulta final: `drift_probe_rows=0`, `orphan_probe_rows=0`. Las FK relevantes están validadas (`convalidated=true`).

C1/C6 usan la solicitud sintética estable `REQ-2026-b342e5ef-833d-4c10-97af-faff81f9a996`; terminó `pending` después de la restauración. C3 y C4 terminaron `pending` con sus marcas `updated_at` intactas.

### Navegación Media Kit

Se corrigió el cierre del panel de Media Kit para que ocurra después del cambio de ruta, no dentro del evento del enlace. Las páginas públicas comparten ahora un layout de rutas anidadas en el router principal. El E2E 12/12 verifica que el enlace de propuesta renderiza `/contacto?origen=mediakit`, muestra `Tu selección, lista para avanzar.` y conserva un soporte seleccionado. La captura `mediakit-contact.png` está incluida en el artifact QA.

### Artifact y estado QA

Artifact `qa-deployment-e2e-evidence`, ID `13887877899`, SHA-256 `f2455b5e4785584b95dbc596c90558d867d91f21add92b04235809d40b475399`.

El Media Kit sintético `KIT-QA-EXPORT-C4A280BC3D34` terminó en `draft` con `metadata.exports={}`; la solicitud asociada terminó `pending`. No se enviaron comunicaciones reales. PDF/PPTX son fixtures sintéticos (81 y 8 bytes): el round-trip de storage pasa, pero esto no valida la composición final de documentos comerciales.

### Visual QA — límite explícito

El workflow pasó el bootstrap y validación de baseline faltante. No existía un baseline de referencia previamente aprobado: los pasos de comparación/refresh contra baseline confiable fueron omitidos. Esto no reemplaza la revisión visual humana desktop/mobile ni la aprobación de las seis referencias y siete escenarios indicados en §4.5.

### HUMAN GATE pendiente

1. Revisión visual humana desktop 1440×900 y mobile 390×844; aprobar referencias y escenarios omitidos.
2. Certificar de forma independiente la conexión Neon del servicio Render principal.
3. Revisar la evidencia comercial de PDF/PPTX reales; los fixtures QA no son documentos finales.
4. Aceptar las limitaciones del plan Neon Free y el estado de Cloudflare/WAF.

**C1–C6 quedan cerrados en Neon QA.** Esto no autoriza merge. PR #90 permanece abierto; `main`, Neon Production y Vercel Production no fueron modificados. Merge y promoción Production siguen sujetos a aprobación explícita HUMAN GATE.
