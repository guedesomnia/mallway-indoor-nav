import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Smartphone, 
  ShieldCheck, 
  Layers, 
  ChevronDown, 
  QrCode, 
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Wifi,
  X,
  Copy,
  Check,
  Maximize2
} from 'lucide-react';
import { Screen1QR } from './screens/Screen1QR';
import { Screen2Restaurants } from './screens/Screen2Restaurants';
import { Screen3Detail } from './screens/Screen3Detail';
import { Screen4Map } from './screens/Screen4Map';
import { Screen5Steps } from './screens/Screen5Steps';
import { Screen6Arrived } from './screens/Screen6Arrived';
import { AdminPanel } from './components/AdminPanel';
import { MasterTeamDashboard } from './components/MasterTeamDashboard';
import { Restaurant, RESTAURANTS } from './data/restaurants';
import { BANGU_SHOPPING_MAP } from './data/banguMap';
import { BARRA_SHOPPING_MAP } from './data/barraMap';
import { NORTE_SHOPPING_MAP } from './data/norteMap';
import { BuildingMap, UserProfile } from './types/map';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { haptics } from './utils/haptics';

export type AppSystemMode = 'master' | 'mall_admin' | 'client_app';

type AppScreen =
  | 'qr'
  | 'restaurants'
  | 'detail'
  | 'map'
  | 'steps'
  | 'arrived';

const StepDots = ({ current, total, labels }: { current: number; total: number; labels: string[] }) => (
  <div className="flex gap-2 items-center justify-center flex-wrap">
    {labels.map((label, idx) => (
      <div
        key={idx}
        className="flex items-center gap-1 text-xs font-semibold transition-all"
        style={{ color: idx === current ? '#059669' : '#9ca3af' }}
      >
        <div
          className="rounded-full transition-all"
          style={{
            width: idx === current ? 24 : 8,
            height: 8,
            backgroundColor: idx === current ? '#059669' : '#e5e7eb',
          }}
        />
        {idx === current && <span>{label}</span>}
      </div>
    ))}
  </div>
);

export function App() {
  // 1. MODO GERAL DO SISTEMA: Master (Equipe) vs Admin do Shopping vs App do Usuário
  const [systemMode, setSystemMode] = useState<AppSystemMode>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlMode = params?.get('mode');
    if (urlMode === 'master' || urlMode === 'mall_admin' || urlMode === 'client_app') {
      return urlMode;
    }
    // Se for dispositivo móvel (< 768px) ou vier com parâmetros de app/qr, abre direto no App do Cliente!
    if (typeof window !== 'undefined' && (window.innerWidth < 768 || params?.get('app') || params?.get('qr') || params?.get('entrance') || params?.get('mall'))) {
      return 'client_app';
    }
    const saved = localStorage.getItem('active_system_mode_v4');
    return (saved as AppSystemMode) || 'master';
  });

  useEffect(() => {
    localStorage.setItem('active_system_mode_v4', systemMode);
  }, [systemMode]);

  // 2. CATÁLOGO GLOBAL DE SHOPPINGS (Persistido no LocalStorage)
  const [shoppings, setShoppings] = useState<BuildingMap[]>(() => {
    const saved = localStorage.getItem('indoor_all_shoppings_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [BANGU_SHOPPING_MAP, BARRA_SHOPPING_MAP, NORTE_SHOPPING_MAP];
  });

  useEffect(() => {
    localStorage.setItem('indoor_all_shoppings_v4', JSON.stringify(shoppings));
  }, [shoppings]);

  // 3. SHOPPING ATIVO SELECIONADO
  const [activeShoppingId, setActiveShoppingId] = useState<string>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlMall = params?.get('mall');
    if (urlMall) return urlMall;
    const saved = localStorage.getItem('active_shopping_id_v4');
    return saved || 'bangu-shopping-oficial';
  });

  useEffect(() => {
    localStorage.setItem('active_shopping_id_v4', activeShoppingId);
  }, [activeShoppingId]);

  const activeShopping = useMemo(() => {
    return shoppings.find(s => s.id === activeShoppingId) || shoppings[0] || BANGU_SHOPPING_MAP;
  }, [shoppings, activeShoppingId]);

  // 4. FLUXO DO CLIENTE / ENTREGADOR (Telas Mobile 1 a 6)
  const [screen, setScreen] = useState<AppScreen>('qr');
  const [userProfile, setUserProfile] = useState<UserProfile>('courier');
  
  // 5. MOCKUP DE DISPOSITIVO PARA TESTES (iPhone vs Galaxy vs Responsivo)
  const [deviceMockup, setDeviceMockup] = useState<'iphone' | 'android' | 'responsive'>('iphone');
  const [isMobileQrModalOpen, setIsMobileQrModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const mobileLanUrl = 'http://192.168.0.52:5174';
  
  // Entrada ativa (primeira do shopping ou padrão)
  const [entranceId, setEntranceId] = useState<string>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlEntrance = params?.get('entrance');
    if (urlEntrance) return urlEntrance;
    const firstEnt = activeShopping.nodes.find(n => n.type === 'entrance');
    return firstEnt?.id || 'node-ent-feira';
  });

  // Atualizar entrada quando trocar de shopping
  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlEntrance = params?.get('entrance');
    if (urlEntrance && activeShopping.nodes.some(n => n.id === urlEntrance)) {
      setEntranceId(urlEntrance);
      return;
    }
    const firstEnt = activeShopping.nodes.find(n => n.type === 'entrance');
    if (firstEnt) {
      setEntranceId(firstEnt.id);
    }
  }, [activeShoppingId, activeShopping]);

  // Restaurante / Loja Selecionada
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(() => {
    const firstUnit = activeShopping.units[0];
    if (firstUnit) {
      return {
        id: firstUnit.id,
        name: firstUnit.name,
        logo: firstUnit.logo || '🛍️',
        bgColor: firstUnit.bgColor || firstUnit.color || '#1e293b',
        logoColor: firstUnit.logoColor || '#ffffff',
        location: firstUnit.sector || 'Piso Principal',
        floor: activeShopping.floors.find(f => f.id === firstUnit.floorId)?.name || 'Térreo',
        sector: firstUnit.sector || 'Geral',
        distance: firstUnit.distance || 140,
        storeNumber: firstUnit.code || 'Loja',
        pickupInstructions: [
          firstUnit.courierPickup?.notes || 'Balcão de retirada com identificação',
          'Apresente o código do pedido ao atendente'
        ],
        courierInfo: firstUnit.courierPickup?.notes || 'Balcão de atendimento',
        totalRoutes: 84,
        routeSteps: []
      };
    }
    return RESTAURANTS[0];
  });

  const screenFlow: AppScreen[] = ['qr', 'restaurants', 'detail', 'map', 'steps', 'arrived'];
  const screenLabels = ['QR Code', 'Lojas / Food', 'Detalhes', 'Waze Indoor', 'Passo a Passo', 'Chegada'];
  const currentIdx = screenFlow.indexOf(screen);
  const goTo = (s: AppScreen) => {
    haptics.light();
    setScreen(s);
  };

  // Deep linking automático ao ler QR Codes reais com parâmetros de loja ou entrada
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const storeParam = params.get('store');
    const entranceParam = params.get('entrance');

    if (storeParam) {
      const foundStore = activeShopping.units.find(u => 
        u.id.toLowerCase() === storeParam.toLowerCase() ||
        u.name.toLowerCase().includes(storeParam.toLowerCase())
      );
      if (foundStore) {
        setSelectedRestaurant({
          id: foundStore.id,
          name: foundStore.name,
          logo: foundStore.logo || '🛍️',
          bgColor: foundStore.bgColor || foundStore.color || '#1e293b',
          logoColor: foundStore.logoColor || '#ffffff',
          location: foundStore.sector || 'Piso Principal',
          floor: activeShopping.floors.find(f => f.id === foundStore.floorId)?.name || 'Térreo',
          sector: foundStore.sector || 'Geral',
          distance: foundStore.distance || 140,
          storeNumber: foundStore.code || 'Loja',
          pickupInstructions: [
            foundStore.courierPickup?.notes || 'Balcão de retirada com identificação',
            'Apresente o código do pedido ao atendente'
          ],
          courierInfo: foundStore.courierPickup?.notes || 'Balcão de atendimento',
          totalRoutes: 84,
          routeSteps: []
        });
        setScreen('detail');
      }
    } else if (entranceParam) {
      setScreen('restaurants');
    }
  }, [activeShopping]);

  // Manipuladores de Atualização de Shopping pelo Admin
  const handleUpdateCurrentShopping = (updatedMap: BuildingMap) => {
    setShoppings(prev => prev.map(s => s.id === updatedMap.id ? updatedMap : s));
  };

  const handleResetCurrentShopping = () => {
    if (confirm(`Deseja restaurar as configurações originais do ${activeShopping.name}?`)) {
      let defaultMap = BANGU_SHOPPING_MAP;
      if (activeShopping.id === BARRA_SHOPPING_MAP.id) defaultMap = BARRA_SHOPPING_MAP;
      if (activeShopping.id === NORTE_SHOPPING_MAP.id) defaultMap = NORTE_SHOPPING_MAP;
      handleUpdateCurrentShopping(defaultMap);
    }
  };

  const handleCreateNewShopping = (newShop: BuildingMap) => {
    setShoppings(prev => [newShop, ...prev]);
    setActiveShoppingId(newShop.id);
    setSystemMode('mall_admin');
  };

  const handleDeleteShopping = (shopId: string) => {
    if (shoppings.length <= 1) {
      alert('Não é possível excluir o único shopping do sistema.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este shopping do catálogo?')) {
      const remaining = shoppings.filter(s => s.id !== shopId);
      setShoppings(remaining);
      if (activeShoppingId === shopId) {
        setActiveShoppingId(remaining[0].id);
      }
    }
  };

  const handleResetAllShoppings = () => {
    if (confirm('Deseja resetar todo o catálogo para os shoppings padrão oficiais (Bangu, Barra e NorteShopping)?')) {
      setShoppings([BANGU_SHOPPING_MAP, BARRA_SHOPPING_MAP, NORTE_SHOPPING_MAP]);
      setActiveShoppingId('bangu-shopping-oficial');
      localStorage.removeItem('indoor_all_shoppings_v4');
    }
  };

  // ==========================================
  // RENDERIZAÇÃO: MODO 1 - DASHBOARD GERAL MASTER (EQUIPE)
  // ==========================================
  if (systemMode === 'master') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Barra Superior Global da Plataforma */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm tracking-tight">MallWay Pro</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-slate-400 text-xs">Console da Equipe Gestora da Rede</p>
            </div>
          </div>

          {/* Seletor de Modo do Sistema */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSystemMode('master')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-600 text-white shadow-sm flex items-center gap-1.5"
            >
              <ShieldCheck size={14} />
              <span>Dashboard Geral (Equipe)</span>
            </button>
            <button
              onClick={() => setSystemMode('mall_admin')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white hover:bg-slate-900 flex items-center gap-1.5"
            >
              <Building2 size={14} />
              <span>Painel do Shopping: {activeShopping.name.split(' ')[0]}</span>
            </button>
            <button
              onClick={() => {
                setSystemMode('client_app');
                setScreen('qr');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white hover:bg-slate-900 flex items-center gap-1.5"
            >
              <Smartphone size={14} />
              <span>App do Usuário (QR Code)</span>
            </button>
          </div>
        </header>

        {/* Componente Master Principal */}
        <main className="flex-1">
          <MasterTeamDashboard
            shoppings={shoppings}
            onSelectShoppingForAdmin={(id) => {
              setActiveShoppingId(id);
              setSystemMode('mall_admin');
            }}
            onSelectShoppingForApp={(id) => {
              setActiveShoppingId(id);
              setSystemMode('client_app');
              setScreen('qr');
            }}
            onCreateShopping={handleCreateNewShopping}
            onDeleteShopping={handleDeleteShopping}
            onResetAllShoppings={handleResetAllShoppings}
          />
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: MODO 2 - PAINEL DO SHOPPING ESPECÍFICO (ADMIN DO MALL)
  // ==========================================
  if (systemMode === 'mall_admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Barra Superior para navegar de volta ao Master ou testar App */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSystemMode('master')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Voltar ao Dashboard da Equipe</span>
            </button>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Shopping em Edição:</span>
              <select
                value={activeShoppingId}
                onChange={(e) => setActiveShoppingId(e.target.value)}
                className="bg-slate-900 text-white font-bold text-xs rounded-lg px-2.5 py-1 border border-slate-700 outline-none focus:border-emerald-500"
              >
                {shoppings.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSystemMode('client_app');
                setScreen('qr');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <Smartphone size={14} />
              <span>Abrir App do Cliente / QR</span>
            </button>
          </div>
        </div>

        {/* Painel do Administrador Local do Shopping */}
        <div className="flex-1">
          <AdminPanel
            buildingMap={activeShopping}
            onUpdateMap={handleUpdateCurrentShopping}
            onResetMap={handleResetCurrentShopping}
            onBackToMaster={() => setSystemMode('master')}
            onOpenClientApp={() => {
              setSystemMode('client_app');
              setScreen('qr');
            }}
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: MODO 3 - APLICATIVO DO CLIENTE / ENTREGADOR (QR CODE MOBILE)
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-slate-100 via-emerald-50/30 to-slate-100">
      {/* Top bar de Navegação do Sistema (Desktop) */}
      <div className="hidden md:flex w-full bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-3 items-center justify-between sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black">
              {activeShopping.logoBadge || activeShopping.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-black text-gray-900 text-sm leading-none">
                {activeShopping.name}
              </p>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {activeShopping.city || 'Rio de Janeiro'}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              Simulador do Aplicativo Acionado por QR Code Físico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor Rápido de Shopping */}
          <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
            {shoppings.map(shop => (
              <button
                key={shop.id}
                onClick={() => {
                  setActiveShoppingId(shop.id);
                  goTo('qr');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeShoppingId === shop.id
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Building2 size={13} />
                {shop.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {currentIdx >= 0 && currentIdx < screenLabels.length && (
            <div className="hidden lg:block">
              <StepDots
                current={currentIdx}
                total={screenLabels.length}
                labels={screenLabels}
              />
            </div>
          )}

          {/* Botão para Testar no Celular Físico via Wi-Fi */}
          <button
            onClick={() => setIsMobileQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            title="Abrir no seu iPhone ou Android real via Wi-Fi"
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Testar no Celular</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          </button>

          {/* Botão para Gerência / Admin */}
          <button
            onClick={() => setSystemMode('mall_admin')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Gerenciar Shopping</span>
          </button>

          {/* Botão para Dashboard Master */}
          <button
            onClick={() => setSystemMode('master')}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
          >
            <Layers size={14} />
            <span>Console Master</span>
          </button>
        </div>
      </div>

      {/* Barra Compacta para Celulares Reais (iPhone / Android) */}
      <div className="md:hidden w-full bg-slate-950/95 backdrop-blur-md px-3.5 py-2 flex items-center justify-between border-b border-slate-800 text-white z-40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-black text-xs text-white">{activeShopping.name.split(' ')[0]}</span>
          <span className="text-[10px] text-slate-400 font-medium">Wayfinding</span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={activeShoppingId}
            onChange={(e) => {
              setActiveShoppingId(e.target.value);
              goTo('qr');
            }}
            className="bg-slate-900 text-slate-200 font-bold text-[10px] rounded-lg px-2 py-1 border border-slate-700 outline-none"
          >
            {shoppings.map(s => (
              <option key={s.id} value={s.id}>{s.name.split(' ')[0]}</option>
            ))}
          </select>
          <button
            onClick={() => setSystemMode('mall_admin')}
            className="p-1.5 bg-slate-800 text-emerald-400 rounded-lg text-xs"
            title="Painel Admin"
          >
            <ShieldCheck size={14} />
          </button>
        </div>
      </div>

      {/* Frame Mobile + Painel Lateral de Controle */}
      <div className="flex-1 w-full flex items-start justify-center p-0 md:px-4 md:py-8">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full max-w-6xl">
          {/* Menu de Etapas do Usuário (Esquerda) */}
          <div className="hidden lg:flex flex-col gap-1 w-44 sticky top-24 mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Fluxo do App Mobile
            </p>
            {screenLabels.map((label, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (idx === 0) goTo('qr');
                  else if (idx === 1) goTo('restaurants');
                  else if (idx === 2 && selectedRestaurant) goTo('detail');
                  else if (idx === 3 && selectedRestaurant) goTo('map');
                  else if (idx === 4 && selectedRestaurant) goTo('steps');
                  else if (idx === 5 && selectedRestaurant) goTo('arrived');
                }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                  idx === currentIdx
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                    : idx < currentIdx
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    backgroundColor:
                      idx === currentIdx ? 'rgba(255,255,255,0.25)' : idx < currentIdx ? '#d1fae5' : '#f3f4f6',
                    color:
                      idx === currentIdx ? 'white' : idx < currentIdx ? '#059669' : '#9ca3af',
                  }}
                >
                  {idx < currentIdx ? '✓' : idx + 1}
                </div>
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>

          {/* Coluna Central com Seletor de Mockup e Moldura */}
          <div className="flex-1 flex flex-col items-center w-full">
            {/* Seletor de Dispositivo no Desktop */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-800 shadow-md mb-3 text-xs font-bold text-slate-300">
              <button
                onClick={() => setDeviceMockup('iphone')}
                className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  deviceMockup === 'iphone' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-white'
                }`}
              >
                <span> iPhone 16 Pro</span>
              </button>
              <button
                onClick={() => setDeviceMockup('android')}
                className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  deviceMockup === 'android' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-white'
                }`}
              >
                <span>🤖 Galaxy S24</span>
              </button>
              <button
                onClick={() => setDeviceMockup('responsive')}
                className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  deviceMockup === 'responsive' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-white'
                }`}
              >
                <Maximize2 size={12} />
                <span>Panorâmico</span>
              </button>
            </div>

            {/* Moldura do Celular com Adaptação iPhone vs Android vs Tela Cheia */}
            <div 
              className={`phone-frame mx-auto ${deviceMockup === 'responsive' ? 'w-full max-w-2xl' : ''}`} 
              style={{ 
                width: deviceMockup === 'iphone' ? 390 : deviceMockup === 'android' ? 384 : '100%',
                minHeight: deviceMockup === 'responsive' ? 760 : 812 
              }}
            >
              <div 
                className="phone-screen bg-white" 
                style={{ 
                  minHeight: deviceMockup === 'responsive' ? 750 : 786,
                  borderRadius: deviceMockup === 'responsive' ? 24 : 44
                }}
              >
                {/* Dynamic Island no iPhone ou Punch-Hole no Android */}
                {deviceMockup === 'iphone' ? (
                  <div className="flex justify-center pt-2.5 pb-0.5 simulated-notch">
                    <div className="dynamic-island flex items-center justify-between px-3 shadow-md">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                ) : deviceMockup === 'android' ? (
                  <div className="flex justify-center pt-2 pb-1 simulated-notch">
                    <div className="android-punch-hole" />
                  </div>
                ) : null}

                {/* Telas do App com altura responsiva */}
                <div className="phone-content-area" style={{ overflowY: screen === 'map' ? 'hidden' : 'auto' }}>
                  {screen === 'qr' && (
                    <Screen1QR
                      buildingMap={activeShopping}
                      selectedEntrance={entranceId}
                      onScanned={(id) => {
                        setEntranceId(id);
                        goTo('restaurants');
                      }}
                    />
                  )}

                {screen === 'restaurants' && (
                  <Screen2Restaurants
                    entranceId={entranceId}
                    buildingMap={activeShopping}
                    userProfile={userProfile}
                    onToggleProfile={setUserProfile}
                    onSelectRestaurant={(r) => {
                      setSelectedRestaurant(r);
                      goTo('detail');
                    }}
                    onChangeEntrance={() => goTo('qr')}
                  />
                )}

                {screen === 'detail' && selectedRestaurant && (
                  <Screen3Detail
                    restaurant={selectedRestaurant}
                    mallName={activeShopping.name}
                    userProfile={userProfile}
                    onBack={() => goTo('restaurants')}
                    onStartRoute={() => goTo('map')}
                  />
                )}

                {screen === 'map' && selectedRestaurant && (
                  <Screen4Map
                    restaurant={selectedRestaurant}
                    buildingMap={activeShopping}
                    entranceId={entranceId}
                    userProfile={userProfile}
                    onBack={() => goTo('detail')}
                    onNextStep={() => goTo('steps')}
                  />
                )}

                {screen === 'steps' && selectedRestaurant && (
                  <Screen5Steps
                    restaurant={selectedRestaurant}
                    buildingMap={activeShopping}
                    entranceId={entranceId}
                    onBack={() => goTo('map')}
                    onArrived={() => goTo('arrived')}
                  />
                )}

                {screen === 'arrived' && selectedRestaurant && (
                  <Screen6Arrived
                    restaurant={selectedRestaurant}
                    onPickedUp={() => {
                      goTo('qr');
                    }}
                    onNewDelivery={() => {
                      goTo('qr');
                    }}
                  />
                )}
                </div>
              </div>
            </div>
          </div>

          {/* Painel Informativo Lateral (Direita) */}
          <div className="hidden lg:block w-56 sticky top-24 mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Etapa do Usuário
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                  {currentIdx + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{screenLabels[currentIdx]}</p>
                  <p className="text-gray-400 text-xs">
                    Passo {currentIdx + 1} de {screenLabels.length}
                  </p>
                </div>
              </div>
            </div>

            {selectedRestaurant && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Destino Atual
                </p>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-black shrink-0"
                    style={{ backgroundColor: selectedRestaurant.bgColor, color: selectedRestaurant.logoColor }}
                  >
                    {selectedRestaurant.logo}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-xs">{selectedRestaurant.name}</p>
                    <p className="text-gray-400 text-[11px]">{selectedRestaurant.storeNumber}</p>
                    <p className="text-emerald-600 text-xs font-bold">{selectedRestaurant.distance}m</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1 text-gray-700 font-semibold mb-1">
                    <MapPin size={12} className="text-emerald-600" />
                    <span>{activeShopping.name}</span>
                  </div>
                  <p>{selectedRestaurant.sector}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: TESTAR NO CELULAR REAL (IPHONE / ANDROID VIA WI-FI LOCAL) */}
      {/* ========================================================================= */}
      {isMobileQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-white animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Smartphone size={20} />
                </span>
                <div>
                  <h3 className="font-black text-sm text-white">Testar no Celular Físico</h3>
                  <p className="text-[11px] text-slate-400">Abra direto no seu iPhone ou Android na mesma rede Wi-Fi</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileQrModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Code de Alta Nitidez para o IP Local */}
            <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <div className="w-44 h-44 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <rect width="100" height="100" fill="white" />
                  <rect x="5" y="5" width="26" height="26" fill="black" rx="2" />
                  <rect x="9" y="9" width="18" height="18" fill="white" rx="1" />
                  <rect x="13" y="13" width="10" height="10" fill="black" rx="1" />
                  <rect x="69" y="5" width="26" height="26" fill="black" rx="2" />
                  <rect x="73" y="9" width="18" height="18" fill="white" rx="1" />
                  <rect x="77" y="13" width="10" height="10" fill="black" rx="1" />
                  <rect x="5" y="69" width="26" height="26" fill="black" rx="2" />
                  <rect x="9" y="73" width="18" height="18" fill="white" rx="1" />
                  <rect x="13" y="77" width="10" height="10" fill="black" rx="1" />
                  {[40,44,48,52,56,60].map((x, i) => (
                    <React.Fragment key={i}>
                      <rect x={x} y="5" width="3" height="3" fill={i % 2 === 0 ? 'black' : 'white'} />
                      <rect x={x} y="92" width="3" height="3" fill={i % 3 === 0 ? 'black' : 'white'} />
                      <rect x="5" y={x} width="3" height="3" fill={i % 2 !== 0 ? 'black' : 'white'} />
                      <rect x="92" y={x} width="3" height="3" fill={i % 3 !== 0 ? 'black' : 'white'} />
                    </React.Fragment>
                  ))}
                  {[40,44,48,52,56,60,64,68].map((x, i) => (
                    [40,44,48,52,56,60,64,68].map((y, j) => (
                      (i + j) % 3 !== 0 && <rect key={`qr-${i}-${j}`} x={x} y={y} width="3" height="3" fill="black" />
                    ))
                  ))}
                </svg>
              </div>
              <span className="text-slate-800 font-mono text-[11px] font-bold mt-2">
                {mobileLanUrl}
              </span>
            </div>

            {/* Link e Botão Copiar */}
            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
              <Wifi size={14} className="text-emerald-400 shrink-0" />
              <span className="font-mono text-slate-300 truncate flex-1">{mobileLanUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mobileLanUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Dicas para iPhone e Android */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <p className="font-bold text-white mb-1"> No iPhone (Safari):</p>
                <p className="text-slate-400 leading-tight">
                  Aponte a câmera nativa do iOS. Toque em <strong>Compartilhar ➔ Adicionar à Tela de Início</strong> para rodar em tela cheia sem barras!
                </p>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <p className="font-bold text-white mb-1">🤖 No Android (Chrome):</p>
                <p className="text-slate-400 leading-tight">
                  Escaneie com a câmera. Toque nos <strong>três pontinhos ➔ Instalar aplicativo</strong> para ativar a experiência nativa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Instalação PWA Nativa (iPhone / Android) */}
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
