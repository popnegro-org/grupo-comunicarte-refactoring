# Estado del bloqueante P0 — aislamiento multi-tenant

> Contrato normativo: [PMV-CONTRACT-AND-ACCEPTANCE.md](../PMV-CONTRACT-AND-ACCEPTANCE.md). Conciliación documental y de datos: [TENANT-OWNERSHIP-MAPPING.md](../inventario/processed/TENANT-OWNERSHIP-MAPPING.md).

**Estado: P0 parcialmente resuelto en Preview; aislamiento de runtime aún bloquea el PMV.**

## Decisiones vigentes
- Conservar el único administrador/credencial existente; no crear usuarios ni invitaciones.
- El administrador autenticado tiene alcance global sobre `tenant-ba` y `tenant-default`.
- Solicitudes mixtas: cabecera global, ítems tenant-scoped.
- Ownership solo se asigna por correspondencia inequívoca con los PDFs fuente versionados.
- Registros no conciliados conservan `tenant_id = NULL` y deben permanecer en cuarentena.
- `main` y Neon Production permanecen intactos hasta aprobación explícita.

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
- Primitivas fail-closed en `src/server/tenantAccess.ts` y tests unitarios en `tests/unit/tenant-access.test.ts`.
- Conciliación exacta por `canonical_id` con PDFs maestros.
- Asignación de 28 soportes y 30 ítems históricos únicamente en Neon Preview.
- Clasificación de solicitudes mixtas conciliadas globales y homogéneas tenant-scoped; las solicitudes mixtas con ítems pendientes permanecen sin scope.

## Bloqueantes P0 pendientes
1. Filtros tenant-safe en todos los servicios y rutas de negocio.
2. Aislamiento de pricing, Media Kits, solicitudes, estadísticas, media, rutas, CRUD y exportaciones.
3. Cuarentena efectiva de las 18 filas de soporte sin tenant y 2 ítems sin tenant en catálogo y operaciones comerciales.
4. Pruebas negativas cross-tenant con el rol/contexto DB real de runtime y decisión documentada de RLS.
5. Verificar que las solicitudes con ítems pendientes no puedan cotizarse ni exportarse hasta su conciliación.

## Condición para desbloquear
Implementar acceso comercial denegado por defecto para registros sin ownership, aplicar filtros de tenant en backend y probar aislamiento por tenant. La evidencia documental ya permite conciliar 28 soportes; los demás requieren una fuente comercial adicional o deben permanecer en cuarentena.

**No ejecutar** backfill, DDL ni cambios de datos en Production; no cambiar credenciales; no crear usuarios; no mergear a `main` sin HUMAN GATE.
