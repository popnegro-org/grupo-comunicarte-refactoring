# Media Kit: persistencia, recuperación y auditoría de entrega

**Estado:** implementado y validado en pmv-validation-candidate  
**HEAD validado:** 231d87d0dfe234bfc3fa34a4849b6a68e4526f28  
**Alcance:** administrador global único. No hay aislamiento de autorización por usuario/tenant.

## Contrato de exportación

- Un Media Kit debe estar en estado **ready** antes de aceptar sus exportaciones.
- Se aceptan únicamente PDF (application/pdf) y PPTX (application/vnd.openxmlformats-officedocument.presentationml.presentation).
- El backend valida MIME, firma de archivo y tamaño máximo de 4 MiB.
- Los objetos se almacenan en R2 bajo mediakit/<kitId-seguro>/exports/pdf.pdf y pptx.pptx.
- Las claves R2 se guardan únicamente en mediakits.metadata.exports; no se devuelven al cliente.
- pdf_url y ppt_url guardan rutas internas autenticadas, no URLs públicas de R2.
- El metadata persistido registra contentType, size, sha256, uploadedAt y actor global_admin.
- La recuperación requiere sesión administrativa. El endpoint entrega un redirect a URL R2 firmada con TTL de 300 segundos y cabeceras private, no-store.
- El bucket R2 de Preview es privado. Los documentos comerciales no se publican en r2.dev ni en el dominio público de medios.

## Endpoints

| Método | Ruta | Propósito |
|---|---|---|
| PUT | /api/admin/mediakits/:kitId/exports/:format | Persistir PDF/PPTX en R2 y registrar checksum/tamaño |
| GET | /api/admin/mediakits/:kitId/exports/:format | Recuperar mediante URL firmada temporal |
| DELETE | /api/admin/mediakits/:kitId/exports/:format | Eliminar el objeto y liberar su referencia |

El campo storageKey se filtra de todas las respuestas de Media Kit. El endpoint de borrado valida que la clave pertenezca al prefijo del Media Kit, elimina primero el objeto y luego limpia metadata/URL para que un fallo de almacenamiento no deje una referencia perdida sin posibilidad de reintento.

## Confirmación de entrega

- La UI genera PDF y PPTX, los persiste antes de abrir el share sheet o preparar el borrador de correo.
- Los links de recuperación permanecen disponibles en la ficha de solicitud; en móvil tienen un touch target mínimo de 44 px.
- El usuario debe confirmar la entrega después de completar el envío real.
- PATCH /api/admin/mediakits/:kitId/status con status=sent exige ambos objetos persistidos.
- En una única transacción PostgreSQL se actualiza el Media Kit, se agrega un evento delivery_confirmed a metadata y, si existe source_request_id, se actualiza la solicitud a enviado.
- Canales auditados: share_sheet, mailto_draft y manual.
- El actor queda registrado como global_admin; no se inventa identidad individual.
- La app no envía correos ni mensajes automáticamente. Mailto/share son acciones iniciadas por el administrador; no hubo comunicaciones reales durante QA.

## Infraestructura QA

- Bucket R2 aislado: gc-mediakit-qa.
- R2_BUCKET_NAME está configurado únicamente para Preview y la rama pmv-validation-candidate.
- Las credenciales R2 existentes se validaron mediante upload, descarga y borrado real en ese bucket.
- Producción conserva su bucket gc-storage; no se modificó ninguna variable de entorno Production ni se desplegó código a Production.

## Evidencia reproducible

- Unit tests: MIME de documentos separado del uploader multimedia; firma PDF/PPTX; sanitización de key.
- Visual QA: **38 PASS / 2 SKIP** (GitHub Actions run 42696934483).
- CI Candidate: validate PASS (typecheck, unit y build); run PR 42696946710.
- CI: PASS; audit de dependencias de producción **0 vulnerabilidades**; run 42696946283.
- Authenticated Preview Smoke: **9/9 Playwright PASS**; run 42696934488.
- Vercel Preview deployment dpl_GaJAc7kRUXacPoJ9LSRQUXSUKcYy: READY, SHA exacto 231d87d, branch candidata.
- El smoke real creó una solicitud sintética idempotente, guardó un Media Kit, subió PDF/PPTX a R2, descargó ambos, confirmó entrega, verificó que la solicitud pasara a enviado, comprobó el evento de auditoría y eliminó ambos objetos. El listado posterior de gc-mediakit-qa quedó vacío.

### Fixture sintético remanente en Neon Preview

El test deja un único fixture reutilizable en branch Preview br-muddy-cell-au64infb:

- Solicitud: REQ-2026-a7f18d2c-4e91-4b5f-9a83-2f7c6d5e4b10, estado pending.
- Media Kit: KIT-QA-EXPORT-RECOVERY, estado draft, una línea de Media Kit.
- Email sintético: qa-export-recovery@example.invalid.
- pdf_url y ppt_url: NULL; metadata de exports vacía.
- R2: cero objetos bajo mediakit/.

El fixture se reutiliza para no acumular solicitudes/Media Kits por cada ejecución. No existe en Neon Production. No se borró mediante SQL porque la eliminación de registros requiere un gate separado.

## Pendiente fuera de este subalcance

- HubSpot: pipeline, stage, owner, política de duplicados y credenciales de aplicación no están definidos.
- Resend/email transaccional y WhatsApp: faltan configuración/credenciales y política de consentimiento. El envío real seguirá bajo aprobación humana.
- P2 de performance, SEO/GEO y validación manual integral continúa separado.
- PR #90 permanece Draft. No mergear ni desplegar Production sin HUMAN GATE.
