import { ArrowLeft, ArrowRight, MapPin, Monitor, Play } from 'lucide-react';
import { InventoryItem, MobileRoute, getDisponibilidad, isMobileRoute } from '../../types';
import { toInventoryPresentationItem } from '../../lib/inventoryPresentationAdapter';

export function formatImpacts(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(String(value).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numeric)) return String(value);
  if (numeric >= 1_000_000) return `+${(numeric / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (numeric >= 1_000) return `+${Math.round(numeric / 1_000)} K`;
  return `+${Math.round(numeric).toLocaleString('es-AR')}`;
}

export function getCardFacts(item: InventoryItem) {
  const technical = item.technical;
  const route = isMobileRoute(item) ? item as MobileRoute : null;
  const impacts = technical?.monthly_impacts ? { label: 'Impactos / mes', value: formatImpacts(technical.monthly_impacts), priority: 4 } : null;
  const formatFact = technical?.format
    ? { label: 'Formato', value: technical.format, priority: 2 }
    : technical?.resolution
      ? { label: 'Resolución', value: technical.resolution, priority: 2 }
      : null;
  const facesFact = technical?.caras ? { label: 'Caras', value: String(technical.caras), priority: 3 } : null;

  if (item.family === 'led_mobile' || item.tipo_soporte === 'led_movil') {
    return [
      route?.duration ? { label: 'Duración', value: route.duration, priority: 1 } : null,
      formatFact,
      technical?.spot_duration_seconds ? { label: 'Spot', value: `${technical.spot_duration_seconds}s`, priority: 3 } : null,
      impacts,
    ].filter(Boolean).filter((fact) => fact?.value).map((fact) => fact!) as { label: string; value: string; priority: number }[];
  }

  if (item.family === 'led' || item.tipo_soporte === 'led' || (item.tipo_soporte as string) === 'pantallas_led') {
    return [
      technical?.measures ? { label: 'Medidas', value: technical.measures, priority: 1 } : null,
      formatFact,
      facesFact,
      impacts,
    ].filter(Boolean).filter((fact) => fact?.value).map((fact) => fact!) as { label: string; value: string; priority: number }[];
  }

  return [
    technical?.measures ? { label: 'Medidas', value: technical.measures, priority: 1 } : null,
    formatFact,
    facesFact,
    impacts,
  ].filter(Boolean).filter((fact) => fact?.value).map((fact) => fact!) as { label: string; value: string; priority: number }[];
}

export function reservationPeriod(item: InventoryItem) {
  const from = item.reservedFrom || item.technical?.metadata?.reserved_from;
  const until = item.reservedUntil || item.technical?.metadata?.reserved_until;
  if (from && until) return `Disponible desde ${formatDate(String(until))}`;
  if (item.availableFrom) return `Disponible ${item.availableFrom}`;
  return '';
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export function mediaSlides(item: InventoryItem) {
  const media = (item.media || []).filter((entry) => entry.active !== false && entry.url).slice(0, 3);
  if (media.length) return media.map((entry) => ({ url: entry.url, kind: entry.media_type }));
  const coverVideo = item.technical?.metadata?.cover_media_type === 'video';
  return (item.imageUrls || []).filter(Boolean).slice(0, 3).map((url, index) => ({
    url,
    kind: index === 0 && coverVideo ? 'video' : 'image',
  }));
}

export function StatusBadge({ item, dark = false }: { item: InventoryItem; dark?: boolean }) {
  const status = getDisponibilidad(item);
  const label = status === 'reservado' ? 'Reservado' : status === 'inactivo' ? 'Inactivo' : 'Disponible';
  const tone = status === 'reservado' ? 'bg-amber-50 text-amber-800' : status === 'inactivo' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700';
  const dot = status === 'reservado' ? 'bg-amber-400' : status === 'inactivo' ? 'bg-slate-500' : 'bg-emerald-500';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${dark ? 'bg-slate-700/90 text-white' : tone}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${dark ? 'bg-white' : dot}`} />{label}
  </span>;
}

export function TypeBadge({ item }: { item: InventoryItem }) {
  const label = toInventoryPresentationItem(item).tipo;
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><Monitor className="h-3.5 w-3.5" />{label}</span>;
}

export function SupportMedia({ slides, index, onPrevious, onNext, onSelect, alt }: {
  slides: { url: string; kind: string }[]; index: number; onPrevious: () => void; onNext: () => void; onSelect: (index: number) => void; alt: string;
}) {
  const active = slides[index];
  return <div className="relative h-full w-full bg-slate-100">
    {active?.kind === 'video' ? <div className="relative h-full w-full"><video src={active.url} muted playsInline preload="metadata" className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white"><Play className="h-4 w-4 fill-current" /></span></span></div>
      : active ? <img src={active.url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      : <div className="flex h-full items-center justify-center"><MapPin className="h-8 w-8 text-slate-300" /></div>}
    {slides.length > 1 && <>
      <button type="button" aria-label="Imagen anterior" onClick={onPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ArrowLeft className="h-4 w-4" /></button>
      <button type="button" aria-label="Imagen siguiente" onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ArrowRight className="h-4 w-4" /></button>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1" role="tablist" aria-label="Recursos multimedia">
        {slides.map((_, i) => <button key={i} type="button" aria-label={`Ver recurso ${i + 1}`} onClick={() => onSelect(i)} className={`h-1.5 rounded-full ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />)}
      </div>
    </>}
  </div>;
}

export function FactStrip({ item }: { item: InventoryItem }) {
  const facts = getCardFacts(item);
  if (!facts.length) return null;
  const fourFacts = facts.length > 3;
  return <div className={`grid ${fourFacts ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} divide-x divide-slate-200 border-y border-slate-100 py-3`}>
    {facts.map((fact) => <div key={fact.label} className="min-w-0 px-3 first:pl-0 last:pr-0">
      <div className="truncate text-sm font-bold text-slate-900">{fact.value}</div>
      <div className="truncate text-[10px] font-medium text-slate-500">{fact.label}</div>
    </div>)}
  </div>;
}

export function LocationLine({ item }: { item: InventoryItem }) {
  const address = 'address' in item ? item.address : undefined;
  const city = item.ciudad === 'mendoza' ? 'Mendoza' : 'Buenos Aires';
  return <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{address || city}</span></p>;
}
