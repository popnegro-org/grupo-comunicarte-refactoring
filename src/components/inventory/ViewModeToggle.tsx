import React from 'react';
import { Map, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ViewMode = 'mapa' | 'catalogo';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onViewModeChange, className }) => (
  <div
    role="group"
    aria-label="Modo de visualización del inventario"
    className={cn('inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 select-none', className)}
  >
    {([
      { mode: 'mapa' as const, label: 'Mapa', Icon: Map },
      { mode: 'catalogo' as const, label: 'Catálogo', Icon: LayoutGrid },
    ]).map(({ mode, label, Icon }) => (
      <button
        key={mode}
        type="button"
        aria-pressed={viewMode === mode}
        onClick={() => onViewModeChange(mode)}
        className={cn(
          'flex min-h-11 items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20',
          viewMode === mode ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </button>
    ))}
  </div>
);
