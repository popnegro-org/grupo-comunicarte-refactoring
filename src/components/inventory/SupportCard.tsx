import { useState } from 'react';
import { ArrowRight, Check, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InventoryItem, getDisponibilidad } from '../../types';
import { toInventoryPresentationItem } from '../../lib/inventoryPresentationAdapter';
import { useSelection } from '../../context/SelectionContext';
import {
  FactStrip,
  LocationLine,
  StatusBadge,
  SupportMedia,
  TypeBadge,
  mediaSlides,
  reservationPeriod,
} from './SupportCardPrimitives';

interface SupportCardProps {
  item: InventoryItem;
  variant?: 'showcase' | 'catalog' | 'selectable' | 'dashboard' | 'map';
  selectable?: boolean;
  onRemove?: (item: InventoryItem) => void;
}

const cardBase = 'overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md';

export function SupportCard({ item, variant = 'catalog', selectable = false, onRemove }: SupportCardProps) {
  const navigate = useNavigate();
  const { isSelected, toggleSelect } = useSelection();
  const status = getDisponibilidad(item);
  const selected = isSelected(item.canonical_id);
  const slides = mediaSlides(item);
  const [slide, setSlide] = useState(0);
  const index = slides.length ? Math.min(slide, slides.length - 1) : 0;
  const period = reservationPeriod(item);
  const locationUrl = `/inventario?plaza=${item.ciudad}&tipo=${item.tipo_soporte}&soporte=${encodeURIComponent(item.canonical_id)}`;
  const detailUrl = locationUrl;
  const contactUrl = `/contacto?soporte=${encodeURIComponent(item.canonical_id)}`;
  const alt = `Soporte publicitario ${item.name}`;

  if (status === 'inactivo' && variant !== 'dashboard') return null;


  const openDetail = () => navigate(detailUrl);

  const media = (
    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
      <SupportMedia
        slides={slides}
        index={index}
        onPrevious={() => setSlide((index - 1 + slides.length) % slides.length)}
        onNext={() => setSlide((index + 1) % slides.length)}
        onSelect={setSlide}
        alt={alt}
      />
      <div className="absolute left-3 top-3"><StatusBadge item={item} /></div>
      {item.isFeatured && (
        <span className={`absolute right-3 ${variant === 'selectable' ? 'top-12' : 'top-3'} rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-950 shadow-sm`}>
          Destacado
        </span>
      )}
    </div>
  );

  const titleBlock = (
    <div className="min-w-0">
      <div className="flex items-center gap-2"><TypeBadge item={item} /></div>
      <h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-tight text-slate-950">{item.name}</h3>
      <div className="mt-2"><LocationLine item={item} /></div>
    </div>
  );

  if (variant === 'showcase') {
    return (
      <article className={`${cardBase} rounded-3xl`}>
        {media}
        <div className="p-5 sm:p-6">
          {titleBlock}
          <div className="mt-5"><FactStrip item={item} /></div>
          {period && status === 'reservado' && <p className="mt-3 text-xs font-medium text-slate-600">{period}</p>}
          <button type="button" onClick={openDetail} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">
            Ver soporte <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </article>
    );
  }

  if (variant === 'map') {
    const canSelectMap = status === 'disponible';
    return (
      <article className={`${cardBase} rounded-2xl border-slate-200`}>
        {media}
        <div className="p-4 sm:p-5">
          {titleBlock}
          <div className="mt-5"><FactStrip item={item} /></div>
          {period && status === 'reservado' && <p className="mt-3 text-xs font-medium text-slate-600">{period}</p>}
          <div className="mt-5 flex gap-3">
            {canSelectMap ? (
              <button type="button" onClick={() => toggleSelect(item)} aria-pressed={selected} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ${selected ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-slate-950 text-white hover:bg-slate-800'}`}>
                {selected ? <Check className="h-4 w-4 text-emerald-600" /> : <Plus className="h-4 w-4" />}{selected ? 'Quitar selección' : 'Añadir al Mediakit'}
              </button>
            ) : status === 'reservado' ? (
              <button type="button" onClick={() => navigate(contactUrl)} className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-900">
                Consultar disponibilidad
              </button>
            ) : null}
            <button type="button" onClick={openDetail} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ${canSelectMap || status === 'reservado' ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50' : 'bg-slate-950 text-white'}`}>
              Ver soporte <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'dashboard') {
    const presentation = toInventoryPresentationItem(item);
    const operationalStateTone =
      presentation.estadoOperativo === 'Operativo'
        ? 'bg-emerald-50 text-emerald-700'
        : presentation.estadoOperativo === 'Mantenimiento'
          ? 'bg-amber-50 text-amber-800'
          : presentation.estadoOperativo === 'Inactivo'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-violet-50 text-violet-700';

    return (
      <article className={`${cardBase} rounded-2xl`}>
        {media}
        <div className="p-4 sm:p-5">
          {titleBlock}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">Estado operativo</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${operationalStateTone}`}>
              {presentation.estadoOperativo}
            </span>
          </div>
          <div className="mt-5"><FactStrip item={item} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate(`/dashboard/soportes/${encodeURIComponent(item.canonical_id)}/edit`)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            <button type="button" onClick={() => navigate(`/dashboard/soportes/${encodeURIComponent(item.canonical_id)}/preview`)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>
        </div>
      </article>
    );
  }

  const canSelect = selectable && status === 'disponible';

  return (
    <article className={`${cardBase} ${selected ? 'border-emerald-300 ring-1 ring-emerald-200 shadow-md' : 'border-slate-200'}`}>

      <div className="relative">
        {media}
        {variant === 'selectable' && (
          <div className={`absolute right-3 top-3 flex min-h-8 items-center gap-1.5 rounded-full px-3 shadow-sm ${selected ? 'bg-emerald-600 text-white' : 'bg-white/95 text-slate-600'}`}>
            {selected ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded border-2 border-slate-500" />}
            <span className="text-[11px] font-bold">{selected ? 'En tu selección' : 'Seleccionar'}</span>
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5">
        {titleBlock}
        <div className="mt-5"><FactStrip item={item} /></div>
        {period && status === 'reservado' && <p className="mt-3 text-xs font-medium text-slate-600">{period}</p>}
        <div className="mt-5 flex gap-3">
          {canSelect ? (
            <button type="button" onClick={() => toggleSelect(item)} aria-pressed={selected} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ${selected ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-slate-950 text-white hover:bg-slate-800'}`}>
              {selected ? <Check className="h-4 w-4 text-emerald-600" /> : <Plus className="h-4 w-4" />}{selected ? 'Quitar selección' : 'Seleccionar'}
            </button>
          ) : status === 'reservado' ? (
            <button type="button" onClick={() => navigate(contactUrl)} className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-900">
              Consultar disponibilidad
            </button>
          ) : null}
          <button type="button" onClick={openDetail} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ${canSelect || status === 'reservado' ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50' : 'bg-slate-950 text-white'}`}>
            Ver soporte <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {onRemove && <button type="button" onClick={() => onRemove(item)} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"><Trash2 className="h-4 w-4" /> Quitar</button>}
      </div>
    </article>
  );
}
