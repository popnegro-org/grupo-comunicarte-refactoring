# Sandbox de integraciones — outbox y contrato idempotente

**Estado:** implementación aislada en rama de trabajo; no habilita proveedores externos.  
**Entorno objetivo de validación:** Neon QA branch `qa/pr96-ownership-20261105`.  
**No incluido:** HubSpot real, Deals, emails, WhatsApp, worker programado o escrituras en Production.

## Qué incorpora

- Tabla aditiva `integration_outbox` con estados, disponibilidad, contador de intentos, timestamps y claves idempotentes.
- Helper transaccional `enqueueIntegrationEvent()`: debe recibir el cliente SQL de la transacción que creó/modificó el registro local.
- Evento sandbox `mediakit_request.created` que transporta únicamente `requestId` y `requestScope`; no copia nombre, email, teléfono ni mensaje.
- Adaptador en memoria que simula la entrega sin HTTP, credenciales ni persistencia externa.
- Pruebas de determinismo, minimización de datos y deduplicación.

## Límites deliberados

1. No se conecta el flujo público de solicitudes a la cola todavía.
2. No se crean contactos ni Deals en HubSpot.
3. No se procesan ni reintentan filas automáticamente: el worker queda fuera de este incremento.
4. No se registra una actividad atribuida a una persona; el principal administrativo compartido no acredita identidad individual.
5. No se cambian variables de entorno ni se guardan secretos.

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

- [ ] Aplicar migración solo en Neon QA y verificar columnas/índices.
- [ ] Ejecutar CI Candidate, unit tests y build en PR hacia `pmv-validation-candidate`.
- [ ] Probar la transacción real en un runtime que ejecute el mismo SHA y use esa rama Neon.
- [ ] Implementar worker con `FOR UPDATE SKIP LOCKED`, lease/timeout y backoff acotado.
- [ ] Definir portal sandbox, objeto destino y campos permitidos antes de cualquier llamada HubSpot.
- [ ] Agregar identidad individual y matriz de permisos antes de actividades por actor.
- [ ] Mantener el PR Draft hasta completar QA de runtime; no merge a `main` ni Production.
