import { Search, SlidersHorizontal, LocateFixed, X } from 'lucide-react';
import { Plaza, TipoSoporte, Disponibilidad } from '../../types';

export type InventoryTypeFilter = TipoSoporte | 'pantallas_led' | 'pendiente_mapeo' | 'todos';
import { Input } from '../ui/Input';
import { ViewModeToggle, ViewMode } from './ViewModeToggle';

type DisponibilidadFilter = Disponibilidad | 'todos';

interface InventoryToolbarProps {
  selectedPlaza: Plaza | 'todos';
  setSelectedPlaza: (value: Plaza | 'todos') => void;
  selectedTipo: InventoryTypeFilter;
  setSelectedTipo: (value: InventoryTypeFilter) => void;
  selectedDisponibilidad: DisponibilidadFilter;
  setSelectedDisponibilidad: (value: DisponibilidadFilter) => void;
  searchText: string;
  setSearchText: (value: string) => void;
  resultsCount: number;
  selectedCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNearMe: () => void;
  locating: boolean;
  nearMeActive: boolean;
  onClearNearMe?: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function InventoryToolbar({
  selectedPlaza,
  setSelectedPlaza,
  selectedTipo,
  setSelectedTipo,
  selectedDisponibilidad,
  setSelectedDisponibilidad,
  searchText,
  setSearchText,
  resultsCount,
  selectedCount,
  viewMode,
  onViewModeChange,
  onNearMe,
  locating,
  nearMeActive,
  onClearNearMe,
  hasActiveFilters,
  onClearFilters,
}: InventoryToolbarProps) {
  return (
    <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:px-4 lg:px-5">
      <div className="relative min-w-[210px] flex-1 basis-full md:basis-auto lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Buscar soporte o ubicación..."
          aria-label="Buscar soportes"
          className="h-11 rounded-xl bg-gray-50 pl-9 text-sm transition-colors focus:bg-white"
        />
      </div>

      <button type="button" onClick={onNearMe} disabled={locating} className={`flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${nearMeActive ? "border-gray-950 bg-gray-950 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"} disabled:cursor-wait disabled:opacity-60`} aria-label="Buscar soportes cerca de mi ubicación">
        <LocateFixed className={`h-3.5 w-3.5 ${locating ? 'animate-pulse' : ''}`} aria-hidden="true" />
        {locating ? 'Ubicando...' : nearMeActive ? 'Cerca de tu ubicación' : 'Cerca de mí'}
      </button>

      {nearMeActive && onClearNearMe && (
        <button type="button" onClick={onClearNearMe} className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-950/20" aria-label="Quitar búsqueda cerca de mi ubicación">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Quitar</span>
        </button>
      )}

      <select
        value={selectedPlaza}
        onChange={(event) => setSelectedPlaza(event.target.value as Plaza | 'todos')}
        aria-label="Filtrar por plaza"
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition hover:border-gray-300 focus:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-950/20"
      >
        <option value="todos">Todas las plazas</option>
        <option value="mendoza">Mendoza</option>
        <option value="buenos-aires">Buenos Aires</option>
      </select>

      <select
        value={selectedTipo}
        onChange={(event) => setSelectedTipo(event.target.value as InventoryTypeFilter)}
        aria-label="Filtrar por tipo de soporte"
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition hover:border-gray-300 focus:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-950/20"
      >
        <option value="todos">Todos los tipos</option>
        <option value="tradicional">Tradicionales</option>
        <option value="pantallas_led">Pantallas LED</option>
        <option value="led_movil">LED móvil</option>
        <option value="pendiente_mapeo">Pendiente de mapeo (clasificación interna)</option>
      </select>

      <select
        value={selectedDisponibilidad}
        onChange={(event) => setSelectedDisponibilidad(event.target.value as DisponibilidadFilter)}
        aria-label="Filtrar por disponibilidad"
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition hover:border-gray-300 focus:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-950/20"
      >
        <option value="todos">Toda disponibilidad</option>
        <option value="disponible">Disponibles</option>
        <option value="reservado">Reservados</option>
      </select>

      {hasActiveFilters && (
        <button type="button" onClick={onClearFilters} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-950/20" aria-label="Limpiar todos los filtros">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Limpiar filtros
        </button>
      )}

      <div className="ml-auto flex w-full shrink-0 items-center justify-between gap-2 border-t border-gray-100 pt-2 md:w-auto md:justify-end md:border-0 md:pt-0">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-gray-500">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {nearMeActive ? `${resultsCount} cercanos` : selectedCount > 0 ? `${selectedCount} seleccionados` : `${resultsCount} resultados`}
        </span>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
}
