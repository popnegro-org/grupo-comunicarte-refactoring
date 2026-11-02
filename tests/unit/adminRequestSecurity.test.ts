import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_COOKIE,
  hasValidAdminMutationOrigin,
  isAllowedRequestOrigin,
} from '../../src/server/adminRequestSecurity.ts';

const allowedOrigins = ['https://grupocomunicarte.vercel.app'];

test('allows the exact same-origin Vercel Preview host', () => {
  const headers = {
    host: 'grupo-comunicarte-refactoring-preview.vercel.app',
    'x-forwarded-proto': 'https',
  };
  const origin = 'https://grupo-comunicarte-refactoring-preview.vercel.app';

  assert.equal(isAllowedRequestOrigin(origin, allowedOrigins, headers), true);
  assert.equal(
    hasValidAdminMutationOrigin(
      { ...headers, origin, cookie: `${ADMIN_COOKIE}=session-token` },
      'POST',
      allowedOrigins,
    ),
    true,
  );
});

test('continues to allow explicitly configured cross-origin clients', () => {
  assert.equal(
    isAllowedRequestOrigin(
      'https://grupocomunicarte.vercel.app',
      allowedOrigins,
      { host: 'preview.vercel.app', 'x-forwarded-proto': 'https' },
    ),
    true,
  );
});

test('rejects an unrelated origin even when a Preview host is serving the request', () => {
  const headers = {
    host: 'grupo-comunicarte-refactoring-preview.vercel.app',
    'x-forwarded-proto': 'https',
    origin: 'https://attacker.example',
    cookie: `${ADMIN_COOKIE}=session-token`,
  };

  assert.equal(isAllowedRequestOrigin(headers.origin, allowedOrigins, headers), false);
  assert.equal(hasValidAdminMutationOrigin(headers, 'POST', allowedOrigins), false);
});

test('rejects same-host origins with a different protocol', () => {
  assert.equal(
    isAllowedRequestOrigin(
      'http://preview.vercel.app',
      allowedOrigins,
      { host: 'preview.vercel.app', 'x-forwarded-proto': 'https' },
    ),
    false,
  );
});
