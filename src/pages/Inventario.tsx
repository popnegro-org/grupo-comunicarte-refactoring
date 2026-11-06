import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import InventoryMap from '../components/map/InventoryMap';
import { useInventory } from '../hooks/useInventory';
import { Plaza, Disponibilidad, InventoryItem } from '../types';
import { ViewMode } from '../components/inventory/ViewModeToggle';
import { InventoryToolbar, type InventoryTypeFilter } from '../components/inventory/InventoryToolbar';
import { toInventoryPresentationItem } from '../lib/inventoryPresentationAdapter';
import { SupportCardGrid } from '../components/inventory/SupportCardGrid';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSelection } from '../context/SelectionContext';
import { Button } from '../components/ui/Button';

type DisponibilidadFilter = Disponibilidad | 'todos';

function distanceKm(from: [number, number], item: InventoryItem) {
  const lat = 'lat' in item ? item.lat : item.waypoints[0]?.lat;
  const lng = 'lng' in item ? item.lng : item.waypoints[0]?.lng;
  if (lat == null || lng == null) return Number.POSITIVE_INFINITY;
  const [fromLat, fromLng] = from;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat - fromLat);
  const dLng = toRad(lng - fromLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(fromLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Inventario() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { fixedLocations, mobileRoutes, loading, error, refetch } = useInventory();
  const plazaParam = searchParams.get('plaza') as Plaza | 'todos' | null;
  const rawTipoParam = searchParams.get('tipo');
  const tipoParam: InventoryTypeFilter | null = rawTipoParam === 'led'
    ? 'pendiente_mapeo'
    : rawTipoParam === 'tradicional' || rawTipoParam === 'led_movil' || rawTipoParam === 'pantallas_led' || rawTipoParam === 'pendiente_mapeo'
      ? rawTipoParam
      : null;
  const dispParam = searchParams.get('disponibilidad') as DisponibilidadFilter | null;
  const vistaParam = searchParams.get('vista') as ViewMode | null;
  const queryParam = searchParams.get('q') ?? '';
  const [selectedPlaza, setSelectedPlaza] = useState<Plaza | 'todos'>(plazaParam || 'todos');
  const [selectedTipo, setSelectedTipo] = useState<InventoryTypeFilter>(tipoParam || 'todos');
  const [selectedDisponibilidad, setSelectedDisponibilidad] = useState<DisponibilidadFilter>(dispParam || 'todos');
  const [viewMode, setViewMode] = useState<ViewMode>(vistaParam === 'catalogo' ? 'catalogo' : 'mapa');
  const selectedSoporteId = searchParams.get('soporte');
  const [searchText, setSearchText] = useState(queryParam);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const { selectedCount, showToast } = useSelection();

  const handleResetFilters = useCallback(() => {
    setSelectedPlaza('todos');
    setSelectedTipo('todos');
    setSelectedDisponibilidad('todos');
    setSearchText('');
  }, []);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Tu navegador no permite obtener tu ubicación.', undefined, 2800);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
        setViewMode('mapa');
        setLocating(false);
        showToast('Mapa centrado cerca de tu ubicación.', undefined, 2200);
      },
      () => {
        setLocating(false);
        showToast('No pudimos obtener tu ubicación. Revisá los permisos del navegador.', undefined, 3200);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, [showToast]);

  const handleViewModeChange = useCallback((mode: ViewMode) => setViewMode(mode), []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedPlaza !== 'todos') params.set('plaza', selectedPlaza);
    if (selectedTipo !== 'todos') params.set('tipo', selectedTipo);
    if (selectedDisponibilidad !== 'todos') params.set('disponibilidad', selectedDisponibilidad);
    if (searchText.trim()) params.set('q', searchText.trim());
    if (viewMode !== 'mapa') params.set('vista', viewMode);
    if (selectedSoporteId && viewMode === 'mapa') params.set('soporte', selectedSoporteId);
    setSearchParams(params, { replace: true });
  }, [selectedPlaza, selectedTipo, selectedDisponibilidad, searchText, viewMode, selectedSoporteId, setSearchParams]);

  useEffect(() => {
    if (plazaParam && plazaParam !== selectedPlaza) setSelectedPlaza(plazaParam);
    if (tipoParam && tipoParam !== selectedTipo) setSelectedTipo(tipoParam);
    if (dispParam && dispParam !== selectedDisponibilidad) setSelectedDisponibilidad(dispParam);
    if (vistaParam && (vistaParam === 'mapa' || vistaParam === 'catalogo') && vistaParam !== viewMode) setViewMode(vistaParam);
    if (queryParam !== searchText) setSearchText(queryParam);
  }, [plazaParam, tipoParam, dispParam, vistaParam, queryParam]);

  const query = searchText.trim().toLowerCase();
  const matchesSearch = useCallback((item: InventoryItem) => {
    if (!query) return true;
    const haystack = [item.name, item.canonical_id, item.tipo_soporte, toInventoryPresentationItem(item).tipo, item.ciudad, 'address' in item ? item.address : ''].join(' ').toLowerCase();
    return haystack.includes(query);
  }, [query]);
  const matchesTipo = useCallback((item: InventoryItem) => {
    if (selectedTipo === 'todos') return true;
    const canonicalType = toInventoryPresentationItem(item).tipo;
    if (selectedTipo === 'pantallas_led') return canonicalType === 'Pantallas LED';
    if (selectedTipo === 'pendiente_mapeo') return canonicalType === 'Pendiente de mapeo';
    return item.tipo_soporte === selectedTipo;
  }, [selectedTipo]);
  const matchesDisponibilidad = useCallback((item: InventoryItem) => {
    if (selectedDisponibilidad === 'todos') return true;
    return (item.disponibilidad ?? 'disponible') === selectedDisponibilidad;
  }, [selectedDisponibilidad]);
  const filteredLocations = useMemo(() => fixedLocations.filter((loc) => {
    const matchPlaza = selectedPlaza === 'todos' || loc.ciudad === selectedPlaza;
    const matchTipo = matchesTipo(loc);
    return matchPlaza && matchTipo && matchesDisponibilidad(loc) && matchesSearch(loc);
  }), [fixedLocations, selectedPlaza, matchesTipo, matchesDisponibilidad, matchesSearch]);
  const filteredRoutes = useMemo(() => mobileRoutes.filter((route) => {
    const matchPlaza = selectedPlaza === 'todos' || route.ciudad === selectedPlaza;
    const matchTipo = matchesTipo(route);
    return matchPlaza && matchTipo && matchesDisponibilidad(route) && matchesSearch(route);
  }), [mobileRoutes, selectedPlaza, matchesTipo, matchesDisponibilidad, matchesSearch]);
  const allFilteredItems = useMemo(() => {
    const items = [...filteredLocations, ...filteredRoutes];
    if (!userLocation) return items;
    return items.slice().sort((a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b));
  }, [filteredLocations, filteredRoutes, userLocation]);

  if (loading) {
    return <div className="flex h-[calc(100dvh-5rem)] items-center justify-center bg-gray-50" role="status" aria-live="polite"><div className="flex flex-col items-center gap-3 text-center"><Loader2 className="h-7 w-7 animate-spin text-gray-900" aria-hidden="true" /><p className="text-sm font-semibold text-gray-600">Cargando inventario comercial...</p></div></div>;
  }

  if (error) {
    return <div className="flex h-[calc(100dvh-5rem)] items-center justify-center bg-gray-50 px-4" role="alert"><div className="w-full max-w-md border border-gray-200 bg-white p-6 text-center"><AlertCircle className="mx-auto h-5 w-5 text-red-600" aria-hidden="true" /><h2 className="mb-2 mt-3 text-lg font-bold text-gray-900">No pudimos cargar el inventario</h2><p className="mb-5 text-sm text-gray-600">Estamos teniendo problemas para mostrar los soportes. Probá nuevamente.</p><Button onClick={refetch} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg" aria-label="Reintentar cargar el inventario"><RefreshCw className="h-4 w-4" aria-hidden="true" />Reintentar</Button></div></div>;
  }

  return (
    <div className="relative flex h-[calc(100dvh-5rem)] overflow-hidden">
      <div className="relative z-10 flex h-full min-w-0 flex-grow flex-col">
        <InventoryToolbar
          selectedPlaza={selectedPlaza}
          setSelectedPlaza={setSelectedPlaza}
          selectedTipo={selectedTipo}
          setSelectedTipo={setSelectedTipo}
          selectedDisponibilidad={selectedDisponibilidad}
          setSelectedDisponibilidad={setSelectedDisponibilidad}
          searchText={searchText}
          setSearchText={setSearchText}
          resultsCount={allFilteredItems.length}
          selectedCount={selectedCount}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onNearMe={handleNearMe}
          locating={locating}
          nearMeActive={Boolean(userLocation)}
          onClearNearMe={() => setUserLocation(null)}
          hasActiveFilters={selectedPlaza !== 'todos' || selectedTipo !== 'todos' || selectedDisponibilidad !== 'todos' || Boolean(searchText.trim())}
          onClearFilters={handleResetFilters}
        />
        <div className="relative min-h-0 flex-1">
          {allFilteredItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center" role="status">
              <p className="text-base font-semibold text-gray-950">Sin resultados con estos filtros</p>
              <p className="max-w-sm text-sm text-gray-600">
                {selectedTipo === 'pantallas_led'
                  ? 'Con los filtros actuales no hay soportes confirmados como Pantallas LED. Los registros LED heredados aparecen como “Pendiente de mapeo”.'
                  : selectedTipo === 'pendiente_mapeo'
                    ? 'No hay registros pendientes de mapeo con los filtros actuales. Probá cambiar plaza o disponibilidad.'
                    : 'Probá ampliar la búsqueda o limpiar plaza, tipo y disponibilidad para ver el inventario completo.'}
              </p>
              <Button onClick={handleResetFilters} className="mt-2 min-h-10 rounded-lg px-4">
                Limpiar filtros
              </Button>
            </div>
          ) : viewMode === 'mapa' ? (
            <InventoryMap locations={filteredLocations} routes={filteredRoutes} initialSelectedId={selectedSoporteId} selectedPlaza={selectedPlaza} onResetFilters={handleResetFilters} userLocation={userLocation} />
          ) : (
            <SupportCardGrid items={allFilteredItems} onResetFilters={handleResetFilters} />
          )}
        </div>
      </div>
    </div>
  );
}
