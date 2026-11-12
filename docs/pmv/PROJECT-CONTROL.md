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

### Triggers de ownership ya presentes

La migración de herencia de ownership fue aplicada previamente en QA y Preview. En ambas ramas están habilitados:
- `mediakit_request_items_tenant_inheritance` → `enforce_mediakit_request_item_tenant`.
- `supports_tenant_ownership_immutable` → `prevent_support_tenant_reassignment`.

Las líneas históricas sin tenant permanecen pendientes; no inferir ni asignar ownership automáticamente. **En esta continuación no se ejecutó DDL ni se modificaron datos.**

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

**Visual QA CI:** run [43157492346](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43157492346) — **96/96 PASS, 0 FAIL, 0 SKIPPED**. El log confirma dos ejecuciones completas de 96 tests. Se generaron únicamente snapshots faltantes; `git diff --exit-code -- tests/visual/__snapshots__` confirmó que no se sobrescribieron snapshots comprometidos.

**Límite de baseline:** los seis snapshots nuevos fueron generados en la rama candidata por el bootstrap; no constituyen comparación contra un baseline histórico confiable. Mantener revisión visual humana de esos artefactos antes del release.

## 6. CI y E2E del SHA de código validado

SHA de código: `8270b541ae4ff65c8eecf2b46e50365441d8059c`.

| Workflow | Run | Resultado |
|---|---:|---|
| CI | [43157492264](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43157492264) | PASS |
| CI Candidate | [43157492285](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43157492285) | PASS |
| Visual QA | [43157492346](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43157492346) | PASS — 96/96 |

CI Candidate confirma typecheck, unit tests, build, bundle budget y dependency audit. E2E autenticado: QA **12/12 PASS**, Preview **12/12 PASS** (incluye bucket R2 aislado); Preview authenticated smoke **9/9 PASS**. C1–C6 constan como PASS en `docs/pmv/C1-C6-TRANSACTIONAL-QA.md`.

## 7. Auditoría DevSecOps y alcance del PR

Diff actual respecto de `main`: **552 commits ahead / 0 behind; 156 archivos, +11.947 / -2.158 líneas**.

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
- Media Kit vuelve a comprobar ownership al guardar y al avanzar a ready/sent.
- Las consultas que incluyen registros sin asignar se usan en estadísticas, conciliación y vistas administrativas protegidas por `requireAdmin`.
- No se encontró `DELETE`/ `TRUNCATE` sobre `supports` en las migraciones revisadas; la baja de soporte en backend es soft-delete mediante `active=false`.
- No se creó `integration_outbox` en Preview, ni se crearon usuarios tenant-scoped, membresías o políticas RLS durante esta continuación.

**Alcance:** 552 commits y 156 archivos representan un diff amplio, no atómico. Requiere revisión humana de alcance antes de merge; no habilitar automerge.

## 8. Próximas condiciones para HUMAN GATE

1. Repetir/verificar los workflows en el HEAD final del PR después de las correcciones documentales.
2. Revisar visualmente los seis snapshots nuevos en desktop/mobile; la suite automatizada pasa, pero no tiene baseline histórico independiente para esos artefactos.
3. Revisar el diff completo de 156 archivos y el registro histórico de la migración Production; no replay.
4. Verificar por separado la identidad runtime y la política de acceso de Neon Production.
5. Mantener PR #90 abierto y sin merge hasta aprobación explícita: `HUMAN GATE: APRUEBO PR #90`.

**Guardrails:** no merge, no force-push, no rebase, no ramas nuevas, no DDL, no modificaciones de datos QA/Preview/Production ni cambios productivos sin autorización humana explícita.
