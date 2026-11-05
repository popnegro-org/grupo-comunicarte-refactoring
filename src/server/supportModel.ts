import crypto from 'crypto';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  supportFaces,
  supportLocations,
  supportMedia,
  supportPricing,
  supports,
  supportRoutes,
  supportTechnical,
} from '../db/schema.ts';
import { isSupportEligibleForPublicCatalog } from './tenantAccess.ts';
import {
  Disponibilidad,
  InventoryItem,
  LocationRecord,
  MobileRoute,
  Plaza,
  SupportCurrency,
  SupportFamily,
  SupportMediaItem,
  SupportMediaType,
  SupportPricing,
  SupportRouteData,
  SupportTechnicalData,
  TipoSoporte,
} from '../types.ts';

export const ALLOWED_FAMILIES: SupportFamily[] = ['traditional', 'medium_format', 'led', 'led_mobile'];
export const ALLOWED_MEDIA_TYPES: SupportMediaType[] = ['image', 'video', 'document'];
export const ALLOWED_DISPONIBILIDADES: Disponibilidad[] = ['disponible', 'reservado', 'inactivo'];
export const ALLOWED_CIUDADES: Plaza[] = ['mendoza', 'buenos-aires'];

type SupportRow = typeof supports.$inferSelect;
type SupportLocationRow = typeof supportLocations.$inferSelect;
type SupportTechnicalRow = typeof supportTechnical.$inferSelect;
type SupportPricingRow = typeof supportPricing.$inferSelect;
type SupportRouteRow = typeof supportRoutes.$inferSelect;
type SupportMediaRow = typeof supportMedia.$inferSelect;
type SupportFaceRow = typeof supportFaces.$inferSelect;

export interface SupportMediaInput {
  media_type: SupportMediaType;
  url: string;
  title?: string;
  alt?: string;
  mime_type?: string;
  sort_order?: number;
  metadata?: Record<string, unknown>;
  active?: boolean;
}

export interface SupportFaceInput {
  face_key: string;
  label: string;
  side?: string;
  width_meters?: number | null;
  height_meters?: number | null;
  width_pixels?: number | null;
  height_pixels?: number | null;
  substrate?: string;
  notes?: string;
  active?: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown>;
}

export interface SupportWritePayload {
  name?: string;
  ciudad?: Plaza;
  family?: SupportFamily;
  category?: SupportFamily;
  tipo_soporte?: TipoSoporte;
  lat?: number | string | null;
  lng?: number | string | null;
  address?: string;
  description?: string;
  characteristics?: string;
  mapa_url?: string;
  imageUrls?: string[];
  disponibilidad?: Disponibilidad;
  availableFrom?: string | null;
  isFeatured?: boolean;
  active?: boolean;
  technical?: Partial<SupportTechnicalData>;
  pricing?: Partial<SupportPricing> & { currency?: SupportCurrency | string };
  route?: Partial<SupportRouteData>;
  media?: SupportMediaInput[];
  faces?: SupportFaceInput[];
}

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSnakeCase(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveFamily(payload: SupportWritePayload, currentTipo?: TipoSoporte | null): SupportFamily {
  const raw = (payload.family || payload.category || currentTipo || 'traditional').toString();
  if (raw === 'tradicional' || raw === 'traditional') return 'traditional';
  if (raw === 'medio_formato' || raw === 'medium_format' || raw === 'medium-format') return 'medium_format';
  if (raw === 'led_movil' || raw === 'led_mobile' || raw === 'mobile_led') return 'led_mobile';
  if (raw === 'led') return 'led';
  if (ALLOWED_FAMILIES.includes(raw as SupportFamily)) return raw as SupportFamily;
  return 'traditional';
}

export function familyToTipoSoporte(family: SupportFamily): TipoSoporte {
  if (family === 'led') return 'led';
  if (family === 'led_mobile') return 'led_movil';
  return 'tradicional';
}

export function validateFamily(family: string): asserts family is SupportFamily {
  if (!ALLOWED_FAMILIES.includes(family as SupportFamily)) {
    throw new Error(`Categoría desconocida: ${family}`);
  }
}

export function validateMediaType(mediaType: string): asserts mediaType is SupportMediaType {
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as SupportMediaType)) {
    throw new Error(`media_type inválido: ${mediaType}`);
  }
}

export function validateAvailability(value: unknown): asserts value is Disponibilidad {
  if (!ALLOWED_DISPONIBILIDADES.includes(value as Disponibilidad)) {
    throw new Error(`Disponibilidad inválida: ${String(value)}`);
  }
}

export function validateCoordinates(lat: unknown, lng: unknown) {
  const latValue = toNullableNumber(lat);
  const lngValue = toNullableNumber(lng);
  if ((lat !== null && lat !== undefined && lat !== '') !== (lng !== null && lng !== undefined && lng !== '')) {
    throw new Error('Coordenadas inválidas: lat y lng deben enviarse juntas o ambas omitirse.');
  }
  const latProvided = lat !== null && lat !== undefined && lat !== '';
  const lngProvided = lng !== null && lng !== undefined && lng !== '';
  if ((latProvided && latValue === null) || (lngProvided && lngValue === null)) {
    throw new Error('Coordenadas inválidas: lat/lng deben ser valores numéricos válidos.');
  }
  if (latValue !== null && (latValue < -90 || latValue > 90)) {
    throw new Error(`Coordenadas inválidas: lat fuera de rango (${latValue}).`);
  }
  if (lngValue !== null && (lngValue < -180 || lngValue > 180)) {
    throw new Error(`Coordenadas inválidas: lng fuera de rango (${lngValue}).`);
  }
  return { lat: latValue, lng: lngValue };
}

export function validatePricingInput(pricing?: Partial<SupportPricing> & { currency?: SupportCurrency | string }) {
  if (!pricing) return;
  const fields = ['exhibition_price', 'installation_price', 'printing_price', 'monthly_price', 'exclusive_price'] as const;
  for (const field of fields) {
    const value = (pricing as Record<string, unknown>)[field];
    if (value === undefined || value === null || value === '') continue;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new Error(`Precio negativo o inválido en ${field}`);
    }
  }
  if (pricing.currency && !['ARS', 'USD'].includes(String(pricing.currency))) {
    throw new Error(`Moneda inválida: ${pricing.currency}`);
  }
}

export function validateSupportPayload(payload: SupportWritePayload) {
  const name = normalizeText(payload.name);
  if (!name) {
    throw new Error('name vacío');
  }

  const city = normalizeText(payload.ciudad);
  if (city && !ALLOWED_CIUDADES.includes(city as Plaza)) {
    throw new Error(`ciudad inválida: ${city}`);
  }

  const family = resolveFamily(payload);
  validateFamily(family);

  if (payload.disponibilidad !== undefined) {
    validateAvailability(payload.disponibilidad);
  }

  const { lat, lng } = validateCoordinates(payload.lat, payload.lng);
  validatePricingInput(payload.pricing);

  return {
    name,
    ciudad: (city || 'mendoza') as Plaza,
    family,
    tipo_soporte: familyToTipoSoporte(family),
    lat,
    lng,
    address: normalizeText(payload.address),
    description: normalizeText(payload.description),
    characteristics: normalizeText(payload.characteristics),
    mapa_url: normalizeText(payload.mapa_url),
    imageUrls: Array.isArray(payload.imageUrls) ? payload.imageUrls.filter((item) => typeof item === 'string' && item.trim()) : [],
    disponibilidad: payload.disponibilidad ?? 'disponible',
    availableFrom: payload.availableFrom === undefined ? undefined : payload.availableFrom === null ? null : normalizeText(payload.availableFrom),
    isFeatured: payload.isFeatured ?? false,
    active: payload.active ?? true,
  };
}

function mapPricingRow(row: SupportPricingRow | null | undefined): SupportPricing | null {
  if (!row) return null;
  return {
    exhibition_price: row.exhibitionPrice === null || row.exhibitionPrice === undefined ? 0 : Number(row.exhibitionPrice),
    installation_price: row.installationPrice === null || row.installationPrice === undefined ? 0 : Number(row.installationPrice),
    printing_price: row.printingPrice === null || row.printingPrice === undefined ? 0 : Number(row.printingPrice),
    monthly_price: row.monthlyPrice === null || row.monthlyPrice === undefined ? 0 : Number(row.monthlyPrice),
    exclusive_price: row.exclusivePrice === null || row.exclusivePrice === undefined ? 0 : Number(row.exclusivePrice),
    currency: (row.currency as SupportCurrency) || 'ARS',
    tax_included: row.taxIncluded ?? false,
    price_public: row.pricePublic ?? false,
  };
}

function mapMediaRows(rows: SupportMediaRow[], includePrivateStorageKey = false): SupportMediaItem[] {
  return rows
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id)
    .map((row) => {
      const metadata = (row.metadata as Record<string, unknown> | null) || undefined;
      const publicMetadata = metadata && !includePrivateStorageKey
        ? Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'storage_key'))
        : metadata;
      return {
        id: row.id,
        media_type: row.mediaType as SupportMediaType,
        url: typeof metadata?.storage_key === 'string' ? `/api/media/${row.id}` : row.url,
        title: row.title || undefined,
        alt: row.alt || undefined,
        mime_type: row.mimeType || undefined,
        sort_order: row.sortOrder,
        metadata: publicMetadata,
        active: row.active ?? true,
      };
    });
}

function mapTechnicalRow(row: SupportTechnicalRow | null | undefined): SupportTechnicalData | null {
  if (!row) return null;
  return {
    summary: row.summary || undefined,
    measures: row.measures || undefined,
    monthly_impacts: row.monthlyImpacts === null || row.monthlyImpacts === undefined ? null : Number(row.monthlyImpacts),
    resolution: row.resolution || undefined,
    turn_on_schedule: row.turnOnSchedule || undefined,
    daily_frequency: row.dailyFrequency || undefined,
    requirements: row.requirements || undefined,
    spot_duration_seconds: row.spotDurationSeconds ?? null,
    minimum_daily_outings: row.minimumDailyOutings ?? null,
    max_advertisers: row.maxAdvertisers ?? null,
    route_duration_hours: row.routeDurationHours === null || row.routeDurationHours === undefined ? null : Number(row.routeDurationHours),
    operation_days: row.operationDays || undefined,
    video_mode: row.videoMode || undefined,
  };
}

function mapRouteRow(row: SupportRouteRow | null | undefined): SupportRouteData | null {
  if (!row) return null;
  return {
    route_name: row.routeName || undefined,
    route_mode: row.routeMode || undefined,
    routePath: (row.routePath as [number, number][]) || [],
    waypoints: (row.waypoints as { name: string; lat: number | null; lng: number | null }[]) || [],
    default_route: row.defaultRoute ?? false,
    schedule: row.schedule || undefined,
    duration: row.duration || undefined,
    hours: row.hours || undefined,
    weekdays: row.weekdays || undefined,
    max_advertisers: row.maxAdvertisers ?? null,
    spot_duration_seconds: row.spotDurationSeconds ?? null,
    minimum_daily_outings: row.minimumDailyOutings ?? null,
    metadata: (row.metadata as Record<string, unknown>) || undefined,
  };
}

async function loadRelatedRecords(canonicalIds: string[]) {
  if (canonicalIds.length === 0) {
    return {
      locations: new Map<string, SupportLocationRow>(),
      technical: new Map<string, SupportTechnicalRow>(),
      pricing: new Map<string, SupportPricingRow>(),
      routes: new Map<string, SupportRouteRow>(),
      media: new Map<string, SupportMediaRow[]>(),
      faces: new Map<string, SupportFaceRow[]>(),
    };
  }

  const [locationsRows, technicalRows, pricingRows, routeRows, mediaRows, faceRows] = await Promise.all([
    db.select().from(supportLocations).where(inArray(supportLocations.supportCanonicalId, canonicalIds)),
    db.select().from(supportTechnical).where(inArray(supportTechnical.supportCanonicalId, canonicalIds)),
    db.select().from(supportPricing).where(inArray(supportPricing.supportCanonicalId, canonicalIds)),
    db.select().from(supportRoutes).where(inArray(supportRoutes.supportCanonicalId, canonicalIds)),
    db.select().from(supportMedia).where(inArray(supportMedia.supportCanonicalId, canonicalIds)),
    db.select().from(supportFaces).where(inArray(supportFaces.supportCanonicalId, canonicalIds)),
  ]);

  const locations = new Map<string, SupportLocationRow>();
  const technical = new Map<string, SupportTechnicalRow>();
  const pricing = new Map<string, SupportPricingRow>();
  const routes = new Map<string, SupportRouteRow>();
  const media = new Map<string, SupportMediaRow[]>();
  const faces = new Map<string, SupportFaceRow[]>();

  for (const row of locationsRows) locations.set(row.supportCanonicalId, row);
  for (const row of technicalRows) technical.set(row.supportCanonicalId, row);
  for (const row of pricingRows) pricing.set(row.supportCanonicalId, row);
  for (const row of routeRows) routes.set(row.supportCanonicalId, row);
  for (const row of mediaRows) {
    const current = media.get(row.supportCanonicalId) || [];
    current.push(row);
    media.set(row.supportCanonicalId, current);
  }
  for (const row of faceRows) {
    const current = faces.get(row.supportCanonicalId) || [];
    current.push(row);
    faces.set(row.supportCanonicalId, current);
  }

  return { locations, technical, pricing, routes, media, faces };
}

function rowToInventoryItem(
  row: SupportRow,
  related: Awaited<ReturnType<typeof loadRelatedRecords>>
): InventoryItem {
  const location = related.locations.get(row.canonicalId);
  const technical = related.technical.get(row.canonicalId);
  const pricing = related.pricing.get(row.canonicalId);
  const route = related.routes.get(row.canonicalId);
  const media = mapMediaRows(related.media.get(row.canonicalId) || []);
  const family = (row.family as SupportFamily) || resolveFamily({ tipo_soporte: row.tipoSoporte as TipoSoporte });
  const isMobile = family === 'led_mobile' || row.tipoSoporte === 'led_movil';
  const imageUrls = media.filter((entry) => entry.media_type === 'image' && entry.active !== false).map((entry) => entry.url);
  const fallbackImages = (row.imageUrls as string[]) || [];

  const base = {
    canonical_id: row.canonicalId,
    name: row.name,
    ciudad: row.ciudad as Plaza,
    tipo_soporte: familyToTipoSoporte(family),
    family,
    active: row.active ?? true,
    description: row.description || '',
    characteristics: row.characteristics || '',
    mapa_url: row.mapaUrl || '',
    imageUrls: imageUrls.length > 0 ? imageUrls : fallbackImages,
    disponibilidad: (row.disponibilidad as Disponibilidad) || 'disponible',
    availableFrom: row.availableFrom || undefined,
    isFeatured: row.isFeatured ?? false,
    pricing: mapPricingRow(pricing) ?? undefined,
    media,
    technical: mapTechnicalRow(technical) ?? undefined,
  };

  if (isMobile) {
    const routeData = mapRouteRow(route);
    return {
      ...base,
      schedule: routeData?.schedule || row.schedule || '',
      duration: routeData?.duration || row.duration || '',
      waypoints: routeData?.waypoints || ((row.waypoints as any[]) || []),
      routePath: routeData?.routePath || ((row.routePath as [number, number][]) || []),
    } as MobileRoute;
  }

  const locationLat = location?.lat ?? row.lat;
  const locationLng = location?.lng ?? row.lng;
  const locationAddress = location?.address ?? row.address ?? '';

  return {
    ...base,
    lat: locationLat !== null && locationLat !== undefined ? Number(locationLat) : null,
    lng: locationLng !== null && locationLng !== undefined ? Number(locationLng) : null,
    address: locationAddress || '',
  } as LocationRecord;
}

export async function getSupportCatalog(options?: { includeInactive?: boolean; includeUnassigned?: boolean }): Promise<InventoryItem[]> {
  const rows = options?.includeUnassigned
    ? await db.select().from(supports)
    : await db.select().from(supports).where(isNotNull(supports.tenantId));
  const filtered = rows.filter((row) => {
    const isComplete = Boolean(row.canonicalId && row.name && row.ciudad && row.tipoSoporte);
    const isActive = options?.includeInactive ? true : row.active !== false;
    const hasTenant = options?.includeUnassigned ? true : isSupportEligibleForPublicCatalog(row.tenantId, row.active !== false);
    return isComplete && isActive && hasTenant;
  });
  const canonicalIds = filtered.map((row) => row.canonicalId);
  const related = await loadRelatedRecords(canonicalIds);
  return filtered.map((row) => rowToInventoryItem(row, related));
}

export async function getSupportDetail(canonicalId: string, options?: { includeInactive?: boolean; includeUnassigned?: boolean }): Promise<InventoryItem | null> {
  const rows = await db.select().from(supports).where(eq(supports.canonicalId, canonicalId));
  if (rows.length === 0) return null;
  const row = rows[0];
  if (!(row.canonicalId && row.name && row.ciudad && row.tipoSoporte)) return null;
  if (!options?.includeUnassigned && !isSupportEligibleForPublicCatalog(row.tenantId, row.active !== false)) return null;
  if (!options?.includeInactive && row.active === false) return null;
  const related = await loadRelatedRecords([canonicalId]);
  return rowToInventoryItem(row, related);
}

export function generateCanonicalId(name: string, ciudad: Plaza, family: SupportFamily) {
  const base = toSnakeCase(`${ciudad}-${family}-${name}`);
  const hash = crypto.createHash('sha1').update(base).digest('hex').slice(0, 6);
  return `${base.slice(0, 42)}-${hash}`.replace(/-+/g, '-');
}

export async function ensureUniqueCanonicalId(candidate: string) {
  let canonicalId = candidate;
  let suffix = 1;
  while (true) {
    const existing = await db.select({ id: supports.id }).from(supports).where(eq(supports.canonicalId, canonicalId));
    if (existing.length === 0) return canonicalId;
    canonicalId = `${candidate}-${suffix}`;
    suffix += 1;
  }
}

function buildSupportCoreValues(canonicalId: string, payload: SupportWritePayload) {
  const normalized = validateSupportPayload(payload);
  return {
    canonicalId,
    name: normalized.name,
    ciudad: normalized.ciudad,
    tipoSoporte: normalized.tipo_soporte,
    family: normalized.family,
    active: normalized.active ?? true,
    lat: normalized.lat === null ? null : String(normalized.lat),
    lng: normalized.lng === null ? null : String(normalized.lng),
    address: normalized.address || null,
    description: normalized.description || null,
    characteristics: normalized.characteristics || null,
    mapaUrl: normalized.mapa_url || null,
    imageUrls: normalized.imageUrls || [],
    disponibilidad: normalized.disponibilidad,
    availableFrom: normalized.availableFrom || null,
    isFeatured: normalized.isFeatured ?? false,
    schedule: payload.route?.schedule || null,
    duration: payload.route?.duration || null,
    waypoints: payload.route?.waypoints || null,
    routePath: payload.route?.routePath || null,
  };
}

async function syncSupportLocation(canonicalId: string, payload: SupportWritePayload, core: ReturnType<typeof buildSupportCoreValues>) {
  await db
    .insert(supportLocations)
    .values({
      supportCanonicalId: canonicalId,
      name: core.name,
      ciudad: core.ciudad,
      family: core.family,
      category: payload.category || core.family,
      lat: core.lat === null ? null : String(core.lat),
      lng: core.lng === null ? null : String(core.lng),
      address: core.address,
      mapaUrl: core.mapaUrl,
      availability: core.disponibilidad,
      availableFrom: core.availableFrom,
      active: core.active,
      isFeatured: core.isFeatured,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: supportLocations.supportCanonicalId,
      set: {
        name: core.name,
        ciudad: core.ciudad,
        family: core.family,
        category: payload.category || core.family,
        lat: core.lat,
        lng: core.lng,
        address: core.address,
        mapaUrl: core.mapaUrl,
        availability: core.disponibilidad,
        availableFrom: core.availableFrom,
        active: core.active,
        isFeatured: core.isFeatured,
        updatedAt: new Date(),
      },
    });
}

async function syncSupportTechnical(canonicalId: string, payload: SupportWritePayload) {
  const technical = payload.technical || {};
  await db
    .insert(supportTechnical)
    .values({
      supportCanonicalId: canonicalId,
      summary: technical.summary || null,
      measures: technical.measures || null,
      monthlyImpacts: technical.monthly_impacts === undefined || technical.monthly_impacts === null || technical.monthly_impacts === '' ? null : String(technical.monthly_impacts),
      resolution: technical.resolution || null,
      turnOnSchedule: technical.turn_on_schedule || null,
      dailyFrequency: technical.daily_frequency || null,
      requirements: technical.requirements || null,
      spotDurationSeconds: technical.spot_duration_seconds ?? null,
      minimumDailyOutings: technical.minimum_daily_outings ?? null,
      maxAdvertisers: technical.max_advertisers ?? null,
      routeDurationHours: technical.route_duration_hours === undefined || technical.route_duration_hours === null ? null : String(technical.route_duration_hours),
      operationDays: technical.operation_days || null,
      videoMode: technical.video_mode || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: supportTechnical.supportCanonicalId,
      set: {
        summary: technical.summary || null,
        measures: technical.measures || null,
        monthlyImpacts: technical.monthly_impacts === undefined || technical.monthly_impacts === null || technical.monthly_impacts === '' ? null : String(technical.monthly_impacts),
        resolution: technical.resolution || null,
        turnOnSchedule: technical.turn_on_schedule || null,
        dailyFrequency: technical.daily_frequency || null,
        requirements: technical.requirements || null,
        spotDurationSeconds: technical.spot_duration_seconds ?? null,
        minimumDailyOutings: technical.minimum_daily_outings ?? null,
        maxAdvertisers: technical.max_advertisers ?? null,
        routeDurationHours: technical.route_duration_hours === undefined || technical.route_duration_hours === null ? null : String(technical.route_duration_hours),
        operationDays: technical.operation_days || null,
        videoMode: technical.video_mode || null,
        updatedAt: new Date(),
      },
    });
}

async function syncSupportPricing(canonicalId: string, payload: SupportWritePayload) {
  const pricing = payload.pricing || {};
  await db
    .insert(supportPricing)
    .values({
      supportCanonicalId: canonicalId,
      exhibitionPrice: pricing.exhibition_price === undefined || pricing.exhibition_price === null ? '0' : String(pricing.exhibition_price),
      installationPrice: pricing.installation_price === undefined || pricing.installation_price === null ? '0' : String(pricing.installation_price),
      printingPrice: pricing.printing_price === undefined || pricing.printing_price === null ? '0' : String(pricing.printing_price),
      monthlyPrice: pricing.monthly_price === undefined || pricing.monthly_price === null ? '0' : String(pricing.monthly_price),
      exclusivePrice: pricing.exclusive_price === undefined || pricing.exclusive_price === null ? '0' : String(pricing.exclusive_price),
      currency: (pricing.currency as SupportCurrency) || 'ARS',
      taxIncluded: pricing.tax_included ?? false,
      pricePublic: pricing.price_public ?? false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: supportPricing.supportCanonicalId,
      set: {
        exhibitionPrice: pricing.exhibition_price === undefined || pricing.exhibition_price === null ? '0' : String(pricing.exhibition_price),
        installationPrice: pricing.installation_price === undefined || pricing.installation_price === null ? '0' : String(pricing.installation_price),
        printingPrice: pricing.printing_price === undefined || pricing.printing_price === null ? '0' : String(pricing.printing_price),
        monthlyPrice: pricing.monthly_price === undefined || pricing.monthly_price === null ? '0' : String(pricing.monthly_price),
        exclusivePrice: pricing.exclusive_price === undefined || pricing.exclusive_price === null ? '0' : String(pricing.exclusive_price),
        currency: (pricing.currency as SupportCurrency) || 'ARS',
        taxIncluded: pricing.tax_included ?? false,
        pricePublic: pricing.price_public ?? false,
        updatedAt: new Date(),
      },
    });
}

async function syncSupportRoute(canonicalId: string, payload: SupportWritePayload, core: ReturnType<typeof buildSupportCoreValues>) {
  const route = payload.route || {};
  await db
    .insert(supportRoutes)
    .values({
      supportCanonicalId: canonicalId,
      routeName: route.route_name || core.name,
      routeMode: route.route_mode || core.family,
      routePath: (route.routePath as [number, number][]) || core.routePath || [],
      waypoints: (route.waypoints as { name: string; lat: number | null; lng: number | null }[]) || core.waypoints || [],
      defaultRoute: route.default_route ?? false,
      schedule: route.schedule || core.schedule || null,
      duration: route.duration || core.duration || null,
      hours: route.hours || null,
      weekdays: route.weekdays || null,
      maxAdvertisers: route.max_advertisers ?? null,
      spotDurationSeconds: route.spot_duration_seconds ?? null,
      minimumDailyOutings: route.minimum_daily_outings ?? null,
      metadata: route.metadata || null,
      active: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: supportRoutes.supportCanonicalId,
      set: {
        routeName: route.route_name || core.name,
        routeMode: route.route_mode || core.family,
        routePath: (route.routePath as [number, number][]) || core.routePath || [],
        waypoints: (route.waypoints as { name: string; lat: number | null; lng: number | null }[]) || core.waypoints || [],
        defaultRoute: route.default_route ?? false,
        schedule: route.schedule || core.schedule || null,
        duration: route.duration || core.duration || null,
        hours: route.hours || null,
        weekdays: route.weekdays || null,
        maxAdvertisers: route.max_advertisers ?? null,
        spotDurationSeconds: route.spot_duration_seconds ?? null,
        minimumDailyOutings: route.minimum_daily_outings ?? null,
        metadata: route.metadata || null,
        active: true,
        updatedAt: new Date(),
      },
    });
}

async function syncSupportFaces(canonicalId: string, payload: SupportWritePayload, family: SupportFamily) {
  const faces = payload.faces && payload.faces.length > 0
    ? payload.faces
    : family === 'led_mobile'
      ? [
          {
            face_key: 'left',
            label: 'Cara lateral izquierda',
            side: 'left',
            width_meters: 4,
            height_meters: 2,
            width_pixels: 1024,
            height_pixels: 512,
            substrate: 'LED P3',
            sort_order: 1,
          },
          {
            face_key: 'right',
            label: 'Cara lateral derecha',
            side: 'right',
            width_meters: 4,
            height_meters: 2,
            width_pixels: 1024,
            height_pixels: 512,
            substrate: 'LED P3',
            sort_order: 2,
          },
          {
            face_key: 'rear',
            label: 'Cara posterior',
            side: 'rear',
            width_meters: 2,
            height_meters: 2,
            width_pixels: 512,
            height_pixels: 512,
            substrate: 'LED P3',
            sort_order: 3,
          },
        ]
      : [
          {
            face_key: 'front',
            label: 'Cara principal',
            side: 'front',
            width_meters: null,
            height_meters: null,
            width_pixels: null,
            height_pixels: null,
            substrate: payload.characteristics || 'Frontlight',
            sort_order: 1,
          },
        ];

  await db.delete(supportFaces).where(eq(supportFaces.supportCanonicalId, canonicalId));
  for (const face of faces) {
    await db.insert(supportFaces).values({
      supportCanonicalId: canonicalId,
      faceKey: face.face_key,
      label: face.label,
      side: face.side || null,
      widthMeters: face.width_meters === undefined || face.width_meters === null ? null : String(face.width_meters),
      heightMeters: face.height_meters === undefined || face.height_meters === null ? null : String(face.height_meters),
      widthPixels: face.width_pixels ?? null,
      heightPixels: face.height_pixels ?? null,
      substrate: face.substrate || null,
      notes: face.notes || null,
      active: face.active ?? true,
      sortOrder: face.sort_order ?? 0,
      metadata: face.metadata || null,
      updatedAt: new Date(),
    });
  }
}

async function syncSupportMedia(canonicalId: string, payload: SupportWritePayload) {
  if (!payload.media) return;
  const existing = await db.select().from(supportMedia).where(eq(supportMedia.supportCanonicalId, canonicalId));

  const incomingUrls = new Set(payload.media.map(m => m.url));

  // 1. Delete rows from database that are no longer present in incomingUrls
  for (const row of existing) {
    if (!incomingUrls.has(row.url)) {
      await db.delete(supportMedia).where(eq(supportMedia.id, row.id));

      const storageKey = (row.metadata as any)?.storage_key;
      if (storageKey) {
        try {
          const isR2Configured = process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;
          if (isR2Configured) {
            const { getStorageAdapter } = await import('./r2StorageAdapter.ts');
            await getStorageAdapter().delete(storageKey);
          }
        } catch (cleanupError) {
          console.error('R2 deletion of orphaned media failed:', cleanupError);
        }
      }
    }
  }

  // 2. Insert or update the incoming media
  for (const [index, media] of payload.media.entries()) {
    validateMediaType(media.media_type);
    const existingRow = existing.find(row => row.url === media.url);

    if (existingRow) {
      // Merge metadata, prioritizing existing R2 metadata
      const mergedMetadata = {
        ...(media.metadata || {}),
        ...(existingRow.metadata || {}),
      };

      await db
        .update(supportMedia)
        .set({
          mediaType: media.media_type,
          title: media.title || existingRow.title,
          alt: media.alt || existingRow.alt,
          mimeType: media.mime_type || existingRow.mimeType,
          sortOrder: media.sort_order ?? index,
          metadata: mergedMetadata,
          active: media.active ?? existingRow.active,
          updatedAt: new Date(),
        })
        .where(eq(supportMedia.id, existingRow.id));
    } else {
      await db.insert(supportMedia).values({
        supportCanonicalId: canonicalId,
        mediaType: media.media_type,
        url: media.url,
        title: media.title || null,
        alt: media.alt || null,
        mimeType: media.mime_type || null,
        sortOrder: media.sort_order ?? index,
        metadata: media.metadata || null,
        active: media.active ?? true,
        updatedAt: new Date(),
      });
    }
  }
}

export async function upsertSupportRecord(canonicalId: string, payload: SupportWritePayload) {
  const core = buildSupportCoreValues(canonicalId, payload);
  const existing = await db.select({ canonicalId: supports.canonicalId }).from(supports).where(eq(supports.canonicalId, canonicalId));
  if (existing.length === 0) {
    await db.insert(supports).values(core);
  } else {
    await db.update(supports).set({ ...core, updatedAt: new Date() }).where(eq(supports.canonicalId, canonicalId));
  }

  await syncSupportLocation(canonicalId, payload, core);
  if (payload.technical !== undefined) {
    await syncSupportTechnical(canonicalId, payload);
  }
  if (payload.pricing !== undefined) {
    await syncSupportPricing(canonicalId, payload);
  }
  if (payload.route !== undefined) {
    await syncSupportRoute(canonicalId, payload, core);
  }
  const faceRows = await db.select({ id: supportFaces.id }).from(supportFaces).where(eq(supportFaces.supportCanonicalId, canonicalId));
  if (payload.faces !== undefined || faceRows.length === 0) {
    await syncSupportFaces(canonicalId, payload, core.family);
  }
  if (payload.media !== undefined) {
    await syncSupportMedia(canonicalId, payload);
  }

  const item = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!item) {
    throw new Error(`No se pudo reconstruir el soporte '${canonicalId}'.`);
  }
  return item;
}

export async function patchSupportRecord(canonicalId: string, payload: SupportWritePayload) {
  const existing = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!existing) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  const coreSource = existing as any;
  return upsertSupportRecord(canonicalId, {
    name: payload.name ?? coreSource.name,
    ciudad: payload.ciudad ?? coreSource.ciudad,
    family: payload.family ?? coreSource.family,
    category: payload.category ?? coreSource.family,
    tipo_soporte: payload.tipo_soporte ?? coreSource.tipo_soporte,
    lat: hasOwn(payload, 'lat') ? payload.lat : coreSource.lat,
    lng: hasOwn(payload, 'lng') ? payload.lng : coreSource.lng,
    address: hasOwn(payload, 'address') ? payload.address : coreSource.address,
    description: hasOwn(payload, 'description') ? payload.description : coreSource.description,
    characteristics: hasOwn(payload, 'characteristics')
      ? payload.characteristics
      : coreSource.characteristics,
    mapa_url: hasOwn(payload, 'mapa_url') ? payload.mapa_url : coreSource.mapa_url,
    imageUrls: hasOwn(payload, 'imageUrls') ? payload.imageUrls : coreSource.imageUrls,
    disponibilidad: hasOwn(payload, 'disponibilidad')
      ? payload.disponibilidad
      : coreSource.disponibilidad,
    availableFrom: hasOwn(payload, 'availableFrom')
      ? payload.availableFrom
      : coreSource.availableFrom,
    isFeatured: hasOwn(payload, 'isFeatured')
      ? payload.isFeatured
      : coreSource.isFeatured,
    active: hasOwn(payload, 'active') ? payload.active : coreSource.active,
    technical: payload.technical,
    pricing: payload.pricing,
    ...(payload.route !== undefined ? { route: payload.route } : {}),
    media: payload.media,
    faces: payload.faces,
  });
}

export async function deleteSupportRecord(canonicalId: string) {
  const existing = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!existing) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  await db.update(supports).set({ active: false, updatedAt: new Date() }).where(eq(supports.canonicalId, canonicalId));
  await db.update(supportLocations).set({ active: false, updatedAt: new Date() }).where(eq(supportLocations.supportCanonicalId, canonicalId));
  await db.update(supportTechnical).set({ updatedAt: new Date() }).where(eq(supportTechnical.supportCanonicalId, canonicalId));
  await db.update(supportPricing).set({ updatedAt: new Date() }).where(eq(supportPricing.supportCanonicalId, canonicalId));
  await db.update(supportRoutes).set({ active: false, updatedAt: new Date() }).where(eq(supportRoutes.supportCanonicalId, canonicalId));
  await db.update(supportFaces).set({ active: false, updatedAt: new Date() }).where(eq(supportFaces.supportCanonicalId, canonicalId));
  await db.update(supportMedia).set({ active: false, updatedAt: new Date() }).where(eq(supportMedia.supportCanonicalId, canonicalId));
  return { ...existing, active: false };
}

export async function getSupportPricingRecord(canonicalId: string) {
  const rows = await db.select().from(supportPricing).where(eq(supportPricing.supportCanonicalId, canonicalId));
  return mapPricingRow(rows[0]);
}

export async function updateSupportPricingRecord(canonicalId: string, pricing: Partial<SupportPricing> & { currency?: SupportCurrency | string }) {
  const support = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!support) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  validatePricingInput(pricing);
  const existing = await db.select().from(supportPricing).where(eq(supportPricing.supportCanonicalId, canonicalId));
  const row = existing[0];
  const values = {
    supportCanonicalId: canonicalId,
    exhibitionPrice: pricing.exhibition_price === undefined ? (row?.exhibitionPrice ?? '0') : String(pricing.exhibition_price),
    installationPrice: pricing.installation_price === undefined ? (row?.installationPrice ?? '0') : String(pricing.installation_price),
    printingPrice: pricing.printing_price === undefined ? (row?.printingPrice ?? '0') : String(pricing.printing_price),
    monthlyPrice: pricing.monthly_price === undefined ? (row?.monthlyPrice ?? '0') : String(pricing.monthly_price),
    exclusivePrice: pricing.exclusive_price === undefined ? (row?.exclusivePrice ?? '0') : String(pricing.exclusive_price),
    currency: (pricing.currency as SupportCurrency) || (row?.currency as SupportCurrency) || 'ARS',
    taxIncluded: pricing.tax_included ?? row?.taxIncluded ?? false,
    pricePublic: pricing.price_public ?? row?.pricePublic ?? false,
    updatedAt: new Date(),
  };
  await db
    .insert(supportPricing)
    .values(values)
    .onConflictDoUpdate({
      target: supportPricing.supportCanonicalId,
      set: values,
    });
  return getSupportPricingRecord(canonicalId);
}

export async function getSupportRouteRecord(canonicalId: string) {
  const rows = await db.select().from(supportRoutes).where(eq(supportRoutes.supportCanonicalId, canonicalId));
  return mapRouteRow(rows[0]);
}

export async function updateSupportRouteRecord(canonicalId: string, route: Partial<SupportRouteData>) {
  const support = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!support) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  const existing = await db.select().from(supportRoutes).where(eq(supportRoutes.supportCanonicalId, canonicalId));
  const row = existing[0];
  const values = {
    supportCanonicalId: canonicalId,
    routeName: route.route_name ?? row?.routeName ?? null,
    routeMode: route.route_mode ?? row?.routeMode ?? null,
    routePath: route.routePath ?? row?.routePath ?? [],
    waypoints: route.waypoints ?? row?.waypoints ?? [],
    defaultRoute: route.default_route ?? row?.defaultRoute ?? false,
    schedule: route.schedule ?? row?.schedule ?? null,
    duration: route.duration ?? row?.duration ?? null,
    hours: route.hours ?? row?.hours ?? null,
    weekdays: route.weekdays ?? row?.weekdays ?? null,
    maxAdvertisers: route.max_advertisers ?? row?.maxAdvertisers ?? null,
    spotDurationSeconds: route.spot_duration_seconds ?? row?.spotDurationSeconds ?? null,
    minimumDailyOutings: route.minimum_daily_outings ?? row?.minimumDailyOutings ?? null,
    metadata: route.metadata ?? row?.metadata ?? null,
    active: true,
    updatedAt: new Date(),
  };
  await db
    .insert(supportRoutes)
    .values(values)
    .onConflictDoUpdate({
      target: supportRoutes.supportCanonicalId,
      set: values,
    });
  return getSupportRouteRecord(canonicalId);
}

export async function listSupportMediaRecords(canonicalId: string) {
  const rows = await db.select().from(supportMedia).where(eq(supportMedia.supportCanonicalId, canonicalId));
  return mapMediaRows(rows, true);
}

export async function createSupportMediaRecord(canonicalId: string, media: SupportMediaInput) {
  const support = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!support) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  validateMediaType(media.media_type);
  const [created] = await db
    .insert(supportMedia)
    .values({
      supportCanonicalId: canonicalId,
      mediaType: media.media_type,
      url: media.url,
      title: media.title || null,
      alt: media.alt || null,
      mimeType: media.mime_type || null,
      sortOrder: media.sort_order ?? 0,
      metadata: media.metadata || null,
      active: media.active ?? true,
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateSupportMediaRecord(canonicalId: string, mediaId: number, media: Partial<SupportMediaInput>) {
  const support = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!support) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  if (media.media_type) validateMediaType(media.media_type);
  const result = await db
    .update(supportMedia)
    .set({
      mediaType: media.media_type,
      url: media.url,
      title: media.title,
      alt: media.alt,
      mimeType: media.mime_type,
      sortOrder: media.sort_order,
      metadata: media.metadata,
      active: media.active,
      updatedAt: new Date(),
    })
    .where(and(eq(supportMedia.supportCanonicalId, canonicalId), eq(supportMedia.id, mediaId)))
    .returning();
  if (result.length === 0) {
    throw new Error(`Media '${mediaId}' no encontrada para el soporte '${canonicalId}'.`);
  }
  return result[0];
}

export async function deleteSupportMediaRecord(canonicalId: string, mediaId: number) {
  const support = await getSupportDetail(canonicalId, { includeInactive: true });
  if (!support) {
    throw new Error(`Soporte con ID '${canonicalId}' no encontrado.`);
  }
  const result = await db
    .update(supportMedia)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(supportMedia.supportCanonicalId, canonicalId), eq(supportMedia.id, mediaId)))
    .returning();
  if (result.length === 0) {
    throw new Error(`Media '${mediaId}' no encontrada para el soporte '${canonicalId}'.`);
  }
  return result[0];
}

export function toPublicSupportList(items: InventoryItem[]) {
  return items.map((item) => ({
    ...item,
    imageUrls: item.imageUrls || [],
  }));
}
