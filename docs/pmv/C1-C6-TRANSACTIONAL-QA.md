# Matriz transaccional C1–C6 — Neon QA

**Rama de código:** pmv-validation-candidate  
**Base de datos:** Neon QA qa/pr96-ownership-20261105 (br-bold-block-aua43ua0)  
**Producción:** no utilizada.

## Alcance y reglas

Las pruebas usan solicitudes sintéticas ya existentes en Neon QA. No se desactivan constraints, no se ejecuta DDL, no se cambia ownership comercial real y no se modifica Production.

El esquema QA contiene:
- mediakit_request_items_support_tenant_fkey: FK compuesta (support_id, tenant_id) → supports(canonical_id, tenant_id), ON UPDATE RESTRICT ON DELETE RESTRICT.
- fk_mediakit_request_items_support: FK support_id → supports(canonical_id), ON DELETE CASCADE.
- FK de cada línea a su solicitud.

Un drift o soporte huérfano no puede persistirse legítimamente en este esquema. Por eso C2/C5 combinan el guard fail-closed de dominio (unit test) con una prueba de rechazo transaccional de la FK en Neon QA; no se fuerza un estado corrupto desactivando constraints.

## Evidencia Neon QA — 2026-11-11

Se ejecutó un único bloque DO dentro de Neon QA que intentó, en subtransacciones con manejo de foreign_key_violation:

1. C2: insertar una línea para bue-trad-05 (ownership real tenant-ba) con tenant_id='tenant-default'. La FK compuesta rechazó la operación.
2. C5: insertar una línea con support_id='qa-support-orphan-c5-does-not-exist'. La FK de soporte rechazó la operación.

El bloque terminó correctamente; si cualquiera de las inserciones hubiese sido aceptada, el bloque habría fallado explícitamente. Consulta posterior confirmó:
- orphan_probe_rows = 0
- drift_probe_rows = 0

Los dos probes no dejaron filas persistidas ni alteraron los registros QA preexistentes.

## Guards de dominio

En tests/unit/tenant-access.test.ts:
- C2: areRequestItemOwnershipsConsistent rechaza itemTenantId distinto de supportTenantId.
- C5: la ausencia del soporte se representa como supportTenantId=null y el guard rechaza la línea.
- La suite completa valida además ownership NULL, lista vacía y pares tenant consistentes.

## E2E transaccional autenticado

tests/deployment/deployment-smoke.spec.ts ejecuta contra Render QA y Neon QA:
- C1: transición válida de la solicitud sintética con línea bue-trad-05 (tenant-ba) a quoted; confirma 200 y restaura pending.
- C3: intento de avanzar una solicitud cuya línea tiene tenant_id=NULL a enviado; espera 409 y comprueba que el estado persistido sigue pending.
- C4: intento de cerrar una solicitud sin líneas; espera 409 y comprueba que el estado persistido sigue pending.
- C6: dos PATCH concurrentes sobre una misma solicitud; acepta únicamente respuestas de dominio esperadas (200/409), verifica el estado persistido final (quoted o closed) y restaura/lee pending.

C2/C5 se cubren en Neon QA mediante rechazo de constraints y guards unitarios, dado que sus estados corruptos son incompatibles con las FK activas. No se deshabilitan constraints para probarlos.

## Resultado de código local

- npm run lint: PASS.
- npm run test:unit: 107/107 PASS.
- npm run build: PASS.

**Estado de cierre:** C2 y C5 tienen evidencia de rechazo transaccional Neon QA + guards de dominio. C1/C3/C4/C6 requieren que el workflow autenticado QA Deployment E2E · Neon QA pase sobre el SHA final; hasta entonces la matriz integral no se declara cerrada.
