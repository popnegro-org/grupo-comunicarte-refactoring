# Auditoría de normalización de infraestructura — Grupo Comunicarte

**Fecha de inspección:** 2026-11-05  
**Repositorio canónico:** `popnegro-org/grupo-comunicarte-refactoring`  
**Rama congelada de referencia:** `pmv-validation-candidate`  
**HEAD inspeccionado:** `10c0a659e4ae4ba93828f0fe133f3de224db5554`  
**Main inspeccionado:** `244d2f3d4bc6f3094de56b013c0c33b04f1a6e70`  
**Rama de trabajo de normalización:** `infra/normalization-candidate-20261105`

## Alcance y garantías

- No se modificó `main`.
- No se modificaron DNS, WAF, SSL/TLS, dominios ni rutas de Production.
- No se modificaron datos ni esquema de Neon.
- No se modificaron variables de entorno de Vercel o Render.
- No se fusionaron PRs.
- Los secretos no se leyeron ni se copiaron a este informe.

## 1. GitHub

- El repositorio pertenece a la organización `popnegro-org`, está público y el conector dispone de permisos de lectura/escritura de contenido.
- `pmv-validation-candidate` está 202 commits por delante de `main` y 0 por detrás. El merge base es exactamente el HEAD de `main`.
- PR #90 sigue abierto y Draft. Su descripción congela la candidata en `c0a12a9895db913425c7a23190854db318230d58`, pero el HEAD real inspeccionado es `10c0a659e4ae4ba93828f0fe133f3de224db5554`, 13 commits posterior al SHA documentado. El congelamiento es operativo/documental, no está impuesto por branch protection.
- PR #91 y #92 implementan la corrección CORS same-origin con diferencias de implementación. #91 no es mergeable; #92 es mergeable y tiene CI Candidate/Visual QA PASS documentados, pero continúa Draft y no contiene el smoke HTTP autenticado solicitado en su descripción.
- PR #93 está apilado sobre la rama de #92; no es independiente.
- PR #85–#88 y #89 siguen siendo trabajo UX/UI apilado o divergente; no se fusionaron.
- PR #97 está separado del cierre PMV y no se integró.
- Los checks del HEAD `10c0a65`: CI #786, CI Candidate #801 y Visual QA #510 finalizaron en success.
- En Visual QA #510 se restauró un baseline, se capturó baseline de mapa desde la rama base y se ejecutó regresión visual. El paso de regresión terminó en success.
- El workflow Visual QA instalaba dependencias con `npm install`, a diferencia de CI y CI Candidate que utilizan `npm ci`. Se normalizó a `npm ci --no-audit --no-fund` en esta rama de trabajo para reproducibilidad.

### Corrección adicional de CI

La auditoría detectó que `.github/workflows/ci.yml` ejecutaba en PRs dirigidos a `pmv-validation-candidate`, pero no en pushes directos a esa rama. Se añadió `pmv-validation-candidate` al filtro `push.branches` para que el workflow CI completo (npm ci, lint/typecheck, unit tests y build) valide también cada actualización directa de la candidata. La validación de esta corrección queda sujeta a los checks del PR de normalización.

## 2. Vercel

- Proyecto: `grupo-comunicarte-refactoring`.
- El Preview del HEAD `10c0a65` está `READY`.
- Las variables `ADMIN_USER`, `ADMIN_PASSWORD` y `DATABASE_URL` observadas en el filtro de rama están limitadas al target Preview y a `pmv-validation-candidate`. No se consultaron sus valores.
- El contexto de integración Git de Vercel todavía informa `popnegro/grupo-comunicarte-refactoring`, mientras que el repositorio canónico está en `popnegro-org`. El último deployment del candidato registra el owner canónico, por lo que existe una discrepancia entre metadata de deployment y enlace Git del proyecto.
- No se cambió el enlace Git del proyecto: puede afectar futuros deployments, incluida la línea Production.

## 3. Render y Neon

- Render QA: `srv-dacdf2gn74is73cpeci0`.
- Render servicio principal: `srv-da50fdbm8hqs73b1m5pg`.
- Ambos servicios están configurados para `pmv-production-refinement`, con build `npm ci && npm run build`, start `npm start`, health check `/api/health` y allowlist de red `0.0.0.0/0`.
- Ambos reportan el mismo commit desplegado `867188d1b63b27f2f7f3eeda1f31e96dd16dec6e`; no están sincronizados con el HEAD actual de la candidata.
- La herramienta disponible no permite leer las variables de entorno de Render. No se pudo demostrar si los dos servicios apuntan a la misma rama Neon o a ramas distintas.
- Neon contiene `main`, `preview/pmv-validation-candidate`, `qa/pr96-ownership-20261105` y ramas Preview históricas. Las ramas `main` y `preview/pmv-validation-candidate` figuran con `protected=false`.
- No se modificaron variables de Render, endpoints, roles, branches ni datos Neon. Antes de redirigir Render QA debe comprobarse compatibilidad de código/schema y establecer el destino de conexión con un procedimiento que no exponga secretos.

## 4. Cloudflare

Zona `grupocomunicarte.com.ar`, estado active.

### DNS observado

- Apex A → `76.76.21.21`, DNS-only.
- `www` CNAME → `a282227acc77be04.vercel-dns-017.com`, DNS-only.
- `media` CNAME → `public.r2.dev`, proxied; bucket metadata `gc-storage`.
- `webmail` CNAME → servicio Render `grupo-comunicarte-webmail-smtpfix.onrender.com`, DNS-only.
- MX, SPF, DKIM, DMARC y registros de servicios Amelu están presentes. No se modificaron.

### Seguridad de zona observada

- SSL mode: `full` (no `full_strict`).
- Minimum TLS: `1.0`.
- Always Use HTTPS: `off`.
- TLS 1.3: `on`.
- HTTP/3: `on`.
- Managed Free Ruleset existe, pero el endpoint de entrypoint de `http_request_firewall_managed` devolvió 404. No se confirmó un ruleset WAF activo en el entrypoint de zona.
- No se encontraron WAF packages asociados en la consulta de paquetes.
- Apex y `www` son DNS-only, por lo que su tráfico no atraviesa el proxy/WAF de Cloudflare. El proxy sí está activo para `media`.

No se modificaron DNS, proxy, SSL, TLS, WAF, reglas ni R2.

## 5. HUMAN GATE requerido

Los siguientes cambios afectan producción o la integridad de los entornos y quedan pendientes de aprobación específica:

1. Re-vincular Vercel al repositorio canónico `popnegro-org/grupo-comunicarte-refactoring`.
2. Cambiar DNS/proxy de apex y `www`, activar Always Use HTTPS y habilitar WAF en el tráfico web.
3. Elevar el mínimo TLS de Cloudflare a 1.2 y evaluar Full (strict) después de verificar el origin real.
4. Proteger Neon `main` y definir protección para las ramas QA/Preview.
5. Cambiar la rama de Render QA y su conexión Neon una vez identificada la URL de conexión actual y comprobada la compatibilidad del código.
6. Cambiar la rama del servicio Render principal, si corresponde, solo tras confirmar su función y el impacto de producción.

## 6. Siguiente secuencia técnica

1. Ejecutar CI, CI Candidate y Visual QA sobre esta rama de normalización.
2. Abrir PR Draft hacia `pmv-validation-candidate`, nunca hacia `main`.
3. Auditar el smoke CORS de #92 y decidir la consolidación de #91/#92 sin fusionar ambos.
4. Resolver la relación Render QA ↔ Neon Preview con acceso de lectura verificable a la configuración de entorno.
5. Presentar los cambios de producción/infraestructura listados en HUMAN GATE para aprobación individual.

**Estado de esta auditoría:** diagnóstico completado; una corrección de CI/Visual QA preparada en rama aislada; ningún cambio de Production.
