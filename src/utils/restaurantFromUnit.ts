import type { BuildingMap, StoreUnit } from '../types/map';
import type { Restaurant } from '../types/restaurant';

export function unitToRestaurant(map: BuildingMap, u: StoreUnit, distanceMeters = 0): Restaurant {
  const notes = u.courierPickup?.notes;
  return {
    id: u.id,
    name: u.name,
    logo: u.logo || '🛍️',
    bgColor: u.bgColor || u.color || '#1e293b',
    logoColor: u.logoColor || '#ffffff',
    location: u.sector || 'Piso Principal',
    floor: map.floors.find((f) => f.id === u.floorId)?.name || '',
    sector: u.sector || 'Geral',
    distance: distanceMeters,
    storeNumber: u.code || 'Loja',
    pickupInstructions: [notes || 'Balcão de retirada com identificação', 'Apresente o código do pedido ao atendente'],
    courierInfo: notes || 'Balcão de atendimento',
    totalRoutes: 0,
    routeSteps: [],
  };
}
