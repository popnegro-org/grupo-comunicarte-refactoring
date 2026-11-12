# Control operativo — Grupo Comunicarte OOH

**Verificado:** 2026-11-12
**Repo:** popnegro-org/grupo-comunicarte-refactoring
**Rama única:** pmv-validation-candidate
**HEAD:** consultar el SHA actual del PR #90; este documento no fija un hash estático para evitar evidencia obsoleta.
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
- más de 500 commits ahead, 0 behind. El snapshot del diff en HEAD 5920862: 153 archivos, 11.961 adiciones y 1.837 eliminaciones. El contador cambia con cada commit.
- No integrar ramas históricas completas, no crear otra rama de integración, no reescribir la historia candidata.
- PR #90 permanece como gate de release; el diff requiere auditoría de alcance antes de merge.
- main, Neon Production, Vercel Production, DNS/WAF y secretos productivos no se modifican.

## 5. Calidad del HEAD

- Lint/typecheck local: PASS.
- Unit tests locales: 102/102 PASS.
- Build local: PASS.
- Dependency audit production (npm audit --omit=dev --audit-level=high): 0 vulnerabilidades.
- Visual QA local: 96/96 PASS, 0 FAIL, 0 SKIPPED, 0 flaky.
- Las 7 omisiones históricas eran guardas de viewport; ahora cada caso se ejecuta en su viewport objetivo también desde el otro proyecto.
- Los workflows remotos, E2E autenticado 12/12 y C1–C6 deben repetirse en el SHA generado por el siguiente commit; los PASS previos pertenecen a HEAD 5920862 y no se trasladan automáticamente.

## 6. Auditoría de alcance y seguridad

- Escaneo del diff: no se encontraron tokens, claves privadas ni URLs/credenciales Neon hardcodeadas. .env.example contiene solo nombres de variables vacías.
- Se retiró código de autorización por memberships no utilizado y la lectura diagnóstica de app.tenant_id; el modelo runtime queda en el administrador global único.
- Catálogo, cotizador y selección pública excluyen ownership NULL; validaciones transaccionales de solicitud y Media Kit rechazan soportes sin ownership.
- Las rutas que consultan inventario sin asignación están protegidas por requireAdmin y se usan para conciliación/operación administrativa; no son endpoints públicos.
- Las 18 filas de cuarentena y mza-trad-16 no se modificaron. No se ejecutó SQL ni DDL en esta iteración.
- La migración 20261109_production_ownership_and_login_rate_limit.sql es un registro histórico que declara aplicación en Production; no debe reproducirse en el release candidate. La afirmación debe cotejarse con el ledger antes de cualquier re-ejecución.
- El PR conserva un diff amplio (>500 commits ahead); no se recomienda merge automático. main y Production siguen fuera del alcance.

## 7. Próximas acciones

1. Confirmar CI Candidate, Visual QA y E2E autenticado en el SHA nuevo.
2. Verificar Preview/QA del mismo SHA y adjuntar evidencias.
3. Mantener PR #90 NO-GO hasta revisión humana del alcance y confirmación del estado de la migración histórica.
4. Solicitar HUMAN GATE explícito; no mergear ni promover automáticamente.
