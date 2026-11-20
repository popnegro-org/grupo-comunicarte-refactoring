import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, ArrowDownRight, ArrowUpRight, Building2, FilePlus2, FileText,
  LayoutGrid, MapPin, Monitor, Plus, Radio, RefreshCw, TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { LoadingState, EmptyState, ErrorState } from '../../components/dashboard/ui/Feedback';
import { apiFetch } from '../../lib/api';

interface Stats {
  total: number; available: number; reserved: number; inactive: number;
  mendozaTotal: number; mendozaAvailable: number;
  buenosAiresTotal: number; buenosAiresAvailable: number;
  tradicionalCount: number; ledCount: number; movilCount: number;
  totalRequests: number; pendingRequests: number; plazaCount: number;
}
interface RequestItem {
  id?: string | number; requestId?: string; requesterName?: string; name?: string;
  email?: string; status?: string; createdAt?: string; created_at?: string; date?: string;
}
const emptyStats: Stats = {
  total: 0, available: 0, reserved: 0, inactive: 0,
  mendozaTotal: 0, mendozaAvailable: 0, buenosAiresTotal: 0, buenosAiresAvailable: 0,
  tradicionalCount: 0, ledCount: 0, movilCount: 0, totalRequests: 0, pendingRequests: 0, plazaCount: 0,
};
const number = (value: number) => new Intl.NumberFormat('es-AR').format(value);
function formatDate(value: unknown) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(date);
}
function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function MetricCard({ label, value, detail, icon: Icon, accent = 'blue' }: {
  label: string; value: number | string; detail: string;
  icon: LucideIcon; accent?: 'blue' | 'green' | 'amber' | 'slate';
}) {
  const accents = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${accents[accent]}`}>
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-[30px] font-semibold leading-none tracking-tight text-slate-950 tabular-nums">{number(Number(value) || 0)}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-600">{eyebrow}</p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [statsResponse, requestsResponse] = await Promise.all([
          apiFetch('/api/admin/stats'),
          apiFetch('/api/admin/requests'),
        ]);
        const [statsJson, requestsJson] = await Promise.all([
          statsResponse.json(), requestsResponse.json(),
        ]);
        if (!statsResponse.ok || statsJson.status !== 'success') {
          throw new Error(statsJson.message || 'No pudimos cargar el resumen.');
        }
        if (!cancelled) {
          setStats({ ...emptyStats, ...statsJson.data });
          setRequests(requestsJson.status === 'success' && Array.isArray(requestsJson.data) ? requestsJson.data : []);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No pudimos cargar el resumen.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const availableRate = percentage(stats.available, stats.total);
  const reservedRate = percentage(stats.reserved, stats.total);
  const recent = requests.slice(0, 5);
  const cities = [
    { name: 'Mendoza', total: stats.mendozaTotal, available: stats.mendozaAvailable },
    { name: 'Buenos Aires', total: stats.buenosAiresTotal, available: stats.buenosAiresAvailable },
  ];
  const types = [
    { label: 'Tradicionales', value: stats.tradicionalCount, icon: MapPin },
    { label: 'Pantallas LED', value: stats.ledCount, icon: Monitor },
    { label: 'LED móvil', value: stats.movilCount, icon: Radio },
  ];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px] space-y-8 pb-10">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>Administración</span><span aria-hidden="true">/</span><span className="text-slate-600">Resumen</span>
            </div>
            <h1 className="mt-3 text-[28px] font-semibold tracking-[-.04em] text-slate-950">Panel de control</h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-500">Estado general del inventario OOH y actividad comercial de Grupo Comunicarte.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Actualizar
            </button>
            <Link to="/dashboard/soportes/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 text-xs font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
              <Plus size={15} />Nuevo soporte
            </Link>
          </div>
        </header>

        {error && <ErrorState description={error} action={<button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="font-semibold underline underline-offset-2">Reintentar</button>} />}
        {loading ? <LoadingState label="Cargando información del panel…" /> : !error && <>
          <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Inventario total" value={stats.total} detail={`${number(stats.plazaCount)} plazas con inventario`} icon={LayoutGrid} />
            <MetricCard label="Disponibles" value={stats.available} detail={`${availableRate}% del inventario activo`} icon={ArrowUpRight} accent="green" />
            <MetricCard label="Reservados" value={stats.reserved} detail={`${reservedRate}% de ocupación`} icon={ArrowDownRight} accent="amber" />
            <MetricCard label="Solicitudes" value={stats.totalRequests || requests.length} detail={`${number(stats.pendingRequests)} pendientes de gestión`} icon={FileText} accent="slate" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.85fr)]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading eyebrow="Distribución geográfica" title="Disponibilidad por plaza"
                action={<Link to="/dashboard/soportes" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">Ver inventario <ArrowUpRight size={14}/></Link>} />
              <div className="mt-6 space-y-6">
                {cities.map((city) => {
                  const rate = percentage(city.available, city.total);
                  return <div key={city.name}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Building2 size={16}/></span><span className="text-sm font-semibold text-slate-800">{city.name}</span></div>
                      <span className="text-xs tabular-nums text-slate-500">{number(city.total)} soportes</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-700">{number(city.available)} disponibles</span>
                      <span className="text-slate-500">{number(Math.max(city.total - city.available, 0))} no disponibles</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Disponibilidad en ${city.name}`} aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${rate}%` }} />
                    </div>
                  </div>;
                })}
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <div><p className="text-[11px] text-slate-600">Tasa de disponibilidad</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{availableRate}%</p></div>
                <div><p className="text-[11px] text-slate-600">Tasa de ocupación</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{reservedRate}%</p></div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading eyebrow="Accesos directos" title="Operaciones frecuentes" />
              <div className="mt-5 space-y-2">
                <Link to="/dashboard/soportes/new" className="group flex min-h-[66px] items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700"><Plus size={19}/></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">Agregar soporte</span><span className="mt-0.5 block text-xs text-slate-500">Incorporar una nueva ubicación</span></span><ArrowUpRight size={16} className="text-slate-600 transition group-hover:text-blue-700"/>
                </Link>
                <Link to="/dashboard/solicitudes" className="group flex min-h-[66px] items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700"><FileText size={18}/></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">Revisar solicitudes</span><span className="mt-0.5 block text-xs text-slate-500">Gestionar consultas de Media Kit</span></span><ArrowUpRight size={16} className="text-slate-600 transition group-hover:text-blue-700"/>
                </Link>
                <Link to="/dashboard/mediakits/nuevo" className="group flex min-h-[66px] items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><FilePlus2 size={18}/></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">Crear Media Kit</span><span className="mt-0.5 block text-xs text-slate-500">Preparar una propuesta comercial</span></span><ArrowUpRight size={16} className="text-slate-600 transition group-hover:text-blue-700"/>
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500"><Activity size={15} className="text-slate-600"/>Datos del sistema en tiempo de consulta</div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading eyebrow="Composición del catálogo" title="Inventario por tipología" />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {types.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg bg-slate-50 p-4">
                  <Icon size={17} className="text-slate-500"/>
                  <p className="mt-4 text-2xl font-semibold tabular-nums text-slate-900">{number(value)}</p>
                  <p className="mt-1 text-xs text-slate-500">{label}</p>
                </div>)}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-end justify-between gap-3 px-5 py-5 sm:px-6">
                <SectionHeading eyebrow="Actividad comercial" title="Solicitudes recientes" />
                <Link to="/dashboard/solicitudes" className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">Ver todas <ArrowUpRight size={14}/></Link>
              </div>
              {recent.length ? <div className="divide-y divide-slate-100">
                {recent.map((request, index) => <Link key={request.id || request.requestId || index} to="/dashboard/solicitudes" className="flex min-h-[62px] items-center gap-3 px-5 py-3 transition hover:bg-slate-50 sm:px-6">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><FileText size={16}/></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{request.requesterName || request.name || 'Solicitud'}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{request.requestId || request.email || 'Sin identificador'}</span></span>
                  <span className="shrink-0 text-[11px] text-slate-600">{formatDate(request.createdAt || request.created_at || request.date)}</span>
                </Link>)}
              </div> : <div className="px-5 pb-5 sm:px-6"><EmptyState title="No hay solicitudes recientes" description="Las nuevas solicitudes aparecerán aquí." action={<Link to="/dashboard/solicitudes" className="font-semibold text-slate-800 underline underline-offset-2">Ver solicitudes</Link>}/></div>}
            </div>
          </section>
          <p className="flex items-center gap-2 text-[11px] text-slate-600"><TrendingUp size={13}/>Resumen operativo · Grupo Comunicarte OOH</p>
        </>}
      </div>
    </DashboardShell>
  );
}
