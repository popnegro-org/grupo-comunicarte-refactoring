import { ChevronRight, MapPin, Send, Sparkles, Tv, Users, Search, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

interface MobileMenuProps { open: boolean; onClose: () => void; onSearch: () => void; }

const links = [
  { name: 'Inventario', path: '/inventario', icon: MapPin, sub: 'Explorá soportes disponibles' },
  { name: 'Soportes', path: '/soportes', icon: Tv, sub: 'Tipos y formatos publicitarios' },
  { name: 'Soluciones', path: '/soluciones', icon: Sparkles, sub: 'Propuestas para tu campaña' },
  { name: 'Nosotros', path: '/nosotros', icon: Users, sub: 'La empresa y su experiencia' },
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
        <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
          <button
            type="button"
            onClick={onSearch}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <Search className="h-5 w-5 text-zinc-500" aria-hidden="true" />
            <span><span className="block text-sm font-semibold text-zinc-900">Buscar soportes</span><span className="block text-xs text-zinc-500">Nombre, código, dirección o tipo</span></span>
          </button>

          <nav aria-label="Navegación principal" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {links.map(({ name, path, icon: Icon, sub }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[68px] items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 ${active ? 'bg-zinc-50' : ''}`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-zinc-950">{name}</span><span className="block text-xs text-zinc-500">{sub}</span></span>
                  <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                </Link>
              );
            })}
          </nav>

          <Link
            to="/login"
            onClick={onClose}
            className="flex min-h-12 items-center gap-3 rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <User className="h-5 w-5 text-zinc-500" aria-hidden="true" />
            <span className="flex-1 text-sm font-semibold text-zinc-900">Iniciar sesión</span>
            <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          </Link>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to="/contacto"
              onClick={onClose}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
            >
              Solicitar cotización <Send className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="https://wa.me/5492616706710"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
            >
              WhatsApp comercial
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
