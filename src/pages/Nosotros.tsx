import { ArrowRight, Target, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/ui/Button';
import { InteriorHero } from '../components/layout/InteriorHero';

export default function Nosotros() {
  const pillars = [
    {
      title: 'Ubicaciones estratégicas',
      description: 'Analizamos las dinámicas de circulación y el contexto de cada plaza para acercar las marcas a sus audiencias.',
      icon: Target,
    },
    {
      title: 'OOH + DOOH',
      description: 'Integramos soportes tradicionales y digitales para construir propuestas de comunicación exterior acordes a cada campaña.',
      icon: TrendingUp,
    },
    {
      title: 'Gestión cercana y transparente',
      description: 'Acompañamos a anunciantes y agencias con conocimiento de la industria, creatividad y una gestión ágil.',
      icon: Users,
    },
  ];

  return (
    <div className="flex w-full flex-col bg-white">
      <InteriorHero
        eyebrow="Grupo Comunicarte · Publicidad exterior"
        title="Conectamos marcas con audiencias en movimiento."
        description="Somos especialistas en Publicidad Exterior. Conectamos anunciantes con las ubicaciones más transitadas mediante una gestión ágil y transparente, pero sobre todo entendiendo las dinámicas demográficas de las plazas en las que operamos."
        imageSrc="/images/soportes-tradicionales-mendoza.webp"
        imageAlt="Soportes de publicidad exterior en Mendoza"
        actions={
          <>
            <Link to="/inventario" className={buttonStyles()}>Explorar inventario <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contacto" className={buttonStyles({ variant: 'outline' })}>Hablar con ventas</Link>
          </>
        }
      />

      <section className="section-space border-b border-gray-200 bg-white">
        <div className="page-container">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="text-eyebrow">Nosotros</p>
              <h2 className="text-section-title mt-3">Experiencia en la calle. Mirada puesta en las marcas.</h2>
            </div>
            <div className="max-w-3xl">
              <p className="text-lg leading-8 text-gray-800 md:text-xl md:leading-9">
                Grupo Comunicarte es una empresa joven. Quienes la conformamos llevamos más de 20 años en la industria del OOH, aportando conocimiento, creatividad y presencia real a marcas en todo el país.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space border-b border-gray-200 bg-[#F9F9F9]">
        <div className="page-container">
          <div className="mb-10 max-w-2xl">
            <p className="text-eyebrow">Cobertura</p>
            <h2 className="text-section-title mt-3">Conocemos las plazas donde estamos.</h2>
            <p className="text-body mt-3">Operamos en dos de las plazas más relevantes: Buenos Aires y Mendoza, en el interior del país y lugar de origen de Grupo Comunicarte.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <article className="group relative min-h-[340px] overflow-hidden rounded-2xl bg-gray-950">
              <img src="/images/bue-trad-09.jpg" alt="Soporte de publicidad exterior en Buenos Aires" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/5" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-white md:p-9">
                <span className="text-eyebrow text-white/75">Plaza · Buenos Aires</span>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight">Buenos Aires</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/85">Presencia en una de las plazas de mayor movimiento del país.</p>
                <Link to="/inventario?plaza=buenos-aires" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
                  Explorar soportes <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>

            <article className="group relative min-h-[340px] overflow-hidden rounded-2xl bg-gray-950">
              <img src="/images/soportes-tradicionales-mendoza.webp" alt="Soportes de publicidad exterior en Mendoza" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/5" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-white md:p-9">
                <span className="text-eyebrow text-white/75">Plaza · Interior del país</span>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight">Mendoza</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/85">Nuestra casa y punto de partida para conectar marcas con audiencias locales.</p>
                <Link to="/inventario?plaza=mendoza" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
                  Explorar soportes <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section-space border-b border-gray-200 bg-white">
        <div className="page-container">
          <div className="mb-10 max-w-2xl">
            <p className="text-eyebrow">Nuestra forma de trabajar</p>
            <h2 className="text-section-title mt-3">Conocimiento que se transforma en presencia.</h2>
          </div>
          <div className="divide-y divide-gray-200 border-y border-gray-200 md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
            {pillars.map(({ title, description, icon: Icon }, index) => (
              <article key={title} className="py-7 md:px-7 md:py-8 md:first:pl-0 md:last:pr-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-eyebrow">0{index + 1}</span>
                </div>
                <h3 className="text-card-title mt-5">{title}</h3>
                <p className="text-body mt-2">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/inventario" className={buttonStyles()}>Explorar inventario <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contacto" className={buttonStyles({ variant: 'outline' })}>Hablemos de tu campaña</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
