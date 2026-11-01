

## 13. Aclaración de ownership basada en inventario fuente (2026-11-01)

La carpeta `docs/inventario/source/` contiene los PDFs maestros correctos. La correspondencia exacta está documentada en [TENANT-OWNERSHIP-MAPPING.md](inventario/processed/TENANT-OWNERSHIP-MAPPING.md). Esto reemplaza la hipótesis anterior de que faltaba toda fuente autoritativa de ownership.

- 10 soportes `bue-trad-01..10` → `tenant-ba`.
- 15 soportes `mza-trad-01..15`, 2 pantallas `mza-led-01..02` y 1 LED móvil `mza-led-movil-01` → `tenant-default`.
- `mza-trad-16`, filas QA/CRUD y registros legacy no conciliados siguen en cuarentena.
- En Neon Preview se asignaron 28 soportes y 30 ítems de solicitudes por correspondencia exacta de `canonical_id`; 18 soportes y 2 ítems continúan sin tenant.
- Las tres solicitudes históricas mixtas conservan cabecera `global`; una solicitud con ítem sin ownership conserva scope NULL.

La asignación se realizó solo en Preview. No se modificó Production. El ownership de 28 soportes queda conciliado documentalmente, pero el P0 de aislamiento runtime continúa abierto hasta que servicios, rutas y pruebas impidan acceso cross-tenant y excluyan efectivamente los pendientes.
