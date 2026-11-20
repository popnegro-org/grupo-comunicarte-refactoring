import test from 'node:test';
import assert from 'node:assert/strict';
import { adminAuthHeader, hasValidAdminMutationOrigin, parseCookies } from '../../src/server/adminRequestSecurity';

const allowed = ['https://grupocomunicarte.vercel.app', 'http://localhost:5173'];

test('cookie parser ignores malformed values without throwing', () => {
  assert.deepEqual(parseCookies('gc_admin_token=%E0%A4%A; theme=dark'), { theme: 'dark' });
});

test('admin auth prefers bearer token and supports the admin cookie', () => {
  assert.equal(adminAuthHeader({ authorization: 'Bearer api-token', cookie: 'gc_admin_token=cookie-token' }), 'Bearer api-token');
  assert.equal(adminAuthHeader({ cookie: 'gc_admin_token=cookie-token' }), 'Bearer cookie-token');
  assert.equal(adminAuthHeader({ cookie: 'gc_admin_token=%E0%A4%A' }), undefined);
});

test('cookie-authenticated mutations require an allowed Origin', () => {
  assert.equal(hasValidAdminMutationOrigin({ cookie: 'gc_admin_token=abc', origin: allowed[0] }, 'PATCH', allowed), true);
  assert.equal(hasValidAdminMutationOrigin({ cookie: 'gc_admin_token=abc', origin: 'https://evil.example' }, 'POST', allowed), false);
  assert.equal(hasValidAdminMutationOrigin({ cookie: 'gc_admin_token=abc' }, 'DELETE', allowed), false);
});

test('safe requests and explicit bearer clients do not require cookie CSRF Origin', () => {
  assert.equal(hasValidAdminMutationOrigin({ cookie: 'gc_admin_token=abc' }, 'GET', allowed), true);
  assert.equal(hasValidAdminMutationOrigin({ authorization: 'Bearer abc' }, 'PATCH', allowed), true);
  assert.equal(hasValidAdminMutationOrigin({}, 'POST', allowed), true);
});
