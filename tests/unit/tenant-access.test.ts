import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageGlobalRequest, getSupportTenantState, resolveExistingSingleAdminAccess, resolveTenantAccess } from '../../src/server/tenantAccess.ts';

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
