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

## Preparación de nuevas integraciones

Antes de conectar proveedores externos, seguir el contrato de seguridad, tenant, idempotencia, migraciones y QA documentado en [Guía de integraciones](docs/integrations/README.md). El archivo [.env.example](.env.example) enumera los nombres de variables requeridos; nunca debe contener credenciales reales.
