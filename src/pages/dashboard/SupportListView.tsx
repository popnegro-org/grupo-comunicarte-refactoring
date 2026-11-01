import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Inbox,
  FilterX,
  Loader2,
  Search,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { ActionMenu, type ActionMenuItem } from '../../components/dashboard/ui/ActionMenu';
import { ConfirmDialog } from '../../components/dashboard/ui/ConfirmDialog';
import { ReservationModal } from '../../components/dashboard/ui/ReservationModal';
import { StatusBadge } from '../../components/dashboard/ui/StatusBadge';
import { Input } from '../../components/ui/Input';
import { calculateSupportTotal, formatSupportCurrency } from '../../lib/supportPricing';
import type { SortField, SupportListItem } from '../../hooks/useSupportListFilters';

type Support = SupportListItem;

type Props = {
  supports: Support[];
  visible: Support[];
  loading: boolean;
  message: string;
  query: string;
  setQuery: (v: string) => void;
  plaza: string;
  setPlaza: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  availability: string;
  setAvailability: (v: string) => void;
  active: string;
  setActive: (v: string) => void;
  sortField: SortField;
  sortOrder: 'asc' | 'desc';
  handleSort: (field: SortField) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  load: () => void;
  navigate: NavigateFunction;
  getActionMenuItems: (item: Support) => ActionMenuItem[];
  supportForReservation: Support | null;
  setSupportForReservation: (s: Support | null) => void;
  supportToArchive: Support | null;
  setSupportToArchive: (s: Support | null) => void;
  isArchiving: boolean;
  handleConfirmArchive: () => void;
};

export function SupportListView(props: Props) {
  const {
    supports,
    visible,
    loading,
    message,
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
    hasActiveFilters,
    clearFilters,
    load,
    navigate,
    getActionMenuItems,
    supportForReservation,
    setSupportForReservation,
    supportToArchive,
    setSupportToArchive,
    isArchiving,
    handleConfirmArchive,
  } = props;

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-slate-900 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-slate-900 font-bold" />
    );
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-4 pb-10">
        {message && (
          <div
            role="status"
            aria-live="polite"
            className="fixed right-6 top-20 z-[4500] rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-white/10 animate-in fade-in"
          >
            {message}
          </div>
        )}

        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-8 font-bold tracking-tight text-slate-900">
              Inventario
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gestión del inventario de soportes publicitarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={load}
              aria-label="Actualizar listado de soportes"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-800 min-h-[44px] sm:min-h-[36px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/soportes/new')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] sm:min-h-[36px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo soporte</span>
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3">
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9 text-sm rounded-lg border-slate-200 focus-visible:ring-slate-800/10 focus-visible:border-slate-800"
                placeholder="Buscar por nombre, código o dirección..."
                aria-label="Buscar soportes"
              />
            </div>

            <select value={plaza} onChange={(e) => setPlaza(e.target.value)} aria-label="Filtrar por plaza" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10">
              <option value="todas">Todas las plazas</option>
              <option value="mendoza">Mendoza</option>
              <option value="buenos-aires">Buenos Aires</option>
            </select>

            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filtrar por formato" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10">
              <option value="todos">Todos los formatos</option>
              <option value="tradicional">Tradicional</option>
              <option value="led">Pantalla LED</option>
              <option value="led_movil">LED Móvil</option>
            </select>

            <select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Filtrar por disponibilidad" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10">
              <option value="todos">Disponibilidad</option>
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
            </select>

            <select value={active} onChange={(e) => setActive(e.target.value)} aria-label="Filtrar por estado activo" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10">
              <option value="todos">Estado</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo archivados</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span>
              Mostrando <strong className="text-slate-900 font-bold">{visible.length}</strong> de{' '}
              <strong className="text-slate-900 font-bold">{supports.length}</strong> soportes
            </span>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 font-bold text-red-600 hover:text-red-700 hover:underline min-h-[40px] sm:min-h-0">
                <FilterX className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </section>

        <section className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600 select-none">
                <tr>
                  <th className="px-3 py-2.5">
                    <button type="button" onClick={() => handleSort('name')} className="group inline-flex items-center gap-1.5 hover:text-slate-900">
                      <span>Soporte / Código</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button type="button" onClick={() => handleSort('ciudad')} className="group inline-flex items-center gap-1.5 hover:text-slate-900">
                      <span>Plaza / Formato</span>
                      {renderSortIcon('ciudad')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button type="button" onClick={() => handleSort('disponibilidad')} className="group inline-flex items-center gap-1.5 hover:text-slate-900">
                      <span>Disponibilidad</span>
                      {renderSortIcon('disponibilidad')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button type="button" onClick={() => handleSort('price')} className="group inline-flex items-center gap-1.5 hover:text-slate-900">
                      <span>Tarifa Total</span>
                      {renderSortIcon('price')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="font-semibold text-xs text-slate-600">Cargando inventario...</span>
                      </div>
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Inbox className="w-7 h-7 text-slate-300 mb-1.5" />
                        <p className="text-sm font-semibold text-slate-600">No hay soportes para mostrar</p>
                        <button type="button" onClick={() => navigate('/dashboard/soportes/new')} className="mt-2 text-xs font-bold text-slate-800 underline">
                          Crear soporte
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visible.map((item) => {
                    const total = calculateSupportTotal(item.pricing);
                    return (
                      <tr key={item.canonical_id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{item.canonical_id}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-800 capitalize">{item.ciudad?.replace('-', ' ')}</p>
                          <p className="text-[11px] text-slate-500">{item.tipo_soporte}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={item.active === false ? 'archived' : item.disponibilidad} />
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">
                          {formatSupportCurrency(total, item.pricing?.currency || 'ARS')}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/soportes/${encodeURIComponent(item.canonical_id)}/edit`)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <ActionMenu items={getActionMenuItems(item)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="md:hidden space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span className="mt-2 text-xs font-semibold">Cargando inventario...</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Inbox className="w-7 h-7 text-slate-300 mb-1.5" />
              <p className="text-sm font-semibold text-slate-600">No hay soportes para mostrar</p>
            </div>
          ) : (
            visible.map((item) => {
              const total = calculateSupportTotal(item.pricing);
              return (
                <article key={item.canonical_id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{item.canonical_id}</p>
                    </div>
                    <ActionMenu items={getActionMenuItems(item)} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <StatusBadge status={item.active === false ? 'archived' : item.disponibilidad} />
                    <span className="text-slate-500 capitalize">{item.ciudad?.replace('-', ' ')}</span>
                    <span className="font-semibold text-slate-800">{formatSupportCurrency(total, item.pricing?.currency || 'ARS')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/soportes/${encodeURIComponent(item.canonical_id)}/edit`)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </article>
              );
            })
          )}
        </section>

        <ReservationModal
          support={supportForReservation}
          isOpen={!!supportForReservation}
          onClose={() => setSupportForReservation(null)}
          onSuccess={() => {
            setSupportForReservation(null);
            load();
          }}
        />

        <ConfirmDialog
          isOpen={!!supportToArchive}
          title="¿Archivar soporte publicitario?"
          description={`El soporte "${supportToArchive?.name}" (${supportToArchive?.canonical_id}) dejará de estar disponible en el inventario público y circuitos activos.`}
          confirmLabel="Archivar Soporte"
          cancelLabel="Cancelar"
          variant="danger"
          isLoading={isArchiving}
          onConfirm={handleConfirmArchive}
          onCancel={() => setSupportToArchive(null)}
        />
      </div>
    </DashboardShell>
  );
}

