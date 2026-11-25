import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAdminAuthConfiguration } from '../../src/server/adminAuthConfig.ts';

test('public API can start when admin authentication is not configured', () => {
  assert.equal(hasAdminAuthConfiguration({}), false);
  assert.equal(hasAdminAuthConfiguration({
    ADMIN_USER: 'admin',
    ADMIN_SECRET: 'legacy-secret',
  }), false);
  assert.equal(hasAdminAuthConfiguration({
    ADMIN_PASSWORD: 'password',
    JWT_SECRET: 'jwt-secret',
  }), false);
});

test('admin authentication requires a username, password source and signing secret', () => {
  assert.equal(hasAdminAuthConfiguration({
    ADMIN_USER: 'admin',
    ADMIN_PASSWORD: 'password',
    JWT_SECRET: 'jwt-secret',
  }), true);
  assert.equal(hasAdminAuthConfiguration({
    ADMIN_USER: 'admin',
    ADMIN_PASSWORD_HASH: 'scrypt$16384$salt$hash',
    ADMIN_SECRET: 'legacy-secret',
  }), true);
});

test('blank usernames do not enable admin authentication', () => {
  assert.equal(hasAdminAuthConfiguration({
    ADMIN_USER: '   ',
    ADMIN_PASSWORD: 'password',
    JWT_SECRET: 'jwt-secret',
  }), false);
});
