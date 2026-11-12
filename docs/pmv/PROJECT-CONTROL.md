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
