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
