import { ReactNode } from 'react';

interface InteriorHeroProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'left' | 'center';
  actions?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  compact?: boolean;
}

export function InteriorHero({ eyebrow, title, description, align = 'left', actions, imageSrc, imageAlt = '', compact = false }: InteriorHeroProps) {
  const centered = align === 'center';
  const spacing = compact ? 'py-8 md:py-10' : 'py-10 md:py-14 lg:py-16';
  const columns = imageSrc ? 'lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]' : 'lg:grid-cols-[minmax(0,1fr)_auto]';

  return (
    <header className="relative overflow-hidden border-b border-gray-200 bg-white">
      <div className={'page-container grid items-center gap-7 ' + spacing + ' ' + columns}>
        <div className={centered ? 'max-w-3xl text-center lg:mx-auto' : 'max-w-3xl'}>
          <div className={'mb-1 flex items-center gap-3 ' + (centered ? 'justify-center' : '')}>
            <span className="h-px w-8 bg-gray-900" />
            <p className="text-eyebrow">{eyebrow}</p>
          </div>
          <h1 className="text-page-title mt-3">{title}</h1>
          {description && <p className={'text-body mt-4 max-w-2xl ' + (centered ? 'mx-auto' : '')}>{description}</p>}
          {actions && <div className={'mt-6 flex flex-wrap gap-2 ' + (centered ? 'lg:justify-center' : '')}>{actions}</div>}
        </div>
        {imageSrc && (
          <div className="relative hidden overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 lg:block">
            <img src={imageSrc} alt={imageAlt} className="aspect-[5/3] w-full object-cover" loading="eager" />
          </div>
        )}
      </div>
    </header>
  );
}
