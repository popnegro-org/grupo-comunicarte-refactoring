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

## P2 — Constructor de Media Kit: accesibilidad y estados (2026-11-09)

- Etiquetas visibles asociadas a nombre, empresa, email y teléfono; autocomplete y tipos semánticos de email/teléfono.
- Búsqueda del inventario con nombre accesible y tipo `search`.
- Selección de soportes con estado `aria-pressed` y nombre dinámico Agregar/Quitar.
- Carga, notificaciones y búsqueda vacía anunciadas mediante regiones `status`/`aria-live`.
- Acción de quitar soporte con área interactiva 44×44 px y nombre accesible específico.
- Sin cambios en endpoints, payloads, reglas comerciales ni persistencia.
- Validación local sobre el árbol de trabajo: TypeScript/lint PASS; unit tests 81/81 PASS; build PASS; audit de dependencias de producción 0 vulnerabilidades; `git diff --check` PASS.
- La comprobación manual autenticada en Preview sigue pendiente de una sesión QA autorizada; navegación por teclado y axe se verificaron localmente en desktop y móvil.

## P2 — endurecimiento de accesibilidad móvil y carga diferida de exportación (2026-11-09)

- Se ampliaron a 44 px los objetivos táctiles del constructor: navegación de retorno, acciones de guardado/exportación, campos de cliente, monto, período, búsqueda, selección de inventario y precios por soporte.
- Se añadieron indicadores de foco visibles para navegación por teclado en las acciones y controles del constructor.
- El módulo de generación PDF/PPT (`adminMediaKitExport`) ahora se importa al solicitar la exportación, no al abrir el constructor. El chunk de exportación permanece separado y se descarga bajo demanda.
- Se añadió `tests/visual/mediakit-builder-accessibility.spec.ts`: labels, tipos semánticos, estado `aria-pressed`, estado de búsqueda vacía, recorrido de foco, áreas táctiles, ausencia de overflow y errores de consola.
- Build de referencia: constructor 18.48 kB (5.19 kB gzip); módulo de exportación 404.45 kB (134.67 kB gzip), cargado dinámicamente al exportar. No se declara reducción del tamaño total descargable, sino de la carga inicial al entrar al constructor.
- Validación local: TypeScript/lint PASS; unit tests 81/81 PASS; build PASS; audit de dependencias de producción 0 vulnerabilidades; `git diff --check` PASS.
- Se incorporó `@axe-core/playwright` como dependencia de desarrollo y el constructor pasó axe sin violaciones en reglas WCAG 2.0 A/AA, WCAG 2.1 A/AA y WCAG 2.2 AA en desktop y móvil.


### Evidencia P2 — validación funcional y de accesibilidad

- `npm run lint`: PASS.
- `npm run test:unit`: 81/81 PASS.
- `npm run build`: PASS.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- Playwright desktop + mobile: 22/22 PASS entre `mediakit-builder-accessibility`, `mediakit-delivery`, `inventory-selection-bar` y `dashboard-requests-responsive`.
- Axe: 0 violaciones en el constructor para WCAG 2.0 A/AA, 2.1 A/AA y 2.2 AA.
- La suite verifica recorrido de foco, selección reversible, nombres accesibles basados en texto visible, labels, touch targets ≥44 px, ausencia de overflow, búsqueda vacía y ausencia de errores JavaScript/consola.
- El chunk del constructor mide 18.46 kB (5.18 kB gzip). `adminMediaKitExport` mide 404.45 kB (134.67 kB gzip) y se descarga únicamente al solicitar PDF/PPT; el test confirma que no se solicita al abrir el constructor. El tamaño total del artefacto no se presenta como reducido.
- Pendiente únicamente la comprobación autenticada en el Preview Vercel con una sesión QA autorizada; no se usaron ni inventaron credenciales.


## Iteración estética PMV — fases A–F (2026-11-10)

### A — navegación y responsive
- El header público conserva su altura de 80 px, enlaces sin salto de línea y navegación desktop desde 1024 px.
- El menú móvil se conserva hasta 1023 px, incluido tablet landscape; se retiró el enlace Inicio redundante porque el logotipo ya navega a Home.
- El acceso de login permanece como icono en escritorio amplio para evitar saturar el header en anchos intermedios.

### B — Home
- Se conserva la fotografía hero existente, los CTA y el buscador; no se reemplazaron activos sin evidencia.
- Se prioriza la continuidad visual con las fotografías reales ya presentes en public/images.

### C — Soportes y Soluciones
- Las tres familias de soporte incorporan fotografía local existente: tradicional, pantallas LED y LED móvil.
- Soportes conserva especificaciones técnicas y enlaces de inventario por formato; la imagen aporta reconocimiento sin sustituir información.
- Soluciones adopta una composición editorial con imagen y descripción por objetivo, con acceso contextual al inventario.

### D — Nosotros y Contacto
- Nosotros incorpora fotografía de inventario existente y sustituye el rótulo ambiguo “Puntos clave” por “OOH + DOOH”, categorías presentes en la oferta descrita.
- Contacto reduce el espacio del hero y acerca el formulario al inicio de la página; no se modifican campos, validación ni envío.

### E — Inventario
- En escritorio amplio, el mapa incorpora una lista compacta superpuesta de soportes filtrados. Seleccionar un registro abre el detalle correspondiente y resalta el punto en el mapa.
- En móvil y tablet, la lista superpuesta se oculta para preservar superficie cartográfica y no duplicar el catálogo; se conserva el selector Mapa/Catálogo existente.

### F — consistencia visual
- Las tarjetas públicas usan elevación y borde sutiles al interactuar; se preservan estados semánticos y paleta operativa del Dashboard.
- No se unifican los colores de estado con la marca: los colores funcionales mantienen su significado.
- No se modifican contratos API, modelo comercial, datos, autenticación ni persistencia.

### QA añadida
- tests/visual/aesthetic-phases.spec.ts: navbar 1024–1440 px, menú en 900 px, imágenes y overflow en páginas comerciales desktop/mobile, listado sincronizado del mapa en desktop y oculto en móvil.
- Preview del SHA candidato validado: 46/46 pruebas Playwright desktop/mobile PASS; rutas públicas sin overflow horizontal ni errores JavaScript y activos gráficos cargados.\n- El workflow remoto Visual QA aún figura pendiente y sin jobs reportados; no se regeneraron snapshots ausentes del checkout local.\n- HUMAN GATE final pendiente: revisión visual y aprobación humana del Preview.
