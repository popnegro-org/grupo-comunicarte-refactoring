# Aislamiento multi-tenant — decisión e implementación incremental

## Decisiones confirmadas

1. **Usuario actual:** conservar exclusivamente el único usuario/credencial ya creado (ADMIN_USER/ADMIN_PASSWORD). No crear usuarios, invitaciones ni exigir nuevas membresías para iniciar sesión.
2. **Alcance administrativo actual:** el único administrador autenticado administra ambos tenants y puede coordinar solicitudes comerciales globales. El alcance global no elimina la obligación de asociar cada soporte, Media Kit, precio y trabajo operativo al tenant correspondiente.
3. **Solicitudes mixtas:** se permite una solicitud comercial global como operación principal. Sus ítems y operaciones derivadas deben quedar asociados explícitamente a un tenant.
4. **Soportes sin ciudad:** cuarentena (pending). No se infiere la propiedad por ciudad, nombre, coordenadas ni identificador. La asignación requiere evidencia y auditoría humana.
5. **Identidad futura:** el modelo de membresías queda preparado para una futura migración a identidad individual, pero no forma parte del requisito de acceso del usuario único actual.

## Cambios incorporados en esta rama

- src/server/tenantAccess.ts: primitivas fail-closed para membresías futuras y resolver del administrador único detrás de autenticación backend.
- tests/unit/tenant-access.test.ts: cobertura de identidad ausente, membresías inactivas, suplantación de tenant, membresías múltiples, administración global, compatibilidad del administrador único y cuarentena.
- docs/pmv/proposals/20261101_001_tenant_ownership.sql: propuesta SQL aditiva, no ejecutada. Agrega ownership nullable a soportes e ítems de solicitudes, y clasificación nullable de solicitud global/tenant. Los registros históricos permanecen sin asignar.

## Auditoría del runtime (código actual)

- requireAdmin en server.ts valida el token compartido actual. No resuelve ni aplica contexto tenant; el administrador existente opera globalmente.
- GET/POST/PATCH/DELETE /api/admin/supports*, endpoints de media y pricing están protegidos por requireAdmin, pero los servicios no filtran por tenant.
- GET /api/admin/stats, /api/admin/requests y operaciones de Media Kit consultan el conjunto completo.
- GET /api/supports, GET /api/supports/:id y el envío público de solicitudes usan catálogo sin ownership tenant.
- supports y mediakit_request_items no tienen actualmente columna de ownership en el schema TypeScript. mediakit_requests tampoco tiene scope.
- Las tres solicitudes históricas mixtas no pueden atribuirse a un único tenant. Los diez soportes inactivos sin ciudad permanecen sin asignación.
- La autenticación actual usa un principal compartido; no existe atribución individual por usuario.

## Límites deliberados

No se conectan aún los resolvers tenant a rutas de negocio porque no existe una fuente verificada de ownership para todos los registros. No se ejecuta SQL, migración, backfill, activación RLS, cambio de credenciales, despliegue, ni modificación de main o datos productivos.

La propuesta SQL no es una migración operativa lista para ejecutar: antes hay que verificar el contrato de la tabla tenants, el rol DB de runtime, la ruta de migraciones del proyecto y los tipos de datos/constraints reales de Neon.

## Secuencia obligatoria antes de activar aislamiento efectivo

1. Obtener una fuente de verdad de ownership de cada soporte; los registros sin evidencia permanecen NULL/pending.
2. Incorporar propiedad explícita en soportes y cada ítem de solicitud/Media Kit.
3. Modelar solicitudes globales como cabecera comercial con ítems tenant-scoped. El scope global no habilita acceso transversal implícito a pricing, inventario ni Media Kits.
4. Auditar filtros tenant-scoped en todos los servicios CRUD, estadísticas, solicitudes, Media Kits, medios, rutas, exportaciones y precios.
5. Probar RLS con el mismo rol de aplicación que usa runtime, no con el owner de tablas.
6. QA: administrador único conserva ambos tenants; solicitud global no mezcla datos operativos; soportes pendientes no aparecen en flujos comerciales.
7. La migración de identidad individual/membresías queda diferida hasta que el usuario autorice cambiar el modelo de usuario único.

## Estado

**Fundación y pruebas unitarias incorporadas; aislamiento efectivo aún NO habilitado.** No se ha ejecutado SQL ni backfill, no se han modificado datos productivos y main permanece intacta.
