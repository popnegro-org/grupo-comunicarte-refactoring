# Grupo Comunicarte — PMV OOH

Aplicación full stack para explorar inventario de publicidad OOH, seleccionar soportes, solicitar Media Kits y gestionar inventario desde un dashboard comercial.

## Arquitectura
- Frontend: React 19 + Vite 6 + TypeScript + Tailwind CSS v4.
- Backend: Express integrado al build de Vite y desplegado como función en Vercel.
- Persistencia: PostgreSQL en Neon. El runtime comercial no utiliza inventario ni solicitudes mock como fuente de datos.
- Media: adaptador de almacenamiento R2 para assets administrados.
- Mapas: React Leaflet.
- Propuestas: Media Kit persistido y exportable desde el flujo comercial.

## Vistas del PMV

### Sitio comercial

`/`, `/soportes`, `/inventario`, `/soluciones`, `/nosotros`, `/contacto`

Flujo principal:

**Explorar inventario → filtrar por plaza/formato/disponibilidad → seleccionar soportes → solicitar Media Kit.**

El inventario público se obtiene desde `/api/supports`, cuya fuente operativa es Neon.

### Dashboard comercial

`/dashboard`

- Resumen operativo.
- Inventario y edición de soportes.
- Solicitudes de Media Kit.
- Creación y gestión de Media Kits.
- Acceso directo al inventario público.

Los indicadores del dashboard se calculan sobre los registros persistidos en Neon; no se hardcodean cantidades de inventario o plazas.

## Variables de entorno mínimas

```bash
DATABASE_URL=
ADMIN_USER=
ADMIN_PASSWORD=
JWT_SECRET=
```

Para multimedia, completar las variables R2 definidas por el adaptador del proyecto.

### Formulario de contacto (Resend)

Configurar en Vercel, tanto en Preview como en Production cuando se autorice su habilitación:

```bash
RESEND_API_KEY=
CONTACT_FROM="Grupo Comunicarte <contacto@grupocomunicarte.com.ar>"
```

- `RESEND_API_KEY`: clave privada de Resend.
- `CONTACT_FROM`: remitente perteneciente al dominio verificado en Resend (por ejemplo, `Grupo Comunicarte <contacto@grupocomunicarte.com.ar>`). Verificar `grupocomunicarte.com.ar` en Resend antes de enviar.
- El destinatario está fijado en el servidor: `comercial@grupocomunicarte.com.ar`.
- Las respuestas del correo se dirigen al email ingresado por el visitante (`Reply-To`).
- El formulario usa `POST /api/contact`, validación server-side y honeypot. El límite de 5 envíos por IP cada 15 minutos es una protección best-effort por instancia serverless, no un rate limit distribuido.
- No se almacenan consultas en Neon.
- Publicar en Cloudflare los registros exactos que Resend genere para el dominio raíz y su return-path (`send.grupocomunicarte.com.ar`). No reemplazar ni borrar los MX actuales del dominio raíz: el correo entrante existente debe continuar funcionando.

No publicar las claves en el repositorio ni en el frontend. Verificar el dominio y configurar el remitente en Resend antes de realizar pruebas de envío.


**Importante:** `DATABASE_URL` es obligatoria para ejecutar el backend. Si Neon no está disponible, la aplicación falla de forma explícita en lugar de presentar datos estáticos como si fueran datos operativos.

## Desarrollo

```bash
npm install
npm run dev
```

## Validación

```bash
npm run lint
npm run build
```

El endpoint `/api/health` informa `database: connected` cuando Neon responde correctamente y devuelve HTTP 503 si la base de datos no está disponible.

## Producción en Vercel

El proyecto está configurado para generar el frontend estático y exponer el backend Express mediante `api/[...path].ts`. La rama de trabajo debe validarse en Preview antes de cualquier promoción a `main`.

No se realizan merges ni publicaciones sobre `main` desde esta fase de refinamiento.