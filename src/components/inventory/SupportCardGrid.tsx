import React from 'react';
import { InventoryItem } from '../../types';
import { SupportCard } from './SupportCard';
import { SearchX } from 'lucide-react';
import { Button } from '../ui/Button';

interface SupportCardGridProps {
  items: InventoryItem[];
  onResetFilters?: () => void;
}

export const SupportCardGrid: React.FC<SupportCardGridProps> = ({
  items,
  onResetFilters,
}) => {
  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center p-8 text-center bg-gray-50/50">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm mb-4">
          <SearchX className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-950 mb-1">No se encontraron soportes</h3>
        <p className="text-sm text-gray-600 max-w-md mb-6">
          No hay elementos en el inventario que coincidan con los filtros aplicados. Probá cambiar la plaza, el formato o el término de búsqueda.
        </p>
        {onResetFilters && (
          <Button onClick={onResetFilters} variant="outline" className="rounded-xl font-bold">
            Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 p-4 sm:p-6 lg:p-8 pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <SupportCard
              key={item.canonical_id}
              item={item}
              variant="selectable"
              selectable={true}
              imagePriority={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
