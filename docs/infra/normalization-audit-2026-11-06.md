# Auditoría de normalización — estado verificado al 2026-11-06

**Repositorio:** `popnegro-org/grupo-comunicarte-refactoring`  
**Rama candidata:** `pmv-validation-candidate`  
**HEAD auditado:** `26cd907556466d91772cc47a41f6a66261b9e69a`  
**Main:** `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70` (sin cambios)  
**PR de consolidación:** [#90](https://github.com/popnegro-org/grupo-comunicarte-refactoring/pull/90), Draft, base `main`

Este informe actualiza el diagnóstico histórico del 05-11. Cuando existan diferencias, este documento es la referencia más reciente.

## 1. GitHub y CI

- El repositorio pertenece a la organización `popnegro-org`.
- La candidata se mantiene separada de `main`; no hubo merge.
- Se añadieron a la candidata la guía de integraciones, la referencia de variables faltantes en `.env.example` y el enlace desde el README.
- Validación local en entorno limpio:
  - `npm ci`: PASS.
  - Paridad de dependencias raíz `package.json` ↔ `package-lock.json`: PASS (22 dependencias y 10 devDependencies).
  - TypeScript/lint: PASS.
  - Unit tests: 59/59 PASS.
  - Build: PASS.
  - `npm audit --audit-level=high`: 0 vulnerabilidades.
- GitHub Actions sobre el HEAD actual:
  - CI push #42162430088: PASS.
  - CI Candidate push #42162429916: PASS.
  - Visual QA push #42162429849: PASS.
  - CI PR #42162435234: PASS.
  - CI Candidate PR #42162435250: PASS.
  - Visual QA PR #42162435333: PASS.
- Visual QA PR restauró el baseline existente, no ejecutó bootstrap, ejecutó regresión visual y terminó en PASS. No se aprobaron snapshots nuevos.
- La ejecución visual local desde un clon limpio no tenía los snapshots de referencia: 22 PASS, 6 fallos por ausencia de snapshots y 2 omitidos. No se usó esa ejecución para reemplazar baselines; el resultado de referencia es Visual QA de GitHub Actions.

## 2. Vercel

- Se creó un Preview desde el proyecto existente, con fuente GitHub canónica y SHA exacto `26cd907`.
- Deployment: `dpl_6VPdhRKY1AhK5N6KNmftfnBSTKBt`.
- URL: https://grupo-comunicarte-refactoring-1bxxizph1-popnegros-projects.vercel.app
- Estado: READY.
- Smoke HTTP verificado:
  - `/`: HTTP 200.
  - `/api/health`: HTTP 200, `{"status":"ok","database":"connected"}`.
  - Respuestas marcadas `noindex`.
- La metadata de este deployment identifica `popnegro-org`. El contexto Git del proyecto aún conserva la referencia histórica `popnegro`; la discrepancia no está normalizada.
- No se modificó la conexión Git del proyecto, la rama Production, los aliases de dominio ni el deployment Production.

## 3. Render

- Se aisló la variable `DATABASE_URL` del servicio QA hacia la rama Neon `qa/pr96-ownership-20261105`; el deploy correspondiente completó build y deploy, y los logs registraron bootstrap de tablas y servicio live.
- El servicio QA continúa desplegando código desde `pmv-production-refinement`, no desde `pmv-validation-candidate`. El commit reportado para ese runtime sigue siendo `867188d`.
- El servicio Render principal no se modificó.
- No se cambió la rama Git del servicio QA porque el conector disponible no expone una operación segura de cambio de rama.
- Los logs del runtime antiguo reportaron 6 vulnerabilidades (1 moderada, 4 altas, 1 crítica). No atribuir ese resultado a la candidata actual: la candidata pasa `npm ci` y `npm audit` sin vulnerabilidades. Repetir auditoría cuando Render QA ejecute el commit candidato.

## 4. Neon

- `main` continúa `ready`, primary/default y `protected=false`.
- La activación de protección fue rechazada por el límite de ramas protegidas del plan actual. No se desprotegió ninguna rama ni se cambió el plan.
- La rama QA `qa/pr96-ownership-20261105` está creada y es el destino de la conexión QA aislada.
- No se ejecutaron migraciones ni escrituras sobre Neon Production.
- No eliminar ramas históricas. La eliminación de una rama Neon requiere autorización específica para la rama exacta y comprobación de dependencias.

## 5. Cloudflare

Configuración verificada después del endurecimiento:

| Ajuste | Estado |
|---|---|
| Minimum TLS | `1.2` |
| Always Use HTTPS | `on` |
| SSL mode | `full` |
| TLS 1.3 | `on` |
| DNS apex y www | DNS-only |
| DNS media/R2 | Proxied |

- No se modificaron registros DNS, MX, SPF, DKIM, DMARC, Amelu ni SMTP2GO.
- Al ser apex y `www` DNS-only, no atraviesan el proxy/WAF de Cloudflare. Los ajustes de zona aplican al tráfico proxied, incluido `media`.
- No se confirmó un entrypoint WAF activo; no se habilitaron reglas ni se cambió proxy.

## 6. Preparación para nuevas integraciones

- Guía técnica: [docs/integrations/README.md](../integrations/README.md).
- `.env.example` incluye `JWT_SECRET` y `CORS_ORIGINS`, ausentes en la plantilla anterior.
- Se documentaron contratos para adaptadores, outbox, idempotencia, retries, webhooks, seguridad tenant, secretos y QA.
- HubSpot no aparece implementado en el código auditado. No crear Deals ni activar escrituras hasta definir portal, pipeline, etapa, owner, deduplicación, precedencia de campos e identidad administrativa.
- El principal administrativo compartido actual se resuelve como `global_admin`; no identifica a una persona. Las actividades atribuidas por usuario requieren identidad individual persistente.
- Los tests actuales verifican que `monthly_impacts` se preserva como dato editorial/manual y llega a los hechos de la card cuando está presente.

## 7. Bloqueos y gates

1. **Vercel:** re-vincular el proyecto al repositorio canónico requiere HUMAN GATE por su efecto sobre futuros deployments.
2. **Render QA:** alinear la rama de código con la candidata y volver a ejecutar auditoría/QA; no cambiar el servicio principal.
3. **Neon:** la protección de `main` está limitada por el plan; requiere decisión sobre upgrade o control compensatorio externo.
4. **Neon cleanup:** no eliminar ramas históricas sin autorización específica.
5. **HubSpot/otros proveedores:** no habilitar escrituras reales hasta completar decisiones de identidad, ownership, mapping e idempotencia.
6. **Release:** PR #90 permanece Draft. No merge a `main`, no promoción Production y no migraciones productivas.

**Resultado:** repositorio preparado documentalmente y con CI/QA verde para comenzar integraciones en la rama candidata. La normalización integral de infraestructura todavía es parcial por los bloqueos enumerados.
