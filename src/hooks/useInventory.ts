import { useState, useEffect, useCallback } from 'react';
import { InventoryItem, getDisponibilidad } from '../types';
import { apiFetch } from '../lib/api';

type InventoryLoadResult = {
  items: InventoryItem[];
  error: string | null;
};

let inFlightInventoryRequest: Promise<InventoryLoadResult> | null = null;

function normalizeItems(rawItems: InventoryItem[]): InventoryItem[] {
  const seen = new Set<string>();
  return rawItems.filter((item) => {
    if (!item.canonical_id || seen.has(item.canonical_id)) return false;
    seen.add(item.canonical_id);
    return true;
  });
}

function loadInventory(): Promise<InventoryLoadResult> {
  if (!inFlightInventoryRequest) {
    inFlightInventoryRequest = (async () => {
      try {
        const response = await apiFetch('/api/supports');
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`La API no devolvió JSON (Content-Type: ${contentType || 'desconocido'}).`);
        }

        const json = await response.json();
        if (json.status !== 'success' || !Array.isArray(json.data)) {
          throw new Error(json.message || 'La API devolvió un inventario inválido.');
        }

        const items = normalizeItems(json.data).filter(
          (item: InventoryItem) => getDisponibilidad(item) !== 'inactivo',
        );
        return { items, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'No se pudo cargar el inventario.';
        console.error('Inventory fetch failed:', message);
        return { items: [], error: message };
      }
    })().finally(() => {
      inFlightInventoryRequest = null;
    });
  }

  return inFlightInventoryRequest;
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadInventory();
    setItems(result.items);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  return {
    items,
    fixedLocations: items.filter((item) => !('waypoints' in item)) as any[],
    mobileRoutes: items.filter((item) => 'waypoints' in item) as any[],
    loading,
    error,
    refetch: fetchInventory,
  };
}
