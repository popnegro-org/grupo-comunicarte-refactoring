# PMV — índice de control y evidencias

**Documento de aceptación vigente:** [PMV-CONTRACT-AND-ACCEPTANCE.md](../PMV-CONTRACT-AND-ACCEPTANCE.md)

Este directorio contiene evidencia acumulativa. Para decidir el estado actual del PMV, prevalecen el contrato de aceptación vigente, los workflows del HEAD candidato y los informes fechados posteriores.

## Fuentes vigentes

| Recurso | Uso |
|---|---|
| [Contrato PMV y criterios de aceptación](../PMV-CONTRACT-AND-ACCEPTANCE.md) | Fuente única de alcance, invariantes y aceptación |
| [Ownership trigger QA 2026-11-12](./2026-11-12-ownership-trigger-qa.md) | Migración aplicada y pruebas rollback-only en Neon QA y Preview |
| [Migración de ownership request items](./migrations/20261112_request_item_tenant_inheritance.sql) | Trigger DB para nuevas/actualizadas líneas, cuarentena e inmutabilidad |
| [Prueba rollback-only de ownership](./tests/20261112_request_item_tenant_inheritance.rollback.sql) | Casos negativos y preservación de filas históricas |
| [Entrega de Media Kit](./mediakit-export-delivery.md) | Evidencia de generación, almacenamiento, recuperación y trazabilidad |
| [Auditoría de privilegios runtime](../security/2026-11-11-qa-runtime-db-security-audit.md) | Roles, privilegios, branch protection y deuda de seguridad |

## Documentos históricos / snapshots

Los siguientes archivos son fotografías de iteraciones anteriores. No deben usarse como estado actual sin contrastarlos con el contrato vigente y los últimos workflows:

| Documento | Estado |
|---|---|
| [qa-status.md](./qa-status.md) | Histórico; sus conteos y resultados corresponden a una validación anterior |
| [QA-OWNERSHIP-REVALIDATION-PREVIEW.md](./QA-OWNERSHIP-REVALIDATION-PREVIEW.md) | Previo a la aplicación de triggers del 2026-11-12 |
| [C1-C6-TRANSACTIONAL-QA.md](./C1-C6-TRANSACTIONAL-QA.md) | Evidencia de una ejecución anterior; el run actual de CI Candidate es la fuente reciente |
| [CONTRACT-AUDIT-2026-11-07.md](./CONTRACT-AUDIT-2026-11-07.md) | Auditoría histórica, no sustituye al contrato actual |
| [tenant-isolation-blocker.md](./tenant-isolation-blocker.md) | Registro histórico de decisiones; consultar también el contrato actual |
| [tenant-isolation-implementation.md](./tenant-isolation-implementation.md) | Registro de implementación previo a los últimos triggers y pruebas |

## Reglas para nuevas evidencias

1. No sobrescribir informes históricos: añadir un nuevo addendum fechado.
2. No ejecutar migraciones SQL históricas de nuevo por el mero hecho de que estén en el repositorio.
3. Confirmar branch ID Neon y target Preview/QA antes de cualquier DDL/DML.
4. Production requiere gate separado; el trabajo actual no autoriza merge ni promoción.
5. Si una evidencia contradice el contrato vigente, documentar y resolver la discrepancia antes de marcar aceptación.
