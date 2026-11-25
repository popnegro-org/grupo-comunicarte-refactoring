import test from 'node:test';
import assert from 'node:assert/strict';
import { isCanonicalAnalyticsHost } from '../../src/lib/analytics.ts';

test('GA4 is restricted to canonical production hostnames', () => {
  assert.equal(isCanonicalAnalyticsHost('grupocomunicarte.com.ar'), true);
  assert.equal(isCanonicalAnalyticsHost('www.grupocomunicarte.com.ar'), true);
  assert.equal(isCanonicalAnalyticsHost('grupo-comunicarte-refactoring.vercel.app'), false);
  assert.equal(isCanonicalAnalyticsHost('localhost'), false);
  assert.equal(isCanonicalAnalyticsHost('WWW.GRUPOCOMUNICARTE.COM.AR'), true);
});
