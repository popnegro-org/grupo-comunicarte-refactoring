import { ArrowLeft, ArrowRight, MapPin, Monitor, Play } from 'lucide-react';
import { InventoryItem, getDisponibilidad } from '../../types';
import { toInventoryPresentationItem } from '../../lib/inventoryPresentationAdapter';
import { getCardFacts } from '../../lib/supportCardFacts.ts';
export { getCardFacts, formatImpacts } from '../../lib/supportCardFacts.ts';
export type { SupportCardFact } from '../../lib/supportCardFacts.ts';

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

function thumbnailUrl(url: string, kind: string) {
  if (kind === 'video' || !url.startsWith('/api/media/')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}variant=thumbnail`;
}

export function mediaSlides(item: InventoryItem) {
  const media = (item.media || []).filter((entry) => entry.active !== false && entry.url).slice(0, 3);
  if (media.length) return media.map((entry) => ({ url: thumbnailUrl(entry.url, entry.media_type), kind: entry.media_type }));
  const coverVideo = item.technical?.metadata?.cover_media_type === 'video';
  return (item.imageUrls || []).filter(Boolean).slice(0, 3).map((url, index) => ({
    url: thumbnailUrl(url, 'image'),
    kind: index === 0 && coverVideo ? 'video' : 'image',
  }));
}

export function StatusBadge({ item, dark = false }: { item: InventoryItem; dark?: boolean }) {
  const status = getDisponibilidad(item);
  const label = status === 'reservado' ? 'Reservado' : status === 'inactivo' ? 'Inactivo' : 'Disponible';
  const tone = status === 'reservado' ? 'bg-amber-50 text-amber-800' : status === 'inactivo' ? 'bg-slate-100 text-slate-800' : 'bg-emerald-50 text-emerald-800';
  const dot = status === 'reservado' ? 'bg-amber-400' : status === 'inactivo' ? 'bg-slate-500' : 'bg-emerald-500';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${dark ? 'bg-slate-700/90 text-white' : tone}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${dark ? 'bg-white' : dot}`} />{label}
  </span>;
}

export function TypeBadge({ item }: { item: InventoryItem }) {
  const label = toInventoryPresentationItem(item).tipo;
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800"><Monitor className="h-3.5 w-3.5" />{label}</span>;
}

export function SupportMedia({ slides, index, onPrevious, onNext, onSelect, alt, priority = false }: {
  slides: { url: string; kind: string }[]; index: number; onPrevious: () => void; onNext: () => void; onSelect: (index: number) => void; alt: string; priority?: boolean;
}) {
  const active = slides[index];
  return <div className="relative h-full w-full bg-slate-100">
    {active?.kind === 'video' ? <div className="relative h-full w-full"><video src={active.url} muted playsInline preload="metadata" className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white"><Play className="h-4 w-4 fill-current" /></span></span></div>
      : active ? <img src={active.url} alt={alt} width={640} height={360} decoding="async" className="h-full w-full object-cover" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />
      : <div className="flex h-full items-center justify-center"><MapPin className="h-8 w-8 text-slate-300" /></div>}
    {slides.length > 1 && <>
      <button type="button" aria-label="Imagen anterior" onClick={onPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ArrowLeft className="h-4 w-4" /></button>
      <button type="button" aria-label="Imagen siguiente" onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ArrowRight className="h-4 w-4" /></button>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1" role="group" aria-label="Recursos multimedia">
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
      <div className="truncate text-[10px] font-medium text-slate-700">{fact.label}</div>
    </div>)}
  </div>;
}

export function LocationLine({ item }: { item: InventoryItem }) {
  const address = 'address' in item ? item.address : undefined;
  const city = item.ciudad === 'mendoza' ? 'Mendoza' : 'Buenos Aires';
  return <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-700"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{address || city}</span></p>;
}
