# Informe de aceptación técnica — Demo Ready

**Proyecto:** Grupo Comunicarte OOH  
**Fecha:** 2026-11-16  
**PR:** [#90](https://github.com/popnegro-org/grupo-comunicarte-refactoring/pull/90)  
**Rama:** pmv-validation-candidate  
**HEAD verificado:** b1ea823b939a31795b2f0fd021f379a6bc0625a7  
**Deployment:** [Vercel Preview — HEAD exacto](https://grupo-comunicarte-refactoring-6pme74p49-popnegros-projects.vercel.app/)

## Dictamen

**APTO PARA DEMO COMERCIAL CONTROLADA EN PREVIEW.**

La aceptación técnica del recorrido comercial público se considera satisfecha en el HEAD auditado. No equivale a aceptación formal del cliente, aprobación de merge ni autorización de release a Production.

## Evidencias

### 1. Despliegue e identidad de datos

- Vercel deployment dpl_EWVxxqqV2gqoxxpK84x1zV5HrjEP: READY, target Preview, branch pmv-validation-candidate, SHA exacto b1ea823...
- Metadata de Vercel: repositorio popnegro-org/grupo-comunicarte-refactoring.
- /api/health: HTTP 200, Neon conectado, branch br-muddy-cell-au64infb, endpoint ep-patient-butterfly-aure9s02, commit exacto.
- Tras las llamadas al deployment, pg_stat_activity registró 4 sesiones app_runtime_vercel_preview_v2 vía PgBouncer. Identidad runtime confirmada.
- Rol: LOGIN true; SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION false.
- Grants: SELECT 14 tablas, INSERT 13, UPDATE 10, DELETE 7; 6 secuencias con USAGE+SELECT, ninguna con UPDATE.
- RLS 0/36 y 0 policies; diferido deliberadamente para este PMV. Sin cambios de roles/grants/RLS en esta ejecución.

### 2. Catálogo y rutas

- 9 rutas de aplicación (/, /soportes, /inventario, /soluciones, /nosotros, /contacto, /mediakits, /login, /dashboard): HTTP 200.
- /api/supports: HTTP 200, 28 soportes, sin campos de precios/costos.
- bue-trad-08: detalle HTTP 200.
- mza-trad-16: detalle HTTP 404; sigue en cuarentena.
- /api/media/83: HTTP 302, content-type image/webp.
- APIs administrativas anónimas: HTTP 401 en E2E.
- Header x-robots-tag: noindex.

### 3. CI y pruebas

| Workflow | Run | Resultado |
|---|---:|---|
| CI | [43677574397](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43677574397) | PASS |
| CI Candidate | [43677574356](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43677574356) | PASS |
| Visual QA | [43677574369](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43677574369) | 122/122 PASS dos veces |

CI Candidate incluye dependency audit, lint/typecheck, unit tests, build, bundle budget, Render smoke 9/9, QA E2E 12/12, Preview E2E 12/12 y Vercel Preview E2E 12/12.

### 4. Revisión visual de seis snapshots

Artefacto Visual QA: ID 14147760407.

Se compararon candidate y baseline para:
- Catálogo desktop y mobile.
- Tarjeta seleccionada desktop y mobile.
- Mapa responsive desktop y mobile.

No se detectaron regresiones estructurales bloqueantes en jerarquía, layout, selección, acciones ni encuadre responsive. Se observaron diferencias menores de renderizado/antialiasing y tiles de mapa. La inspección automatizada/técnica no constituye aceptación formal del cliente.

### 5. Recorrido comercial

Cobertura comprobada en Playwright:
1. Navegar el catálogo y filtrar soportes.
2. Seleccionar uno o más soportes y abrir Media Kit.
3. Continuar a contacto con origen mediakit, sin enviar una solicitud real.
4. Flujo sintético autenticado de QA: solicitud idempotente, Media Kit, exportación PDF/PPTX, persistencia en almacenamiento Preview aislado, recuperación autenticada, validación de firmas, confirmación de entrega y registro de evento.
5. Rechazo de soportes en cuarentena, acceso administrativo anónimo y exposición de precios.

No se utilizaron registros comerciales reales para la prueba transaccional.

## Criterios consolidados

| Criterio | Estado |
|---|---|
| Vercel Preview READY sobre SHA exacto | PASS |
| Identidad runtime PostgreSQL dedicada y least-privilege | PASS |
| Catálogo 28 soportes, sin precios | PASS |
| Cuarentena fail-closed | PASS |
| Rutas públicas principales | PASS |
| Selección → Media Kit → contacto | PASS |
| Exportación/recuperación PDF y PPTX en QA aislado | PASS |
| APIs administrativas protegidas | PASS |
| CI Candidate y Visual QA | PASS |
| Aceptación formal del cliente y dispositivo de presentación | PENDIENTE |
| Protección Vercel password/SSO/trusted IP | DESHABILITADA |

## Restricciones

- Preview no es privado: password, SSO y trusted IP están deshabilitados. noindex no es control de acceso.
- Mantener la demo en el recorrido comercial público. No mostrar dashboard ni credenciales.
- No enviar solicitudes reales ni modificar datos comerciales durante la presentación.
- No realizar merge, promoción ni cambios en Production con este informe.

## Decisión de release

**Demo Ready técnico: APROBADO con alcance controlado.**  
**Merge PR #90: NO-GO.** PR #90 mantiene 0 reviews; el ruleset main-production exige una aprobación, conversaciones resueltas y CI. El diff es amplio y requiere revisión humana.

El merge exige la autorización explícita: HUMAN GATE: APRUEBO PR #90.


## Addendum — revalidación autónoma 2026-11-20

**HEAD actual:** `936907d954cd29a63171cfa30a0c46c9bf961049`  
**Vercel Preview deployment:** `dpl_EMAV7BdDpSkHk4sGvXaYm4szD37R` — READY, SHA exacto, rama `pmv-validation-candidate`.  
**URL estable de Preview:** https://grupo-comunicarte-refactoring-git-pmv-1fe190-popnegros-projects.vercel.app/

### 1. CI y recorrido autenticado — PASS

- CI general [44223147752](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44223147752): PASS sobre el SHA exacto.
- CI Candidate [44223147763](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44223147763), intento 3: PASS. El primer intento detectó una Preview Vercel obsoleta; se generó un único deployment Preview para el SHA exacto y se reejecutó únicamente el job fallido.
- Dependency audit: 0 vulnerabilidades de producción; unit tests: 102 PASS; lint/typecheck, build y bundle budget: PASS.
- Render Preview Smoke: 9/9 PASS.
- Neon QA E2E: 12/12 PASS.
- Neon Preview E2E: 12/12 PASS.
- Vercel Preview E2E: 12/12 PASS. Preflight PASS: health conectado a la rama Neon esperada, catálogo público con 28 soportes y sin precios, soporte en cuarentena `mza-trad-16` devuelve 404, endpoints administrativos anónimos devuelven 401.
- Evidencia Vercel E2E: [artifact 14606636839](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44223147763/artifacts/14606636839).

### 2. Visual QA

- [Visual QA 44223147804](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44223147804): 126/126 PASS en dos ejecuciones.
- La ejecución inicializó snapshots que faltaban y luego ejecutó la suite completa. El resultado es un PASS técnico; el bootstrap no debe confundirse con una aprobación visual independiente de cliente.
- Artefacto: [visual-qa-report 14391847642](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44223147804/artifacts/14391847642).
- Inspección de capturas E2E del SHA exacto: catálogo responsive mobile, pantalla de login y formulario Media Kit → contacto. El formulario conserva un soporte seleccionado y muestra los datos comerciales; no se envió una solicitud real.

### 3. Neon Preview — auditoría read-only

Proyecto `mute-math-07036388`, rama `preview/pmv-validation-candidate` (`br-muddy-cell-au64infb`):

- 36 tablas públicas; 0 con RLS habilitado; 0 políticas en `public`.
- `app_runtime_preview` y `app_runtime_vercel_preview_v2` tienen el mismo conjunto de 14 tablas y los mismos privilegios: SELECT 14, INSERT 13, UPDATE 10, DELETE 7; USAGE en 6 secuencias.
- Ambos roles: LOGIN=true; SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION=false. Schema `public`: USAGE=true, CREATE=false. Base `neondb`: CONNECT/TEMP=true. No tienen grants de funciones ni membresías hacia roles elevados. No se encontraron default privileges asignados a estos roles.
- Login de lectura probado directamente como `app_runtime_preview`; el rol efectivo fue confirmado y el acceso de tabla quedó limitado a 14 tablas. Vercel fue observado en `pg_stat_activity` como `app_runtime_vercel_preview_v2` vía PgBouncer.
- Importante: los grants limitan el alcance por tabla, no por fila. Como RLS sigue deshabilitado, el rol puede leer las 46 filas de `supports`, incluidas filas de distintos tenants y en cuarentena. La API pública filtra el catálogo a los 28 soportes asignados y bloquea el detalle de `mza-trad-16`; esto no equivale a aislamiento de filas en PostgreSQL.
- `bue-trad-08`, `bue-trad-09` y `bue-trad-10`: `active=true`, `disponibilidad=disponible`, `tenant-ba`; descripciones sin el aviso contradictorio de indisponibilidad.
- Todas las consultas de esta revalidación fueron SELECT/read-only. No se modificaron datos, roles, grants ni políticas de Neon.

### 4. Límites vigentes de la demo

- Vercel Preview tiene password protection, SSO y trusted IP deshabilitados. La URL es accesible para quien la tenga; `noindex` no es un control de acceso.
- Demo permitida únicamente sobre el recorrido comercial público en Preview. No mostrar dashboard ni credenciales; no enviar solicitudes reales ni modificar datos comerciales durante la presentación.
- Aceptación formal del cliente y validación en el dispositivo/navegador de presentación siguen pendientes.
- RLS permanece diferido deliberadamente para este PMV. Los grants de 14 tablas no deben presentarse como aislamiento tenant-level.
- PR #90 continúa OPEN, sin merge y sin reviews registradas. No se modificaron `main`, Neon Production ni Vercel Production. El merge sigue sujeto a `HUMAN GATE: APRUEBO PR #90`.


---

## Revalidación autónoma — 2026-11-20 16:55 UTC

**Rama:** `pmv-validation-candidate`  
**HEAD auditado:** `abc1903f53989400413572a5d74f51f7d1172ad3`  
**Vercel Preview:** `dpl_B7H5TTj5aVBYM1MevgNFPzRZUf7h` — READY, SHA exacto.  
**Alias estable:** https://grupo-comunicarte-refactoring-git-pmv-1fe190-popnegros-projects.vercel.app/

### Validación automatizada sobre el HEAD exacto

- CI general [#44686132960](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44686132960): PASS.
- CI Candidate [#44686132981](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44686132981): PASS. Incluye dependency audit, typecheck, unit tests, build, bundle budget, Render Preview Smoke, Neon QA E2E, Neon Preview E2E y Vercel Preview E2E.
- Visual QA [#44686132979](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/44686132979): PASS.
- CI Candidate ejecutó los jobs de smoke y E2E sobre el SHA exacto `abc1903f...`; el preflight de Vercel comprobó branch, revisión de código, cuarentena y privacidad de precios.

### Recorrido comercial — verificación directa

Sobre el alias estable de Preview:

- `/`, `/inventario`, `/mediakits` y `/contacto?origen=mediakit`: respuesta HTML de la aplicación.
- `GET /api/health`: HTTP 200; Neon conectado; branch `br-muddy-cell-au64infb`; commit `abc1903f...`.
- `GET /api/supports`: HTTP 200; 28 soportes; no se exponen campos de precio/costo.
- `GET /api/supports/bue-trad-08`: HTTP 200.
- `GET /api/supports/mza-trad-16`: HTTP 404; el soporte sin ownership sigue fuera del catálogo.
- El código de Media Kit enlaza la selección con `/contacto?origen=mediakit`; la cobertura E2E del flujo comercial y de la operación sintética permanece PASS. No se envió ninguna solicitud real.
- Los endpoints administrativos anónimos y el flujo autenticado se validaron mediante los jobs E2E/smoke de CI Candidate; no se utilizaron credenciales ni se modificaron registros comerciales.

### Neon Preview — auditoría de solo lectura

Proyecto `mute-math-07036388`, branch `br-muddy-cell-au64infb`:

- 36 tablas públicas; 0 con RLS habilitado.
- `app_runtime_preview` y `app_runtime_vercel_preview_v2`: LOGIN=true; SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE=false.
- Ambos roles conservan grants sobre 14 tablas: SELECT 14, INSERT 13, UPDATE 10 y DELETE 7.
- `supports`: 46 filas; 28 con tenant y activas; 18 con `tenant_id IS NULL` en cuarentena.
- `bue-trad-08`, `bue-trad-09` y `bue-trad-10`: activos, disponibles y asignados a `tenant-ba`.
- `mza-trad-16`: activo pero sin tenant; no se publica en el catálogo ni en el endpoint de detalle.

**Límite de seguridad:** los grants restringen tablas, no filas. Con RLS deshabilitado, el runtime puede leer las 46 filas de `supports`; el filtro de la API pública no equivale a aislamiento tenant-level en PostgreSQL. RLS continúa diferido para este PMV y no se modificó.

### Estado de integración y límites de aceptación

- PR #90: OPEN, sin merge; HEAD `abc1903f...`; 646 commits ahead, 0 behind; 164 archivos modificados; 0 reviews registradas.
- La Preview responde públicamente mediante su URL y usa `x-robots-tag: noindex`; noindex no es control de acceso.
- Demo permitida únicamente sobre el recorrido comercial público en Preview. No mostrar dashboard ni credenciales; no enviar solicitudes reales ni modificar datos comerciales.
- La aceptación formal del cliente y la validación en el dispositivo/navegador de presentación siguen pendientes.
- No se modificaron `main`, Neon Production, Vercel Production, roles, grants, políticas ni datos de Production.

**Decisión:** APTO PARA DEMO COMERCIAL CONTROLADA EN PREVIEW. **Merge y release siguen NO-GO** y requieren revisión humana y `HUMAN GATE: APRUEBO PR #90`.
