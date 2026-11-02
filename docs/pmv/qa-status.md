# PMV — cierre consolidado

**Rama candidata:** `pmv-validation-candidate`  
**SHA de código validado:** `3ec2e407dcff0a72df1b700d65c90f93186e0fc6`  
**PR de integración:** [#90 — PMV: validación de seguridad y cierre de QA](https://github.com/popnegro/grupo-comunicarte-refactoring/pull/90)  
**Preview QA actual:** [deployment aislado](https://grupo-comunicarte-refactoring-d1xfuujv3-popnegros-projects.vercel.app) — `dpl_AFgKNGDWzr4TpKDBDmve5e4GyRo1`, READY, SHA de código coincidente.  
**Main / Production / Neon Production:** sin cambios.

## Decisión de alcance

Se consolida el cierre en tres bloques, sin fases adicionales:

1. **Integración y calidad automática.**
2. **Validación funcional y seguridad.**
3. **Cierre de release y aprobación humana.**

No se agregan funcionalidades posteriores al PMV (SEO/GEO, nuevos módulos o integraciones externas) a este cierre.

## 1. Integración y calidad automática — PASS

Evidencia del SHA de código `3ec2e407`:

| Control | Resultado |
|---|---|
| CI | PASS — run [41475409170](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41475409170) |
| CI Candidate | PASS — run [41475409083](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41475409083) |
| TypeScript | PASS — `tsc --noEmit` |
| Unit tests | PASS — 45/45 |
| Build | PASS |
| Auditoría de dependencias de producción | PASS — 0 vulnerabilidades reportadas |
| Visual QA CI | PASS — run [41475409136](https://github.com/popnegro/grupo-comunicarte-refactoring/actions/runs/41475409136), 28 aprobadas / 2 omitidas |
| Vercel Preview | READY — deployment QA actual, SHA de código coincidente |

Repetición local en caja efímera sobre el mismo SHA:
- `npm ci`: PASS, 0 vulnerabilidades reportadas.
- `npm run lint`: PASS (el script ejecuta TypeScript, no ESLint).
- `npm run test:unit`: PASS, 45/45.
- `npm run build`: PASS.
- `git diff --check`: PASS; árbol de trabajo limpio.

La repetición local de Playwright no puede certificar regresión visual: el checkout no contiene snapshots de referencia. El intento local produjo 22 pruebas aprobadas y 6 fallos de comparación exclusivamente por snapshots ausentes; se descartaron los snapshots generados automáticamente. La evidencia visual válida para el candidato es el workflow CI PASS con baseline confiable; no se creó ni aceptó un baseline nuevo.

## 2. Validación funcional y seguridad — PARCIAL

### Preview público y API — PASS

Verificado en el deployment QA actual:
- Home, inventario y contacto cargan en navegador.
- `GET /api/health`: HTTP 200, `database=connected`.
- `GET /api/supports`: HTTP 200, 28 soportes.
- `GET /api/admin/stats`, `/api/admin/requests`, `/api/admin/support-pricing` y `/api/admin/mediakits` sin sesión: HTTP 401.
- `POST /api/admin/login` desde origen no permitido: HTTP 403.
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

El nuevo deployment se creó después de la rotación y quedó READY. Sin embargo, los controles de seguridad de la plataforma bloquearon la ejecución de la automatización que debía transferir la credencial al navegador de prueba. Por ese motivo no se afirma que el login del nuevo deployment ni el flujo autenticado hayan pasado. El mensaje previo del responsable (“Login done”) corresponde a una prueba manual anterior, no a esta nueva rotación.

### Pendientes que impiden declarar el cierre funcional completo

| Control | Estado | Alcance |
|---|---|---|
| Login automatizado con la nueva credencial | BLOQUEADO | La ejecución automatizada fue bloqueada por controles de seguridad de la plataforma |
| Media Kit autenticado end-to-end | PENDIENTE | Crear, persistir, recuperar y comprobar líneas/tenant en Preview |
| Privacidad PDF/PPTX/HTML | PENDIENTE | Verificar archivos descargados con sesión real y confirmar ausencia de tarifas internas |
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
