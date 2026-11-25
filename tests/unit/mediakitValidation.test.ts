import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMediaKitFinancials } from '../../src/server/mediakitValidation';

test('accepts valid ARS totals and prices scoped to selected supports', () => {
  assert.deepEqual(validateMediaKitFinancials({
    supportIds: ['mza-01', 'bue-01'],
    approvedPrices: { 'mza-01': '120000', 'bue-01': 250000 },
    totalAmount: '370000',
    currency: 'ars',
    status: 'ready',
  }), {
    approvedPrices: { 'mza-01': '120000', 'bue-01': '250000' },
    totalAmount: 370000,
    currency: 'ARS',
  });
});

test('rejects negative, non-finite and unselected support prices', () => {
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], approvedPrices: { 'mza-01': -1 } }), /mayor o igual a cero/i);
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], approvedPrices: { 'mza-01': 'NaN' } }), /mayor o igual a cero/i);
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], approvedPrices: { 'mza-01': false } as any }), /mayor o igual a cero/i);
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], approvedPrices: { 'bue-01': 100 } }), /no seleccionado/i);
});

test('rejects negative totals, unknown currencies and amounts with undefined currency', () => {
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], totalAmount: -1 }), /monto comercial global/i);
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], totalAmount: 'Infinity' }), /monto comercial global/i);
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], totalAmount: false as any }), /monto comercial global/i);
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], currency: 'EUR' }), /moneda/i);
  assert.throws(() => validateMediaKitFinancials({ supportIds: ['mza-01'], currency: 'POR DEFINIR', totalAmount: 100 }), /Por definir/i);
});

test('requires selected supports before a Media Kit can be marked ready', () => {
  assert.throws(() => validateMediaKitFinancials({ supportIds: [], status: 'ready' }), /al menos un soporte/i);
});
