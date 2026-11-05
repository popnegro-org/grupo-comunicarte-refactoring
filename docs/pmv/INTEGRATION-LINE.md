# Línea de integración PMV (mejora prioritaria 4)

**Única base de integración:** `pmv-validation-candidate`  
**Trabajo P0 ownership/cuarentena actual:** `pmv/p0-ownership-quarantine-gate` → PR hacia la candidata  
**Prohibido como destino de merge autónomo:** `main`, Production

## Qué entra

1. Hardening ownership/cuarentena (esta rama / PR #96 ampliado).
2. CORS same-origin Preview (#92) cuando el SHA esté verde y no esté ya en la candidata.
3. Asociación Media Kit por `source_request_id` (#95, ya merged en candidata).
4. Cherry-picks UX **selectivos** solo con diff revisado (shell, drawer, no stacks completos).

## Qué no entra como bloque

| Rama / PR | Motivo |
|-----------|--------|
| `canonical-refinement` / #89 | 235+ commits exclusivos; referencia UX, no candidata |
| #85–#88 | Apilados y divergentes; no merge individual |
| `feat/dashboard-*`, `feat/uxui-pmv*`, `uxui/paralelo-prod*` | Históricas; requieren split |

## Procedimiento

1. Rebase de la rama de trabajo sobre `origin/pmv-validation-candidate`.
2. CI Candidate + unit + build + Visual QA en el SHA.
3. QA Preview según `QA-OWNERSHIP-REVALIDATION-PREVIEW.md` y `HUMAN_GATE_VALIDATION.md`.
4. Merge **solo** a `pmv-validation-candidate` tras evidencia.
5. Promoción a `main` = HUMAN GATE explícito.

## Freeze operativo

Si `pmv-validation-candidate` figura congelada documentalmente, no empujar commits directos a esa rama: abrir PR desde `pmv/p0-ownership-quarantine-gate` (u otra rama de trabajo) y esperar decisión humana de reanudación.
