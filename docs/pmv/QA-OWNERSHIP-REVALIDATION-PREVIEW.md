# QA Preview — revalidación de ownership en solicitudes (PR #96)

**Objetivo:** cerrar la mejora prioritaria 1 sin tocar Production.  
**Entorno:** Neon Preview + Vercel Preview del SHA de `pmv/p0-ownership-quarantine-gate` o de `fix/request-ownership-revalidation` rebased.  
**Prohibido:** DDL/DML en Neon Production; merge a `main`.

## Precondiciones

1. Preview Vercel READY del SHA bajo prueba.
2. `GET /api/health` → `database: connected`.
3. Credenciales admin QA solo de Preview.
4. Inventario Preview con al menos:
   - 1 soporte asignado `tenant-ba` o `tenant-default`, activo y `disponible`
   - 1 soporte con `tenant_id` NULL (cuarentena) si existe (`mza-trad-16` u otro documentado)
5. Unit tests del SHA en verde: `areRequestItemOwnershipsConsistent`, `areLockedSupportsCommerciallyEligible`.

## Matriz ejecutable

### A. Catálogo (cuarentena)

```http
GET /api/supports
GET /api/supports/{canonical_id_pendiente}
```

- Esperado: listado sin pendientes; detalle pendiente → 404.

### B. Alta de solicitud

```http
POST /api/mediakit/request
Content-Type: application/json

{
  "lead": { "name": "QA Ownership", "email": "qa-ownership@example.com" },
  "selectedIds": ["{canonical_id_asignado}"]
}
```

- Asignado + disponible → 201 con `requestId`.
- Incluir id pendiente o inexistente → 4xx; no nueva fila en `mediakit_requests` para el intento inválido.

### C. Avance comercial (núcleo PR #96)

Autenticado admin (cookie/Bearer Preview):

```http
PATCH /api/admin/requests/{requestId}
{ "status": "quoted" }
```

(o el endpoint equivalente expuesto por el dashboard para `updateRequestStatusByAdmin`)

| # | Setup Preview | Status pedido | Esperado |
|---|---------------|---------------|----------|
| C1 | Ítems y soportes con mismo `tenant_id` | `quoted` | OK; status=`quoted` |
| C2 | Ítem `tenant_id` ≠ `supports.tenant_id` (drift forzado solo en Preview) | `quoted` | Error; status previo intacto |
| C3 | Soporte o ítem con `tenant_id` NULL | `enviado` | Error; status intacto |
| C4 | Solicitud sin ítems | `closed` | Error |
| C5 | `support_id` huérfano | `quoted` | Error |
| C6 | Dos PATCH concurrentes C1 | — | Una OK; sin status parcial |

Verificación SQL Preview (solo lectura / rollback de datos QA):

```sql
SELECT request_id, status FROM mediakit_requests WHERE request_id = $1;
SELECT support_id, tenant_id FROM mediakit_request_items WHERE request_id = $1;
SELECT canonical_id, tenant_id FROM supports WHERE canonical_id = ANY($2::text[]);
```

### D. Regresión Media Kit

- Crear/guardar kit desde solicitud limpia → OK.
- Intentar `ready`/`sent` con soporte pendiente → error.
- `GET /api/admin/mediakits/by-request/{requestId}` usa `source_request_id`.

## Criterio de cierre de la mejora 1

- [ ] A–D ejecutados en Preview con evidencias (timestamps, requestIds, HTTP status).
- [ ] Ningún avance a `quoted`/`enviado`/`closed` con drift o ownership pendiente.
- [ ] CI Candidate + unit tests del SHA PASS.
- [ ] Resultados pegados en el PR hacia `pmv-validation-candidate` y en `docs/pmv/qa-status.md`.

## Rollback de datos QA

Revertir únicamente filas creadas por la sesión QA en Preview (status de solicitudes de prueba, ownership temporal de drift). No aplicar scripts de rollback en Production.
