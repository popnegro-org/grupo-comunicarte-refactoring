/** Tenant authorization primitives. These functions deliberately fail closed. */
export type TenantRole = 'tenant_admin' | 'commercial' | 'operator' | 'global_admin';
export interface TenantMembership {
  tenantId: string;
  role: TenantRole;
  active: boolean;
}
export interface TenantIdentity {
  userId: string;
  memberships: TenantMembership[];
}
export type TenantAccessDecision =
  | { allowed: true; tenantId: string; role: TenantRole; global: false }
  | { allowed: true; tenantId: null; role: 'global_admin'; global: true }
  | { allowed: false; reason: 'missing_identity' | 'no_active_membership' | 'tenant_not_member' | 'ambiguous_membership' | 'global_role_required' };

/**
 * Compatibility mode for the deployment's one existing ADMIN_USER/ADMIN_PASSWORD principal.
 * The caller must derive this boolean exclusively from the existing requireAdmin middleware;
 * never pass a client-controlled flag. This does not claim individual-user identity.
 */
export function resolveExistingSingleAdminAccess(isAuthenticatedExistingAdmin: boolean): TenantAccessDecision {
  return isAuthenticatedExistingAdmin
    ? { allowed: true, tenantId: null, role: 'global_admin', global: true }
    : { allowed: false, reason: 'missing_identity' };
}

/** Resolve only persisted active memberships; never trust a tenant supplied by the client. */
export function resolveTenantAccess(
  identity: TenantIdentity | null | undefined,
  requestedTenantId?: string | null,
): TenantAccessDecision {
  if (!identity?.userId) return { allowed: false, reason: 'missing_identity' };
  const active = identity.memberships.filter((membership) => membership.active);
  if (active.some((membership) => membership.role === 'global_admin')) {
    return { allowed: true, tenantId: null, role: 'global_admin', global: true };
  }
  if (active.length === 0) return { allowed: false, reason: 'no_active_membership' };
  if (requestedTenantId) {
    const membership = active.find((item) => item.tenantId === requestedTenantId);
    return membership
      ? { allowed: true, tenantId: membership.tenantId, role: membership.role, global: false }
      : { allowed: false, reason: 'tenant_not_member' };
  }
  if (active.length !== 1) return { allowed: false, reason: 'ambiguous_membership' };
  const membership = active[0];
  return { allowed: true, tenantId: membership.tenantId, role: membership.role, global: false };
}

/** Cross-tenant requests are visible only to an explicitly authorized global administrator. */
export function canManageGlobalRequest(access: TenantAccessDecision): boolean {
  return access.allowed && access.global && access.role === 'global_admin';
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
