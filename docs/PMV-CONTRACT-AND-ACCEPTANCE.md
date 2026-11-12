# Contrato de aceptación del PMV — Grupo Comunicarte OOH

**Estado:** contrato vigente para `pmv-validation-candidate`  
**Fecha:** 2026-11-01  
**Objetivo:** definir alcance, reglas comerciales, integraciones, seguridad y condiciones verificables de cierre. Prevalece sobre auditorías históricas contradictorias. No declara implementado aquello que aún no tiene evidencia.

## 1. Alcance

El PMV permite al equipo interno administrar inventario OOH de dos tenants, preparar Media Kits y gestionar solicitudes comerciales con trazabilidad.

**Incluido:** autenticación del administrador existente; administración global de ambos tenants; inventario, mapa y detalle; Media Kits; solicitudes persistidas en Neon; medios en R2; exportaciones sin precios internos; gestión comercial y registro de entrega; Preview y QA.

**Fuera de alcance salvo decisión explícita:** alta de usuarios/invitaciones; migración a identidad individual; ownership inferido; integraciones Drive/Slides, HubSpot, Resend/email transaccional o WhatsApp API no implementadas; cambios de Production; merge a `main` o promoción a Production sin HUMAN GATE.

## 2. Principios obligatorios

1. Fail closed ante identidad, tenant, ownership o autorización desconocidos.
2. No inferir tenant por ciudad, coordenadas o proximidad. El ownership se obtiene de la correspondencia documentada en los PDFs fuente y su canonical_id.
3. Administrador global no significa datos sin tenant: inventario, precios, Media Kits y trabajo operativo siempre conservan ownership.
4. Precios internos nunca se exponen en APIs públicas, PDFs/PPTs de cliente, HTML exportado, logs o errores.
5. No presentar un CTA, enlace externo o registro local como integración transaccional.
6. No ejecutar DDL ni backfills en Production durante QA.

## 3. Acceso y tenancy

- Conservar el único administrador/credencial existente. No crear usuarios ni invitaciones.
- El administrador autenticado tiene alcance global sobre `tenant-ba` y `tenant-default`; no existen usuarios con membresía tenant-scoped en este PMV.
- El catálogo público también es global y puede mostrar soportes asignados de ambos tenants; no es un panel privado de cada tenant.
- `tenant_id` es ownership/partición operativa y comercial, no una frontera de autorización entre usuarios en esta versión.
- Cada soporte elegible debe tener exactamente un `tenant_id` válido.
- `tenant_id = NULL` significa pendiente/cuarentena, nunca tenant por defecto.
- Un soporte pendiente no puede publicarse comercialmente, reservarse, cotizarse, incluirse en Media Kit ni exportarse como oferta.
- Asignar ownership solo por correspondencia inequívoca con los PDFs fuente versionados; registrar evidencia/referencia, actor y fecha.
- Una solicitud mixta puede tener cabecera global; cada ítem y operación derivada conserva tenant propio.
- Solicitudes históricas mixtas no se dividen ni atribuyen retroactivamente.
- Ningún cliente puede establecer su propio tenant mediante parámetros del request.
- RLS solo se activa después de verificar contexto por transacción/conexión y el rol real de runtime. No probar únicamente como owner de tablas.

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
Modalidades estándar: **7 días, 15 días, 21 días y mensual**. No ofrecer semanas, quincenas, meses arbitrarios, indefinido o duración libre como equivalentes. Una excepción autorizada será “Personalizada”, con fecha inicial/final obligatorias, validación backend y marca visible. El texto libre no puede calcular ni validar una contratación.

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
- No ejecutar DDL desde peticiones web; el runtime verifica el esquema y falla cerrado si falta una migración.

## 8. Criterios de aceptación

### P0 — bloquean el PMV
- [x] Ownership conciliado con los PDFs fuente para los 28 soportes elegibles; 18 filas sin evidencia permanecen en cuarentena.
- [x] CRUD/endpoints respetan el modelo de administración global: ownership se lee desde DB; nuevas altas requieren tenant y evidencia explícitos; una asignación existente no puede cambiarse desde CRUD.
- [x] Solicitud mixta: cabecera global, ítems tenant-scoped; las líneas pendientes no pueden avanzar comercialmente.
- [x] Media Kits, pricing, solicitudes, estadísticas, media y exportaciones respetan el ownership operativo; las rutas públicas excluyen ownership y pricing.
- [x] Pruebas negativas de autenticación, tenant spoofing, reasignación, soportes pendientes e IDOR contra las rutas administrativas del administrador global.
- [x] Decisión segura documentada para el runtime: no hay usuarios tenant-scoped en este PMV; el único administrador es global. RLS no se declara activo porque el rol Neon runtime tiene BYPASSRLS; no se promete aislamiento entre usuarios por tenant.
- [x] Cero filtraciones de precios internos en API pública, PDF y PPTX de cliente.
- [x] Flujo de solicitud persistente e idempotente; pruebas secuencial y concurrente en Preview sin duplicados.
- [x] Fuente documental y asignación auditada de ownership de 28 soportes conciliados en Neon Preview.
- [x] Soportes e ítems sin ownership excluidos del catálogo y del flujo comercial; los pendientes no pueden entrar a un Media Kit ni cotizarse.
- [ ] Media Kits y sus líneas persisten tenant_id por soporte; la cabecera de un kit multi-tenant queda global. Las FK compuestas están instaladas, pero `mediakit_request_items.tenant_id` es nullable y PostgreSQL `MATCH SIMPLE` omite la comprobación cuando ese valor es NULL. Falta aplicar y probar `docs/pmv/migrations/20261112_request_item_tenant_inheritance.sql`: los nuevos/actualizados ítems heredan el tenant del soporte y rechazan spoofing; las líneas históricas NULL permanecen pendientes incluso si el soporte recibe ownership después, hasta una reconciliación explícita.
### P1 — cierre comercial
- [x] Duraciones estándar (7, 15, 21 días y mensual) alineadas en ambos constructores y validadas también en backend; valores legacy no estándar requieren revisión explícita.
- [x] Cotización, PDF/PPT, entrega y registro trazables (subalcance validado en Preview; evidencia en `docs/pmv/mediakit-export-delivery.md`).
- [x] Exportación y recuperación probadas en desktop y móvil (smoke autenticado 9/9 sobre el SHA runtime validado; recuperación y UI móvil cubiertas por Playwright).
- [x] Integraciones incluidas en el alcance verificadas end-to-end; las no contratadas quedan fuera de alcance (Neon/Vercel Preview, R2 y Leaflet/OpenStreetMap; evidencia en las secciones 14–16).
- [x] Solicitudes públicas idempotentes: clave estable por payload, conflicto concurrente resuelto por `UNIQUE(request_id)` y prueba Preview concurrente 201/200 sin duplicados.

### P2 — calidad y release
- [x] Typecheck, unit tests, build y Playwright en el HEAD candidato `593e5d1`; el smoke autenticado corresponde al SHA runtime `231d87d`, sin cambios de código runtime posteriores.
- [ ] QA visual/funcional real desktop y móvil, no solo mocks.
- [ ] Accesibilidad: teclado, foco, labels, contraste y estados.
- [ ] Rendimiento, bundle y consola revisados.
- [ ] Documentos históricos marcados como obsoletos o enlazados aquí.
- [x] Evidencias adjuntas al PR.

## 9. Estado verificado tras conciliación (2026-11-01)

- Candidato: `pmv-validation-candidate`; no modificar `main`.
- Preview Neon: `preview/pmv-validation-candidate`; Production intacta.
- Fuente primaria de ownership: PDFs en `docs/inventario/source/`; detalle en [TENANT-OWNERSHIP-MAPPING.md](inventario/processed/TENANT-OWNERSHIP-MAPPING.md).
- Se conciliaron 28 soportes: 10 Buenos Aires y 18 Mendoza.
- Preview: 46 soportes; 10 tenant-ba, 18 tenant-default, 18 NULL (17 inactivos y 1 activo sin fuente).
- Preview: 32 ítems de solicitudes; 5 tenant-ba, 25 tenant-default, 2 NULL.
- Preview: 18 solicitudes; 2 mixtas conciliadas con scope global, 14 homogéneas con scope tenant y 2 sin scope. Una de estas últimas contiene ítems de ambos tenants y un ítem pendiente; no se la debe clasificar automáticamente.
- Preview: se añadió `mediakit_items.tenant_id` con FK e índice; la tabla tenía 0 filas al aplicar la migración, por lo que no hubo backfill de líneas. El runtime ahora valida columnas requeridas y no ejecuta DDL en requests.
- Runtime Preview usa `neondb_owner` con `rolbypassrls = true`; RLS no se considera activo. Los endpoints admin están protegidos por `requireAdmin`; no hay usuarios tenant-scoped.
- En SHA `67585d4d45a51ccc97a4eaede308c1204f1ab773`, `/api/health` respondió 200 con DB conectada; `/api/supports` devolvió 28 soportes; el soporte activo no asignado `mza-trad-16` devolvió 404 y una solicitud pública con ese ID fue rechazada (404). Conteos de solicitudes permanecieron 18 cabeceras y 32 ítems.
- CI Candidate y Visual QA de ese SHA concluyeron success; Visual QA ejecutó Playwright contra baseline confiable. La verificación funcional autenticada de Media Kit sigue pendiente.
- HubSpot, Resend/email transaccional y WhatsApp API no acreditados.
- UI Media Kit presentaba unidades adicionales a las modalidades estándar; debe alinearse.
- Login limiter y deployment Preview habían sido validados previamente; repetir en el SHA liberable.

Los conteos son una instantánea Preview y deben revalidarse antes de futuras migraciones.

## 10. Bloqueantes externos y límites

1. `mza-trad-16`, filas QA/CRUD y legacy sin correspondencia permanecen en cuarentena hasta obtener evidencia comercial.
2. Las tres solicitudes históricas mixtas se conservan globales; no dividirlas.
3. Excepciones de duración requieren política comercial aprobada.
4. Canales de entrega e integraciones contratadas requieren permisos, credenciales y configuración del cliente.
5. DDL/backfill en Production requiere aprobación explícita y ventana de despliegue.

El trabajo autónomo seguro continúa en filtros, cuarentena, asignación auditada, tests y documentación.

## 11. Secuencia de cierre

1. Cuarentena efectiva de registros e ítems pendientes.
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


## 13. Cierre P0 — revalidación 2026-11-09

- Rama candidata: pmv-validation-candidate; main y Production permanecen intactas.
- El editor de soportes incorpora selección explícita de tenant y referencia documental. No deriva ownership de la ciudad. El backend exige evidencia PDF/posición para nuevas asignaciones, valida el tenant contra tenants, conserva asignaciones existentes y rechaza reasignaciones desde CRUD.
- supports registra tenant_ownership_evidence, tenant_ownership_assigned_by y tenant_ownership_assigned_at. Los 28 ownerships conciliados fueron backfilled con la referencia al PDF y posición documentados; actor de migración documented-reconciliation, fecha 2026-11-01. No se asignaron las 18 filas pendientes.
- mediakit_items.tenant_id quedó NOT NULL y con FK compuesta (support_id, tenant_id) hacia supports(canonical_id, tenant_id). mediakit_request_items conserva NULL para los dos ítems históricos pendientes, pero los ítems asignados tienen FK compuesta que impide mismatch de tenant.
- Verificación Neon Preview: 28 soportes asignados y con los tres campos de auditoría; 18 pendientes; 0 mismatches de ownership en mediakit_request_items; mediakit_items no tenía filas al aplicar NOT NULL.
- Pruebas de código locales: lint/typecheck PASS; 78/78 unit tests PASS; build PASS; audit de dependencias de producción 0 vulnerabilidades; Playwright deployment discovery 8 tests.
- QA autenticado ampliado en tests/deployment/deployment-smoke.spec.ts: rutas admin sin sesión 401; lectura pública sin tenant/pricing; lectura admin con ownership; altas sin tenant/evidencia rechazadas; tenant spoof/reasignación rechazada; Media Kit con soporte pendiente y avance de solicitud pendiente rechazados. Debe ejecutarse en el deployment Preview del SHA final para acreditar el cierre funcional.
- Alcance explícito: administrador único global; no hay aislamiento de acceso entre usuarios tenant-scoped y no se activa RLS con un rol BYPASSRLS. Esta decisión no debe presentarse como aislamiento multiusuario.
- Este cierre P0 no cierra P1/P2 ni autoriza merge o promoción a Production. Las migraciones Production requieren aprobación humana independiente.


### Evidencia de ejecución Preview — 2026-11-09

- SHA candidato validado: 2c54df771700b474d1c6d847d7d2bc7ca767873e.
- Vercel Preview: deployment dpl_itz7E3pkghguTZ6DZBiaEwbTQVxj, READY; health HTTP 200, DB connected y commit exacto. No es Production.
- GitHub Actions CI Candidate run 42686323500: validate PASS y Authenticated Preview Smoke PASS, 8/8 Playwright tests.
- GitHub Actions CI run 42686323448: PASS. Visual QA run 42686323692: PASS.
- El smoke autenticado comprobó rutas admin sin sesión 401; catálogo público de 28 soportes sin ownership/pricing y sin mza-trad-16; admin ve ownership/evidencia; altas sin tenant/evidencia 400; tenant inválido 400; reasignación de tenant 400; Media Kit con soporte pendiente 409; avance de solicitud con ítem pendiente 409.
- Después de las pruebas, Neon Preview conserva 46 soportes: 28 asignados con auditoría y 18 pendientes; solicitud histórica probada conserva status enviado; mediakit_items sigue en 0 filas; no se crearon soportes QA. Cero mismatches en mediakit_request_items.
- No se generaron artifacts en el run autenticado. No se descargaron ni expusieron credenciales.
- RLS continúa deliberadamente desactivado: current_user neondb_owner, rolbypassrls=true. El modelo es un único administrador global, no aislamiento entre usuarios tenant-scoped.
- P0 cerrado para el alcance PMV documentado. P1/P2 siguen abiertos; no se autoriza merge ni promoción a Production. Las migraciones Production requieren aprobación humana independiente.


## 14. Revalidación P1 — Media Kit exportable y entrega trazable (2026-11-09)

- Subalcance de exportación/recuperación: **PASS** en el SHA exacto 231d87d0dfe234bfc3fa34a4849b6a68e4526f28.
- PDF/PPTX se persisten en R2 privado antes de compartir; se validan MIME, firma y tamaño. Las rutas de recuperación requieren sesión administrativa y generan URL firmada temporal. Las claves de almacenamiento no se exponen en DTOs.
- La confirmación de entrega exige ambos documentos, registra actor global, canal y timestamp, y actualiza el estado de la solicitud a enviado en la misma transacción.
- La UI permite recuperar ambos documentos desde la ficha de solicitud en desktop y móvil. No envía comunicaciones automáticamente.
- Evidencia:
  - CI: PASS; audit de dependencias de producción: 0 vulnerabilidades altas/críticas (run 42696946283).
  - CI Candidate: PASS (run 42696946710).
  - Visual QA: 38 PASS / 2 SKIP (run 42696934483).
  - Authenticated Preview Smoke: 9/9 PASS (run 42696934488).
  - Vercel Preview dpl_GaJAc7kRUXacPoJ9LSRQUXSUKcYy: READY en SHA exacto.
  - Bucket R2 Preview gc-mediakit-qa: sin objetos residuales tras el test de upload/download/delete.
- El detalle técnico y el fixture sintético Preview están documentados en docs/pmv/mediakit-export-delivery.md.

**Este PASS no cierra todas las integraciones P1:** HubSpot sigue pendiente de pipeline/stage/owner/deduplicación; Resend/email transaccional y WhatsApp requieren credenciales, política de consentimiento y aprobación antes de enviar comunicaciones reales. P2 continúa abierto. La administración es un único administrador global; no se declara aislamiento multiusuario ni RLS.

**Release:** PR #90 continúa Draft y abierto. GitHub main, Vercel Production, Render Production y bucket R2 Production no fueron modificados por esta iteración. No mergear ni desplegar Production sin HUMAN GATE.


## 15. Revalidación incremental del candidato — 2026-11-09

- HEAD revisado: `593e5d1b99b9b3a12297abf1df11c938dae1a109`.
- Desde el SHA runtime con smoke autenticado `231d87d0dfe234bfc3fa34a4849b6a68e4526f28`, los cambios se limitan a workflows CI, documentación contractual/técnica y pruebas Playwright; no hay cambios de código de aplicación/runtime.
- Ejecución local en el HEAD exacto: `npm ci` PASS (0 vulnerabilidades reportadas), `npm run lint` PASS, `npm run test:unit` PASS (81/81), `npm run build` PASS.
- Regresión de asociación por `sourceRequestId` con ID no convencional `MK-ARBITRARY-2026-042`: Playwright PASS 2/2 (Chromium desktop y mobile).
- GitHub Actions para el HEAD: CI Candidate PASS (run 42706158633), CI PASS (run 42706158974), Visual QA PASS (run 42706158829). Visual QA restauró snapshots desde el cache confiable de `main`; el baseline del mapa se capturó desde `main` en `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70`. El checkout local no contiene esos PNG, por eso la suite local sin cache registra 6 fallos de snapshot; no se generaron ni aprobaron baselines automáticamente.
- Preview Vercel `dpl_GaJAc7kRUXacPoJ9LSRQUXSUKcYy`: READY sobre el SHA runtime `231d87d0dfe234bfc3fa34a4849b6a68e4526f28`; `/api/health` respondió HTTP 200, `status=ok`, `database=connected` y commit exacto. El HEAD candidato no modifica el runtime.
- Smoke autenticado de Preview: 9/9 PASS sobre ese mismo SHA runtime; se conserva la distinción entre SHA runtime probado y HEAD documental/de pruebas.
- Permanecen abiertos en P2: revisión manual de accesibilidad, validación visual/funcional real integral en móvil, rendimiento/bundle y consola. No declarar el PMV completamente liberado mientras esos criterios sigan abiertos.
- No se habilitó RLS, no se cambiaron roles runtime, no se enviaron comunicaciones y no se modificó Production en esta revalidación.


## 16. Verificación de integraciones y mapa real en Preview — 2026-11-09

- Vercel Preview `dpl_GaJAc7kRUXacPoJ9LSRQUXSUKcYy` está READY y corresponde al código runtime `231d87d0dfe234bfc3fa34a4849b6a68e4526f28`.
- `GET /api/health` devolvió HTTP 200, `status=ok`, `database=connected` y el SHA runtime esperado.
- Navegación real a `/inventario` en desktop (1440×900) y móvil (390×844): HTTP 200; mapa Leaflet presente; 24 marcadores y tiles OpenStreetMap cargados; cero errores JavaScript de página; ancho de documento igual al viewport en ambas resoluciones.
- La vista móvil mantuvo el mapa visible con altura de 561 px y sin overflow horizontal. Los marcadores observados no se interpretan como conteo de soportes: la vista contiene 28 resultados comerciales y parte de los soportes no tiene coordenadas publicables.
- R2: smoke autenticado 9/9 PASS sobre el mismo SHA runtime; incluye persistencia y recuperación de PDF/PPTX privados, URLs firmadas y confirmación de entrega.
- Neon: health check conectado y consultas/operaciones autenticadas verificadas por el smoke Preview; ownership y cuarentena se mantienen conforme a las secciones 9 y 13.
- Integraciones no contratadas (HubSpot, Resend/email transaccional, WhatsApp API y Drive/Slides) permanecen fuera del alcance de aceptación; no se simula su integración.
- Esta evidencia cierra el criterio P1 de integraciones incluidas. No cierra P2: falta revisión manual de accesibilidad, QA funcional integral del flujo móvil, rendimiento/bundle y revisión de consola en todas las rutas.
