import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaKitDomainError } from '../../src/server/mediakitErrors.ts';
import { validateMediaKitSourceRequestItems } from '../../src/server/mediakitSourceRequest.ts';

const sourceRows = [
  { support_id: 'mza-trad-01', item_tenant_id: 'tenant-default', support_tenant_id: 'tenant-default' },
  { support_id: 'bue-trad-01', item_tenant_id: 'tenant-ba', support_tenant_id: 'tenant-ba' },
];

function expectDomainError(run: () => void, statusCode: number) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof MediaKitDomainError);
    assert.equal(error.statusCode, statusCode);
    return true;
  });
}

test('rejects a Media Kit linked to a missing source request with 404', () => {
  expectDomainError(() => validateMediaKitSourceRequestItems([], ['mza-trad-01']), 404);
});

test('rejects a source request without selectable support lines', () => {
  expectDomainError(() => validateMediaKitSourceRequestItems([{
    support_id: null,
    item_tenant_id: null,
    support_tenant_id: null,
  }], []), 409);
});

test('rejects source request lines with pending ownership', () => {
  expectDomainError(() => validateMediaKitSourceRequestItems([{
    support_id: 'mza-trad-16',
    item_tenant_id: null,
    support_tenant_id: null,
  }], ['mza-trad-16']), 409);
});

test('rejects source request lines whose ownership changed after intake', () => {
  expectDomainError(() => validateMediaKitSourceRequestItems([{
    support_id: 'mza-trad-01',
    item_tenant_id: 'tenant-ba',
    support_tenant_id: 'tenant-default',
  }], ['mza-trad-01']), 409);
});

test('rejects supports that were not part of the source request', () => {
  expectDomainError(() => validateMediaKitSourceRequestItems(sourceRows, ['mza-trad-01', 'mza-trad-02']), 409);
});

test('accepts a valid subset of a mixed-tenant source request', () => {
  assert.doesNotThrow(() => validateMediaKitSourceRequestItems(sourceRows, ['mza-trad-01']));
});

test('accepts all selected lines when their request ownership is consistent', () => {
  assert.doesNotThrow(() => validateMediaKitSourceRequestItems(sourceRows, ['mza-trad-01', 'bue-trad-01']));
});
