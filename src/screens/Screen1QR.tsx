import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, 
  Bike, 
  MapPin, 
  Camera, 
  X, 
  Flashlight, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { AppHeader } from '../components/AppHeader';
import { ENTRANCES } from '../data/restaurants';
import { BuildingMap } from '../types/map';
import { audioNav } from '../utils/audioNavigation';
import { haptics } from '../utils/haptics';

interface Screen1QRProps {
  onScanned: (entranceId: string) => void;
  selectedEntrance: string;
  buildingMap?: BuildingMap;
}

export const Screen1QR: React.FC<Screen1QRProps> = ({ 
  onScanned, 
  selectedEntrance,
  buildingMap 
}) => {
  const mallName = buildingMap?.name || 'Bangu Shopping';
  const logoBadge = buildingMap?.logoBadge || (mallName.includes('Barra') ? 'BB' : mallName.includes('Norte') ? 'NS' : 'BS');

  // Modo: Placa Ilustrada ('board') vs Scanner de Câmera Real ('camera')
  const [scannerMode, setScannerMode] = useState<'board' | 'camera'>('board');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasScannedSuccess, setHasScannedSuccess] = useState<boolean>(false);
  const [scannedLabel, setScannedLabel] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Entradas dinâmicas a partir do mapa ou fallback para ENTRANCES
  const dynamicEntrances = buildingMap 
    ? buildingMap.nodes
        .filter(n => n.type === 'entrance')
        .map(n => ({
          id: n.id,
          name: n.label || 'Portão de Acesso',
          label: `Entrada Oficial • ${buildingMap.floors.find(f => f.id === n.floorId)?.shortName || 'Térreo'}`
        }))
    : [];

  const entranceList = dynamicEntrances.length > 0 ? dynamicEntrances : ENTRANCES;

  // =========================================================================
  // PASSO 2: ATIVAÇÃO DA CÂMERA DO SMARTPHONE PARA LEITURA DE QR CODE REAL
  // =========================================================================
  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        setCameraStream(stream);
        setScannerMode('camera');
        audioNav.playChime('ping');
      } else {
        setCameraError('Câmera não suportada neste dispositivo.');
        setScannerMode('camera');
      }
    } catch (err: unknown) {
      console.warn('Erro ao solicitar acesso à câmera:', err);
      setCameraError('Permissão da câmera necessária para escanear a placa física.');
      setScannerMode('camera');
    }
  };

  const stopCameraScanner = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScannerMode('board');
    setHasScannedSuccess(false);
  };

  // Conecta o feed de vídeo
  useEffect(() => {
    if (scannerMode === 'camera' && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [scannerMode, cameraStream]);

  // Detector de Código de Barras / QR Code Nativo
  useEffect(() => {
    if (scannerMode !== 'camera' || !videoRef.current || !cameraStream) return;

    // Se o navegador possuir a BarcodeDetector API nativa
    const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;

    if (BarcodeDetectorClass) {
      try {
        const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });

        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                handleCodeDetected(code);
              }
            } catch {
              // ignore frame read error
            }
          }
        }, 300);
      } catch (e) {
        console.warn('BarcodeDetector error:', e);
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [scannerMode, cameraStream]);

  // Trata detecção do código
  const handleCodeDetected = (rawValue: string) => {
    // Tenta encontrar se o texto do QR bate com alguma entrada
    const matched = entranceList.find(e => 
      rawValue.toLowerCase().includes(e.id.toLowerCase()) || 
      rawValue.toLowerCase().includes(e.name.toLowerCase())
    ) || entranceList[0];

    setHasScannedSuccess(true);
    setScannedLabel(matched.name);
    haptics.success();
    audioNav.playChime('arrival');
    audioNav.speak(`QR Code reconhecido! Você está na ${matched.name}. Carregando mapa.`);

    setTimeout(() => {
      stopCameraScanner();
      onScanned(matched.id);
    }, 1200);
  };

  // Limpa streams no unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
              {/* Botão de teste rápido de reconhecimento para desktop */}
              <button
                onClick={() => handleCodeDetected(entranceList[0].id)}
                className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
              >
                Simular leitura do Portão Principal
              </button>
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

      {/* Seletor Rápido de Entrada Manual / Simulação */}
      {scannerMode === 'board' && (
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          <p className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
            Ou escolha o portão onde você está agora:
          </p>
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
