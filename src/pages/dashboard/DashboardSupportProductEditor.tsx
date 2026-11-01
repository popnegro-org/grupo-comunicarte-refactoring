import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, DollarSign, Eye, Info, MapPin, Save, Sparkles } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { SupportCard } from '../../components/inventory/SupportCard';
import type { EditorTab } from './support-editor/types';
import { useSupportForm } from './support-editor/useSupportForm';
import { GeneralTab } from './support-editor/tabs/GeneralTab';
import { LocationTab } from './support-editor/tabs/LocationTab';
import { ContentTab } from './support-editor/tabs/ContentTab';
import { CommercialTab } from './support-editor/tabs/CommercialTab';

const TAB_ITEMS: { id: EditorTab; label: string; icon: typeof Info }[] = [
  { id: 'general', label: 'Información', icon: Info },
  { id: 'location', label: 'Ubicación', icon: MapPin },
  { id: 'content', label: 'Contenido', icon: Sparkles },
  { id: 'commercial', label: 'Comercial', icon: DollarSign },
];

export default function DashboardSupportProductEditor({ mode: explicitMode }: { mode?: 'create' | 'edit' }) {
  const location = useLocation();
  const [toast, setToast] = useState('');
  useEffect(() => {
    const message = (location.state as { toast?: { type?: string; message?: string } } | null)?.toast?.message;
    if (!message) return;
    setToast(message);
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [location.state]);

  const {
    mode,
    canonicalId,
    form,
    loading,
    saving,
    error,
    activeTab,
    setActiveTab,
    coordHelperVal,
    setCoordHelperVal,
    coordHelperError,
    setCoordHelperError,
    coordHelperSuccess,
    setCoordHelperSuccess,
    theme,
    pricingTotal,
    isDirty,
    set,
    setNested,
    addRest,
    updateRest,
    removeRest,
    previewItem,
    save,
    handleNavigateWithConfirm,
    typeLabel,
  } = useSupportForm(explicitMode);

  if (loading) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-5xl py-16 text-center text-sm text-slate-500">Cargando soporte…</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[60] rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
          {toast}
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-4 pb-10">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => handleNavigateWithConfirm('/dashboard/soportes')}
              className="mb-1 inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 sm:min-h-0"
            >
              <ArrowLeft className="h-4 w-4" /> Gestión de Soportes
            </button>
            <div className="text-eyebrow text-emerald-700">
              {mode === 'create' ? 'ALTA DE PRODUCTO' : 'EDICIÓN DE PRODUCTO'} · {theme.label}
            </div>
            <h1 className="mt-1 text-page-title text-slate-800">
              {mode === 'create' ? 'Nuevo soporte' : form.publicName || 'Editar soporte'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isDirty && (
              <span className="mr-1 inline-flex items-center gap-2 text-xs font-semibold text-amber-700" aria-live="polite">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Cambios sin guardar
              </span>
            )}
            {canonicalId && (
              <button
                type="button"
                onClick={() =>
                  handleNavigateWithConfirm(`/dashboard/soportes/${encodeURIComponent(canonicalId)}/preview`)
                }
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:min-h-[36px]"
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
            )}
            <button
              type="button"
              onClick={() => handleNavigateWithConfirm('/dashboard/soportes')}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:min-h-[36px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:min-h-[36px]"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : mode === 'create' ? 'Crear soporte' : 'Guardar cambios'}
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="border-b border-slate-200">
          <div role="tablist" aria-label="Secciones del editor" className="flex flex-nowrap gap-1 overflow-x-auto pb-1 scrollbar-none">
            {TAB_ITEMS.map((t, idx, arr) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  const nextIndex = (idx + 1) % arr.length;
                  setActiveTab(arr[nextIndex].id);
                  document.getElementById(`editor-tab-${arr[nextIndex].id}`)?.focus();
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const prevIndex = (idx - 1 + arr.length) % arr.length;
                  setActiveTab(arr[prevIndex].id);
                  document.getElementById(`editor-tab-${arr[prevIndex].id}`)?.focus();
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  setActiveTab(arr[0].id);
                  document.getElementById(`editor-tab-${arr[0].id}`)?.focus();
                } else if (e.key === 'End') {
                  e.preventDefault();
                  setActiveTab(arr[arr.length - 1].id);
                  document.getElementById(`editor-tab-${arr[arr.length - 1].id}`)?.focus();
                }
              };
              return (
                <button
                  key={t.id}
                  id={`editor-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`editor-panel-${t.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(t.id)}
                  onKeyDown={handleKeyDown}
                  className={`flex min-h-[40px] items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition focus:outline-none sm:min-h-0 ${
                    isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          id={`editor-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`editor-tab-${activeTab}`}
          tabIndex={0}
          className="grid items-start gap-4 outline-none lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]"
        >
          <div className="space-y-3">
            {activeTab === 'general' && (
              <GeneralTab form={form} canonicalId={canonicalId} typeLabel={typeLabel} set={set} />
            )}
            {activeTab === 'location' && (
              <LocationTab
                form={form}
                set={set}
                coordHelperVal={coordHelperVal}
                setCoordHelperVal={setCoordHelperVal}
                coordHelperError={coordHelperError}
                setCoordHelperError={setCoordHelperError}
                coordHelperSuccess={coordHelperSuccess}
                setCoordHelperSuccess={setCoordHelperSuccess}
              />
            )}
            {activeTab === 'content' && (
              <ContentTab
                form={form}
                canonicalId={canonicalId}
                set={set}
                setNested={setNested}
                addRest={addRest}
                updateRest={updateRest}
                removeRest={removeRest}
                theme={theme}
              />
            )}
            {activeTab === 'commercial' && (
              <CommercialTab form={form} set={set} setNested={setNested} pricingTotal={pricingTotal} />
            )}
          </div>

          <aside id="support-card-preview" className="lg:sticky lg:top-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-eyebrow text-slate-500">PREVIEW</div>
                  <h2 className="mt-0.5 text-base font-bold text-slate-800">Cómo se publicará</h2>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  En vivo
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <SupportCard item={previewItem} variant="catalog" />
              </div>
            </div>
          </aside>
        </div>

        <div className="fixed bottom-4 right-4 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('support-card-preview');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-3 text-xs font-bold text-white shadow-xl"
            aria-label="Ver preview del soporte"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
