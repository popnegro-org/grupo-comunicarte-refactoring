import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Download, FileText, Loader2, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { Input, Label } from '../../components/ui/Input';
import { calculateSupportTotal, formatSupportCurrency } from '../../lib/supportPricing';
import type { ExportSupport } from '../../lib/adminMediaKitExport';
import { apiFetch } from '../../lib/api';
import { formatProposalDuration, isProposalDurationValid, normalizeProposalDuration, proposalDurationFromOption, proposalDurationOption, ProposalDurationUnit } from '../../lib/mediakitDuration';

type Pricing = { exhibition_price?: number | string | null; installation_price?: number | string | null; printing_price?: number | string | null; currency?: string | null };
type Support = ExportSupport & { disponibilidad?: 'disponible' | 'reservado' | 'inactivo'; pricing?: Pricing | null; imageUrls?: string[]; media?: Array<{ url?: string; media_type?: string; active?: boolean }> };
type MediaKitStatus = 'draft' | 'ready' | 'sent' | 'archived';
type ProposalCurrency = 'ARS' | 'USD' | 'Por definir';
type ProposalPeriod = { fechaInicio: string; fechaFin: string; duracionValor: string; duracionUnidad: ProposalDurationUnit };
type PersistedKit = {
  kitId: string;
  status: MediaKitStatus;
  clientName: string;
  clientEmail?: string | null;
  clientCompany?: string | null;
  clientPhone?: string | null;
  supportIds: string[];
  approvedPrices?: Record<string, string | number>;
  totalAmount?: number | string | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
};

const makeRequestId = () => `MK-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

function formatProposalPeriod(period: ProposalPeriod): string | undefined {
  const dates = period.fechaInicio || period.fechaFin
    ? [period.fechaInicio, period.fechaFin].filter(Boolean).join(' – ')
    : '';
  const duration = formatProposalDuration(period);
  return [dates, duration].filter(Boolean).join(' · ') || undefined;
}

export default function DashboardMediaKitBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kitIdParam = searchParams.get('kitId');
  const [allSupports, setAllSupports] = useState<Support[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [client, setClient] = useState({ name: '', company: '', email: '', phone: '' });
  const [period, setPeriod] = useState<ProposalPeriod>({ fechaInicio: '', fechaFin: '', duracionValor: '', duracionUnidad: 'días' });
  const [proposalAmount, setProposalAmount] = useState('');
  const [proposalCurrency, setProposalCurrency] = useState<ProposalCurrency>('ARS');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [requestId, setRequestId] = useState<string>(() => kitIdParam || makeRequestId());
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (kitIdParam) setRequestId(kitIdParam);

    (async () => {
      try {
        const [supportsResponse, pricingResponse] = await Promise.all([
          apiFetch('/api/supports'),
          apiFetch('/api/admin/support-pricing'),
        ]);
        const [supportsJson, pricingJson] = await Promise.all([supportsResponse.json(), pricingResponse.json()]);
        if (!supportsResponse.ok || supportsJson.status !== 'success') throw new Error(supportsJson.message || 'No pudimos cargar el inventario.');
        if (!pricingResponse.ok || pricingJson.status !== 'success') throw new Error(pricingJson.message || 'No pudimos cargar las tarifas internas.');
        const pricingById = pricingJson.data || {};
        const inventory = Array.isArray(supportsJson.data) ? supportsJson.data : [];
        setAllSupports(inventory.map((support: Support) => ({
          ...support,
          pricing: pricingById[support.canonical_id] || null,
        })));

        if (kitIdParam) {
          const kitResponse = await apiFetch(`/api/admin/mediakits/${encodeURIComponent(kitIdParam)}`);
          const kitJson = await kitResponse.json();
          if (kitResponse.ok && kitJson.status === 'success' && kitJson.data) {
            const kit = kitJson.data as PersistedKit;
            setClient({
              name: kit.clientName || '',
              company: kit.clientCompany || '',
              email: kit.clientEmail || '',
              phone: kit.clientPhone || '',
            });
            setSelectedIds(Array.isArray(kit.supportIds) ? kit.supportIds : []);
            const savedAmount = kit.metadata?.proposalAmount;
            if (savedAmount && typeof savedAmount === 'object') {
              const amount = savedAmount as { amount?: unknown; currency?: unknown };
              setProposalAmount(amount.amount == null ? '' : String(amount.amount));
              setProposalCurrency(amount.currency === 'USD' || amount.currency === 'Por definir' ? amount.currency : 'ARS');
            } else {
              setProposalAmount(kit.totalAmount == null ? '' : String(kit.totalAmount));
              setProposalCurrency(kit.currency === 'USD' || kit.currency === 'Por definir' ? kit.currency : 'ARS');
            }
            if (kit.approvedPrices && typeof kit.approvedPrices === 'object') {
              setPrices(Object.fromEntries(Object.entries(kit.approvedPrices).map(([k, v]) => [k, String(v)])));
            }
            const savedPeriod = kit.metadata?.proposalPeriod;
            if (savedPeriod && typeof savedPeriod === 'object') {
              const p = savedPeriod as Partial<Record<keyof ProposalPeriod, unknown>>;
              setPeriod({
                fechaInicio: typeof p.fechaInicio === 'string' ? p.fechaInicio : '',
                fechaFin: typeof p.fechaFin === 'string' ? p.fechaFin : '',
                ...normalizeProposalDuration(p.duracionValor, p.duracionUnidad),
              });
            }
            setRequestId(kit.kitId || kitIdParam);
          }
        }
      } catch (e: any) {
        notify(e.message || 'No pudimos cargar el constructor de Media Kit.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, kitIdParam]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allSupports;
    return allSupports.filter((s) =>
      [s.name, s.canonical_id, s.ciudad, s.tipo_soporte].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [allSupports, query]);

  const selected = useMemo(() => allSupports.filter((s) => selectedIds.includes(s.canonical_id)), [allSupports, selectedIds]);
  const total = useMemo(() => selected.reduce((sum, s) => sum + (Number(prices[s.canonical_id]) || 0), 0), [selected, prices]);
  const periodInvalid = Boolean(period.fechaInicio && period.fechaFin && period.fechaFin < period.fechaInicio);
  const durationInvalid = !isProposalDurationValid(period);
  const proposalAmountInvalid = proposalCurrency !== 'Por definir' && Boolean(proposalAmount.trim()) &&
    (!Number.isFinite(Number(proposalAmount)) || Number(proposalAmount) < 0);
  const canExport = selected.length > 0 && client.name.trim().length > 0 && !periodInvalid && !durationInvalid && !proposalAmountInvalid;
  const toggle = (support: Support) => {
    if (support.disponibilidad !== 'disponible' && !selectedIds.includes(support.canonical_id)) {
      notify('Solo se pueden agregar soportes disponibles al Media Kit.');
      return;
    }
    setSelectedIds(prev => prev.includes(support.canonical_id) ? prev.filter(id => id !== support.canonical_id) : [...prev, support.canonical_id]);
    if (!prices[support.canonical_id]) {
      const base = calculateSupportTotal(support.pricing);
      if (base > 0) setPrices(prev => ({ ...prev, [support.canonical_id]: String(base) }));
    }
  };
  const applyBasePrices = () => {
    const next = { ...prices };
    selected.forEach(s => { const base = calculateSupportTotal(s.pricing); if (base > 0) next[s.canonical_id] = String(base); });
    setPrices(next);
    notify('Tarifas base aplicadas.');
  };
  // Public deliverables carry only the explicitly agreed global amount. Never
  // pass per-support internal/base prices into PDF or PPT generation.
  const exportSupports: ExportSupport[] = selected.map((support) => {
    const publicSupport = { ...support };
    delete publicSupport.pricing;
    return publicSupport;
  });
  const lead = {
    name: client.name || 'Cliente',
    company: client.company,
    email: client.email,
    phone: client.phone,
    proposalPeriod: formatProposalPeriod(period),
    proposalAmount: proposalCurrency === 'Por definir' || !proposalAmount.trim() ? '' : `${proposalCurrency} ${Number(proposalAmount).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`,
  };

  const persist = async (status: MediaKitStatus = 'draft'): Promise<PersistedKit> => {
    if (periodInvalid) throw new Error('La fecha de finalización no puede ser anterior al inicio.');
    if (durationInvalid && status !== 'draft') throw new Error('Seleccioná una duración comercial estándar: 7, 15, 21 días o mensual.');
    if (proposalAmountInvalid) throw new Error('El monto global debe ser un número válido igual o mayor que cero.');
    const response = await apiFetch('/api/admin/mediakits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kitId: requestId,
        clientName: client.name,
        clientCompany: client.company || null,
        clientEmail: client.email || null,
        clientPhone: client.phone || null,
        supportIds: selectedIds,
        approvedPrices: prices,
        totalAmount: proposalCurrency === 'Por definir' || !proposalAmount.trim() ? null : Number(proposalAmount),
        currency: proposalCurrency,
        status,
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
    const json = await response.json();
    if (!response.ok || json.status !== 'success') throw new Error(json.message || 'No pudimos guardar el Media Kit.');
    const kit = json.data as PersistedKit;
    setRequestId(kit.kitId);
    if (kit.kitId !== kitIdParam) navigate(`/dashboard/mediakits/nuevo?kitId=${encodeURIComponent(kit.kitId)}`, { replace: true });
    return kit;
  };

  const saveDraft = async () => {
    if (!client.name.trim()) { notify('Ingresá el nombre del cliente para guardar.'); return; }
    setSaving(true);
    try { const kit = await persist('draft'); notify(`Borrador ${kit.kitId} guardado.`); }
    catch (e: any) { notify(e.message || 'No pudimos guardar el borrador.'); }
    finally { setSaving(false); }
  };

  const exportPdf = async () => {
    if (!canExport) { notify('Completá el cliente, seleccioná al menos un soporte y revisá el monto global acordado.'); return; }
    setBusy(true);
    try {
      await persist('ready');
      const { downloadMediaKitPdf } = await import('../../lib/adminMediaKitExport');
      await downloadMediaKitPdf(lead, exportSupports, requestId);
      notify('PDF generado.');
    } catch (e: any) { notify(e.message || 'No pudimos exportar el PDF.'); }
    finally { setBusy(false); }
  };

  const exportPpt = async () => {
    if (!canExport) { notify('Completá cliente, soportes y precios.'); return; }
    setBusy(true);
    try {
      await persist('ready');
      const { downloadMediaKitPpt } = await import('../../lib/adminMediaKitExport');
      await downloadMediaKitPpt(lead, exportSupports, requestId);
      notify('PPT generado.');
    } catch (e: any) { notify(e.message || 'No pudimos exportar el PPT.'); }
    finally { setBusy(false); }
  };

  return (
    <DashboardShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button type="button" onClick={() => navigate('/dashboard/mediakits')} className="mb-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
              <ArrowLeft className="h-3.5 w-3.5" /> Media Kits
            </button>
            <h1 className="text-xl font-semibold tracking-tight text-gray-950">Constructor de Media Kit</h1>
            <p className="mt-1 text-xs text-gray-500">ID: {requestId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={saveDraft} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Guardar borrador
            </button>
            <button type="button" disabled={busy || !canExport} onClick={exportPdf} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button type="button" disabled={busy || !canExport} onClick={exportPpt} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2">
              <Download className="h-3.5 w-3.5" /> PPT
            </button>
          </div>
        </div>

        {toast && <div role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{toast}</div>}

        {loading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div><Label htmlFor="mediakit-client-name">Nombre *</Label><Input id="mediakit-client-name" className="h-11" autoComplete="name" value={client.name} onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))} placeholder="Nombre *" /></div>
                  <div><Label htmlFor="mediakit-client-company">Empresa</Label><Input id="mediakit-client-company" className="h-11" autoComplete="organization" value={client.company} onChange={(e) => setClient((c) => ({ ...c, company: e.target.value }))} placeholder="Empresa" /></div>
                  <div><Label htmlFor="mediakit-client-email">Email</Label><Input id="mediakit-client-email" className="h-11" type="email" autoComplete="email" value={client.email} onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))} placeholder="Email" /></div>
                  <div><Label htmlFor="mediakit-client-phone">Teléfono</Label><Input id="mediakit-client-phone" className="h-11" type="tel" autoComplete="tel" value={client.phone} onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))} placeholder="Teléfono" /></div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Monto global acordado</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-gray-600">Monto total
                    <input type="number" min={0} step="0.01" value={proposalAmount} disabled={proposalCurrency === 'Por definir'} onChange={(e) => setProposalAmount(e.target.value)} placeholder={proposalCurrency === 'Por definir' ? 'Por definir' : 'Ingresá el monto acordado'} className="mt-1 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus-visible:border-gray-900 focus-visible:ring-2 focus-visible:ring-black/15 disabled:bg-gray-100" />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">Moneda
                    <select value={proposalCurrency} onChange={(e) => { const value = e.target.value as ProposalCurrency; setProposalCurrency(value); if (value === 'Por definir') setProposalAmount(''); }} className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:border-gray-900 focus-visible:ring-2 focus-visible:ring-black/15">
                      <option value="ARS">ARS · Peso argentino</option><option value="USD">USD · Dólar estadounidense</option><option value="Por definir">Por definir</option>
                    </select>
                  </label>
                </div>
                {proposalAmountInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">El monto global debe ser un número válido igual o mayor que cero.</p>}
                <p className="mt-2 text-[11px] text-gray-500">El documento para el cliente muestra únicamente el monto global acordado. Si aún no está definido, se indicará “Inversión sujeta a cotización”; las tarifas por soporte son internas.</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Período de la propuesta</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Fecha de inicio
                    <input type="date" value={period.fechaInicio} onChange={(e) => setPeriod((p) => ({ ...p, fechaInicio: e.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus-visible:border-gray-900 focus-visible:ring-2 focus-visible:ring-black/15" />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    Fecha de finalización
                    <input type="date" min={period.fechaInicio || undefined} value={period.fechaFin} onChange={(e) => setPeriod((p) => ({ ...p, fechaFin: e.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus-visible:border-gray-900 focus-visible:ring-2 focus-visible:ring-black/15" />
                  </label>
                  <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
                    Duración contratada
                    <select value={proposalDurationOption(period)} onChange={(e) => setPeriod((p) => ({ ...p, ...proposalDurationFromOption(e.target.value) }))} className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:border-gray-900 focus-visible:ring-2 focus-visible:ring-black/15">
                      <option value="">Seleccionar duración</option>
                      <option value="7:días">7 días</option>
                      <option value="15:días">15 días</option>
                      <option value="21:días">21 días</option>
                      <option value="1:meses">Mensual</option>
                    </select>
                  </label>
                </div>
                {periodInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">La fecha de finalización no puede ser anterior al inicio.</p>}
                {durationInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">Seleccioná 7, 15, 21 días o mensual. Los períodos históricos no estándar requieren revisión.</p>}
                <p className="mt-2 text-[11px] text-gray-500">El período se guarda como metadato de la propuesta; no modifica reservas ni disponibilidad.</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inventario</p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input type="search" aria-label="Buscar soportes del inventario" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar soporte" className="h-11 min-w-0 rounded-lg border border-gray-200 pl-8 pr-3 text-xs outline-none focus-visible:border-gray-900 focus-visible:ring-2 focus-visible:ring-black/15" />
                  </div>
                </div>
                <div role="group" aria-label="Soportes del inventario" className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {filtered.length === 0 && <p role="status" aria-live="polite" className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">{allSupports.length === 0 ? "No hay soportes disponibles en el inventario." : "No encontramos soportes que coincidan con la búsqueda."}</p>}
                  {filtered.map((s) => {
                    const on = selectedIds.includes(s.canonical_id);
                    const available = s.disponibilidad === 'disponible';
                    return (
                      <button key={s.canonical_id} type="button" onClick={() => toggle(s)} disabled={!available && !on} aria-pressed={on} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${on ? 'border-emerald-300 bg-emerald-50' : available ? 'border-gray-200 hover:bg-gray-50' : 'border-amber-200 bg-amber-50/60 opacity-70 cursor-not-allowed'}`}>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-gray-950">{s.name}</span>
                          <span className="text-gray-500">{s.ciudad} · {s.tipo_soporte}{available ? '' : ` · ${s.disponibilidad === 'reservado' ? 'Reservado' : 'Inactivo'}`}</span>
                        </span>
                        {on ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-600" /> : available ? <span aria-hidden="true" className="text-gray-400">+</span> : <span aria-hidden="true" className="text-amber-700">—</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selección ({selected.length})</p>
                  <button type="button" onClick={applyBasePrices} className="inline-flex min-h-11 items-center rounded-md px-2 text-[11px] font-semibold text-gray-600 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">Aplicar tarifas base</button>
                </div>
                <div className="mt-3 space-y-2">
                  {selected.length === 0 && <p className="text-xs text-gray-500">Elegí soportes del inventario.</p>}
                  {selected.map((s) => (
                    <div key={s.canonical_id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-950">{s.name}</p>
                        <button type="button" onClick={() => toggle(s)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label={`Quitar ${s.name} del Media Kit`}><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <label htmlFor={`approved-price-${s.canonical_id}`} className="mt-2 block text-[10px] font-medium text-gray-500">Precio aprobado para {s.name}</label>
                      <input
                        id={`approved-price-${s.canonical_id}`}
                        type="number"
                        min={0}
                        value={prices[s.canonical_id] || ''}
                        onChange={(e) => setPrices((p) => ({ ...p, [s.canonical_id]: e.target.value }))}
                        className="mt-1 h-11 w-full rounded-md border border-gray-200 px-2 text-xs outline-none focus-visible:border-gray-900 focus-visible:ring-2 focus-visible:ring-black/15"
                      />
                      <p className="mt-1 text-[10px] text-gray-500">Base: {formatSupportCurrency(calculateSupportTotal(s.pricing))}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-3 text-sm font-semibold text-gray-950">
                  Total: {formatSupportCurrency(total)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
