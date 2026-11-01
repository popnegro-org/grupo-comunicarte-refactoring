# Contrato de aceptación del PMV — Grupo Comunicarte OOH

**Estado:** contrato vigente para `pmv-validation-candidate`  
**Fecha:** 2026-11-01  
**Objetivo:** definir alcance, reglas comerciales, integraciones, seguridad y condiciones verificables de cierre. Este documento prevalece sobre auditorías históricas contradictorias. No declara implementado aquello que aún no tiene evidencia.

## 1. Alcance

El PMV permite al equipo interno administrar inventario OOH de dos tenants, preparar Media Kits y gestionar solicitudes comerciales con trazabilidad.

**Incluido:** autenticación del administrador existente; administración global de ambos tenants; inventario, mapa y detalle; Media Kits; solicitudes persistidas en Neon; medios en R2; exportaciones sin precios internos; gestión comercial y registro de entrega; Preview y QA.

**Fuera de alcance salvo decisión explícita:** alta de usuarios/invitaciones; migración a identidad individual; ownership inferido; integraciones Drive/Slides, HubSpot, Resend/email transaccional o WhatsApp API no implementadas; cambios de Production; merge a `main` o promoción a Production sin HUMAN GATE.

## 2. Principios obligatorios

1. Fail closed ante identidad, tenant, ownership o autorización desconocidos.
2. No inferir tenant por ciudad, nombre, coordenadas, identificadores legacy o proximidad.
3. Administrador global no significa datos sin tenant: inventario, precios, Media Kits y trabajo operativo siempre deben conservar ownership.
4. Precios internos nunca se exponen en APIs públicas, PDFs/PPTs de cliente, HTML exportado, logs o errores.
5. No presentar un CTA, enlace externo o registro local como integración transaccional.
6. No ejecutar DDL ni backfills en Production durante QA.

## 3. Acceso y tenancy

- Conservar el único administrador/credencial existente. No crear usuarios ni invitaciones.
- El administrador autenticado tiene alcance global sobre `tenant-ba` y `tenant-default`.
- Cada soporte elegible debe tener exactamente un `tenant_id` válido.
- `tenant_id = NULL` significa pendiente/cuarentena, nunca tenant por defecto.
- Un soporte pendiente no puede publicarse comercialmente, reservarse, cotizarse, incluirse en Media Kit ni exportarse como oferta.
- Asignar ownership solo con evidencia autoritativa (maestro validado, documento o confirmación comercial). Registrar evidencia/referencia, actor y fecha.
- Una solicitud mixta puede tener cabecera global; cada ítem y operación derivada debe tener tenant propio.
- Solicitudes históricas mixtas no se dividen ni atribuyen retroactivamente sin decisión comercial.
- Ningún cliente puede establecer su propio tenant mediante parámetros del request.
- RLS solo se activa después de verificar contexto por transacción/conexión y el rol real de runtime. No probar únicamente como owner de tablas. Si el runtime usa principal compartido, diseñar el contexto acorde; no crear políticas que dependan de usuarios finales inexistentes.

## 4. Contrato de inventario

| Dimensión | Valores | Regla |
|---|---|---|
| Tipología | Tradicional, LED móvil, Pantallas LED | Tipo de soporte |
| Mapeo | Mapeado / Pendiente de mapeo | No inventar coordenadas |
| Disponibilidad | Disponible / Reservado | Solo Disponible es seleccionable |
| Estado operativo | Operativo / Mantenimiento / Inactivo | Independiente de disponibilidad |
| Publicación | Activo / Archivado | Independiente de los anteriores |

- Reservado no se puede seleccionar en una nueva solicitud.
- Toda reserva muestra `Desde` y `Hasta`.
- Mantenimiento e Inactivo no pueden ofertarse como Disponible.
- No prometer exclusividad ni conflictos temporales si el backend no los valida.
- Mapa y dashboard deben representar datos reales; no completar ubicación ni usar mocks como inventario.

## 5. Contrato comercial y Media Kit

### Duraciones
Modalidades estándar: **7 días, 15 días, 21 días y mensual**. No ofrecer semanas, quincenas, meses arbitrarios, indefinido o duración libre como equivalentes. Una excepción, si se autoriza, será “Personalizada”, con fecha inicial/final obligatorias, validación backend y marca visible. El texto libre no puede calcular ni validar una contratación.

### Solicitudes
- Seleccionar solo soportes disponibles, activos, operativos y asignados a tenant.
- Backend revalida disponibilidad, ownership y elegibilidad al crear solicitud.
- Persistir cabecera, ítems, scope y tenant por ítem.
- Reintentos no deben duplicar solicitudes: idempotency key y prueba de concurrencia.
- La confirmación de recepción no equivale a reserva ni contratación.

### Precios y exportación
- Costos, márgenes y precios unitarios internos son confidenciales.
- Solo roles autorizados acceden a pricing.
- Documento para cliente puede incluir importe comercial global aprobado, nunca precios internos por soporte.
- Sin importe global aprobado no inferir ni derivar total desde campos internos.
- Probar API, JSON, HTML, PDF, PPT, descarga, impresión, logs y errores.

### Flujo comercial requerido
1. Solicitud recibida.
2. Validación y responsable.
3. Revisión de soportes/disponibilidad.
4. Cotización con importe global aprobado.
5. Generación de PDF/PPT.
6. Registro de versión, fecha y responsable.
7. Entrega por canal confirmado.
8. Registro de resultado/confirmación.
9. Seguimiento y cierre.

Una solicitud persistida no significa cotización emitida ni entrega realizada.

## 6. Integraciones y evidencia

| Sistema | Alcance / condición de aceptación |
|---|---|
| Neon | Fuente de verdad; migraciones versionadas, constraints y consultas tenant-safe |
| Vercel | Preview READY vinculado al SHA candidato; endpoints saludables |
| R2 | Upload/download autorizado, URLs firmadas, expiración, MIME/tamaño y recuperación |
| Leaflet/mapa | Estados reales, coordenadas faltantes, móvil y errores del proveedor |
| HubSpot | No acreditado; opcional salvo contrato. Requiere auth server-side, mapeo, idempotencia y QA |
| Resend/email | No acreditado; requiere remitente, plantillas, deduplicación, reintentos y logs |
| WhatsApp | Canal manual: CTA con destino configurado. API transaccional es alcance separado |
| Drive/Slides | Fuera del PMV base hasta decisión |
| GA4/Clarity | Complementario; consentimiento y eventos sin datos sensibles |

Una variable de entorno, botón o URL externa no acredita una integración.

## 7. Seguridad

- Sesión admin validada en servidor; cookies seguras en Production.
- Rate limit distribuido del login; fallo de DB bloquea autenticación.
- No registrar contraseñas, tokens, IPs en claro ni precios internos.
- Validar input, tenant y autorización en cada endpoint; evitar IDOR y mass assignment.
- Archivos: MIME real, extensión, tamaño, autorización y rutas.
- Revisar CORS, CSRF cuando aplique, headers, errores y dependencias.
- No ejecutar DDL desde peticiones web.

## 8. Criterios de aceptación

### P0 — bloquean el PMV
- [ ] Ownership probado para todo soporte elegible; pendientes en cuarentena.
- [ ] CRUD y endpoints filtran tenant en lectura y escritura.
- [ ] Solicitud mixta: cabecera global, ítems tenant-scoped.
- [ ] Media Kits, pricing, solicitudes, estadísticas, media y exportaciones tenant-safe.
- [ ] Pruebas negativas cross-tenant, spoofing e IDOR.
- [ ] RLS/rol runtime probados con el principal real o decisión segura documentada.
- [ ] Cero filtraciones de precios internos en API y exportaciones.
- [ ] Flujo de solicitud persistente, gestionable e idempotente.

### P1 — cierre comercial
- [ ] Duraciones iguales en UI, API, persistencia y documentación.
- [ ] Cotización, PDF/PPT, entrega y registro trazables.
- [ ] Exportación y recuperación probadas en desktop y móvil.
- [ ] Integraciones incluidas en el alcance verificadas end-to-end; las no contratadas quedan fuera de alcance.
- [ ] Reintentos, errores e idempotencia cubiertos.

### P2 — calidad y release
- [ ] Typecheck, unit tests, build y Playwright en el SHA exacto.
- [ ] QA visual/funcional real desktop y móvil, no solo mocks.
- [ ] Accesibilidad: teclado, foco, labels, contraste y estados.
- [ ] Rendimiento, bundle y consola revisados.
- [ ] Documentos históricos marcados como obsoletos o enlazados aquí.
- [ ] Evidencias adjuntas al PR.

## 9. Estado verificado de referencia (auditoría Preview, 2026-11-01)

- Candidato: `pmv-validation-candidate`; no modificar `main`.
- Preview Neon: `preview/pmv-validation-candidate`; Production intacta.
- Instantánea auditada: 46 soportes, 32 ítems y 18 cabeceras sin ownership/scope asignado.
- Tres solicitudes históricas mezclan tenants.
- Diez soportes inactivos carecen de ciudad; no inferir ownership.
- Runtime todavía no aplicaba tenant predicates en servicios de negocio.
- Primitivas tenantAccess y tests son fundación, no aislamiento efectivo.
- CI/Visual QA verdes no acreditan ownership ni aislamiento.
- HubSpot, Resend/email transaccional y WhatsApp API no acreditados.
- UI Media Kit presentaba unidades adicionales a las modalidades estándar.
- Login limiter y deployment Preview habían sido validados previamente; repetir en el SHA liberable.

Estos datos son una instantánea histórica, no un estado en vivo. Revalidar antes de migraciones.

## 10. Bloqueantes que requieren evidencia/decisión humana

1. Ownership de cada soporte: obtener maestro o confirmación comercial. Mientras tanto, mantener NULL y cuarentena.
2. Solicitudes históricas mixtas: conservar globales/legacy; no dividir ni reasignar sin decisión.
3. Excepciones de duración: estándar de cuatro modalidades; aprobar política personalizada.
4. Canales de entrega e integraciones contratadas: requieren permisos, credenciales y configuración del cliente.
5. DDL/backfill en Production: aprobación explícita y ventana de despliegue.

El trabajo autónomo seguro continúa: cuarentena, validación fail-closed, asignación auditada, filtros, tests y documentación.

## 11. Secuencia de cierre

1. Cuarentena por defecto y flujo admin de asignación con evidencia.
2. Tenant predicates en servicios/rutas y tests negativos.
3. Solicitudes globales con ítems tenant-scoped.
4. Pricing, Media Kit, idempotencia y privacidad.
5. Alinear duraciones.
6. Cotización, exportación y entrega trazables.
7. QA Neon Preview, R2, mapa, login y flujos reales.
8. Typecheck, unit, build, Playwright y QA visual.
9. Consolidar documentación y evidencias.
10. Abrir PR a `main` solo con P0/P1 cerrados. Merge queda reservado al HUMAN GATE.

## 12. Regla de liberación

**NO-GO** si queda cualquier P0 abierto, un soporte sin ownership puede venderse, existe acceso cross-tenant, se filtra pricing o el flujo comercial no se completa.

**GO para revisión humana** cuando P0/P1 estén cerrados con evidencia en el SHA exacto y CI/QA pasen. Merge y Production siguen siendo decisiones humanas.
