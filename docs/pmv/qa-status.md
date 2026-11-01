# PMV candidate — estado de QA y bloqueantes

**Branch:** `pmv-validation-candidate`  
**Último commit de documentación verificado:** `fb21535528bd0b7bcdfaf357779c0d145d3e18cc`  
**Último commit de código desplegado y validado:** `606138d52abd3d1e88c45820b3c5307bf7a5ddaa`  
**Código desplegado:** `606138d52abd3d1e88c45820b3c5307bf7a5ddaa`  
**Preview:** [Deployment READY](https://grupo-comunicarte-refactoring-2rzgv1sm9-popnegros-projects.vercel.app)  
**Deployment:** `dpl_44gREfFKbMJDgKAAhKaV8tLPwSPy`  
**Main / Production:** sin cambios.

## Verificación automatizada

| Control | Resultado | Evidencia |
|---|---|---|
| TypeScript (`npm run lint`) | PASS | CI Candidate [41364138488](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41364138488) |
| Unit tests | PASS — 35/35 | CI Candidate |
| Build | PASS | CI Candidate |
| Auditoría de dependencias Production | PASS — 0 vulnerabilidades | CI Candidate |
| Playwright / Visual QA | PASS — 28 passed, 2 skipped | Visual QA [41364138523](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41364138523) |
| Baseline visual | PASS | comparación contra baseline confiable del branch candidato |
| Vercel Preview / Neon | PASS | deployment READY; `/api/health` database connected |

Los dos skips son intencionales: los snapshots de inventario desktop y mobile se ejecutan solo en su proyecto correspondiente. No se contabilizan como tests fallidos.

`npm run lint` ejecuta `tsc --noEmit`; ESLint independiente no está configurado.

## Fuente y conciliación de inventario

Fuente primaria: PDFs de `docs/inventario/source/`; matriz en [TENANT-OWNERSHIP-MAPPING.md](../inventario/processed/TENANT-OWNERSHIP-MAPPING.md).

- 28 soportes conciliados: 10 `tenant-ba`, 18 `tenant-default`.
- 18 soportes sin evidencia permanecen `tenant_id = NULL`: 17 inactivos y 1 activo (`mza-trad-16`). No se inventó ownership.
- 30/32 ítems históricos de solicitudes tienen tenant; 2 siguen pendientes.
- 18 cabeceras históricas: 2 globales, 14 tenant y 2 sin scope. Una de las cabeceras sin scope contiene ítems de ambos tenants y un ítem pendiente; no debe reclasificarse automáticamente.
- Neon Preview: `mediakit_items.tenant_id` tiene FK e índice; la tabla tenía 0 líneas al aplicar la migración.
- Neon Preview: `admin_login_attempts` existe con PK `ip_hash`, CHECK `attempt_count >= 1` e índice `updated_at`.

## Smoke tests de Preview

Ejecutados contra el deployment READY `606138d`:

| Prueba | Resultado |
|---|---|
| `GET /api/health` | HTTP 200; database connected |
| `GET /api/supports` | HTTP 200; 28 soportes |
| Precio interno en DTO público | No expuesto |
| `tenant_id` en DTO público | No expuesto |
| `GET /api/supports/mza-trad-16` | HTTP 404 |
| Solicitud pública con `mza-trad-16` | HTTP 404; no insertó solicitud |
| `GET /api/admin/stats` sin sesión | HTTP 401 |
| `GET /api/admin/mediakits` sin sesión | HTTP 401 |
| `GET /api/admin/support-pricing` sin sesión | HTTP 401 |
| Login con credenciales ficticias | HTTP 401, no 503; limiter operativo |

Después de las pruebas, los conteos permanecieron: 18 solicitudes, 32 ítems, 3 Media Kits y 0 líneas de Media Kit. El intento ficticio de login se guardó como digest HMAC SHA-256 de 64 caracteres; no se guardó IP en claro.

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
- Ambos constructores permiten solo 7 días, 15 días, 21 días o mensual. El backend impide marcar listo/enviado sin duración estándar.
- Solicitudes con ownership pendiente aparecen en cuarentena y no permiten avanzar desde la UI.
- Login limiter distribuido utiliza upsert atómico y HMAC SHA-256; tabla y constraints verificados en Preview.

## Bloqueantes restantes

1. **QA autenticada end-to-end:** no se utilizó ni se solicitó la contraseña real del administrador. Falta probar con sesión autorizada la creación/recuperación de Media Kit, persistencia tenant por línea, estados y exportaciones PDF/PPT.
2. **Privacidad de exportación:** verificar con sesión real que ningún PDF/PPT/HTML/descarga revela costos o precios unitarios internos; solo puede incluirse el importe comercial global aprobado.
3. **R2:** completar upload, lectura autorizada, URL firmada, expiración y recuperación con archivo real.
4. **Idempotencia:** falta prueba de reintento/concurrencia de solicitudes y prevención de duplicados por reenvío.
5. **Accesibilidad:** completar revisión manual de teclado, foco, contraste y lectores de pantalla.
6. **ESLint independiente:** no existe configuración; TypeScript sí pasa.

HubSpot, Resend/email transaccional, WhatsApp API y Google Drive/Slides no se declaran integraciones del PMV base; requieren decisión/contrato y credenciales del cliente.

## Release gate

**NO-GO para merge** mientras no se cierre la QA autenticada de Media Kit, privacidad de exportaciones, R2 e idempotencia con evidencia en el SHA final. No se modificó `main`, Neon Production ni se enviaron comunicaciones reales. Merge y promoción a Production siguen reservados al HUMAN GATE.
