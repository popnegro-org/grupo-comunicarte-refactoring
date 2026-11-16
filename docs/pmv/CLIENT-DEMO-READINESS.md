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


## Actualización de aceptación técnica — 2026-11-16

**HEAD de auditoría:** b1ea823b939a31795b2f0fd021f379a6bc0625a7  
**Deployment Vercel Preview:** dpl_EWVxxqqV2gqoxxpK84x1zV5HrjEP — READY  
**URL:** https://grupo-comunicarte-refactoring-6pme74p49-popnegros-projects.vercel.app/  
**Origen registrado por Vercel:** popnegro-org/grupo-comunicarte-refactoring, branch pmv-validation-candidate, SHA exacto b1ea823.

Esta actualización prevalece sobre los identificadores de deployment y el diagnóstico de Git Integration que figuran en las secciones históricas anteriores.

### Vercel Preview y Neon — identidad efectiva confirmada

- GET /api/health: HTTP 200; database=connected; Neon branch br-muddy-cell-au64infb; endpoint ep-patient-butterfly-aure9s02; commit informado igual al HEAD auditado.
- Después de invocar el catálogo público de ese mismo deployment, una consulta read-only a pg_stat_activity encontró las sesiones PostgreSQL de Vercel bajo app_runtime_vercel_preview_v2 (application_name=pgbouncer; 4 sesiones observadas). La muestra se tomó inmediatamente después de las solicitudes HTTP del deployment exacto.
- Flags del rol: LOGIN=true; SUPERUSER=false; BYPASSRLS=false; CREATEDB=false; CREATEROLE=false; REPLICATION=false.
- Matriz de grants ya verificada directamente para el rol: SELECT 14 tablas, INSERT 13, UPDATE 10, DELETE 7; USAGE + SELECT en 6 secuencias; UPDATE de secuencias 0. Sin membresías elevadas ni default privileges heredables.
- RLS permanece deshabilitado en 0/36 tablas y Preview tiene 0 políticas. Esto sigue siendo una decisión explícita del PMV, no una certificación de aislamiento mediante RLS.
- Vercel metadata del deployment identifica el repositorio y namespace correctos. La evidencia resuelve el bloqueo de deployment same-HEAD; no se afirma que se haya cambiado configuración de Production ni que se haya modificado el vínculo de Production.

No se descifró ni expuso DATABASE_URL; se usaron únicamente metadatos de Preview y evidencia de sesión PostgreSQL.

### Comprobaciones HTTP sobre el deployment exacto

| Ruta | Resultado |
|---|---|
| /, /soportes, /inventario, /soluciones, /nosotros, /contacto, /mediakits, /login, /dashboard | HTTP 200 |
| /api/health | HTTP 200; Neon conectado; SHA y branch exactos |
| /api/supports | HTTP 200; 28 soportes publicados; sin campos de precios |
| /api/supports/bue-trad-08 | HTTP 200 |
| /api/supports/mza-trad-16 | HTTP 404; soporte en cuarentena |
| /api/media/83 | HTTP 302; image/webp |
| Endpoints administrativos sin sesión | HTTP 401 verificado por E2E |

El deployment incluye x-robots-tag: noindex. La protección Vercel de Preview (password, SSO y trusted IP) está deshabilitada: el sitio comercial de Preview es accesible mediante su URL; no debe tratarse como un entorno privado. Los endpoints administrativos mantienen autenticación. No compartir credenciales ni usar registros reales durante la demo.

### Revisión de los seis snapshots de inventario

Artefacto descargado desde Visual QA run [#43677574369](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43677574369), artifact ID 14147760407.

Se compararon los seis screenshots candidate con sus snapshots versionados:

1. inventory-catalog-desktop.png
2. inventory-catalog-mobile.png
3. inventory-card-selected.png — desktop
4. inventory-card-selected.png — mobile
5. inventory-map-responsive.png — desktop
6. inventory-map-responsive.png — mobile

Resultado de inspección visual comparativa: las seis parejas conservan estructura, jerarquía, estados y distribución responsive; no se observó regresión visual bloqueante. Las diferencias de píxeles son pequeñas y compatibles con renderizado dinámico/antialiasing y tiles cartográficos; no se detectó desplazamiento estructural ni pérdida de controles. Esta inspección no equivale a aceptación formal del cliente.

Visual QA ejecutó 122 tests PASS en la validación de baseline y 122 PASS en la segunda validación del baseline. Run y artefacto quedan enlazados arriba.

### Recorrido comercial — cobertura verificada

- Inventario: filtros, tarjetas, estados, selección, mapa responsive y barra de selección que abre Media Kit.
- Navegación de demo: selección pública continúa al cierre de Media Kit en /contacto?origen=mediakit; el test no envía una solicitud real.
- Solicitud y Media Kit sintéticos de QA: creación idempotente, persistencia PDF/PPTX en almacenamiento Preview aislado, recuperación autenticada, validación de firmas PDF/ZIP, confirmación de entrega y registro de evento de entrega.
- Controles negativos: soporte sin ownership fuera del catálogo y detalle 404; rutas administrativas redirigen a login; APIs administrativas rechazan acceso anónimo; datos de precios permanecen privados.
- Vercel Preview E2E: 12/12 PASS en el mismo SHA y branch.
- Neon Preview E2E: 12/12 PASS.
- Neon QA E2E: 12/12 PASS.
- Render Preview smoke: 9/9 PASS.
- CI y CI Candidate: PASS; lint/typecheck, tests, build, bundle budget y dependency audit completados.

### Criterios Demo Ready consolidados

| Criterio | Estado |
|---|---|
| Deployment Vercel Preview READY en HEAD exacto | PASS |
| Identidad PostgreSQL efectiva dedicada y least-privilege | PASS |
| Catálogo público: 28 soportes y sin precios | PASS |
| Cuarentena: soporte sin ownership no publicado | PASS |
| Rutas comerciales principales responden | PASS |
| Selección → Media Kit → contacto sin envío real | PASS |
| Exportación/recuperación PDF y PPTX en QA aislado | PASS |
| Acceso administrativo anónimo rechazado | PASS |
| Visual QA 122/122 dos veces y seis snapshots inspeccionados | PASS |
| Aceptación formal del cliente/dispositivo de presentación | PENDIENTE |
| Protección Vercel de Preview por password/SSO/IP | DESHABILITADA; URL accesible |
| Merge/Production release | NO AUTORIZADO |

**Conclusión:** APTO PARA DEMO COMERCIAL CONTROLADA EN PREVIEW, con datos públicos no sensibles y sin mostrar dashboard/credenciales ni enviar solicitudes reales. No es aprobación de merge, release ni aceptación formal del cliente.

No se modificó Production ni se ejecutó DDL/DML durante esta verificación.
