# Control operativo — Grupo Comunicarte OOH

**Verificado:** 2026-11-12
**Repo:** popnegro-org/grupo-comunicarte-refactoring
**Rama única:** pmv-validation-candidate
**HEAD:** 0df24b297a9bc18145cae55add63681932e18331
**PR:** [#90](https://github.com/popnegro-org/grupo-comunicarte-refactoring/pull/90) — abierto, sin merge.
**Production:** intacta.

## 1. Inventario oficial: 28 soportes

Fuente primaria: tres PDFs en docs/inventario/source/. Mapping: docs/inventario/processed/TENANT-OWNERSHIP-MAPPING.md.

| Plaza | Tradicionales | Pantallas LED | LED móvil | Total |
|---|---:|---:|---:|---:|
| Buenos Aires | 10 | 0 | 0 | 10 |
| Mendoza | 15 | 2 | 1 | 18 |
| **Total** | **25** | **2** | **1** | **28** |

Las caras de una posición física no multiplican el conteo.

Neon QA y Preview tienen 46 filas supports: 28 asignadas/documentadas y 18 sin tenant en cuarentena. Las 18 son filas históricas, QA, legacy o sin evidencia; no forman parte del inventario comercial. mza-trad-16 permanece active=true sin ownership, pero está bloqueada por backend. No borrar las 18 filas para forzar el conteo.

## 2. Modelo funcional simple

- Un administrador global existente.
- tenant-ba representa ownership comercial de Buenos Aires; tenant-default representa Mendoza.
- Tipologías: tradicional, led (pantallas LED), led_movil.
- tenant_id no es una frontera de autorización individual.
- No crear usuarios tenant-scoped, membresías, tenant context SQL ni RLS para este PMV.
- Ownership solo por canonical ID y evidencia PDF; no inferir por ciudad.
- Sin ownership: no publicar, reservar, cotizar ni incluir en Media Kit.

## 3. Neon: un proyecto, tres ramas

Proyecto: mute-math-07036388.

| Uso | Rama | ID |
|---|---|---|
| Production | main | br-wandering-sky-aunq6lad |
| Preview | preview/pmv-validation-candidate | br-muddy-cell-au64infb |
| QA | qa/pr96-ownership-20261105 | br-bold-block-aua43ua0 |

No crear un proyecto por plaza ni ramas permanentes por feature. No borrar ni resetear ramas existentes.

### Runtime verificado

| Servicio | Rol DB | Branch | BYPASSRLS | CREATE DB/schema | Bootstrap |
|---|---|---|---:|---:|---:|
| QA | app_runtime_qa_login | QA | false | false / false | OFF |
| Preview | app_runtime_preview | Preview | false | false / false | OFF |

Ambos roles tienen superuser=false. RLS está deshabilitado en ambas ramas y app.tenant_id no está configurado. Es coherente con el administrador global único. Los roles tienen DML sobre las tablas de su rama (37/37 y 36/36), sin permisos CREATE. Las migraciones no se ejecutan al iniciar el servidor.

### Diferencia de esquema

QA tiene integration_outbox; Preview no. No se encontraron referencias runtime en el código. No crearla a ciegas. Si se incorpora una integración que la use, versionar migración y aplicarla en QA y Preview antes del código dependiente.

Los dos servicios Render comparten Environment ID, pero tienen IDs de servicio distintos y conexiones Neon verificadas distintas. El aislamiento de variables a nivel Environment no se declara certificado.

## 4. Control de integración

- Una sola rama activa: pmv-validation-candidate.
- Un único PR abierto: #90 hacia main.
- 548 commits ahead, 0 behind; 152 archivos, 11.815 adiciones, 1.837 eliminaciones.
- No integrar ramas históricas completas, no crear otra rama de integración, no reescribir la historia candidata.
- PR #90 permanece como gate de release; el diff requiere auditoría de alcance antes de merge.
- main, Neon Production, Vercel Production, DNS/WAF y secretos productivos no se modifican.

## 5. Calidad del HEAD

- CI general: PASS.
- CI Candidate: E2E 12/12 PASS en QA y Preview, sin flaky.
- C1–C6: PASS.
- Visual QA: 75 PASS, 14 FAIL y 7 SKIPPED. Los 14 fallos son de contraste en siete rutas desktop/mobile.
- PMV no está listo para release hasta corregir contraste, resolver skips y auditar el diff.

## 6. Próximas acciones

1. Corregir 14 errores WCAG y resolver 7 SKIPPED.
2. Auditar el diff completo de PR #90 por alcance, secretos, migraciones y regresiones.
3. Repetir CI, QA, E2E, Visual QA y smoke en el SHA final.
4. Actualizar evidencias y solicitar HUMAN GATE para merge/promoción.