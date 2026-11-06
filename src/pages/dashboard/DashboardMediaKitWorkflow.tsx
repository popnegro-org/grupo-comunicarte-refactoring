import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
  X,
  Search,
  FilterX,
  Inbox,
  Save,
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  Mail,
  Phone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { StatusBadge } from '../../components/dashboard/ui/StatusBadge';
import { Input } from '../../components/ui/Input';
import { apiFetch } from '../../lib/api';
import { formatProposalDuration, isProposalDurationValid, normalizeProposalDuration, proposalDurationFromOption, proposalDurationOption, ProposalDurationUnit } from '../../lib/mediakitDuration';
import { calculateSupportTotal, formatSupportCurrency } from '../../lib/supportPricing';
import {
  downloadMediaKitPdf,
  downloadMediaKitPpt,
  sendMediaKitToLead,
  ExportSupport,
} from '../../lib/adminMediaKitExport';

type WorkflowStatus = 'request' | 'in_progress' | 'done';
type ProposalCurrency = 'ARS' | 'USD' | 'Por definir';
type ProposalPeriod = { fechaInicio: string; fechaFin: string; duracionValor: string; duracionUnidad: ProposalDurationUnit };

type Pricing = {
  exhibition_price?: number | string | null;
  installation_price?: number | string | null;
  printing_price?: number | string | null;
  currency?: string | null;
};

type LeadRequest = {
  id: string;
  requestId: string;
  clientName: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  status: WorkflowStatus;
  supportIds: string[];
  supportNames: string[];
  requestScope?: string | null;
  tenantIds?: string[];
  pendingOwnershipCount?: number;
  createdAt: string;
};

type SupportForKit = ExportSupport & { pricing?: Pricing | null };
type RelatedMediaKit = {
  kitId: string;
  sourceRequestId?: string | null;
  status: 'draft' | 'ready' | 'sent' | 'archived';
  totalAmount?: number | string | null;
  currency?: string | null;
  supportIds?: string[];
  pdfUrl?: string | null;
  pptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

const labels: Record<WorkflowStatus, string> = {
  request: 'Pendiente',
  in_progress: 'En proceso',
  done: 'Entregada',
};

function formatRequestDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha pendiente';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toWorkflowStatus(status: string): WorkflowStatus {
  if (status === 'contactado' || status === 'in_progress') return 'in_progress';
  if (status === 'enviado' || status === 'quoted' || status === 'done' || status === 'cerrado') return 'done';
  return 'request';
}

export default function DashboardMediaKitWorkflow() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | WorkflowStatus>('all');
  const [selected, setSelected] = useState<LeadRequest | null>(null);
  const [relatedMediaKit, setRelatedMediaKit] = useState<RelatedMediaKit | null>(null);
  const [relatedMediaKitLoading, setRelatedMediaKitLoading] = useState(false);
  const [supports, setSupports] = useState<SupportForKit[]>([]);
  const [approvedPrices, setApprovedPrices] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<ProposalPeriod>({ fechaInicio: '', fechaFin: '', duracionValor: '', duracionUnidad: 'días' });
  const [proposalAmount, setProposalAmount] = useState('');
  const [proposalCurrency, setProposalCurrency] = useState<ProposalCurrency>('ARS');
  const [loading, setLoading] = useState(false);
  const [isFetchingLeads, setIsFetchingLeads] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deliveryPrepared, setDeliveryPrepared] = useState(false);
  const [toast, setToast] = useState('');

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!selected) {
      setRelatedMediaKit(null);
      setRelatedMediaKitLoading(false);
      return;
    }
    let cancelled = false;
    setRelatedMediaKit(null);
    setRelatedMediaKitLoading(true);
    apiFetch(`/api/admin/mediakits/by-request/${encodeURIComponent(selected.requestId)}`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (response.status === 404) {
          if (!cancelled) setRelatedMediaKit(null);
          return;
        }
        if (!response.ok || json?.status !== 'success' || !json.data) {
          throw new Error(json?.message || 'No se pudo consultar el Media Kit asociado.');
        }
        // Validate the persisted relation; the generated ID alone is not proof of association.
        if (!cancelled) {
          setRelatedMediaKit(json.data.sourceRequestId === selected.requestId ? json.data : null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRelatedMediaKit(null);
          notify(error instanceof Error ? error.message : 'No se pudo consultar el Media Kit asociado.');
        }
      })
      .finally(() => { if (!cancelled) setRelatedMediaKitLoading(false); });
    return () => { cancelled = true; };
  }, [selected?.requestId]);

  const load = async () => {
    setIsFetchingLeads(true);
    try {
      const r = await apiFetch('/api/admin/requests');
      const j = await r.json();
      if (j.status !== 'success') throw new Error(j.message || 'No pudimos cargar las solicitudes.');
      setLeads(
        (j.data || []).map((x: any) => ({
          id: String(x.id),
          requestId: x.requestId,
          clientName: x.requesterName || 'Sin nombre',
          email: x.requesterEmail || '',
          company: x.requesterCompany || 'Particular / Directo',
          phone: x.requesterPhone || '',
          message: x.message || '',
          status: toWorkflowStatus(x.status),
          supportIds: x.supportIds || [],
          supportNames: x.supportNames || x.supportIds || [],
          requestScope: x.requestScope ?? null,
          tenantIds: Array.isArray(x.tenantIds) ? x.tenantIds : [],
          pendingOwnershipCount: Number(x.pendingOwnershipCount || 0),
          createdAt: x.createdAt || new Date().toISOString(),
        }))
      );
    } catch (e: any) {
      notify(e.message || 'Error al cargar solicitudes.');
    } finally {
      setIsFetchingLeads(false);
    }
  };

  useEffect(() => {
    load();
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected && !busy) setSelected(null);
    };
    if (selected) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selected, busy]);

  const counts = useMemo(
    () => ({
      all: leads.length,
      request: leads.filter((x) => x.status === 'request').length,
      in_progress: leads.filter((x) => x.status === 'in_progress').length,
      done: leads.filter((x) => x.status === 'done').length,
    }),
    [leads]
  );

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((item) => {
      const matchStatus = filter === 'all' || item.status === filter;
      const matchQuery =
        !q ||
        [item.clientName, item.company, item.email, item.phone, item.requestId, ...item.supportNames].some((val) =>
          String(val || '').toLowerCase().includes(q)
        );
      return matchStatus && matchQuery;
    });
  }, [leads, filter, searchQuery]);

  const approvalsReady =
    supports.length > 0 &&
    supports.every((s) => {
      const v = Number(approvedPrices[s.canonical_id] || 0);
      return Number.isFinite(v) && v > 0;
    });

  const totalApprovedQuote = supports.reduce((sum, s) => sum + (Number(approvedPrices[s.canonical_id]) || 0), 0);
  const periodInvalid = Boolean(period.fechaInicio && period.fechaFin && period.fechaFin < period.fechaInicio);
  const durationInvalid = !isProposalDurationValid(period);
  const proposalAmountInvalid = proposalCurrency !== 'Por definir' && Boolean(proposalAmount.trim()) &&
    (!Number.isFinite(Number(proposalAmount)) || Number(proposalAmount) < 0);
  const proposalPeriodLabel = [
    period.fechaInicio || period.fechaFin ? [period.fechaInicio, period.fechaFin].filter(Boolean).join(' – ') : '',
    formatProposalDuration(period),
  ].filter(Boolean).join(' · ') || undefined;

  const persistMediaKit = async (status: 'draft' | 'ready' = 'draft') => {
    if (selected?.pendingOwnershipCount) {
      notify('La solicitud contiene soportes pendientes de ownership. No se puede cotizar ni entregar hasta conciliarlos.');
      return false;
    }
    if (!selected || !supports.length || !approvalsReady) {
      notify('Complete el precio de todos los soportes antes de guardar.');
      return false;
    }
    if (periodInvalid) throw new Error('La fecha de finalización no puede ser anterior al inicio.');
    if (durationInvalid && status === 'ready') throw new Error('Seleccioná una duración comercial estándar: 7, 15, 21 días o mensual.');
    if (proposalAmountInvalid) throw new Error('El monto global debe ser un número válido igual o mayor que cero.');
    const kitId = `KIT-${selected.requestId}`;
    const r = await apiFetch('/api/admin/mediakits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kitId,
        sourceRequestId: selected.requestId,
        status,
        clientName: selected.clientName,
        clientEmail: selected.email,
        clientCompany: selected.company,
        clientPhone: selected.phone,
        supportIds: selected.supportIds,
        approvedPrices,
        totalAmount: proposalCurrency === 'Por definir' || !proposalAmount.trim() ? null : Number(proposalAmount),
        currency: proposalCurrency,
        metadata: {
          proposalPeriod: {
            fechaInicio: period.fechaInicio || null,
            fechaFin: period.fechaFin || null,
            duracionValor: period.duracionValor ? Number(period.duracionValor) : null,
            duracionUnidad: period.duracionUnidad,
          },
          proposalAmount: {
            amount: proposalCurrency === 'Por definir' || !proposalAmount.trim() ? null : Number(proposalAmount),
            currency: proposalCurrency,
          },
        },
      }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || j?.status !== 'success') throw new Error(j?.message || 'No pudimos guardar el Media Kit.');
    notify(status === 'ready' ? 'Media Kit listo para entrega.' : 'Cotización guardada.');
    return true;
  };

  const changeStatus = async (lead: LeadRequest, next: WorkflowStatus) => {
    if (lead.pendingOwnershipCount) {
      notify('No se puede avanzar: la solicitud contiene soportes pendientes de ownership.');
      return;
    }
    setBusy(true);
    let mediaKitMarkedSent = false;
    let requestStatusUpdated = false;
    try {
      const persisted = next === 'request' ? 'pending' : next === 'in_progress' ? 'contactado' : 'enviado';
      if (next === 'done') {
        const saved = await persistMediaKit('ready');
        if (!saved) throw new Error('No pudimos guardar el Media Kit.');

        const kitStatusResponse = await apiFetch(`/api/admin/mediakits/${encodeURIComponent(`KIT-${lead.requestId}`)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sent' }),
        });
        const kitStatusResult = await kitStatusResponse.json().catch(() => null);
        if (!kitStatusResponse.ok || kitStatusResult?.status !== 'success') {
          throw new Error(kitStatusResult?.message || 'No pudimos registrar el Media Kit como enviado.');
        }
        mediaKitMarkedSent = true;
      }

      const r = await apiFetch(`/api/admin/requests/${encodeURIComponent(lead.requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: persisted }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || j?.status !== 'success') {
        throw new Error(j?.message || 'No pudimos actualizar el estado de la solicitud.');
      }
      requestStatusUpdated = true;

      await load();
      setSelected((x) => (x ? { ...x, status: next } : null));
      notify(`Solicitud ${labels[next]}`);
    } catch (e: any) {
      if (mediaKitMarkedSent && !requestStatusUpdated) {
        try {
          const rollbackResponse = await apiFetch(`/api/admin/mediakits/${encodeURIComponent(`KIT-${lead.requestId}`)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ready' }),
          });
          const rollbackResult = await rollbackResponse.json().catch(() => null);
          if (!rollbackResponse.ok || rollbackResult?.status !== 'success') {
            console.error('Could not roll back Media Kit status after request update failed:', rollbackResult?.message || rollbackResponse.status);
          }
        } catch (rollbackError) {
          console.error('Could not roll back Media Kit status after request update failed:', rollbackError);
        }
      }
      notify(e.message || 'Error al actualizar.');
    } finally {
      setBusy(false);
    }
  };

  const open = async (lead: LeadRequest) => {
    setSelected(lead);
    setDeliveryPrepared(false);
    setSupports([]);
    setApprovedPrices({});
    setPeriod({ fechaInicio: '', fechaFin: '', duracionValor: '', duracionUnidad: 'días' });
    setProposalAmount('');
    setProposalCurrency('ARS');
    setLoading(true);
    try {
      if (lead.pendingOwnershipCount) return;
      const [inventoryResponse, pricingResponse] = await Promise.all([
        apiFetch('/api/supports'),
        apiFetch('/api/admin/support-pricing'),
      ]);
      const [inventoryJson, pricingJson] = await Promise.all([inventoryResponse.json(), pricingResponse.json()]);
      if (!inventoryResponse.ok || inventoryJson.status !== 'success') throw new Error('No pudimos cargar los datos del inventario.');
      if (!pricingResponse.ok || pricingJson.status !== 'success') throw new Error('No pudimos cargar las tarifas internas.');
      const ids = new Set(lead.supportIds);
      const pricingById = pricingJson.data || {};
      const filtered = (inventoryJson.data || [])
        .filter((x: any) => ids.has(x.canonical_id))
        .map((x: any) => ({
          canonical_id: x.canonical_id,
          name: x.name,
          ciudad: x.ciudad,
          tipo_soporte: x.tipo_soporte,
          address: x.address,
          description: x.description,
          characteristics: x.characteristics,
          pricing: pricingById[x.canonical_id] || null,
        }));
      if (filtered.length !== lead.supportIds.length) {
        const loadedIds = new Set(filtered.map((support: SupportForKit) => support.canonical_id));
        const missingIds = lead.supportIds.filter((id) => !loadedIds.has(id));
        throw new Error(`No pudimos recuperar ${missingIds.length} soporte(s) solicitado(s) desde el inventario.`);
      }
      setSupports(filtered);
      const kitResponse = await apiFetch(`/api/admin/mediakits/KIT-${encodeURIComponent(lead.requestId)}`, {
        
      });
      if (kitResponse.ok) {
        const kitJson = await kitResponse.json().catch(() => null);
        const savedAmount = kitJson?.data?.metadata?.proposalAmount;
        if (savedAmount && typeof savedAmount === 'object') {
          setProposalAmount(savedAmount.amount == null ? '' : String(savedAmount.amount));
          setProposalCurrency(savedAmount.currency === 'USD' || savedAmount.currency === 'Por definir' ? savedAmount.currency : 'ARS');
        } else if (kitJson?.data) {
          setProposalAmount(kitJson.data.totalAmount == null ? '' : String(kitJson.data.totalAmount));
          setProposalCurrency(kitJson.data.currency === 'USD' || kitJson.data.currency === 'Por definir' ? kitJson.data.currency : 'ARS');
        }
        const savedPrices = kitJson?.data?.approvedPrices;
        if (savedPrices && typeof savedPrices === 'object') {
          setApprovedPrices(Object.fromEntries(Object.entries(savedPrices).map(([key, value]) => [key, String(value)])));
        }
        const savedPeriod = kitJson?.data?.metadata?.proposalPeriod;
        if (savedPeriod && typeof savedPeriod === 'object') {
          setPeriod({
            fechaInicio: typeof savedPeriod.fechaInicio === 'string' ? savedPeriod.fechaInicio : '',
            fechaFin: typeof savedPeriod.fechaFin === 'string' ? savedPeriod.fechaFin : '',
            ...normalizeProposalDuration(savedPeriod.duracionValor, savedPeriod.duracionUnidad),
          });
        }
      }
    } catch (e: any) {
      notify(e.message || 'Error al cargar soportes.');
    } finally {
      setLoading(false);
    }
  };

  const applyBaseCatalogPrices = () => {
    const newPrices: Record<string, string> = {};
    supports.forEach((s) => {
      const total = calculateSupportTotal(s.pricing);
      if (total > 0) newPrices[s.canonical_id] = String(total);
    });
    setApprovedPrices((prev) => ({ ...prev, ...newPrices }));
    notify('Tarifas base aplicadas desde el catálogo.');
  };

  const lead = selected
    ? { name: selected.clientName, email: selected.email, company: selected.company, phone: selected.phone, proposalPeriod: proposalPeriodLabel, proposalAmount: proposalCurrency === 'Por definir' || !proposalAmount.trim() ? '' : `${proposalCurrency} ${Number(proposalAmount).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` }
    : null;

  const approvedCount = supports.filter((s) => {
    const v = Number(approvedPrices[s.canonical_id] || 0);
    return Number.isFinite(v) && v > 0;
  }).length;

  // Client-facing exports carry only the global commercial amount, never
  // per-support values that could originate from the confidential base catalog.
  const exportSupports: ExportSupport[] = supports.map((s) => ({
    canonical_id: s.canonical_id,
    name: s.name,
    ciudad: s.ciudad,
    tipo_soporte: s.tipo_soporte,
    address: s.address,
    description: s.description,
    characteristics: s.characteristics,
    imageUrl: s.imageUrl,
    image_url: s.image_url,
    imageUrls: s.imageUrls,
    media: s.media,
  } as ExportSupport));

  const prepareDelivery = async () => {
    if (!lead || !selected || !approvalsReady || selected.pendingOwnershipCount) return;
    setBusy(true);
    try {
      const saved = await persistMediaKit('ready');
      if (!saved) return;
      const result = await sendMediaKitToLead(lead, exportSupports, selected.requestId);
      setDeliveryPrepared(true);
      notify(result === 'shared'
        ? 'Archivos preparados para compartir. Confirmá la entrega cuando hayas completado el envío.'
        : 'PDF y PPTX descargados; revisá el borrador de correo, adjuntá ambos archivos y envialo. Luego confirmá la entrega.');
    } catch (e: any) {
      notify(e.message || 'No pudimos preparar los materiales para la entrega.');
    } finally {
      setBusy(false);
    }
  };


  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
        {toast && (
          <div role="status" aria-live="polite" className="fixed right-6 top-20 z-[4500] rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
            {toast}
          </div>
        )}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Gestión Comercial
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Solicitudes de Media Kit</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Flujo comercial: REQUEST → IN PROGRESS → DONE con cotización personalizada.</p>
          </div>
          <button type="button" onClick={() => load().catch(() => notify('No pudimos actualizar la bandeja.'))} className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingLeads ? 'animate-spin' : ''}`} /> Actualizar bandeja
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['all', 'Todas', counts.all, 'gray'],
            ['request', 'Nuevas', counts.request, 'blue'],
            ['in_progress', 'En Proceso', counts.in_progress, 'amber'],
            ['done', 'Completadas', counts.done, 'emerald'],
          ] as const).map(([key, label, count, color]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-2xl border p-4 text-left transition sm:p-5 ${
                filter === key
                  ? color === 'gray'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : color === 'blue'
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : color === 'amber'
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
              <span className="mt-1 block text-2xl font-extrabold tracking-tight sm:text-3xl">{count}</span>
            </button>
          ))}
        </div>

        <section className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 rounded-xl border-slate-200 pl-10 text-xs sm:text-sm" placeholder="Buscar por cliente, empresa, correo o código…" aria-label="Buscar solicitudes" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>Mostrando <strong className="font-bold text-slate-900">{visible.length}</strong> de <strong className="font-bold text-slate-900">{leads.length}</strong></span>
            {(searchQuery || filter !== 'all') && (
              <button type="button" onClick={() => { setSearchQuery(''); setFilter('all'); }} className="inline-flex items-center gap-1.5 font-bold text-red-600 hover:underline">
                <FilterX className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Tabla de solicitudes de Media Kit">
          {isFetchingLeads && leads.length === 0 ? (
            <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando solicitudes…</div>
          ) : !visible.length ? (
            <div className="p-10 text-center text-sm text-slate-500"><Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />No hay solicitudes para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">ID</th>
                    <th scope="col" className="px-4 py-3">Cliente</th>
                    <th scope="col" className="px-4 py-3">Campaña / empresa</th>
                    <th scope="col" className="px-4 py-3">Media Kit</th>
                    <th scope="col" className="px-4 py-3">Fecha solicitud</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((lead) => (
                    <tr key={lead.requestId} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-700">{lead.requestId}</td>
                      <td className="px-4 py-3.5"><p className="max-w-[150px] truncate font-semibold text-slate-900">{lead.clientName}</p><p className="mt-0.5 max-w-[150px] truncate text-[10px] text-slate-500">{lead.email || 'Sin correo'}</p></td>
                      <td className="px-4 py-3.5"><p className="max-w-[170px] truncate font-medium text-slate-800">{lead.company}</p><p className="mt-0.5 text-[10px] text-slate-500">{lead.supportNames.length} {lead.supportNames.length === 1 ? 'soporte' : 'soportes'}</p></td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{lead.pendingOwnershipCount ? 'Ownership pendiente' : lead.supportNames.length ? 'Kit personalizado' : 'Pendiente'}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatRequestDate(lead.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5"><StatusBadge status={labels[lead.status]} /></td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right"><button type="button" onClick={() => open(lead)} className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-600">Ver solicitud</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500"><span>{visible.length} solicitudes visibles</span><span>Grupo Comunicarte · Gestión comercial</span></div>
        </section>

        {selected && (
          <div className="fixed inset-0 z-[4000] flex justify-end bg-slate-900/35" role="dialog" aria-modal="true" aria-labelledby="mediakit-request-title">
            <div className="h-full max-h-screen w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-[#f8fafc] shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{labels[selected.status]}</p>
                  <h2 id="mediakit-request-title" className="text-base font-semibold text-slate-900">{selected.clientName}</h2>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                {Boolean(selected.pendingOwnershipCount) && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Solicitud en cuarentena comercial</p>
                  <p className="mt-1">{selected.pendingOwnershipCount} soporte(s) no tienen ownership conciliado. La solicitud se conserva para revisión, pero no se puede cotizar, exportar ni marcar como entregada hasta resolverlo.</p>
                </div>}
                <section aria-labelledby="commercial-client-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-500"/><h3 id="commercial-client-heading" className="text-xs font-bold uppercase tracking-wide text-slate-600">Cliente</h3></div>
                  <p className="text-base font-semibold text-slate-900">{selected.clientName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{selected.company || 'Empresa no informada'}</p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <a href={selected.email ? `mailto:${selected.email}` : undefined} className={`flex min-h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 text-slate-700 ${selected.email ? 'hover:bg-slate-100' : 'pointer-events-none opacity-60'}`}><Mail className="h-3.5 w-3.5 shrink-0 text-slate-500"/><span className="min-w-0 truncate">{selected.email || 'Email no informado'}</span></a>
                    <a href={selected.phone ? `tel:${selected.phone.replace(/[^+\d]/g, '')}` : undefined} className={`flex min-h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 text-slate-700 ${selected.phone ? 'hover:bg-slate-100' : 'pointer-events-none opacity-60'}`}><Phone className="h-3.5 w-3.5 shrink-0 text-slate-500"/><span>{selected.phone || 'Teléfono no informado'}</span></a>
                  </div>
                  {selected.message && <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Necesidad / mensaje:</span> {selected.message}</p>}
                </section>

                <section aria-labelledby="commercial-opportunity-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-slate-500"/><h3 id="commercial-opportunity-heading" className="text-xs font-bold uppercase tracking-wide text-slate-600">Oportunidad comercial</h3></div><StatusBadge status={labels[selected.status]}/></div>
                  <p className="font-semibold text-slate-900">Solicitud {selected.requestId}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-slate-500">Ingreso</p><p className="mt-0.5 font-medium text-slate-800">{formatRequestDate(selected.createdAt)}</p></div>
                    <div><p className="text-slate-500">Soportes solicitados</p><p className="mt-0.5 font-medium text-slate-800">{selected.supportIds.length}</p></div>
                  </div>
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">Esta solicitud funciona como registro de seguimiento. No hay un negocio/pipeline de CRM vinculado en los datos disponibles; no se inventa una etapa ni un importe de oportunidad.</p>
                </section>

                <section aria-labelledby="commercial-activity-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-500"/><h3 id="commercial-activity-heading" className="text-xs font-bold uppercase tracking-wide text-slate-600">Actividad registrada</h3></div>
                  <ol className="space-y-3">
                    <li className="flex gap-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><Inbox className="h-3.5 w-3.5"/></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-800">Solicitud recibida</p><p className="mt-0.5 text-[11px] text-slate-500">{formatRequestDate(selected.createdAt)} · {selected.requestId}</p></div></li>
                    {relatedMediaKit && <li className="flex gap-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><FileText className="h-3.5 w-3.5"/></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-800">Media Kit actualizado</p><p className="mt-0.5 text-[11px] text-slate-500">{formatRequestDate(relatedMediaKit.updatedAt)} · {relatedMediaKit.kitId}</p></div></li>}
                  </ol>
                  <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-500">Se muestran únicamente eventos deducibles de registros persistidos. El sistema todavía no dispone de un registro independiente de llamadas, reuniones o tareas.</p>
                </section>

                <section aria-labelledby="commercial-mediakit-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-500"/><h3 id="commercial-mediakit-heading" className="text-xs font-bold uppercase tracking-wide text-slate-600">Media Kit asociado</h3></div>{relatedMediaKit && <StatusBadge status={{draft:'Borrador',ready:'Listo',sent:'Enviado',archived:'Archivado'}[relatedMediaKit.status]}/>}</div>
                  {relatedMediaKitLoading ? <p className="text-xs text-slate-500">Consultando documentos asociados…</p> : relatedMediaKit ? <>
                    <p className="font-semibold text-slate-900">{relatedMediaKit.kitId}</p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-500">Soportes</p><p className="mt-0.5 font-medium text-slate-800">{relatedMediaKit.supportIds?.length ?? 0}</p></div><div><p className="text-slate-500">Importe global</p><p className="mt-0.5 font-medium text-slate-800">{relatedMediaKit.totalAmount == null ? 'Sin definir' : `${relatedMediaKit.currency || 'ARS'} ${Number(relatedMediaKit.totalAmount).toLocaleString('es-AR')}`}</p></div></div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {relatedMediaKit.pdfUrl && /^https?:\/\//i.test(relatedMediaKit.pdfUrl) && <a href={relatedMediaKit.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">PDF <ExternalLink className="h-3 w-3"/></a>}
                      {relatedMediaKit.pptUrl && /^https?:\/\//i.test(relatedMediaKit.pptUrl) && <a href={relatedMediaKit.pptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Presentación <ExternalLink className="h-3 w-3"/></a>}
                    </div>
                  </> : <p className="text-xs leading-5 text-slate-500">No hay un Media Kit vinculado mediante sourceRequestId. Podés preparar una cotización desde esta solicitud; no se asociarán documentos por coincidencia de nombres o códigos.</p>}
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Monto global acordado</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-slate-600">Monto total<input type="number" min={0} step="0.01" value={proposalAmount} disabled={proposalCurrency === 'Por definir'} onChange={(e) => setProposalAmount(e.target.value)} placeholder={proposalCurrency === 'Por definir' ? 'Por definir' : 'Ingresá el monto acordado'} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-100" /></label>
                    <label className="block text-xs font-medium text-slate-600">Moneda<select value={proposalCurrency} onChange={(e) => { const value = e.target.value as ProposalCurrency; setProposalCurrency(value); if (value === 'Por definir') setProposalAmount(''); }} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="ARS">ARS · Peso argentino</option><option value="USD">USD · Dólar estadounidense</option><option value="Por definir">Por definir</option></select></label>
                  </div>
                  {proposalAmountInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">El monto global debe ser un número válido igual o mayor que cero.</p>}
                  <p className="mt-2 text-[10px] text-slate-500">El monto global es el acordado con el cliente; las tarifas base quedan como referencia interna.</p>
                </section>
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Tiempo de la propuesta</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-slate-600">Fecha de inicio<input type="date" value={period.fechaInicio} onChange={(e) => setPeriod((p) => ({ ...p, fechaInicio: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" /></label>
                    <label className="block text-xs font-medium text-slate-600">Fecha de finalización<input type="date" min={period.fechaInicio || undefined} value={period.fechaFin} onChange={(e) => setPeriod((p) => ({ ...p, fechaFin: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" /></label>
                    <label className="block text-xs font-medium text-slate-600 sm:col-span-2">Duración contratada<select value={proposalDurationOption(period)} onChange={(e) => setPeriod((p) => ({ ...p, ...proposalDurationFromOption(e.target.value) }))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="">Seleccionar duración</option><option value="7:días">7 días</option><option value="15:días">15 días</option><option value="21:días">21 días</option><option value="1:meses">Mensual</option></select></label>
                  </div>
                  {periodInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">La fecha final no puede ser anterior a la inicial.</p>}
                  {durationInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">Seleccioná 7, 15, 21 días o mensual. Los períodos históricos no estándar requieren revisión.</p>}
                  <p className="mt-2 text-[10px] text-slate-500">Se guarda como metadato del Media Kit; no cambia la disponibilidad de los soportes.</p>
                </section>

                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando soportes…</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Soportes ({supports.length})</p>
                      <button type="button" onClick={applyBaseCatalogPrices} className="text-[11px] font-semibold text-slate-600 hover:text-slate-900">Aplicar tarifas base</button>
                    </div>
                    {supports.map((s) => (
                      <div key={s.canonical_id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                        <p className="text-xs font-semibold text-slate-900">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.ciudad} · {s.tipo_soporte}</p>
                        <label className="mt-2 block text-[10px] font-medium text-slate-700">Monto acordado con el cliente</label>
                        <p className="text-[10px] leading-4 text-slate-500">Este importe se incluye en el Media Kit que se entrega.</p>
                        <input
                          type="number"
                          min={0}
                          value={approvedPrices[s.canonical_id] || ''}
                          onChange={(e) => setApprovedPrices((p) => ({ ...p, [s.canonical_id]: e.target.value }))}
                          className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-slate-800"
                        />
                        <p className="mt-1 text-[10px] text-slate-500">Tarifa base interna (solo referencia; no se exporta): {formatSupportCurrency(calculateSupportTotal(s.pricing))}</p>
                      </div>
                    ))}
                    <p className="text-sm font-semibold text-slate-900">Total: {formatSupportCurrency(totalApprovedQuote)} · {approvedCount}/{supports.length} con precio</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {selected.status === 'request' && (
                    <button type="button" disabled={busy || Boolean(selected.pendingOwnershipCount)} onClick={() => changeStatus(selected, 'in_progress')} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Marcar en proceso</button>
                  )}
                  {selected.status === 'in_progress' && !deliveryPrepared && (
                    <button type="button" disabled={busy || !approvalsReady || Boolean(selected.pendingOwnershipCount)} onClick={() => prepareDelivery()} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Preparar entrega</button>
                  )}
                  {selected.status === 'in_progress' && deliveryPrepared && (
                    <button type="button" disabled={busy} onClick={() => changeStatus(selected, 'done')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirmar entrega realizada</button>
                  )}
                  <button type="button" disabled={busy || !approvalsReady || Boolean(selected.pendingOwnershipCount)} onClick={() => persistMediaKit('draft').catch((e) => notify(e.message))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                    <Save className="h-3.5 w-3.5" /> Guardar cotización
                  </button>
                  {lead && approvalsReady && !selected.pendingOwnershipCount && (
                    <>
                      <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await persistMediaKit('ready'); await downloadMediaKitPdf(lead, exportSupports, selected.requestId); notify('PDF listo'); } catch (e: any) { notify(e.message); } finally { setBusy(false); } }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                      <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await persistMediaKit('ready'); await downloadMediaKitPpt(lead, exportSupports, selected.requestId); notify('PPT listo'); } catch (e: any) { notify(e.message); } finally { setBusy(false); } }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                        <FileText className="h-3.5 w-3.5" /> PPT
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
