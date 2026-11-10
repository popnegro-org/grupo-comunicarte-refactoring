import { ChevronRight, Home, MapPin, Send, Sparkles, Tv, Users, Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

interface MobileMenuProps { open: boolean; onClose: () => void; onSearch: () => void; }

const links = [
  { name: 'Inicio', path: '/', icon: Home, sub: 'Conocé Grupo Comunicarte' },
  { name: 'Inventario', path: '/inventario', icon: MapPin, sub: 'Explorá soportes disponibles' },
  { name: 'Soportes', path: '/soportes', icon: Tv, sub: 'Tipos y formatos publicitarios' },
  { name: 'Soluciones', path: '/soluciones', icon: Sparkles, sub: 'Propuestas para tu campaña' },
  { name: 'Nosotros', path: '/nosotros', icon: Users, sub: 'La empresa y su experiencia' },
  { name: 'Contacto', path: '/contacto', icon: Send, sub: 'Hablemos de tu campaña' },
];

export function MobileMenu({ open, onClose, onSearch }: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-[3000]">
      <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" onClick={onClose} aria-label="Cerrar menú" />
      <div className="absolute inset-x-0 top-20 bottom-0 overflow-y-auto bg-white/95 backdrop-blur-xl">
        <div className="space-y-3 p-4">
          <button onClick={onSearch} className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left">
            <Search className="h-5 w-5 text-zinc-400" />
            <span><span className="block text-sm font-semibold text-zinc-900">Buscar soportes</span><span className="block text-xs text-zinc-500">Nombre, código, dirección o tipo</span></span>
          </button>
          <nav aria-label="Navegación principal" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {links.map(({ name, path, icon: Icon, sub }) => (
              <Link key={path} to={path} onClick={onClose} className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 last:border-0">
                <Icon className="h-5 w-5 text-zinc-500" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{name}</span><span className="block text-xs text-zinc-500">{sub}</span></span>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </Link>
            ))}
          </nav>
          <Link to="/login" onClick={onClose} className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
            <User className="h-5 w-5 text-zinc-500" /><span className="flex-1 text-sm font-semibold">Iniciar sesión</span><ChevronRight className="h-4 w-4 text-zinc-300" />
          </Link>
          <div className="grid gap-2 sm:grid-cols-2"><Link to="/contacto" onClick={onClose} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white">Hablar con ventas <Send className="h-4 w-4" /></Link><a href="https://wa.me/5492616706710" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900">WhatsApp comercial</a></div>
        </div>
      </div>
    </div>
  );
}
