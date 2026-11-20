import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterAndSortSupports,
  type SupportListFilterCriteria,
  type SupportListItem,
} from '../../src/hooks/useSupportListFilters';

const supports: SupportListItem[] = [
  {
    canonical_id: 'BA-LED-02',
    name: 'Pantalla Centro',
    ciudad: 'buenos-aires',
    tipo_soporte: 'led',
    disponibilidad: 'reservado',
    active: true,
    address: 'Av. Corrientes 100',
    pricing: { exhibition_price: 200, installation_price: 20 },
  },
  {
    canonical_id: 'MZA-TR-01',
    name: 'Cartel Parque',
    ciudad: 'mendoza',
    tipo_soporte: 'tradicional',
    disponibilidad: 'disponible',
    active: true,
    address: 'Parque General San Martín',
    pricing: { exhibition_price: 100 },
  },
  {
    canonical_id: 'MZA-TR-02',
    name: 'Cartel Archivo',
    ciudad: 'mendoza',
    tipo_soporte: 'tradicional',
    disponibilidad: 'disponible',
    active: false,
    address: 'Calle Mitre 20',
    pricing: { exhibition_price: 50 },
  },
];

const defaults: SupportListFilterCriteria = {
  query: '',
  plaza: 'todas',
  type: 'todos',
  availability: 'todos',
  active: 'todos',
  sortField: 'name',
  sortOrder: 'asc',
};

test('returns every support when all filters are neutral and sorts by name', () => {
  const result = filterAndSortSupports(supports, defaults);
  assert.deepEqual(result.map((item) => item.canonical_id), ['MZA-TR-02', 'MZA-TR-01', 'BA-LED-02']);
});

test('search is trimmed and case-insensitive across address and canonical ID', () => {
  assert.deepEqual(
    filterAndSortSupports(supports, { ...defaults, query: '  PARQUE GENERAL  ' }).map((item) => item.canonical_id),
    ['MZA-TR-01'],
  );
  assert.deepEqual(
    filterAndSortSupports(supports, { ...defaults, query: 'ba-led-02' }).map((item) => item.canonical_id),
    ['BA-LED-02'],
  );
});

test('combines plaza, type and availability filters with AND', () => {
  assert.deepEqual(
    filterAndSortSupports(supports, {
      ...defaults,
      plaza: 'mendoza',
      type: 'tradicional',
      availability: 'disponible',
    }).map((item) => item.canonical_id),
    ['MZA-TR-02', 'MZA-TR-01'],
  );
});

test('active filter distinguishes archived supports while treating missing active as active', () => {
  const withLegacy: SupportListItem[] = [
    ...supports,
    {
      canonical_id: 'MZA-LEGACY',
      name: 'Legacy',
      ciudad: 'mendoza',
      tipo_soporte: 'tradicional',
      disponibilidad: 'disponible',
    },
  ];
  assert.deepEqual(
    filterAndSortSupports(withLegacy, { ...defaults, active: 'activos' }).map((item) => item.canonical_id),
    ['MZA-TR-01', 'MZA-LEGACY', 'BA-LED-02'],
  );
  assert.deepEqual(
    filterAndSortSupports(withLegacy, { ...defaults, active: 'inactivos' }).map((item) => item.canonical_id),
    ['MZA-TR-02'],
  );
});

test('sorts by computed support total in both directions', () => {
  assert.deepEqual(
    filterAndSortSupports(supports, { ...defaults, sortField: 'price' }).map((item) => item.canonical_id),
    ['MZA-TR-02', 'MZA-TR-01', 'BA-LED-02'],
  );
  assert.deepEqual(
    filterAndSortSupports(supports, { ...defaults, sortField: 'price', sortOrder: 'desc' }).map((item) => item.canonical_id),
    ['BA-LED-02', 'MZA-TR-01', 'MZA-TR-02'],
  );
});

test('does not mutate the input support array', () => {
  const original = [...supports];
  filterAndSortSupports(supports, { ...defaults, sortOrder: 'desc' });
  assert.deepEqual(supports, original);
});
