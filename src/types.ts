export type Plaza = 'mendoza' | 'buenos-aires';
export type TipoSoporte = 'tradicional' | 'led' | 'led_movil';
export type EstadoGPS = 'ready' | 'pending_geocode' | 'error';
export type Disponibilidad = 'disponible' | 'reservado' | 'inactivo';
export type SupportFamily = 'traditional' | 'medium_format' | 'led' | 'led_mobile';
export type SupportMediaType = 'image' | 'video' | 'document';
export type SupportCurrency = 'ARS' | 'USD';

export interface SupportPricing {
  exhibition_price: number;
  installation_price: number;
  printing_price: number;
  monthly_price: number;
  exclusive_price: number;
  currency: SupportCurrency;
  tax_included: boolean;
  price_public: boolean;
}

export interface SupportMediaItem {
  id: number;
  media_type: SupportMediaType;
  url: string;
  title?: string;
  alt?: string;
  mime_type?: string;
  sort_order?: number;
  metadata?: Record<string, unknown>;
  active?: boolean;
}

export interface SupportTechnicalData {
  measures?: string;
  resolution?: string;
  turn_on_schedule?: string;
  daily_frequency?: string;
  requirements?: string;
  summary?: string;
  format?: string;
  caras?: number | null;
  impresion?: string;
  monthly_impacts?: number | string | null;
  spot_duration_seconds?: number | null;
  minimum_daily_outings?: number | null;
  max_advertisers?: number | null;
  route_duration_hours?: number | null;
  operation_days?: string;
  video_mode?: string;
  metadata?: Record<string, unknown>;
}

export interface SupportRouteData {
  route_name?: string;
  route_mode?: string;
  routePath: [number, number][];
  waypoints: { name: string; lat: number | null; lng: number | null }[];
  default_route?: boolean;
  schedule?: string;
  duration?: string;
  hours?: string;
  weekdays?: string;
  max_advertisers?: number | null;
  spot_duration_seconds?: number | null;
  minimum_daily_outings?: number | null;
  metadata?: Record<string, unknown>;
}

export interface LocationRecord {
  canonical_id: string;
  tenant_id?: string | null;
  tenant_ownership_evidence?: string | null;
  name: string;
  ciudad: Plaza;
  tipo_soporte: TipoSoporte;
  family?: SupportFamily;
  active?: boolean;
  lat: number | null;
  lng: number | null;
  address: string;
  description: string;
  characteristics: string;
  mapa_url: string;
  imageUrls?: string[];
  disponibilidad?: Disponibilidad;
  availableFrom?: string;
  reservedFrom?: string;
  reservedUntil?: string;
  isFeatured?: boolean;
  pricing?: SupportPricing | null;
  media?: SupportMediaItem[];
  technical?: SupportTechnicalData | null;
}

export interface MobileRoute {
  canonical_id: string;
  tenant_id?: string | null;
  tenant_ownership_evidence?: string | null;
  name: string;
  ciudad: Plaza;
  tipo_soporte: TipoSoporte;
  family?: SupportFamily;
  active?: boolean;
  description: string;
  characteristics: string;
  schedule: string;
  duration: string;
  waypoints: { name: string; lat: number | null; lng: number | null }[];
  routePath: [number, number][];
  imageUrls?: string[];
  disponibilidad?: Disponibilidad;
  availableFrom?: string;
  reservedFrom?: string;
  reservedUntil?: string;
  isFeatured?: boolean;
  pricing?: SupportPricing | null;
  media?: SupportMediaItem[];
  technical?: SupportTechnicalData | null;
}

export type InventoryItem = LocationRecord | MobileRoute;

export function isMobileRoute(item: InventoryItem): item is MobileRoute {
  return 'waypoints' in item;
}

export function getDisponibilidad(item: InventoryItem): Disponibilidad {
  return item.disponibilidad ?? 'disponible';
}
