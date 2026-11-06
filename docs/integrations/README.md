# Guía de preparación e integración — Grupo Comunicarte

**Estado de referencia:** 2026-11-06  
**Rama auditada:** `pmv-validation-candidate`  
**Objetivo:** permitir incorporar proveedores y automatizaciones sin acoplarlos al núcleo comercial, romper el aislamiento por tenant ni modificar producción accidentalmente.

Este documento define el contrato de trabajo para las siguientes integraciones. No activa proveedores, no crea credenciales, no ejecuta migraciones ni implica que HubSpot u otros servicios ya estén conectados.

## 1. Arquitectura verificada

| Capa | Implementación observada | Responsabilidad |
|---|---|---|
| UI | React, Vite, TypeScript | Sitio comercial y dashboard |
| API | Express / TypeScript | Reglas de negocio y endpoints |
| Runtime Vercel | `api/[...path].ts` | Adaptador serverless de la API |
| Persistencia | PostgreSQL en Neon | Fuente de verdad de inventario, solicitudes y Media Kits |
| Archivos | Adaptador Cloudflare R2 | Assets multimedia |
| Mapas | React Leaflet | Visualización geográfica |
| Automatización | GitHub Actions | CI, auditoría de dependencias y QA visual |

Render sigue existiendo como servicio conectado al repositorio. Su rama/código y su función exacta deben verificarse antes de convertirlo en destino de una integración o de una migración. No asumir que Vercel y Render ejecutan el mismo commit ni que consumen la misma base.

## 2. Fuente de verdad y límites

- Neon es la fuente de verdad de los datos operativos del PMV.
- No introducir inventario, clientes, solicitudes o estados comerciales ficticios como fallback silencioso.
- Las integraciones externas son proyecciones/sincronizaciones; no deben reemplazar el registro interno.
- Los cambios de esquema se entregan mediante migraciones SQL versionadas y revisadas. No ejecutar DDL desde handlers HTTP ni desde el arranque de requests.
- Aplicar cambios aditivos primero; retirar columnas o contratos antiguos solo en una fase posterior y con evidencia de que no quedan consumidores.
- Los valores editoriales/manuales (por ejemplo, `technical.monthly_impacts`) se preservan como fueron ingresados. No calcularlos a partir de recorridos, frecuencia ni otros campos.

## 3. Identidad, tenant y autorización

El código actual contiene primitivas fail-closed en `src/server/tenantAccess.ts`:

- Una membresía activa es la fuente de autorización tenant.
- No confiar en `tenantId` enviado por el navegador.
- No inferir propiedad por ciudad, email, nombre ni ubicación.
- Una solicitud con soportes de varios tenants requiere contexto global autorizado.
- Un soporte sin ownership verificable permanece pendiente y fuera del catálogo comercial.
- El principal administrativo compartido existente se resuelve como `global_admin`; no identifica a una persona.

**Bloqueo previo a actividades por usuario o sincronización por tenant:** implementar/validar identidad individual persistente, membresías activas y matriz de permisos. Hasta entonces, no atribuir acciones a una persona ni simular roles individuales.

## 4. Contrato para cualquier integración externa

Cada integración nueva debe encapsularse en un adaptador independiente del dominio. No llamar APIs de proveedores directamente desde componentes React ni mezclar lógica de proveedor en handlers de inventario.

Estructura sugerida (crear solo cuando se implemente la primera integración):

```text
src/
  integrations/
    <provider>/
      client.ts
      mapper.ts
      service.ts
      errors.ts
      types.ts
  server/
    services/
      integrationOutbox.ts
tests/
  unit/integrations/
  integration/
docs/integrations/
  <provider>.md
```

Reglas obligatorias:

1. **Contrato interno:** definir identificadores internos estables y campos permitidos antes de mapear.
2. **Idempotencia:** cada operación repetible debe usar una clave estable; una repetición no debe duplicar contactos, Deals, documentos ni eventos.
3. **Desacoplamiento:** una caída externa no debe impedir guardar una solicitud local válida.
4. **Outbox:** para sincronizaciones que nacen de una transacción local, persistir el evento junto con el cambio local y procesarlo fuera del request HTTP.
5. **Reintentos:** usar backoff acotado, clasificar errores transitorios/permanentes y disponer de una cola o estado de revisión para fallos agotados.
6. **Precedencia:** documentar qué sistema puede escribir cada campo. No sobrescribir cambios manuales del proveedor sin regla explícita.
7. **Auditoría:** registrar proveedor, operación, identificador interno, resultado, timestamps e intento; nunca tokens, secretos ni payloads completos con PII.
8. **Privacidad:** minimizar PII, limitar retención y evitar enviar notas libres o datos sensibles a terceros sin necesidad y aprobación.
9. **Webhooks:** validar firma/HMAC, timestamp, tolerancia de reloj, replay/idempotency y tamaño del cuerpo antes de procesar.
10. **Tiempo de espera:** configurar timeout explícito; no dejar requests HTTP dependientes de una llamada externa sin límite.

## 5. Preparación específica de HubSpot

**Estado confirmado:** no se encontró una integración HubSpot implementada en el código auditado. La ficha comercial puede mostrar solicitudes y Media Kits persistidos, pero no debe presentarlos como Deals ni inventar pipeline, etapa, owner o importe de oportunidad.

Antes de habilitar escrituras en HubSpot, documentar y aprobar:

- Portal/account ID y entorno (sandbox o producción).
- Objeto destino (Contact, Company, Deal u otro).
- Pipeline y etapa inicial reales.
- Owner/propietario y regla de asignación.
- Correspondencia de tenants y alcance global.
- Campos internos que se exportan y campos externos que pueden actualizarse.
- Política de deduplicación y reconciliación.
- Consentimiento/base legal, minimización de PII y retención.
- Manejo de rate limits, errores, reintentos y recuperación.

Diseño recomendado para el vínculo local:

- `provider`, `portal_id`, `entity_type`, `external_id`.
- `internal_entity_type`, `internal_entity_id`.
- `sync_status`, `last_synced_at`, `last_error_code`, `attempt_count`.
- Clave única por proveedor + portal + entidad interna para idempotencia.

No crear Deals hasta que pipeline, etapa, owner y política de duplicados estén confirmados. Una solicitud local no equivale automáticamente a una oportunidad comercial.

## 6. Variables de entorno

Usar `.env.example` como inventario de nombres, nunca como almacén de valores. Mantener los secretos en el gestor de variables del entorno correspondiente.

| Variable | Uso | Tratamiento |
|---|---|---|
| `DATABASE_URL` | Conexión Neon/PostgreSQL | Obligatoria en backend; distinta por QA/Preview/Production |
| `ADMIN_USER` | Usuario del administrador existente | Secreto/configuración del entorno |
| `ADMIN_PASSWORD` | Contraseña del administrador existente | Secreto |
| `JWT_SECRET` | Firma de sesión/token y clave HMAC preferida | Secreto fuerte; `ADMIN_SECRET` es fallback heredado |
| `ADMIN_SECRET` | Compatibilidad heredada para secreto administrativo | Mantener solo mientras haya consumidores |
| `CORS_ORIGINS` | Orígenes permitidos por API | Lista explícita; no usar comodines en producción |
| `R2_ACCOUNT_ID` | Cuenta R2 | Configuración |
| `R2_BUCKET_NAME` | Bucket R2 | Configuración |
| `R2_ACCESS_KEY_ID` | Credencial R2 | Secreto |
| `R2_SECRET_ACCESS_KEY` | Credencial R2 | Secreto |

Las nuevas integraciones deben añadir variables documentadas al ejemplo sin valores reales. No compartir credenciales entre QA y Production. No exponer secretos con prefijos públicos ni enviarlos al bundle del navegador.

## 7. Migraciones y compatibilidad

1. Inspeccionar consumidores y esquema actual antes de diseñar SQL.
2. Crear migración SQL numerada/versionada y revisar su efecto sobre datos existentes.
3. Probar en una rama Neon no productiva aislada.
4. Verificar que el runtime QA apunta a esa rama y ejecuta el commit esperado.
5. Ejecutar pruebas de migración, lectura/escritura, rollback o estrategia de forward-fix.
6. Confirmar compatibilidad de todos los runtimes activos (Vercel y Render si ambos consumen el esquema).
7. Solicitar HUMAN GATE antes de aplicar cambios de esquema/datos en Production.

No crear ramas Neon nuevas ni eliminar ramas para liberar cuota sin autorización específica.

## 8. Validación obligatoria por integración

- [ ] Contrato de datos y sistema de verdad definidos.
- [ ] Identidad, tenant y permisos verificados.
- [ ] Idempotencia y deduplicación probadas.
- [ ] Timeouts, rate limits, reintentos y recuperación definidos.
- [ ] Logs sanitizados y trazabilidad disponibles.
- [ ] Secretos separados por entorno y fuera del repositorio.
- [ ] Unit tests del mapper, cliente, errores y reglas de negocio.
- [ ] Contract/integration tests con fixtures o sandbox del proveedor.
- [ ] Migración revisada y probada en QA, si aplica.
- [ ] `npm ci`, `npm run lint`, `npm run test:unit` y `npm run build` PASS.
- [ ] Playwright/Visual QA PASS cuando la integración cambie UI o flujos.
- [ ] Preview QA corresponde al SHA auditado.
- [ ] Revisión humana de datos, permisos y comportamiento antes de habilitar escrituras externas.

## 9. Estado operativo al preparar esta guía

- Rama candidata auditada: `pmv-validation-candidate`.
- `npm ci`, TypeScript/lint, 59 tests unitarios, build y auditoría npm se ejecutaron correctamente en un entorno limpio.
- La ejecución visual local sin baseline restaurado no es concluyente: 22 pruebas pasaron, 2 quedaron omitidas y 6 no pudieron comparar snapshots porque no estaban presentes en el clon limpio. No se generaron ni aprobaron baselines nuevos.
- Render QA requiere verificar su rama/código actual antes de atribuirle la consistencia de dependencias de la candidata.
- La conexión Git Vercel y la protección de Neon siguen como bloqueos de infraestructura documentados en `docs/infra/normalization-audit-2026-11-06.md`.

## 10. Decisiones que requieren HUMAN GATE

- Merge a `main` o promoción a Production.
- Cambios en DNS, WAF, proxy o TLS de dominio.
- Reasignación de Git repository/production branch en Vercel o Render.
- Migraciones/backfills/escrituras sobre Neon Production.
- Creación, eliminación o cambio de protección de ramas Neon cuando afecte datos o disponibilidad.
- Activación de integraciones con escritura real en HubSpot u otros sistemas.
- Envío de comunicaciones reales a clientes.
