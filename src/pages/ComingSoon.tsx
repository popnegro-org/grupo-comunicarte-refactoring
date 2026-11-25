import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Mail, MapPin, Monitor, Users } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/542615830208';
const CONTACT_EMAIL = 'comercial@grupocomunicarte.com.ar';

export default function ComingSoon() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          company: formData.get('company'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          message: formData.get('message'),
          website: formData.get('website'),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'No pudimos enviar tu consulta. Probá nuevamente.');
      }

      form.reset();
      setFormMessage({ type: 'success', text: result.message || 'Tu consulta fue enviada.' });
    } catch (error) {
      setFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ocurrió un error al enviar tu consulta.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#09284b]" aria-labelledby="coming-soon-title">
      <header className="relative z-10 border-b border-slate-100 bg-white">
        <div className="mx-auto flex min-h-[88px] max-w-[1440px] items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-12">
          <a href="/" aria-label="Grupo Comunicarte, inicio" className="inline-flex items-center">
            <img src="/brand/brand-dark.webp" alt="Grupo Comunicarte" className="h-auto w-40 sm:w-56" />
          </a>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#009966] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white sm:px-6 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Próximamente
            </span>
          </div>
        </div>
      </header>

      <section className="relative isolate bg-[#08294c]">
        <div className="absolute inset-0 -z-20">
          <img src="/images/home.webp" alt="" className="h-full w-full object-cover object-center" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061f3b]/95 via-[#062747]/75 to-[#062747]/25" />
        <div className="mx-auto grid max-w-[1440px] items-start gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:min-h-[calc(100svh-88px)] lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] lg:items-center lg:gap-14 lg:px-12 lg:py-8">
          <div className="min-w-0 max-w-[660px] py-2 text-white lg:py-8">
            <p className="mb-7 inline-flex flex-col gap-1 rounded-md bg-[#009966] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.13em] text-white sm:text-xs">
              <span>Grupo Comunicarte</span>
              <span className="text-[#12d49a]">OOH, DOOH y LED MÓVIL</span>
            </p>
            <h1 id="coming-soon-title" className="max-w-[650px] break-words text-[clamp(2.75rem,6vw,5.75rem)] font-bold leading-[1.02] tracking-[-0.05em]">
              Publicidad exterior en Mendoza y Buenos Aires
            </h1>
            <p className="mt-6 max-w-[590px] text-base leading-7 text-white/85 sm:text-lg">
              Conectamos marcas con audiencias a través de soportes urbanos tradicionales, pantallas digitales y formatos LED móviles. Consultá por alternativas para tu campaña.
            </p>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#08294c] transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Hablemos de tu campaña <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <aside className="min-w-0 w-full self-start rounded-2xl border border-white/70 bg-white p-5 text-[#09284b] shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7 lg:self-center" aria-label="Contacto comercial">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#009966]">Contacto comercial</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#09284b]">Nombre y apellido <span aria-hidden="true">*</span></span>
                <input name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} placeholder="Tu nombre y apellido" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#09284b] placeholder:text-slate-400 focus:border-[#009966] focus:outline-none focus:ring-2 focus:ring-[#009966]/15" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#09284b]">Empresa</span>
                <input name="company" type="text" autoComplete="organization" maxLength={160} placeholder="Nombre de tu empresa" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#09284b] placeholder:text-slate-400 focus:border-[#009966] focus:outline-none focus:ring-2 focus:ring-[#009966]/15" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#09284b]">Email <span aria-hidden="true">*</span></span>
                <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@email.com" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#09284b] placeholder:text-slate-400 focus:border-[#009966] focus:outline-none focus:ring-2 focus:ring-[#009966]/15" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#09284b]">Teléfono</span>
                <input name="phone" type="tel" autoComplete="tel" maxLength={50} placeholder="Tu teléfono" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#09284b] placeholder:text-slate-400 focus:border-[#009966] focus:outline-none focus:ring-2 focus:ring-[#009966]/15" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#09284b]">Contanos sobre tu proyecto <span aria-hidden="true">*</span></span>
                <textarea name="message" required minLength={10} maxLength={3000} rows={3} placeholder="Escribí un breve mensaje..." className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#09284b] placeholder:text-slate-400 focus:border-[#009966] focus:outline-none focus:ring-2 focus:ring-[#009966]/15" />
              </label>
              <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="contact-website">No completar este campo</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              {formMessage && (
                <p role={formMessage.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`text-xs leading-5 ${formMessage.type === 'success' ? 'text-[#007d57]' : 'text-red-600'}`}>
                  {formMessage.text}
                </p>
              )}
              <button type="submit" disabled={isSubmitting} className="min-h-11 w-full rounded-lg bg-[#009966] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#007d57] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#009966] disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? 'Enviando consulta…' : 'Enviar consulta'}
              </button>
            </form>
            <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-600">
              ¿Necesitás contactarnos ahora? <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#007d57] underline underline-offset-2 hover:text-[#005f42]">{CONTACT_EMAIL}</a>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="solutions-title" className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="max-w-3xl">
          <h2 id="solutions-title" className="text-2xl font-bold tracking-tight text-[#09284b] sm:text-3xl">Soluciones de publicidad exterior para marcas</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Desarrollamos propuestas de comunicación OOH y DOOH con cobertura comercial en Mendoza y Buenos Aires, Argentina.
          </p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#007d57]"><MapPin aria-hidden="true" className="h-5 w-5" /></span>
            <h3 className="mt-4 font-bold text-[#09284b]">Publicidad OOH</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Soportes urbanos y cartelería tradicional para comunicar marcas en espacios de circulación.</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#007d57]"><Monitor aria-hidden="true" className="h-5 w-5" /></span>
            <h3 className="mt-4 font-bold text-[#09284b]">Publicidad DOOH</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Pantallas digitales y formatos LED para campañas de comunicación exterior.</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#007d57]"><Users aria-hidden="true" className="h-5 w-5" /></span>
            <h3 className="mt-4 font-bold text-[#09284b]">LED móvil</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Formatos móviles para ampliar las posibilidades de presencia de una campaña.</p>
          </article>
        </div>
        <p className="mt-8 text-sm leading-6 text-slate-600">
          ¿Buscás publicidad exterior en Mendoza o Buenos Aires? Contactá al equipo comercial para conversar sobre objetivos, formatos y disponibilidad.
        </p>
      </section>

      <section aria-labelledby="location-title" className="border-t border-slate-100 bg-slate-50 px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h2 id="location-title" className="text-lg font-bold text-[#09284b]">Nuestra oficina en Mendoza</h2>
            <address className="mt-2 not-italic text-sm leading-6 text-slate-600">
              9 de Julio 891, M5501 Godoy Cruz, Mendoza, Argentina
            </address>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Recibimos visitas. Atención comercial para campañas en Mendoza, Ciudad Autónoma de Buenos Aires y provincia de Buenos Aires.
            </p>
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=9+de+Julio+891+M5501+Godoy+Cruz+Mendoza+Argentina" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-fit max-w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#09284b] transition hover:border-[#009966] hover:text-[#007d57] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#009966]">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" /> Cómo llegar
          </a>
        </div>
      </section>

      <footer className="bg-[#062747] px-5 py-6 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Grupo Comunicarte · Mendoza, Argentina</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 break-all hover:text-white"><Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{CONTACT_EMAIL}</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-emerald-300">WhatsApp comercial</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
