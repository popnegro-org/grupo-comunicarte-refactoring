# Auditoría del contrato PMV — 2026-11-07

**Repositorio:** `popnegro-org/grupo-comunicarte-refactoring`  
**Rama auditada:** `pmv-validation-candidate`  
**SHA de código auditado:** `ce4bd642b623a2c37146cdd4d50f3acdf7d67514`  
**PR:** [#90 — PMV: validación de seguridad y cierre de QA](https://github.com/popnegro-org/grupo-comunicarte-refactoring/pull/90)  
**Contrato normativo:** [../PMV-CONTRACT-AND-ACCEPTANCE.md](../PMV-CONTRACT-AND-ACCEPTANCE.md)

**Veredicto: NO-GO para merge y Production.** Este informe clasifica evidencia; no modifica el contrato normativo.

## 1. Método y límites

- Se inspeccionaron el HEAD remoto, PR #90 y PR #100.
- Se instalaron dependencias desde lockfile y se ejecutaron controles locales en una caja efímera.
- No se conectó a Neon, Render ni Production durante esta pasada. Sí se ejecutó smoke HTTP público y navegación de solo lectura en el Vercel Preview existente.
- No se escribieron bases de datos, no se alteraron ramas remotas, no se aceptaron snapshots nuevos ni se enviaron comunicaciones.
- Los resultados históricos de Preview/CI se identifican como evidencia previa, salvo el smoke HTTP descrito en §7.

## 2. Controles locales sobre SHA ce4bd642

| Control | Resultado | Evidencia |
|---|---|---|
| `npm ci --include=dev` | PASS | 269 paquetes; 0 vulnerabilidades reportadas |
| `npm run lint` | PASS | `tsc --noEmit`, exit 0 |
| `npm run test:unit` | PASS | 59/59 |
| `npm run build` | PASS | Vite + bundle Express |
| `npm audit --omit=dev --audit-level=high` | PASS | 0 vulnerabilidades altas |
| `git diff --check` | PASS | Sin errores de whitespace |
| Playwright local | PARTIAL | 22 passed, 6 sin snapshots de referencia, 2 skipped |
| CI / CI Candidate / Visual QA | PASS en SHA posterior | Runs 42400225412, 42400225564 y 42400225394 sobre SHA 5e477b8; Visual QA ejecutó regresión PASS, pero la comparación contra baseline confiable previo quedó skipped |

Los seis fallos locales fueron por ausencia de archivos en `tests/visual/__snapshots__`, no por diferencias contra un baseline. No se generaron ni aceptaron snapshots. GitHub Actions ejecutó la regresión visual y terminó PASS; sin embargo, el paso `Compare against previous trusted baseline` quedó skipped, por lo que no se afirma comparación contra un baseline previamente revisado. `npm run lint` ejecuta TypeScript; no acredita ESLint independiente.

## 3. Matriz P0

| Criterio normativo | Estado | Evidencia / brecha |
|---|---|---|
| Ownership conciliado con PDFs; pendientes en cuarentena | PARTIAL | 28 soportes documentados (10 Buenos Aires, 18 Mendoza). Preview conserva 18 filas sin tenant, incluida 1 activa (`mza-trad-16`). Revalidar matriz completa en SHA liberable. |
| CRUD y endpoints tenant-safe en lectura/escritura | PARTIAL | Hay lógica y tests de ownership. El PMV conserva un administrador global; `tenant_id` es ownership comercial, no autorización entre usuarios. Falta matriz negativa sobre rutas reales. |
| Solicitud mixta: cabecera global, ítems tenant-scoped | PARTIAL | Regla presente en contrato/modelo/tests y datos Preview históricos; falta repetir QA transaccional en SHA liberable. |
| Media Kits, pricing, solicitudes, estadísticas, media y exportaciones tenant-safe | NOT VERIFIED | Falta evidencia end-to-end con sesión real y casos mixtos. |
| Pruebas negativas cross-tenant, spoofing e IDOR | NOT VERIFIED | Tests unitarios no sustituyen matriz negativa de endpoints autenticados. |
| RLS / rol runtime probado o decisión segura documentada | PARTIAL | Se documenta que no hay usuarios tenant-scoped y RLS no es frontera de seguridad; Preview usa principal con BYPASSRLS. Falta cerrar pruebas de autorización server-side. |
| Cero filtraciones de precios internos | PARTIAL | API pública revisada históricamente sin tarifas; tests de exportación cubren fallback sin importe global. Falta cobertura completa API/JSON/HTML/PDF/PPT/impresión/logs/errores. |
| Solicitud persistente e idempotente, secuencial y concurrente | PASS histórico | El contrato registra pruebas Preview concurrentes sin duplicados y unicidad `request_id`; no se repitió escritura en esta auditoría. |
| Ownership documental de 28 soportes | PASS documental | Matriz `canonical_id` y PDFs fuente; no convierte las 18 filas sin fuente en elegibles. |
| Registros sin ownership excluidos del catálogo y flujo comercial | PARTIAL | Tests unitarios cubren exclusión; Preview previo registró 28 públicos, 404 para `mza-trad-16` y rechazo de solicitud. Repetir smoke en deployment liberable. |
| Media Kits/líneas conservan tenant por soporte; kits mixtos globales | PARTIAL | Migración/servicios/tests presentes; falta prueba autenticada completa de persistencia y recuperación. |

## 4. Matriz P1

| Criterio | Estado | Evidencia / brecha |
|---|---|---|
| Duraciones 7, 15, 21 días y mensual validadas en backend | PASS | Tests cubren modalidades válidas y rechazan valores legacy/custom no autorizados. |
| Cotización, PDF/PPT, entrega y registro trazables | PARTIAL | Generadores tienen tests; falta persistencia autenticada, descarga, entrega y registro real en Preview. |
| Exportación/recuperación desktop y mobile | NOT VERIFIED | Sin evidencia end-to-end con sesión real y archivos recuperados en ambos viewports. |
| Integraciones incluidas verificadas | FUERA DE ALCANCE / NOT VERIFIED | HubSpot, Resend/email transaccional, WhatsApp API y Drive/Slides no están acreditados en el contrato base. No presentar CTAs como integraciones. |
| Solicitudes públicas idempotentes y concurrentes | PASS histórico | Preview 201/200 sin duplicados descrito en contrato; no repetido en esta pasada. |

## 5. Matriz P2 y release

| Criterio | Estado | Evidencia / brecha |
|---|---|---|
| Typecheck, unit tests y build | PASS | Ejecutados localmente en SHA exacto; 59/59 unit tests. |
| Playwright en SHA exacto | PARTIAL local / PASS CI de regresión | CI Visual QA PASS en `Run visual regression`; comparación contra previous trusted baseline skipped. Clon local carece de snapshots. |
| QA funcional real desktop/mobile, no solo mocks | PARTIAL | Playwright local usa fixtures/mocks; falta QA autenticado real del flujo comercial y Media Kit. |
| Accesibilidad manual | NOT VERIFIED | Pendiente teclado, foco, contraste, labels y lector de pantalla. |
| Rendimiento, bundle y consola | PARTIAL | Build PASS; bundles comprimidos relevantes (~135 KB principal y ~135 KB exportador). Falta auditoría navegador/performance. |
| Documentación histórica alineada | PARTIAL | `docs/pmv/qa-status.md` y `HUMAN_GATE_VALIDATION.md` conservan encabezados/evidencia de SHA, fechas y ramas anteriores. |
| Evidencias adjuntas al PR | PARTIAL | PR #90 contiene CI, Preview e infraestructura; faltan casos autenticados P0/P1. |

## 6. Infraestructura

| Componente | Evidencia disponible | Consecuencia |
|---|---|---|
| PR #90 | Open, Draft, base `main`, head `pmv-validation-candidate`, HEAD `ce4bd642` | Mantener Draft; no merge |
| PR #100 | Open, Draft, base candidata, head `feat/integration-outbox-sandbox` | Mantener separado |
| Vercel Preview | PR #90 documenta READY y smoke HTTP previo; SHA funcional `26cd907`, commits posteriores de documentación | Repetir smoke y vincularlo al SHA liberable |
| Render QA | Deploy live reportado; smoke HTTP externo NO VERIFICADO | No declarar runtime validado |
| Neon | No consultado/escrito en esta pasada; Production/main intactos | Revalidar solo Preview con fixtures aislados |
| Proveedores externos | Sin conexión productiva de Grupo Comunicarte | No sincronizar ni enviar datos |

## 7. Bloqueantes prioritarios

1. **P0 Media Kit autenticado:** demostrar creación/guardado, recuperación y transición de estado en Neon Preview; validar tenant por línea y kit mixto global.
2. **P0 autorización/tenancy:** probar ownership pendiente, spoofing, drift, IDOR y endpoints admin. Respaldar la decisión de no usar RLS con pruebas server-side.
3. **P0 cuarentena:** repetir listado público, detalle 404 y rechazo de solicitud con conteos y SHA identificados.
4. **P0 privacidad:** comprobar que costos, márgenes y tarifas internas no aparecen en ninguna salida pública ni exportación.
5. **P1 entrega comercial:** cotización con importe global aprobado, PDF/PPT descargable, versión/fecha/responsable y confirmación/seguimiento.
6. **P2 QA visual/accesibilidad:** ejecutar con baseline confiable y completar revisión manual desktop/mobile. No crear baseline nuevo para hacer pasar el workflow.
7. **Documentación:** sincronizar `qa-status.md` y `HUMAN_GATE_VALIDATION.md` con esta matriz, sin alterar el contrato normativo.

## 7.1 Smoke público adicional de Vercel Preview — 2026-11-07

Deployment inspeccionado: `https://grupo-comunicarte-refactoring-1bxxizph1-popnegros-projects.vercel.app` (el deployment de Preview documentado por PR #90).

| Prueba | Resultado |
|---|---|
| Navegación de `/` en Chromium | PASS; título, navegación principal, CTAs y contenido institucional visibles |
| `GET /api/health` | HTTP 200 |
| `GET /api/supports` | HTTP 200; 28 soportes |
| `GET /api/admin/mediakits` sin sesión | HTTP 401 |
| Campos sensibles en payload público inspeccionado | No se encontraron claves de tarifas internas, costos, márgenes, tenant ni owner |
| Soporte LED Móvil `mza-led-movil-01` | `duration: 4 horas`, `spot_duration_seconds: 10`, `technical.monthly_impacts: null` |

El valor de impactos mensuales está ausente (null) en el registro público actual. No se calculó ni se inventó un valor; el dato debe cargarse manualmente cuando exista información comercial confirmada. Esta prueba no acredita guardado autenticado de Media Kit, exportación ni QA del runtime Render.

## 8. Decisión

**NO-GO.** No están cerrados todos los P0/P1 con evidencia end-to-end en un mismo SHA.

Se permite continuar en `pmv-validation-candidate` y entornos efímeros/Preview aislados. Este informe no autoriza:
- merge de PR #90 o #100;
- cambios en `main` o promoción a Production;
- DDL/backfill en Neon Production;
- cambios destructivos de infraestructura;
- conexión de proveedores o comunicaciones reales.

El próximo gate será GO para revisión humana solo cuando P0/P1 estén cerrados con evidencia reproducible en el SHA exacto. Merge y Production siguen reservados al HUMAN GATE.


## 9. Addendum — corrección y validación posterior

En el mismo ciclo se detectó y corrigió el caso en que `getCardFacts()` omitía un valor manual `monthly_impacts = 0` por una condición truthy. El cambio está en `5e477b8c93d4b72d245b852214e2bd35e69ce31a`, con test unitario específico para LED Móvil.

Validación local del diff: typecheck PASS, 60/60 unit tests, build PASS, auditoría de dependencias de producción 0 vulnerabilidades altas y `git diff --check` PASS.

Workflows del SHA `5e477b8`:
- CI `42400225412`: SUCCESS.
- CI Candidate `42400225564`: SUCCESS.
- Visual QA `42400225394`: SUCCESS; `Run visual regression` SUCCESS. Los pasos `Bootstrap trusted baseline`, `Compare against previous trusted baseline` y `Save trusted baseline` quedaron skipped. Por tanto, el resultado confirma la regresión visual automatizada ejecutada, no la comparación contra baseline previamente revisado.

Smoke Preview público (deployment previo, sin despliegue nuevo):
- Home desktop 1440 y mobile 390: HTTP 200, sin overflow horizontal ni errores JavaScript.
- Menú hamburguesa mobile: abre; navegación a `/inventario` funciona y no genera overflow.
- `GET /api/health`: 200; `GET /api/supports`: 200, 28 registros; `GET /api/admin/mediakits` sin sesión: 401.
- La respuesta pública inspeccionada no expuso claves de precios, costos, márgenes, tenant ni owner.


## 10. Ciclo autónomo 1–3 — QA autenticado, seguridad y release QA

Fecha: 2026-11-07. Todas las escrituras de este ciclo se limitaron a la rama Neon aislada `qa/pmv-mediakit-e2e-20261107` (branch ID `br-little-feather-auiwws5u`), hija de `qa/pr96-ownership-20261105` (`br-bold-block-aua43ua0`). No se modificaron Production ni `main`.

### 10.1 Media Kit autenticado end-to-end

| Criterio | Resultado |
|---|---|
| Login admin API | PASS — HTTP 200 |
| Endpoint admin sin autenticación | PASS — HTTP 401 |
| Crear solicitud pública sintética | PASS — HTTP 201 |
| Recuperar solicitud en administración | PASS — HTTP 200 |
| Crear y guardar Media Kit desde solicitud | PASS — HTTP 201 |
| Recuperar Media Kit por ID | PASS — HTTP 200 |
| Recuperar Media Kit por solicitud | PASS — HTTP 200 |
| Transiciones draft → ready → sent | PASS |
| Crear Media Kit desde solicitud multi-tenant | PASS — cabecera global (`tenant_id = NULL`) |
| Ownership por línea | PASS — `tenant-default` y `tenant-ba` conservados por soporte |
| Intento de añadir soporte ajeno a la solicitud de origen | RECHAZADO — HTTP 409 |
| Solicitud de origen inexistente | RECHAZADA — HTTP 404 |
| Soporte con ownership pendiente | RECHAZADO — HTTP 409 |

Se implementó validación explícita de la solicitud de origen: debe existir, tener líneas con ownership consistente contra el inventario actual y no se pueden agregar soportes que no pertenezcan a esa solicitud. Los errores de dominio dejaron de responder como HTTP 500 genérico y ahora se clasifican como 400/404/409/503 según corresponda. La lógica de validación quedó extraída a `src/server/mediakitSourceRequest.ts` con pruebas unitarias.

También se creó y guardó un Media Kit desde la interfaz administrativa. El modal de la solicitud recuperó el ID relacionado y presentó el estado `Enviado`, diferenciado de `Cotizado`.

La solicitud multi-tenant enviada con un `tenantId` falsificado fue persistida como global; cada línea conservó el tenant derivado del inventario. El tenant de la cabecera no se acepta desde el cliente.

### 10.2 Seguridad y privacidad comercial

| Control | Resultado |
|---|---|
| GET/POST/PATCH de administración sin autenticación | HTTP 401 |
| Mutación con cookie y Origin ausente | HTTP 403 |
| Mutación con Origin no confiable | HTTP 403 |
| Mutación con Origin permitido | Supera CSRF y llega a validación de negocio |
| Catálogo público `/api/supports` | HTTP 200; 28 soportes en Render QA |
| Tarifas internas sin autenticación | HTTP 401 |
| Tarifas internas con autenticación | HTTP 200 |
| Soporte en cuarentena consultado públicamente | HTTP 404 |
| Campos de precios/costos/márgenes/tenant/owner en payload público inspeccionado | No detectados |

Prueba de exportación con un soporte cuyo precio interno de referencia era 150: el dato se mostró únicamente en la interfaz administrativa. PDF y PPTX incluyeron el texto de cotización pendiente y no incluyeron el valor interno ni la etiqueta de tarifa interna.

**Límite de la auditoría de IDOR:** la aplicación dispone de un principal administrador global; no existe un usuario autenticado por tenant en el flujo auditado. Por eso se verificaron la frontera admin/público, CSRF, ownership de cabecera/líneas y resistencia a tenant spoofing, pero no se declara demostrada una política de autorización entre usuarios de distintos tenants. Si el PMV requiere usuarios tenant-scoped, esa capacidad sigue pendiente.

### 10.3 UX, visual QA y accesibilidad

- Typecheck/lint: PASS.
- Unit tests: 67/67 PASS.
- Build: PASS.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades altas.
- Playwright `mediakit-delivery.spec.ts`: PASS en Chromium desktop y mobile.
- UI autenticada: creación, consulta de solicitud, consulta del Media Kit y etiqueta `Enviado` PASS.
- Constructor Media Kit a 390×844: sin overflow horizontal.
- Axe: 0 violaciones detectadas en home, inventario/mapa, listado de soportes, editor (General, Ubicación, Contenido y Comercial), constructor Media Kit y modal de solicitud, en desktop/mobile. Los resultados `incomplete` de axe siguen requiriendo revisión manual de los casos que la herramienta no puede resolver automáticamente.

Correcciones de accesibilidad incluidas:
- Los marcadores del mapa reciben nombres accesibles.
- El catálogo tiene un H1.
- Labels asociados a selects, textarea y precios.
- Landmarks de navegación y vista previa con nombres distintos.
- Contraste corregido en navegación, acciones y textos auxiliares.
- Estado `Enviado` no se representa como `Cotizado`.

### 10.4 Integridad de datos QA

La rama hija recibió únicamente registros sintéticos. La rama QA padre conservó exactamente sus conteos previos: 20 solicitudes, 34 líneas de solicitud, 3 Media Kits, 0 líneas de Media Kit y 4 clientes. No se borraron registros ni ramas. La rama hija conserva los artefactos sintéticos de las pruebas para trazabilidad; no se ejecutaron comunicaciones ni integraciones externas.

### 10.5 Infraestructura y decisión de release

Smoke HTTP del servicio Render QA existente:
- `/`: HTTP 200.
- `/api/health`: HTTP 200, base conectada.
- `/api/supports`: HTTP 200.
- `/api/admin/mediakits` y `/api/admin/support-pricing` sin sesión: HTTP 401.

**La instancia Render QA no está desplegada con el HEAD candidato actual.** Su último deployment continúa en `ce4bd642b623a2c37146cdd4d50f3acdf7d67514`; el servicio conserva una referencia histórica de repositorio y no se observó un nuevo deployment al avanzar la rama. Los logs de Render no estuvieron disponibles durante esta pasada (respuesta 503 del proveedor).

**Vercel Preview tampoco está actualizado:** el deployment disponible continúa en SHA `26cd907556466d91772cc47a41f6a66261b9e69a`. No se creó otro deployment para no consumir el límite diario del plan. La vinculación Git del proyecto conserva el namespace histórico y requiere normalización para validar el HEAD actual en Preview.

### 10.6 Veredicto actualizado

**NO-GO para merge a main y Production.** El flujo autenticado de Media Kit, ownership por línea, tenant mixto, validación de origen, privacidad de precios y accesibilidad de las pantallas auditadas tienen evidencia PASS en la rama QA aislada. Sin embargo, no se declara cerrado el PMV completo porque:

1. Render QA y Vercel Preview siguen ejecutando commits anteriores al HEAD candidato.
2. No se ha completado en un único recorrido reproducible el flujo integral Dashboard → Soportes → Editar → Guardar → Revisión de publicación → Catálogo → Mapa → Media Kit → Disponibilidad → Solicitud sobre el deployment candidato.
3. La autorización por usuario tenant-scoped no está implementada/validada; la administración actual es global.
4. La revisión manual de los casos `incomplete` de axe sigue pendiente.

PR #90 permanece Draft. `main`, Production y las bases de datos productivas permanecen sin cambios. No se solicita ni ejecuta merge.


### 10.7 Resultado final de baseline confiable — 2026-11-07

El workflow Visual QA del HEAD `075d51493d4ef3c62d46faf00072fa11d88290c1` finalizó SUCCESS:

- Run: `42405285396`.
- Build y Preview server: PASS.
- Restore visual baseline: PASS.
- `Compare against previous trusted baseline`: PASS.
- `Save trusted baseline`: PASS.
- Los pasos de bootstrap y refresh manual de snapshots quedaron skipped; no se crearon snapshots manuales.
- `Run visual regression` quedó skipped por la ruta condicional del workflow; la comparación confiable ejecutada fue la del paso anterior y terminó PASS.

CI run `42405285379` y CI Candidate run `42405285375` también finalizaron SUCCESS sobre el mismo SHA. Queda cerrada la validación automatizada contra el baseline confiable. Continúa pendiente la revisión manual de los nodos axe `incomplete` y el recorrido funcional integral del PMV sobre un deployment actualizado.
