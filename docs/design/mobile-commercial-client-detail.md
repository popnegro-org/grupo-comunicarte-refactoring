# Ficha comercial mobile — Grupo Comunicarte

## Alcance implementado

La bandeja administrativa de solicitudes abre una ficha lateral responsive con cuatro bloques:

1. **Cliente:** nombre, empresa, email, teléfono y mensaje original. Email y teléfono ofrecen acciones nativas `mailto:` y `tel:` cuando el dato existe.
2. **Oportunidad comercial:** estado y fecha de la solicitud, identificador y cantidad de soportes solicitados.
3. **Actividad registrada:** eventos que pueden derivarse de los registros existentes (recepción de solicitud y actualización del Media Kit).
4. **Media Kit asociado:** estado documental, cantidad de soportes, importe global y enlaces PDF/PPT cuando están persistidos.

## Límites de datos explícitos

- La aplicación no tiene actualmente un modelo/endpoint de oportunidades HubSpot. La solicitud se muestra como seguimiento comercial, pero no se inventa un Deal, pipeline, etapa ni importe de oportunidad.
- No existe un registro independiente de llamadas, reuniones, tareas o notas. La línea de tiempo presenta exclusivamente eventos respaldados por `createdAt` / `updatedAt`; no se simula una actividad registrada.
- La asociación del Media Kit se acepta únicamente cuando `sourceRequestId` coincide exactamente con el `requestId` de la solicitud. El identificador convencional `KIT-<requestId>` por sí solo no demuestra la relación.
- No se incorporan escrituras nuevas en base de datos, migraciones, llamadas reales, cambios HubSpot ni modificaciones de producción.

## Responsive y accesibilidad

- Panel a ancho completo en viewport móvil y ancho máximo de 560 px en escritorio.
- Secciones con encabezados semánticos, controles de cierre accesibles y enlaces externos con `noopener noreferrer`.
- La prueba visual de entrega verifica que las cuatro secciones se rendericen en desktop y móvil y que no exista overflow horizontal.

## Pendientes para completar CRM

1. Integrar una entidad de negocio (HubSpot Deal) con identificadores y etapa reales.
2. Definir y aprobar un modelo persistente de actividades con autor, tipo, fecha, resultado y próxima acción.
3. Incorporar acciones de creación/edición de actividades solo después de disponer de endpoint autenticado, validación de tenant e idempotencia.
