import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/ui/Button';
import { InteriorHero } from '../components/layout/InteriorHero';

export default function Soportes() {
  const soportes = [
    {
      id: 'tradicional',
      index: '01',
      name: 'Vía Pública Tradicional',
      label: 'OOH',
      description: 'Cobertura masiva con ubicaciones estratégicas de alto tránsito en Mendoza y Buenos Aires.',
      features: ['Cartelería espectacular y gigantografías', 'Sextuples y mobiliario urbano', 'Puntos de ingreso a la ciudad y rutas principales', 'Iluminación Frontlight para impacto nocturno'],
      image: '/images/soportes-tradicionales-mendoza.webp',
      imageAlt: 'Cartelería tradicional en vía pública en Mendoza',
      link: '/inventario?tipo=tradicional',
    },
    {
      id: 'led',
      index: '02',
      name: 'Pantallas LED',
      label: 'DOOH',
      description: 'Pantallas digitales ubicadas en puntos estratégicos de circulación y actividad comercial.',
      features: ['Pantallas LED para comunicación digital', 'Formatos audiovisuales para campañas', 'Frecuencia y horarios según cada ficha técnica', 'Ubicaciones en Mendoza y su área metropolitana'],
      image: '/images/pantallas-led-mendoza.webp',
      imageAlt: 'Pantallas LED publicitarias en Mendoza',
      link: '/inventario?tipo=led',
    },
    {
      id: 'led_movil',
      index: '03',
      name: 'Camión LED Móvil',
      label: 'LED Móvil',
      description: 'Un recorrido por Gran Mendoza con tres pantallas digitales que reproducen un mismo contenido: dos laterales y una posterior.',
      features: ['2 pantallas laterales de 4 × 2 m y 1 posterior de 2 × 2 m', 'Un único video proyectado en las tres pantallas', 'Spots de 10 segundos', 'Mínimo de 180 salidas diarias según ficha técnica'],
      image: '/images/led-movil-feature.webp',
      imageAlt: 'Camión con pantalla LED móvil',
      link: '/inventario?tipo=led_movil',
    },
  ];

  return (
    <div className="flex w-full flex-col bg-white">
      <InteriorHero
        eyebrow="Ecosistema de medios"
        title="Soportes diseñados para hacerse notar."
        description="Un ecosistema de medios Out-of-Home que combina presencia tradicional, tecnología digital y formatos móviles para conectar tu marca con la ciudad."
        imageSrc="/images/soportes-tradicionales-mendoza.webp"
        imageAlt="Soportes publicitarios tradicionales en Mendoza"
        actions={<Link to="/inventario" className={buttonStyles({ size: 'default' })}>Ver inventario <ArrowRight className="h-4 w-4" /></Link>}
      />

      <section className="bg-white py-12 md:py-16">
        <div className="page-container">
          <div className="mb-6 max-w-2xl border-b border-gray-200 pb-5">
            <p className="text-eyebrow">Formatos disponibles</p>
            <h2 className="text-section-title mt-3">Una arquitectura simple de medios.</h2>
            <p className="text-body mt-3">Explorá cada formato y encontrá el soporte que mejor responde al alcance y contexto de tu campaña.</p>
          </div>

          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {soportes.map((soporte) => {
              return (
                <article key={soporte.id} className="grid gap-4 py-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-7">
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    <img src={soporte.image} alt={soporte.imageAlt} className="aspect-[16/9] w-full object-cover" loading="lazy" />
                    <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-800">{soporte.label}</span>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-eyebrow text-gray-700">{soporte.index}</span>
                      <span className="text-eyebrow">Formato publicitario</span>
                    </div>
                    <h2 className="text-card-title">{soporte.name}</h2>
                    <p className="text-body mt-3 max-w-md">{soporte.description}</p>
                  </div>
                  <ul className="grid gap-2 text-sm leading-relaxed text-gray-600 sm:grid-cols-2 lg:grid-cols-1">
                    {soporte.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={soporte.link} className={buttonStyles({ variant: 'outline', size: 'sm', className: 'w-fit' })}>
                    Ver inventario <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
