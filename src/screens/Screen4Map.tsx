import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  Compass, 
  Play, 
  Pause, 
  RotateCcw, 
  Crosshair, 
  Footprints, 
  Smartphone, 
  ArrowUp, 
  ArrowUpLeft, 
  ArrowUpRight, 
  CheckCircle2,
  Volume2,
  VolumeX,
  Camera,
  Map as MapIcon,
  Sparkles
} from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { AppHeader } from '../components/AppHeader';
import { Restaurant } from '../data/restaurants';
import { BuildingMap, UserProfile } from '../types/map';
import { calculateIndoorRoute } from '../utils/pathfinding';
import { InteractiveMapCanvas } from '../components/InteractiveMapCanvas';
import { useIndoorNavigation } from '../utils/useIndoorNavigation';
import { audioNav } from '../utils/audioNavigation';
import { haptics } from '../utils/haptics';

interface Screen4MapProps {
  restaurant: Restaurant;
  buildingMap: BuildingMap;
  entranceId?: string;
  userProfile?: UserProfile;
  onBack: () => void;
  onNextStep: () => void;
}

export const Screen4Map: React.FC<Screen4MapProps> = ({
  restaurant,
  buildingMap,
  entranceId = 'node-ent-feira',
  userProfile = 'courier',
  onBack,
  onNextStep,
}) => {
  const startNodeId = entranceId;
  
  // Estado de Som / Mudo do Waze
  const [isMuted, setIsMuted] = useState<boolean>(audioNav.isMuted());

  // Estado de Modo AR (Câmera do Celular com Seta 3D Sobreposta)
  const [isArMode, setIsArMode] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Encontra nó destino baseado no restaurante
  const targetNode = buildingMap.nodes.find(n => 
    n.label?.toLowerCase().includes(restaurant.name.toLowerCase()) ||
    n.id.toLowerCase().includes(restaurant.id.toLowerCase())
  ) || buildingMap.nodes.find(n => n.id === 'node-door-outback-bangu') || buildingMap.nodes[0];

  const activeFloorId = buildingMap.floors[0]?.id || 'floor-terreo';

  // Rota do Dijkstra respeitando perfil
  const routeResult = calculateIndoorRoute(
    buildingMap,
    startNodeId,
    targetNode.id,
    userProfile
  );

  // Motor de Navegação Waze com Sensores e Pedometer
  const nav = useIndoorNavigation(routeResult, activeFloorId, () => {
    // Quando chega ao fim da rota
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([100, 60, 150]); } catch { /* ignore */ }
    }
  });

  // Instrução atual do Waze
  const currentInstruction = routeResult?.instructions[nav.currentStepIndex] || {
    title: 'Siga pela rota demarcada',
    description: `Dirija-se até ${restaurant.name}`,
    iconType: 'walk'
  };

  // =========================================================================
  // PASSO 1: DISPARO DE VOZ, CHIMES SONOROS E HAPTIC FEEDBACK AUTOMÁTICOS
  // =========================================================================
  useEffect(() => {
    if (nav.hasArrived) {
      haptics.success();
      audioNav.playChime('arrival');
      audioNav.speak(`Você chegou ao seu destino! ${restaurant.name}.`, true);
    } else {
      haptics.turn();
      audioNav.playChime('turn');
      const textToSpeak = `${currentInstruction.title}. ${currentInstruction.description}`;
      audioNav.speak(textToSpeak);
    }
  }, [nav.currentStepIndex, nav.hasArrived, restaurant.name, currentInstruction.title, currentInstruction.description]);

  // Ícone de manobra baseado na instrução
  const getTurnIcon = () => {
    const text = (currentInstruction.title + ' ' + currentInstruction.description).toLowerCase();
    if (text.includes('esquerda')) {
      return <ArrowUpLeft size={28} className="text-white drop-shadow" />;
    }
    if (text.includes('direita')) {
      return <ArrowUpRight size={28} className="text-white drop-shadow" />;
    }
    if (nav.hasArrived || text.includes('chegada') || text.includes('chegou')) {
      return <CheckCircle2 size={28} className="text-emerald-300 drop-shadow" />;
    }
    return <ArrowUp size={28} className="text-white drop-shadow" />;
  };

  // Hora estimada de chegada (ETA)
  const etaTime = new Date(Date.now() + nav.remainingTimeMinutes * 60 * 1000).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // =========================================================================
  // PASSO 2: CONTROLE DA CÂMERA DO MODO AR (REALIDADE AUMENTADA)
  // =========================================================================
  const toggleArMode = async () => {
    if (!isArMode) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          setCameraStream(stream);
          setIsArMode(true);
          audioNav.speak('Modo Realidade Aumentada ativado.');
        } else {
          alert('Acesso à câmera não suportado neste navegador.');
        }
      } catch (err) {
        console.warn('Erro ao abrir câmera para modo AR:', err);
        // Fallback simulado caso permissão de câmera seja negada no desktop
        setIsArMode(true);
      }
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setIsArMode(false);
    }
  };

  useEffect(() => {
    if (isArMode && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isArMode, cameraStream]);

  // Limpa câmera ao sair da tela
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      <div className="bg-white">
        <StatusBar />
        <AppHeader onBack={onBack} mallName={buildingMap.name} />
      </div>

      {/* 1. HUD SUPERIOR ESTILO WAZE (PRÓXIMA MANOBRA FLUTUANTE) */}
      <div className="absolute top-16 left-3 right-3 z-30 pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 border border-cyan-500/40 shadow-2xl flex items-center gap-3.5 pointer-events-auto">
          {/* Caixa de manobra com fundo ciano/esmeralda */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/25">
            {getTurnIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-extrabold text-sm tracking-tight">
                {nav.hasArrived ? 'Você chegou!' : `Em ~${Math.max(10, Math.round(nav.remainingDistanceMeters * 0.4))}m`}
              </span>
              <span className="text-[10px] text-slate-400">| Passo {nav.currentStepIndex + 1} de {routeResult?.instructions.length || 1}</span>
            </div>
            <p className="font-bold text-white text-sm leading-snug truncate">
              {nav.hasArrived ? `Ponto de Retirada: ${restaurant.name}` : currentInstruction.title}
            </p>
            <p className="text-[11px] text-slate-300 leading-tight truncate">
              {nav.hasArrived ? 'Balcão de delivery à sua frente' : currentInstruction.description}
            </p>
          </div>

          {/* Botão de Som / Voz Waze (Passo 1) */}
          <button
            onClick={() => setIsMuted(audioNav.toggleMute())}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isMuted 
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white' 
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
            }`}
            title={isMuted ? 'Ativar orientação por voz e sons' : 'Silenciar voz do Waze'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="animate-pulse" />}
          </button>
        </div>

        {/* Badge de Status dos Sensores e Acelerômetro */}
        <div className="mt-1.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            {nav.sensorActive ? (
              <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Acelerômetro Ativo: {nav.stepsDetectedCount} passos
              </span>
            ) : nav.isSimulating ? (
              <span className="bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                Waze em Movimento ({nav.speedKmh} km/h)
              </span>
            ) : (
              <span className="bg-slate-900/80 border border-slate-700 text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur">
                GPS Indoor Pronto
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botão Alternar Modo AR Realidade Aumentada */}
            <button
              onClick={toggleArMode}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 pointer-events-auto cursor-pointer ${
                isArMode 
                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/30' 
                  : 'bg-slate-900/80 text-purple-300 border-purple-500/30 hover:border-purple-400'
              }`}
            >
              <Camera size={11} />
              <span>{isArMode ? 'Ver Mapa 2.5D' : 'Modo AR Câmera'}</span>
            </button>

            <div className="text-[10px] text-cyan-400 font-mono font-bold bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
              {nav.progressPercent}% ROTA
            </div>
          </div>
        </div>
      </div>

      {/* 2. ÁREA DE VISUALIZAÇÃO: MAPA 2.5D OU MODO AR (REALIDADE AUMENTADA) */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {!isArMode ? (
          // VISÃO 1: MAPA DINÂMICO 2.5D COM ACOMPANHAMENTO WAZE
          <>
            <InteractiveMapCanvas
              buildingMap={buildingMap}
              activeFloorId={activeFloorId}
              routeResult={routeResult}
              selectedUnitId={buildingMap.units.find(u => u.name.toLowerCase().includes(restaurant.name.toLowerCase()))?.id || null}
              startNodeId={startNodeId}
              targetNodeId={targetNode.id}
              isEditorMode={false}
              userPosition={nav.currentPosition}
              userHeading={nav.heading}
              autoFollow={nav.autoFollow}
              onUserPan={() => nav.setAutoFollow(false)}
              traversedPath={nav.traversedPath}
              remainingPath={nav.remainingPath}
            />

            {/* Botão Flutuante de Recentralizar (Estilo Waze / Google Maps) */}
            {!nav.autoFollow && (
              <button
                onClick={nav.recenter}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-full shadow-2xl border border-cyan-400/40 flex items-center gap-2 text-xs font-black tracking-wide transition-all animate-bounce cursor-pointer"
                title="Recentralizar câmera na sua posição"
              >
                <Crosshair size={16} className="text-cyan-200" />
                <span>Recentralizar</span>
              </button>
            )}
          </>
        ) : (
          // VISÃO 2: MODO AR CÂMERA (REALIDADE AUMENTADA COM SETAS SOBREPOSTAS)
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {cameraStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              // Simulação de corredor de shopping caso a câmera não esteja conectada
              <div 
                className="w-full h-full flex flex-col items-center justify-center relative"
                style={{
                  background: 'radial-gradient(ellipse at bottom, #1e293b 0%, #0f172a 60%, #020617 100%)'
                }}
              >
                {/* Linhas de perspectiva do chão do shopping */}
                <svg className="absolute inset-0 w-full h-full opacity-30">
                  <line x1="0" y1="100%" x2="50%" y2="40%" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 4" />
                  <line x1="100%" y1="100%" x2="50%" y2="40%" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 4" />
                  <line x1="25%" y1="100%" x2="50%" y2="40%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="75%" y1="100%" x2="50%" y2="40%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
                <p className="text-slate-400 text-xs z-10 font-bold mb-1">Visão Simulada da Câmera AR</p>
                <p className="text-slate-500 text-[10px] z-10 max-w-xs text-center px-4">
                  No celular com câmera autorizada, o feed de vídeo real do corredor é exibido aqui.
                </p>
              </div>
            )}

            {/* Overlay Holográfico de Realidade Aumentada */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Seta Direcional Gigante Neon AR */}
              <div className="relative flex flex-col items-center animate-pulse">
                <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-400/60 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-cyan-500/50">
                  {getTurnIcon()}
                </div>
                <div className="mt-3 bg-slate-900/90 border border-cyan-400/50 px-4 py-1.5 rounded-full text-xs font-black text-cyan-300 shadow-xl">
                  {currentInstruction.title}
                </div>
                <span className="text-[11px] text-white/80 mt-1 font-mono">
                  Siga em frente por ~{Math.round(nav.remainingDistanceMeters * 0.4)}m
                </span>
              </div>

              {/* Bússola e Radar de Horizonte Artificial */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-cyan-300">
                <Compass className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span>Navegação AR Calibrada</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. PAINEL DE CONTROLE E PROGRESSO WAZE (BOTTOM SHEET) */}
      <div className="bg-slate-900/98 border-t border-slate-800 p-4 shadow-2xl relative z-30">
        {/* Barra de Progresso Linear */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full mb-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${nav.progressPercent}%` }}
          />
        </div>

        {/* Métricas Principais Waze: Tempo Restante | Distância | Horário de Chegada */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-cyan-400 tracking-tight">
                {nav.remainingTimeMinutes}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase">min</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {nav.hasArrived ? 'Chegada concluída' : 'Tempo estimado'}
            </p>
          </div>

          <div className="text-center px-4 border-x border-slate-800">
            <span className="text-xl font-black text-white">
              {nav.remainingDistanceMeters}m
            </span>
            <p className="text-[11px] text-slate-400">Distância restante</p>
          </div>

          <div className="text-right">
            <span className="text-xl font-bold text-slate-200">
              {etaTime}
            </span>
            <p className="text-[11px] text-slate-400">Chegada prevista</p>
          </div>
        </div>

        {/* Controles de Simulação & Velocidade */}
        <div className="pt-2.5 space-y-2">
          {/* Linha de Velocidade do Waze */}
          <div className="flex items-center justify-between px-1 text-[11px]">
            <span className="text-slate-400 font-medium">Velocidade de Teste:</span>
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700/60">
              {[1.0, 1.5, 2.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    haptics.light();
                    nav.setSimulationSpeed(speed);
                  }}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all text-[10px] ${
                    nav.simulationSpeed === speed
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Botão Play / Pause (Simular Caminhada) */}
            <button
              onClick={() => {
                haptics.medium();
                if (nav.isSimulating) {
                  nav.pauseSimulation();
                } else {
                  nav.startSimulation();
                }
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                nav.isSimulating
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25'
              }`}
            >
              {nav.isSimulating ? <Pause size={14} /> : <Play size={14} />}
              {nav.isSimulating ? 'Pausar' : 'Andar (Waze)'}
            </button>

            {/* Botão Dar 1 Passo (+1m manual para teste rápido) */}
            <button
              onClick={() => {
                haptics.step();
                nav.stepForward(2.0);
                audioNav.playChime('step');
              }}
              className="py-2 px-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Avança 2 metros no corredor"
            >
              <Footprints size={14} className="text-cyan-400" />
              +1 Passo
            </button>

            {/* Botão Ativar Acelerômetro Real */}
            <button
              onClick={() => {
                haptics.light();
                nav.requestSensorPermission();
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                nav.sensorActive
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Usa o acelerômetro real do smartphone"
            >
              <Smartphone size={14} className={nav.sensorActive ? 'text-emerald-400' : 'text-slate-400'} />
              {nav.sensorActive ? 'Sensores ON' : 'Sensores Cel.'}
            </button>
          </div>
        </div>

        {/* Botão Próximo / Detalhes */}
        <div className="pt-2.5">
          <button 
            onClick={onNextStep} 
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Ver Instruções Detalhadas em Fotos</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
