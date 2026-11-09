# Sandbox de integraciones — outbox y contrato idempotente

**Estado:** implementación aislada en rama de trabajo; no habilita proveedores externos.  
**Entorno de validación:** Neon QA branch `qa/pr96-ownership-20261105`.  
**No incluido:** HubSpot real, Deals, emails, WhatsApp, worker programado o escrituras en Production.

## Qué incorpora

- Tabla aditiva `integration_outbox` con estados, disponibilidad, contador de intentos, timestamps y claves idempotentes.
- Helper transaccional `enqueueIntegrationEvent()`: recibe el cliente SQL de la transacción que creó/modificó el registro local.
- Evento sandbox `mediakit_request.created` que transporta únicamente `requestId` y `requestScope`; no copia nombre, email, teléfono ni mensaje.
- Adaptador en memoria que simula la entrega sin HTTP, credenciales ni persistencia externa.
- Procesador manual por lotes: `FOR UPDATE SKIP LOCKED`, recuperación de leases vencidos, reintentos con backoff exponencial acotado y error code sanitizado.
- Tests de determinismo, minimización de datos, concurrencia de claims, deduplicación, retry y cuarentena de eventos inválidos.

## Límites deliberados

1. El flujo público solo encola cuando `INTEGRATION_OUTBOX_MODE=sandbox`; por defecto está deshabilitado. El evento se inserta dentro de la misma transacción de la solicitud y solo contiene `requestId`/`requestScope`.
2. No se crean contactos ni Deals en HubSpot.
3. El procesador solo atiende eventos `provider=sandbox`; se ejecuta manualmente con `npm run integrations:sandbox:drain`. No existe cron ni endpoint HTTP.
4. No se registra una actividad atribuida a una persona; el principal administrativo compartido no acredita identidad individual.
5. No se cambian variables de entorno ni se guardan secretos.
6. No se envían eventos a proveedores externos.

La cola solo se debe conectar al flujo comercial cuando la migración esté aplicada en el runtime QA correcto y se aprueben el mapeo de campos, la base legal/consentimiento y la identidad/tenant.

## Migración sandbox

Archivo: `docs/pmv/migrations/20261106_integration_outbox.sql`.

La migración es aditiva y no altera tablas existentes. Aplicar únicamente sobre una rama Neon aislada. Verificar después:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'integration_outbox'
ORDER BY ordinal_position;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'integration_outbox';
```

## Próximos gates técnicos

- [x] Aplicar migración solo en Neon QA y verificar columnas/índices.
- [x] CI Candidate, unit tests y build PASS en PR hacia `pmv-validation-candidate`.
- [x] Visual QA PASS con baseline restaurado; sin snapshots nuevos.
- [ ] Probar la transacción real en un runtime que ejecute el mismo SHA y use esa rama Neon.
- [x] Conectar el evento a la creación de solicitud dentro de la misma transacción, con flag sandbox explícito.
- [x] Implementar procesador manual aislado; scheduler y observabilidad operativa quedan pendientes.
- [ ] Definir portal sandbox, objeto destino y campos permitidos antes de cualquier llamada HubSpot.
- [ ] Agregar identidad individual y matriz de permisos antes de actividades por actor.
- [ ] Mantener el PR Draft hasta completar QA de runtime; no merge a `main` ni Production.
