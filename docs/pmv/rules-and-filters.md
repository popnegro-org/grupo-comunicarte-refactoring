# Reglas y filtros del inventario — guía de extensión

**Alcance:** PMV Grupo Comunicarte. Esta guía consolida los puntos de extensión existentes; no introduce un segundo motor de reglas.

## 1. Elegir el nivel correcto

| Necesidad | Implementar en | No implementar en |
|---|---|---|
| Filtrar el listado administrativo de soportes | `src/hooks/useSupportListFilters.ts` | Condicionales duplicados dentro de `SupportListView.tsx` |
| Presentar controles del filtro | `src/pages/dashboard/SupportListView.tsx` | Lógica de filtrado |
| Definir qué secciones/campos ve el operador según tipo | `src/pages/dashboard/supportEditorThemes.ts` | Condicionales sueltos por `tipo_soporte` |
| Aplicar visibilidad de secciones/campos | `isEditorSectionVisible()` / `isEditorFieldVisible()` | Configuración paralela en cada tab |
| Filtrar inventario público | `src/pages/Inventario.tsx` y sus componentes de filtros | El hook del listado administrativo |
| Validar si un soporte puede entrar en un Media Kit | Validación de servidor en `src/server/supportsService.ts` | Confiar solamente en el filtro del navegador |

## 2. Filtros administrativos existentes

`useSupportListFilters(supports)` centraliza estado, filtrado, orden y limpieza.

- **Búsqueda:** nombre, ID canónico, ciudad y dirección.
- **Plaza:** ciudad exacta; valor neutro `todas`.
- **Tipo:** `tipo_soporte`; valor neutro `todos`.
- **Disponibilidad:** `disponibilidad`; valor neutro `todos`.
- **Publicación:** activo / archivado; valor neutro `todos`.
- **Orden:** nombre, ciudad, tipo, disponibilidad y tarifa total; ascendente/descendente.
- **Composición:** los filtros se combinan con AND.
- **Reset:** `clearFilters()` restablece todos los controles.

La vista debe consumir `visible`, los setters y `hasActiveFilters`; no debe reconstruir el pipeline de filtros.

## 3. Cómo agregar un filtro administrativo

1. Definir el campo y su contrato de datos en `SupportListItem`; confirmar que el endpoint administrativo lo entrega.
2. Agregar el estado y setter en `useSupportListFilters`, con un valor neutro explícito.
3. Incorporar el criterio en `hasActiveFilters`, `clearFilters()` y el predicado de `supports.filter()`.
4. Exponer el valor y setter desde `DashboardSupportList.tsx` hacia `SupportListView.tsx`.
5. Añadir el control accesible en la vista, con etiqueta clara, estado vacío y acción para limpiar.
6. Añadir pruebas unitarias del hook/predicado: neutro, coincidencia, no coincidencia, combinación AND, datos nulos y limpieza.
7. Añadir pruebas Playwright desktop/móvil: control, resultado, contador, reset y ausencia de overflow.
8. Verificar que el filtro no cambia el contrato de API ni oculta información que el usuario deba poder consultar.

**Regla:** el filtro de UI mejora la exploración; no es un control de autorización ni de seguridad.

## 4. Reglas de visibilidad del editor

`supportEditorThemes.ts` es la fuente de verdad para:

- `theme_tradicionales`
- `theme_led`
- `theme_led_movil`

Cada theme declara `sections`, `hiddenFields` y `recommendedCardAttributes`.

Para agregar una regla:

1. Identificar el theme afectado mediante `getSupportEditorTheme()`.
2. Agregar o quitar la sección en la configuración del theme.
3. Declarar campos técnicos no aplicables en `hiddenFields`.
4. Aplicar la regla con `isEditorSectionVisible()` / `isEditorFieldVisible()` en el tab correspondiente.
5. Probar los tres tipos de soporte para evitar que un campo de un formato aparezca en otro.
6. Mantener intacto el contrato de persistencia/API salvo que exista un cambio de modelo explícito y validado.

No duplicar lógica de visibilidad mediante comparaciones directas de `tipo_soporte` si el theme ya expresa esa regla.

## 5. Disponibilidad, publicación y estado físico

Son dimensiones distintas y no deben combinarse en un único estado:

- **Disponibilidad comercial:** `disponible` o `reservado`.
- **Publicación:** `active` (activo/archivado).
- **Estado físico/operativo:** operativo, mantenimiento o inactivo, cuando el modelo operativo lo exponga.

La vista puede ofrecer filtros independientes. No inferir disponibilidad a partir de `active`, ni estado físico a partir de `disponibilidad`.

### Reservas

Una reserva documenta fechas explícitas `Desde` y `Hasta`. La presentación pública para un soporte reservado muestra el período documentado. Las modalidades comerciales son 7, 15, 21 días o mensual; no sustituyen las fechas efectivas.

El PMV documenta la reserva, pero no implementa un motor automático de conflictos ni calcula disponibilidad futura. No afirmar que un soporte se libera o está disponible en una fecha futura si no existe un cálculo de calendario validado.

## 6. Inventario público y Media Kit

El inventario público combina búsqueda con plaza, tipo y disponibilidad. La selección comercial sigue esta regla:

- `disponible`: seleccionable para Media Kit.
- `reservado`: no seleccionable; permite consulta/contacto.

La regla debe verificarse nuevamente en el servidor. `validateSupportsForRequest()` rechaza selección vacía, IDs inválidos/duplicados, soportes inexistentes y soportes que no estén disponibles. Nunca depender exclusivamente del estado enviado por el navegador.

Los precios internos de soportes no se deben exponer en endpoints públicos ni en documentos del cliente. La cotización administrativa debe usar la API protegida y un importe comercial global explícito.

## 7. Checklist para cualquier regla nueva

- [ ] Fuente de verdad identificada (modelo, theme, hook o servicio).
- [ ] Valor neutro y comportamiento con datos faltantes definidos.
- [ ] Filtros combinables sin duplicar lógica.
- [ ] Disponibilidad, publicación y estado físico permanecen separados.
- [ ] Validación de servidor cuando la regla afecta operaciones o permisos.
- [ ] Pruebas unitarias de casos positivos, negativos y límites.
- [ ] Pruebas Playwright desktop y móvil.
- [ ] Accesibilidad de etiquetas, teclado, foco y controles táctiles.
- [ ] Documentación actualizada y QA reproducible.

## 8. Fuentes del repositorio

- `src/hooks/useSupportListFilters.ts`
- `src/pages/dashboard/SupportListView.tsx`
- `src/pages/dashboard/supportEditorThemes.ts`
- `src/server/supportsService.ts`
- `docs/UX-UI-DASHBOARD-SUPPORTS-CRUD.md`
- `docs/SUPPORT_EDITOR_THEMES.md`
- `docs/RESERVATION_PERIOD_RULES.md`
- `docs/CIERRE-UXUI-INVENTARIO-REPORT.md`
