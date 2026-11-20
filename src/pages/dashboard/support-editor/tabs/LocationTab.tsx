import type { FormState } from '../types';
import { Field, inputClass, labelClass, sectionClass } from '../../../../components/dashboard/ui/Field';
import { extractCoordsFromUrl } from '../formUtils';

type Props = {
  form: FormState;
  set: (patch: Partial<FormState>) => void;
  coordHelperVal: string;
  setCoordHelperVal: (v: string) => void;
  coordHelperError: string;
  setCoordHelperError: (v: string) => void;
  coordHelperSuccess: boolean;
  setCoordHelperSuccess: (v: boolean) => void;
};

export function LocationTab({
  form,
  set,
  coordHelperVal,
  setCoordHelperVal,
  coordHelperError,
  setCoordHelperError,
  coordHelperSuccess,
  setCoordHelperSuccess,
}: Props) {
  return (
    <div
      id="editor-panel-location"
      role="tabpanel"
      aria-labelledby="editor-tab-location"
      className="block"
    >
      <section className={sectionClass}>
        <div>
          <div className="text-eyebrow text-gray-500">UBICACIÓN FÍSICA</div>
          <h2 className="mt-1 text-base font-bold text-gray-900">Georreferenciación y dirección</h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              label="Ubicación"
              value={form.address}
              onChange={(v) => set({ address: v })}
              placeholder="Ej. San Juan 230"
            />
          </div>
          <Field label="Latitud" value={form.lat} onChange={(v) => set({ lat: v })} />
          <Field label="Longitud" value={form.lng} onChange={(v) => set({ lng: v })} />

          <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <div className={labelClass}>Asistente de Coordenadas</div>
              <span className="text-[10px] font-bold text-gray-600">Google Maps / Coords</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Pegá un enlace de Google Maps (que contenga{' '}
              <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-[11px] text-gray-800">
                @latitud,longitud
              </code>
              ) o coordenadas para autocompletar.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Pegá la URL de Maps o coordenadas aquí..."
                className={`${inputClass} flex-1`}
                value={coordHelperVal}
                onChange={(e) => {
                  const val = e.target.value;
                  setCoordHelperVal(val);
                  setCoordHelperError('');
                  setCoordHelperSuccess(false);
                  if (!val) return;
                  const coords = extractCoordsFromUrl(val);
                  if (coords) {
                    const latNum = Number(coords.lat);
                    const lngNum = Number(coords.lng);
                    if (latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
                      set({ lat: coords.lat, lng: coords.lng });
                      setCoordHelperSuccess(true);
                    } else {
                      setCoordHelperError(
                        'Coordenadas fuera de rango (Latitud: -90 a 90, Longitud: -180 a 180).',
                      );
                    }
                  } else {
                    setCoordHelperError('No se encontraron coordenadas en el texto copiado.');
                  }
                }}
              />
              {coordHelperVal && (
                <button
                  type="button"
                  onClick={() => {
                    setCoordHelperVal('');
                    setCoordHelperError('');
                    setCoordHelperSuccess(false);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-500 hover:text-gray-900"
                >
                  Limpiar
                </button>
              )}
            </div>
            {coordHelperError && (
              <div className="mt-2 text-xs font-semibold text-red-600">❌ {coordHelperError}</div>
            )}
            {coordHelperSuccess && (
              <div className="mt-2 text-xs font-semibold text-emerald-600">
                ✅ Coordenadas extraídas y aplicadas con éxito.
              </div>
            )}
            <div className="mt-2 flex items-start gap-1 text-[11px] text-gray-500">
              <span>
                💡 <strong>¿Cómo obtenerlas?</strong> En Google Maps de computadora, hacé clic derecho en
                cualquier punto y hacé clic sobre los números para copiarlos directamente.
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <Field
              label="Google Maps URL"
              value={form.mapa_url}
              onChange={(v) => set({ mapa_url: v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
