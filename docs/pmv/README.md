# PMV — índice de control y evidencias

**Leer primero:** [PROJECT-CONTROL.md](./PROJECT-CONTROL.md), estado operativo de inventario, Neon, Render, integración y QA.

**Contrato:** [PMV-CONTRACT-AND-ACCEPTANCE.md](../PMV-CONTRACT-AND-ACCEPTANCE.md), fuente de alcance e invariantes. El addendum del 2026-11-12 prevalece sobre snapshots anteriores.

## Fuentes vigentes

| Recurso | Uso |
|---|---|
| [Control operativo](./PROJECT-CONTROL.md) | 28 soportes, modelo Neon, runtime, rama única y bloqueantes |
| [Contrato PMV](../PMV-CONTRACT-AND-ACCEPTANCE.md) | Alcance, reglas comerciales, seguridad y aceptación |
| [Ownership mapping](../inventario/processed/TENANT-OWNERSHIP-MAPPING.md) | Mapeo de 28 soportes contra PDFs |
| [Inventario maestro](../inventario/processed/INVENTARIO_MAESTRO.md) | Extracción textual auxiliar de PDFs |
| [Ownership trigger QA](./2026-11-12-ownership-trigger-qa.md) | Migración y pruebas rollback-only en QA y Preview |
| [Línea de integración](./INTEGRATION-LINE.md) | Única rama candidata y reglas |
| [Auditoría DB](../security/2026-11-11-qa-runtime-db-security-audit.md) | Auditoría histórica con addendum runtime actual |
| [Media Kit](./mediakit-export-delivery.md) | Generación, almacenamiento, recuperación y trazabilidad |

## Snapshots históricos

No representan el estado actual sin contrastar con PROJECT-CONTROL y los workflows del HEAD:

- qa-status.md
- QA-OWNERSHIP-REVALIDATION-PREVIEW.md
- C1-C6-TRANSACTIONAL-QA.md
- CONTRACT-AUDIT-2026-11-07.md
- tenant-isolation-blocker.md
- tenant-isolation-implementation.md

## Reglas

1. Los PDFs de docs/inventario/source/ son la fuente primaria.
2. No sobrescribir evidencia histórica: agregar addenda fechados.
3. Verificar branch ID y servicio destino antes de DDL/DML.
4. No eliminar filas en cuarentena para hacer coincidir el total de Neon con el catálogo.
5. Production, main, DNS/WAF y secretos productivos permanecen fuera del trabajo autónomo. Merge y promoción requieren HUMAN GATE.