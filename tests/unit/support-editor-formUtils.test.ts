import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCoordsFromUrl, isFormDirty, normalize, numeric, payloadFrom } from '../../src/pages/dashboard/support-editor/formUtils';
import { emptyForm } from '../../src/pages/dashboard/support-editor/types';

test('extractCoordsFromUrl parses Google Maps @ coordinates', () => {
  assert.deepEqual(extractCoordsFromUrl('https://maps.google.com/@-32.997896,-68.904733,17z'), {
    lat: '-32.997896',
    lng: '-68.904733',
  });
});

test('extractCoordsFromUrl parses direct coordinates and rejects empty input', () => {
  assert.deepEqual(extractCoordsFromUrl('-32.997896, -68.904733'), {
    lat: '-32.997896',
    lng: '-68.904733',
  });
  assert.equal(extractCoordsFromUrl(''), null);
});

test('normalize preserves editorial monthly impacts', () => {
  const normalized = normalize({
    name: 'Soporte test',
    tipo_soporte: 'tradicional',
    technical: { measures: '430 x 460 cm.', monthly_impacts: 123 },
  });
  assert.equal(normalized.traditional.monthly_impacts, 123);
});

test('payloadFrom produces canonical numeric payloads', () => {
  const form = {
    ...emptyForm,
    publicName: 'Soporte test',
    tipo_soporte: 'tradicional' as const,
    traditional: {
      ...emptyForm.traditional,
      medidas: '430 x 460 cm.',
      caras: '2',
      monthly_impacts: '123',
    },
    pricing: {
      ...emptyForm.pricing,
      exhibition: '1000',
      installation: '200',
      printing: '300',
    },
  };
  const payload = payloadFrom(form);
  assert.equal(payload.technical.caras, 2);
  assert.equal(payload.technical.monthly_impacts, 123);
  assert.equal(payload.pricing.exhibition_price, 1000);
});

test('isFormDirty detects nested field changes', () => {
  const changed = { ...emptyForm, traditional: { ...emptyForm.traditional, monthly_impacts: '123' } };
  assert.equal(isFormDirty(emptyForm, changed), true);
  assert.equal(isFormDirty(emptyForm, emptyForm), false);
});


test('numeric keeps optional values empty and rejects invalid values', () => {
  assert.equal(numeric(''), '');
  assert.equal(numeric(null), '');
  assert.equal(numeric('123'), 123);
  assert.equal(numeric('not-a-number'), '');
});

test('payloadFrom preserves empty optional monthly impacts as null', () => {
  const form = { ...emptyForm, publicName: 'Soporte test', traditional: { ...emptyForm.traditional, monthly_impacts: '' } };
  const payload = payloadFrom(form);
  assert.equal(payload.technical.monthly_impacts, null);
});


test('getCardFacts includes measures, format, faces and monthly impacts when present', async () => {
  const { getCardFacts } = await import('../../src/components/inventory/SupportCardPrimitives');
  const item = {
    canonical_id: 'SC-FACTS-01',
    name: 'Soporte con ficha completa',
    ciudad: 'mendoza',
    tipo_soporte: 'tradicional',
    lat: -32.9,
    lng: -68.8,
    address: 'Dirección de prueba',
    description: 'Ficha de prueba',
    characteristics: '',
    mapa_url: '',
    technical: { measures: '8 x 4 m', format: 'Backlight', caras: 2, monthly_impacts: 420000 },
  } as import('../../src/types').InventoryItem;
  const facts = getCardFacts(item);
  assert.deepEqual(facts.map((fact) => fact.label), ['Medidas', 'Formato', 'Caras', 'Impactos / mes']);
  assert.equal(facts[1].value, 'Backlight');
});

test('inventory presentation adapter keeps ambiguous LED type unmapped and excludes internal pricing', async () => {
  const { toInventoryPresentationItem } = await import('../../src/lib/inventoryPresentationAdapter');
  const item = {
    canonical_id: 'SC-TEST-LED',
    name: 'Pantalla heredada',
    ciudad: 'mendoza',
    tipo_soporte: 'led',
    lat: -32.9,
    lng: -68.8,
    address: 'Dirección de prueba',
    description: 'Ficha de prueba',
    characteristics: '',
    mapa_url: '',
    disponibilidad: 'reservado',
    isFeatured: true,
    pricing: {
      exhibition_price: 100,
      installation_price: 20,
      printing_price: 30,
      monthly_price: 150,
      exclusive_price: 0,
      currency: 'ARS',
      tax_included: true,
      price_public: false,
    },
    technical: { measures: '8 x 4 m', format: 'Formato de prueba', monthly_impacts: 420000, caras: 2 },
  } as import('../../src/types').InventoryItem;

  const result = toInventoryPresentationItem(item);
  assert.equal(result.tipo, 'Pendiente de mapeo');
  assert.equal(result.disponibilidad, 'Reservado');
  assert.equal(result.destacado, true);
  assert.equal(result.medidas, '8 x 4 m');
  assert.equal(result.impactoMensual, '420000');
  assert.equal('pricing' in result, false);
});

test('inventory presentation adapter classifies known support types conservatively', async () => {
  const { toInventoryPresentationItem } = await import('../../src/lib/inventoryPresentationAdapter');
  const base = {
    canonical_id: 'SC-TEST-MOBILE',
    name: 'LED móvil de prueba',
    ciudad: 'buenos-aires',
    tipo_soporte: 'led_movil',
    description: '',
    characteristics: '',
    schedule: '',
    duration: '',
    waypoints: [{ name: 'Punto inicial', lat: -34.6, lng: -58.4 }],
    routePath: [],
  } as import('../../src/types').InventoryItem;

  const result = toInventoryPresentationItem(base);
  assert.equal(result.tipo, 'LED móvil');
  assert.equal(result.direccion, 'Punto inicial');
  assert.equal(result.localidad, 'Buenos Aires');
  assert.equal(result.estadoOperativo, 'En revisión');
});


test('inventory adapter keeps legacy inactive state separate from reservation availability', async () => {
  const { toInventoryPresentationItem } = await import('../../src/lib/inventoryPresentationAdapter');
  const item = {
    canonical_id: 'SC-LEGACY-INACTIVE',
    name: 'Soporte inactivo heredado',
    ciudad: 'mendoza',
    tipo_soporte: 'tradicional',
    lat: -32.9,
    lng: -68.8,
    address: 'Dirección de prueba',
    description: '',
    characteristics: '',
    disponibilidad: 'inactivo',
    active: true,
  } as import('../../src/types').InventoryItem;

  const result = toInventoryPresentationItem(item);
  assert.equal(result.disponibilidad, 'Disponible');
  assert.equal(result.estadoOperativo, 'Inactivo');
});
