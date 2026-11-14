# Aislamiento multi-tenant — decisión e implementación incremental

> **Aclaración operativa (2026-11-12):** este documento conserva decisiones y estados históricos. La fuente vigente es [PROJECT-CONTROL.md](./PROJECT-CONTROL.md). En Render QA/Preview, los roles runtime actuales son `app_runtime_qa_login` y `app_runtime_preview` (ambos `BYPASSRLS=false`); `neondb_owner` es una identidad privilegiada administrativa/migración, no el runtime QA/Preview. El PMV conserva un único administrador global y RLS deshabilitado.


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

## Protección distribuida del login

- Se sustituye el Map en memoria por un limitador atómico en Neon, compartido entre instancias serverless.
- Las claves IP se almacenan como HMAC-SHA256; no se persisten IPs en claro.
- Si Neon no está disponible, el endpoint responde 503 y no autentica: no existe fallback fail-open.
- Tabla auxiliar `admin_login_attempts` definida en `docs/pmv/proposals/20261101_002_admin_login_rate_limit.sql`. La app no ejecuta DDL en una petición; la migración debe revisarse y aplicarse explícitamente antes de activar el limitador.
- Política: 10 intentos por ventana de 15 minutos por IP seudonimizada. La limpieza/retención de claves antiguas debe monitorizarse.


## Auditoría de datos Neon (rama Preview `preview/pmv-validation-candidate`)

Lectura de esquema y agregados en la rama Preview de Neon; no se ejecutaron escrituras:

- Existen los tenants `tenant-ba` y `tenant-default`, ambos activos.
- `supports`: 46 filas; 29 activas y 17 inactivas; 10 filas sin ciudad y 10 sin `canonical_id` (no se asumió que sean el mismo conjunto).
- `supports` no tiene `tenant_id` en el esquema actual. No existe coincidencia entre `supports.canonical_id` y `screens.id` en el snapshot consultado.
- La tabla legacy `screens` sí tiene `tenant_id`: 6 registros `tenant-ba` y 11 `tenant-default`; esto no demuestra ownership de las filas de `supports` porque no hay join por ID.
- `mediakits` ya tiene `tenant_id` y 3 registros (1 `tenant-ba`, 2 `tenant-default`), pero la tabla `mediakit_items` estaba vacía en el snapshot. No permite asignar ownership a `supports`.
- `mediakit_request_items` contiene 32 ítems en 18 solicitudes y no tiene `tenant_id`; las cabeceras `mediakit_requests` tampoco tienen scope.
- La tabla legacy `users` contiene 2 registros sin `tenant_id`; no se modificó ni se usó para alterar el acceso compartido actual.

**Conclusión:** hay una tabla de tenants y ownership en parte del modelo legacy, pero la tabla de inventario operativa `supports` permanece sin vínculo verificable. Las tablas `screens` y `supports` no comparten identificadores en este snapshot. No existe una base segura para backfill automático. La propuesta SQL ahora declara FKs a `public.tenants(id)` y mantiene todos los ownerships históricos en NULL.


### Validación de migración en Neon Preview

- Se ejecutó la propuesta aditiva únicamente en la rama Neon `preview/pmv-validation-candidate` (`br-muddy-cell-au64infb`), no en `main` de Neon ni en producción.
- La transacción creó `supports.tenant_id` y `mediakit_request_items.tenant_id` con FK a `tenants(id)`, además de `mediakit_requests.request_scope`, su CHECK e índices.
- Verificación posterior: 46/46 soportes siguen con `tenant_id IS NULL`; 32/32 ítems de solicitudes siguen sin tenant; 18/18 cabeceras siguen sin clasificar. No hubo backfill ni cambios de registros.
- La migración es idempotente y la comprobación de columnas/constraints confirmó la estructura resultante.
- El runtime de negocio aún no consume estos campos ni filtra consultas por tenant; la migración por sí sola no habilita aislamiento.


### Validación de login y conexión Preview

- El primer smoke test de `/api/admin/login` devolvió 503 porque el deployment Preview todavía no apuntaba al branch Neon donde se había preparado la tabla de rate limit.
- Se creó una variable `DATABASE_URL` **solo para Preview y limitada a la rama Git `pmv-validation-candidate`**, usando la conexión de `preview/pmv-validation-candidate`. No se modificó la variable de Production ni se expuso el secreto.
- Se ejecutó la migración `20261101_002_admin_login_rate_limit.sql` únicamente en el branch Neon Preview. El endpoint volvió a responder 401 ante credenciales de prueba inválidas (comportamiento esperado); el registro de rate limit confirmó una clave HMAC y un intento persistido. El 503 inicial quedó resuelto en Preview.
- `/api/health` respondió 200 con `database: connected`; `/api/supports` respondió 200 y devolvió el catálogo. No se probaron credenciales reales ni se inició sesión con el administrador.
- Esta validación no aplica las migraciones ni cambia la conexión de Production.

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


## Estado vigente — revalidación 2026-11-09

Esta sección prevalece sobre las auditorías históricas anteriores cuando describen el schema o runtime actual.

- El modelo de acceso continúa siendo un único administrador global autenticado. No existen usuarios tenant-scoped; por tanto, tenant_id es ownership operativo/comercial y no un límite de autorización entre usuarios. El rol Preview neondb_owner mantiene rolbypassrls=true; RLS no se declara activo ni se promete aislamiento multiusuario.
- El catálogo público solo devuelve soportes activos con tenant asignado. mza-trad-16 y las otras 17 filas pendientes continúan con tenant_id=NULL; no se infiere ownership por ciudad.
- El CRUD administrativo expone ownership y evidencia solo al administrador. Las altas requieren tenant válido y referencia PDF/posición; las asignaciones existentes son inmutables desde CRUD. La corrección de ownership exige un flujo auditado separado.
- supports persiste tenant_ownership_evidence, tenant_ownership_assigned_by y tenant_ownership_assigned_at. Los 28 soportes documentados se backfilled desde la matriz fuente; no se asignaron las 18 filas pendientes.
- mediakit_items.tenant_id es NOT NULL y su FK compuesta (support_id, tenant_id) referencia (canonical_id, tenant_id) en supports. mediakit_request_items conserva NULL solo para líneas históricas pendientes; su FK compuesta protege las líneas asignadas.
- Preview confirmó 28/28 soportes asignados con auditoría, 18 pendientes y cero mismatches de tenant en líneas de solicitud. mediakit_items estaba vacío al aplicar NOT NULL.
- El DTO público elimina tenant_id, evidencia de ownership y pricing. El pricing permanece detrás de endpoints requireAdmin; PDF y PPTX no incluyen precios internos.
- No se aplicó ninguna migración ni cambio de datos en Production; no se modificó main.

Migraciones aplicadas solo a Neon Preview:
- docs/pmv/migrations/20261109_tenant_ownership_audit.sql
- docs/pmv/migrations/20261109_tenant_ownership_constraints.sql

La suite autenticada ampliada en tests/deployment/deployment-smoke.spec.ts se ejecutó sobre Preview: 8/8 Playwright PASS en CI Candidate run 42686838519 (HEAD documental 085cf42b11732e34b98791774c4afdccd24e3dc7; código funcional validado en 2c54df771700b474d1c6d847d7d2bc7ca767873e).


## Revalidación y migración de Production — 2026-11-09

Esta sección prevalece sobre las notas históricas anteriores que indicaban que Production aún no tenía migraciones.

### Decisión de acceso

- Modelo confirmado por el usuario: **un único administrador global**.
- No existen usuarios tenant-scoped ni se implementa aislamiento de autorización entre usuarios.
- `tenant_id` representa ownership operativo/comercial y procedencia documental, no una frontera de acceso de usuarios.
- RLS permanece desactivado deliberadamente. El rol conectado es `neondb_owner` con `rolbypassrls=true`; no se cambió el rol runtime ni se afirmó aislamiento RLS.

### Ejecución

- Neon project: `grupocomunicarte-serverless` (`mute-math-07036388`).
- Branch productiva: `main` (`br-wandering-sky-aunq6lad`).
- La migración completa se preparó y ejecutó en un branch temporal derivado de Production, se validó y luego se aplicó a la rama padre con el runner de migraciones.
- Script versionado: `docs/pmv/migrations/20261109_production_ownership_and_login_rate_limit.sql`.
- Se agregaron columnas de ownership, evidencia, actor y fecha; ownership por línea de solicitud; scope de cabecera; ownership obligatorio en líneas de Media Kit; FKs compuestas; índices y `admin_login_attempts`.
- No se alteraron credenciales, usuarios, estados de solicitudes, disponibilidad, precios ni contenido comercial.
- No se activó RLS, no se cambió el rol runtime y no se desplegó código a Production.

### Postflight verificado en Neon Production

| Entidad | Resultado |
|---|---:|
| Soportes totales | 46 |
| Soportes `tenant-ba` | 10 |
| Soportes `tenant-default` | 18 |
| Soportes en cuarentena (`tenant_id IS NULL`) | 18 |
| Líneas de solicitud `tenant-ba` | 5 |
| Líneas de solicitud `tenant-default` | 25 |
| Líneas históricas pendientes | 2 |
| Solicitudes con scope `tenant` | 14 |
| Solicitudes con scope `global` | 2 |
| Solicitudes sin clasificar por ownership pendiente | 2 |
| Líneas de Media Kit persistidas | 0 |
| Intentos de login al aplicar | 0 |

- Auditoría de los 28 soportes asignados: 28/28 con evidencia, actor y fecha.
- Mismatches de ownership en líneas de solicitud: 0.
- Mismatches en líneas de Media Kit: 0.
- Filas huérfanas de solicitud: 0.
- Los 18 soportes sin evidencia permanecen sin asignación; incluye `mza-trad-16` y filas legacy/QA. No se infirió ownership por ciudad.
- Los estados históricos de solicitudes se preservaron: 1 `cerrado`, 1 `contactado`, 4 `enviado`, 12 `pending`.
- Conteos preservados: 46 supports, 18 requests, 32 request items, 3 mediakits, 0 mediakit_items y 35 filas de pricing.

### Límites del release

- La migración de esquema y backfill de ownership en Neon Production quedó aplicada y verificada.
- El código candidato aún no se desplegó en Vercel Production ni se integró en GitHub `main`.
- La migración es aditiva: no elimina ni modifica columnas preexistentes. El proyecto Neon rechazó crear un branch de backup adicional por límite de branches; el script probado y los resultados de preflight/postflight quedan versionados aquí.
- Mantener bloqueados merge a `main`, deploy Production, cambios de Render Production y activación de RLS hasta completar sus respectivos gates.
