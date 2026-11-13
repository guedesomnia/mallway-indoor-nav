import React, { useMemo, useState } from 'react';
import {
  Building2,
  MapPin,
  Smartphone,
  ShieldCheck,
  Layers,
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
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { QrImage } from './components/QrImage';
import type { BuildingMap, UserProfile } from './types/map';
import type { Restaurant } from './types/restaurant';
import { listEntrances, resolveUnitDoorNode } from './utils/mapRules';
import { routeDistancesFrom } from './utils/pathfinding';
import { unitToRestaurant } from './utils/restaurantFromUnit';
import { haptics } from './utils/haptics';

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

export interface ClientAppProps {
  shoppings: BuildingMap[];
  activeShopping: BuildingMap;
  mapInfo: { source: 'network' | 'cache' | 'draft'; version: number; fetchedAt: number } | null;
  isStaff: boolean;
  onSwitchShopping: (id: string) => void;
  onOpenAdmin: () => void;
  onOpenMaster: () => void;
  onOtherMall: (url: string) => void;
}

/** Interpreta ?entrance= e ?store= (links de QR). Só aceita ids exatos que existem no mapa. */
function readDeepLink(map: BuildingMap) {
  const params = new URLSearchParams(window.location.search);
  const entrances = listEntrances(map);
  const entranceParam = params.get('entrance');
  const entrance = entranceParam ? entrances.find((e) => e.id === entranceParam) : undefined;
  const entranceId = entrance?.id ?? entrances[0]?.id ?? '';
  const notice = entranceParam && !entrance ? 'Esta placa não está mais ativa neste shopping. Escolha sua entrada na lista.' : null;

  const storeParam = params.get('store');
  const unit = storeParam ? map.units.find((u) => u.id === storeParam) : undefined;
  if (entrance && unit) {
    const door = resolveUnitDoorNode(map, unit);
    const meters = door ? routeDistancesFrom(map, entrance.id, 'courier').get(door.id) : undefined;
    if (meters !== undefined) {
      return { entranceId, screen: 'detail' as AppScreen, restaurant: unitToRestaurant(map, unit, Math.round(meters)), notice };
    }
  }
  return { entranceId, screen: (entrance ? 'restaurants' : 'qr') as AppScreen, restaurant: null as Restaurant | null, notice };
}

export function ClientApp({
  shoppings,
  activeShopping,
  mapInfo,
  isStaff,
  onSwitchShopping,
  onOpenAdmin,
  onOpenMaster,
  onOtherMall,
}: ClientAppProps) {
  const initial = useMemo(() => readDeepLink(activeShopping), [activeShopping]);
  const [screen, setScreen] = useState<AppScreen>(initial.screen);
  const [userProfile, setUserProfile] = useState<UserProfile>('courier');
  const [entranceId, setEntranceId] = useState<string>(initial.entranceId);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(initial.restaurant);

  // Simulador de aparelho e atalho "testar no celular" (ferramentas da equipe)
  const [deviceMockup, setDeviceMockup] = useState<'iphone' | 'android' | 'responsive'>('iphone');
  const [isMobileQrModalOpen, setIsMobileQrModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const mobileLanUrl = `${window.location.origin}/?mall=${encodeURIComponent(activeShopping.id)}`;

  const screenFlow: AppScreen[] = ['qr', 'restaurants', 'detail', 'map', 'steps', 'arrived'];
  const screenLabels = ['QR Code', 'Lojas / Food', 'Detalhes', 'Navegação', 'Passo a Passo', 'Chegada'];
  const currentIdx = screenFlow.indexOf(screen);
  const goTo = (s: AppScreen) => {
    haptics.light();
    setScreen(s);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-slate-100 via-emerald-50/30 to-slate-100">
      {mapInfo?.source === 'draft' && (
        <div role="status" className="w-full bg-sky-100 text-sky-900 text-xs font-semibold px-3 py-1.5 text-center z-50">
          Pré-visualização do rascunho — ainda não publicado para os entregadores
        </div>
      )}
      {mapInfo?.source === 'cache' && (
        <div role="status" className="w-full bg-amber-100 text-amber-900 text-xs font-semibold px-3 py-1.5 text-center z-50">
          Sem internet — usando o mapa baixado em {new Date(mapInfo.fetchedAt).toLocaleDateString('pt-BR')} (versão {mapInfo.version})
        </div>
      )}
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
                {activeShopping.city || activeShopping.state || 'Shopping'}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              Simulador do Aplicativo Acionado por QR Code Físico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor Rápido de Shopping */}
          {shoppings.length > 1 && (
          <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
            {shoppings.map(shop => (
              <button
                key={shop.id}
                onClick={() => {
                  onSwitchShopping(shop.id);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeShopping.id === shop.id
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Building2 size={13} />
                {shop.name.split(' ')[0]}
              </button>
            ))}
          </div>
          )}

          {currentIdx >= 0 && currentIdx < screenLabels.length && (
            <div className="hidden lg:block">
              <StepDots
                current={currentIdx}
                total={screenLabels.length}
                labels={screenLabels}
              />
            </div>
          )}

          {isStaff && (<>
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
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Gerenciar Shopping</span>
          </button>

          {/* Botão para Dashboard Master */}
          <button
            onClick={onOpenMaster}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
          >
            <Layers size={14} />
            <span>Console Master</span>
          </button>
          </>)}
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
          {shoppings.length > 1 && (
          <select
            value={activeShopping.id}
            onChange={(e) => onSwitchShopping(e.target.value)}
            className="bg-slate-900 text-slate-200 font-bold text-[10px] rounded-lg px-2 py-1 border border-slate-700 outline-none"
          >
            {shoppings.map(s => (
              <option key={s.id} value={s.id}>{s.name.split(' ')[0]}</option>
            ))}
          </select>
          )}
          {isStaff && (
          <button
            onClick={onOpenAdmin}
            className="p-1.5 bg-slate-800 text-emerald-400 rounded-lg text-xs"
            title="Painel Admin"
          >
            <ShieldCheck size={14} />
          </button>
          )}
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
                      notice={initial.notice}
                      onOtherMall={onOtherMall}
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
                    userProfile={userProfile}
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

            {/* QR Code Real de Alta Nitidez para o IP Local */}
            <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <div className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center">
                <QrImage text={mobileLanUrl} size={300} className="w-full h-full object-contain" />
              </div>
              <span className="text-slate-800 font-mono text-xs font-bold mt-2.5">
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
