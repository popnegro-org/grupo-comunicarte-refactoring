# PMV — cierre consolidado

**Rama candidata:** `pmv-validation-candidate`  
**SHA actual con la corrección:** `8a9a212da5e0f248b77669ee3f80746a78ef4f06`.  
**HEAD anterior a la corrección:** `3ee34fff92e1a91d2e0ad95d687174fce217a30d`.  
**PR de integración:** [#90 — PMV: validación de seguridad y cierre de QA](https://github.com/popnegro/grupo-comunicarte-refactoring/pull/90)  
**Preview con la corrección:** [deployment aislado](https://grupo-comunicarte-refactoring-kccph535k-popnegros-projects.vercel.app) — `dpl_GTKSUyip4e3BVArhTBe2nNHEheBB`, READY, HEAD `8a9a212d`.  
**Main / Production / Neon Production:** sin cambios.

## Decisión de alcance

Se consolida el cierre en tres bloques, sin fases adicionales:

1. **Integración y calidad automática.**
2. **Validación funcional y seguridad.**
3. **Cierre de release y aprobación humana.**

No se agregan funcionalidades posteriores al PMV (SEO/GEO, nuevos módulos o integraciones externas) a este cierre.

## 1. Integración y calidad automática — PASS

Evidencia CI del HEAD documental `85175284` (código funcional sin cambios desde `3ec2e407`):

| Control | Resultado |
|---|---|
| CI | PASS — run [41544304488](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41544304488) |
| CI Candidate | PASS — run [41544304550](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41544304550) |
| TypeScript | PASS — `tsc --noEmit` |
| Unit tests | PASS — 45/45 |
| Build | PASS |
| Auditoría de dependencias de producción | PASS — 0 vulnerabilidades reportadas |
| Visual QA CI | PASS — run [41544304591](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41544304591), workflow PASS |
| Vercel Preview | READY — deployment `dpl_HASwcLzczHChpKS4PeEQBspec5oY`, HEAD `85175284` |

Repetición local en caja efímera sobre el mismo código funcional; la validación CI más reciente corresponde al HEAD documental `85175284`:
- `npm ci`: PASS, 0 vulnerabilidades reportadas.
- `npm run lint`: PASS (el script ejecuta TypeScript, no ESLint).
- `npm run test:unit`: PASS, 45/45.
- `npm run build`: PASS.
- `npm audit --omit=dev --audit-level=moderate`: PASS, 0 vulnerabilidades de dependencias de producción reportadas.
- `git diff --check`: PASS (sin errores de whitespace).

La repetición local de Playwright no puede certificar regresión visual: el checkout no contiene snapshots de referencia. El intento local produjo 22 pruebas aprobadas y 6 fallos de comparación exclusivamente por snapshots ausentes; se descartaron los snapshots generados automáticamente. La evidencia visual válida para el candidato es el workflow CI PASS con baseline confiable; no se creó ni aceptó un baseline nuevo.

## 2. Validación funcional y seguridad — PARCIAL

### Preview público y API — PASS

Verificado nuevamente por HTTP en el deployment `dpl_HASwcLzczHChpKS4PeEQBspec5oY` (HEAD documental `85175284`; código funcional sin cambios):
- `GET /`, `/inventario` y `/contacto`: HTTP 200 (smoke HTTP; no se declara una nueva comprobación visual de navegador en esta pasada).
- `GET /api/health`: HTTP 200, `database=connected`.
- `GET /api/supports`: HTTP 200, 28 soportes.
- `GET /api/admin/stats`, `/api/admin/requests`, `/api/admin/support-pricing` y `/api/admin/mediakits` sin sesión: HTTP 401.
- `POST /api/admin/login` desde origen no permitido: HTTP 403.
- `PATCH /api/admin/mediakits/nonexistent/status` con cookie inválida y Origin externo: HTTP 403; con Origin same-origin Preview: HTTP 401 (el middleware de origen acepta la solicitud y la autenticación rechaza la cookie inválida).
- `POST /api/admin/login` desde el origen Preview con credenciales inválidas: HTTP 401.
- `GET /api/media/74`, `/api/media/51`, `/api/media/70`: HTTP 302.
- Descarga del objeto mediante la URL firmada emitida: HTTP 200.
- Revisión del catálogo público (28 registros): no expone claves de storage, bucket ni campos de tarifas internas.

### Neon Preview — solo lectura

Branch `preview/pmv-validation-candidate`, DB `neondb`:
- Soportes: 46.
- Soportes activos, disponibles y con tenant asignado: 28.
- Media Kits existentes: 3.
- Líneas de Media Kit: 0.
- Fixtures QA creados en esta ejecución: 0.
- Filas de rate limit de login: 3.

No se insertaron ni eliminaron registros. Las consultas fueron de solo lectura.

### Credenciales QA y límite de automatización

Se rotó `ADMIN_USER` y `ADMIN_PASSWORD` como variables sensibles, exclusivamente para Preview y la rama `pmv-validation-candidate`. No se agregaron targets Production ni Development. Se generó un secreto aleatorio y quedó almacenado únicamente en la variable sensible de Preview; no se expone en este informe.

El nuevo deployment se creó después de la rotación y quedó READY. Sin embargo, los controles de seguridad de la plataforma bloquearon la ejecución de la automatización que debía transferir la credencial al navegador de prueba. Por ese motivo no se afirma que el login del nuevo deployment ni el flujo autenticado hayan pasado. El responsable confirmó manualmente LOGIN DONE tras el redeploy Preview con la credencial rotada. Esto acredita el acceso manual; no equivale a una prueba automatizada de login.

### Pendientes que impiden declarar el cierre funcional completo

| Control | Estado | Alcance |
|---|---|---|
| Login manual con la nueva credencial | PASS | El responsable confirmó acceso correcto tras el redeploy Preview. La automatización de login sigue sin ejecutarse |
| Media Kit autenticado end-to-end | FAIL / EN CORRECCIÓN | La prueba manual alcanzó POST /api/admin/mediakits; PostgreSQL rechazó el INSERT por mediakits.nombre NOT NULL al no recibir valor |
| PDF/PPTX autenticado | FAIL / EN CORRECCIÓN | La persistencia falla antes de la descarga; la privacidad de los archivos aún requiere validación con sesión real |
| IDOR y handlers administrativos | PENDIENTE | Cobertura negativa de recursos y rutas de recuperación |
| R2 PUT/DELETE | PENDIENTE | Prueba controlada con sesión QA autorizada |
| Medios heredados sin `storage_key` | PENDIENTE | Inventario y plan de migración; no ejecutar backfill destructivo |
| Accesibilidad manual | PENDIENTE | Teclado, foco, contraste y lector de pantalla |
| ESLint independiente | DIFERIDO | No está configurado; TypeScript sí está validado |

## 3. Cierre de release — BLOQUEADO POR VALIDACIÓN FUNCIONAL Y HUMAN GATE

**Estado: NO-GO para merge / Production.** El código candidato compila y supera CI; las pruebas públicas y de medios privados listadas arriba pasan. No se declara el PMV cerrado para release hasta completar el flujo autenticado y los controles de seguridad pendientes.

El PMV no requiere multiusuario tenant-scoped: el alcance actual conserva un administrador global. `tenant_id` organiza ownership/operación comercial; no se declara RLS como frontera de autorización. El runtime Preview se verificó históricamente con `neondb_owner` y `BYPASSRLS=true`; RLS queda fuera del alcance de este PMV y deberá rediseñarse si se incorpora aislamiento de usuarios por tenant.

### HUMAN GATE obligatorio

- Aprobar explícitamente el merge del PR #90 a `main`.
- Aprobar explícitamente la promoción a Production.
- Cualquier migración/backfill o cambio destructivo requiere autorización independiente.

No se ejecutaron estas acciones. No se modificó `main`, Production ni Neon Production; no se enviaron comunicaciones reales.


## 4. Incidencia detectada en la prueba manual de exportación — 2026-11-02

El responsable confirmó LOGIN DONE y reportó Generación de PPT/PDF FAIL.

### Causa raíz confirmada

Los logs del deployment Preview dpl_2AqTphHpN4BMCUrME5UcZmRmMkRs registraron POST /api/admin/mediakits con error PostgreSQL 23502: public.mediakits.nombre es NOT NULL y el código insertaba únicamente las columnas del contrato nuevo (client_name, support_ids, etc.). El esquema real de Neon Preview conserva además columnas obligatorias del contrato legado (nombre, cliente_id, cliente_nombre, ciudad, screen_ids, estado, fecha). El fallo ocurre antes de invocar la generación/descarga de PDF o PPTX.

### Corrección preparada en pmv-validation-candidate

- Persiste simultáneamente el contrato nuevo y las columnas obligatorias del esquema real.
- Resuelve el registro de cliente por email y tenant_id; si no existe, lo crea dentro de la misma transacción. Al guardar nuevamente el mismo Media Kit, reutiliza su cliente existente, sin duplicarlo.
- Deriva la ciudad desde los soportes seleccionados, persiste IDs como JSON serializado y sincroniza el estado legado con el ciclo de vida del Media Kit.
- El estado legado también se actualiza al cambiar el estado del Media Kit.
- La comprobación de esquema ahora incluye las columnas legadas y la tabla clientes.

### Evidencia local de la corrección

- npm ci: PASS, 0 vulnerabilidades reportadas.
- npm run lint (tsc --noEmit): PASS.
- npm run test:unit: PASS, 46/46.
- npm run build: PASS.
- Playwright tests/visual/mediakit-delivery.spec.ts: PASS, 6/6 (desktop y mobile; API simulada, no es evidencia de persistencia real).
- git diff --check: PASS.
- Plan SQL de las sentencias INSERT/SELECT validado contra el schema de Neon Preview con analyze=false; no se insertaron registros de prueba.

**Estado:** corrección desplegada en Preview READY; CI y CI Candidate PASS. Pendiente la repetición autenticada de guardado + descarga real PDF y PPTX. Visual QA CI completó PASS — run [41550453074](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41550453074). No se declara resuelta la incidencia hasta que ambos archivos se descarguen correctamente desde Preview.

No se modificó main, Production ni Neon Production. No se realizaron escrituras en Neon durante esta auditoría.


### Evidencia adicional del HEAD 8a9a212d

- CI: PASS — run [41550452999](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41550452999).
- CI Candidate: PASS — run [41550453019](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41550453019).
- Visual QA: PASS — run [41550453074](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41550453074).
- Vercel Preview: READY — [abrir deployment](https://grupo-comunicarte-refactoring-kccph535k-popnegros-projects.vercel.app), deployment `dpl_GTKSUyip4e3BVArhTBe2nNHEheBB`.
- Smoke HTTP en ese deployment: `/` 200, `/api/health` 200 con DB connected, `/api/supports` 200, `/api/admin/mediakits` 401 sin sesión.
- No se ejecutó POST autenticado de prueba ni se crearon registros en Neon; la prueba real de persistencia/descarga queda a la espera de la repetición manual del responsable.


## 5. Alineación de exportadores con el prototipo canónico — 2026-11-02

Se tomó como referencia prototipo_mediakit_grupo_comunicarte.pptx (6 diapositivas, 16:9) y se corrigió src/lib/adminMediaKitExport.ts en la rama candidata.

### Cambios implementados
- PPTX y PDF comparten la secuencia canónica: portada, propuesta, selección de soportes, ubicaciones, resumen comercial y próximos pasos.
- Se alinearon la proporción panorámica 16:9, paleta navy/blanco/naranja, jerarquía tipográfica, tarjetas de soportes, resumen de inversión, pie y numeración.
- La selección se pagina en grupos de tres soportes; la página de ubicaciones y el resumen se conservan.
- El PPTX incorpora las imágenes de soportes disponibles; cuando no hay imagen, muestra el bloque de vista previa.
- El PDF ahora utiliza páginas panorámicas 960×540 pt y la misma composición/secuencia.

### Validación automatizada del artefacto
- Test unitario nuevo: genera PDF y PPTX desde datos sintéticos.
- PDF: cabecera PDF 1.4, 6 páginas, MediaBox 960×540 y estructura xref.
- PPTX: ZIP válido, 6 diapositivas y tamaño wide 16:9.
- npm run lint: PASS.
- npm run test:unit: PASS, 48/48.
- npm run build: PASS.
- git diff --check: PASS.

### Alcance aún no certificado
- No se ha ejecutado una comparación visual pixel-a-pixel contra las seis diapositivas del archivo de referencia.
- El mapa de ubicaciones sigue siendo esquemático, como indica el propio prototipo; no debe presentarse como georreferenciación real.
- La prueba de generación usa datos sintéticos y no certifica persistencia autenticada ni descarga desde Preview.
- No se han hecho escrituras en Neon ni despliegues Production.

La corrección de diseño queda preparada para CI y Preview; no se declara el PMV listo para release ni se levanta el NO-GO general hasta completar la prueba autenticada real y el QA visual del deployment.

### QA visual en esta iteración
- Se intentó repetir Playwright sobre tests/visual/mediakit-delivery.spec.ts (desktop y mobile).
- Resultado: bloqueado antes de iniciar los tests porque el ejecutable Chromium `chrome-headless-shell` no está instalado en la caja efímera.
- No se instaló ni se intentó sortear el bloqueo del navegador. La validación visual del artefacto permanece pendiente.


### Corrección posterior a Visual QA — 2026-11-03
- Visual QA workflow 41553827088: 26 passed, 2 failed. Ambos fallos fueron el caso de inversión global no definida; el test esperaba el texto comercial “Inversión sujeta a cotización”.
- Causa: el nuevo resumen mostraba el placeholder de moneda/total cuando no existía importe acordado.
- Corrección: PDF y PPTX ahora muestran “Inversión sujeta a cotización” cuando proposalAmount está vacío; se añadió test unitario de regresión.
- Validación local tras la corrección: TypeScript PASS, 49/49 unit tests PASS, build PASS y diff-check PASS.
- El siguiente commit candidato debe repetir CI, CI Candidate, Visual QA y Preview. No declarar Visual QA PASS hasta que el workflow posterior termine.


### Refinamiento visual del PDF — 2026-11-03

La comparación visual del PDF generado con el PDF de referencia derivado del prototipo identificó una brecha de acabado: las tarjetas y paneles del exportador eran rectangulares y el mapa carecía de algunos acentos gráficos presentes en el diseño canónico.

Corrección aplicada en `src/lib/adminMediaKitExport.ts`:
- Se agregaron primitivas PDF para rectángulos redondeados, círculos y sombras suaves.
- Se aplicaron a tarjetas de propuesta, fichas de soportes, paneles del resumen comercial y tarjetas de próximos pasos.
- El mapa esquemático conserva su condición ilustrativa, pero ahora usa contenedor redondeado, marcadores circulares y segmentos de recorrido en naranja.
- La portada incorpora líneas horizontales decorativas coherentes con el prototipo.
- No se cambió el contenido comercial ni se inventaron ubicaciones geográficas.

Evidencia de validación sobre el artefacto generado desde datos sintéticos (3 soportes):
- PDF generado: 6 páginas, 960×540 pt; revisadas visualmente en Chromium PDF Viewer frente al PDF de referencia de 6 páginas.
- PPTX generado: 6 diapositivas wide; test de estructura y secuencia canónica PASS.
- Tests reforzados para exigir geometría redondeada en PDF y tipografía Aptos/geometría redondeada en PPTX.
- `npm run lint`: PASS.
- `npm run test:unit`: PASS, 49/49.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Alcance no certificado: no es una comparación pixel-a-pixel; las imágenes reales dependen de que los soportes tengan medios válidos y accesibles. El mapa sigue siendo esquemático. La persistencia autenticada y descarga desde Preview siguen pendientes, y no se realizaron escrituras en Neon ni despliegues Production.
