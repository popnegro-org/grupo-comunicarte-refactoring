import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InventoryItem, isMobileRoute } from '../../types';
import { useSelection } from '../../context/SelectionContext';

interface MediakitPanelProps {
  selectedItems: InventoryItem[];
  onClose: () => void;
}

export function MediakitPanel({ selectedItems, onClose }: MediakitPanelProps) {
  const { removeSelected } = useSelection();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const list = Array.from(focusable);
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement;
      if (event.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[3000]" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="fixed bottom-0 right-0 left-0 md:top-4 md:bottom-auto md:left-auto md:right-4 w-full md:w-[420px] max-h-[90vh] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mediakit-panel-title"
      >
        <header className="flex items-center justify-between gap-4 p-5 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Cierre de selección</p>
            <h2 id="mediakit-panel-title" className="mt-1 text-xl font-semibold text-gray-950">Tu Media Kit</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            aria-label="Cerrar Media Kit"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="p-5 overflow-y-auto max-h-[calc(88vh-150px)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800" aria-live="polite">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-950 px-2 text-white">
              {selectedItems.length}
            </span>
            {selectedItems.length === 1 ? 'soporte seleccionado' : 'soportes seleccionados'}
          </div>
          {selectedItems.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
              <p className="text-sm font-bold text-gray-900">Todavía no seleccionaste soportes</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Explorá el inventario y agregá los soportes que quieras comparar o consultar.
              </p>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {selectedItems.map((item) => (
              <div key={item.canonical_id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {isMobileRoute(item) ? 'Soporte móvil' : item.tipo_soporte}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelected(item.canonical_id)}
                  className="min-h-11 px-2 text-xs font-semibold text-gray-500 hover:text-gray-950 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 rounded-lg"
                  aria-label={`Quitar ${item.name}`}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-gray-500">
            Podés seguir agregando soportes desde el inventario. La selección se conserva en este navegador.
          </p>
          <div className="mt-6 grid gap-2">
            <Link
              to={selectedItems.length ? '/contacto?origen=mediakit' : '/inventario'}
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-bold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              {selectedItems.length ? 'Solicitar propuesta' : 'Explorar inventario'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                to="/mediakits"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                Revisar en página
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                Seguir seleccionando
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
