# PMV candidate — estado de QA y bloqueantes

**Branch:** `pmv-validation-candidate`  
**HEAD publicado:** `3118b33382ff4eb4108161c588570aca40c51818`.
**Preview:** READY; deployment `dpl_C4oSeMa4iH1ghNiMaaQpKiBJgt1J`.
**Preview URL:** https://grupo-comunicarte-refactoring-rfilbknze-popnegros-projects.vercel.app
**Verificación:** 2026-11-02 09:36 UTC
**Main / Production:** sin cambios.

## Validación de referencia (`b4c8dc7`, histórica)

- CI Candidate: [PASS](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41414525561).
- Visual QA: [PASS](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41414525581).
- Vercel Preview: READY; deployment `dpl_FWRwNnzm28wWdP8e1EUMtJETA3Lr`, target Preview, sin promoción a Production.
- Local en este SHA: `npm run lint` PASS; `npm run test:unit` PASS (42/42); `npm run build` PASS; `git diff --check` PASS.
- Se endureció `requireAdmin`: todas las rutas `/api/admin/*` declaradas pasan por autenticación; mutaciones con cookie requieren `Origin` exacto en allowlist. Bearer explícito queda disponible para integraciones no-browser. Se agregaron tests unitarios de parsing de cookie, precedencia Bearer, CSRF por Origin y requests seguras.
- El bootstrap API ahora responde un mensaje genérico al cliente y no devuelve hostname de DB ni el mensaje interno de excepción.
- Las verificaciones previas de Preview documentadas más abajo pertenecen a SHA anteriores; no se presentan como smoke tests del SHA actual porque el deployment continúa protegido por Deployment Authentication.

## Verificación automatizada

| Control | Resultado | Evidencia |
|---|---|---|
| TypeScript (`npm run lint`) | PASS | CI Candidate [41366727378](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41364709174) |
| Unit tests | PASS — 38/38 | CI Candidate |
| Build | PASS | CI Candidate |
| Auditoría de dependencias Production | PASS — 0 vulnerabilidades | CI Candidate |
| Playwright / Visual QA | PASS — 28 passed, 2 skipped | Visual QA [41366727467](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41364709120) |
| Baseline visual | PASS | comparación contra baseline confiable del candidato |
| Vercel Preview / Neon | PASS | deployment READY; `/api/health` database connected |

En SHA `633b4faa`, CI Candidate y Visual QA completaron con éxito; la suite visual comparó contra el baseline confiable `6b9248aa`. Los dos skips corresponden a snapshots específicos de proyecto: `desktop mantiene jerarquía, estados y atributos de las tarjetas` solo corre en `chromium-desktop`; `mobile mantiene tarjetas legibles y acciones accesibles` solo corre en `chromium-mobile`. Son exclusiones por proyecto, no fallos. El run más reciente completó 28 pruebas y omitió esas 2.

`npm run lint` ejecuta `tsc --noEmit`; ESLint independiente no está configurado.

## Fuente y conciliación de inventario

Fuente primaria: PDFs de `docs/inventario/source/`; matriz en [TENANT-OWNERSHIP-MAPPING.md](../inventario/processed/TENANT-OWNERSHIP-MAPPING.md).

- 28 soportes conciliados: 10 `tenant-ba`, 18 `tenant-default`.
- 18 soportes sin evidencia permanecen `tenant_id = NULL`: 17 inactivos y 1 activo (`mza-trad-16`). No se inventó ownership.
- 30/32 ítems históricos de solicitudes tienen tenant; 2 siguen pendientes.
- 18 cabeceras históricas: 2 globales, 14 tenant y 2 sin scope. Una cabecera sin scope contiene ítems de ambos tenants y un ítem pendiente; no debe reclasificarse automáticamente.
- Neon Preview: `mediakit_items.tenant_id` tiene FK e índice; la tabla tenía 0 líneas al aplicar la migración.
- Neon Preview: `admin_login_attempts` existe con PK `ip_hash`, CHECK `attempt_count >= 1` e índice `updated_at`.

## Smoke tests de Preview

Último smoke funcional confirmado en el deployment anterior READY (`dpl_gEMNyAGEuGZeeQu6ke8oQQmioBxg`, SHA `6b9248aa`): `/api/health` HTTP 200 con `database=connected`; `/api/supports` HTTP 200 con 28 soportes; DTO público sin `tenant_id` ni pricing interno; `/mediakits` y `/contacto` HTTP 200. El deployment actual de SHA `633b4faa` está READY, pero la herramienta de fetch encontró protección de Deployment Authentication (401); no se pudo repetir el smoke en ese SHA. No se desactivó la protección.

| Prueba | Resultado |
|---|---|
| `GET /api/health` | HTTP 200; database connected |
| `GET /api/supports` | HTTP 200; 28 soportes |
| Precio interno y `tenant_id` en DTO público | No expuestos |
| `GET /api/supports/mza-trad-16` | HTTP 404 |
| Solicitud pública con `mza-trad-16` | HTTP 404; no insertó solicitud |
| Endpoints admin sin sesión | HTTP 401 |
| Login con credenciales ficticias | HTTP 401, no 503; limiter operativo |

### Idempotencia — prueba funcional y concurrente

En Preview se enviaron dos POST concurrentes con la misma clave UUID y el mismo payload:

- Respuesta A: HTTP 201, solicitud creada.
- Respuesta B: HTTP 200, `duplicate: true`, mismo `requestId`.
- Neon: una cabecera, un ítem, `request_scope = tenant`, `tenant_id = tenant-ba`.
- Se eliminaron únicamente los registros temporales de QA.
- Conteos restaurados: 18 solicitudes, 32 ítems, 3 Media Kits, 0 líneas de Media Kit; 0 filas de prueba.

El formulario conserva la clave entre reintentos y genera una nueva si cambia el payload.

## Decisiones de tenancy

- El único administrador existente es global y opera ambos tenants. No se crean usuarios ni invitaciones.
- El catálogo público es global; solo incluye soportes asignados, activos y elegibles.
- `tenant_id` es ownership/partición operativa y comercial, no una frontera de autorización entre usuarios en este PMV.
- El rol runtime Preview es `neondb_owner` con `rolbypassrls = true`; RLS no es una protección efectiva ni se declara activo. Se difiere hasta incorporar usuarios tenant-scoped y un rol DB sin BYPASSRLS.
- Los 18 soportes y 2 ítems pendientes se conservan; no se eliminan ni atribuyen por inferencia.

## Implementación incorporada

- Catálogo y detalle públicos excluyen soportes sin tenant.
- Solicitudes nuevas revalidan ownership/disponibilidad dentro de la transacción y guardan tenant por ítem; solicitudes mixtas conciliadas se registran como globales.
- El avance comercial se bloquea si una solicitud tiene ítems sin ownership.
- Media Kits derivan tenant desde los soportes; kits mixtos quedan globales y cada línea guarda tenant.
- El runtime verifica columnas de Media Kit y falla cerrado si falta una migración; no ejecuta DDL desde requests.
- Ambos constructores permiten solo 7 días, 15 días, 21 días o mensual. Backend impide marcar listo/enviado sin duración estándar.
- Solicitudes con ownership pendiente aparecen en cuarentena y no permiten avanzar desde la UI.
- Login limiter distribuido utiliza upsert atómico y HMAC SHA-256; tabla y constraints verificados en Preview.
- Solicitudes públicas son idempotentes también bajo concurrencia; la prueba temporal no dejó datos residuales.

## Bloqueantes restantes

1. **QA autenticada end-to-end:** falta validar con una sesión autorizada la creación/recuperación de Media Kit, persistencia tenant por línea, estados y exportaciones PDF/PPT. No se solicitó ni utilizó la contraseña real del administrador.
2. **Privacidad de exportación:** verificar con sesión real que PDF/PPT/HTML/descarga no revelen costos o precios unitarios internos; solo puede incluirse el importe comercial global aprobado.
3. **R2 (lectura privada implementada y probada):** el adaptador genera GET SigV4 de hasta 10 minutos (por defecto 5), las nuevas cargas persisten `/api/media/:id` y el endpoint resuelve únicamente filas activas de soportes activos con tenant asignado y `storage_key` confinada al canonical ID, redirigiendo a la URL temporal. El mapeo del catálogo también reescribe referencias históricas con `storage_key` hacia `/api/media/:id`. Un objeto real del bucket respondió por GET firmado y rechazó GET anónimo; no se modificaron policies ni secrets. Falta probar PUT/DELETE con una sesión administrativa autorizada y revisar/migrar referencias heredadas sin `storage_key`. Los registros históricos de `support_media` con `storage_key` quedan servidos por el endpoint privado; las URLs heredadas sin `storage_key` requieren inventario y migración controlada. No se modificó la policy del bucket ni secrets.
4. **Accesibilidad:** completar revisión manual de teclado, foco, contraste y lectores de pantalla.
5. **ESLint independiente:** no existe configuración; TypeScript sí pasa.
6. **CSRF/API security:** protección por Origin y tests unitarios añadidos; QA HTTP negativa parcial completada (403 origen no permitido, 403 cookie sin Origin, 401 sin token y 401 cookie inválida). Falta cubrir todos los handlers y ejecutar pruebas IDOR específicas; esto no equivale a un pentest completo.
7. **Acceso QA admin:** el responsable autorizó el acceso QA. Se creó share link oficial y se pudo ejecutar QA HTTP pública. Los endpoints admin responden 401 sin sesión. Falta una sesión QA administrativa válida para flujos autenticados; no se desactivó la protección ni se intentó bypass.

HubSpot, Resend/email transaccional, WhatsApp API y Google Drive/Slides no se declaran integraciones del PMV base; requieren decisión/contrato y credenciales del cliente.

## Release gate

**NO-GO para merge** mientras no se cierre la QA autenticada de Media Kit, privacidad de exportaciones y R2 con evidencia en el SHA final. No se modificó `main`, Neon Production ni se enviaron comunicaciones reales. Merge y promoción a Production siguen reservados al HUMAN GATE.


## Decisiones y seguimiento (2026-11-02)

- Responsable autorizó el acceso QA administrativo, definió R2 como privado y autorizó abrir PR.
- PR Draft #90: https://github.com/popnegro/grupo-comunicarte-refactoring/pull/90. Base `main`; no mergeado.
- SHA `3118b333`: CI PASS; CI Candidate PASS; Vercel Preview READY (`dpl_C4oSeMa4iH1ghNiMaaQpKiBJgt1J`). Visual QA CI: 27 passed, 2 skipped, 1 failed: snapshot `inventory-map-responsive.png` en Chromium mobile, altura observada 561 px frente a 565 px del baseline (diff 7–8%). La imagen inspeccionada conserva el mismo mapa y marcadores; la diferencia es un recorte vertical de 4 px. No se regeneró el snapshot.
- Local en el mismo contenido publicado: `npm run lint` PASS; `npm run test:unit` PASS (45/45); `npm run build` PASS; `git diff --check` PASS.
- QA HTTP del Preview mediante share link autorizado: `/api/health` 200 y DB connected; `/api/supports` 200 con URLs `/api/media/:id`; `/api/admin/stats` y `/api/admin/mediakits` 401 sin sesión; PATCH con Origin no permitido 403; PATCH sin token con Origin permitido 401; cookie sin Origin 403; cookie inválida con Origin permitido 401. ID de media inexistente 404.
- R2 real: `/api/media/74` respondió 302 con GET SigV4 y, siguiendo la redirección, descargó un WebP real (200, 724166 bytes, 1920×1280). El GET directo al mismo objeto sin firma fue rechazado por R2 (400, `InvalidArgument/Authorization`), evidencia de que no es accesible anónimamente. No se ejecutó PUT/DELETE de prueba ni se cambió policy/secrets.
