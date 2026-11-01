import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, ChevronRight, FilePlus2, FileText, Home, LogOut, MapPin, Menu, X, Building2, Users } from 'lucide-react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

interface DashboardShellProps { children: ReactNode; }
const pageLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/clientes': 'Clientes',
  '/dashboard/soportes': 'Inventario',
  '/dashboard/soportes/new': 'Nuevo soporte',
  '/dashboard/solicitudes': 'Solicitudes Media Kits',
  '/dashboard/mediakits': 'Solicitudes Media Kits',
  '/dashboard/mediakits/nuevo': 'Crear Media Kit',
};

export function DashboardShell({ children }: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/admin/stats').then((response) => { if (!cancelled) setAuthChecked(response.ok); })
      .catch(() => { if (!cancelled) setAuthChecked(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const loadNewLeadsCount = async () => {
      try {
        const response = await apiFetch('/api/admin/requests');
        if (!response.ok) return;
        const json = await response.json();
        if (cancelled || json.status !== 'success' || !Array.isArray(json.data)) return;
        setNewLeadsCount(json.data.filter((lead: { status?: string }) => lead.status === 'nuevo' || lead.status === 'pending').length);
      } catch { /* El panel sigue operativo si no carga el contador. */ }
    };
    void loadNewLeadsCount();
    return () => { cancelled = true; };
  }, [location.pathname, authChecked]);

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const currentPage = useMemo(() => {
    if (pageLabels[location.pathname]) return pageLabels[location.pathname];
    if (location.pathname.includes('/edit')) return 'Editar soporte';
    if (location.pathname.includes('/preview')) return 'Vista previa';
    if (location.pathname.includes('/reservation')) return 'Reserva';
    return 'Panel de administración';
  }, [location.pathname]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${isActive ? 'bg-[#DBE7FF] text-[#2563EB]' : 'text-[#475569] hover:bg-white/70 hover:text-[#1E293B]'}`;

  const handleLogout = () => {
    void apiFetch('/api/admin/logout', { method: 'POST' }).finally(() => navigate('/login'));
  };

  const navGroups = [
    { label: 'PRINCIPAL', items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home, end: true },
      { to: '/dashboard/soportes', label: 'Inventario', icon: MapPin },
      { to: '/dashboard/solicitudes', label: 'Solicitudes Media Kits', icon: FileText, count: newLeadsCount },
      { to: '/dashboard/clientes', label: 'Clientes', icon: Users },
    ]},
    { label: 'GESTIÓN', items: [
      { to: '/dashboard/mediakits/nuevo', label: 'Crear Media Kit', icon: FilePlus2 },
    ]},
  ];

  if (!authChecked) return <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">Validando sesión…</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B]">
      {mobileNavOpen && <button type="button" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" />}
      <div className="min-h-screen md:flex">
        <aside className={`${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#E2E8F0] bg-[#F1F5FB] px-3 py-5 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0`}>
          <div className="flex items-center gap-2.5 px-1.5 pb-4">
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#0F2A5C] text-xs font-bold text-white">GC</span>
            <span className="text-[15px] font-semibold tracking-tight text-[#1E293B]">Grupo Comunicarte</span>
            <button type="button" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)} className="ml-auto rounded-md p-1 text-slate-500 hover:bg-white md:hidden"><X size={18}/></button>
          </div>
          <div className="flex items-center gap-2.5 px-1.5 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#DCE4F0] text-sm font-semibold text-[#475569]">GC</span>
            <div className="min-w-0"><p className="truncate text-[13px] font-medium text-[#1E293B]">Administración</p><p className="mt-0.5 text-[11px] text-[#64748B]">Grupo Comunicarte OOH</p></div>
          </div>
          <nav aria-label="Navegación principal" className="mt-3 space-y-3">
            {navGroups.map((group) => <section key={group.label}>
              <h2 className="px-2.5 pb-1 pt-3 text-[11px] font-semibold tracking-[.04em] text-[#64748B]">{group.label}</h2>
              <div className="space-y-0.5">{group.items.map(({ to, label, icon: Icon, end, count }: any) => <NavLink key={to} to={to} end={end} className={navClass}>
                {({ isActive }) => <><Icon size={20} strokeWidth={1.7} className={isActive ? 'text-[#2563EB]' : 'text-[#5B6B86]'}/><span className="min-w-0 flex-1">{label}</span>{count ? <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">{count}</span> : null}</>}
              </NavLink>)}</div>
            </section>)}
          </nav>
          <div className="mt-auto space-y-1 border-t border-[#E2E8F0] pt-4">
            <Link to="/inventario" className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-[#475569] transition hover:bg-white/70"><Building2 size={19} strokeWidth={1.7} className="text-[#5B6B86]"/><span className="flex-1">Inventario público</span><ChevronRight size={15} className="text-slate-400"/></Link>
            <button type="button" onClick={handleLogout} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#475569] transition hover:bg-white/70 hover:text-red-700"><LogOut size={19} strokeWidth={1.7} className="text-[#5B6B86]"/>Cerrar sesión</button>
            <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-[#E8EDF5] p-3"><span className="h-[30px] w-[34px] shrink-0 rounded bg-[#CBD5E1]"/><div><p className="text-[11px] font-medium text-[#475569]">Panel de administración</p><p className="mt-0.5 text-[11px] text-[#64748B]">Grupo Comunicarte</p></div></div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menú" className="rounded-md p-2 text-[#475569] hover:bg-[#F1F5F9] md:hidden"><Menu size={19}/></button><div className="min-w-0 md:hidden"><p className="truncate text-sm font-semibold">{currentPage}</p></div><div className="hidden text-xs text-[#64748B] md:block">{currentPage}</div></div>
            <div className="flex items-center gap-4"><Link to="/dashboard/solicitudes" className="relative rounded-md p-1.5 text-[#475569] transition hover:bg-[#F1F5F9]" title={`${newLeadsCount} solicitudes nuevas`} aria-label={`${newLeadsCount} solicitudes nuevas`}><Bell size={20} strokeWidth={1.7}/>{newLeadsCount > 0 && <i className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#2563EB]"/>}</Link><span className="hidden h-7 w-px bg-[#E2E8F0] sm:block"/><span className="hidden text-xs font-medium text-[#475569] sm:block">Grupo Comunicarte</span></div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-6 lg:px-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
