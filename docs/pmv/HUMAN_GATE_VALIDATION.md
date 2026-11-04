# PMV — validación HUMAN GATE

## Rama candidata

- Branch: `pmv-final-human-gate`
- Base congelada: `pmv-validation-candidate` (`c0a12a9895db913425c7a23190854db318230d58`)
- Alcance: hardening de origen/CSRF para Preview y detalle comercial responsive de solicitudes.
- `main`, Production y `pmv-validation-candidate` no forman parte de esta integración.

## Cambios incluidos

1. Aceptar mutaciones cookie-authenticated desde el origen exacto del deployment Preview, manteniendo allowlist explícita y rechazo de orígenes externos.
2. Agregar pruebas unitarias de origen/CSRF y ejecutar todos los archivos `tests/unit/*.test.ts` mediante `npm run test:unit`.
3. Incorporar detalle comercial responsive con cliente, solicitud, actividad persistida y Media Kit asociado.
4. Resolver Media Kit asociado por `source_request_id`; no asumir que el ID público del Media Kit se deriva del ID de solicitud.
5. Documentar límites actuales de actividad/CRM: no se simulan llamadas, reuniones, tareas ni negocios HubSpot que no estén persistidos.

## Evidencia automatizada local

- `npm ci`: PASS — 0 vulnerabilidades reportadas.
- `npm run lint`: PASS.
- `npm run test:unit`: PASS — 56/56.
- `npm run build`: PASS.
- `git diff --check`: requerido antes del push.

## QA visual

La ejecución local de Playwright quedó bloqueada por una dependencia del contenedor (`libglib-2.0.so.0` ausente), no por un fallo de aserción. El PR #93 ya había obtenido 22/22 pruebas funcionales Playwright en su entorno anterior; esa evidencia no sustituye el check del nuevo SHA. El workflow Visual QA de GitHub debe quedar verde sobre el HEAD de esta rama antes de aprobar el gate.

## Validación humana requerida

Con un usuario QA y datos QA aislados, validar:

1. Login en Preview y navegación a Solicitudes.
2. Abrir una solicitud y comprobar que Cliente, Oportunidad y Actividad muestran únicamente datos persistidos.
3. Cuando exista un Media Kit con `source_request_id` coincidente, verificar estado, soportes, importe y enlaces válidos.
4. Cuando no exista relación persistida, verificar el estado vacío sin asociación inferida.
5. En móvil (390×844) y desktop (1440×900), verificar drawer, scroll interno y ausencia de overflow horizontal.
6. Confirmar que una solicitud con ownership pendiente sigue en cuarentena y no habilita cotización/exportación/entrega.
7. Verificar que el origen exacto del Preview puede realizar mutaciones cookie-authenticated y que un origen externo recibe 403.

## Fuera de alcance / no autorizado

- No mergear esta rama ni promoverla a `main`.
- No modificar Neon/Production, credenciales, DNS, Cloudflare ni datos reales.
- No enviar comunicaciones reales.
- No integrar las ramas históricas #85–#88 completas.

**Decisión esperada:** aprobación/rechazo del PR y del flujo manual de Preview. La aprobación no autoriza por sí sola promoción a Production.
