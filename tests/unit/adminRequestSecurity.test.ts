import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_COOKIE,
  hasValidAdminMutationOrigin,
  isAllowedRequestOrigin,
} from '../../src/server/adminRequestSecurity.ts';

const allowedOrigins = ['https://grupocomunicarte.vercel.app'];
const previewOrigin = 'https://grupo-comunicarte-refactoring-preview.vercel.app';

test('allows the exact same-origin Vercel Preview host', () => {
  const requestOrigin = previewOrigin;
  const headers = {
    origin: previewOrigin,
    cookie: `${ADMIN_COOKIE}=session-token`,
  };

  assert.equal(isAllowedRequestOrigin(previewOrigin, allowedOrigins, requestOrigin), true);
  assert.equal(
    hasValidAdminMutationOrigin(headers, 'POST', allowedOrigins, requestOrigin),
    true,
  );
});

test('continues to allow explicitly configured cross-origin clients', () => {
  assert.equal(
    isAllowedRequestOrigin(
      'https://grupocomunicarte.vercel.app',
      allowedOrigins,
      previewOrigin,
    ),
    true,
  );
});

test('rejects an unrelated origin on a Preview deployment', () => {
  const headers = {
    origin: 'https://attacker.example',
    cookie: `${ADMIN_COOKIE}=session-token`,
  };

  assert.equal(
    isAllowedRequestOrigin(headers.origin, allowedOrigins, previewOrigin),
    false,
  );
  assert.equal(
    hasValidAdminMutationOrigin(headers, 'POST', allowedOrigins, previewOrigin),
    false,
  );
});

test('rejects same-host origins with a different protocol', () => {
  assert.equal(
    isAllowedRequestOrigin(
      'http://grupo-comunicarte-refactoring-preview.vercel.app',
      allowedOrigins,
      previewOrigin,
    ),
    false,
  );
});

test('rejects non-canonical Origin values and userinfo tricks', () => {
  assert.equal(
    isAllowedRequestOrigin(`${previewOrigin}/path`, allowedOrigins, previewOrigin),
    false,
  );
  assert.equal(
    isAllowedRequestOrigin(
      'https://attacker.example@grupo-comunicarte-refactoring-preview.vercel.app',
      allowedOrigins,
      previewOrigin,
    ),
    false,
  );
});

test('requires Origin for cookie-authenticated mutations', () => {
  assert.equal(
    hasValidAdminMutationOrigin(
      { cookie: `${ADMIN_COOKIE}=session-token` },
      'POST',
      allowedOrigins,
      previewOrigin,
    ),
    false,
  );
});

test('keeps safe methods and explicit Bearer clients outside cookie CSRF checks', () => {
  assert.equal(hasValidAdminMutationOrigin({}, 'GET', allowedOrigins), true);
  assert.equal(
    hasValidAdminMutationOrigin(
      { authorization: 'Bearer api-token', origin: 'https://attacker.example' },
      'PATCH',
      allowedOrigins,
      previewOrigin,
    ),
    true,
  );
});
