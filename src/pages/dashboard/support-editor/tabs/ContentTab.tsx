import type { FormState } from '../types';
import { Field, BadgeField, labelClass, sectionClass } from '../../../../components/dashboard/ui/Field';
import { MultimediaUploadZone } from '../../../../components/inventory/MultimediaUploadZone';
import { isEditorFieldVisible, isEditorSectionVisible, type SupportEditorThemeConfig } from '../../supportEditorThemes';

type Props = {
  form: FormState;
  canonicalId?: string;
  set: (patch: Partial<FormState>) => void;
  setNested: (key: 'traditional' | 'led' | 'mobile' | 'pricing', patch: any) => void;
  addRest: () => void;
  updateRest: (i: number, v: string) => void;
  removeRest: (i: number) => void;
  theme: SupportEditorThemeConfig;
};

export function ContentTab({
  form,
  canonicalId,
  set,
  setNested,
  addRest,
  updateRest,
  removeRest,
  theme,
}: Props) {
  return (
    <div
      id="editor-panel-content"
      role="tabpanel"
      aria-labelledby="editor-tab-content"
      className="block"
    >
      <section className={sectionClass}>
        <div>
          <div className="text-eyebrow text-gray-500">CONTENIDO Y ATRIBUTOS</div>
          <h2 className="mt-1 text-base font-bold text-gray-900">Multimedia y ficha técnica</h2>
          <p className="mt-0.5 text-[11px] text-gray-600">{theme.label}</p>
        </div>

        <div className="mt-3 space-y-3">
          {isEditorSectionVisible(theme, 'presentation') && <MultimediaUploadZone
            canonicalId={canonicalId}
            url={form.coverUrl}
            kind={form.coverKind}
            label="Portada"
            description="Foto o video principal del carousel."
            onUrlChange={(url, kind) => set({ coverUrl: url, coverKind: kind })}
            onClear={() => set({ coverUrl: '', coverKind: 'image' })}
          />}

          {isEditorSectionVisible(theme, 'presentation') && <div className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className={labelClass}>Resto multimedia</div>
                <p className="mt-0.5 text-[11px] text-gray-500">Hasta 2 recursos adicionales.</p>
              </div>
              <button
                type="button"
                onClick={addRest}
                disabled={form.restMedia.length >= 2}
                className="min-h-[40px] rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 disabled:opacity-50 sm:min-h-0"
              >
                + Cargar más
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {form.restMedia.map((v, i) => (
                <MultimediaUploadZone
                  key={`rest-media-${i}`}
                  canonicalId={canonicalId}
                  url={v}
                  kind={/\.(mp4|webm|mov)(\?|$)/i.test(v) ? 'video' : 'image'}
                  label={`Recurso Adicional ${i + 1}`}
                  description="Imagen o video complementario para la galería."
                  onUrlChange={(url) => updateRest(i, url)}
                  onClear={() => removeRest(i)}
                />
              ))}
            </div>
          </div>}

          {isEditorSectionVisible(theme, 'technical') && theme.family === 'traditional' && (
            <div className="space-y-2">
              <div className={labelClass}>Atributos visibles</div>
              <div className="flex flex-wrap gap-1.5">
                <BadgeField label="Formato" value={form.traditional.formato} />
                <BadgeField label="Medidas" value={form.traditional.medidas} />
                <BadgeField label="Caras" value={form.traditional.caras} />
                <BadgeField label="Impresión" value={form.traditional.impresion} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {isEditorFieldVisible(theme, 'technical.summary') && <Field label="Formato" value={form.traditional.formato} onChange={(v) => setNested('traditional', { formato: v })} />}
                {isEditorFieldVisible(theme, 'technical.measures') && <Field label="Medidas" value={form.traditional.medidas} onChange={(v) => setNested('traditional', { medidas: v })} />}
                {isEditorFieldVisible(theme, 'technical.monthly_impacts') && <Field label="Impactos mensuales" value={form.traditional.monthly_impacts} onChange={(v) => setNested('traditional', { monthly_impacts: v })} type="number" />}
                {isEditorFieldVisible(theme, 'technical.caras') && <Field label="Caras" value={form.traditional.caras} onChange={(v) => setNested('traditional', { caras: v })} />}
                {isEditorFieldVisible(theme, 'technical.impresion') && <Field label="Impresión" value={form.traditional.impresion} onChange={(v) => setNested('traditional', { impresion: v })} />}
              </div>
            </div>
          )}

          {isEditorSectionVisible(theme, 'technical') && theme.family === 'led' && (
            <div className="space-y-2">
              <div className={labelClass}>Atributos visibles</div>
              <div className="flex flex-wrap gap-1.5">
                <BadgeField label="Formato" value={form.led.formato} />
                <BadgeField label="Medidas" value={form.led.medidas} />
                <BadgeField label="Resolución" value={form.led.resolucion} />
                <BadgeField label="Frecuencia" value={form.led.frecuencia} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {isEditorFieldVisible(theme, 'technical.summary') && <Field label="Formato" value={form.led.formato} onChange={(v) => setNested('led', { formato: v })} />}
                {isEditorFieldVisible(theme, 'technical.measures') && <Field label="Medidas" value={form.led.medidas} onChange={(v) => setNested('led', { medidas: v })} />}
                {isEditorFieldVisible(theme, 'technical.resolution') && <Field label="Resolución" value={form.led.resolucion} onChange={(v) => setNested('led', { resolucion: v })} />}
                {isEditorFieldVisible(theme, 'technical.monthly_impacts') && <Field label="Impactos mensuales" value={form.led.monthly_impacts} onChange={(v) => setNested('led', { monthly_impacts: v })} type="number" />}
                {isEditorFieldVisible(theme, 'technical.daily_frequency') && <Field label="Frecuencia" value={form.led.frecuencia} onChange={(v) => setNested('led', { frecuencia: v })} />}
                {isEditorFieldVisible(theme, 'technical.video_mode') && <Field label="Modo de video" value={form.led.video_mode} onChange={(v) => setNested('led', { video_mode: v })} />}
                {isEditorFieldVisible(theme, 'technical.spot_duration_seconds') && <Field label="Duración de spot" value={form.led.spot_duration} onChange={(v) => setNested('led', { spot_duration: v })} />}
              </div>
            </div>
          )}

          {isEditorSectionVisible(theme, 'technical') && theme.family === 'led_mobile' && (
            <div className="space-y-2">
              <div className={labelClass}>Atributos visibles</div>
              <div className="flex flex-wrap gap-1.5">
                <BadgeField label="Pantalla" value={form.mobile.pantalla} />
                <BadgeField label="Resolución" value={form.mobile.resolucion} />
                <BadgeField label="Spot" value={form.mobile.spot_duration} />
                <BadgeField label="Salidas" value={form.mobile.minimum_daily_outings} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {isEditorFieldVisible(theme, 'technical.measures') && <Field label="Pantalla / formato" value={form.mobile.pantalla} onChange={(v) => setNested('mobile', { pantalla: v })} />}
                {isEditorFieldVisible(theme, 'technical.route_duration_hours') && <Field label="Duración" value={form.mobile.duration} onChange={(v) => setNested('mobile', { duration: v })} />}
                {isEditorFieldVisible(theme, 'technical.monthly_impacts') && <div>
                  <Field
                    label="Impactos mensuales"
                    value={form.mobile.monthly_impacts}
                    onChange={(v) => setNested('mobile', { monthly_impacts: v })}
                    type="number"
                    placeholder="Ej. 5782520"
                  />
                  <p className="mt-0.5 text-[11px] text-gray-500">Dato editorial manual.</p>
                </div>}
                {isEditorFieldVisible(theme, 'technical.resolution') && <Field label="Resolución" value={form.mobile.resolucion} onChange={(v) => setNested('mobile', { resolucion: v })} />}
                {isEditorFieldVisible(theme, 'technical.spot_duration_seconds') && <Field label="Duración de spot" value={form.mobile.spot_duration} onChange={(v) => setNested('mobile', { spot_duration: v })} />}
                {isEditorFieldVisible(theme, 'technical.minimum_daily_outings') && <Field label="Salidas mínimas" value={form.mobile.minimum_daily_outings} onChange={(v) => setNested('mobile', { minimum_daily_outings: v })} />}
                {isEditorSectionVisible(theme, 'route') && <Field label="Recorrido" value={form.mobile.recorrido} onChange={(v) => setNested('mobile', { recorrido: v })} />}
                {isEditorFieldVisible(theme, 'technical.operation_days') && <Field label="Días de operación" value={form.mobile.operation_days} onChange={(v) => setNested('mobile', { operation_days: v })} />}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
            <div className="text-sm font-bold text-gray-900">¿Publicar como destacado?</div>
            <button
              type="button"
              onClick={() => set({ isFeatured: !form.isFeatured })}
              className={`min-h-[40px] rounded-full px-3 py-1.5 text-xs font-bold sm:min-h-0 ${
                form.isFeatured ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {form.isFeatured ? 'Sí' : 'No'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
