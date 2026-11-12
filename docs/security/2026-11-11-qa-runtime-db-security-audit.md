# Auditoría de seguridad DB — QA / PMV candidate

**Fecha:** 2026-11-11  
**Repositorio:** popnegro-org/grupo-comunicarte-refactoring  
**Rama:** pmv-validation-candidate  
**Neon:** proyecto mute-math-07036388, rama QA qa/pr96-ownership-20261105 (br-bold-block-aua43ua0)  
**Alcance:** identidad de conexión, privilegios SQL, contexto tenant_id y cobertura de las 37 tablas públicas.  
**Producción y main:** sin modificaciones.

## Dictamen

**La aplicación no está protegida por RLS en QA.** Las 27 políticas existentes son definiciones inertes: ninguna de las 37 tablas públicas tiene RLS habilitado. La consulta del conector Neon se ejecutó como neondb_owner, con BYPASSRLS=true, privilegios DML sobre las 37 tablas y permiso CREATE en la base y el schema public. Esto acredita el contexto del conector, **no** el usuario efectivo de Render.

El código obtiene la conexión desde DATABASE_URL y comparte un único pg.Pool entre consultas de negocio y initDatabase(). El bootstrap de Render ejecuta DDL (CREATE/ALTER TABLE, secuencias e índices, reemplazo de constraints) y también actualizaciones de datos. Por tanto, hoy no existe separación entre identidad de migración/bootstrap e identidad de runtime.

El contrato PMV vigente conserva un único administrador global. No requiere contexto SQL app.tenant_id ni autorización individual por tenant. La lógica de ownership se aplica en servicios de dominio, transacciones y validaciones. **No se debe activar RLS ni introducir SET LOCAL app.tenant_id como arreglo aislado:** las políticas preparadas no implementan el contrato global, el catálogo público combinado ni las solicitudes mixtas.

## 1. Identidad efectiva de conexión

### Evidencia directa disponible

- src/db/index.ts lee process.env.DATABASE_URL y construye un único Pool de pg.
- db de Drizzle y las consultas SQL usan ese mismo pool.
- server.ts ejecuta initDatabase() al iniciar el proceso persistente.
- El bootstrap realiza operaciones DDL y DML; por ello la conexión actual necesita permisos superiores a los de un rol de runtime mínimo.
- Render confirma ambos servicios vinculados a pmv-validation-candidate; no se leen ni exponen valores de variables de entorno.

### Evidencia efectiva de Render — verificada en ambos servicios

El diagnóstico se ejecutó tras el despliegue de la candidata y confirmó la identidad real usada por DATABASE_URL:

| Servicio Render | Rama Neon | current_user / session_user | BYPASSRLS | CREATE database/schema | Tablas públicas | RLS activo | DML |
|---|---|---|---|---:|---:|---:|---:|
| grupo-comunicarte-refactoring-qa | qa/pr96-ownership-20261105 | neondb_owner | true | true / true | 37 | 0 | SELECT/INSERT/UPDATE/DELETE: 37/37 |
| grupo-comunicarte-refactoring | preview/pmv-validation-candidate | neondb_owner | true | true / true | 36 | 0 | SELECT/INSERT/UPDATE/DELETE: 36/36 |

En ambos servicios: superuser=false y app.tenant_id ausente en la sesión de diagnóstico. La identidad de Render está confirmada: **los dos servicios ejecutan la aplicación como neondb_owner, con BYPASSRLS y privilegios DML completos sobre todas las tablas de su rama**. El permiso CREATE de database y schema concuerda con el bootstrap DDL ejecutado por la aplicación.

La consulta directa del conector Neon también se ejecutó como neondb_owner; ahora existe evidencia independiente de Render que confirma la misma identidad.

El diagnóstico agregado en src/db/index.ts no registra URLs, contraseñas, hosts ni valores tenant. No cambia roles, grants, RLS ni contexto tenant.

## 2. Permisos SQL comprobados en Neon QA

| Atributo | Resultado |
|---|---:|
| current_user / session_user | neondb_owner |
| rolsuper | false |
| rolbypassrls | true |
| CREATE en database | true |
| CREATE en schema public | true |
| Tablas públicas | 37 |
| SELECT / INSERT / UPDATE / DELETE | 37 / 37 / 37 / 37 |
| Tablas con RLS habilitado | 0 |
| app.tenant_id en sesión de diagnóstico | ausente |

Rol app_runtime_qa:
- existe, pero tiene NOLOGIN, NOSUPERUSER, NOBYPASSRLS;
- no tiene grants de tabla ni secuencia;
- no es una credencial instalada en Render;
- no es todavía un runtime role utilizable.

No se aplicaron GRANT, REVOKE, ALTER ROLE, ENABLE/FORCE ROW LEVEL SECURITY ni cambios de datos.

## 3. Propagación de tenant_id

### Estado de la aplicación

- src/server/tenantAccess.ts conserva compatibilidad con el único administrador autenticado como global_admin.
- Los servicios comerciales validan ownership contra la fila actual de soporte y contra los ítems persistidos; los flujos transaccionales bloquean filas y rechazan divergencias.
- Los soportes sin tenant quedan pendientes/en cuarentena; no se deduce ownership por ciudad.
- La solicitud mixta puede ser global; cada ítem debe conservar ownership verificable.
- No se encontró uso en el código de runtime de set_config('app.tenant_id', ...), SET LOCAL app.tenant_id ni current_setting('app.tenant_id').

### Decisión

La ausencia de contexto SQL tenant es **coherente con el contrato actual de administrador global**, pero significa que las políticas SQL staged no son aplicables como boundary de seguridad. No agregar un tenant tomado de header/body ni inventar membresías para satisfacer las políticas existentes.

## 4. Cobertura de las 37 tablas públicas

### 27 tablas con una política staged, RLS deshabilitado

campaign_screens, campaigns, clientes, google_credentials, leads, media, media_kit_comments, media_kit_screens, mediakit_items, mediakit_request_items, mediakit_requests, mediakits, metrics, screen_tags, screens, support_faces, support_locations, support_media, support_pricing, support_routes, support_technical, supports, sync_errors, sync_history, tenants, user_roles, users.

Estas políticas consultan app.tenant_id y/o relaciones propietarias. No se consideran protección activa mientras RLS permanezca deshabilitado.

### 10 tablas sin política

| Tabla | Clasificación propuesta para el contrato PMV | Tratamiento |
|---|---|---|
| admin_login_attempts | Operativa de autenticación | Privilegio backend; no exponer a clientes |
| categories | Referencia global | Lectura pública/servidor según endpoint |
| changelogs | Auditoría global | Escritura backend; lectura controlada |
| cities | Referencia global | Lectura pública/servidor según endpoint |
| integration_outbox | Operativa de integración | Acceso backend; revisar aislamiento por payload |
| locations | Referencia global | Lectura pública/servidor según endpoint |
| permissions | Metadatos globales de autorización | Backend solamente |
| role_permissions | Metadatos globales de autorización | Backend solamente |
| roles | Metadatos globales de autorización | Backend solamente |
| tags | Referencia global | Lectura pública/servidor según endpoint |

Clasificación propuesta, no política aplicada. Las tablas de referencia no deben recibir una política tenant genérica sin confirmar si son compartidas; las tablas operativas requieren controles de acceso backend y revisión de contenido.

### Columnas tenant_id directas

La consulta de esquema encontró columna tenant_id directa en 9 tablas públicas: campaigns, clientes, leads, mediakit_items, mediakit_request_items, mediakits, screens, supports y users.

Las tablas hijas sin columna directa dependen de joins/EXISTS a una entidad propietaria. Esa dependencia debe verificarse individualmente antes de diseñar RLS futuro.

## 5. Correcciones preparadas en la candidata

1. **Diagnóstico seguro de conexión:** agregado a src/db/index.ts. No registra URLs, contraseñas, hosts ni valores de tenant.
2. **Sin cambio de permisos DB:** se mantiene el rol y el esquema QA sin escrituras de seguridad.
3. **Sin activación RLS:** las políticas siguen inertes hasta que exista diseño compatible con administrador global, catálogo público, referencias globales y solicitudes mixtas.
4. **Separación requerida para siguiente iteración:** trasladar bootstrap DDL/DML fuera del arranque de la aplicación a migraciones versionadas; después emitir un login runtime de mínimos privilegios, con grants por tabla/secuencia y sin CREATE/ALTER/BYPASSRLS. Validar sobre una rama Neon efímera/QA antes de cualquier aplicación persistente.
5. **Tenant context futuro:** solo cuando se apruebe identidad individual/membresías y se defina el tenant confiable en backend. Aplicar contexto dentro de cada transacción con SET LOCAL, no con un SET persistente sobre conexiones pooled.

## 6. Validación de código

Ejecutado en una copia limpia de la rama candidata:

| Comando | Resultado |
|---|---|
| npm ci | PASS; 0 vulnerabilidades reportadas |
| npm run lint | PASS |
| npm run test:unit | PASS — 107/107 |
| npm run build | PASS |

El diagnóstico de conexión necesita el siguiente arranque de Render para producir evidencia del usuario efectivo de DATABASE_URL. La consulta equivalente fue validada sintácticamente en Neon QA.

## 7. HUMAN GATE / límites

- No tocar main.
- No habilitar RLS/FORCE RLS.
- No crear credenciales LOGIN ni cambiar grants/roles en Neon persistente.
- No reemplazar DATABASE_URL en Render.
- No aplicar migraciones productivas.
- La rama candidata puede desplegar el diagnóstico inocuo de arranque a los servicios ya asignados a esa rama; el cambio no altera datos ni permisos.

**Estado:** identidad efectiva confirmada en los dos servicios Render; auditoría de esquema/permisos y cobertura QA completada; separación de roles y migraciones sigue pendiente de implementación/validación específica.


## Addendum — verificación directa 2026-11-12

Consultas read-only ejecutadas directamente en Neon sobre `br-muddy-cell-au64infb` (Preview) y `br-bold-block-aua43ua0` (QA). No se ejecutó DDL ni DML.

| Control | Preview | QA |
|---|---:|---:|
| Supports | 46 | 46 |
| Supports sin tenant | 18 | 18 |
| Request items | 34 | 44 |
| Request items sin tenant | 2 | 3 |
| Media Kit items | 3 | 9 |
| Media Kit items sin tenant | 0 | 0 |
| Requests sin scope | 2 | 2 |
| Tenants `tenant-ba` / `tenant-default` existentes | 2 | 2 |
| Request item huérfano / mismatch | 0 / 0 | 0 / 0 |
| Media Kit item huérfano / mismatch | 0 / 0 | 0 / 0 |

Las FK compuestas y las FK simples a `tenants` existen y están validadas en ambas ramas. No existen triggers de herencia/immutability en ninguna. El postflight del SQL adjunto (34 request items y 2 NULL para ambas ramas; QA con 0 Media Kit items) está desactualizado respecto de QA actual: QA contiene 44 request items, 3 NULL y 9 Media Kit items. La migración de alineación no debe ejecutarse con expectativas numéricas históricas fijas.

### Privilegios efectivos confirmados

Consulta read-only en ambas ramas como `neondb_owner`:

| Atributo | Preview | QA |
|---|---:|---:|
| superuser | false | false |
| BYPASSRLS | true | true |
| CREATEDB / CREATEROLE | true / true | true / true |
| CREATE database / schema public | true / true | true / true |
| SELECT / INSERT / UPDATE / DELETE sobre tablas públicas | 36/36 | 37/37 |

Esto coincide con los diagnósticos recientes de ambos servicios Render. No hay rol runtime de mínimos privilegios instalado en esos servicios. El contrato actual de administrador global no requiere activar RLS, pero el rol privilegiado sigue siendo una deuda de seguridad.

### Corrección preparada

Se añadió `docs/pmv/migrations/20261112_request_item_tenant_inheritance.sql` en la rama candidata. Añade herencia de tenant al insertar/actualizar ítems, preserva NULL para soportes pendientes e históricos, rechaza mismatches y evita reasignar ownership ya establecido. No re-clasifica automáticamente solicitudes históricas al asignar posteriormente un soporte; esos ítems siguen bloqueados hasta reconciliación explícita. Está versionada, no aplicada ni probada en una base PostgreSQL temporal/persistente.

**Estado:** integridad de datos actual PASS; enforcement DB ante nuevos writes incompleto hasta aplicar y probar la migración en QA/Preview. No tocar Production ni habilitar RLS como parte de este cambio.


### Protección de ramas — comprobación 2026-11-12

- Neon reporta `protected=false` en las tres ramas del proyecto: `main`, Preview y QA.
- Intenté habilitar protección únicamente en la rama Neon `main` (`br-wandering-sky-aunq6lad`). Neon rechazó el cambio con HTTP 422: límite máximo de ramas protegidas alcanzado para el plan actual. No se modificó ninguna rama ni se inició una actualización de plan.
- La consulta de protección de ramas GitHub devolvió HTTP 403 `Resource not accessible by integration`. El estado de branch protection de GitHub `main` queda sin verificar; no se afirma que esté protegida.
- No se aplicó ninguna configuración que altere la conexión o disponibilidad de Production. La protección de GitHub y la capacidad de proteger Neon `main` requieren resolver permisos/límite del plan antes del release.
