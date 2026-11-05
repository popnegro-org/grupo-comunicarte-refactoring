# Estado del bloqueante P0 — aislamiento multi-tenant

> Contrato normativo: [PMV-CONTRACT-AND-ACCEPTANCE.md](../PMV-CONTRACT-AND-ACCEPTANCE.md). Conciliación documental y de datos: [TENANT-OWNERSHIP-MAPPING.md](../inventario/processed/TENANT-OWNERSHIP-MAPPING.md).

**Estado: ownership de inventario conciliado; cuarentena pública en código; revalidación de ownership al avanzar solicitudes implementada (PR #96 / `pmv/p0-ownership-quarantine-gate`). Falta QA transaccional Neon Preview de la matriz ownership, QA autenticado Media Kit y pruebas negativas de seguridad en el SHA liberable.**

## Decisiones vigentes
- Conservar el único administrador/credencial existente; no crear usuarios ni invitaciones.
- El administrador autenticado tiene alcance global sobre `tenant-ba` y `tenant-default`; no hay usuarios tenant-scoped en el PMV.
- El catálogo público es global para ambos tenants; `tenant_id` representa ownership operativo/comercial, no autorización individual.
- Solicitudes mixtas: cabecera global, ítems tenant-scoped.
- Ownership solo se asigna por correspondencia inequívoca con los PDFs fuente versionados.
- Registros no conciliados conservan `tenant_id = NULL` y deben permanecer en cuarentena.
- `main` y Neon Production permanecen intactos hasta aprobación explícita.
- Preview runtime usa `neondb_owner` con `rolbypassrls=true`; RLS no está activo ni se considera protección efectiva. Queda diferido hasta introducir usuarios tenant-scoped y rol DB sin BYPASSRLS.

## Fuente autoritativa localizada
Los PDFs de `docs/inventario/source/` son la fuente primaria. La matriz de conciliación está en `docs/inventario/processed/TENANT-OWNERSHIP-MAPPING.md`.

Mapeo:
- 10 `bue-trad-01..10` → `tenant-ba`.
- 15 `mza-trad-01..15`, 2 `mza-led-01..02`, 1 `mza-led-movil-01` → `tenant-default`.
- `mza-trad-16`, registros de prueba y legacy sin correspondencia → sin asignar.

## Estado Neon Preview posterior a conciliación
- `supports`: 46 filas; 10 tenant-ba, 18 tenant-default, 18 NULL (17 inactivas y 1 activa sin fuente).
- `mediakit_request_items`: 32 filas; 5 tenant-ba, 25 tenant-default, 2 NULL.
- `mediakit_requests`: 18 cabeceras; 2 mixtas conciliadas con scope global, 14 homogéneas con scope tenant y 2 sin scope. Una de estas últimas combina ítems de ambos tenants y un ítem pendiente.
- No se modificaron importes, disponibilidad ni contenido comercial.
- No se modificó Production.

## Incorporado
- Revalidación transaccional de ownership al avanzar solicitudes a cotizada/enviada/cerrada (`updateRequestStatusByAdmin`): locks de cabecera, ítems y soportes en orden estable; comparación `item.tenant_id` vs `supports.tenant_id` fail-closed (`areRequestItemOwnershipsConsistent`).
- Helpers de elegibilidad comercial para alta de solicitud (`isSupportSelectableForCommercialRequest`, `areLockedSupportsCommerciallyEligible`) y locks ordenados en `handleMediakitRequest`.
- Plan HUMAN GATE y matriz QA Preview: `docs/pmv/HUMAN_GATE_VALIDATION.md`, `docs/pmv/QA-OWNERSHIP-REVALIDATION-PREVIEW.md`.

- Primitivas fail-closed en `src/server/tenantAccess.ts` y tests unitarios en `tests/unit/tenant-access.test.ts`.
- Conciliación exacta por `canonical_id` con PDFs maestros.
- Asignación de 28 soportes y 30 ítems históricos únicamente en Neon Preview.
- Clasificación de solicitudes mixtas conciliadas globales y homogéneas tenant-scoped; las solicitudes mixtas con ítems pendientes permanecen sin scope.
- Catálogo público devuelve 28 soportes asignados; `mza-trad-16` (activo sin evidencia) responde 404 en detalle y no puede generar solicitud pública.
- Solicitudes nuevas bloquean ownership pendiente en la transacción y guardan `tenant_id` en cada ítem.
- Media Kits guardan tenant por cabecera cuando son mono-tenant y por línea cuando son mixtos; validación bloquea soportes pendientes y exige duración estándar para estado listo/enviado. La transición a listo/enviado revalida soportes, disponibilidad y consistencia tenant de cabecera/líneas dentro de una transacción con orden de locks consistente. Migración `mediakit_items.tenant_id` aplicada en Preview con 0 filas existentes.
- Los constructores limitan duraciones a 7, 15, 21 días y mensual; metadatos legacy no estándar quedan sin seleccionar y requieren revisión.

## Bloqueantes P0/P1 pendientes

La idempotencia de solicitudes ya está implementada y verificada con dos POST concurrentes (201 + 200 duplicate), una cabecera y un ítem; los datos de prueba fueron eliminados.
1. Pruebas negativas de tenant spoofing, IDOR y acceso no autenticado a endpoints admin.
2. QA funcional autenticada de Media Kit: persistencia `tenant_id` en cabecera/líneas y selección multi-tenant.
3. Confirmar que solicitudes con ítems pendientes no puedan cotizarse ni exportarse; el cambio de estado a cotizada/enviada/cerrada ahora revalida ownership bajo bloqueo transaccional y responde 409 cuando hay ítems pendientes.
4. Pruebas de privacidad de pricing en API y rutas de recuperación; PDF y PPT ya tienen regresión automatizada que confirma ausencia de tarifas base sin monto global aprobado.

## Condición de desbloqueo
Los 28 soportes con correspondencia inequívoca ya están conciliados. Los 18 sin fuente (17 inactivos y 1 activo) permanecen `tenant_id = NULL`, excluidos del catálogo público y de nuevas solicitudes. No se debe inventar ownership. El administrador es global en esta versión; RLS se difiere porque el rol runtime Preview tiene BYPASSRLS y no existen identidades tenant-scoped.

**No ejecutar** backfill, DDL ni cambios de datos en Production; no cambiar credenciales; no crear usuarios; no mergear a `main` sin HUMAN GATE.
