import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileStack } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useSelection } from '../context/SelectionContext';
import { SupportCard } from '../components/inventory/SupportCard';
import { buttonStyles } from '../components/ui/Button';
import { Loader2, AlertCircle } from 'lucide-react';

/** Public Media Kit review page (/mediakits). */
export default function MediaKits() {
  const { items, loading, error, refetch } = useInventory();
  const { selectedCount, removeSelected, clearSelection, getSelectedItems } = useSelection();
  const selectedItems = getSelectedItems(items);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-gray-900" aria-hidden="true" />
          <p className="text-sm font-semibold text-gray-600">Cargando tu selección...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container py-16" role="alert">
        <div className="mx-auto max-w-md border border-gray-200 bg-white p-6 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-red-600" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold text-gray-950">No pudimos cargar los soportes</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button type="button" onClick={refetch} className={buttonStyles({ className: 'mt-5 w-full justify-center' })}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-[#F9F9F9]">
      <div className="border-b border-gray-200 bg-white">
        <div className="page-container py-8 md:py-10">
          <Link to="/inventario" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inventario
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Media Kit</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                Revisá tu selección
              </h1>
              <p className="mt-2 max-w-xl text-sm text-gray-600" aria-live="polite">
                {selectedCount === 0
                  ? 'Todavía no hay soportes en tu Media Kit. Explorá el inventario y agregá los que te interesen.'
                  : `${selectedCount} ${selectedCount === 1 ? 'soporte listo' : 'soportes listos'} para solicitar propuesta comercial.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCount > 0 && (
                <button type="button" onClick={clearSelection} className={buttonStyles({ variant: 'outline', className: 'min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-950' })}>
                  Vaciar selección
                </button>
              )}
              <Link
                to={selectedCount > 0 ? '/contacto?origen=mediakit' : '/inventario'}
                className={buttonStyles({ className: 'min-h-11 inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-950' })}
              >
                {selectedCount > 0 ? (
                  <>
                    Solicitar propuesta
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Explorar inventario
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-8 md:py-12">
        {selectedCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <FileStack className="h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-gray-950">Tu Media Kit está vacío</p>
            <p className="mt-2 max-w-sm text-sm text-gray-600">
              En el inventario podés filtrar por plaza, tipo y disponibilidad, y agregar soportes a esta selección.
            </p>
            <Link to="/inventario" className={buttonStyles({ className: 'mt-6 min-h-11 inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-950' })}>
              Ir al inventario
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedItems.map((item) => (
              <li key={item.canonical_id}>
                <SupportCard
                  item={item}
                  variant="selectable"
                  onRemove={(it) => removeSelected(it.canonical_id)}
                />
              </li>
            ))}
          </ul>
        )}

        {selectedCount > 0 && selectedItems.length < selectedCount && (
          <p className="mt-6 text-sm text-amber-800">
            Algunos soportes de tu selección ya no están en el inventario público y no se muestran aquí.
            Podés vaciar la selección y volver a armar el Media Kit.
          </p>
        )}
      </div>
    </main>
  );
}
