import { Layers, Menu, Search, User, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSelection } from '../../context/SelectionContext';
import { cn } from '../../lib/utils';
import { SearchModal } from './SearchModal';
import { MobileMenu } from './MobileMenu';
import { MediakitPanel } from '../map/MediakitPanel';
import { useInventory } from '../../hooks/useInventory';
import { useEffect, useState } from 'react';

export function Navbar() {
  const location = useLocation();
  const { selectedCount, getSelectedItems } = useSelection();
  const { items } = useInventory();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mediakitOpen, setMediakitOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const links = [
    ['Inventario', '/inventario'],
    ['Soportes', '/soportes'],
    ['Soluciones', '/soluciones'],
    ['Nosotros', '/nosotros'],
    ['Contacto', '/contacto'],
  ];

  const selectedItems = getSelectedItems(items);
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0" aria-label="Grupo Comunicarte, inicio">
            <img src="/brand/brand-dark.webp" alt="Grupo Comunicarte" className="h-8 w-auto max-w-[190px] object-contain" />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
            {links.map(([name, path]) => (
              <Link
                key={path}
                to={path}
                aria-current={isActive(path) ? 'page' : undefined}
                className={cn(
                  'whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-950',
                  isActive(path) && 'bg-zinc-100 font-semibold text-zinc-950'
                )}
              >
                {name}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-1.5 lg:flex">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              aria-label="Buscar soportes"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => setMediakitOpen(true)}
              className="relative flex h-10 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              aria-label="Abrir Media Kit"
            >
              <Layers className="h-4 w-4" />
              <span>Media Kit</span>
              {selectedCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[10px] font-bold text-white">
                  {selectedCount}
                </span>
              )}
            </button>

            <Link
              to="/contacto"
              className="flex h-10 items-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Hablar con ventas
            </Link>

            <Link
              to="/login"
              className="hidden h-10 w-10 xl:flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              aria-label="Iniciar sesión"
            >
              <User className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMediakitOpen(true)}
              className="relative flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-200 px-2.5 text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              aria-label={selectedCount > 0 ? `Abrir Media Kit, ${selectedCount} soportes seleccionados` : 'Abrir Media Kit'}
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              {selectedCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[10px] font-bold text-white">
                  {selectedCount}
                </span>
              )}
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200"
              onClick={() => setMobileOpen(value => !value)}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSearch={() => {
          setMobileOpen(false);
          setSearchOpen(true);
        }}
      />

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {mediakitOpen && <MediakitPanel selectedItems={selectedItems} onClose={() => setMediakitOpen(false)} />}
    </>
  );
}
