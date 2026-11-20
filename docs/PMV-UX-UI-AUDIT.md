# PMV UX/UI AUDIT

## 1. Executive Summary
Esta auditoría evalúa el estado actual del Producto Mínimo Viable (PMV) de Grupo Comunicarte basado estrictamente en el código fuente del repositorio. La experiencia pública (Landing, Inventario, Selección y Media Kit) presenta un altísimo nivel de madurez visual y funcional, cumpliendo con gran parte de los objetivos de la plataforma. Sin embargo, la ausencia total del entorno administrativo (Login y Dashboard) impide considerar el PMV como completo según los requisitos originales.

## 2. Current Product State
El producto actual está implementado como una Single Page Application (SPA) en React usando Vite, Tailwind CSS v4, y React Router. No cuenta con backend propio ni conexión a base de datos (utiliza datos mock en `src/data/inventory.ts`). El frontend público es altamente funcional y coherente visualmente, destacando un mapa interactivo (React Leaflet) y un sistema robusto de filtros y selección.

## 3. Route Audit
| Ruta | Existe en código | Abre | UI correcta | Objetivo PMV | Estado |
|---|---|---|---|---|---|
| `/` | Sí (`Home.tsx`) | Sí | Sí | Landing pública | PASS |
| `/soportes` | Sí (`Soportes.tsx`) | Sí | Sí | Info general | PASS |
| `/nosotros` | Sí (`Nosotros.tsx`) | Sí | Sí | Info institucional | PASS |
| `/inventario` | Sí (`Inventario.tsx`) | Sí | Sí | Explorador | PASS |
| `/login` | No | No | No | Autenticación | MISSING |
| `/dashboard` | No | No | No | Panel Admin | MISSING |
| `/dashboard/soportes` | No | No | No | Gestión Admin | MISSING |

## 4. Landing Audit
- **UX:** Clara propuesta de valor ("Tu marca, en los lugares que todos ven"). Jerarquía impecable. Call to actions evidentes hacia `/inventario` que guían correctamente al usuario hacia la conversión.
- **UI:** Diseño moderno, limpio, con paleta monocromática y detalles elegantes. Excelente uso del espaciado (padding y margin) y tipografía de gran tamaño en el hero. Los componentes de "Elegí dónde querés estar" son funcionales y dirigen al inventario con query params útiles.

## 5. Inventory Explorer Audit
- Superficie muy bien resuelta. Combina en una misma vista el panel de filtros (`MapFilterPanel`) y el mapa interactivo (`InventoryMap`).
- La UI maneja correctamente estados de filtros y mantiene en sincronía la URL (ej. `?plaza=mendoza`).
- UX fluida sin recargas. Es el corazón de la aplicación y funciona como se espera.

## 6. Map Audit
- **Funcional:** Sí (implementado con `react-leaflet`).
- **Markers:** Corresponden a soportes fijos y rutas móviles (`Polyline`).
- **Interacción:** Funciona correctamente. Al hacer clic en un marker se abre `LocationDetail`.
- **Mobile:** El mapa ocupa el espacio disponible; los controles de inventario se mantienen en `InventoryToolbar`. El detalle seleccionado se presenta como panel inferior en móvil y lateral en escritorio.

## 7. Support Audit
- Evaluado desde `LocationDetail.tsx` que se abre sobre el mapa.
- Muestra imágenes (`MediaCarousel`), información detallada y características en pestañas (`DetailTabs`), disponibilidad y CTA para seleccionar (`toggleSelect`).
- **Feedback visual:** El usuario entiende claramente si el soporte está disponible o reservado.

## 8. Filter Audit
- Implementados en `MapFilterPanel.tsx`.
- Incluye: Plaza, Tipo, Disponibilidad y Búsqueda por texto.
- **Feedback:** La lista en el mapa se actualiza en tiempo real basado en la lógica de `Inventario.tsx`.
- **Persistencia:** Los filtros modifican la URL (`searchParams`), permitiendo compartir enlaces de búsquedas específicas.

## 9. Selection Audit
- Implementado a nivel de contexto global (`SelectionContext.tsx`).
- El usuario puede seleccionar y deseleccionar soportes desde el mapa. Los soportes "reservados" están lógicamente bloqueados para selección.
- Existe un contador visual y un listado de seleccionados dentro del flujo del Media Kit. El usuario sabe en todo momento lo que ha seleccionado.

## 10. Media Kit Audit
- Integrado conceptual y funcionalmente con el Contacto en `MediakitPanel.tsx`.
- El panel muestra el resumen de los ítems seleccionados (`selectedItems`).
- Contiene un botón CTA claro y el formulario asociado.
- Flujo UX excelente: no saca al usuario del mapa.

## 11. Contact Audit
- Flujo unificado con el Media Kit.
- Existe la posibilidad de enviar un mensaje de contacto directo para cotizar los soportes específicos o pedir el kit.
- Mantiene el contexto exacto de los soportes que le interesan al cliente.

## 12. Form Audit
- `MediakitPanel.tsx` incluye un formulario estructurado (Nombre, Empresa, Email, Teléfono, Observaciones).
- Uso de componentes de UI correctos (`Input`, `Label`, `Textarea` con estilos consistentes).
- Labels claros, placeholders útiles (ej. `tu@empresa.com`).
- Carece de validación backend o lógica de envío real (solo front).

## 13. Login Audit
- **Estado:** NO EXISTE en el código.
- Carece de rutas, componentes de autenticación, contexto o integración (ej. Firebase Auth no implementado a nivel vistas).
- **Veredicto:** MISSING (P0).

## 14. Dashboard Audit
- **Estado:** NO EXISTE en el código.
- No hay interfaz para el usuario administrativo. No hay panel de bienvenida.
- **Veredicto:** MISSING (P0).

## 15. Dashboard Supports Audit
- **Estado:** NO EXISTE en el código.
- La gestión de soportes (CRUD) o visualización administrativa de los leads no está desarrollada.
- **Veredicto:** MISSING (P0).

## 16. Navigation Audit
- Implementada en `Layout.tsx`.
- Header fijo con navegación clara y menú responsive (`isMobileMenuOpen` toggle).
- Funciona correctamente, las transiciones de página utilizan `framer-motion` (`PageTransition.tsx`), brindando una sensación premium.

## 17. Design System Audit
- **Tipografía:** Sans-serif neutral. Tamaños escalados correctamente (`text-5xl`, `text-sm`, etc.).
- **Color:** Paleta minimalista (bg-white, text-black, grises `gray-50` a `gray-600`). Detalles sutiles en los badges.
- **Shape:** Componentes con `rounded-2xl`, inputs y botones bien proporcionados. Bordes finos (`border-gray-200`).
- Existe coincidencia total entre la implementación y una estética madura de producto B2B.

## 18. Visual Consistency Audit
- **Veredicto:** COHERENTE.
- El Landing, el Inventario, y los modales (Media Kit/Detail) comparten idéntico espaciado, jerarquías, estilo de botones y paleta de colores. El producto público se siente como una pieza única.

## 19. Responsive Audit
- El `Layout`, la `Landing` y el `Inventario` utilizan reglas responsivas de Tailwind (`sm:`, `md:`, `lg:`, `xl:`).
- El header usa navegación compacta por debajo de 1280 px; el mapa muestra el listado auxiliar desde `xl` y el detalle como panel inferior en móvil.
- Los filtros permanecen en `InventoryToolbar`; no se documenta un Drawer de filtros porque no corresponde a la implementación actual.
- **Estado:** PASS, sujeto a la matriz de viewports y rutas ampliada en la suite Playwright.

## 20. Accessibility Audit
- **HTML Semántico:** Parcial. Uso de `<button>`, `<nav>`, `<form>`, `<section>`.
- **Contraste:** Muy bueno (texto oscuro sobre fondos claros).
- Faltan `aria-labels` en elementos dinámicos complejos y manejo exhaustivo de foco en los paneles superpuestos, pero no es bloqueante.

## 21. UX Writing Audit
- Claro, profesional y B2B.
- Textos como "Tu marca, en los lugares que todos ven" y "Elegí dónde querés estar" resuenan con el target (anunciantes).
- Botones y placeholders usan lenguaje accionable ("Explorar mapa", "Hablar con el equipo").

## 22. Heuristic Evaluation
- **Visibilidad del estado del sistema:** Muy buena en filtros y selección.
- **Correspondencia entre el sistema y el mundo real:** Excelente en el mapa interactivo.
- **Consistencia y estándares:** Alta en toda la vista pública.
- **Prevención de errores:** Los soportes reservados no se pueden seleccionar.

## 23. Customer Journey
- Landing → **FUNCIONA**
- Inventario → **FUNCIONA**
- Explorar → **FUNCIONA**
- Filtrar → **FUNCIONA**
- Seleccionar → **FUNCIONA**
- Media Kit / Contacto → **FUNCIONA** (Frontend)
- Formulario → **FUNCIONA** (Frontend, no envía datos)
- Lead → **NO EXISTE** (Sin backend)
- Login → **NO EXISTE**
- Dashboard → **NO EXISTE**

## 24. PMV Requirements Matrix
| ID | Requisito | Evidencia en código | Evidencia visual | Estado | Severidad |
|---|---|---|---|---|---|
| PMV-01 | Landing | `Home.tsx` | OK | PASS | - |
| PMV-02 | Inventario | `Inventario.tsx` | OK | PASS | - |
| PMV-03 | Mapa | `InventoryMap.tsx` | OK | PASS | - |
| PMV-04 | Soportes | `Soportes.tsx` / `LocationDetail.tsx` | OK | PASS | - |
| PMV-05 | Filtros | `MapFilterPanel.tsx` | OK | PASS | - |
| PMV-06 | Selección | `SelectionContext.tsx` | OK | PASS | - |
| PMV-07 | Media Kit | `MediakitPanel.tsx` | OK | PASS | - |
| PMV-08 | Contacto | `MediakitPanel.tsx` | OK | PASS | - |
| PMV-09 | Formulario | UI existente | OK | PARTIAL | P2 |
| PMV-10 | Login | No existe | No existe | MISSING | P0 |
| PMV-11 | Dashboard | No existe | No existe | MISSING | P0 |
| PMV-12 | Dashboard Soportes | No existe | No existe | MISSING | P0 |
| PMV-13 | Navegación | `Layout.tsx` | OK | PASS | - |
| PMV-14 | Responsive | Clases Tailwind | OK | PASS | - |
| PMV-15 | Accesibilidad | Semántica HTML básica | OK | PARTIAL | P3 |
| PMV-16 | Coherencia visual | UI general | OK | PASS | - |
| PMV-17 | Conversión | Call to actions claros | OK | PASS | - |

## 25. P0 Blockers
1. **Falta de Rutas Administrativas:** Las páginas `/login`, `/dashboard` y `/dashboard/soportes` no existen. Esto bloquea la mitad del alcance del PMV (Gestión Administrativa).
2. **Backend/Base de Datos:** El proyecto actualmente lee un archivo `inventory.ts` mockeado. No hay persistencia de Leads ni obtención dinámica de inventario.

## 26. P1 Critical
Ninguno. Lo desarrollado públicamente está en excelentes condiciones.

## 27. P2 Important
- **Lógica de envío de Formulario:** El formulario del Media Kit existe en la UI pero carece de un endpoint o servicio al cual enviar los datos para capturar el Lead.

## 28. P3 Polish
- **Manejo de Foco y Accesibilidad:** Mejorar los `aria-hidden` y atrapar el foco del teclado dentro del `MediakitPanel` y `MapFilterPanel` móvil.

## 29. Recommended Next Steps

### MUST FIX BEFORE INTEGRATION
- **ID-01:** Implementar sistema de Autenticación y ruta `/login`.
- **ID-02:** Desarrollar `/dashboard` y `/dashboard/soportes` para la administración del inventario.
- **ID-03:** Conectar el frontend a un servicio de base de datos (Ej. Firebase Firestore o Cloud SQL) para lectura de soportes y escritura de Leads.

### SHOULD FIX
- **ID-04:** Integrar lógica real de envío en `MediakitPanel.tsx`.

### FUTURE / POLISH
- **ID-05:** Mejorar accesibilidad de modales y drawers.

## 30. Final Verdict
PMV NOT READY


## 31. Responsive and interaction follow-up · 2026-11-18

Auditoría de seguimiento del código vigente en `pmv-validation-candidate`:

- Header: navegación compacta por debajo de 1280 px; navegación principal de escritorio desde 1280 px.
- Mapa: detalle seleccionado como panel inferior en móvil y panel lateral en escritorio.
- Cierre del detalle: botón táctil mínimo 44 × 44 px, foco visible y cierre mediante Escape.
- Escape no cierra el panel cuando el foco está en un campo editable.
- Pruebas Playwright añadidas para verificar el tamaño real del botón de cierre, el cierre con teclado y overflow horizontal en las rutas públicas (`/`, `/nosotros`, `/soluciones`, `/inventario`, `/mediakits`, `/contacto`) a 320, 360, 390, 414, 768, 1024, 1280 y 1440 px.
- Estas pruebas deben ejecutarse en CI antes de declarar la validación responsive ampliada como aprobada. La documentación registra cobertura añadida, no resultados de ejecución.
