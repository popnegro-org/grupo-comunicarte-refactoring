import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Download, FileText, Loader2, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { Input } from '../../components/ui/Input';
import { calculateSupportTotal, formatSupportCurrency } from '../../lib/supportPricing';
import { downloadMediaKitPdf, downloadMediaKitPpt, ExportSupport } from '../../lib/adminMediaKitExport';
import { apiFetch } from '../../lib/api';

type Pricing = { exhibition_price?: number | string | null; installation_price?: number | string | null; printing_price?: number | string | null; currency?: string | null };
type Support = ExportSupport & { disponibilidad?: 'disponible' | 'reservado' | 'inactivo'; pricing?: Pricing | null; imageUrls?: string[]; media?: Array<{ url?: string; media_type?: string; active?: boolean }> };
type MediaKitStatus = 'draft' | 'ready' | 'sent' | 'archived';
type ProposalDurationUnit = 'días' | 'semanas' | 'meses' | 'quincenas' | 'otros' | 'indefinido';
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
  const duration = period.duracionUnidad === 'indefinido'
    ? 'Duración indefinida'
    : period.duracionUnidad === 'otros'
      ? (period.duracionValor ? `Período: ${period.duracionValor}` : 'Período: otros (a definir)')
      : period.duracionValor
        ? `${period.duracionValor} ${period.duracionUnidad}`
        : '';
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
  const [period, setPeriod] = useState<ProposalPeriod>({ fechaInicio: '', fechaFin: '', duracionValor: '', duracionUnidad: 'meses' });
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
        const supportsResponse = await apiFetch('/api/supports');
        const supportsJson = await supportsResponse.json();
        if (!supportsResponse.ok || supportsJson.status !== 'success') throw new Error(supportsJson.message || 'No pudimos cargar el inventario.');
        setAllSupports(Array.isArray(supportsJson.data) ? supportsJson.data : []);

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
                duracionValor: p.duracionValor == null ? '' : String(p.duracionValor),
                duracionUnidad: p.duracionUnidad === 'días' || p.duracionUnidad === 'semanas' || p.duracionUnidad === 'meses' || p.duracionUnidad === 'quincenas' || p.duracionUnidad === 'otros' || p.duracionUnidad === 'indefinido' ? p.duracionUnidad : 'meses',
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
  const durationInvalid = period.duracionUnidad !== 'indefinido' && period.duracionUnidad !== 'otros' && Boolean(period.duracionValor) &&
    (!Number.isInteger(Number(period.duracionValor)) || Number(period.duracionValor) <= 0);
  const otherDurationMissing = period.duracionUnidad === 'otros' && !period.duracionValor.trim();
  const proposalAmountInvalid = proposalCurrency !== 'Por definir' && Boolean(proposalAmount.trim()) &&
    (!Number.isFinite(Number(proposalAmount)) || Number(proposalAmount) < 0);
  const canExport = selected.length > 0 && client.name.trim().length > 0 && !periodInvalid && !durationInvalid && !otherDurationMissing && !proposalAmountInvalid;
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
  const exportSupports: ExportSupport[] = selected.map((s) => ({ ...s }));
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
    if (durationInvalid) throw new Error('La duración debe ser un número entero mayor que cero.');
    if (otherDurationMissing) throw new Error('Describí el período acordado en “Otros”.');
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
            duracionValor: period.duracionValor ? (period.duracionUnidad === 'otros' ? period.duracionValor.trim() : Number(period.duracionValor)) : null,
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
            <button type="button" onClick={() => navigate('/dashboard/mediakits')} className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-950">
              <ArrowLeft className="h-3.5 w-3.5" /> Media Kits
            </button>
            <h1 className="text-xl font-semibold tracking-tight text-gray-950">Constructor de Media Kit</h1>
            <p className="mt-1 text-xs text-gray-500">ID: {requestId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={saveDraft} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Guardar borrador
            </button>
            <button type="button" disabled={busy || !canExport} onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button type="button" disabled={busy || !canExport} onClick={exportPpt} className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> PPT
            </button>
          </div>
        </div>

        {toast && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{toast}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input value={client.name} onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))} placeholder="Nombre *" />
                  <Input value={client.company} onChange={(e) => setClient((c) => ({ ...c, company: e.target.value }))} placeholder="Empresa" />
                  <Input value={client.email} onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))} placeholder="Email" />
                  <Input value={client.phone} onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))} placeholder="Teléfono" />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Monto global acordado</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-gray-600">Monto total
                    <input type="number" min={0} step="0.01" value={proposalAmount} disabled={proposalCurrency === 'Por definir'} onChange={(e) => setProposalAmount(e.target.value)} placeholder={proposalCurrency === 'Por definir' ? 'Por definir' : 'Ingresá el monto acordado'} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-gray-900 disabled:bg-gray-100" />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">Moneda
                    <select value={proposalCurrency} onChange={(e) => { const value = e.target.value as ProposalCurrency; setProposalCurrency(value); if (value === 'Por definir') setProposalAmount(''); }} className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-900">
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
                    <input type="date" value={period.fechaInicio} onChange={(e) => setPeriod((p) => ({ ...p, fechaInicio: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-gray-900" />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    Fecha de finalización
                    <input type="date" min={period.fechaInicio || undefined} value={period.fechaFin} onChange={(e) => setPeriod((p) => ({ ...p, fechaFin: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-gray-900" />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    Duración contratada
                    <input type={period.duracionUnidad === 'otros' ? 'text' : 'number'} min={period.duracionUnidad === 'otros' ? undefined : 1} step={period.duracionUnidad === 'otros' ? undefined : 1} value={period.duracionValor} onChange={(e) => setPeriod((p) => ({ ...p, duracionValor: e.target.value }))} disabled={period.duracionUnidad === 'indefinido'} placeholder={period.duracionUnidad === 'otros' ? 'Describir período acordado' : 'Cantidad'} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-gray-900 disabled:bg-gray-100" />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    Unidad de duración
                    <select value={period.duracionUnidad} onChange={(e) => setPeriod((p) => ({ ...p, duracionUnidad: e.target.value as ProposalDurationUnit, duracionValor: e.target.value === 'indefinido' || e.target.value === 'otros' ? '' : p.duracionValor }))} className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-900">
                      <option value="meses">Mensual (meses)</option>
                      <option value="quincenas">Quincenal</option>
                      <option value="otros">Otros</option>
                      <option value="días">Días (legado)</option>
                      <option value="semanas">Semanas (legado)</option>
                      <option value="indefinido">Indefinido (legado)</option>
                    </select>
                  </label>
                </div>
                {periodInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">La fecha de finalización no puede ser anterior al inicio.</p>}
                {durationInvalid && <p role="alert" className="mt-2 text-xs font-medium text-red-700">La duración debe ser un número entero mayor que cero.</p>}
                <p className="mt-2 text-[11px] text-gray-500">El período se guarda como metadato de la propuesta; no modifica reservas ni disponibilidad.</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inventario</p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar soporte" className="h-9 rounded-lg border border-gray-200 pl-8 pr-3 text-xs outline-none focus:border-gray-900" />
                  </div>
                </div>
                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {filtered.map((s) => {
                    const on = selectedIds.includes(s.canonical_id);
                    const available = s.disponibilidad === 'disponible';
                    return (
                      <button key={s.canonical_id} type="button" onClick={() => toggle(s)} disabled={!available && !on} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition ${on ? 'border-emerald-300 bg-emerald-50' : available ? 'border-gray-200 hover:bg-gray-50' : 'border-amber-200 bg-amber-50/60 opacity-70 cursor-not-allowed'}`}>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-gray-950">{s.name}</span>
                          <span className="text-gray-500">{s.ciudad} · {s.tipo_soporte}{available ? '' : ` · ${s.disponibilidad === 'reservado' ? 'Reservado' : 'Inactivo'}`}</span>
                        </span>
                        {on ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : available ? <span className="text-gray-400">+</span> : <span className="text-amber-700">—</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selección ({selected.length})</p>
                  <button type="button" onClick={applyBasePrices} className="text-[11px] font-semibold text-gray-600 hover:text-gray-950">Aplicar tarifas base</button>
                </div>
                <div className="mt-3 space-y-2">
                  {selected.length === 0 && <p className="text-xs text-gray-500">Elegí soportes del inventario.</p>}
                  {selected.map((s) => (
                    <div key={s.canonical_id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-950">{s.name}</p>
                        <button type="button" onClick={() => toggle(s)} className="text-gray-400 hover:text-red-600" aria-label="Quitar"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <label className="mt-2 block text-[10px] font-medium text-gray-500">Precio aprobado</label>
                      <input
                        type="number"
                        min={0}
                        value={prices[s.canonical_id] || ''}
                        onChange={(e) => setPrices((p) => ({ ...p, [s.canonical_id]: e.target.value }))}
                        className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs outline-none focus:border-gray-900"
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
