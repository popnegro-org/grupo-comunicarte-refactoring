# Línea única de integración — Grupo Comunicarte OOH

**Repositorio:** popnegro-org/grupo-comunicarte-refactoring
**Rama de integración:** pmv-validation-candidate
**PR de release:** #90 → main
**HEAD auditado:** 0df24b297a9bc18145cae55add63681932e18331
**Estado:** integración activa; release NO-GO.

## Reglas

1. pmv-validation-candidate es la única línea de integración del PMV.
2. No crear ramas paralelas, no force-push, reset ni rebase destructivo.
3. No integrar ramas históricas completas (#85–#89, canonical-refinement ni ramas UX/UI paralelas). Recuperar solo cambios puntuales tras revisar diff y tests.
4. PR #90 es el único PR abierto y permanece como gate de release, no como autorización de merge.
5. main, Neon Production, Vercel Production, DNS/WAF y secretos productivos no se modifican.
6. Cada commit requiere CI, typecheck, unit, build y CI Candidate. Cambios runtime requieren QA y Preview en el SHA exacto.
7. HUMAN GATE para merge, promoción, acciones destructivas/irreversibles y comunicaciones reales.

## Arquitectura mínima

- Un proyecto Neon: mute-math-07036388.
- Tres ramas: main (Production), preview/pmv-validation-candidate (Preview), qa/pr96-ownership-20261105 (QA).
- Render QA conecta a Neon QA; Render Preview conecta a Neon Preview.
- No crear una base por plaza. Los dos tenants representan ownership comercial de Buenos Aires y Mendoza.
- Administrador global único; sin RLS ni tenant context SQL en este PMV.

## Inventario

28 soportes: Buenos Aires 10 tradicionales; Mendoza 15 tradicionales, 2 pantallas LED y 1 LED móvil. Las 18 filas sin tenant de Neon son cuarentena histórica/QA, no catálogo.

## Estado al 2026-11-12

- Candidata: 548 commits ahead, 0 behind; PR #90: 152 archivos, 11.815 adiciones y 1.837 eliminaciones.
- Un único PR abierto (#90), sin merge.
- CI Candidate: QA E2E 12/12 PASS en QA y Preview, sin flaky.
- Visual QA: 75 PASS, 14 FAIL de contraste en siete rutas desktop/mobile, 7 SKIPPED.
- El tamaño del diff requiere revisión integral antes de release; tests verdes no equivalen a autorización de merge.

## Secuencia

1. Corregir 14 errores WCAG y resolver 7 SKIPPED.
2. Auditar el diff completo de PR #90 por alcance, secretos, migraciones y regresiones.
3. Repetir CI, QA, E2E y Visual QA en el SHA final.
4. Actualizar evidencias y solicitar HUMAN GATE.
