# Control operativo — Grupo Comunicarte OOH

**Verificado:** 2026-11-12  
**Repo:** popnegro-org/grupo-comunicarte-refactoring  
**Rama única:** `pmv-validation-candidate`  
**PR:** [#90](https://github.com/popnegro-org/grupo-comunicarte-refactoring/pull/90) — abierto, sin merge.  
**Release:** **NO-GO para merge** hasta revisar el alcance amplio, los antecedentes de Neon Production y el baseline visual no confiable.

## 1. Inventario oficial: 28 soportes

Fuente primaria: PDFs en `docs/inventario/source/`; mapping: `docs/inventario/processed/TENANT-OWNERSHIP-MAPPING.md`.

| Plaza | Tradicionales | Pantallas LED | LED móvil | Total |
|---|---:|---:|---:|---:|
| Buenos Aires | 10 | 0 | 0 | 10 |
| Mendoza | 15 | 2 | 1 | 18 |
| **Total** | **25** | **2** | **1** | **28** |

Las caras de una posición física no multiplican el conteo. QA, Preview y Production muestran 46 filas en `supports`: 28 asignadas y 18 sin tenant. `mza-trad-16` sigue `active=true`, sin ownership y bloqueada por backend. No borrar, reasignar ni desactivar las 18 filas en cuarentena.

## 2. Modelo funcional obligatorio

- Un administrador global existente.
- `tenant-ba` representa ownership comercial de Buenos Aires; `tenant-default`, Mendoza.
- Tipologías: `tradicional`, `led` (pantallas LED), `led_movil`.
- `tenant_id` es ownership comercial/operativo, no autorización individual.
- No crear usuarios tenant-scoped, membresías, tenant context SQL ni RLS para este PMV.
- Ownership solo por canonical ID y evidencia PDF; nunca inferir por ciudad.
- Sin ownership: no publicar, reservar, cotizar ni incluir en Media Kit.

## 3. Neon: un proyecto, tres ramas

Proyecto: `mute-math-07036388`.

| Uso | Rama | ID |
|---|---|---|
| Production | main | br-wandering-sky-aunq6lad |
| Preview | preview/pmv-validation-candidate | br-muddy-cell-au64infb |
| QA | qa/pr96-ownership-20261105 | br-bold-block-aua43ua0 |

No crear proyectos por plaza ni ramas permanentes por feature. No borrar ni resetear ramas.

### Estado verificado por consultas de lectura — 2026-11-12

| Control | QA | Preview | Production |
|---|---:|---:|---:|
| Filas `supports` | 46 | 46 | 46 |
| Con ownership | 28 | 28 | 28 |
| En cuarentena | 18 | 18 | 18 |
| `mza-trad-16`: active y sin tenant | 1 | 1 | 1 |
| Tablas con RLS habilitado | 0 | 0 | 0 |
| `app.tenant_id` | NULL | NULL | No evaluado |
| `integration_outbox` | Existe | No existe | No existe |

El desglose por tenant/tipología coincide en las tres ramas: Buenos Aires 10 tradicionales; Mendoza 15 tradicionales, 2 LED y 1 LED móvil.

### Roles runtime QA / Preview

- QA: `app_runtime_qa_login`; Preview: `app_runtime_preview`.
- Ambos: `rolsuper=false`, `rolbypassrls=false`, `rolcreatedb=false`, `rolcreaterole=false`.
- `neondb_owner` conserva privilegios administrativos y `BYPASSRLS=true`; no es el rol runtime de Render QA/Preview.
- RLS está deshabilitado en ambas ramas. QA conserva 27 políticas staged/inertes en 27 tablas; ninguna tabla tiene RLS habilitado. Preview tiene 0 políticas. No activar ni eliminar esas políticas como parte de este PMV.
- QA tiene `integration_outbox`; Preview y Production no. No se encontraron referencias runtime. No crearla en Preview.

### Triggers de ownership — corrección P1 pendiente

La migración base de herencia fue aplicada previamente en QA y Preview. En ambas ramas están habilitados:
- `mediakit_request_items_tenant_inheritance` → `enforce_mediakit_request_item_tenant`.
- `supports_tenant_ownership_immutable` → `prevent_support_tenant_reassignment`.

Las líneas históricas sin tenant permanecen pendientes; no inferir ni asignar ownership automáticamente.

**Hallazgo P1 adicional:** el trigger base permitía que un UPDATE mantuviera `tenant_id=NULL` mientras cambiaba `support_id` hacia otro soporte en cuarentena. Se agregó al candidato la migración [20261112_reject_quarantine_support_reassignment.sql](./migrations/20261112_reject_quarantine_support_reassignment.sql) y una aserción de regresión en [rollback test](./tests/20261112_request_item_tenant_inheritance.rollback.sql). La corrección se aplicó transaccionalmente en QA y Preview; el rollback test ampliado pasó en ambas ramas. Postflight confirma 46 soportes, 18 sin ownership y cero request-item huérfanos/mismatch por rama. Production no fue modificada.

**En esta continuación no se ejecutó DDL ni se modificaron datos.**

## 4. Antecedente importante: Neon Production

Neon Production **sí tiene cambios históricos de esquema**. La migración `20261109_production_ownership_and_login_rate_limit.sql` declara su aplicación el 2026-11-09. Una comprobación posterior de solo lectura confirmó:
- `supports.tenant_id` existe.
- `admin_login_attempts` existe.
- `supports` contiene 46 filas: 28 asignadas y 18 sin tenant.
- 0 tablas públicas con RLS habilitado.

Por tanto, la frase histórica “Production intacta” no debe interpretarse como “esquema nunca modificado”. En esta continuación no se ejecutó SQL/DDL ni se alteraron datos, roles o configuración de Production. No se modificaron `main`, Vercel Production, DNS/WAF ni secretos productivos. La migración del 9 de noviembre es un registro histórico **DO NOT REPLAY**; no volver a ejecutarla. La identidad runtime de Production requiere una verificación independiente antes de declarar su seguridad.

## 5. Visual QA — resolución

La última ejecución roja sobre el HEAD anterior registró 10 FAIL, 2 flaky y 7 SKIPPED. Los 10 FAIL eran instancias de contraste en desktop/mobile; la ejecución más reciente sobre el código candidato pasó.

Cambios de contraste aplicados a siete rutas:
`/`, `/soportes`, `/inventario`, `/soluciones`, `/nosotros`, `/contacto`, `/mediakits`.

Ejemplos de ratios:
- Antes: `#677891` sobre blanco = **4,495:1**; `#6c7484` sobre `#f9fafb` = **4,497:1** (debajo de AA).
- Después: `#374151` sobre `#F9F9F9` = **9,79:1**; `#334155` sobre blanco = **10,355:1**.

Los siete skips se identificaron y eliminaron sin desactivar tests:
- 4 guardas de viewport en `tests/visual/header-redesign.spec.ts`.
- 3 guardas de viewport/snapshot en `tests/visual/inventory.spec.ts`.
Las pruebas ahora adaptan el viewport al objetivo desde ambos proyectos; los snapshots solo se comparan en el proyecto correspondiente.

**Visual QA CI:** run [43258518178](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43258518178) — **96/96 PASS, 0 FAIL, 0 SKIPPED**. El log confirma dos ejecuciones completas de 96 tests. Se generaron únicamente snapshots faltantes; `git diff --exit-code -- tests/visual/__snapshots__` confirmó que no se sobrescribieron snapshots comprometidos.

**Límite de baseline:** los seis snapshots nuevos fueron generados en la rama candidata por el bootstrap; no constituyen comparación contra un baseline histórico confiable. Mantener revisión visual humana de esos artefactos antes del release.

## 6. CI y E2E del SHA de código validado

SHA de código: `02301ceefdedfad9b1ed43c2854dbb18d8370dab`.

| Workflow | Run | Resultado |
|---|---:|---|
| CI | [43258518137](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43258518137) | PASS |
| CI Candidate | [43258518051](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43258518051) | PASS |
| Visual QA | [43258518178](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43258518178) | PASS — 96/96 |

CI Candidate confirma typecheck, unit tests, build, bundle budget y dependency audit. E2E autenticado: QA **12/12 PASS** (35,1 s), Preview **12/12 PASS** (38,3 s, bucket R2 aislado, 0 flaky); Preview authenticated smoke **9/9 PASS** (17 s). C1–C6 constan como PASS en `docs/pmv/C1-C6-TRANSACTIONAL-QA.md`. El run anterior tuvo un timeout de 120 s en `GET /api/admin/requests`; se eliminó el N+1 de `getAllMediakitRequestsFromDB` mediante carga por lotes. La repetición actual pasó sin flakiness.

## 7. Auditoría DevSecOps y alcance del PR

El SHA de código validado (`02301ceefdedfad9b1ed43c2854dbb18d8370dab`) tenía 560 commits ahead / 0 behind y 156 archivos (+12.061 / -2.184 líneas). El último cambio de código elimina consultas N+1 del historial administrativo de solicitudes; los commits posteriores de control son documentales. Consultar el compare vivo de PR #90 para los contadores actuales.

| Grupo | Archivos |
|---|---:|
| `docs/` | 34 |
| `src/` | 68 |
| `tests/` | 39 |
| `.github/workflows/` | 4 |
| Lockfiles | 2 |
| Otros/root | 9 |

- Se escanearon los 149 archivos de texto presentes del diff con patrones de credenciales PostgreSQL/Neon, claves privadas, JWT, GitHub tokens, AWS, Slack y Google API keys: **sin hallazgos**. `.env.example` contiene nombres de variables vacías. `bun.lock` está eliminado y no pudo leerse como archivo vigente.
- No se encontraron URLs de conexión Neon ni credenciales hardcodeadas.
- Catálogo y detalle públicos usan los filtros por ownership; medios públicos también exigen tenant asignado.
- La solicitud pública valida los IDs seleccionados y vuelve a comprobar cantidad, ownership, estado y disponibilidad bajo lock transaccional.
- Media Kit vuelve a comprobar ownership al guardar y al avanzar a ready/sent. El historial administrativo carga solicitudes, ítems y catálogo en lote; no expone cuarentena a rutas públicas.
- Las consultas que incluyen registros sin asignar se usan en estadísticas, conciliación y vistas administrativas protegidas por `requireAdmin`.
- No se encontró `DELETE`/ `TRUNCATE` sobre `supports` en las migraciones revisadas; la baja de soporte en backend es soft-delete mediante `active=false`.
- No se creó `integration_outbox` en Preview, ni se crearon usuarios tenant-scoped, membresías o políticas RLS durante esta continuación.

**Alcance:** 560 commits y 156 archivos representan un diff amplio, no atómico. Requiere revisión humana de alcance antes de merge; no habilitar automerge.

## 8. Próximas condiciones para HUMAN GATE

1. Confirmar que el workflow actualizado sigue PASS después de la migración correctiva; la migración y rollback test ya pasaron en QA y Preview.
2. Revisar visualmente los seis snapshots nuevos en desktop/mobile; la suite automatizada pasa, pero no tiene baseline histórico independiente para esos artefactos.
3. Revisar el diff completo y el registro histórico de la migración Production; no replay.
4. Verificar por separado la identidad runtime y la política de acceso de Neon Production.
5. Mantener PR #90 abierto y sin merge hasta aprobación explícita: `HUMAN GATE: APRUEBO PR #90`.

**Guardrails:** no merge, no force-push, no rebase, no ramas nuevas, no más DDL ni modificaciones de datos; Production sin cambios. Cualquier cambio productivo requiere autorización humana explícita.


## 8. Verificación directa de Production — 2026-11-12 18:19 UTC

Se inspeccionó el deployment Vercel Production `dpl_E83qTALyMZ9FuFVvVeMc8Aj2XcpA` (commit `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70`, rama `main`) sin modificar configuración ni secretos.

### Enrutamiento de API y VITE_API_URL

- El HTML público carga un bundle que realiza llamadas relativas a `/api/*`; no contiene el hostname Render ni una referencia literal a `VITE_API_URL`.
- `src/lib/api.ts` en `main` y en `pmv-validation-candidate` devuelve rutas relativas cuando `import.meta.env.PROD` es verdadero. En consecuencia, Vercel Preview y Production ignoran `VITE_API_URL` en builds de producción.
- `vercel.json` reescribe `/api/*` a `api/[...path].ts`; el handler importa `dist/server.cjs` y atiende API en el mismo deployment Vercel.
- `GET /api/health` en el deployment Production respondió HTTP 200: `{"status":"ok","database":"connected"}`.
- `GET /api/supports` respondió HTTP 200 con 29 registros. La respuesta incluye `mza-trad-16` con `active=true`, disponibilidad `disponible` y sin ownership visible (`tenant_id` no se devuelve). Esto contradice la regla PMV de no publicar soportes sin ownership y confirma que el backend de Production desplegado desde `main` no aplica el control candidato esperado. No se ejecutaron escrituras.

**Decisión de configuración:** no asignar el endpoint Render a `VITE_API_URL`. Para builds Vercel, la variable es redundante y no enruta las peticiones; la API está en el mismo origen. Mantenerla vacía/no configurada es el estado recomendado, salvo que un flujo explícito de desarrollo local necesite un backend remoto. No se cambió la variable.

### Identidad efectiva de Neon Production

- La consulta de solo lectura a Neon Production confirma que los únicos roles PostgreSQL con LOGIN son `cloud_admin`, `neon_auth`, `neon_service` y `neondb_owner`; no existe `app_runtime_prod`.
- El endpoint Vercel Production confirmó conectividad a base de datos. Sin embargo, la conexión activa no quedó expuesta en `pg_stat_activity` después de la solicitud de health check y Vercel no permitió leer el valor secreto de `DATABASE_URL` mediante el conector. Por lo tanto, no se declara verificado el usuario exacto de conexión. `neondb_owner` es el rol de auditoría usado por la conexión de lectura, no evidencia suficiente por sí solo de la identidad runtime.
- El servicio Render `grupo-comunicarte-refactoring` sigue en `pmv-validation-candidate` y su runtime reportó `app_runtime_preview`; no es el backend Production.

**Bloqueantes de release:** (1) Production aún sirve una API que expone al menos un soporte en cuarentena; (2) falta demostrar que el runtime Vercel usa un rol dedicado de privilegios mínimos; (3) PR #90 sigue sin aprobación humana y conserva seis snapshots sin baseline histórico confiable. No modificar Production, secretos, ramas Neon ni despliegues críticos sin HUMAN GATE.


### Addendum — identidad runtime de Vercel Production confirmada por sesión PostgreSQL

La comprobación se repitió inmediatamente después de invocar el endpoint Production `/api/supports`. Neon Production mostró una sesión PostgreSQL con:
- `usename = neondb_owner`
- `application_name = pgbouncer`
- `state = idle`
- última consulta: `SELECT support_canonical_id, metadata FROM support_technical WHERE ...`, consistente con la consulta de enriquecimiento ejecutada por el handler público de catálogo.

Esto confirma que la API Vercel Production está utilizando `neondb_owner` como identidad efectiva de base de datos (no solo que el usuario de auditoría use ese rol). Los atributos actuales del rol son `rolsuper=false`, pero `rolbypassrls=true`, `rolcreatedb=true`, `rolcreaterole=true`, `rolcanlogin=true`. No es una identidad de aplicación de privilegios mínimos.

**P1 confirmado:** Vercel Production ejecuta consultas de catálogo usando `neondb_owner`, un rol con BYPASSRLS y capacidad de crear bases/roles. No se creó ni rotó ningún rol/credencial y no se cambió el secreto productivo. La remediación requiere aprovisionar y validar un rol runtime dedicado con privilegios mínimos y migrar el secreto de conexión de Vercel Production; por ser un cambio crítico de producción, queda sujeto a HUMAN GATE.


## 9. Vercel Preview runtime identity audit — 2026-11-12

A live call to the latest available Vercel Preview deployment on `pmv-validation-candidate` was followed by a read-only query of Neon Preview `pg_stat_activity`. The Vercel API's query against `support_routes` ran as `neondb_owner`. This is separate from Render Preview, whose runtime sessions use `app_runtime_preview`.

Neon Preview role attributes:
- `neondb_owner`: `rolsuper=false`, `rolbypassrls=true`, `rolcreatedb=true`, `rolcreaterole=true`, `rolreplication=true`, database CREATE and public schema CREATE enabled.
- `app_runtime_preview`: `rolsuper=false`, `rolbypassrls=false`, `rolcreatedb=false`, `rolcreaterole=false`, `rolreplication=false`, database CREATE and public schema CREATE disabled.
- `app_runtime_preview` nevertheless has SELECT/INSERT/UPDATE/DELETE privileges on all 36 public tables; object-level grant scope still requires reduction after a route dependency audit.

The Vercel Preview deployment's ownership behavior is correct on its deployed SHA:
- `GET /api/health`: HTTP 200; `databaseBranch=br-muddy-cell-au64infb`.
- `GET /api/supports`: 28 records; `mza-trad-16` absent.
- `GET /api/supports/mza-trad-16`: HTTP 404.

This verifies data-branch isolation and quarantine behavior in that Vercel Preview deployment, but it does not clear the elevated runtime identity. Vercel Preview uses `neondb_owner`; Render Preview uses `app_runtime_preview`. The preview role and production role remediation must be tracked separately. No Preview or Production secrets/configuration were changed.


### Vercel Preview SHA freshness check — 2026-11-12

The newest Vercel Preview deployment returned by the project for branch `pmv-validation-candidate` is `dpl_4Paj8F2nW9aB6fZ8F28MbNnUM7CD`, commit `40431d1a61bf59da47beeb216bf2365d12077d86`. The current candidate HEAD at the time of audit was `8b2954fe73ba72a5724a0729213280b6a62b30b7`, 33 commits ahead. No Vercel Preview deployment exists for that HEAD. The older deployment's public support model/service and API handler source files match current HEAD, but `server.ts`, `src/db/index.ts`, `src/server/tenantAccess.ts`, and `src/server/mediakitService.ts` differ. Thus its health/quarantine results are useful but are not a substitute for a same-SHA Vercel Preview validation.

Render Preview/QA E2E are executed against the current candidate SHA by CI Candidate. Vercel Preview must also produce a READY deployment for the exact releasable SHA and repeat health, branch identity, public list/detail quarantine, admin 401, and pricing privacy checks before release. No manual Vercel deployment was created because the project has not produced a deployment for the current candidate HEAD; avoid consuming deployment quota until the reason for the stale integration/deploy history is understood.


## Estado posterior a la asignación de mza-trad-16 — 2026-11-12 19:05 UTC

Este apartado supersede las cifras y conclusiones anteriores sobre Production que describían `mza-trad-16` como un soporte sin ownership.

### Ownership y datos actuales de Production

- El responsable del proyecto confirmó expresamente que `mza-trad-16` (“Las Heras Centro”) pertenece a `tenant-default`.
- Con HUMAN GATE explícito, la fila fue actualizada en Neon Production: `tenant_id=tenant-default`, tenant slug `mendoza-ooh`, `active=true`.
- Se registró evidencia en `tenant_ownership_evidence`, `tenant_ownership_assigned_by` y `tenant_ownership_assigned_at`.
- Consulta de solo lectura posterior: **29 soportes totales; 10 `ba-ooh`; 19 `mendoza-ooh`; 0 sin tenant**.
- Live Production: `GET /api/health` HTTP 200 (`database=connected`); `GET /api/supports` HTTP 200 e incluye `mza-trad-16`; `GET /api/supports/mza-trad-16` HTTP 200 con media pública.
- No se alteró el estado comercial, no se eliminó ni reasignó otro soporte, y no se hicieron cambios en QA/Preview.
- El PDF de Mendoza no lista este ID; el ownership queda acreditado por confirmación explícita del responsable y evidencia persistida, no por atribución documental inventada.

### Validación candidate — HEAD previo a esta actualización documental

- HEAD de código/documentación anterior: `56e4eddddab285c7750e92ffc92d29ab48de72b2`.
- CI #43284226491: PASS; lint/typecheck, 102 unit tests, build y bundle budget.
- CI Candidate #43284226527: PASS; QA Deployment E2E 12/12, authenticated Render Preview smoke 9/9, Preview Deployment E2E 12/12.
- Visual QA #43284226483: Playwright 96/96 PASS en dos ejecuciones. El flujo bootstrapeó snapshots faltantes y no comparó contra un baseline histórico independiente. La inspección manual del artefacto encontró catálogo y tarjetas seleccionadas ampliamente alineados; los dos screenshots del mapa son visiblemente más claros/lavados que sus snapshots comprometidos. La estabilidad de captura del mapa queda pendiente de corrección/revisión visual.
- Artefacto Visual QA: `visual-qa-report`, ID `13974223368`.
- Vercel Preview continúa sin deployment READY del HEAD candidato actual; el deployment encontrado sigue en SHA antiguo `40431d1a61bf59da47beeb216bf2365d12077d86`. Render Preview E2E no sustituye la verificación Vercel same-SHA.
- PR #90 permanece abierto, sin merge y sin reviews submitidas. GitHub reporta 159 archivos, +12.544 / -2.184 y 579 commits.

### Decisión

**NO-GO para merge/release.** La asignación de ownership de Production queda resuelta; no debe seguir tratándose como P1. Permanecen pendientes la revisión/corrección de las capturas del mapa, una validación Vercel Preview sobre el SHA exacto que se pretenda liberar (o una alternativa equivalente documentada y aceptada), y la aprobación humana requerida del alcance completo del PR.

No se ejecutó merge, despliegue ni otra modificación de Production.


## QA visual final del HEAD 0762d378d7ae01b54fe6a4b7fcd1e27b1dc28351 — 2026-11-12

### Checks del SHA exacto

- CI #43286571057: **PASS**.
- CI Candidate #43286571055: **PASS**; QA Deployment E2E **12/12**, Preview Deployment E2E **12/12**, Authenticated Preview Smoke **9/9**.
- Visual QA #43286571092: **96/96 PASS en dos ejecuciones**, sin fallos.
- Artefacto: `visual-qa-report` ID `13976056200`, SHA del workflow `0762d378d7ae01b54fe6a4b7fcd1e27b1dc28351`.
- Comparación visual manual de los seis screenshots nuevos (catálogo desktop/móvil, tarjeta seleccionada desktop/móvil y mapa desktop/móvil) contra los snapshots comprometidos: **PASS**. La captura actual del mapa ya no presenta el efecto lavado observado en el artefacto anterior; las diferencias residuales corresponden principalmente a contenido dinámico de tiles de OpenStreetMap y no a cambios de layout/opacity.
- Render Preview desplegó automáticamente el SHA exacto `0762d378d7ae01b54fe6a4b7fcd1e27b1dc28351`; deployment `dep-dbr0ru6iqj8c73dahtag`, estado `live`. CI autenticado validó ese mismo commit.
- Vercel Preview continúa en un SHA antiguo `40431d1a61bf59da47beeb216bf2365d12077d86`; no se disparó un deployment manual para evitar consumo de cuota.

### Estado de liberación

La asignación de `mza-trad-16` a `tenant-default` está resuelta en Production y verificada. CI, E2E y QA visual del HEAD anterior están PASS. Sigue pendiente una validación Vercel Preview same-SHA (o alternativa formalmente aceptada) y la revisión/aprobación humana del PR completo. **NO-GO para merge/release** hasta cerrar esos dos puntos.

No se modificó `main`, no se hizo merge ni se cambió Production en esta actualización.


## Auditoría de continuación autónoma — 2026-11-12 21:45 UTC

### Vercel Preview same-SHA — verificación completada

Deployment Vercel Preview `dpl_Bo3WtZp3zme4PYttjsgs2JdA6M5u`:
- Estado READY; rama `pmv-validation-candidate`.
- SHA exacto: `8418ffa0835337202d6a3866866d1bfe60ddbbee`.
- `GET /api/health`: HTTP 200; database connected; branch `br-muddy-cell-au64infb`; commit coincide con el SHA servido.
- `GET /api/supports`: HTTP 200; 28 registros. `mza-trad-16` no aparece.
- La respuesta pública de catálogo inspeccionada no contiene campos de precio/costo.
- La variable branch-specific `DATABASE_URL` de Vercel Preview existe para `pmv-validation-candidate`; su metadata indica el runtime `app_runtime_vercel_preview_v2`. No se descifró ni expuso el secreto.
- La llamada HTML a `/login` respondió HTTP 200. Esto solo prueba entrega de SPA, no autenticación funcional en navegador.

### CI del mismo SHA

- CI #43287742316: success.
- CI Candidate #43287742278: success; jobs `validate`, Authenticated Preview Smoke (Render Preview), QA Deployment E2E (Neon QA) y Preview Deployment E2E (Neon Preview) completados con éxito.
- Visual QA #43287742357: success.
- Estos E2E y smoke corresponden a Render/Neon QA/Preview; no son una ejecución browser E2E contra el deployment Vercel.
- PR #90 sigue abierto y sin merge. La lista de reviews y threads consultada no devolvió revisiones ni comentarios inline.

### Render y roles Neon

- Render service `srv-da50fdbm8hqs73b1m5pg` permanece configurado en `pmv-validation-candidate`, auto-deploy por commit, health path `/api/health`, plan Free. Último deployment consultado: `dep-dbr0v367bikc73apf8d0`, live, SHA `8418ffa0835337202d6a3866866d1bfe60ddbbee`.
- La consulta de logs de requests Render para `/api/health` no devolvió registros; por ello no se declara HTTP health PASS para Render en esta auditoría.
- El conector Render no permite leer `DATABASE_URL`. La identidad PostgreSQL efectiva de Render sigue sin confirmación concluyente; no inferirla a partir de archivos .env históricos ni de sesiones de auditoría.
- En Neon Preview, `app_runtime_preview` aún existe y tiene SELECT/INSERT/UPDATE/DELETE en `supports` y SELECT en `leads`. No se observaron sesiones de ese rol en la consulta actual.
- `app_runtime_vercel_preview_v2` tiene SELECT/INSERT/UPDATE en `supports`, sin DELETE y sin SELECT en `leads`; se observaron sesiones idle de pgbouncer.
- No se modificaron roles, grants, secretos, datos, DDL, Production ni ramas.

### Cierre

La verificación Vercel Preview same-SHA por endpoints está **PASS**. Continúan pendientes:
1. E2E browser autenticado y CRUD/Media Kit directamente contra Vercel Preview (los E2E actuales corrieron en Render/Neon).
2. Identidad y permisos efectivos de la conexión Render; no retirar ni restringir `app_runtime_preview` hasta confirmar dependencia.
3. Revisión integral del alcance amplio del PR #90 y aprobación humana.
4. Verificación final de Git Integration / Ignored Build Step con evidencia de configuración.

**NO-GO para merge/release** hasta cerrar las validaciones funcionales restantes y recibir `HUMAN GATE: APRUEBO PR #90`. No se ejecutó merge ni se modificó Production.


## Cierre de auditoría integral — 2026-11-12 21:55 UTC

### Resultado de pipelines y QA del commit candidato

Commit actual de rama: `5ad9636f5182abf3449c96524799fe86471c05f9`.
Comparación contra el commit de código servido por Vercel (`8418ffa0835337202d6a3866866d1bfe60ddbbee`): 3 commits adelante, 0 atrás; los únicos archivos modificados son este documento y `.github/workflows/ci-candidate.yml`. No cambió el código de aplicación que ejecuta el deployment Vercel.

- CI #43313906997 / run 1523: **PASS**.
- CI Candidate #43313906861 / run 1532: **PASS**.
- Visual QA #43313906745 / run 1242: **PASS**, 96/96 en bootstrap y 96/96 en validación.
- Render Preview authenticated smoke: **PASS**, 9/9.
- Neon QA deployment E2E: **PASS**, 12/12.
- Neon Preview deployment E2E en Render: **PASS**, 12/12.
- Vercel Preview deployment E2E: **PASS**, 12/12, después de corregir dos privilegios insuficientes del runtime Preview.

### Vercel Preview E2E — gate agregado

Se agregó el job `Vercel Preview E2E · Neon Preview` a `.github/workflows/ci-candidate.yml`. Se ejecuta después del E2E Render/Neon Preview para evitar escrituras concurrentes sobre la misma rama Neon.

Preflight PASS:
- Deployment `dpl_Bo3WtZp3zme4PYttjsgs2JdA6M5u`, SHA de aplicación `8418ffa0835337202d6a3866866d1bfe60ddbbee`.
- `/api/health`: HTTP 200, DB conectada, branch `br-muddy-cell-au64infb`.
- `/api/supports`: HTTP 200, 28 registros; `mza-trad-16` no se publica.
- Detalle `mza-trad-16`: HTTP 404 esperado.
- Catálogo público sin campos de precio/costo.
- `/api/admin/session` y `/api/admin/support-pricing` rechazan acceso anónimo con HTTP 401.

Primer E2E Vercel: 10/12. Los dos fallos eran permisos PostgreSQL faltantes, no errores de lógica:
- `clientes`: el flujo de Media Kit usa `SELECT ... FOR UPDATE`.
- `mediakit_request_items`: el cambio de estado de solicitud usa `SELECT ... FOR UPDATE`.

Corrección aplicada exclusivamente en Neon Preview al rol `app_runtime_vercel_preview_v2`: se revocó UPDATE a nivel de tabla y se concedió únicamente UPDATE de la columna `created_at` en esas dos tablas. La comprobación efectiva confirma UPDATE de tabla = false y UPDATE de columna `created_at` = true. No se concedió DELETE adicional ni acceso a `leads`. Reejecución del job: **12/12 PASS**.

Matriz efectiva del rol Vercel Preview:
- 14 tablas autorizadas y 6 secuencias con USAGE.
- `supports` no permite DELETE.
- `leads` no permite SELECT.
- `clientes` y `mediakit_request_items` no permiten UPDATE a nivel de tabla; solo columna `created_at`.
- No se modificó ningún dato de negocio ni Production.

### Production — runtime y datos confirmados

- Deployment Production `dpl_2niRf3aieFh7nVxVfAiQU9myGpbt`, commit `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70`, READY.
- `/api/health`: HTTP 200, DB conectada.
- Después de invocar health, `pg_stat_activity` mostró sesión de aplicación `app_runtime_prod`; el usuario `neondb_owner` observado en la misma consulta corresponde a la sesión de auditoría.
- `app_runtime_prod`: LOGIN true; SUPERUSER, CREATEDB, CREATEROLE, REPLICATION y BYPASSRLS false; DB CONNECT true/CREATE false; schema public USAGE true/CREATE false.
- Permisos: SELECT en 14 tablas, INSERT en 13, UPDATE en 10 y DELETE en 7. Sin SELECT sobre `leads`, `users` o `google_credentials`; sin UPDATE sobre `roles`; sin DELETE sobre `supports`.
- `/api/supports`: HTTP 200, 29 registros, incluye `mza-trad-16`, sin campos de precios/costos.
- `/api/supports/mza-trad-16`: HTTP 200. Su asignación Production a `tenant-default` permanece vigente.
- La variable Vercel Production `DATABASE_URL` está limitada a Production y su metadata identifica `app_runtime_prod`. La afirmación histórica de que Production usaba `neondb_owner` queda **superada** por esta verificación en vivo.

### Render Preview — identidad y riesgo de privilegios

- Último deployment Render `dep-dbr38e9i3sns73ev6mjg`: **LIVE**, commit `5ad9636f5182abf3449c96524799fe86471c05f9`.
- Render confirmó tres respuestas consecutivas con health OK, DB conectada, branch esperado `br-muddy-cell-au64infb` y asset del candidato. El smoke autenticado pasó 9/9.
- La identidad PostgreSQL efectiva está confirmada: `app_runtime_preview`. Se observaron seis sesiones idle de ese rol tras el despliegue; las consultas registradas incluyen tablas de precios, soporte técnico y medios.
- Riesgo P1: `app_runtime_preview` tiene SELECT, INSERT, UPDATE y DELETE sobre las 36/36 tablas públicas (144 grants), además de 12 secuencias. Incluye tablas sensibles como `users`, `roles`, `permissions`, `google_credentials` y `leads`.
- El rol no es superuser, no puede crear bases/roles, no tiene replication ni BYPASSRLS y no posee membresías de otros roles. Sin embargo, ninguna de las 36 tablas tiene RLS habilitado.
- No se cambiaron los grants de Render ni su `DATABASE_URL`. La autorización disponible para el workspace Render fue de solo lectura. La matriz de 14 tablas de `app_runtime_vercel_preview_v2` sirve como base validada para una reducción controlada, pero requiere autorización expresa antes de modificar permisos del runtime Render.

### Datos de inventario y aislamiento

- Production: 29 soportes publicados; `mza-trad-16` asignado a `tenant-default`.
- Preview: 46 soportes, 28 con tenant asignado y 18 con `tenant_id=NULL`. Los 18 permanecen en cuarentena; no se publican. `mza-trad-16` sigue sin tenant en Preview y devuelve 404.
- No se reasignaron soportes ni se modificaron datos durante esta auditoría.

### Integración Vercel / Git

- Los deployments Vercel consultados identifican `githubOrg=popnegro-org`; `get_git_deployment_context` devuelve un vínculo con `org=popnegro`. La evidencia confirma un vínculo obsoleto: el proyecto apunta al namespace anterior `popnegro`, mientras el repositorio activo es `popnegro-org`. El conector no ofrece operación para reconectar el proyecto.
- No apareció un nuevo deployment Vercel para los commits documentales/CI; el deployment validado sigue sirviendo el SHA de aplicación `8418ffa...`, cuyo código no difiere del candidato actual.
- El conector disponible no expone la configuración efectiva de Git Integration ni `Ignored Build Step`. Por lo tanto, ambos controles siguen **pendientes de evidencia directa**; no se modificó esa configuración.

### Estado de PR y decisión

- PR #90 permanece abierto, sin reviews ni comentarios inline registrados en la consulta final.
- No se hizo merge, no se modificó `main` ni se alteró Production durante esta continuación.
- La validación funcional automatizada de Render, Neon QA, Neon Preview, Vercel Preview y Visual QA queda **PASS**.
- El PMV sigue **NO-GO para merge** hasta resolver: (1) reducción de privilegios de `app_runtime_preview` en Neon Preview, (2) reconexión verificable de Git Integration y revisión de `Ignored Build Step`, y (3) revisión humana del alcance de 586 commits y Human Gate de PR #90.

Los 18 soportes Preview sin tenant **no son un bloqueo de PMV mientras permanezcan en cuarentena**: 17 están inactivos y 1 activo (`mza-trad-16`). Los 28 soportes con ownership documentado forman el catálogo publicable. Production incluye `mza-trad-16` en `tenant-default` por autorización explícita; Preview conserva esa fila en cuarentena. No alterar Preview para forzar paridad sin autorización independiente.
- La reducción de grants Render no se ejecutó. Requiere autorización específica antes de revocar los privilegios actuales. El merge de PR #90 sigue sujeto a `HUMAN GATE: APRUEBO PR #90`.


## Auditoría de alcance del PR #90 — 2026-11-12 22:02 UTC

- Base `main`: `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70` (coincide con el commit Production verificado).
- HEAD `pmv-validation-candidate`: `73dc65e1ead6e4c36ffca7ab122dec642bef7467`.
- Comparación GitHub: **586 commits adelante, 0 atrás**.
- Reviews: ninguna. Review threads: ninguno.
- El PR contiene cambios extensos de backend, frontend, base de datos, contratos, tests, workflows y documentación. No es un cambio pequeño de mantenimiento.
- El HEAD candidato pasó CI, CI Candidate y Visual QA; eso valida el estado técnico de los jobs, pero no sustituye la revisión humana del alcance de 586 commits.
- **NO-GO para merge**: no compactar, rebasear, cambiar base ni dividir el PR sin decisión expresa. Mantener `main` intacta y exigir revisión del diff completo antes del Human Gate de merge.

### Reconciliación final de Git Integration Vercel

La lectura de `get_git_deployment_context` identifica el vínculo del proyecto Vercel `prj_LocmTWT0E6LyQ2p0dtGRsUmDj54m` como `popnegro/grupo-comunicarte-refactoring`, mientras que el repositorio candidato y los metadatos de deployments son `popnegro-org/grupo-comunicarte-refactoring`. El namespace `popnegro-org` sí aparece accesible en la instalación GitHub de Vercel con rol admin; no existe una acción de reconexión de repositorio en los conectores disponibles.

Acción manual pendiente en Vercel: Settings → Git → reconectar el proyecto existente a `popnegro-org/grupo-comunicarte-refactoring`, preservando el proyecto, dominios y variables actuales. Después verificar Production Branch `main`, Preview deployments y `Ignored Build Step`. No crear un segundo proyecto ni mover dominios como workaround.
