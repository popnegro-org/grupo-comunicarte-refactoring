import { getSupportCatalog, getSupportDetail } from './supportModel.ts';
import { db } from '../db/index.ts';
import { supportTechnical } from '../db/schema.ts';
import { inArray } from 'drizzle-orm';
import { InventoryItem } from '../types.ts';

/**
 * Public inventory DTO boundary.
 * Pricing is intentionally removed from all public catalog/detail responses.
 * Administrative pricing remains available through protected /api/admin/* pricing endpoints.
 */
function sanitizePublicSupport(item: InventoryItem): InventoryItem {
  const { pricing: _pricing, ...publicItem } = item as InventoryItem & { pricing?: unknown };
  return publicItem as InventoryItem;
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
  return enriched.map(sanitizePublicSupport);
}

export async function getSupportByIdFromDB(canonicalId: string, options?: { includeInactive?: boolean; includeUnassigned?: boolean }): Promise<InventoryItem | null> {
  const support = await getSupportDetail(canonicalId, options);
  if (!support) return null;
  const [enriched] = await enrichTechnicalMetadata([support]);
  return sanitizePublicSupport(enriched);
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
