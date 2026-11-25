import { useEffect } from 'react';
import { ArrowUpRight, CheckCircle2, Mail, MapPin, Monitor, Users } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5492616706710';
const CONTACT_EMAIL = 'comercial@grupocomunicarte.com.ar';

const inquiryFields = [
  { label: 'Nombre y apellido', placeholder: 'Tu nombre y apellido', type: 'text' },
  { label: 'Empresa', placeholder: 'Nombre de tu empresa', type: 'text' },
  { label: 'Email', placeholder: 'tu@email.com', type: 'email' },
  { label: 'Teléfono', placeholder: 'Tu teléfono', type: 'tel' },
];

export default function ComingSoon() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;

    document.title = 'Grupo Comunicarte | Próximamente';
    if (description) {
      description.content = 'Estamos renovando nuestro sitio para conectar marcas con espacios de publicidad exterior que generan impacto.';
    }

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#09284b]" aria-labelledby="coming-soon-title">
      <header className="relative z-10 border-b border-slate-100 bg-white">
        <div className="mx-auto flex min-h-[88px] max-w-[1440px] items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-12">
          <a href="/" aria-label="Grupo Comunicarte, inicio" className="inline-flex items-center">
            <img src="/brand/brand-dark.webp" alt="Grupo Comunicarte" className="h-auto w-48 sm:w-56" />
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden border-l border-slate-300 pl-5 text-sm font-medium tracking-[0.16em] text-[#009966] sm:inline-flex">OOH</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#009966] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white sm:px-6 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Próximamente
            </span>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#08294c]">
        <div className="absolute inset-0 -z-20">
          <img src="/images/home.webp" alt="" className="h-full w-full object-cover object-center" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061f3b]/95 via-[#062747]/75 to-[#062747]/25" />
        <div className="mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-10 px-5 py-12 sm:px-8 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] lg:gap-14 lg:px-12 lg:py-10">
          <div className="max-w-[660px] py-5 text-white lg:py-12">
            <p className="mb-7 inline-flex items-center gap-2 rounded-md bg-[#009966] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.13em] text-white sm:text-xs">
              Publicidad en vía pública
            </p>
            <h1 id="coming-soon-title" className="max-w-[650px] text-[clamp(3.2rem,7vw,6.5rem)] font-bold leading-[0.94] tracking-[-0.055em]">
              Tu marca,
              <br />
              en el lugar
              <br />
              <span className="text-[#12d49a]">indicado.</span>
            </h1>
            <p className="mt-7 max-w-[540px] text-lg leading-8 text-white/90 sm:text-xl sm:leading-9">
              Estamos renovando nuestra plataforma para conectar marcas con espacios que generan impacto.
            </p>
            <div className="mt-8 h-1 w-24 bg-[#00b77c]" />
            <p className="mt-7 max-w-[540px] text-base leading-7 text-white/85 sm:text-lg">
              Muy pronto vas a poder explorar nuestro inventario y planificar tu próxima campaña.
            </p>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#08294c] transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Hablemos de tu campaña <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <aside className="w-full rounded-2xl border border-white/70 bg-white p-5 text-[#09284b] shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7" aria-labelledby="inquiry-title">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#009966]">Contacto comercial</p>
            </div>

            <div className="space-y-3.5" aria-label="Vista previa del formulario de consulta">
              {inquiryFields.map((field) => (
                <label key={field.label} className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#09284b]">{field.label}</span>
                  <input type={field.type} placeholder={field.placeholder} disabled aria-label={field.label} className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500 placeholder:text-slate-400 disabled:cursor-not-allowed" />
                </label>
              ))}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#09284b]">Contanos sobre tu proyecto</span>
                <textarea disabled rows={2} placeholder="Escribí un breve mensaje..." aria-label="Descripción del proyecto" className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500 placeholder:text-slate-400 disabled:cursor-not-allowed" />
              </label>
              <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#009966]" />
                Este formulario es una vista previa. No recopila ni envía datos.
              </p>
              <button type="button" disabled className="min-h-11 w-full cursor-not-allowed rounded-lg bg-[#009966]/55 px-4 py-3 text-sm font-bold text-white">
                Formulario próximamente disponible
              </button>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-600">
              ¿Necesitás contactarnos ahora? <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#007d57] underline underline-offset-2 hover:text-[#005f42]">{CONTACT_EMAIL}</a>
            </div>
          </aside>
        </div>
      </section>

      <section aria-label="Nuestros diferenciales" className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-12 lg:py-9">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5 sm:border-b-0 sm:border-r sm:pb-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#007d57]"><MapPin aria-hidden="true" className="h-6 w-6" /></span>
          <div><h3 className="font-bold">Cobertura estratégica</h3><p className="mt-1 text-xs text-slate-500">Ubicaciones con impacto</p></div>
        </div>
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5 sm:border-b-0 sm:border-r sm:pl-5 sm:pb-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#007d57]"><Monitor aria-hidden="true" className="h-6 w-6" /></span>
          <div><h3 className="font-bold">Soportes urbanos</h3><p className="mt-1 text-xs text-slate-500">Tradicionales y digitales</p></div>
        </div>
        <div className="flex items-center gap-4 sm:pl-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#007d57]"><Users aria-hidden="true" className="h-6 w-6" /></span>
          <div><h3 className="font-bold">Acompañamiento comercial</h3><p className="mt-1 text-xs text-slate-500">De la idea a la campaña</p></div>
        </div>
      </section>

      <footer className="bg-[#062747] px-5 py-6 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Grupo Comunicarte · Mendoza, Argentina</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 hover:text-white"><Mail aria-hidden="true" className="h-3.5 w-3.5" />{CONTACT_EMAIL}</a>
        </div>
      </footer>
    </main>
  );
}
