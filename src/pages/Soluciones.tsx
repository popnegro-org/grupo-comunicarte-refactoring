import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/ui/Button';
import { InteriorHero } from '../components/layout/InteriorHero';

export default function Soluciones() {
  const soluciones = [
    {
      index: '01',
      title: 'Campañas de Cobertura Masiva',
      description: 'Maximizamos el alcance de tu marca utilizando circuitos estratégicos de cartelería tradicional en los principales nudos viales y accesos.',
      label: 'Vía pública',
      image: '/images/soportes-tradicionales-mendoza.webp',
      imageAlt: 'Campaña de publicidad exterior tradicional',
    },
    {
      index: '02',
      title: 'Activaciones Digitales DOOH',
      description: 'Formatos dinámicos en pantallas LED de alta resolución. Permiten actualizar creatividades en tiempo real y comunicar por franjas horarias.',
      label: 'Digital',
      image: '/images/pantallas-led-mendoza.webp',
      imageAlt: 'Pantallas LED digitales en entorno urbano',
    },
    {
      index: '03',
      title: 'Circuitos Móviles',
      description: 'Llevamos tu mensaje directamente a zonas de alto tránsito peatonal y vehicular, ideal para lanzamientos, eventos y posicionamiento de marca en movimiento.',
      label: 'LED Móvil',
      image: '/images/led-movil-feature.webp',
      imageAlt: 'Camión con pantalla LED móvil',
    },
  ];

  return (
    <div className="flex w-full flex-col bg-white">
      <InteriorHero
        eyebrow="Soluciones de comunicación exterior"
        title="Medios que conectan tu marca con la ciudad."
        description="Soluciones OOH y DOOH diseñadas para combinar alcance, ubicación y tecnología según el objetivo de cada campaña."
        align="left"
        imageSrc="/images/pantallas-led-mendoza.webp"
        imageAlt="Pantalla LED publicitaria en entorno urbano"
        actions={<Link to="/inventario" className={buttonStyles({ size: 'default' })}>Explorar inventario <ArrowRight className="h-4 w-4" /></Link>}
      />

      <section className="section-space bg-[#F9F9F9]">
        <div className="page-container">
          <div className="mb-10 max-w-2xl border-b border-gray-200 pb-6">
            <p className="text-eyebrow">Cómo podemos ayudarte</p>
            <h2 className="text-section-title mt-3">Elegí el formato según tu objetivo.</h2>
            <p className="text-body mt-3">Tres líneas de medios, una misma lógica: ubicación estratégica, claridad comercial y presencia medible.</p>
          </div>

          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {soluciones.map((solucion) => {
              return (
                <article key={solucion.index} className="grid gap-5 py-8 md:grid-cols-[minmax(220px,0.72fr)_minmax(0,1fr)] md:items-center md:gap-9">
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    <img src={solucion.image} alt={solucion.imageAlt} className="aspect-[16/9] w-full object-cover" loading="lazy" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-eyebrow text-gray-400">{solucion.index}</span>
                      <span className="text-eyebrow">{solucion.label}</span>
                    </div>
                    <h3 className="text-card-title">{solucion.title}</h3>
                    <p className="text-body mt-3 max-w-2xl">{solucion.description}</p>
                    <Link to="/inventario" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-900 hover:text-emerald-700">Explorar formatos <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/inventario" className={buttonStyles({ size: 'default' })}>Explorar inventario <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contacto" className={buttonStyles({ variant: 'outline', size: 'default' })}>Hablar con ventas</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
