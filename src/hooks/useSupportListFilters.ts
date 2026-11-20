import { useCallback, useMemo, useState } from 'react';
import { calculateSupportTotal } from '../lib/supportPricing';

export type SupportListItem = {
  canonical_id: string;
  name: string;
  ciudad: string;
  tipo_soporte: string;
  disponibilidad: string;
  active?: boolean;
  address?: string;
  pricing?: {
    exhibition_price?: number | string | null;
    installation_price?: number | string | null;
    printing_price?: number | string | null;
    currency?: string | null;
  } | null;
};

export type SortField = 'name' | 'ciudad' | 'tipo_soporte' | 'disponibilidad' | 'price';
export type SortOrder = 'asc' | 'desc';

/**
 * Filter + sort state for the admin support catalog.
 * Keeps presentation components free of filter pipeline logic.
 */
export type SupportListFilterCriteria = {
  query: string;
  plaza: string;
  type: string;
  availability: string;
  active: string;
  sortField: SortField;
  sortOrder: SortOrder;
};

/** Pure filtering pipeline shared by the hook and deterministic unit tests. */
export function filterAndSortSupports(
  supports: SupportListItem[],
  criteria: SupportListFilterCriteria,
): SupportListItem[] {
  const { query, plaza, type, availability, active, sortField, sortOrder } = criteria;
  const q = query.trim().toLowerCase();
  const filtered = supports.filter((item) => {
    const matchQ =
      !q ||
      [item.name, item.canonical_id, item.ciudad, item.address].some((v) =>
        String(v || '').toLowerCase().includes(q),
      );
    const matchPlaza = plaza === 'todas' || item.ciudad === plaza;
    const matchType = type === 'todos' || item.tipo_soporte === type;
    const matchAvailability = availability === 'todos' || item.disponibilidad === availability;
    const matchActive =
      active === 'todos' || (active === 'activos' ? item.active !== false : item.active === false);
    return matchQ && matchPlaza && matchType && matchAvailability && matchActive;
  });

  return filtered.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = (a.name || '').localeCompare(b.name || '');
    } else if (sortField === 'ciudad') {
      comparison = (a.ciudad || '').localeCompare(b.ciudad || '');
    } else if (sortField === 'tipo_soporte') {
      comparison = (a.tipo_soporte || '').localeCompare(b.tipo_soporte || '');
    } else if (sortField === 'disponibilidad') {
      comparison = (a.disponibilidad || '').localeCompare(b.disponibilidad || '');
    } else if (sortField === 'price') {
      comparison = calculateSupportTotal(a.pricing) - calculateSupportTotal(b.pricing);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

export function useSupportListFilters(supports: SupportListItem[]) {
  const [query, setQuery] = useState('');
  const [plaza, setPlaza] = useState('todas');
  const [type, setType] = useState('todos');
  const [availability, setAvailability] = useState('todos');
  const [active, setActive] = useState('todos');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    },
    [sortField],
  );

  const clearFilters = useCallback(() => {
    setQuery('');
    setPlaza('todas');
    setType('todos');
    setAvailability('todos');
    setActive('todos');
  }, []);

  const hasActiveFilters = Boolean(
    query || plaza !== 'todas' || type !== 'todos' || availability !== 'todos' || active !== 'todos',
  );

  const visible = useMemo(
    () =>
      filterAndSortSupports(supports, {
        query,
        plaza,
        type,
        availability,
        active,
        sortField,
        sortOrder,
      }),
    [supports, query, plaza, type, availability, active, sortField, sortOrder],
  );

  return {
    query,
    setQuery,
    plaza,
    setPlaza,
    type,
    setType,
    availability,
    setAvailability,
    active,
    setActive,
    sortField,
    sortOrder,
    handleSort,
    visible,
    hasActiveFilters,
    clearFilters,
  };
}
