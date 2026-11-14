# Preparación de demo para cliente — Grupo Comunicarte OOH

**Fecha de auditoría:** 2026-11-13  
**PR:** [#90](https://github.com/popnegro-org/grupo-comunicarte-refactoring/pull/90)  
**Rama:** `pmv-validation-candidate`  
**Estado:** **APTO PARA DEMO CONTROLADA CON CONTENIDO CONFIRMADO**. No equivale a aprobación de merge ni de release.

## Enlace de demostración

- **Preview Vercel:** https://grupo-comunicarte-refactoring-ctozn8xxv-popnegros-projects.vercel.app/
- Deployment: `dpl_Bo3WtZp3zme4PYttjsgs2JdA6M5u`
- SHA desplegado: `8418ffa0835337202d6a3866866d1bfe60ddbbee`
- Protección de deployment consultada en Vercel: password, SSO y trusted IP deshabilitados. El enlace es accesible sin autenticación de Vercel.
- `x-robots-tag: noindex`: Preview no debe tratarse como sitio público indexable.
- El proyecto conserva un vínculo Git Integration obsoleto con `popnegro/grupo-comunicarte-refactoring`; el repositorio actual es `popnegro-org/grupo-comunicarte-refactoring`. Para una demo puntual se verificó el deployment existente; para actualizaciones automáticas estables sigue pendiente reconectar el proyecto existente desde Vercel Settings → Git. No crear un proyecto duplicado.

## Verificación técnica

| Comprobación | Resultado |
|---|---|
| Página inicial y rutas `/soportes`, `/inventario`, `/soluciones`, `/nosotros`, `/contacto`, `/mediakits`, `/login`, `/dashboard` | HTTP 200 |
| `/api/health` | HTTP 200; Neon conectado; branch Preview correcta |
| `/api/supports` | HTTP 200; 28 soportes publicados |
| Campos de precios/costos en catálogo público | No expuestos |
| Soportes activos sin ownership en Preview | Excluidos; detalle devuelve HTTP 404 |
| Endpoint administrativo anónimo | HTTP 401 en preflight E2E |
| Media de catálogo | Respuesta HTTP 302 hacia almacenamiento de medios |
| CI | PASS |
| CI Candidate | PASS: Render smoke 9/9; QA E2E 12/12; Preview E2E 12/12; Vercel Preview E2E 12/12 |
| Visual QA | PASS: 96/96 |
| Lint, typecheck, unit tests, build y bundle budget | PASS en CI |

La ejecución autoritativa del 2026-11-13 es CI Candidate run [43426671496](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43426671496), Visual QA run [43426671350](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43426671350) y CI run [43426671382](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43426671382). La validación Vercel comprobó la revisión de aplicación `8418ffa...`; los commits posteriores hasta el HEAD revisado solo modifican workflows/documentación.

## Contenido comercial confirmado y corregido — 2026-11-13

El responsable del inventario confirmó que los tres soportes están disponibles. En consecuencia, se corrigieron únicamente sus descripciones en Neon Preview (`preview/pmv-validation-candidate`), eliminando el texto contradictorio “No disponible por el momento”. Se conservaron los estados estructurados `disponibilidad=disponible`, `active=true`, el tenant `tenant-ba` y la fecha `available_from=15 OCT 2026`.

- `bue-trad-09` — Av. Rivadavia 6646.
- `bue-trad-10` — Au. 25 de Mayo y Membrillar.
- `bue-trad-08` — Av. Donado y Ruiz Huidobro.

Verificación posterior por API pública de Preview: catálogo HTTP 200 y detalle de `bue-trad-08` HTTP 200, con descripción corregida y disponibilidad visible. No se modificó Production.

## Guion sugerido para el recorrido

1. Abrir la página inicial y presentar la propuesta de Grupo Comunicarte.
2. Entrar en Soportes / Inventario y mostrar el catálogo conectado a Neon.
3. Filtrar por plaza y formato: Buenos Aires, Mendoza, tradicional, LED y LED móvil.
4. Abrir una ficha y revisar ubicación, características y material multimedia.
5. Seleccionar soportes y recorrer la preparación de una solicitud de Media Kit.
6. Mostrar la vista de Media Kits solo con registros y materiales autorizados para la demo.

No mostrar al cliente el dashboard administrativo ni compartir credenciales. No enviar solicitudes reales durante la presentación sin acordar previamente el uso de registros de prueba. El entorno apunta a Neon Preview, no a Production.

## Límites de esta aprobación

- Esto habilita únicamente una demo controlada del sitio comercial en Preview.
- No autoriza merge de PR #90, despliegue a Production, cambios de datos comerciales, cambios de roles/permisos ni publicación de credenciales.
- RLS permanece diferido deliberadamente para este PMV; el aislamiento actual se valida mediante ownership y filtros fail-closed del catálogo, no mediante políticas RLS.
- Antes de declarar “demo lista para cliente” sin reservas, cerrar la confirmación de los tres registros señalados y validar el recorrido en el dispositivo/navegador que se usará en la reunión.
