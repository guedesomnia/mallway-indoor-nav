import React from 'react';
import { MapPin, Clock, CheckCircle, Navigation, Bike, User, Sparkles, AlertCircle, Store } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Restaurant } from '../data/restaurants';
import { UserProfile } from '../types/map';

interface Screen3DetailProps {
  restaurant: Restaurant;
  mallName?: string;
  userProfile?: UserProfile;
  onBack: () => void;
  onStartRoute: () => void;
}

// Banner photo placeholder por categoria
const RestaurantBanner = ({ restaurant, mallName }: { restaurant: Restaurant; mallName?: string }) => {
  const gradients: Record<string, string> = {
    'outback-bangu': 'linear-gradient(135deg, #4a0e0e 0%, #8b1a1a 50%, #c0392b 100%)',
    'outback': 'linear-gradient(135deg, #4a0e0e 0%, #8b1a1a 50%, #c0392b 100%)',
    'bardoadao-bangu': 'linear-gradient(135deg, #1c1917 0%, #78350f 50%, #d97706 100%)',
    'cinesystem-bangu': 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #4338ca 100%)',
    'gigantenordestino-bangu': 'linear-gradient(135deg, #713f12 0%, #ca8a04 50%, #eab308 100%)',
    'renner-bangu': 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #ef4444 100%)',
    'cea-bangu': 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
    'riachuelo-bangu': 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #475569 100%)',
    'drogaria-raia-bangu': 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)',
    'mcdonalds': 'linear-gradient(135deg, #c0392b 0%, #da291c 50%, #e74c3c 100%)',
    'madero': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3a3a3a 100%)',
    'spoleto': 'linear-gradient(135deg, #006833 0%, #009951 50%, #00c06b 100%)',
    'rei-do-mate': 'linear-gradient(135deg, #1a3a2a 0%, #2d6a4f 50%, #40916c 100%)',
  };

  const gradient = gradients[restaurant.id] || `linear-gradient(135deg, ${restaurant.bgColor || '#1e293b'} 0%, #0f172a 100%)`;

  return (
    <div className="relative overflow-hidden" style={{ height: 210 }}>
      <div className="absolute inset-0" style={{ background: gradient }} />
      {/* Elementos decorativos */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-6 left-6 w-32 h-32 rounded-full bg-white/20 blur-xl" />
        <div className="absolute bottom-4 right-4 w-28 h-28 rounded-full bg-white/10 blur-lg" />
      </div>

      {/* Identificação do Shopping */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
        <Store size={12} className="text-emerald-400" />
        <span className="text-white text-xs font-bold drop-shadow">
          {mallName || 'Shopping Oficial'}
        </span>
      </div>

      {/* Logo e Nome do Restaurante / Loja */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center pt-2">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-2xl mb-2 mx-auto transition-transform hover:scale-105"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.18)', 
              border: '2px solid rgba(255,255,255,0.35)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <span>{restaurant.logo}</span>
          </div>
          <p className="text-white font-black text-xl tracking-tight drop-shadow-md">
            {restaurant.name}
          </p>
        </div>
      </div>
    </div>
  );
};

export const Screen3Detail: React.FC<Screen3DetailProps> = ({
  restaurant,
  mallName = 'Bangu Shopping',
  userProfile = 'courier',
  onBack,
  onStartRoute,
}) => {
  const isCourier = userProfile === 'courier';

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      
      <div className="relative">
        <RestaurantBanner restaurant={restaurant} mallName={mallName} />
        {/* Botão Voltar */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white text-lg font-bold border border-white/20 shadow-md transition-colors z-20"
        >
          ‹
        </button>
      </div>

      {/* Faixa de Perfil Ativo */}
      <div className={`px-4 py-2 flex items-center justify-between text-xs font-bold ${
        isCourier ? 'bg-amber-50 text-amber-900 border-b border-amber-200/60' : 'bg-emerald-50 text-emerald-900 border-b border-emerald-200/60'
      }`}>
        <div className="flex items-center gap-1.5">
          {isCourier ? <Bike size={14} className="text-amber-600" /> : <User size={14} className="text-emerald-600" />}
          <span>{isCourier ? 'Modo Entregador • Balcão de Retirada' : 'Modo Cliente • Navegação no Mall'}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border border-current font-extrabold uppercase tracking-wide">
          {isCourier ? 'Delivery' : 'Público'}
        </span>
      </div>

      {/* Cabeçalho da Unidade */}
      <div className="px-5 pt-3.5 pb-3 border-b border-gray-100">
        <h2 className="text-gray-900 font-black text-xl tracking-tight">{restaurant.name}</h2>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin size={13} className="text-emerald-600 shrink-0" />
          <p className="text-gray-600 text-xs font-medium">
            {restaurant.storeNumber} • {restaurant.floor} • {restaurant.sector}
          </p>
        </div>
      </div>

      {/* Grid de Métricas de Trajeto */}
      <div className="grid grid-cols-2 gap-0 border-b border-gray-100 bg-slate-50/50">
        <div className="flex flex-col items-center py-3.5 border-r border-gray-100">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
            <Navigation size={15} />
            <span className="text-lg font-black text-gray-900">{restaurant.distance}m</span>
          </div>
          <span className="text-[11px] text-gray-400 font-semibold">Distância interna</span>
        </div>
        <div className="flex flex-col items-center py-3.5">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
            <Clock size={15} />
            <span className="text-lg font-black text-gray-900">
              {Math.ceil(restaurant.distance / 75)} min
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-semibold">Caminhada a pé</span>
        </div>
      </div>

      {/* Informações Adaptadas por Perfil */}
      <div className="px-5 py-4 flex-1 overflow-y-auto">
        {isCourier ? (
          // Conteúdo do Modo Entregador
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Bike size={14} className="text-amber-600" />
                Instruções de Retirada (Motoboy)
              </h3>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Atenção:</strong> Apresente o código da comanda no balcão de delivery ao chegar.
              </div>
            </div>

            <div className="space-y-2">
              {restaurant.pickupInstructions.map((instruction, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle size={12} className="text-emerald-700" />
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed font-medium">{instruction}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Conteúdo do Modo Cliente
          <div className="space-y-3.5">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              Sobre a Loja & Atendimento
            </h3>

            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-xs text-emerald-900 leading-relaxed font-medium">
              Ambiente climatizado, atendimento ao público e facilidade de acesso pelos corredores principais do {mallName}.
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <Clock size={14} className="text-gray-500 shrink-0" />
                <span><strong>Horário:</strong> Seg a Sáb 10h às 22h | Dom 12h às 21h</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <MapPin size={14} className="text-gray-500 shrink-0" />
                <span><strong>Localização:</strong> {restaurant.location} ({restaurant.floor})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA de Iniciar Rota */}
      <div className="p-4 pb-6 bg-white border-t border-gray-100 shadow-lg">
        <button 
          onClick={onStartRoute} 
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
        >
          <Navigation size={18} className="animate-bounce" />
          <span>{isCourier ? 'Iniciar Rota do Entregador (Waze)' : 'Navegar até a Loja'}</span>
        </button>
      </div>
    </div>
  );
};
