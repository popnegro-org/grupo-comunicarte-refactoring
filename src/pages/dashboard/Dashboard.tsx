import { useEffect, useState } from 'react';
import { FilePlus2, FileText, MapPin, MonitorSmartphone, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { KPICard } from '../../components/dashboard/ui/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/dashboard/ui/Card';
import { LoadingState, EmptyState, ErrorState } from '../../components/dashboard/ui/Feedback';
import { apiFetch } from '../../lib/api';

interface Stats { total:number; available:number; reserved:number; inactive:number; mendozaTotal:number; mendozaAvailable:number; buenosAiresTotal:number; buenosAiresAvailable:number; tradicionalCount:number; ledCount:number; movilCount:number; totalRequests:number; pendingRequests:number; plazaCount:number; }
const emptyStats: Stats = { total:0, available:0, reserved:0, inactive:0, mendozaTotal:0, mendozaAvailable:0, buenosAiresTotal:0, buenosAiresAvailable:0, tradicionalCount:0, ledCount:0, movilCount:0, totalRequests:0, pendingRequests:0, plazaCount:0 };
function formatDate(value: unknown) { if (!value) return ''; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'short'}).format(d); }

export default function Dashboard() {
  const [stats,setStats]=useState<Stats>(emptyStats); const [requests,setRequests]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  useEffect(()=>{ let cancelled=false; (async()=>{try{const [sr,rr]=await Promise.all([apiFetch('/api/admin/stats'),apiFetch('/api/admin/requests')]); const [sj,rj]=await Promise.all([sr.json(),rr.json()]); if(!sr.ok||sj.status!=='success')throw new Error(sj.message||'No pudimos cargar el resumen.'); if(!cancelled){setStats({...emptyStats,...sj.data});setRequests(rj.status==='success'?rj.data:[]);}}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'No pudimos cargar el resumen.');}finally{if(!cancelled)setLoading(false);}})(); return()=>{cancelled=true;};},[]);
  const availableRate=stats.total?Math.round(stats.available/stats.total*100):0; const occupancyRate=stats.total?Math.round(stats.reserved/stats.total*100):0; const recent=requests.slice(0,5);

  const Header = () => (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#1E293B]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#64748B]">Resumen comercial de soportes y solicitudes.</p>
      </div>
      <Link to="/dashboard/mediakits/nuevo" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white transition hover:bg-blue-700"><FilePlus2 className="h-3.5 w-3.5 text-blue-100"/>Nuevo Media Kit</Link>
    </header>
  );

  if(loading)return <DashboardShell><div className="mx-auto max-w-[1320px] space-y-5"><Header/><LoadingState label="Cargando información del dashboard…"/></div></DashboardShell>;
  if(error)return <DashboardShell><div className="mx-auto max-w-[1320px] space-y-5"><Header/><ErrorState description={error} action={<button type="button" onClick={()=>window.location.reload()} className="font-semibold underline underline-offset-2">Reintentar</button>}/></div></DashboardShell>;

  return <DashboardShell><div className="mx-auto max-w-[1320px] space-y-7 pb-10">
    <Header/>

    <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KPICard title="Soportes" value={stats.total} unit={`${stats.available} disponibles`} icon={MonitorSmartphone} footer={`${availableRate}% del inventario disponible`} />
      <KPICard title="Ocupación" value={`${occupancyRate}%`} unit={`${stats.reserved} reservados`} icon={MapPin} footer="Inventario actualmente reservado" />
      <KPICard title="Solicitudes" value={stats.totalRequests||requests.length} unit={stats.pendingRequests?`${stats.pendingRequests} pendientes`:'sin pendientes'} icon={FileText} footer="Solicitudes recibidas" />
      <KPICard title="Plazas" value={stats.plazaCount} unit="Ciudades con inventario activo" icon={MapPin} footer={`${stats.mendozaTotal+stats.buenosAiresTotal} soportes registrados`} />
    </section>

    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 border-b border-slate-100"><div><CardTitle>Disponibilidad por plaza</CardTitle><p className="mt-1 text-xs text-slate-500">Inventario disponible y reservado actualmente.</p></div><Link to="/dashboard/soportes" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#2563EB]">Gestionar<ArrowUpRight className="h-3.5 w-3.5"/></Link></CardHeader>
        <CardContent className="space-y-6 pt-5">
          {([['Mendoza',stats.mendozaTotal,stats.mendozaAvailable],['Buenos Aires',stats.buenosAiresTotal,stats.buenosAiresAvailable]] as const).map(([name,total,available])=><div key={name} className="space-y-2.5"><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-900">{name}</span><span className="text-xs text-slate-500">{total} soportes</span></div><div className="flex justify-between text-xs"><span className="text-slate-700">{available} disponibles</span><span className="text-slate-500">{Math.max(total-available,0)} reservados</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2563EB] transition-all" style={{width:`${total?Math.min(100,available/total*100):0}%`}}/></div></div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 border-b border-slate-100"><div><CardTitle>Solicitudes recientes</CardTitle><p className="mt-1 text-xs text-slate-500">Últimos contactos recibidos.</p></div><Link to="/dashboard/solicitudes" className="shrink-0 text-xs font-semibold text-slate-600 hover:text-[#2563EB]">Ver todas</Link></CardHeader>
        {recent.length?<div className="divide-y divide-slate-100/80">{recent.map((req:any)=><Link key={req.id||req.requestId} to="/dashboard/solicitudes" className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-50 sm:px-5"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{req.requesterName||req.name||'Solicitud'}</p><p className="truncate text-[11px] text-slate-500">{req.requestId||req.email||'Sin identificador'}</p></div><span className="shrink-0 text-[11px] text-slate-500">{formatDate(req.createdAt||req.created_at||req.date)}</span></Link>)}</div>:<CardContent><EmptyState title="No hay solicitudes recientes" description="Las nuevas solicitudes aparecerán aquí." action={<Link to="/dashboard/solicitudes" className="font-semibold text-slate-800 underline underline-offset-2">Ver solicitudes</Link>}/></CardContent>}
      </Card>
    </div>

  </div></DashboardShell>;
}
