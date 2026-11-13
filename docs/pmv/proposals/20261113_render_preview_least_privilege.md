# Propuesta: reducir privilegios de Render Preview

**Estado:** propuesta revisada; no ejecutada.  
**Fecha:** 2026-11-13  
**Proyecto Neon:** `mute-math-07036388`  
**Branch Neon:** `preview/pmv-validation-candidate` (`br-muddy-cell-au64infb`)  
**Servicio Render:** `srv-da50fdbm8hqs73b1m5pg`  
**Rol runtime confirmado:** `app_runtime_preview`

## 1. Hallazgo verificado

Consultas read-only en Neon Preview confirman:

- `app_runtime_preview` tiene LOGIN, pero no SUPERUSER, CREATEDB, CREATEROLE, REPLICATION ni BYPASSRLS.
- No pertenece a otros roles.
- Tiene SELECT, INSERT, UPDATE y DELETE en las 36 tablas públicas (144 grants).
- Tiene USAGE y SELECT en las 12 secuencias públicas.
- Ninguna de las 36 tablas tiene RLS habilitado.
- Los privilegios por defecto de `neondb_owner` vuelven a otorgar `arwd` sobre futuras tablas y `rU` sobre futuras secuencias a `app_runtime_preview`. Revocar solamente los grants actuales no resolvería el problema a futuro.

Esto permite al proceso Render modificar o borrar registros de tablas de identidad, permisos, credenciales y leads que no necesita el catálogo PMV.

## 2. Referencia least-privilege ya validada

El rol Vercel Preview `app_runtime_vercel_preview_v2` pasó el E2E autenticado 12/12 en la misma branch Neon y sobre el mismo código de aplicación. Sus grants efectivos son:

| Privilegio | Tablas |
|---|---:|
| SELECT | 14 |
| INSERT | 13 |
| UPDATE | 10 |
| DELETE | 7 |
| USAGE + SELECT de secuencias | 6 |

Tablas SELECT:
`admin_login_attempts`, `clientes`, `mediakit_items`, `mediakit_request_items`, `mediakit_requests`, `mediakits`, `support_faces`, `support_locations`, `support_media`, `support_pricing`, `support_routes`, `support_technical`, `supports`, `tenants`.

Tablas INSERT:
`admin_login_attempts`, `clientes`, `mediakit_items`, `mediakit_request_items`, `mediakit_requests`, `mediakits`, `support_faces`, `support_locations`, `support_media`, `support_pricing`, `support_routes`, `support_technical`, `supports`.

Tablas UPDATE:
`admin_login_attempts`, `mediakit_requests`, `mediakits`, `support_faces`, `support_locations`, `support_media`, `support_pricing`, `support_routes`, `support_technical`, `supports`.

Tablas DELETE:
`mediakit_items`, `support_faces`, `support_locations`, `support_media`, `support_pricing`, `support_routes`, `support_technical`.

Secuencias:
`mediakit_items_id_seq`, `mediakit_request_items_id_seq`, `mediakit_requests_id_seq`, `support_faces_id_seq`, `support_media_id_seq`, `supports_id_seq`.

Privilegios de columna adicionales: UPDATE únicamente en `clientes.created_at` y `mediakit_request_items.created_at`. No hay UPDATE a nivel de tabla en esas dos tablas.

La referencia de secuencias permite tanto USAGE como SELECT; no permite UPDATE.

## 3. Plan de aplicación propuesto

**No ejecutar hasta autorizar expresamente el cambio de permisos del runtime Render Preview.**

Preflight inmediato:
1. Confirmar que el servicio Render sigue en `pmv-validation-candidate`, deployment LIVE y SHA esperado.
2. Confirmar que `current_user/session_user` de Render sigue siendo `app_runtime_preview`.
3. Confirmar que el destino Neon sigue siendo `br-muddy-cell-au64infb`.
4. Guardar el snapshot de grants actuales y de default privileges para rollback.
5. Ejecutar el cambio como `neondb_owner` en una única transacción.

SQL propuesto (solo Neon Preview):

```sql
BEGIN;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_runtime_preview;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_runtime_preview;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  REVOKE ALL ON TABLES FROM app_runtime_preview;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM app_runtime_preview;

GRANT SELECT ON TABLE
  admin_login_attempts, clientes, mediakit_items, mediakit_request_items,
  mediakit_requests, mediakits, support_faces, support_locations,
  support_media, support_pricing, support_routes, support_technical,
  supports, tenants
TO app_runtime_preview;

GRANT INSERT ON TABLE
  admin_login_attempts, clientes, mediakit_items, mediakit_request_items,
  mediakit_requests, mediakits, support_faces, support_locations,
  support_media, support_pricing, support_routes, support_technical,
  supports
TO app_runtime_preview;

GRANT UPDATE ON TABLE
  admin_login_attempts, mediakit_requests, mediakits, support_faces,
  support_locations, support_media, support_pricing, support_routes,
  support_technical, supports
TO app_runtime_preview;

GRANT DELETE ON TABLE
  mediakit_items, support_faces, support_locations, support_media,
  support_pricing, support_routes, support_technical
TO app_runtime_preview;

GRANT UPDATE (created_at) ON TABLE clientes, mediakit_request_items
TO app_runtime_preview;

GRANT USAGE, SELECT ON SEQUENCE
  mediakit_items_id_seq, mediakit_request_items_id_seq,
  mediakit_requests_id_seq, support_faces_id_seq,
  support_media_id_seq, supports_id_seq
TO app_runtime_preview;

COMMIT;
```

La transacción debe abortarse si el preflight detecta una branch distinta, un rol distinto, grants adicionales no inventariados o cambios de esquema inesperados. No tocar Production, QA, `app_runtime_prod`, `app_runtime_vercel_preview_v2` ni datos.

## 4. Validación obligatoria post-cambio

1. Confirmar flags del rol y ausencia de membresías.
2. Confirmar grants efectivos exactos: SELECT 14, INSERT 13, UPDATE 10, DELETE 7, dos UPDATE de columna y seis secuencias.
3. Confirmar que los grants por defecto de `neondb_owner` ya no incluyan `app_runtime_preview`.
4. Confirmar que `has_table_privilege(..., 'DELETE')` sea false para `supports`, `clientes`, `users`, `roles`, `permissions`, `google_credentials` y `leads`.
5. Reiniciar/reciclar conexiones Render si es necesario; no cambiar el secret.
6. Ejecutar health, login/logout, dashboard, inventario CRUD autorizado, Media Kit crear/editar/exportar y smoke autenticado.
7. Ejecutar E2E completo contra Render Preview/Neon Preview. Si falla una operación requerida, detener el release y evaluar el grant mínimo faltante; no restaurar DML global automáticamente.
8. Confirmar logs sin errores SQL nuevos y que Production permanece sin cambios.

## 5. Rollback preparado

Si el smoke descubre una regresión operativa, el rollback de permisos (solo Preview) sería:

```sql
BEGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime_preview;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime_preview;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime_preview;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime_preview;
COMMIT;
```

El rollback restaura el alcance amplio actual y por eso solo debe usarse ante una regresión confirmada y con aprobación operativa. No se incluye ningún cambio de datos.

## 6. Gate

La ejecución requiere autorización explícita porque cambia permisos efectivos de un runtime conectado y puede afectar solicitudes en curso:

`HUMAN GATE: AUTORIZO RESTRINGIR app_runtime_preview EN NEON PREVIEW AL MODELO DE 14 TABLAS DE app_runtime_vercel_preview_v2`

