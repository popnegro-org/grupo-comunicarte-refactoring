# UX/UI Audit — Principio visual operativo

## Objetivo

Aplicar de forma transversal el principio visual:

> Menos ornamentación, más densidad informativa útil y acciones claramente contextualizadas.

La referencia conceptual es el lenguaje de dashboards operativos: jerarquía explícita, superficies sobrias, navegación estable, acciones próximas al contexto que modifican y ausencia de decoración que compita con la tarea.

## Reglas transversales

1. **Jerarquía antes que decoración**: títulos, estado, datos y acciones deben dominar la interfaz.
2. **Densidad útil**: reducir espacios verticales excesivos, tarjetas repetitivas y bloques que no aportan decisión.
3. **Acción contextual**: la acción primaria debe aparecer donde el usuario decide qué hacer, con texto específico para el contexto.
4. **Acciones secundarias discretas**: navegación de retorno, vistas auxiliares y enlaces relacionados no deben competir con la acción principal.
5. **Superficies sobrias**: bordes, fondos neutros y radios moderados; sombras y blur solo cuando resuelven una necesidad funcional.
6. **Responsive equivalente**: no trasladar automáticamente la composición desktop al móvil; preservar prioridad de tarea.
7. **No duplicar CTA**: una misma acción comercial no debe repetirse en hero + contenido + cierre salvo que cada aparición tenga un contexto distinto.

## Auditoría por ruta

| Ruta | Estado | Hallazgo / criterio | Acción |
|---|---|---|---|
| `/` | 🟢 intervenida | Hero y secciones tenían badges, gradientes, sombras y espaciado excesivo. | Compactado hero, secciones, tarjetas y navegación contextual hacia Inventario/Contacto. |
| `/soportes` | 🟢 intervenida | Mucha superficie visual para información que puede escanearse más rápido. CTA separado del contexto. | Layout más denso, acciones en hero y acción específica por tipo de soporte. |
| `/soluciones` | 🟢 intervenida | Tarjetas grandes y CTA de cierre redundante. | Convertido a listado escaneable y acciones contextualizadas en encabezado. |
| `/nosotros` | 🟢 intervenida | Contadores y pilares con tratamiento ornamental y CTA duplicado. | Métricas compactas, pilares densos y acciones en encabezado. |
| `/inventario` | 🟢 intervenida | Flujo ya orientado a tarea; el selector móvil debía quedar flotante. | Mantener Mapa/Catálogo flotante en móvil, compactar controles y ajustar altura al header de 64px. |
| `/contacto` | 🟢 intervenida | Formulario correcto, pero hero y tarjetas podían ocupar menos espacio. | Hero contextual + retorno al Inventario, tarjetas de contacto compactas. |
| `/login` | 🟢 intervenida | Patrón visual demasiado ornamental para una tarea puntual. | Acceso sobrio, sin fondo decorativo, sombras ni badges redundantes. |
| `/dashboard` | 🟢 | Ya posee jerarquía ejecutiva, KPI, disponibilidad y solicitudes; CTA principal es contextual. | Mantener como patrón de referencia interno. |
| `/dashboard/soportes` | 🟢 intervenida | Controles y filas con exceso de padding; acciones secundarias competían visualmente. | Filter bar y tabla densificados; `Nuevo soporte` primario, Actualizar/Cancelar discretos; Editar por fila. |
| `/dashboard/soportes/:id/edit` | 🟢 intervenida | Secciones cardificadas y tokens de campo con padding alto. | Tokens Field densos; tabs con menos aire; theme meta discreta; Guardar cambios como única CTA primaria. |
| `/dashboard/soportes/:id/preview` | 🟢 intervenida | Acciones correctas pero con exceso de espacio y radios. | Header contextual y superficies compactas. |
| `/dashboard/soportes/:id/reservation` | 🟢 intervenida | Acción de guardar correcta, pero composición demasiado cardificada. | Flujo compacto con Guardar período como acción primaria. |
| `/dashboard/solicitudes` | 🟡 | Flujo comercial ya tiene acciones de estado; requiere revisión visual transversal. | Siguiente bloque: priorizar estado, cliente, fecha y acción siguiente. |
| `/dashboard/mediakits` | 🟡 | Flujo existente; debe priorizar estado, cliente, soportes y acción siguiente. | Siguiente bloque: eliminar ornamentación secundaria y contextualizar acciones. |
| `/dashboard/mediakits/nuevo` | 🟡 | Builder es funcional pero complejo. | Siguiente bloque: separar claramente configuración, preview y acción de generación/guardado. |

## Implementación de acciones contextuales

### Público

- Hero de `/soportes`: `Explorar inventario` + `Hablar con Ventas`.
- Hero de `/soluciones`: `Explorar inventario` + `Hablar con Ventas`.
- Hero de `/nosotros`: `Explorar inventario` + `Hablar con Ventas`.
- Hero de `/contacto`: `Volver al inventario`.
- Home: `Ver disponibilidad` + `Solicitar propuesta`.
- Cada tipo de soporte mantiene su acción específica `Ver soportes disponibles`.

### Inventario

- `Filtros` y `Mapa/Catálogo` permanecen asociados a la tarea de exploración.
- `Solicitar Media Kit` depende de la selección y se mantiene en la barra contextual de selección.
- El selector `Mapa/Catálogo` no pertenece al drawer de filtros en móvil.

### Dashboard

- `/dashboard`: `Nuevo Media Kit` es la acción principal del resumen.
- `/dashboard/soportes`: `Nuevo soporte` debe ser la acción principal del listado; `Editar` permanece por fila.
- Preview: `Editar soporte` y `Ver en inventario` son acciones directamente relacionadas con el objeto inspeccionado.
- Reserva: `Guardar período` es la única acción primaria del formulario.
- Solicitudes/Media Kits: la prioridad debe ser la siguiente acción comercial sobre cada registro, no un bloque genérico de acciones.

## Cambios realizados en este bloque

- `src/components/layout/InteriorHero.tsx`
- `src/components/layout/Layout.tsx`
- `src/pages/Home.tsx`
- `src/pages/Soportes.tsx`
- `src/pages/Soluciones.tsx`
- `src/pages/Nosotros.tsx`
- `src/pages/Inventario.tsx`
- `src/pages/Contacto.tsx`
- `src/pages/auth/Login.tsx`
- `src/pages/dashboard/DashboardSupportPreview.tsx`
- `src/pages/dashboard/DashboardSupportReservation.tsx`
- `src/pages/dashboard/support-editor/Field.tsx`
- `src/pages/dashboard/support-editor/tabs/*`
- `src/pages/dashboard/DashboardSupportProductEditor.tsx`
- `src/pages/dashboard/SupportListView.tsx`
- `src/hooks/useSupportListFilters.ts`

## Criterio de release

Este bloque no modifica `main` ni contratos backend. La validación final requiere build/typecheck/tests y revisión visual responsive en Preview antes de cerrar el HUMAN GATE visual.

## Continuación UX/UI — bandeja comercial (2026-11-09)

- `/dashboard/solicitudes`: la tabla desktop se mantiene; en mobile se presenta una lista de tarjetas con cliente, empresa, estado, cantidad de soportes, fecha y acción contextual `Ver solicitud`.
- La acción móvil tiene un objetivo táctil de al menos 44 px y evita obligar al usuario a desplazarse horizontalmente por una tabla de ancho fijo.
- La bandeja diferencia explícitamente error de carga, ausencia total de solicitudes y ausencia de resultados por filtros. El estado de error ofrece `Reintentar`.
- No se alteran endpoints, estados comerciales, ownership, reglas de cotización, asociación de Media Kit ni persistencia.
- QA automatizado añadido en `tests/visual/dashboard-requests-responsive.spec.ts` para desktop/mobile, overflow horizontal, reintento y estado vacío.
