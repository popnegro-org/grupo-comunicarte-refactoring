import {
  getDisponibilidad,
  isMobileRoute,
  type InventoryItem,
} from '../types';

/**
 * Read-only presentation contract for the OOH inventory redesign.
 * Internal exhibition, installation and printing prices are intentionally
 * excluded. This adapter never mutates the source inventory.
 */
export type InventoryPresentationType =
  | 'Tradicional'
  | 'LED móvil'
  | 'Pantallas LED'
  | 'Pendiente de mapeo';

export type InventoryPresentationAvailability = 'Disponible' | 'Reservado';
export type InventoryOperationalState =
  | 'Operativo'
  | 'Mantenimiento'
  | 'Inactivo'
  | 'En revisión';

export interface InventoryPresentationItem {
  id: string;
  nombre: string;
  tipo: InventoryPresentationType;
  direccion: string;
  localidad: string;
  disponibilidad: InventoryPresentationAvailability;
  destacado: boolean;
  medidas?: string;
  formato?: string;
  impactoMensual?: string;
  caras?: number;
  estadoOperativo: InventoryOperationalState;
  latitud?: number;
  longitud?: number;
  descripcion?: string;
  imagenUrl?: string;
}

function mapType(item: InventoryItem): InventoryPresentationType {
  if (item.tipo_soporte === 'tradicional') return 'Tradicional';
  if (item.tipo_soporte === 'led_movil') return 'LED móvil';
  if ((item.tipo_soporte as string) === 'pantallas_led') return 'Pantallas LED';

  // Legacy "led" does not distinguish fixed LED screens from other LED
  // inventory. Do not guess a commercial classification.
  return 'Pendiente de mapeo';
}

function mapOperationalState(item: InventoryItem): InventoryOperationalState {
  // Legacy data overloaded "inactivo" into disponibilidad. Preserve it as
  // operational state while keeping reservation availability independent.
  if (item.active === false || getDisponibilidad(item) === 'inactivo') return 'Inactivo';

  const metadata = item.technical?.metadata;
  const rawState =
    metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>).estadoOperativo
      : undefined;

  if (
    rawState === 'Operativo' ||
    rawState === 'Mantenimiento' ||
    rawState === 'Inactivo' ||
    rawState === 'En revisión'
  ) {
    return rawState;
  }

  // The current domain model has no first-class operational-state field.
  return 'En revisión';
}

/**
 * Converts the existing API/domain model to the redesign's display model.
 * One-way until a verified persistence contract for editing is available.
 */
export function toInventoryPresentationItem(
  item: InventoryItem,
): InventoryPresentationItem {
  const technical = item.technical;
  let direccion = '';
  let lat: number | null | undefined;
  let lng: number | null | undefined;

  if (isMobileRoute(item)) {
    const firstWaypoint = item.waypoints[0];
    direccion = firstWaypoint?.name ?? '';
    lat = firstWaypoint?.lat;
    lng = firstWaypoint?.lng;
  } else {
    direccion = item.address;
    lat = item.lat;
    lng = item.lng;
  }

  return {
    id: item.canonical_id,
    nombre: item.name,
    tipo: mapType(item),
    direccion,
    localidad: item.ciudad === 'buenos-aires' ? 'Buenos Aires' : 'Mendoza',
    disponibilidad:
      getDisponibilidad(item) === 'reservado' ? 'Reservado' : 'Disponible',
    destacado: Boolean(item.isFeatured),
    medidas: technical?.measures || undefined,
    formato: technical?.format || undefined,
    impactoMensual:
      technical?.monthly_impacts == null
        ? undefined
        : String(technical.monthly_impacts),
    caras: technical?.caras == null ? undefined : technical.caras,
    estadoOperativo: mapOperationalState(item),
    latitud: lat == null ? undefined : lat,
    longitud: lng == null ? undefined : lng,
    descripcion: item.description || undefined,
    imagenUrl: item.imageUrls?.[0] || undefined,
  };
}
