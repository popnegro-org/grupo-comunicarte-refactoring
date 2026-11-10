import assert from 'node:assert/strict';
import test from 'node:test';
import type { InventoryItem } from '../../src/types.ts';
import { formatImpacts, getCardFacts } from '../../src/lib/supportCardFacts.ts';

const support = (overrides: Record<string, unknown>): InventoryItem => ({
  canonical_id: 'mza-led-movil-01',
  name: 'Camión LED Móvil',
  ciudad: 'mendoza',
  tipo_soporte: 'led_movil',
  family: 'led_mobile',
  active: true,
  description: '',
  characteristics: '',
  mapa_url: '',
  imageUrls: ['/images/led-movil-feature.webp'],
  disponibilidad: 'disponible',
  duration: '4 horas',
  waypoints: [],
  routePath: [],
  technical: {
    monthly_impacts: null,
    spot_duration_seconds: 10,
    route_duration_hours: 4,
  },
  ...overrides,
} as unknown as InventoryItem);

test('LED Móvil always exposes Duración, Spot e Impactos / mes', () => {
  const facts = getCardFacts(support({}));
  assert.deepEqual(facts.map(({ label, value }) => ({ label, value })), [
    { label: 'Duración', value: '4 horas' },
    { label: 'Spot', value: '10s' },
    { label: 'Impactos / mes', value: 'A confirmar' },
  ]);
});

test('does not calculate or invent missing monthly impacts', () => {
  const facts = getCardFacts(support({}));
  assert.equal(facts[2]?.value, 'A confirmar');
});

test('formats manually supplied monthly impacts', () => {
  const facts = getCardFacts(support({
    technical: { monthly_impacts: 180000, spot_duration_seconds: 10 },
  }));
  assert.equal(facts[2]?.value, '+180 K');
});

test('traditional and fixed LED families also preserve three canonical facts', () => {
  const traditional = support({
    tipo_soporte: 'tradicional',
    family: 'traditional',
    technical: {},
  });
  const led = support({
    tipo_soporte: 'led',
    family: 'led',
    technical: {},
  });
  assert.deepEqual(getCardFacts(traditional).map(fact => fact.label), ['Medidas', 'Caras', 'Impactos / mes']);
  assert.deepEqual(getCardFacts(led).map(fact => fact.label), ['Medidas', 'Resolución', 'Impactos / mes']);
  assert.ok(getCardFacts(traditional).every(fact => fact.value === 'A confirmar'));
  assert.ok(getCardFacts(led).every(fact => fact.value === 'A confirmar'));
});

test('formatImpacts handles null and localized editorial values', () => {
  assert.equal(formatImpacts(null), null);
  assert.equal(formatImpacts('5.782.520'), '+5,8 M');
});
