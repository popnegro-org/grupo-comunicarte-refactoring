# Preparación de actividades comerciales y HubSpot

## Estado auditado

Auditoría estática sobre el commit `57f9ff0a6e09ffe0cf6b4ab079ba052d19d6899a` de `feat/mobile-commercial-client-detail`. Este documento no aplica cambios de esquema ni realiza operaciones contra bases de datos o HubSpot.

### Hechos confirmados en el código

- `mediakit_requests` registra la solicitud, datos del contacto, `request_scope`, estado y timestamps. No contiene `tenant_id` directo.
- `mediakit_request_items` conserva `tenant_id` por soporte; el alcance se calcula con `deriveRequestScope()`: un tenant, global para selección mixta o `null` si hay ownership pendiente.
- `mediakits` conserva `tenant_id`, `source_request_id`, estado documental, importe, moneda, soportes y URLs.
- `tenantAccess.ts` contempla membresías y roles, pero la compatibilidad activa se basa en un único principal administrativo. `resolveExistingSingleAdminAccess()` lo resuelve como `global_admin`; no proporciona identidad individual.
- Las rutas administrativas usan `requireAdmin` y un token compartido. No se observa en este flujo un identificador persistido del actor.
- No se encontró en el código auditado un modelo de actividades persistentes ni una integración HubSpot implementada.
- El bootstrap de base de datos se omite en Vercel. `mediakitManagementService.ts` verifica columnas existentes y falla si faltan; indica que los cambios de esquema deben entrar por migraciones SQL revisadas, no por requests HTTP.

## Decisiones de diseño recomendadas

### 1. Actividades comerciales internas

Mantener una tabla append-only `commercial_activities`, separada del estado de solicitud y del ciclo de vida documental del Media Kit.

Campos mínimos propuestos:

| Campo | Propósito |
|---|---|
| `id` UUID | Identificador estable |
| `tenant_id` nullable | Tenant dueño; null solo para actividad global autorizada |
| `request_id` | Solicitud relacionada |
| `kit_id` nullable | Media Kit relacionado |
| `activity_type` | `note`, `call`, `meeting`, `task`, `status_change`, `document_created`, `document_sent` |
| `title`, `body` | Resumen y detalle |
| `occurred_at` | Momento real del evento |
| `created_at` | Momento de persistencia |
| `actor_user_id` nullable | Usuario autenticado cuando exista identidad real |
| `actor_kind` | `admin` o `system`; no atribuir a una persona con el token compartido |
| `metadata` JSONB | Datos complementarios no sensibles y versionables |
| `idempotency_key` nullable | Evitar duplicados en eventos automáticos |

Reglas:
- La actividad se inserta en la misma transacción que el cambio interno que documenta, cuando ambos ocurran en la misma base.
- No registrar como `document_sent` un Media Kit marcado como `sent` si no existe evidencia del envío. El cambio de estado por sí solo no prueba entrega.
- Las notas y actividades manuales deben indicar el actor disponible. Hasta incorporar identidad individual, usar actor de tipo administrativo sin nombre personal.
- No inferir tenant por ciudad, email o nombre. Para solicitudes mixtas, exigir el contexto global autorizado; para ownership pendiente, mantener cuarentena.
- No permitir editar o borrar eventos históricos desde el flujo ordinario. Las correcciones deben generar un evento compensatorio auditable.
- La timeline debe mostrar solo eventos persistidos; los timestamps existentes pueden seguir apareciendo como hitos heredados, claramente identificados como tales.

### 2. Identidad y autorización — bloqueo previo

Antes de habilitar creación de actividades por tenant:
1. Definir una identidad administrativa individual persistente y su relación con `TenantMembership`.
2. Resolver el tenant exclusivamente desde membresías activas; nunca desde un `tenantId` confiado al cliente.
3. Mantener el acceso global para solicitudes mixtas únicamente bajo rol `global_admin`.
4. Incorporar pruebas negativas de aislamiento entre tenants, solicitudes globales y ownership pendiente.

El token compartido actual no permite atribuir una actividad a una persona. No simular esa identidad ni degradar el acceso global a una autorización por tenant sin una decisión explícita.

### 3. Integración HubSpot — diseño de sincronización

No crear Deals hasta definir portal, pipeline, etapa inicial, propietario, política de duplicados y correspondencia de tenants. No se encontraron esos valores ni una integración configurada en el código auditado.

Modelo de enlace propuesto, separado de la solicitud:
- `request_id` interno único.
- `hubspot_portal_id` y `hubspot_deal_id` externos.
- `sync_status`: `pending`, `synced`, `retryable_error`, `permanent_error`.
- `last_synced_at`, `last_error_code` y contador de intentos.
- Restricción única por portal + solicitud para idempotencia.

Flujo recomendado:
1. Persistir solicitud y evento/outbox en una transacción local.
2. Un worker procesa el outbox fuera del request HTTP.
3. Buscar vínculo existente por clave interna antes de crear; actualizar solo campos mapeados y aprobados.
4. Persistir el ID externo y el resultado de sincronización.
5. Aplicar reintentos acotados con backoff; enviar errores permanentes a revisión manual.
6. No sobrescribir datos de contacto o pipeline editados en HubSpot sin reglas de precedencia explícitas.

La sincronización debe ser desacoplada: una caída de HubSpot no debe perder ni bloquear la solicitud local.

### 4. Migraciones y operación

- Crear migración SQL versionada, revisable y reversible cuando corresponda.
- No introducir DDL en handlers HTTP ni en el bootstrap de Vercel.
- Validar primero en una rama/base de QA aislada y con datos sintéticos.
- Añadir índices por `request_id`, `tenant_id`, `occurred_at` y claves idempotentes.
- Definir retención, minimización de PII y auditoría de accesos antes de guardar notas libres.
- No ejecutar migraciones ni sincronizaciones sobre Neon Production como parte de este cambio documental.

## Criterios de aceptación para la siguiente implementación

- [ ] Identidad individual y matriz de permisos aprobadas y probadas.
- [ ] Migración SQL revisada; rollback documentado.
- [ ] Actividades automáticas idempotentes y atómicas con su operación local.
- [ ] Actividades manuales con validación, actor y tenant verificables.
- [ ] Pruebas de aislamiento tenant/global y de ownership pendiente.
- [ ] HubSpot portal/pipeline/etapa/owner y política de precedencia definidos.
- [ ] Outbox, reintentos, deduplicación y recuperación probados sin duplicar Deals.
- [ ] Timeline consume solo registros persistidos y distingue hitos heredados.
- [ ] Lint, typecheck, unit, integración, build y Playwright PASS.
- [ ] Preview QA funcional y visual PASS antes de solicitar revisión humana.

## Límites de esta entrega

Este documento es una especificación técnica derivada del código auditado. No crea tablas, no añade endpoints, no activa integraciones, no contacta clientes, no modifica datos y no realiza despliegues. La implementación queda bloqueada hasta resolver identidad/permisos y configuración real de HubSpot.
