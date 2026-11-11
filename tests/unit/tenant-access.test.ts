import test from 'node:test';
import assert from 'node:assert/strict';
import { areLockedSupportsCommerciallyEligible, areRequestItemOwnershipsConsistent, canManageGlobalRequest, deriveRequestScope, getSupportTenantState, isSupportEligibleForPublicCatalog, isSupportSelectableForCommercialRequest, resolveMediaKitTenantId, resolveExistingSingleAdminAccess, resolveSupportTenantAssignment, resolveTenantAccess } from '../../src/server/tenantAccess.ts';

test('rejects missing identity and users without active memberships', () => {
  assert.deepEqual(resolveTenantAccess(null), { allowed: false, reason: 'missing_identity' });
  assert.deepEqual(resolveTenantAccess({ userId: 'u1', memberships: [{ tenantId: 'tenant-ba', role: 'commercial', active: false }] }), { allowed: false, reason: 'no_active_membership' });
});

test('resolves the sole active membership without accepting client tenant override', () => {
  const identity = { userId: 'u1', memberships: [{ tenantId: 'tenant-ba', role: 'commercial' as const, active: true }] };
  assert.deepEqual(resolveTenantAccess(identity), { allowed: true, tenantId: 'tenant-ba', role: 'commercial', global: false });
  assert.deepEqual(resolveTenantAccess(identity, 'tenant-default'), { allowed: false, reason: 'tenant_not_member' });
});

test('requires explicit tenant selection for multiple memberships', () => {
  const identity = { userId: 'u1', memberships: [
    { tenantId: 'tenant-ba', role: 'commercial' as const, active: true },
    { tenantId: 'tenant-default', role: 'operator' as const, active: true },
  ] };
  assert.deepEqual(resolveTenantAccess(identity), { allowed: false, reason: 'ambiguous_membership' });
  assert.equal(resolveTenantAccess(identity, 'tenant-default').allowed, true);
});

test('global requests require explicit global administrator role', () => {
  const tenant = resolveTenantAccess({ userId: 'u1', memberships: [{ tenantId: 'tenant-ba', role: 'tenant_admin', active: true }] });
  const global = resolveTenantAccess({ userId: 'root', memberships: [{ tenantId: 'tenant-ba', role: 'global_admin', active: true }] });
  assert.equal(canManageGlobalRequest(tenant), false);
  assert.equal(canManageGlobalRequest(global), true);
});

test('unassigned supports remain pending; city is not an ownership signal', () => {
  assert.equal(getSupportTenantState(null), 'pending');
  assert.equal(getSupportTenantState(undefined), 'pending');
  assert.equal(getSupportTenantState('tenant-ba'), 'assigned');
});

test('preserves the one existing admin as global operator without requiring a new user or membership', () => {
  const currentAdmin = resolveExistingSingleAdminAccess(true);
  assert.equal(canManageGlobalRequest(currentAdmin), true);
  assert.deepEqual(resolveExistingSingleAdminAccess(false), { allowed: false, reason: 'missing_identity' });
});


test('public catalog excludes unassigned supports even when they are active and available', () => {
  assert.equal(isSupportEligibleForPublicCatalog(null, true), false);
  assert.equal(isSupportEligibleForPublicCatalog(undefined, true), false);
  assert.equal(isSupportEligibleForPublicCatalog('tenant-ba', true), true);
  assert.equal(isSupportEligibleForPublicCatalog('tenant-default', false), false);
});


test('derives request scope from verified item ownership and keeps pending items unclassified', () => {
  assert.equal(deriveRequestScope(['tenant-ba']), 'tenant');
  assert.equal(deriveRequestScope(['tenant-ba', 'tenant-default']), 'global');
  assert.equal(deriveRequestScope(['tenant-ba', null], true), null);
  assert.equal(deriveRequestScope([null], true), null);
});

test('Media Kits are tenant-scoped only when all selected supports belong to one tenant', () => {
  assert.equal(resolveMediaKitTenantId(['tenant-ba', 'tenant-ba']), 'tenant-ba');
  assert.equal(resolveMediaKitTenantId(['tenant-ba', 'tenant-default']), null);
  assert.equal(resolveMediaKitTenantId(['tenant-default', null]), 'tenant-default');
  assert.equal(resolveMediaKitTenantId([]), null);
});


test('commercial request ownership must match the current support owner', () => {
  assert.equal(areRequestItemOwnershipsConsistent([
    { itemTenantId: 'tenant-ba', supportTenantId: 'tenant-ba' },
    { itemTenantId: 'tenant-default', supportTenantId: 'tenant-default' },
  ]), true);
  assert.equal(areRequestItemOwnershipsConsistent([
    { itemTenantId: 'tenant-ba', supportTenantId: 'tenant-default' },
  ]), false);
  assert.equal(areRequestItemOwnershipsConsistent([
    { itemTenantId: null, supportTenantId: 'tenant-ba' },
  ]), false);
  assert.equal(areRequestItemOwnershipsConsistent([
    { itemTenantId: 'tenant-ba', supportTenantId: null },
  ]), false);
  assert.equal(areRequestItemOwnershipsConsistent([]), false);
});


test('C2: rejects transactional ownership drift between request item and current support', () => {
  assert.equal(areRequestItemOwnershipsConsistent([
    { itemTenantId: 'tenant-ba', supportTenantId: 'tenant-default' },
  ]), false);
});

test('C5: rejects an orphan request item whose support row is missing', () => {
  // The service maps an absent support row to supportTenantId=null before this guard.
  assert.equal(areRequestItemOwnershipsConsistent([
    { itemTenantId: 'tenant-ba', supportTenantId: null },
  ]), false);
});

test('commercial selection requires assigned ownership, active state and disponibilidad disponible', () => {
  assert.equal(isSupportSelectableForCommercialRequest({
    tenant_id: 'tenant-ba', active: true, disponibilidad: 'disponible',
  }), true);
  assert.equal(isSupportSelectableForCommercialRequest({
    tenantId: 'tenant-default', active: true, disponibilidad: 'disponible',
  }), true);
  assert.equal(isSupportSelectableForCommercialRequest({
    tenant_id: null, active: true, disponibilidad: 'disponible',
  }), false);
  assert.equal(isSupportSelectableForCommercialRequest({
    tenant_id: 'tenant-ba', active: false, disponibilidad: 'disponible',
  }), false);
  assert.equal(isSupportSelectableForCommercialRequest({
    tenant_id: 'tenant-ba', active: true, disponibilidad: 'reservado',
  }), false);
});

test('locked commercial rows fail closed on count mismatch or any ineligible support', () => {
  assert.equal(areLockedSupportsCommerciallyEligible([
    { tenant_id: 'tenant-ba', active: true, disponibilidad: 'disponible' },
  ], 1), true);
  assert.equal(areLockedSupportsCommerciallyEligible([
    { tenant_id: 'tenant-ba', active: true, disponibilidad: 'disponible' },
    { tenant_id: null, active: true, disponibilidad: 'disponible' },
  ], 2), false);
  assert.equal(areLockedSupportsCommerciallyEligible([
    { tenant_id: 'tenant-ba', active: true, disponibilidad: 'disponible' },
  ], 2), false);
  assert.equal(areLockedSupportsCommerciallyEligible([], 0), false);
});


test('support ownership is assigned explicitly and cannot be silently reassigned', () => {
  assert.deepEqual(resolveSupportTenantAssignment(null, 'tenant-ba'), { allowed: true, tenantId: 'tenant-ba' });
  assert.deepEqual(resolveSupportTenantAssignment('tenant-ba', undefined), { allowed: true, tenantId: 'tenant-ba' });
  assert.deepEqual(resolveSupportTenantAssignment('tenant-ba', 'tenant-default'), {
    allowed: false,
    reason: 'ownership_reassignment_requires_audit',
  });
  assert.deepEqual(resolveSupportTenantAssignment(null, null), { allowed: true, tenantId: null });
});
