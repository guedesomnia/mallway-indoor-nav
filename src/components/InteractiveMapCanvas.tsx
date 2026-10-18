import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  BuildingMap, 
  StoreUnit, 
  RouteResult, 
  Point,
  WayNodeType
} from '../types/map';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Crosshair, 
  Compass, 
  Scan, 
  Maximize2, 
  Minimize2, 
  Move, 
  ShieldAlert, 
  Info,
  Footprints,
  Sparkles,
  Flame
} from 'lucide-react';

interface InteractiveMapCanvasProps {
  buildingMap: BuildingMap;
  activeFloorId: string;
  routeResult: RouteResult | null;
  selectedUnitId: string | null;
  onSelectUnit?: (unit: StoreUnit | null) => void;
  startNodeId?: string | null;
  targetNodeId?: string | null;
  isEditorMode?: boolean;
  editorTool?: 'select' | 'draw_unit' | 'add_node' | 'add_edge';
  onAddPointToDraft?: (point: Point) => void;
  draftPoints?: Point[];
  onCanvasNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  userPosition?: Point | null;
  userHeading?: number;
  autoFollow?: boolean;
  onUserPan?: () => void;
  traversedPath?: Point[];
  remainingPath?: Point[];
  className?: string;
  allowFullscreenToggle?: boolean;
  showHeatmap?: boolean;
}

export const InteractiveMapCanvas: React.FC<InteractiveMapCanvasProps> = ({
  buildingMap,
  activeFloorId,
  routeResult,
  selectedUnitId,
  onSelectUnit,
  startNodeId,
  targetNodeId,
  isEditorMode = false,
  editorTool = 'select',
  onAddPointToDraft,
  draftPoints = [],
  onCanvasNodeClick,
  selectedNodeId,
  userPosition,
  userHeading = 0,
  autoFollow = false,
  onUserPan,
  traversedPath,
  remainingPath,
  className = '',
  allowFullscreenToggle = true,
  showHeatmap = false,
}) => {
  const currentFloor = buildingMap.floors.find(f => f.id === activeFloorId) || buildingMap.floors[0];
  const unitsOnFloor = buildingMap.units.filter(u => u.floorId === activeFloorId);
  const nodesOnFloor = buildingMap.nodes.filter(n => n.floorId === activeFloorId);
  const edgesOnFloor = buildingMap.edges.filter(e => e.floorId === activeFloorId);

  // Estados de transformação da câmera
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredUnit, setHoveredUnit] = useState<StoreUnit | null>(null);
  const [showNavTip, setShowNavTip] = useState<boolean>(true);
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(showHeatmap);

  useEffect(() => {
    setIsHeatmapActive(showHeatmap);
  }, [showHeatmap]);

  // Refs de controle de gestos e ponteiros
  const containerRef = useRef<HTMLDivElement>(null);
  const pointersMapRef = useRef<Map<number, Point>>(new Map());
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const dragDistanceMovedRef = useRef<number>(0);
  const wasPannedByUserRef = useRef<boolean>(false);

  const currentFloorRouteSegment = routeResult?.floorSegments.find(
    seg => seg.floorId === activeFloorId
  );

  // =========================================================================
  // 1. CÁLCULO DE ENQUADRAMENTO AUTOMÁTICO (AUTO-FIT TO VIEW)
  // =========================================================================
  const fitToView = useCallback((padding = 24) => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth || 360;
    const containerH = containerRef.current.clientHeight || 500;

    const floorW = currentFloor.width || 800;
    const floorH = currentFloor.height || 600;

    const scaleX = (containerW - padding * 2) / floorW;
    const scaleY = (containerH - padding * 2) / floorH;
    const bestScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.8);

    setScale(bestScale);
    setPan({ x: 0, y: 0 });
    wasPannedByUserRef.current = false;
  }, [currentFloor.width, currentFloor.height]);

  // Inicializa enquadramento ao trocar de andar ou mapa
  useEffect(() => {
    // Pequeno delay para garantir que o container calculou seu clientWidth/Height
    const t = setTimeout(() => {
      fitToView(28);
    }, 50);
    return () => clearTimeout(t);
  }, [activeFloorId, buildingMap.id, fitToView]);

  // =========================================================================
  // 2. CÂMERA DE ACOMPANHAMENTO WAZE (AUTO-FOLLOW PUCK)
  // =========================================================================
  useEffect(() => {
    if (userPosition && autoFollow && containerRef.current && !isDragging && !wasPannedByUserRef.current) {
      const containerW = containerRef.current.clientWidth || 360;
      const containerH = containerRef.current.clientHeight || 500;
      const floorW = currentFloor.width || 800;
      const floorH = currentFloor.height || 600;

      // Centraliza a posição do usuário na tela
      const targetPanX = (containerW / 2) - (floorW / 2) - ((userPosition.x - floorW / 2) * scale);
      const targetPanY = (containerH / 2) - (floorH / 2) - ((userPosition.y - floorH / 2) * scale);
      
      setPan({ x: Math.round(targetPanX), y: Math.round(targetPanY) });
    }
  }, [userPosition, autoFollow, scale, currentFloor.width, currentFloor.height, isDragging]);

  // Se autoFollow for religado externamente (ex: botão Recentralizar), reseta a trava de pan do usuário
  useEffect(() => {
    if (autoFollow) {
      wasPannedByUserRef.current = false;
    }
  }, [autoFollow]);

  // =========================================================================
  // 3. ZOOM INTELIGENTE (COM OU SEM PONTO FOCAL)
  // =========================================================================
  const applyZoom = useCallback((delta: number, focalPoint?: { clientX: number; clientY: number }) => {
    setScale(prevScale => {
      const newScale = Math.min(Math.max(Number((prevScale + delta).toFixed(2)), 0.25), 3.5);
      if (newScale === prevScale) return prevScale;

      if (focalPoint && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cursorX = focalPoint.clientX - rect.left - (rect.width / 2);
        const cursorY = focalPoint.clientY - rect.top - (rect.height / 2);

        const factor = newScale / prevScale;
        setPan(prevPan => ({
          x: Math.round(cursorX - (cursorX - prevPan.x) * factor),
          y: Math.round(cursorY - (cursorY - prevPan.y) * factor)
        }));
      }

      return newScale;
    });
  }, []);

  // Zoom pela Roda do Mouse centrado no cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    applyZoom(zoomDelta, { clientX: e.clientX, clientY: e.clientY });
  };

  // =========================================================================
  // 4. SISTEMA UNIVERSAL DE ARRASTO E PINCH (POINTER EVENTS)
  // =========================================================================
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Permite interagir normalmente com botões do HUD flutuante
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.hud-control')) {
      return;
    }

    // Se estiver no editor e com ferramenta ativa de desenhar/adicionar nós, delega
    if (isEditorMode && (editorTool === 'draw_unit' || editorTool === 'add_node')) {
      return;
    }

    const container = containerRef.current;
    if (container) {
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // fallback se falhar setPointerCapture
      }
    }

    pointersMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragDistanceMovedRef.current = 0;

    // Se for o 1º dedo/mouse
    if (pointersMapRef.current.size === 1) {
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: pan.x,
        panY: pan.y
      };
      setIsDragging(true);
    } 
    // Se for o 2º dedo (início de Pinch-to-zoom)
    else if (pointersMapRef.current.size === 2) {
      const pts = Array.from(pointersMapRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchDistanceRef.current = dist;
      initialPinchScaleRef.current = scale;
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersMapRef.current.has(e.pointerId)) return;

    // Atualiza posição do ponteiro
    pointersMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Cenário 1: Pinch-to-zoom com 2 dedos
    if (pointersMapRef.current.size === 2 && initialPinchDistanceRef.current !== null) {
      const pts = Array.from(pointersMapRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = currentDist / initialPinchDistanceRef.current;
      const targetScale = Math.min(Math.max(initialPinchScaleRef.current * ratio, 0.25), 3.5);
      setScale(Number(targetScale.toFixed(2)));
      wasPannedByUserRef.current = true;
      onUserPan?.();
      return;
    }

    // Cenário 2: Pan regular com 1 ponteiro (mouse ou 1 dedo)
    if (pointersMapRef.current.size === 1) {
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;
      dragDistanceMovedRef.current += Math.hypot(dx, dy);

      // Limiar para diferenciar clique de arrasto
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3 || dragDistanceMovedRef.current > 4) {
        if (!wasPannedByUserRef.current) {
          wasPannedByUserRef.current = true;
          onUserPan?.();
        }
      }

      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersMapRef.current.delete(e.pointerId);

    const container = containerRef.current;
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (pointersMapRef.current.size === 0) {
      setIsDragging(false);
      initialPinchDistanceRef.current = null;
    } else if (pointersMapRef.current.size === 1) {
      // Se sobrou 1 dedo após soltar o outro, reseta referência de pan
      const remainingPt = Array.from(pointersMapRef.current.values())[0];
      dragStartRef.current = {
        clientX: remainingPt.x,
        clientY: remainingPt.y,
        panX: pan.x,
        panY: pan.y
      };
      initialPinchDistanceRef.current = null;
    }
  };

  // Clique no canvas (trata criação de nós no Map Studio)
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Se houve arrasto superior a 5px, não trata como clique no mapa
    if (dragDistanceMovedRef.current > 6) {
      return;
    }

    if (isEditorMode && onAddPointToDraft) {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      const x = Math.round((clientX / rect.width) * currentFloor.width);
      const y = Math.round((clientY / rect.height) * currentFloor.height);

      if (x >= 0 && x <= currentFloor.width && y >= 0 && y <= currentFloor.height) {
        onAddPointToDraft({ x, y });
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full min-h-[360px] bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none min-h-screen' : ''
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ 
        cursor: isDragging ? 'grabbing' : isEditorMode && editorTool !== 'select' ? 'crosshair' : 'grab',
        touchAction: 'none'
      }}
    >
      {/* ========================================================================= */}
      {/* HUD 1: CONTROLES FLUTUANTES SUPERIORES (ZOOM, ENQUADRAMENTO & TELA CHEIA) */}
      {/* ========================================================================= */}
      <div className="absolute top-3.5 right-3.5 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl hud-control">
        <button 
          onClick={() => applyZoom(0.25)} 
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 active:scale-95 rounded-xl text-slate-300 hover:text-white transition-all"
          title="Aproximar (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button 
          onClick={() => applyZoom(-0.25)} 
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 active:scale-95 rounded-xl text-slate-300 hover:text-white transition-all"
          title="Afastar (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-slate-800 mx-auto my-0.5" />

        {/* Indicador e Reset de Zoom para 100% */}
        <button
          onClick={() => setScale(1)}
          className="w-8 h-6 flex items-center justify-center hover:bg-slate-800 rounded-lg text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          title="Zoom 100%"
        >
          {Math.round(scale * 100)}%
        </button>

        {/* Enquadrar Tudo / Fit to View */}
        <button 
          onClick={() => fitToView(24)} 
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 active:scale-95 rounded-xl text-slate-300 hover:text-white transition-all"
          title="Enquadrar planta inteira (Visão Panorâmica)"
        >
          <Scan className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Camada de Calor / Heatmap (Passo 3: BI Operacional) */}
        <button 
          onClick={() => setIsHeatmapActive(!isHeatmapActive)} 
          className={`w-8 h-8 flex items-center justify-center active:scale-95 rounded-xl transition-all ${
            isHeatmapActive 
              ? 'bg-amber-500/25 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/30' 
              : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title={isHeatmapActive ? 'Ocultar Mapa de Calor (BI)' : 'Ativar Mapa de Calor de Tráfego (BI)'}
        >
          <Flame className={`w-4 h-4 ${isHeatmapActive ? 'text-amber-400 animate-pulse' : ''}`} />
        </button>

        {/* Alternar Tela Cheia */}
        {allowFullscreenToggle && (
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 active:scale-95 rounded-xl text-slate-300 hover:text-white transition-all"
            title={isFullscreen ? 'Reduzir tela cheia' : 'Expandir mapa em tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* HUD 2: BADGE DO ANDAR & BÚSSOLA */}
      {/* ========================================================================= */}
      <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-xs shadow-xl hud-control">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-extrabold text-slate-100">
          {currentFloor.name}
        </span>
        <span className="text-slate-500 font-mono text-[11px]">| {buildingMap.name}</span>

        {/* Indicador do Norte Magnético */}
        <div 
          className="ml-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-center cursor-pointer hover:border-slate-700" 
          title="Norte Geográfico"
          onClick={() => setPan({ x: 0, y: 0 })}
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HUD 3: DICA RÁPIDA DE NAVEGAÇÃO PRO (DISCRETA NO RODAPÉ) */}
      {/* ========================================================================= */}
      {showNavTip && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 shadow-lg pointer-events-auto">
          <Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span><strong>Navegar:</strong> Arraste livremente • Roda do mouse para zoom</span>
          <button 
            onClick={() => setShowNavTip(false)}
            className="ml-1.5 text-slate-500 hover:text-slate-300 font-bold"
            title="Fechar dica"
          >
            ✕
          </button>
        </div>
      )}

      {/* Legenda do Heatmap de Tráfego (Passo 3) */}
      {isHeatmapActive && (
        <div className="absolute bottom-3 right-3 z-20 bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-500/40 shadow-2xl flex items-center gap-3 text-xs hud-control">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Calor / BI:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-400 font-semibold">Livre</span>
            <div className="w-16 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
            <span className="text-[10px] text-red-400 font-bold">Gargalo</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SVG PRINCIPAL: RENDERIZAÇÃO 2.5D DA PLANTA BAIXA & CAMADAS */}
      {/* ========================================================================= */}
      <svg
        id="map-canvas-svg"
        width={currentFloor.width}
        height={currentFloor.height}
        viewBox={`0 0 ${currentFloor.width} ${currentFloor.height}`}
        onClick={handleCanvasClick}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform'
        }}
        className="rounded-2xl border border-slate-800 shadow-2xl bg-slate-950 overflow-visible pointer-events-auto"
      >
        <defs>
          <pattern id="canvas-grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
          </pattern>

          {/* Gradientes Térmicos para o Heatmap Operacional */}
          <radialGradient id="heat-glow-red" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.82" />
            <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="80%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heat-glow-amber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fundo com Grade Arquitetônica Suave */}
        <rect width={currentFloor.width} height={currentFloor.height} fill="url(#canvas-grid-pattern)" />

        {/* Paredes perimetrais se não houver imagem de fundo */}
        {!currentFloor.backgroundImage && (
          <rect
            x="20"
            y="20"
            width={currentFloor.width - 40}
            height={currentFloor.height - 40}
            rx="18"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="3"
          />
        )}

        {/* Imagem Oficial da Planta Baixa (Ex: Bangu Shopping) */}
        {currentFloor.backgroundImage && (
          <image
            href={currentFloor.backgroundImage}
            x="0"
            y="0"
            width={currentFloor.width}
            height={currentFloor.height}
            opacity={currentFloor.backgroundOpacity ?? 0.95}
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        {/* ======================================================================= */}
        {/* CAMADA DE CALOR: HEATMAP DE TRÁFEGO OPERACIONAL & GARGALOS (PASSO 3) */}
        {/* ======================================================================= */}
        {isHeatmapActive && (
          <g id="heatmap-layer" className="pointer-events-none">
            {nodesOnFloor.map((node, i) => {
              const isHighTraffic = node.type === 'entrance' || 
                                    node.label?.includes('Praça') || 
                                    node.label?.includes('Outback') || 
                                    node.label?.includes('Feira') ||
                                    node.id.includes('outback');
              const isMediumTraffic = node.type === 'corridor' && (i % 2 === 0);
              const radius = isHighTraffic ? 75 : isMediumTraffic ? 46 : 28;

              return (
                <circle
                  key={`heat-${node.id}`}
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={isHighTraffic ? 'url(#heat-glow-red)' : 'url(#heat-glow-amber)'}
                />
              );
            })}
          </g>
        )}

        {/* ======================================================================= */}
        {/* CAMADA 1: ARESTAS / CORREDORES DE SERVIÇO & CLIENTE */}
        {/* ======================================================================= */}
        <g id="edges-layer" className="pointer-events-none">
          {edgesOnFloor.map(edge => {
            const nodeA = buildingMap.nodes.find(n => n.id === edge.nodeA);
            const nodeB = buildingMap.nodes.find(n => n.id === edge.nodeB);
            if (!nodeA || !nodeB) return null;

            const isCourierRoute = edge.courierOnly;

            return (
              <line
                key={edge.id}
                x1={nodeA.x}
                y1={nodeA.y}
                x2={nodeB.x}
                y2={nodeB.y}
                stroke={isCourierRoute ? '#f59e0b' : '#334155'}
                strokeWidth={isCourierRoute ? '4' : '2.5'}
                strokeDasharray={isCourierRoute ? '6 4' : 'none'}
                opacity={isCourierRoute ? 0.75 : 0.35}
              />
            );
          })}
        </g>

        {/* ======================================================================= */}
        {/* CAMADA 2: UNIDADES / LOJAS / RESTAURANTES */}
        {/* ======================================================================= */}
        <g id="units-layer">
          {unitsOnFloor.map(unit => {
            const isSelected = selectedUnitId === unit.id;
            const isHovered = hoveredUnit?.id === unit.id;
            const pointsString = unit.polygon.map(p => `${p.x},${p.y}`).join(' ');

            const avgX = unit.polygon.reduce((acc, p) => acc + p.x, 0) / (unit.polygon.length || 1);
            const avgY = unit.polygon.reduce((acc, p) => acc + p.y, 0) / (unit.polygon.length || 1);

            return (
              <g 
                key={unit.id}
                className="cursor-pointer transition-all duration-200"
                onClick={(e) => {
                  // Só dispara seleção se não foi um arrasto significativo
                  if (dragDistanceMovedRef.current <= 6) {
                    e.stopPropagation();
                    onSelectUnit?.(unit);
                  }
                }}
                onMouseEnter={() => setHoveredUnit(unit)}
                onMouseLeave={() => setHoveredUnit(null)}
              >
                <polygon
                  points={pointsString}
                  fill={
                    currentFloor.backgroundImage
                      ? isSelected 
                        ? 'rgba(6, 182, 212, 0.45)' 
                        : isHovered 
                        ? 'rgba(59, 130, 246, 0.28)' 
                        : 'rgba(255, 255, 255, 0.02)'
                      : isSelected 
                      ? 'rgba(6, 182, 212, 0.35)' 
                      : isHovered 
                      ? 'rgba(51, 65, 85, 0.45)' 
                      : '#0f172a'
                  }
                  stroke={isSelected ? '#06b6d4' : isHovered ? '#38bdf8' : currentFloor.backgroundImage ? 'rgba(56, 189, 248, 0.3)' : (unit.color || '#3b82f6')}
                  strokeWidth={isSelected ? '3.5' : isHovered ? '2.5' : '1.5'}
                  strokeDasharray={currentFloor.backgroundImage && !isSelected && !isHovered ? '3 3' : 'none'}
                />

                {/* Rótulo estilizado da loja */}
                {(!currentFloor.backgroundImage || isSelected || isHovered || isEditorMode) && (
                  <>
                    {unit.code && (
                      <text
                        x={avgX}
                        y={avgY - 10}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="10"
                        fontWeight="600"
                        className="pointer-events-none select-none"
                      >
                        {unit.code}
                      </text>
                    )}

                    <text
                      x={avgX}
                      y={avgY + 6}
                      textAnchor="middle"
                      fill={isSelected ? '#38bdf8' : '#f1f5f9'}
                      fontSize="12"
                      fontWeight="700"
                      className="pointer-events-none select-none drop-shadow"
                    >
                      {unit.name}
                    </text>
                  </>
                )}

                {/* Badge de Delivery / Balcão de Motoboy */}
                {unit.courierPickup && unit.courierPickup.isRestricted && (
                  <g transform={`translate(${avgX - 16}, ${avgY + 16})`}>
                    <rect x="0" y="0" width="32" height="13" rx="3" fill="#f59e0b" />
                    <text x="16" y="9.5" textAnchor="middle" fill="#000" fontSize="8" fontWeight="800">
                      DELIVERY
                    </text>
                  </g>
                )}

                {/* Ponto da porta */}
                {unit.door && (
                  <circle
                    cx={unit.door.x}
                    cy={unit.door.y}
                    r="4"
                    fill={isSelected ? '#06b6d4' : '#10b981'}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* ======================================================================= */}
        {/* CAMADA 3: POLÍGONO EM CONSTRUÇÃO NO STUDIO (DRAFT) */}
        {/* ======================================================================= */}
        {isEditorMode && draftPoints.length > 0 && (
          <g id="draft-polygon">
            {draftPoints.length > 1 && (
              <polyline
                points={draftPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}
            {draftPoints.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
          </g>
        )}

        {/* ======================================================================= */}
        {/* CAMADA 4: ROTA CALCULADA DINÂMICA (DIJKSTRA & WAZE) */}
        {/* ======================================================================= */}
        {/* Trecho já percorrido pelo usuário */}
        {traversedPath && traversedPath.length > 1 && (
          <polyline
            points={traversedPath.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(148, 163, 184, 0.45)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Trecho restante à frente (estilo Waze com efeito Neon) */}
        {remainingPath && remainingPath.length > 1 ? (
          <g id="route-remaining-layer">
            <polyline
              points={remainingPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(6, 182, 212, 0.28)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={remainingPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="9 5"
              className="route-line"
            />
          </g>
        ) : (
          currentFloorRouteSegment && currentFloorRouteSegment.points.length > 1 && (
            <g id="route-path-layer">
              <polyline
                points={currentFloorRouteSegment.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(37, 99, 235, 0.3)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={currentFloorRouteSegment.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#2563eb"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 5"
                className="route-line"
              />
            </g>
          )
        )}

        {/* ======================================================================= */}
        {/* CAMADA 5: PUCK DO USUÁRIO ESTILO WAZE (RADAR & SETA DIRECIONAL) */}
        {/* ======================================================================= */}
        {userPosition && (
          <g transform={`translate(${userPosition.x}, ${userPosition.y})`} className="pointer-events-none">
            {/* Pulso radar animado */}
            <circle r="26" fill="none" stroke="#06b6d4" strokeWidth="2" className="pulse-ring origin-center opacity-80" />
            <circle r="36" fill="rgba(6, 182, 212, 0.15)" />
            
            {/* Círculo base do entregador/cliente com borda branca */}
            <circle r="13" fill="#0891b2" stroke="#ffffff" strokeWidth="2.5" />
            
            {/* Seta direcional estilizada que aponta para onde está andando */}
            <g transform={`rotate(${userHeading || 0})`}>
              <polygon points="0,-17 7,-4 0,-9 -7,-4" fill="#ffffff" />
            </g>
          </g>
        )}

        {/* ======================================================================= */}
        {/* CAMADA 6: NÓS DE NAVEGAÇÃO, PORTÕES & CONECTORES */}
        {/* ======================================================================= */}
        <g id="nodes-layer">
          {nodesOnFloor.map(node => {
            const isStart = node.id === startNodeId;
            const isTarget = node.id === targetNodeId;
            const isSelected = node.id === selectedNodeId;
            const isConnector = !!node.connectorId;

            return (
              <g 
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={(e) => {
                  if (dragDistanceMovedRef.current <= 6) {
                    e.stopPropagation();
                    onCanvasNodeClick?.(node.id);
                  }
                }}
              >
                {isStart && (
                  <circle
                    r="15"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="pulse-ring origin-center"
                  />
                )}

                <circle
                  r={isStart || isTarget ? '8.5' : isConnector ? '7' : isEditorMode ? '5.5' : '4'}
                  fill={
                    isStart 
                      ? '#10b981' 
                      : isTarget 
                      ? '#ef4444' 
                      : isSelected 
                      ? '#38bdf8' 
                      : isConnector 
                      ? '#8b5cf6' 
                      : node.type === 'entrance' 
                      ? '#2563eb' 
                      : '#475569'
                  }
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {(isStart || isTarget || node.label) && (
                  <text
                    y={isStart || isTarget ? -12 : -8}
                    textAnchor="middle"
                    fill={isStart ? '#34d399' : isTarget ? '#f87171' : '#cbd5e1'}
                    fontSize="9"
                    fontWeight="700"
                    className="pointer-events-none drop-shadow"
                  >
                    {isStart ? 'PARTIDA' : isTarget ? 'DESTINO' : isEditorMode ? node.label : ''}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip Hover Loja */}
      {hoveredUnit && !isEditorMode && !isDragging && (
        <div className="absolute bottom-3 right-3 z-20 max-w-xs bg-slate-950/95 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-2xl flex items-start gap-2.5 hud-control">
          <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs text-white">{hoveredUnit.name}</h4>
              {hoveredUnit.code && (
                <span className="text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-mono">
                  {hoveredUnit.code}
                </span>
              )}
            </div>
            {hoveredUnit.courierPickup && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                <span>{hoveredUnit.courierPickup.windowName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
