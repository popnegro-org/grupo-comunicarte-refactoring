import { getSupportCatalog, getSupportDetail } from './supportModel.ts';
import { db } from '../db/index.ts';
import { supportTechnical } from '../db/schema.ts';
import { inArray } from 'drizzle-orm';
import { InventoryItem } from '../types.ts';
import { sanitizePublicSupport } from './publicSupportDto.ts';
import { getStorageAdapter, isSafeSupportMediaKey } from './r2StorageAdapter.ts';

const R2_URI_PREFIX = 'r2://';

/** Resolve private R2 object references into short-lived read URLs for public catalog imagery. */
function resolvePublicMediaUrl(canonicalId: string, media: { url: string; metadata?: Record<string, unknown>; media_type?: string }): string | null {
  // Storage-backed media rows use this same-origin route, which checks public-catalog eligibility\n  // before redirecting to a short-lived R2 URL.\n  if (/^\/api\/media\/[1-9]\\d*$/.test(media.url)) return media.url;\n  if (!media.url.startsWith(R2_URI_PREFIX)) return /^https?:\/\//i.test(media.url) ? media.url : null;
  const metadataKey = typeof media.metadata?.storage_key === 'string' ? media.metadata.storage_key : '';
  const key = metadataKey || media.url.slice(R2_URI_PREFIX.length);
  if (!isSafeSupportMediaKey(canonicalId, key)) return null;
  try {
    return getStorageAdapter().getAssetUrl(key, 300);
  } catch (error) {
    console.warn(`Unable to sign public support image for ${canonicalId}:`, error);
    return null;
  }
}

function withPublicMediaUrls(item: InventoryItem): InventoryItem {
  const media = (item.media || [])
    .filter((entry) => entry.active !== false && (entry.media_type === 'image' || entry.media_type === 'video'))
    .map((entry) => ({ ...entry, url: resolvePublicMediaUrl(item.canonical_id, entry) }))
    .filter((entry): entry is typeof entry & { url: string } => Boolean(entry.url));
  const imageUrls = media.filter((entry) => entry.media_type === 'image').map((entry) => entry.url);
  const legacyImageUrls = (item.imageUrls || [])
    .map((url) => resolvePublicMediaUrl(item.canonical_id, { url, media_type: 'image' }))
    .filter((url): url is string => Boolean(url));
  return { ...item, media, imageUrls: imageUrls.length ? imageUrls : legacyImageUrls } as InventoryItem;
}

function monthlyImpactsFromMetadata(metadata: unknown): number | string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  const value = record.monthly_impacts ?? record.monthlyImpacts ?? record.impactos_mensuales;
  return typeof value === 'number' || typeof value === 'string' ? value : null;
}

async function enrichTechnicalMetadata(items: InventoryItem[]): Promise<InventoryItem[]> {
  if (items.length === 0) return items;

  const canonicalIds = items.map((item) => item.canonical_id).filter(Boolean);
  if (canonicalIds.length === 0) return items;

  try {
    const rows = await db
      .select({ canonicalId: supportTechnical.supportCanonicalId, metadata: supportTechnical.metadata })
      .from(supportTechnical)
      .where(inArray(supportTechnical.supportCanonicalId, canonicalIds));

    const metadataById = new Map(rows.map((row) => [row.canonicalId, row.metadata]));

    return items.map((item) => {
      const persistedMetadata = metadataById.get(item.canonical_id);
      if (!persistedMetadata && !item.technical?.metadata) return item;

      const metadata = {
        ...((persistedMetadata as Record<string, unknown> | null | undefined) || {}),
        ...((item.technical?.metadata as Record<string, unknown> | undefined) || {}),
      };
      const monthlyImpacts = item.technical?.monthly_impacts ?? monthlyImpactsFromMetadata(metadata);

      return {
        ...item,
        technical: {
          ...(item.technical || {}),
          ...(monthlyImpacts !== null ? { monthly_impacts: monthlyImpacts } : {}),
          metadata,
        },
      } as InventoryItem;
    });
  } catch (error) {
    console.warn('Unable to enrich support technical metadata:', error);
    return items;
  }
}

export async function getAllSupportsFromDB(options?: { includeInactive?: boolean; includeUnassigned?: boolean }): Promise<InventoryItem[]> {
  const supports = await getSupportCatalog(options);
  const enriched = await enrichTechnicalMetadata(supports);
  return enriched.map((item) => withPublicMediaUrls(sanitizePublicSupport(item, options?.includeUnassigned === true)));
}

export async function getSupportByIdFromDB(canonicalId: string, options?: { includeInactive?: boolean; includeUnassigned?: boolean }): Promise<InventoryItem | null> {
  const support = await getSupportDetail(canonicalId, options);
  if (!support) return null;
  const [enriched] = await enrichTechnicalMetadata([support]);
  return withPublicMediaUrls(sanitizePublicSupport(enriched, options?.includeUnassigned === true));
}

export async function validateSupportsForRequest(selectedIds: string[]): Promise<{
  valid: boolean;
  statusCode?: number;
  message?: string;
  matchedSupports?: InventoryItem[];
}> {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Debes seleccionar al menos un soporte para solicitar el Media Kit.',
    };
  }

  if (selectedIds.some((id) => typeof id !== 'string' || !id.trim())) {
    return {
      valid: false,
      statusCode: 400,
      message: 'La selección contiene identificadores de soporte inválidos.',
    };
  }

  if (new Set(selectedIds).size !== selectedIds.length) {
    return {
      valid: false,
      statusCode: 400,
      message: 'La selección contiene soportes duplicados.',
    };
  }

  // Fetch the catalog once and resolve all requested IDs in memory instead of
  // issuing one support + technical-metadata query per selected item.
  const catalog = await getAllSupportsFromDB();
  const supportsById = new Map(catalog.map((item) => [item.canonical_id, item]));
  const matchedSupports: InventoryItem[] = [];

  for (const id of selectedIds) {
    const item = supportsById.get(id);
    if (!item) {
      return {
        valid: false,
        statusCode: 404,
        message: `El soporte con ID '${id}' no existe en el catálogo.`,
      };
    }

    if (item.disponibilidad !== 'disponible') {
      return {
        valid: false,
        statusCode: 409,
        message: `El soporte '${item.name}' no está disponible (estado: ${item.disponibilidad}) y no puede incluirse en el Media Kit.`,
      };
    }

    matchedSupports.push(item);
  }

  return { valid: true, matchedSupports };
}
