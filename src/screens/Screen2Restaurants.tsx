import React, { useState } from 'react';
import { Search, ChevronRight, MapPin, RefreshCw, Bike, ShoppingBag, Filter } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { AppHeader } from '../components/AppHeader';
import { Restaurant } from '../data/restaurants';
import { BuildingMap, UserProfile, CategoryType } from '../types/map';
import { haptics } from '../utils/haptics';

interface Screen2RestaurantsProps {
  entranceId: string;
  buildingMap: BuildingMap;
  userProfile: UserProfile;
  onToggleProfile: (profile: UserProfile) => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onChangeEntrance: () => void;
}

export const Screen2Restaurants: React.FC<Screen2RestaurantsProps> = ({
  entranceId,
  buildingMap,
  userProfile,
  onToggleProfile,
  onSelectRestaurant,
  onChangeEntrance,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Encontra a entrada no buildingMap ou nas entradas estáticas
  const entranceNode = buildingMap.nodes.find(n => n.id === entranceId);
  const entranceName = entranceNode?.label || 'Entrada Principal';

  // Monta lista unificada de lojas a partir do buildingMap.units
  const allStores: Restaurant[] = buildingMap.units.map(u => ({
    id: u.id,
    name: u.name,
    logo: u.logo || '🛍️',
    bgColor: u.bgColor || u.color || '#1e293b',
    logoColor: u.logoColor || '#ffffff',
    location: u.sector || 'Piso 1',
    floor: buildingMap.floors.find(f => f.id === u.floorId)?.name || 'Piso Térreo',
    sector: u.sector || 'Geral',
    distance: u.distance || 180,
    storeNumber: u.code || 'Loja',
    pickupInstructions: [
      u.courierPickup?.notes || 'Retirada no balcão de delivery com código do app',
      'Identificar-se como entregador',
      'Em caso de dúvida, fale com a equipe da loja'
    ],
    courierInfo: u.courierPickup?.notes || 'Balcão de atendimento',
    totalRoutes: 95,
    routeSteps: []
  }));

  const categories = [
    { id: 'all', label: 'Todas as Lojas' },
    { id: 'food', label: '🍔 Alimentação' },
    { id: 'apparel', label: '👗 Moda' },
    { id: 'entertainment', label: '🎬 Lazer / Cinema' },
    { id: 'service', label: '🛠️ Serviços' },
  ];

  const filtered = allStores.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.floor.toLowerCase().includes(search.toLowerCase()) ||
      r.storeNumber.toLowerCase().includes(search.toLowerCase());

    const unit = buildingMap.units.find(u => u.id === r.id);
    const matchesCat = selectedCategory === 'all' || unit?.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const LogoBadge = ({ r }: { r: Restaurant }) => (
    <div
      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 shadow-xs"
      style={{ backgroundColor: r.bgColor, color: r.logoColor }}
    >
      {r.logo}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <AppHeader showLang mallName={buildingMap.name} />

      {/* Seletor de Perfil: Entregador vs Cliente */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold">
          <button
            onClick={() => {
              haptics.light();
              onToggleProfile('courier');
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              userProfile === 'courier'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Bike size={14} />
            <span>Modo Entregador</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              onToggleProfile('customer');
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              userProfile === 'customer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Modo Cliente / Visita</span>
          </button>
        </div>
      </div>

      {/* Banner "Você está na entrada..." */}
      <div className="mx-4 mt-2 mb-1">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <MapPin size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                Posição QR Code Calibrada
              </p>
              <p className="text-gray-900 font-black text-sm leading-tight truncate">{entranceName}</p>
              <p className="text-emerald-700 text-[11px] font-medium truncate">{buildingMap.name}</p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.light();
              onChangeEntrance();
            }}
            className="flex items-center gap-1 text-emerald-700 text-xs font-bold hover:text-emerald-900 transition-colors shrink-0 ml-2 cursor-pointer"
          >
            <RefreshCw size={12} />
            Trocar
          </button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={userProfile === 'courier' ? "Buscar restaurante para retirada..." : "Buscar lojas, marcas, cinemas..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Chips de Categoria */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              haptics.light();
              setSelectedCategory(cat.id);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Título da Seção */}
      <div className="px-4 pb-1 pt-1 flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          {userProfile === 'courier' ? 'Pontos de Coleta Próximos' : 'Lojas & Restaurantes'}
        </p>
        <span className="text-[11px] font-semibold text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>

      {/* Lista de Lojas */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filtered.map((restaurant) => {
          const unit = buildingMap.units.find(u => u.id === restaurant.id);
          return (
            <button
              key={restaurant.id}
              onClick={() => {
                haptics.light();
                onSelectRestaurant(restaurant);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
            >
              <LogoBadge r={restaurant} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-gray-900 text-sm truncate">{restaurant.name}</p>
                  {restaurant.storeNumber && (
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                      {restaurant.storeNumber}
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-xs mt-0.5 truncate">
                  {restaurant.location} • {restaurant.floor}
                </p>

                {userProfile === 'courier' && unit?.courierPickup?.notes && (
                  <p className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                    🛵 {unit.courierPickup.notes}
                  </p>
                )}
                {userProfile === 'customer' && unit?.description && (
                  <p className="text-[10px] text-blue-600 font-medium truncate mt-0.5">
                    ℹ️ {unit.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-emerald-700 text-xs font-bold">{restaurant.distance}m</span>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
