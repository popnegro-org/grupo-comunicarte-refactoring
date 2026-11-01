# PMV candidate — estado de QA y bloqueantes

**Branch:** `pmv-validation-candidate`  
**Último commit de código validado:** `2c7b3dfe9e7f0d91795ad03184b5460cd4b17a77`  
**Preview:** [Deployment READY](https://grupo-comunicarte-refactoring-gc2mo97sk-popnegros-projects.vercel.app)  
**Vercel:** `dpl_3CdMyV8AiiNZAkRTiEFLQx9wAZyd`  
**Main / Production:** sin cambios.

## Verificación automatizada

| Control | Resultado | Evidencia |
|---|---|---|
| TypeScript (`npm run lint`) | PASS | CI Candidate [41364467867](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41364467867) |
| Unit tests | PASS — 38/38 | CI Candidate |
| Build | PASS | CI Candidate |
| Auditoría de dependencias Production | PASS — 0 vulnerabilidades | CI Candidate |
| Playwright / Visual QA | PASS — 28 passed, 2 skipped | Visual QA [41364467858](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41364467858) |
| Baseline visual | PASS | comparación contra baseline confiable del candidato |
| Vercel Preview / Neon | PASS | deployment READY; `/api/health` database connected |

Los dos skips son intencionales: los snapshots de inventario desktop y mobile se ejecutan solo en su proyecto correspondiente. No se contabilizan como tests fallidos.

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
3. **R2:** completar upload, lectura autorizada, URL firmada, expiración y recuperación con archivo real.
4. **Accesibilidad:** completar revisión manual de teclado, foco, contraste y lectores de pantalla.
5. **ESLint independiente:** no existe configuración; TypeScript sí pasa.

HubSpot, Resend/email transaccional, WhatsApp API y Google Drive/Slides no se declaran integraciones del PMV base; requieren decisión/contrato y credenciales del cliente.

## Release gate

**NO-GO para merge** mientras no se cierre la QA autenticada de Media Kit, privacidad de exportaciones y R2 con evidencia en el SHA final. No se modificó `main`, Neon Production ni se enviaron comunicaciones reales. Merge y promoción a Production siguen reservados al HUMAN GATE.
