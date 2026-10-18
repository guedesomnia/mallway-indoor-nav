import React from 'react';
import { CheckCircle, Bike, DoorOpen, Truck, ChevronRight } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { AppHeader } from '../components/AppHeader';
import { Restaurant } from '../data/restaurants';
import { haptics } from '../utils/haptics';

interface Screen6ArrivedProps {
  restaurant: Restaurant;
  onPickedUp: () => void;
  onNewDelivery: () => void;
}

const ExitOption = ({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left shadow-sm"
  >
    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      <p className="text-gray-400 text-xs">{subtitle}</p>
    </div>
    <ChevronRight size={16} className="text-gray-300" />
  </button>
);

// Restaurant banner for arrival
const ArrivalBanner = ({ restaurant }: { restaurant: Restaurant }) => {
  const gradients: Record<string, string> = {
    outback: 'linear-gradient(135deg, #4a0e0e, #8b1a1a)',
    mcdonalds: 'linear-gradient(135deg, #c0392b, #da291c)',
    madero: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
    spoleto: 'linear-gradient(135deg, #006833, #009951)',
    'rei-do-mate': 'linear-gradient(135deg, #1a3a2a, #2d6a4f)',
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex items-center justify-center mb-4"
      style={{
        height: 140,
        background: gradients[restaurant.id] || gradients.outback,
      }}
    >
      <div className="text-center">
        <div className="text-4xl mb-2">{restaurant.logo}</div>
        <p className="text-white font-bold text-sm">{restaurant.name}</p>
        <p className="text-white/60 text-xs">{restaurant.storeNumber}</p>
      </div>
    </div>
  );
};

export const Screen6Arrived: React.FC<Screen6ArrivedProps> = ({
  restaurant,
  onPickedUp,
  onNewDelivery,
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white">
        <StatusBar />
        <AppHeader />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Success state */}
        <div className="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm">
          {/* Success icon */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div className="absolute inset-0 w-16 h-16 bg-green-200 rounded-full animate-ping opacity-30" />
            </div>
          </div>
          <h2 className="font-black text-gray-900 text-xl mb-1">
            Você chegou ao {restaurant.name}
          </h2>
          <p className="text-gray-500 text-sm">
            {restaurant.storeNumber} • {restaurant.floor} • {restaurant.sector}
          </p>
        </div>

        {/* Restaurant photo/banner */}
        <ArrivalBanner restaurant={restaurant} />

        {/* Pickup button */}
        <button 
          onClick={() => {
            haptics.success();
            onPickedUp();
          }} 
          className="btn-primary text-lg py-5 cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-transform"
        >
          ✅ Peguei o pedido
        </button>

        {/* Return options */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Para onde você quer voltar?
          </p>
          <div className="space-y-2">
            <ExitOption
              icon={<Bike size={18} className="text-gray-600" />}
              title="Estacionamento de motos (Rua da Feira)"
              subtitle="Retorno rápido para saída de delivery"
              onClick={() => {
                haptics.light();
                onNewDelivery();
              }}
            />
            <ExitOption
              icon={<DoorOpen size={18} className="text-gray-600" />}
              title="Entrada Rua dos Açudes"
              subtitle="Saída oeste lateral"
              onClick={onNewDelivery}
            />
            <ExitOption
              icon={<Truck size={18} className="text-gray-600" />}
              title="Estacionamento Superior / Ponto E"
              subtitle="Saída norte para veículos e carga"
              onClick={onNewDelivery}
            />
            <ExitOption
              icon={<DoorOpen size={18} className="text-gray-600" />}
              title="Entrada Rua Fonseca"
              subtitle="Saída leste (Theatro Bangu / Kalunga)"
              onClick={onNewDelivery}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
