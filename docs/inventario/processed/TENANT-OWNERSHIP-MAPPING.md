# Conciliación de ownership de soportes — fuente documental

**Branch:** `pmv-validation-candidate`  
**Fuente:** PDFs versionados en `docs/inventario/source/` y extracción procesada en `docs/inventario/processed/`  
**Ámbito de datos modificado:** únicamente Neon Preview `preview/pmv-validation-candidate` (`br-muddy-cell-au64infb`). Production y `main` no fueron modificados.  
**Fecha de validación:** 2026-11-01

## 1. Fuente de verdad

Los inventarios PDF por unidad de negocio son la evidencia documental primaria:

- `source/soportes-buenos-aires.pdf` → `tenant-ba`.
- `source/soportes-mendoza.pdf` → `tenant-default`.
- `source/soportes-ledmovil-mendoza.pdf` → `tenant-default`.

Las extracciones de `processed/` facilitan búsqueda y conciliación, pero no reemplazan al PDF. La ciudad, por sí sola, no es criterio de ownership. La pertenencia se acredita por la correspondencia exacta de `canonical_id`, nombre/posición y ficha del inventario fuente.

## 2. Mapeo aceptado

### Buenos Aires — `tenant-ba`

Los diez soportes tradicionales corresponden a las posiciones 01–10 del PDF de Buenos Aires. La matriz de conciliación documenta la correspondencia 1:1. Los `canonical_id` son:

`bue-trad-01` a `bue-trad-10`.

### Mendoza — `tenant-default`

| Grupo | Canonical IDs | Cantidad | Fuente |
|---|---|---:|---|
| Grandes formatos | `mza-trad-01` a `mza-trad-11` | 11 | PDF Mendoza, posiciones 01–11 |
| Formatos medios | `mza-trad-12` a `mza-trad-15` | 4 | PDF Mendoza, posiciones 12–15 |
| Pantallas LED | `mza-led-01`, `mza-led-02` | 2 | PDF Mendoza, posiciones 16–17 |
| LED móvil | `mza-led-movil-01` | 1 | PDF LED Móvil, producto/ruta único |

**Total con fuente y correspondencia identificable: 28 soportes** (10 Buenos Aires + 18 Mendoza). Las caras Norte/Sur/Este/Oeste descritas en los PDFs son caras de las posiciones físicas, no soportes adicionales; no deben multiplicarse como registros comerciales sin decisión de producto.

## 3. Filas excluidas de asignación

No se asignan por semejanza, ciudad ni heurística:

- `mza-trad-16` — “Las Heras Centro”: no figura entre las posiciones 01–17 del PDF Mendoza.
- Registros de prueba/QA/CRUD.
- Filas legacy con `canonical_id` o identidad incompleta.
- Cualquier fila que no pueda conciliarse de forma inequívoca con un registro de los PDFs.

Estas filas conservan `tenant_id = NULL` y permanecen en cuarentena. No se las elimina ni se altera su estado comercial en esta conciliación.

## 4. Aplicación en Neon Preview

Se aplicó un update aditivo y acotado por allowlist de `canonical_id`:

- 10 soportes → `tenant-ba`.
- 18 soportes → `tenant-default`.
- 18 filas permanecen sin tenant: 17 inactivas y 1 activa (`mza-trad-16`), todas fuera de la lista conciliada.

Se asignó también `tenant_id` a ítems históricos de solicitudes cuando su `support_id` coincidía exactamente con el `canonical_id` conciliado:

- 30 de 32 ítems quedaron asociados a su tenant.
- 2 ítems permanecen sin tenant porque apuntan a soportes no conciliados.
- Dos solicitudes históricas mixtas tienen scope `global`; las solicitudes homogéneas con ítems conciliados tienen scope `tenant`. Una solicitud adicional contiene ítems de ambos tenants y un ítem pendiente, por lo que conserva scope NULL junto con otra solicitud legacy con ownership pendiente.
- No se modificaron importes, disponibilidad, contenido, nombres ni datos de contacto.

## 5. Verificación posterior

Consultas ejecutadas en Preview tras la asignación:

| Tabla | Resultado |
|---|---|
| `supports` | 46 total; 10 `tenant-ba`; 18 `tenant-default`; 18 NULL |
| `mediakit_request_items` | 32 total; 5 `tenant-ba`; 25 `tenant-default`; 2 NULL |
| `mediakit_requests` | 18 total; scope global para 2 mixtas conciliadas; tenant para 14 homogéneas; 2 sin scope (una contiene ítems de ambos tenants y un ítem pendiente; la otra conserva ownership pendiente) |

La suma de scopes se deriva del estado de los ítems y puede cambiar si se corrige un soporte pendiente. Revalidar antes de futuras migraciones.

## 6. Límites de esta conciliación

Esta asignación de ownership **no cierra el P0 de aislamiento multi-tenant**. Todavía deben implementarse y probarse los filtros tenant-safe en servicios y endpoints, pricing, Media Kits, solicitudes, estadísticas, medios, CRUD y exportaciones. Las filas pendientes deben quedar efectivamente excluidas del catálogo público y de operaciones comerciales. No activar RLS hasta probar el rol real de runtime.

No se hicieron cambios en Production, no se creó ningún usuario y no se modificó `main`.
