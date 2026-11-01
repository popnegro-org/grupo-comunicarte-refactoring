# Estado del bloqueante P0 — aislamiento multi-tenant

> El contrato normativo vigente y los criterios de aceptación están en [PMV-CONTRACT-AND-ACCEPTANCE.md](../PMV-CONTRACT-AND-ACCEPTANCE.md). Este archivo reemplaza el informe inicial, que contenía decisiones pendientes ya resueltas.

**Estado: BLOCKED para liberar; implementación técnica aún pendiente.**

## Decisiones vigentes
- Conservar el único administrador/credencial existente; no crear usuarios ni invitaciones.
- El administrador autenticado tiene alcance global sobre `tenant-ba` y `tenant-default`.
- Solicitudes mixtas: cabecera global, ítems tenant-scoped.
- Soportes sin evidencia autoritativa: `tenant_id = NULL`, en cuarentena.
- Solicitudes históricas mixtas no se dividen ni atribuyen retroactivamente.
- `main` y Neon Production permanecen intactos hasta aprobación explícita.

## Evidencia de la auditoría Preview (instantánea histórica)
- `supports`: 46 registros sin ownership asignado en la instantánea.
- `mediakit_request_items`: 32 ítems sin tenant.
- `mediakit_requests`: 18 cabeceras sin scope.
- Tres solicitudes históricas contienen soportes de ambos tenants.
- Diez soportes inactivos carecen de ciudad; no se puede inferir ownership.
- La tabla legacy `screens` no proporciona un join fiable para atribuir las filas de `supports`.

Revalidar estos conteos antes de cualquier migración; no son una consulta en vivo.

## Incorporado
- Primitivas fail-closed en `src/server/tenantAccess.ts` y tests unitarios en `tests/unit/tenant-access.test.ts`.
- Propuestas de migración aditiva documentadas en `docs/pmv/proposals/`; no equivalen a migración en Production.
- Limitador de login distribuido validado previamente en Preview.

## Bloqueantes pendientes
1. Ownership autoritativo de soportes; no hacer backfill por ciudad, nombre, coordenadas o IDs legacy.
2. Filtros tenant-safe en todos los servicios y rutas de negocio.
3. Aislamiento de pricing, Media Kits, solicitudes, estadísticas, media, rutas, CRUD y exportaciones.
4. Tratamiento seguro de solicitudes mixtas e idempotencia.
5. Pruebas negativas cross-tenant con el rol/contexto DB real de runtime y decisión documentada de RLS.
6. Cuarentena efectiva de registros pendientes en catálogo y flujo comercial.

## Condición para desbloquear
Implementar acceso comercial denegado por defecto para registros sin ownership, asignación manual auditada y pruebas de aislamiento por tenant. Asignar cada soporte solo cuando exista evidencia comercial. No inferir ni inventar esa evidencia.

**No ejecutar** backfill, DDL ni cambios de datos en Production; no cambiar credenciales; no crear usuarios; no mergear a `main` sin HUMAN GATE.
