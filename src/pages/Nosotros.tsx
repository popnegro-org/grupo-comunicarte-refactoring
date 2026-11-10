import { ArrowRight, Target, TrendingUp, Users } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/ui/Button';
import { InteriorHero } from '../components/layout/InteriorHero';
import { useEffect, useState } from 'react';

interface CounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({ end, duration = 1500, prefix = '', suffix = '', className = '' }: CounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPercentage = Math.min(progress / duration, 1);
      setCount(Math.floor(progressPercentage * (2 - progressPercentage) * end));
      if (progress < duration) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span className={className}>{prefix}{count}{suffix}</span>;
}

export default function Nosotros() {
  const { items } = useInventory();
  const plazaCount = new Set(items.map(item => item.ciudad)).size;
  const pillars = [
    { title: 'Ubicaciones Estratégicas', description: 'Cada espacio es seleccionado rigurosamente por su volumen de tránsito vehicular y peatonal, garantizando una alta tasa de contacto visual con tu audiencia.', icon: Target },
    { title: 'Digitalización DOOH', description: 'Modernizamos la vía pública con pantallas dinámicas de alta definición para ofrecer contenidos adaptables y con óptimo contraste diurno y nocturno.', icon: TrendingUp },
    { title: 'Asesoramiento Profesional', description: 'Acompañamos a marcas, agencias y pymes en el diseño de su mix de medios, optimizando la distribución de la pauta para maximizar el retorno de inversión.', icon: Users },
  ];

  return (
    <div className="flex w-full flex-col bg-white">
      <InteriorHero
        eyebrow="Acerca de nosotros"
        title="Conectamos marcas con audiencias en movimiento."
        description="Especialistas en comunicación exterior y pantallas digitales. Conectamos anunciantes con las ubicaciones más transitadas de Mendoza y Buenos Aires mediante una gestión ágil y transparente."
        imageSrc="/images/soportes-tradicionales-mendoza.webp"
        imageAlt="Publicidad exterior tradicional en Mendoza"
        actions={
          <>
            <Link to="/inventario" className={buttonStyles()}>Explorar inventario <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contacto" className={buttonStyles({ variant: 'outline' })}>Hablar con ventas</Link>
          </>
        }
      />

      <section className="border-b border-gray-200 bg-[#F9F9F9] py-10 md:py-12">
        <div className="page-container">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-3">
            <div className="border-b border-gray-200 p-6 md:border-b-0 md:border-r md:p-7">
              <AnimatedCounter prefix="+" end={items.length} className="text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl" />
              <span className="mt-2 block text-xs font-medium leading-relaxed text-gray-500">Soportes disponibles en las plazas activas</span>
            </div>
            <div className="border-b border-gray-200 p-6 md:border-b-0 md:border-r md:p-7">
              <span className="text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">OOH + DOOH</span>
              <span className="mt-2 block text-xs font-medium leading-relaxed text-gray-500">Formatos tradicionales y digitales</span>
            </div>
            <div className="p-6 md:p-7">
              <span className="text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">{plazaCount}</span>
              <span className="mt-2 block text-xs font-medium leading-relaxed text-gray-500">Plazas estratégicas nacionales</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="page-container">
          <div className="mb-10 max-w-2xl border-b border-gray-200 pb-6">
            <p className="text-eyebrow">Cómo trabajamos</p>
            <h2 className="text-section-title mt-3">Nuestros pilares.</h2>
            <p className="text-body mt-3">Una mirada estratégica sobre ubicación, tecnología y resultados para construir campañas que se hagan notar.</p>
          </div>

          <div className="divide-y divide-gray-200 border-y border-gray-200 md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title} className="p-7 md:px-8 md:py-9 md:first:pl-0 md:last:pr-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-eyebrow text-gray-400">0{index + 1}</span>
                  </div>
                  <h3 className="text-card-title mt-5">{pillar.title}</h3>
                  <p className="text-body mt-2">{pillar.description}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/inventario" className={buttonStyles({ size: "default" })}>Explorar inventario <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contacto" className={buttonStyles({ variant: "outline", size: "default" })}>Hablar con ventas</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
