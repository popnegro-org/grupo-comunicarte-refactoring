import type { InventoryItem } from '../types.ts';

/**
 * Public inventory DTO boundary: internal pricing and ownership are never public.
 * Admin inventory may retain tenant ownership for explicit operational assignment,
 * but pricing remains available only through protected pricing endpoints.
 */
export function sanitizePublicSupport(item: InventoryItem, includeOwnership = false): InventoryItem {
  const { pricing: _pricing, tenant_id: _tenantId, tenant_ownership_evidence: _ownershipEvidence, ...safeItem } = item as InventoryItem & { pricing?: unknown; tenant_id?: unknown; tenant_ownership_evidence?: unknown };
  return (includeOwnership ? { ...safeItem, tenant_id: (item as any).tenant_id ?? null, tenant_ownership_evidence: (item as any).tenant_ownership_evidence ?? null } : safeItem) as InventoryItem;
}
