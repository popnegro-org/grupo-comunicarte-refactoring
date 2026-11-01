import React, { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from './cn';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass?: string;
  statusBadge?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  iconColorClass = 'text-slate-600',
  statusBadge,
  footer,
  className = '',
}) => (
  <Card className={cn('min-h-32 p-4 sm:p-5', className)}>
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium text-slate-500">{title}</span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50" aria-hidden="true">
        <Icon className={`h-3.5 w-3.5 ${iconColorClass}`} />
      </span>
    </div>
    <div className="mt-4 flex items-baseline gap-2">
      <span className="text-2xl font-semibold tracking-tight text-slate-900">{value}</span>
      {unit && <span className="text-xs text-slate-500">{unit}</span>}
    </div>
    {(footer || statusBadge) && (
      <div className="mt-3 flex min-h-4 items-center gap-2 text-xs text-slate-500">
        {statusBadge}
        {footer && <span>{footer}</span>}
      </div>
    )}
  </Card>
);
