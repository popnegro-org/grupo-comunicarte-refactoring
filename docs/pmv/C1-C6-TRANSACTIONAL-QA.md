# Matriz transaccional C1–C6 — Neon QA

**Rama:** `pmv-validation-candidate`  
**SHA de código/tests validado:** `69acbcae6bbc396c316bdfb1101c683e70dc0dd7`  
**Workflow E2E:** [CI Candidate #43092055405](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43092055405)  
**Resultado:** 12/12 PASS, 0 fallos, 0 flaky, 1.7 min.  
**Base:** Neon QA `qa/pr96-ownership-20261105` (`br-bold-block-aua43ua0`).  
**Entorno:** Render QA. No se usó Neon Production ni se promovió Production.

## Resultado consolidado

| Caso | Prueba transaccional | Verificación persistida en Neon QA | Resultado |
|---|---|---|---|
| C1 — ownership coincidente | PATCH a `quoted` → HTTP 200; restauración a `pending` → HTTP 200 | Solicitud estable terminó `pending`; `updated_at=2026-11-11T20:01:07.725Z` confirma mutación y restauración | PASS |
| C2 — ownership drift | Inserción con `support_id=bue-trad-05` (tenant real `tenant-ba`) y `tenant_id=tenant-default` | FK compuesta rechazó la inserción; `drift_probe_rows=0` | PASS |
| C3 — ownership NULL | PATCH a `enviado` → HTTP 409 | Solicitud `REQ-2026-00000000-0000-4000-8000-000000000003` sigue `pending`; `updated_at=2026-11-11T18:40:18.336Z` sin cambio | PASS |
| C4 — solicitud sin ítems | PATCH a `closed` → HTTP 409 | Solicitud `REQ-2026-00000000-0000-4000-8000-000000000004` sigue `pending`; `updated_at=2026-11-11T18:37:46.996Z` sin cambio | PASS |
| C5 — soporte huérfano | Inserción con `support_id=qa-support-orphan-c5-does-not-exist` | FK de soporte rechazó la inserción; `orphan_probe_rows=0` | PASS |
| C6 — concurrencia | Dos PATCH simultáneos a la misma solicitud; respuestas limitadas a 200/409, al menos una 200, estados devueltos `quoted`/`closed`; restauración a `pending` | La fila compartida terminó `pending` después de la restauración; no quedó estado parcial ni datos de prueba persistidos | PASS |

## Evidencia de integridad referencial — Neon QA

Se ejecutó un bloque `DO` con subtransacciones y manejo explícito de `foreign_key_violation` para C2 y C5. El bloque falla deliberadamente si cualquiera de las inserciones inválidas es aceptada. Terminó correctamente.

Consulta posterior:
- `drift_probe_rows = 0`
- `orphan_probe_rows = 0`

Las cuatro FK de `mediakit_request_items` están validadas (`convalidated=true`), incluyendo:
- `mediakit_request_items_support_tenant_fkey`: `(support_id, tenant_id) → supports(canonical_id, tenant_id)`, `ON UPDATE RESTRICT ON DELETE RESTRICT`.
- `fk_mediakit_request_items_support`: `support_id → supports(canonical_id)`, `ON DELETE CASCADE`.

El soporte de prueba `bue-trad-05` conserva `tenant-ba`. No se deshabilitaron constraints, no se ejecutó DDL y no se fabricaron filas huérfanas.

## Guards de dominio

En `tests/unit/tenant-access.test.ts`:
- C2: `areRequestItemOwnershipsConsistent` rechaza `itemTenantId !== supportTenantId`.
- C5: la ausencia del soporte se representa como `supportTenantId=null`; el guard rechaza la línea.
- La suite cubre también ownership NULL, solicitud sin líneas y ownership coincidente.

## Corrección de la navegación del Media Kit

La ejecución anterior detectó que el cierre del panel comercial desde el handler del enlace competía con la navegación SPA y dejaba el inventario renderizado bajo la URL de contacto. Se corrigió el ciclo:
- El CTA de propuesta usa navegación nativa (`href`) para evitar la intermitencia del handler SPA dentro del portal.
- La selección se persiste en `localStorage` antes de navegar; el E2E espera explícitamente el registro de un soporte.
- `Navbar` cierra el panel cuando cambia `location.pathname` en las rutas SPA.
- Las páginas públicas comparten un layout de rutas anidadas en el router principal.
- El test valida la ruta de contacto, el título y la selección conservada tras la navegación completa.

La captura `mediakit-contact.png` del artifact final muestra:
- Ruta de contacto cargada.
- Título `Tu selección, lista para avanzar.`.
- Un soporte seleccionado y el aviso `No perdés tu selección`.
- Formulario visible sin enviar una solicitud real.

## CI y artifacts del SHA validado

| Validación | Run | Resultado |
|---|---:|---|
| CI | [43092055556](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43092055556) | PASS — lint, typecheck, 107/107 unit tests, build |
| CI Candidate | [43092055405](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43092055405) | PASS — validate, QA Deployment E2E 12/12; Authenticated Preview Smoke omitido por commit test-only |
| Visual QA | [43092055343](https://github.com/popnegro-org/grupo-comunicarte-refactoring/actions/runs/43092055343) | PASS técnico — baseline faltante bootstrap; no hubo comparación contra baseline previamente revisado |

Artifact QA E2E: `qa-deployment-e2e-evidence`, ID `13889651667`, SHA-256 `4fa66dc47443b2e82638f4c622321dd242b26ebf8486e51ad5b75f7e1f7a169d`.

## Limpieza y límites

El fixture `KIT-QA-EXPORT-C4A280BC3D34` terminó en `draft`, con `metadata.exports={}`. La solicitud estable terminó `pending`. Los objetos PDF/PPTX de la prueba se eliminaron mediante el endpoint de QA. Los fixtures documentales siguen siendo sintéticos (PDF de 81 bytes y PPTX de 8 bytes): el test acredita almacenamiento, recuperación y auditoría, no la calidad final de documentos comerciales.

## Cierre C1–C6

**C1–C6: PASS en Neon QA y Render QA sobre el SHA indicado.** La matriz transaccional solicitada queda cerrada.

Esto no constituye aprobación visual humana ni autorización de merge. PR #90 permanece abierto; `main`, Neon Production y Vercel Production no fueron modificados. Merge y promoción continúan bajo HUMAN GATE.
