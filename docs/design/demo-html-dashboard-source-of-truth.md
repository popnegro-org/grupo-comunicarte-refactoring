# Rediseño del dashboard basado exclusivamente en demo.html

## Fuente visual normativa
El único artefacto visual de referencia para esta iteración es el archivo `demo.html` aportado por el usuario. No se deben importar criterios visuales del PDF ni de rediseños anteriores.

## Sistema visual extraído
- Fondo de aplicación: `#F8FAFC`; panel lateral: `#F1F5FB`; superficies: blanco.
- Texto principal: `#1E293B`; texto secundario: `#64748B`.
- Acción/selección primaria: `#2563EB`; selección lateral: `#DBE7FF`; bordes: `#E2E8F0`.
- Tipografía Inter, jerarquía compacta, bordes discretos, tablas densas, badges semánticos, controles de 38–40px y drawer lateral para detalles.
- Estructura: sidebar persistente, topbar, encabezado de página, acciones, filtros, navegación de vista cuando corresponda, tabla/listado y panel de detalle.
- Responsive: en móvil la navegación se colapsa y las tablas deben transformarse en lista/tarjetas o conservar desplazamiento horizontal intencional; no debe existir desbordamiento global.

## Decisiones de alcance
### Mantener
- Autenticación y cierre de sesión existentes.
- Resumen con indicadores calculados desde `/api/admin/stats`, distribución por plaza/tipología y solicitudes recientes reales.
- Gestión de soportes, búsqueda, filtros, orden, edición, archivo y reservas existentes.
- Solicitudes Media Kit, búsqueda, filtros, detalle, cotización, duración, exportación PDF/PPT y flujo de entrega ya implementado.
- Inventario público y mapa del PMV.

### Agregar o adaptar
- Aplicar la paleta azul/gris y los estados visuales de `demo.html` a las superficies existentes.
- Mantener un patrón de página consistente: título/descripción, CTA principal, filtros, contenido y estados de carga/error/vacío.
- Reforzar la jerarquía de tabla y el panel de detalle, sin reemplazar lógica de negocio ni contratos API.
- Agregar funcionalidades de navegación solo cuando exista una ruta real y verificable.

### Eliminar o no incorporar
- Datos de muestra del HTML (nombres, IDs, fechas, cantidades, porcentajes, adjuntos o historiales ficticios).
- Gráficos con valores inventados; el gráfico mensual no se incorpora hasta contar con datos históricos reales.
- Entradas decorativas para Clientes, Campañas, Propuestas, Reportes, Configuración, Ayuda o Documentación si no existe módulo funcional detrás.
- Botones, filtros, pestañas o paginación que no ejecuten una acción real.
- Precios internos en cualquier exportación orientada al cliente.

## Contratos PMV que no se alteran
- Tipos de soporte: Tradicional, LED móvil y Pantallas LED; conservar «Pendiente de mapeo» cuando corresponda.
- Disponibilidad (Disponible/Reservado) y estado físico (Operativo/Mantenimiento/Inactivo) son dimensiones separadas.
- El mapa debe mostrar un estado alternativo claro si faltan coordenadas o configuración.
- Operaciones administrativas continúan protegidas por autenticación.
- El envío/entrega de un Media Kit requiere conservar la confirmación explícita existente.

## Verificación requerida antes de promover
1. Lint/TypeScript, pruebas unitarias y build.
2. Pruebas de regresión de inventario, mapa, editor, solicitudes, cotización y exportaciones.
3. Comparación visual real de dashboard, inventario y drawer en escritorio y móvil contra `demo.html`.
4. Confirmar que todos los números mostrados proceden de API y que no se filtren precios internos.
5. Validar Preview y APIs autenticadas; mantener PR en borrador y no fusionar hasta pasar estas comprobaciones.
