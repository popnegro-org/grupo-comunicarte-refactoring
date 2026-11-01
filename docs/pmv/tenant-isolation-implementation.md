# Aislamiento multi-tenant — decisión e implementación incremental

## Decisiones confirmadas

1. **Usuario actual:** conservar exclusivamente el único usuario/credencial ya creado (`ADMIN_USER`/`ADMIN_PASSWORD`). No crear usuarios, invitaciones ni exigir nuevas membresías para iniciar sesión. Se conserva el mecanismo de login actual.
2. **Alcance administrativo actual:** el único administrador autenticado administra ambos tenants y puede coordinar solicitudes comerciales globales. El alcance global no elimina la obligación de asociar cada soporte, Media Kit, precio y trabajo operativo al tenant correspondiente.
3. **Solicitudes mixtas:** se permite una solicitud comercial global como operación principal. Sus ítems y operaciones derivadas deben quedar asociados explícitamente a un tenant.
4. **Soportes sin ciudad:** cuarentena (`pending`). No se infiere la propiedad por ciudad, nombre, coordenadas ni identificador. La asignación requiere evidencia y auditoría humana.
5. **Identidad futura:** el modelo de membresías queda preparado para una futura migración a identidad individual, pero no forma parte del requisito de acceso del usuario único actual.

## Cambios incorporados en esta rama

- `src/server/tenantAccess.ts`: primitivas fail-closed para membresías futuras y `resolveExistingSingleAdminAccess`, que representa al administrador existente como operador global únicamente cuando el backend confirma su autenticación.
- `tests/unit/tenant-access.test.ts`: cobertura de identidad ausente, membresías inactivas, suplantación de tenant, membresías múltiples, administración global, compatibilidad del administrador único y cuarentena.
- `db/migrations/20261101_001_tenant_foundation.sql`: migración aditiva propuesta. Las tablas de usuarios/membresías/global_admins son infraestructura futura opcional; no se exige registrar al administrador actual ni ejecutar esta migración para conservar el login.

## Límites deliberados / bloqueos de integración

El runtime actual autentica con una única credencial compartida (`ADMIN_USER`/`ADMIN_PASSWORD`) y emite un token que identifica ese nombre. La compatibilidad global debe depender exclusivamente del resultado de `requireAdmin` en backend; nunca de un parámetro enviado por el cliente. Este modo conserva el acceso actual, pero **no equivale a identidad individual ni aporta atribución personal por usuario**. No se conectan estas primitivas a rutas de negocio hasta verificar el contrato real de sesión y cada consulta tenant-scoped.

El bootstrap de base de datos se omite en Vercel. La migración se entrega como artefacto versionado y **no se ejecuta** desde esta rama. Tampoco se asignan soportes históricos, se transforman las tres solicitudes mixtas, se activan RLS ni se cambian datos productivos.

## Secuencia obligatoria antes de activar aislamiento efectivo

1. Integrar el resolver de administrador único solo detrás de `requireAdmin`; verificar que el middleware no acepte tokens o flags suministrados por el cliente.
2. Incorporar propiedad explícita de cada soporte y operación; los diez soportes sin ciudad permanecen `pending` y fuera de catálogo comercial, Media Kit y cotización.
3. Modelar solicitudes globales como cabecera comercial con ítems/operaciones por tenant. `request_scope='global'` no debe habilitar acceso transversal implícito a endpoints de detalle, pricing o Media Kit.
4. Auditar filtros tenant-scoped en todos los servicios CRUD, estadísticas, solicitudes, Media Kits, medios, rutas y precios.
5. Probar RLS con el mismo rol de aplicación que usa runtime, no con el owner de tablas.
6. QA: administrador único conserva ambos tenants; solicitud global no mezcla los datos operativos; ítems y Media Kits permanecen tenant-scoped; soportes pendientes no aparecen en flujos comerciales.
7. La migración de identidad individual/membresías queda diferida hasta que el usuario autorice cambiar el modelo de usuario único.

## Estado

**Fundación y pruebas unitarias incorporadas; aislamiento efectivo aún NO habilitado.** No se ha ejecutado SQL, migración, backfill, cambio de credenciales, despliegue, ni modificación de `main` o datos productivos. La integración runtime permanece pendiente de auditar `requireAdmin` y las consultas de negocio.
