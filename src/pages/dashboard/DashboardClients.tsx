import { useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Phone, Search, Users, FileText, RefreshCw, ArrowUpRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { apiFetch } from '../../lib/api';

type RequestRecord = {
  id?: string | number;
  requestId?: string;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterCompany?: string | null;
  requesterPhone?: string | null;
  status?: string;
  createdAt?: string | null;
};
type MediaKitRecord = {
  kitId?: string;
  sourceRequestId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientCompany?: string | null;
  clientPhone?: string | null;
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};
type Client = {
  key: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  requests: RequestRecord[];
  kits: MediaKitRecord[];
  lastActivity: string;
};

function dateLabel(value?: string | null) {
  if (!value) return 'Sin actividad registrada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin actividad registrada' : date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function normalized(value?: string | null) { return (value || '').trim().toLocaleLowerCase('es-AR'); }
function clientKey(email?: string | null, name?: string | null, company?: string | null, fallbackKey?: string) {
  const normalizedEmail = normalized(email);
  if (normalizedEmail) return `email:${normalizedEmail}`;
  const normalizedName = normalized(name);
  const normalizedCompany = normalized(company);
  if (normalizedName || normalizedCompany) return `name:${normalizedName}|${normalizedCompany}`;
  // Keep anonymous records distinct instead of merging unrelated contacts.
  return `record:${fallbackKey || 'unknown'}`;
}

export default function DashboardClients() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [kits, setKits] = useState<MediaKitRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [requestsResponse, kitsResponse] = await Promise.all([
        apiFetch('/api/admin/requests'),
        apiFetch('/api/admin/mediakits'),
      ]);
      const [requestsJson, kitsJson] = await Promise.all([
        requestsResponse.json(),
        kitsResponse.json(),
      ]);
      if (!requestsResponse.ok || requestsJson.status !== 'success') {
        throw new Error(requestsJson.message || 'No se pudieron cargar los clientes desde las solicitudes.');
      }
      if (!kitsResponse.ok || kitsJson.status !== 'success') {
        throw new Error(kitsJson.message || 'No se pudieron cargar los Media Kits.');
      }
      setRequests(Array.isArray(requestsJson.data) ? requestsJson.data : []);
      setKits(Array.isArray(kitsJson.data) ? kitsJson.data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el módulo de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const clients = useMemo(() => {
    const grouped = new Map<string, Client>();
    const ensure = (name?: string | null, company?: string | null, email?: string | null, phone?: string | null, fallbackKey?: string) => {
      const key = clientKey(email, name, company, fallbackKey);
      let client = grouped.get(key);
      if (!client) {
        client = { key, name: name?.trim() || 'Cliente sin nombre', company: company?.trim() || '', email: email?.trim() || '', phone: phone?.trim() || '', requests: [], kits: [], lastActivity: '' };
        grouped.set(key, client);
      } else {
        if (!client.email && email) client.email = email.trim();
        if (!client.phone && phone) client.phone = phone.trim();
        if (!client.company && company) client.company = company.trim();
        if (client.name === 'Cliente sin nombre' && name) client.name = name.trim();
      }
      return client;
    };
    requests.forEach((request, index) => {
      const identity = request.requestId || request.id || `index-${index}`;
      const client = ensure(request.requesterName, request.requesterCompany, request.requesterEmail, request.requesterPhone, `request-${identity}`);
      client.requests.push(request);
      const activity = request.createdAt || '';
      if (activity && (!client.lastActivity || activity > client.lastActivity)) client.lastActivity = activity;
    });
    kits.forEach((kit, index) => {
      const identity = kit.kitId || `index-${index}`;
      const client = ensure(kit.clientName, kit.clientCompany, kit.clientEmail, kit.clientPhone, `mediakit-${identity}`);
      client.kits.push(kit);
      const activity = kit.updatedAt || kit.createdAt || '';
      if (activity && (!client.lastActivity || activity > client.lastActivity)) client.lastActivity = activity;
    });
    return [...grouped.values()].sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || '') || a.name.localeCompare(b.name, 'es'));
  }, [requests, kits]);

  const visible = useMemo(() => {
    const term = normalized(query);
    if (!term) return clients;
    return clients.filter((client) => [client.name, client.company, client.email, client.phone].some((value) => normalized(value).includes(term)));
  }, [clients, query]);

  return <DashboardShell>
    <div className="mx-auto max-w-[1320px] space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#1E293B]">Clientes</h1>
          <p className="mt-1 text-sm text-[#64748B]">Contactos comerciales derivados de solicitudes y Media Kits registrados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-xs font-semibold text-[#334155] hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Actualizar</button>
          <Link to="/dashboard/solicitudes" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-blue-700">Ver solicitudes<ArrowUpRight size={15}/></Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Indicadores de clientes">
        <article className="rounded-lg border border-[#E2E8F0] bg-white p-4"><div className="flex items-center justify-between text-sm text-[#64748B]"><span>Clientes identificados</span><Users size={18}/></div><p className="mt-3 text-2xl font-bold text-[#1E293B]">{loading ? '—' : clients.length}</p><p className="mt-1 text-xs text-[#64748B]">Agrupados por correo cuando está disponible</p></article>
        <article className="rounded-lg border border-[#E2E8F0] bg-white p-4"><div className="flex items-center justify-between text-sm text-[#64748B]"><span>Solicitudes registradas</span><FileText size={18}/></div><p className="mt-3 text-2xl font-bold text-[#1E293B]">{loading ? '—' : requests.length}</p><p className="mt-1 text-xs text-[#64748B]">Fuente: solicitudes comerciales reales</p></article>
        <article className="rounded-lg border border-[#E2E8F0] bg-white p-4"><div className="flex items-center justify-between text-sm text-[#64748B]"><span>Media Kits</span><Building2 size={18}/></div><p className="mt-3 text-2xl font-bold text-[#1E293B]">{loading ? '—' : kits.length}</p><p className="mt-1 text-xs text-[#64748B]">Documentos comerciales persistidos</p></article>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold text-[#1E293B]">Directorio de clientes</h2><p className="mt-1 text-xs text-[#64748B]">{loading ? 'Cargando registros…' : `${visible.length} de ${clients.length} clientes`}</p></div>
          <label className="relative block w-full sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre, empresa, correo o teléfono…" aria-label="Buscar clientes" className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"/></label>
        </div>
        {error ? <div className="p-8 text-center"><p className="text-sm font-semibold text-red-700">No se pudo cargar el directorio</p><p className="mt-1 text-xs text-slate-500">{error}</p><button type="button" onClick={() => void load()} className="mt-3 text-xs font-semibold text-blue-700 underline">Reintentar</button></div> : loading ? <div className="p-12 text-center text-sm text-slate-500">Cargando clientes…</div> : visible.length === 0 ? <div className="p-12 text-center"><Users size={28} className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-700">{query ? 'No hay coincidencias' : 'Todavía no hay clientes registrados'}</p><p className="mt-1 text-xs text-slate-500">{query ? 'Probá con otro nombre, empresa o dato de contacto.' : 'Los clientes aparecerán al registrar solicitudes o Media Kits.'}</p></div> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Cliente / empresa</th><th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Actividad</th><th className="px-4 py-3">Última actividad</th><th className="px-4 py-3 text-right">Detalle</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((client) => <tr key={client.key} className="hover:bg-slate-50/70"><td className="px-4 py-3"><p className="font-semibold text-slate-800">{client.name}</p><p className="mt-0.5 text-xs text-slate-500">{client.company || 'Empresa no informada'}</p></td><td className="px-4 py-3"><p className="text-xs text-slate-700">{client.email || 'Correo no informado'}</p><p className="mt-1 text-xs text-slate-500">{client.phone || 'Teléfono no informado'}</p></td><td className="px-4 py-3 text-xs text-slate-600">{client.requests.length} solicitudes · {client.kits.length} Media Kits</td><td className="px-4 py-3 text-xs text-slate-600">{dateLabel(client.lastActivity)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelected(client)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700">Ver detalle</button></td></tr>)}</tbody></table></div>
          <div className="space-y-2 p-3 md:hidden">{visible.map((client) => <article key={client.key} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{client.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{client.company || 'Empresa no informada'}</p></div><button type="button" onClick={() => setSelected(client)} className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold">Detalle</button></div><p className="mt-2 break-all text-xs text-slate-600">{client.email || 'Correo no informado'}</p><p className="mt-1 text-xs text-slate-500">{client.requests.length} solicitudes · {client.kits.length} Media Kits</p></article>)}</div>
        </>}
      </section>
    </div>

    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside role="dialog" aria-modal="true" aria-labelledby="client-detail-title" className="flex h-full w-full max-w-[440px] flex-col overflow-y-auto bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ficha de cliente</p><h2 id="client-detail-title" className="mt-1 text-lg font-bold text-slate-900">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">{selected.company || 'Empresa no informada'}</p></div><button type="button" aria-label="Cerrar detalle" onClick={() => setSelected(null)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><div className="space-y-5 p-5"><div className="space-y-3">{selected.email && <p className="flex items-center gap-2 break-all text-sm text-slate-700"><Mail size={16} className="shrink-0 text-slate-400"/>{selected.email}</p>}{selected.phone && <p className="flex items-center gap-2 text-sm text-slate-700"><Phone size={16} className="shrink-0 text-slate-400"/>{selected.phone}</p>}{!selected.email && !selected.phone && <p className="text-sm text-slate-500">No hay datos de contacto disponibles.</p>}</div><div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Solicitudes</p><p className="mt-1 text-xl font-bold">{selected.requests.length}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Media Kits</p><p className="mt-1 text-xl font-bold">{selected.kits.length}</p></div></div><div><h3 className="text-sm font-semibold text-slate-800">Solicitudes asociadas</h3>{selected.requests.length ? <ul className="mt-2 divide-y divide-slate-100">{selected.requests.map((request, index) => <li key={request.requestId || request.id || index} className="py-3"><p className="text-sm font-medium text-slate-700">{request.requestId || `Solicitud ${request.id ?? index + 1}`}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(request.createdAt)} · {request.status || 'Estado no informado'}</p></li>)}</ul> : <p className="mt-2 text-xs text-slate-500">Sin solicitudes asociadas.</p>}</div><div><h3 className="text-sm font-semibold text-slate-800">Media Kits asociados</h3>{selected.kits.length ? <ul className="mt-2 divide-y divide-slate-100">{selected.kits.map((kit, index) => <li key={kit.kitId || index} className="py-3"><p className="text-sm font-medium text-slate-700">{kit.kitId || 'Media Kit'}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(kit.updatedAt || kit.createdAt)} · {kit.status || 'Estado no informado'}</p></li>)}</ul> : <p className="mt-2 text-xs text-slate-500">Sin Media Kits asociados.</p>}</div><Link to="/dashboard/solicitudes" onClick={() => setSelected(null)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-700">Abrir solicitudes<ArrowUpRight size={16}/></Link></div></aside></div>}
  </DashboardShell>;
}
