import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, CircleMarker, Tooltip, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import { LocationRecord, MobileRoute, InventoryItem, Plaza, getDisponibilidad } from '../../types';
import { SupportCard } from '../inventory/SupportCard';
import { X, SearchX } from 'lucide-react';
import { getIcon } from '../../lib/map-icons';
import { toInventoryPresentationItem } from '../../lib/inventoryPresentationAdapter';
import { useSelection } from '../../context/SelectionContext';

interface InventoryMapProps {
  locations: LocationRecord[];
  routes: MobileRoute[];
  initialSelectedId?: string | null;
  selectedPlaza?: Plaza | 'todos';
  onResetFilters?: () => void;
  userLocation?: [number, number] | null;
}

function MapUpdater({ locations, routes, userLocation }: { locations: LocationRecord[], routes: MobileRoute[], userLocation?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const validLocations = locations.filter(loc => loc.lat !== null && loc.lng !== null);
    if (validLocations.length === 0 && routes.length === 0) return;
    const bounds = L.latLngBounds([]);
    validLocations.forEach(loc => { if (loc.lat !== null && loc.lng !== null) bounds.extend([loc.lat, loc.lng]); });
    routes.forEach(route => { if (route.routePath?.length) route.routePath.forEach(point => bounds.extend(point as [number, number])); });
    if (userLocation) {
      map.flyTo(userLocation, 13, { duration: 0.8 });
      return;
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [locations, routes, userLocation, map]);
  return null;
}

export default function InventoryMap({ locations, routes, initialSelectedId, selectedPlaza, onResetFilters, userLocation }: InventoryMapProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  useEffect(() => {
    if (!initialSelectedId) return;
    const found = [...locations, ...routes].find(item => item.canonical_id === initialSelectedId);
    if (found) setSelectedItem(found);
  }, [initialSelectedId, locations, routes]);
  const { isSelected, selectedCount } = useSelection();
  const handleSelect = (item: InventoryItem) => setSelectedItem(item);
  const handleCloseDetail = () => setSelectedItem(null);
  const validLocations = locations.filter(loc => loc.lat !== null && loc.lng !== null);

  return (
    <div className="relative w-full h-full bg-gray-100 z-0">
      <MapContainer center={[-34.6037, -58.3816]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        {userLocation && <CircleMarker center={userLocation} radius={8} pathOptions={{ color: '#111827', weight: 3, fillColor: '#10b981', fillOpacity: 1 }}><Tooltip direction="top" offset={[0, -8]} opacity={1}>Tu ubicación</Tooltip></CircleMarker>}
        {validLocations.map((loc) => {
          const isItemReservado = getDisponibilidad(loc) === 'reservado';
          const isItemSelected = isSelected(loc.canonical_id);
          const isItemActive = selectedItem?.canonical_id === loc.canonical_id;

          return (
            <Marker
              key={loc.canonical_id}
              position={[loc.lat!, loc.lng!]}
              icon={getIcon(loc.tipo_soporte, {
                isActive: isItemActive,
                isReservado: isItemReservado,
                isSelected: isItemSelected,
              })}
              eventHandlers={{ click: () => handleSelect(loc) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -36]}
                opacity={1}
                className="font-sans shadow-xl rounded-xl border border-gray-200/90 bg-white/95 backdrop-blur-md p-0 overflow-hidden text-xs"
              >
                <div className="px-3 py-2 text-left min-w-[160px] max-w-[220px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-500">
                      {toInventoryPresentationItem(loc).tipo}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isItemReservado
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isItemReservado ? 'Reservado' : 'Disponible'}
                    </span>
                  </div>
                  <p className="font-bold text-gray-950 text-xs leading-snug line-clamp-2">
                    {loc.name}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 capitalize">
                    {loc.ciudad.replace('-', ' ')}
                  </p>
                  <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] font-semibold text-gray-700">
                    <span className="text-emerald-700">
                      {isItemSelected ? '✓ Seleccionado' : 'Ver detalles'}
                    </span>
                    <span className="text-gray-400">→</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
        {routes.map((route) => (
          <LayerGroup key={route.canonical_id}>
            <Polyline positions={route.routePath as [number, number][]} color="#E53935" weight={4} opacity={0.8} dashArray="10, 10" eventHandlers={{ click: () => handleSelect(route) }} />
            {route.waypoints?.map((wp, idx) => {
              if (wp.lat === null || wp.lng === null) return null;
              return <CircleMarker key={'wp-' + idx} center={[wp.lat, wp.lng]} radius={6} pathOptions={{ color: 'white', weight: 2, fillColor: '#E53935', fillOpacity: 1 }} eventHandlers={{ click: () => handleSelect(route) }}><Tooltip direction="top" offset={[0, -10]} opacity={1} className="font-semibold shadow-lg rounded-md text-sm border-0 bg-white px-2 py-1">{wp.name}</Tooltip></CircleMarker>;
            })}
          </LayerGroup>
        ))}
        <MapUpdater locations={locations} routes={routes} userLocation={userLocation} />
      </MapContainer>

      {selectedItem && (
        <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-4 md:left-auto md:right-4 md:w-[410px] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl md:shadow-xl z-[1000] border-t md:border border-gray-200/80 overflow-hidden max-h-[82vh] md:max-h-[88vh]">
          <div className="md:hidden pt-2.5 pb-1 flex justify-center shrink-0 bg-white">
            <div className="w-10 h-1 rounded-full bg-gray-300" aria-hidden="true" />
          </div>
          <div className="px-4 py-2.5 bg-white flex justify-between items-center border-b border-gray-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Soporte seleccionado</span>
            <button
              type="button"
              onClick={handleCloseDetail}
              className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Cerrar detalle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className={`overflow-y-auto ${selectedCount > 0 ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]' : 'pb-4'}`}>
            <SupportCard item={selectedItem} variant="map" />
          </div>
        </div>
      )}

      {validLocations.length === 0 && routes.length === 0 && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white/95 p-5 text-center shadow-xl backdrop-blur-md pointer-events-auto">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
              <SearchX className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{selectedPlaza === 'todos' || !selectedPlaza ? 'No encontramos soportes con estos criterios.' : `No encontramos soportes con estos criterios en ${selectedPlaza === 'mendoza' ? 'Mendoza' : 'Buenos Aires'}.`}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">Probá limpiando los filtros para volver a explorar el inventario.</p>
            {onResetFilters && (
              <button type="button" onClick={onResetFilters} className="mt-4 min-h-11 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2">Limpiar filtros</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
