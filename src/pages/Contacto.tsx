import { Mail, MapPin, PhoneCallIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ContactForm } from '../components/contact/ContactForm';
import { InteriorHero } from '../components/layout/InteriorHero';
import { buttonStyles } from '../components/ui/Button';

export default function Contacto() {
  const [searchParams] = useSearchParams();
  const isMediaKit = searchParams.get('origen') === 'mediakit';

  return (
    <main className="flex flex-1 flex-col bg-[#F9F9F9]">
      <InteriorHero
        eyebrow={isMediaKit ? 'Media Kit' : 'Contacto'}
        title={isMediaKit ? 'Tu selección, lista para avanzar.' : 'Hablemos de tu próxima campaña.'}
        description={isMediaKit ? 'Este es el cierre de tu selección: completá tus datos y enviá la solicitud para que el equipo comercial prepare tu propuesta.' : 'Contanos qué necesitás comunicar y te ayudamos a encontrar la solución OOH o DOOH adecuada.'}
        compact
        actions={<Link to="/inventario" className={buttonStyles({ variant: 'outline' })}>Volver al inventario</Link>}
      />

      <div className="page-container py-7 md:py-9">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ContactForm isMediaKit={isMediaKit} />
          <aside className="grid gap-3 lg:sticky lg:top-24">
            {isMediaKit && (
              <div className="surface-card p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Cierre de solicitud</p>
                <h2 className="mt-2 text-base font-semibold text-gray-950">No perdés tu selección</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">Los soportes que elegiste se envían junto con tus datos. No necesitás volver al inventario.</p>
              </div>
            )}
            <a href="mailto:comercial@grupocomunicarte.com.ar" className="surface-card block p-5 transition-colors hover:border-gray-300">
              <Mail className="h-5 w-5 text-gray-700" aria-hidden="true" />
              <h2 className="text-card-title mt-3 text-base">Email comercial</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">comercial@grupocomunicarte.com.ar</p>
            </a>
            <a href="https://maps.app.goo.gl/V3uZwDq283b1u6UY8" className="surface-card block p-5 transition-colors hover:border-gray-300">
              <MapPin className="h-5 w-5 text-gray-700" aria-hidden="true" />
              <h2 className="text-card-title mt-3 text-base">Oficina Comercial</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">9 de Julio 891, M5501 Godoy Cruz, Mendoza</p>
            </a>
            <a href="https://wa.me/542615830208" className="surface-card block p-5 transition-colors hover:border-gray-300">
              <PhoneCallIcon className="h-5 w-5 text-gray-700" aria-hidden="true" />
              <h2 className="text-card-title mt-3 text-base">WhatsApp</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">+54 261 583 0208</p>
            </a>
          </aside>
        </div>
      </div>
    </main>
  );
}
