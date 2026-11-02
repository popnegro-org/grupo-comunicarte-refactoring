# PMV — cierre consolidado

**Rama candidata:** `pmv-validation-candidate`  
**HEAD documental:** `b3a9963375312709aa53d8b313ee3228e2707270`  
**SHA de código validado:** `3ec2e407dcff0a72df1b700d65c90f93186e0fc6`  
**PR de integración:** [#90 — PMV: validación de seguridad y cierre de QA](https://github.com/popnegro/grupo-comunicarte-refactoring/pull/90)  
**Preview de código:** [abrir entorno candidato](https://grupo-comunicarte-refactoring-mje3iogvr-popnegros-projects.vercel.app)  
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
| Vercel Preview | READY — deployment del mismo SHA de código |

Repetición local en caja efímera sobre el mismo SHA:
- `npm ci`: PASS, 0 vulnerabilidades reportadas.
- `npm run lint`: PASS (el script ejecuta TypeScript, no ESLint).
- `npm run test:unit`: PASS, 45/45.
- `npm run build`: PASS.
- `git diff --check`: PASS; árbol de trabajo limpio.

La repetición local de Playwright no puede certificar regresión visual: el checkout no contiene snapshots de referencia. El intento local produjo 22 pruebas aprobadas y 6 fallos de comparación exclusivamente por snapshots ausentes; se descartaron los snapshots generados automáticamente. La evidencia visual válida para el candidato es el workflow CI PASS con baseline confiable; no se creó ni aceptó un baseline nuevo.

## 2. Validación funcional y seguridad — PARCIAL

### Preview público y API — PASS

Verificado en el deployment del SHA `3ec2e407`:
- Home, inventario y contacto cargan en navegador.
- `GET /api/health`: HTTP 200, `database=connected`.
- `GET /api/supports`: HTTP 200, 28 soportes.
- `GET /api/admin/stats` sin sesión: HTTP 401.
- `/dashboard` sin sesión redirige a `/login`.
- El responsable confirmó manualmente: **“Login done”**.

### Seguridad HTTP y medios privados — PASS en los casos ejecutados

Evidencia registrada en el PR:
- Origen no permitido: 403.
- Cookie sin Origin: 403.
- Cookie inválida con Origin permitido: 401.
- Medio inexistente: 404.
- Medio privado real: endpoint devuelve 302 a GET SigV4; descarga firmada 200.
- GET anónimo directo al objeto R2 rechazado por R2.
- El catálogo público no expone `storage_key` ni URLs directas del bucket.
- No se modificaron policies ni secretos de R2.

### Pendientes que impiden declarar el cierre funcional completo

| Control | Estado | Alcance |
|---|---|---|
| Media Kit autenticado end-to-end | PENDIENTE | Crear, persistir, recuperar y comprobar líneas/tenant en Preview |
| Privacidad PDF/PPTX/HTML | PENDIENTE | Verificar archivos descargados con sesión real y confirmar ausencia de tarifas internas |
| IDOR y handlers administrativos | PENDIENTE | Cobertura negativa de recursos y rutas de recuperación |
| R2 PUT/DELETE | PENDIENTE | Prueba controlada con sesión QA autorizada |
| Medios heredados sin `storage_key` | PENDIENTE | Inventario y plan de migración; no ejecutar backfill destructivo |
| Accesibilidad manual | PENDIENTE | Teclado, foco, contraste y lector de pantalla |
| ESLint independiente | DIFERIDO | No está configurado; TypeScript sí está validado |

La cuenta QA administrativa es exclusiva de Preview y de `pmv-validation-candidate`. El agente no obtiene ni reutiliza el secreto; el login manual ya fue confirmado por el responsable. No se desactivó Deployment Protection.

## 3. Cierre de release — BLOQUEADO POR VALIDACIÓN FUNCIONAL Y HUMAN GATE

**Estado: NO-GO para merge / Production.** El código candidato compila y supera CI, pero no se declara PMV cerrado para release hasta completar la validación funcional autenticada y de seguridad listada arriba.

El PMV no requiere multiusuario tenant-scoped: el alcance actual conserva un administrador global. `tenant_id` organiza ownership/operación comercial; no se declara RLS como frontera de autorización. El runtime Preview se verificó históricamente con `neondb_owner` y `BYPASSRLS=true`; RLS queda fuera del alcance de este PMV y deberá rediseñarse si se incorpora aislamiento de usuarios por tenant.

### HUMAN GATE obligatorio

- Aprobar explícitamente el merge del PR #90 a `main`.
- Aprobar explícitamente la promoción a Production.
- Cualquier migración/backfill o cambio destructivo requiere autorización independiente.

No se ejecutaron estas acciones. No se modificó `main`, Production ni Neon Production; no se enviaron comunicaciones reales.
