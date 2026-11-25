> **ACTUALIZACIÓN 2026-11-01:** este informe refleja una conciliación histórica del 2026-08-31 y su conclusión sobre Mendoza quedó obsoleta frente al inventario actual de la rama candidata. Los PDFs versionados en `docs/inventario/source/` se tomaron como fuente primaria y se conciliaron los canonical_id actuales. Ver [TENANT-OWNERSHIP-MAPPING.md](TENANT-OWNERSHIP-MAPPING.md) para el mapeo vigente y la asignación verificada en Neon Preview. No utilizar los veredictos históricos de este documento para negar las correspondencias actuales ni para autorizar una carga masiva de multimedia.

---

# Matriz de conciliación del inventario — FASE 1

Fecha de auditoría: 2026-08-31
Fuente maestra: `docs/inventario/source/` y su extracción `docs/inventario/processed/`.
Fuente operativa comparada: `src/data/inventory.ts`.

## Veredicto

**NO HACER CARGA MASIVA DE MULTIMEDIA TODAVÍA.**

La conciliación demuestra que el inventario operativo actual no representa fielmente el inventario de los PDFs para Mendoza. Buenos Aires sí tiene correspondencia 1:1 en los 10 soportes. El LED Móvil tiene correspondencia conceptual 1:1. Los registros Mendoza tradicionales/LED fijos actuales son datos de demostración/mock y deben conciliarse antes de asociar imágenes reales.

## Resumen

| Fuente | Registros/elementos identificados | Match con aplicación | Estado |
|---|---:|---:|---|
| Buenos Aires PDF | 10 | 10/10 | MATCH |
| Mendoza PDF — Grandes Formatos | 11 entradas numeradas (01–11; algunas con dos caras) | 0/11 por identidad | REQUIERE REEMPLAZO/CONCILIACIÓN |
| Mendoza PDF — Formatos Medios | 4 entradas numeradas (12–15) | 0/4 por identidad | REQUIERE REEMPLAZO/CONCILIACIÓN |
| Mendoza PDF — Pantallas LED | 2 entradas numeradas (16–17) | 0/2 por identidad | REQUIERE REEMPLAZO/CONCILIACIÓN |
| LED Móvil Mendoza PDF | 1 producto/ruta | 1/1 conceptual | MATCH |
| Aplicación actual | 28 soportes/rutas visibles en `inventory.ts` | — | DATOS OPERATIVOS DESALINEADOS |

> Nota: las caras Norte/Sur/Este/Oeste de una misma posición del PDF se consideran variantes de un mismo soporte físico cuando comparten la misma referencia de mapa. No deben convertirse automáticamente en soportes independientes sin validar el modelo de negocio.

## Buenos Aires — conciliación

Los 10 registros actuales `bue-trad-01` … `bue-trad-10` corresponden a las 10 posiciones del PDF por nombre, ubicación, características y URL de mapa.

| ID aplicación | PDF | Estado |
|---|---|---|
| bue-trad-01 | Av. San Juan 1981 — San Cristóbal | MATCH |
| bue-trad-02 | Autopista 25 de Mayo y San Pedrito — Flores | MATCH |
| bue-trad-03 | Av. Libertador y Lavalle — Vicente López | MATCH |
| bue-trad-04 | Av. Los Incas 4560 — Villa Urquiza | MATCH |
| bue-trad-05 | Av. J. B. Justo y Lope de Vega — Liniers | MATCH |
| bue-trad-06 | Av. Zabala y J. M. de Rosas — Morón | MATCH |
| bue-trad-07 | Olazabal y Triunvirato — Villa Urquiza | MATCH |
| bue-trad-08 | Av. Donado y Ruiz Huidobro — Saavedra | MATCH |
| bue-trad-09 | Av. Rivadavia 6646 — Caballito | MATCH |
| bue-trad-10 | Autopista 25 de Mayo y Membrillar — Flores | MATCH |

### Multimedia Buenos Aires

Los `imageUrls` actuales (`/images/bue-trad-XX.jpg`) son referencias de aplicación y **no deben considerarse imágenes reales del PDF**. La siguiente acción editorial es sustituirlas/cargarlas mediante R2 con material real validado.

## Mendoza — conciliación

### Grandes Formatos

El PDF contiene las posiciones 01–11. Hay posiciones con dos caras y, por tanto, varias fichas visuales para una misma estructura física.

| PDF | Posición | Estado contra aplicación |
|---|---|---|
| 01 | Columna Acc. Sur casi R. Peña — Cara Sur/Norte | NO MATCH |
| 02 | Top Site Panamericana frente a Wallmart — Cara Sur/Norte | NO MATCH |
| 03 | Columna Corredor del Oeste casi Palmares Valley — Cara Norte/Sur | NO MATCH |
| 04 | Columna Carril Nacional y Tirasso — Cara Sur/Norte | NO MATCH |
| 05 | Columna Acc. Norte - Aeropuerto — Cara Norte/Sur | NO MATCH |
| 06 | Top Site Salida Aeropuerto hacia Ciudad — Acceso Norte | NO MATCH |
| 07 | Top Site llegando a Aeropuerto — Acceso Norte | NO MATCH |
| 08 | Columna San Martín Sur y Panamericana — Cara Sur/Norte | NO MATCH |
| 09 | Columna Acc. Este y Acc. Sur — Cara Este/Oeste | NO MATCH |
| 10 | Sobre techo Acceso Norte y Rotonda del Avión | NO MATCH |
| 11 | Corredor del Oeste, De Volea Pádel — Godoy Cruz | NO MATCH |

La aplicación actual contiene `mza-trad-01` … `mza-trad-16`, pero sus nombres son elementos de prueba como `Cartel Nudo Vial`, `Soporte Arístides`, `Shopping Sur`, `Centro Cívico`, etc. No se debe inferir que corresponden a las posiciones del PDF.

### Formatos Medios

| PDF | Posición | Estado contra aplicación |
|---|---|---|
| 12 | 4x4 lateral Panamericana casi YPF — Luján | NO MATCH |
| 13 | Supersextuple Panamericana y Antártida Argentina — Luján | NO MATCH |
| 14 | Terrada casi Boedo — Luján de Cuyo | NO MATCH |
| 15 | Boedo entre Terrada y Acc. Sur — Luján de Cuyo | NO MATCH |

### Pantallas LED

| PDF | Posición | Estado contra aplicación |
|---|---|---|
| 16 | Pantalla LED Acceso Este y Dorrego — ingreso a Mendoza | NO MATCH |
| 17 | Pantalla LED Panamericana y Pueyrredón — Luján de Cuyo | NO MATCH |

La aplicación actual tiene `mza-led-01` = `Pantalla Centro` y `mza-led-02` = `Pantalla Acceso Sur`; ambos son nombres/ubicaciones distintas de las fichas maestras y no deben recibir media real sin conciliación.

## LED Móvil

El PDF describe un único producto/ruta: **Camión LED / LED Móvil**, con tres pantallas (dos laterales y una posterior), recorrido Gran Mendoza, modalidad compartida y opciones de uso exclusivo/personalizado.

La aplicación tiene `mza-led-movil-01` = `Camión LED Móvil`, por lo que existe correspondencia conceptual 1:1. La media real deberá asociarse a este registro después de validar que el contenido comercial del registro coincide con el PDF.

## Hallazgo crítico

La aplicación actual contiene datos de demostración que no pueden utilizarse como inventario editorial definitivo para Mendoza. Esto explica por qué una carga de imágenes basada únicamente en `canonical_id` produciría asociaciones potencialmente incorrectas.

### Regla de FASE 1

**No cargar media real en los registros Mendoza actuales hasta conciliar/reemplazar esos registros con las posiciones del PDF.**

## Próxima acción FULL AUTOMATE

1. Mantener los PDFs y esta matriz como fuente maestra.
2. Crear un mapping estable `inventory_source_id -> canonical_id` únicamente después de validar cada posición.
3. Para Buenos Aires, habilitar carga editorial real sobre `bue-trad-01..10`.
4. Para Mendoza, preparar primero la migración/actualización de soportes según PDF.
5. Para LED Móvil, validar y completar `mza-led-movil-01`.
6. Recién después ejecutar la carga masiva R2.

## Fuentes

- `docs/inventario/source/soportes-buenos-aires.pdf`
- `docs/inventario/source/soportes-mendoza.pdf`
- `docs/inventario/source/soportes-ledmovil-mendoza.pdf`
- `docs/inventario/processed/INVENTARIO_MAESTRO.md`
- `src/data/inventory.ts`
