/** Commercial ownership and eligibility rules only; this module is not an authorization or membership layer. */
/** Ownership is assigned once from documentary evidence; reassignments need a separate audited correction flow. */
export function resolveSupportTenantAssignment(
  currentTenantId: string | null | undefined,
  requestedTenantId: string | null | undefined,
): { allowed: true; tenantId: string | null } | { allowed: false; reason: 'ownership_reassignment_requires_audit' } {
  const current = typeof currentTenantId === 'string' && currentTenantId.trim() ? currentTenantId.trim() : null;
  const requested = typeof requestedTenantId === 'string' && requestedTenantId.trim() ? requestedTenantId.trim() : null;
  if (current && requested && current !== requested) {
    return { allowed: false, reason: 'ownership_reassignment_requires_audit' };
  }
  return { allowed: true, tenantId: requested ?? current };
}

/** Missing ownership is quarantine, never a city-based tenant inference. */
export function getSupportTenantState(tenantId: string | null | undefined): 'assigned' | 'pending' {
  return typeof tenantId === 'string' && tenantId.trim().length > 0 ? 'assigned' : 'pending';
}


/** Public catalog eligibility is fail-closed: an active support needs an assigned tenant. */
export function isSupportEligibleForPublicCatalog(tenantId: string | null | undefined, active: boolean): boolean {
  return active && getSupportTenantState(tenantId) === 'assigned';
}


/** A mixed request is global; any pending ownership keeps the scope unclassified. */
export function deriveRequestScope(tenantIds: Array<string | null | undefined>, hasPendingOwnership = false): 'tenant' | 'global' | null {
  const assigned = [...new Set(tenantIds.filter((tenantId): tenantId is string => typeof tenantId === 'string' && tenantId.trim().length > 0))];
  if (hasPendingOwnership || assigned.length === 0) return null;
  return assigned.length > 1 ? 'global' : 'tenant';
}

/** Media Kits belong to one tenant or are global when they contain multiple tenants. */
export function resolveMediaKitTenantId(tenantIds: Array<string | null | undefined>): string | null {
  const assigned = [...new Set(tenantIds.filter((tenantId): tenantId is string => typeof tenantId === 'string' && tenantId.trim().length > 0))];
  return assigned.length === 1 ? assigned[0] : null;
}


/** A commercial request line is valid only when its stored tenant matches the current support owner. */
export function areRequestItemOwnershipsConsistent(
  items: Array<{ itemTenantId: string | null | undefined; supportTenantId: string | null | undefined }>,
): boolean {
  return items.length > 0 && items.every(({ itemTenantId, supportTenantId }) =>
    typeof itemTenantId === 'string' && itemTenantId.trim().length > 0 &&
    typeof supportTenantId === 'string' && supportTenantId.trim().length > 0 &&
    itemTenantId === supportTenantId
  );
}


/** A support can enter a new commercial request only when active, available and ownership-assigned. */
export function isSupportSelectableForCommercialRequest(support: {
  tenantId?: string | null;
  tenant_id?: string | null;
  active?: boolean | null;
  disponibilidad?: string | null;
}): boolean {
  const tenantId = support.tenantId ?? support.tenant_id;
  const active = support.active === true || support.active === undefined;
  const disponibilidad = typeof support.disponibilidad === 'string' ? support.disponibilidad.trim().toLowerCase() : '';
  return isSupportEligibleForPublicCatalog(tenantId, active !== false) && disponibilidad === 'disponible';
}

/** Fail-closed evaluation of locked support rows used inside commercial transactions. */
export function areLockedSupportsCommerciallyEligible(
  rows: Array<{
    tenantId?: string | null;
    tenant_id?: string | null;
    active?: boolean | null;
    disponibilidad?: string | null;
  }>,
  expectedCount: number,
): boolean {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length !== expectedCount) return false;
  return rows.every((row) => isSupportSelectableForCommercialRequest(row));
}
