import type { FormState, Plaza, SupportType } from '../types';
import { Field, inputClass, labelClass, sectionClass, textareaClass } from '../../../../components/dashboard/ui/Field';

type Props = {
  form: FormState;
  canonicalId?: string;
  typeLabel: string;
  set: (patch: Partial<FormState>) => void;
};

export function GeneralTab({ form, canonicalId, typeLabel, set }: Props) {
  return (
    <div
      id="editor-panel-general"
      role="tabpanel"
      aria-labelledby="editor-tab-general"
      className="block"
    >
      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-eyebrow text-gray-500">INFORMACIÓN GENERAL</div>
            <h2 className="mt-1 text-base font-bold text-gray-900">Datos básicos del soporte</h2>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{typeLabel}</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="support-type" className={labelClass}>Tipología *</label>
            <select
              id="support-type"
              className={inputClass}
              value={form.tipo_soporte}
              onChange={(e) => set({ tipo_soporte: e.target.value as SupportType })}
            >
              <option value="tradicional">Tradicional</option>
              <option value="led">LED</option>
              <option value="led_movil">LED móvil</option>
            </select>
          </div>
          <Field
            label="Soporte ID · uso interno"
            value={canonicalId || 'Se genera al guardar'}
            onChange={() => undefined}
            readOnly
          />
          <div className="md:col-span-2">
            <label htmlFor="support-tenant" className={labelClass}>Unidad de negocio / ownership *</label>
            <select
              id="support-tenant"
              className={inputClass}
              value={form.tenant_id}
              disabled={Boolean(canonicalId && form.tenant_id)}
              onChange={(e) => set({ tenant_id: e.target.value })}
              aria-describedby="support-tenant-help"
            >
              <option value="">Pendiente de conciliación (no publicable)</option>
              <option value="tenant-ba">Buenos Aires · tenant-ba</option>
              <option value="tenant-default">Mendoza · tenant-default</option>
            </select>
            <p id="support-tenant-help" className="mt-1 text-xs text-gray-500">
              La ciudad no asigna ownership automáticamente. Las asignaciones existentes requieren corrección auditada.
            </p>
          </div>
          <div className="md:col-span-2">
            <Field
              label="Evidencia documental de ownership *"
              value={form.tenant_ownership_evidence}
              onChange={(value) => set({ tenant_ownership_evidence: value })}
              placeholder="docs/inventario/source/soportes-mendoza.pdf · posición 01"
              readOnly={Boolean(canonicalId && form.tenant_id)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Referencia al PDF fuente y posición exacta. Obligatoria para asignar un tenant; queda registrada con actor y fecha.
            </p>
          </div>
          <div>
            <label htmlFor="support-city" className={labelClass}>Plaza *</label>
            <select
              id="support-city"
              className={inputClass}
              value={form.ciudad}
              onChange={(e) => set({ ciudad: e.target.value as Plaza })}
            >
              <option value="mendoza">Mendoza</option>
              <option value="buenos-aires">Buenos Aires</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Field
              label="Nombre público *"
              value={form.publicName}
              onChange={(v) => set({ publicName: v })}
              placeholder="Ej. Soporte San Juan y San Martín"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="support-description" className={labelClass}>Descripción · máximo 250 caracteres</label>
            <textarea
              id="support-description"
              className={`${textareaClass} min-h-28`}
              maxLength={250}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
            <div className="mt-1 text-right text-xs text-gray-500">{form.description.length}/250</div>
          </div>
        </div>
      </section>
    </div>
  );
}
