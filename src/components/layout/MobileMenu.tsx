import { Search, Send, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

interface MobileMenuProps { open: boolean; onClose: () => void; onSearch: () => void; }

const links = [
  { name: 'Inventario', path: '/inventario' },
  { name: 'Soportes', path: '/soportes' },
  { name: 'Soluciones', path: '/soluciones' },
  { name: 'Nosotros', path: '/nosotros' },
];

export function MobileMenu({ open, onClose, onSearch }: MobileMenuProps) {
  const location = useLocation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () => dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? [];
    requestAnimationFrame(() => focusable()[0]?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = Array.from(focusable()).filter(element => element.offsetParent !== null);
      if (elements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div id="mobile-navigation" className="xl:hidden fixed inset-0 z-[3000]">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-label="Cerrar menú"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        tabIndex={-1}
        className="absolute inset-x-0 top-20 bottom-0 overflow-y-auto overscroll-contain bg-white/95 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-xl space-y-5 px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={onSearch}
            className="flex min-h-11 w-full items-center gap-3 border-b border-zinc-200 pb-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <Search className="h-5 w-5 text-zinc-500" aria-hidden="true" />
            <span>Buscar soportes</span>
          </button>

          <nav aria-label="Navegación principal" className="flex flex-col">
            {links.map(({ name, path }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 items-center border-b border-zinc-100 py-2.5 text-[15px] font-medium transition-colors hover:text-[#006B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 ${active ? 'text-[#006B49]' : 'text-zinc-800'}`}
                >
                  <span className="flex-1">{name}</span>
                </Link>
              );
            })}
          </nav>

          <Link
            to="/login"
            onClick={onClose}
            className="flex min-h-11 items-center gap-2 border-t border-zinc-200 pt-3 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <User className="h-5 w-5 text-zinc-500" aria-hidden="true" />
            <span>Iniciar sesión</span>
          </Link>

          <div className="pt-1">
            <Link
              to="/contacto"
              onClick={onClose}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#007D54] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#006B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
            >
              Solicitar cotización <Send className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
