import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  QrCode,
  Bike,
  Camera,
  X,
  CheckCircle2,
  Keyboard
} from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { AppHeader } from '../components/AppHeader';
import type { BuildingMap } from '../types/map';
import { listEntrances } from '../utils/mapRules';
import { parseQrPayload } from '../utils/qr';
import { audioNav } from '../utils/audioNavigation';
import { haptics } from '../utils/haptics';

interface Screen1QRProps {
  onScanned: (entranceId: string) => void;
  onOtherMall?: (url: string) => void;
  selectedEntrance: string;
  buildingMap: BuildingMap;
  notice?: string | null;
}

// jsQR (~130 KB) só é baixado quando o aparelho não tem leitor de QR nativo (iPhone/Safari).
let jsQRLoader: Promise<typeof import('jsqr').default> | null = null;
const loadJsQR = () => (jsQRLoader ??= import('jsqr').then((m) => m.default));

type DetectorLike = { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
const SCAN_TIMEOUT_MS = 90_000; // câmera ligada à toa gasta a bateria do entregador

export const Screen1QR: React.FC<Screen1QRProps> = ({
  onScanned,
  onOtherMall,
  selectedEntrance,
  buildingMap,
  notice
}) => {
  const mallName = buildingMap.name;
  const logoBadge = buildingMap.logoBadge || mallName.substring(0, 2).toUpperCase();

  // Modo: Placa Ilustrada ('board') vs Scanner de Câmera Real ('camera')
  const [scannerMode, setScannerMode] = useState<'board' | 'camera'>('board');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasScannedSuccess, setHasScannedSuccess] = useState<boolean>(false);
  const [scannedLabel, setScannedLabel] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(notice ?? null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const lockedRef = useRef(false); // depois de um código aceito, ignora leituras repetidas do mesmo quadro
  const lastRejectedRef = useRef<{ raw: string; at: number } | null>(null);

  // Só entradas reais do mapa: nunca uma lista de outro shopping como "plano B".
  const entranceList = listEntrances(buildingMap).map(n => ({
    id: n.id,
    name: n.label || 'Portão de Acesso',
    label: `${n.type === 'courier_parking' ? 'Ponto de entregadores' : 'Entrada oficial'} • ${buildingMap.floors.find(f => f.id === n.floorId)?.shortName || ''}`.trim()
  }));

  const stopCameraScanner = useCallback(() => {
    setCameraStream(prev => {
      prev?.getTracks().forEach(track => track.stop());
      return null;
    });
    lockedRef.current = false;
    setScannerMode('board');
    setHasScannedSuccess(false);
    setScanMessage(null);
  }, []);

  const startCameraScanner = async () => {
    setCameraError(null);
    setScanMessage(null);
    lockedRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador não permite usar a câmera. Escolha sua entrada na lista abaixo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setScannerMode('camera');
      audioNav.playChime('ping');
    } catch (err: unknown) {
      console.warn('Erro ao solicitar acesso à câmera:', err);
      // Sem câmera não há beco sem saída: volta para a lista de entradas com a explicação.
      setCameraError('Não foi possível usar a câmera (permissão negada?). Escolha sua entrada na lista abaixo ou digite o código da placa.');
      setScannerMode('board');
    }
  };

  const acceptCode = useCallback((raw: string): boolean => {
    const result = parseQrPayload(raw, buildingMap, window.location.origin);
    if (result.kind === 'invalid') {
      const last = lastRejectedRef.current;
      if (!last || last.raw !== raw || Date.now() - last.at > 4000) {
        lastRejectedRef.current = { raw, at: Date.now() };
        setScanMessage(result.reason);
        haptics.light();
      }
      return false;
    }
    if (lockedRef.current) return true;
    lockedRef.current = true;

    if (result.kind === 'other-mall') {
      stopCameraScanner();
      onOtherMall?.(result.url);
      return true;
    }

    setScanMessage(null);
    setHasScannedSuccess(true);
    setScannedLabel(result.entranceName);
    haptics.success();
    audioNav.playChime('arrival');
    audioNav.speak(`Placa reconhecida. Você está em ${result.entranceName}. Carregando lojas.`);
    window.setTimeout(() => {
      stopCameraScanner();
      onScanned(result.entranceId);
    }, 900);
    return true;
  }, [buildingMap, onOtherMall, onScanned, stopCameraScanner]);

  // Conecta o feed de vídeo
  useEffect(() => {
    if (scannerMode === 'camera' && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [scannerMode, cameraStream]);

  // Leitura de QR: BarcodeDetector nativo quando existe; jsQR (canvas) no iPhone/Safari e onde o nativo falha.
  useEffect(() => {
    if (scannerMode !== 'camera' || !cameraStream) return;
    let cancelled = false;
    let lastRun = 0;
    let raf = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let detector: DetectorLike | null = null;
    try {
      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => DetectorLike }).BarcodeDetector;
      if (Native) detector = new Native({ formats: ['qr_code'] });
    } catch {
      detector = null;
    }

    const decode = async (video: HTMLVideoElement): Promise<string | null> => {
      if (detector) {
        try {
          const found = await detector.detect(video);
          if (found.length) return found[0].rawValue;
          return null;
        } catch {
          detector = null; // detector quebrado neste aparelho: segue só com jsQR
        }
      }
      if (!ctx || !video.videoWidth) return null;
      const jsQR = await loadJsQR();
      const w = 480;
      const h = Math.round((video.videoHeight * w) / video.videoWidth);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      return jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
    };

    const tick = async (now: number) => {
      if (cancelled || lockedRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && now - lastRun > 250) {
        lastRun = now;
        const raw = await decode(video).catch(() => null);
        if (raw && !cancelled) acceptCode(raw);
      }
      if (!cancelled && !lockedRef.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [scannerMode, cameraStream, acceptCode]);

  // Desliga a câmera sozinha se ninguém ler nada (bateria).
  useEffect(() => {
    if (scannerMode !== 'camera') return;
    const t = window.setTimeout(() => {
      stopCameraScanner();
      setCameraError('Câmera desligada para poupar bateria. Toque para abrir de novo ou escolha a entrada na lista.');
    }, SCAN_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [scannerMode, stopCameraScanner]);

  // Limpa streams no unmount
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    if (acceptCode(manualCode)) setManualCode('');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <AppHeader showLang mallName={mallName} />

      {/* ======================================================================= */}
      {/* CENÁRIO A: SCANNER DE CÂMERA REAL EM TEMPO REAL */}
      {/* ======================================================================= */}
      {scannerMode === 'camera' ? (
        <div className="flex-1 relative bg-black flex flex-col items-center justify-between overflow-hidden">
          {/* Feed de vídeo da câmera real */}
          {cameraStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            // Visão de câmera simulada com mira caso permissão seja negada no desktop
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <Camera size={48} className="text-emerald-400 mb-3 animate-pulse" />
              <p className="text-white font-bold text-sm mb-1">
                {cameraError || 'Iniciando câmera do smartphone...'}
              </p>
              <p className="text-slate-400 text-xs max-w-xs mb-4">
                Aponte para a placa física com QR Code ou clique em um dos portões abaixo para validar instantaneamente.
              </p>
            </div>
          )}

          {/* Máscara e Mira Holográfica do Scanner */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-6 px-4 pointer-events-none">
            {/* Top Bar do Scanner */}
            <div className="w-full flex items-center justify-between pointer-events-auto">
              <button 
                onClick={stopCameraScanner}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-lg"
              >
                <X size={20} />
              </button>
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Scanner de Placa Ativo</span>
              </div>
              <div className="w-10 h-10" />
            </div>

            {/* Retângulo da Mira com Cantos Verdes e Laser */}
            <div className="relative w-64 h-64 rounded-3xl border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-2xl">
              {/* Cantos estilizados */}
              <div className="absolute top-2 left-2 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-2 right-2 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-2 left-2 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-2 right-2 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

              {/* Laser Animado de Leitura */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-bounce" style={{ top: '45%' }} />

              {/* Feedback de Sucesso */}
              {hasScannedSuccess && (
                <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-scale-up">
                  <CheckCircle2 size={48} className="text-white mb-2" />
                  <p className="text-white font-black text-sm">QR Code Reconhecido!</p>
                  <p className="text-emerald-100 text-xs">{scannedLabel}</p>
                </div>
              )}
            </div>

            {/* Dica no rodapé do scanner */}
            <div className="pointer-events-auto bg-black/75 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center max-w-xs">
              <p className="text-white text-xs font-semibold">
                Centralize o QR Code da cancela ou pilar na moldura
              </p>
              {scanMessage && (
                <p role="alert" className="mt-1.5 text-[11px] text-amber-300 font-semibold">{scanMessage}</p>
              )}
              <form onSubmit={submitManual} className="mt-2 flex items-center gap-1.5">
                <Keyboard size={14} className="text-slate-300 shrink-0" />
                <input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="Digite o código da placa"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="flex-1 min-w-0 bg-white/10 text-white placeholder-slate-400 text-[11px] rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button type="submit" className="text-[11px] font-bold text-emerald-300 px-1.5">OK</button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        // =======================================================================
        // CENÁRIO B: PLACA ILUSTRADA OFICIAL + BOTÃO PARA ABRIR CÂMERA
        // =======================================================================
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* Background – efeito parede moderna */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 50%, #020617 100%)',
            }}
          />

          {/* Grating texture */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px)`,
            }}
          />

          {/* Conteúdo da Placa */}
          <div className="relative z-10 flex flex-col items-center pt-4 px-6 flex-1 overflow-y-auto">
            {/* Shopping logo on board */}
            <div className="bg-white rounded-2xl px-5 py-2 mb-2.5 shadow-2xl flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-black">{logoBadge}</span>
              </div>
              <span className="font-black text-gray-900 text-lg tracking-tight">{mallName}</span>
            </div>

            {/* Title */}
            <div className="text-center mb-3">
              <h1 className="text-white text-2xl font-black tracking-tight mb-0.5">GUIA & ROTAS</h1>
              <p className="text-emerald-400 font-semibold text-xs tracking-widest uppercase">
                ENCONTRE QUALQUER LOJA OU BALCÃO NO MAPA
              </p>
            </div>

            {/* Placa com QR Code Físico */}
            <div className="bg-white rounded-2xl p-4 shadow-2xl mb-3 border border-white/20">
              <div className="w-32 h-32 relative">
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
                      (i + j) % 3 !== 0 && <rect key={`${i}-${j}`} x={x} y={y} width="3" height="3" fill="black" />
                    ))
                  ))}
                </svg>
              </div>
            </div>

            {cameraError && (
              <p role="alert" className="w-full mb-2.5 text-[11px] leading-snug text-amber-200 bg-amber-500/15 border border-amber-400/40 rounded-xl px-3 py-2">
                {cameraError}
              </p>
            )}

            {/* BOTÃO PRINCIPAL: ABRIR CÂMERA REAL DO CELULAR */}
            <button
              onClick={startCameraScanner}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer mb-3"
            >
              <Camera size={18} className="animate-pulse" />
              <span>Abrir Câmera para Escanear Placa</span>
            </button>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3.5 py-1.5 border border-white/20 mb-2">
              <Bike size={14} className="text-emerald-400" />
              <span className="text-white text-[11px] font-semibold">Suporte para Clientes e Entregadores</span>
            </div>
          </div>
        </div>
      )}

      {/* Seletor Rápido de Entrada Manual */}
      {scannerMode === 'board' && (
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          <p className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
            Ou escolha o portão onde você está agora:
          </p>
          {entranceList.length === 0 && (
            <p className="text-xs text-red-600 font-semibold">Este shopping ainda não tem entradas cadastradas.</p>
          )}
          <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {entranceList.map(e => (
              <button
                key={e.id}
                onClick={() => onScanned(e.id)}
                className={`flex items-center justify-between p-2 rounded-xl border-2 transition-all text-left cursor-pointer ${
                  selectedEntrance === e.id
                    ? 'border-emerald-500 bg-emerald-50/70'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    selectedEntrance === e.id ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}>
                    <QrCode size={12} className={selectedEntrance === e.id ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-xs">{e.name}</p>
                    <p className="text-gray-500 text-[9px]">{e.label}</p>
                  </div>
                </div>
                {selectedEntrance === e.id && (
                  <span className="text-emerald-600 text-xs font-bold">✓ Entrar</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
