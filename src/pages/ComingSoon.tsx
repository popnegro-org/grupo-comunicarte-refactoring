import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, Mail, MapPin, MessageCircle, Monitor, Users } from 'lucide-react';

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
            <h1 id="coming-soon-title" className="mb-7 inline-flex items-center gap-2 rounded-md bg-[#009966] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.13em] text-white sm:text-xs">
              Grupo Comunicarte
              <br />
              <span className="text-[#12d49a]">OOH, DOOH y LED MÓVIL</span>
            </h1>
            <h2 className="max-w-[650px] text-[clamp(3.2rem,7vw,6.5rem)] font-bold leading-[0.94] tracking-[-0.055em]">
              Publicidad exterior en Mendoza y Buenos Aires
            </h2>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#08294c] transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Hablemos de tu campaña <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <aside className="w-full rounded-2xl border border-white/70 bg-white p-5 text-[#09284b] shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7" aria-label="Contacto comercial">
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

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar a Grupo Comunicarte por WhatsApp"
        title="Contactanos por WhatsApp"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition hover:scale-105 hover:bg-[#1fbd5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#009966] sm:bottom-7 sm:right-7 sm:h-16 sm:w-16"
      >
        <MessageCircle aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
      </a>
    </main>
  );
}
