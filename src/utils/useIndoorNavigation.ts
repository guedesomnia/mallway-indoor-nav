import { useState, useEffect, useRef, useCallback } from 'react';
import { RouteResult, Point } from '../types/map';

export interface IndoorNavState {
  currentPosition: Point | null;
  heading: number; // Ângulo em graus
  currentStepIndex: number;
  remainingDistanceMeters: number;
  remainingTimeMinutes: number;
  progressPercent: number;
  isMoving: boolean;
  speedKmh: number;
  isSimulating: boolean;
  sensorActive: boolean;
  stepsDetectedCount: number;
  traversedPath: Point[];
  remainingPath: Point[];
  autoFollow: boolean;
  simulationSpeed: number;
  hasArrived: boolean;
}

export function useIndoorNavigation(
  routeResult: RouteResult | null,
  activeFloorId: string,
  onArrival?: () => void
) {
  // Coleta todos os pontos do piso ativo
  const floorSegment = routeResult?.floorSegments.find(s => s.floorId === activeFloorId);
  const rawPoints = floorSegment?.points || [];

  const [currentPosition, setCurrentPosition] = useState<Point | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.5); // 1.5x velocidade
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [stepsDetectedCount, setStepsDetectedCount] = useState<number>(0);
  const [traversedPath, setTraversedPath] = useState<Point[]>([]);
  const [remainingPath, setRemainingPath] = useState<Point[]>([]);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [hasArrived, setHasArrived] = useState<boolean>(false);

  // Distância acumulada percorrida em pixels no SVG
  const distanceTraveledPxRef = useRef<number>(0);
  const totalLengthPxRef = useRef<number>(0);
  const lastStepTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Calcula comprimentos de segmentos
  const segmentLengthsRef = useRef<number[]>([]);
  const cumulativeLengthsRef = useRef<number[]>([]);

  // Inicializa quando a rota muda
  useEffect(() => {
    if (rawPoints.length < 2) {
      setCurrentPosition(null);
      setTraversedPath([]);
      setRemainingPath([]);
      setRemainingDistance(0);
      setProgressPercent(0);
      setHasArrived(false);
      return;
    }

    let totalPx = 0;
    const segs: number[] = [];
    const cum: number[] = [0];

    for (let i = 0; i < rawPoints.length - 1; i++) {
      const p1 = rawPoints[i];
      const p2 = rawPoints[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segs.push(dist);
      totalPx += dist;
      cum.push(totalPx);
    }

    segmentLengthsRef.current = segs;
    cumulativeLengthsRef.current = cum;
    totalLengthPxRef.current = totalPx;
    distanceTraveledPxRef.current = 0;

    setCurrentPosition(rawPoints[0]);
    setTraversedPath([rawPoints[0]]);
    setRemainingPath(rawPoints);

    // Ângulo inicial
    if (rawPoints.length >= 2) {
      const dx = rawPoints[1].x - rawPoints[0].x;
      const dy = rawPoints[1].y - rawPoints[0].y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      setHeading(angle);
    }

    const totalMeters = routeResult?.totalDistanceMeters || 100;
    setRemainingDistance(totalMeters);
    setRemainingTime(routeResult?.estimatedMinutes || 2);
    setProgressPercent(0);
    setCurrentStepIndex(0);
    setHasArrived(false);
    setIsMoving(false);
  }, [routeResult, activeFloorId]);

  // Função para interpolar posição baseada na distância percorrida
  const updatePositionAtDistance = useCallback((distPx: number) => {
    if (rawPoints.length < 2 || totalLengthPxRef.current === 0) return;

    const clampedDist = Math.max(0, Math.min(distPx, totalLengthPxRef.current));
    const cum = cumulativeLengthsRef.current;
    
    // Acha o segmento atual
    let segIdx = 0;
    while (segIdx < cum.length - 1 && cum[segIdx + 1] < clampedDist) {
      segIdx++;
    }

    if (segIdx >= rawPoints.length - 1) {
      // Chegou ao fim da rota
      const lastPoint = rawPoints[rawPoints.length - 1];
      setCurrentPosition(lastPoint);
      setTraversedPath(rawPoints);
      setRemainingPath([lastPoint]);
      setProgressPercent(100);
      setRemainingDistance(0);
      setRemainingTime(0);
      setIsMoving(false);
      setIsSimulating(false);
      setHasArrived(true);
      if (onArrival) onArrival();
      return;
    }

    const pStart = rawPoints[segIdx];
    const pEnd = rawPoints[segIdx + 1];
    const segLength = segmentLengthsRef.current[segIdx];
    const distInSeg = clampedDist - cum[segIdx];
    const t = segLength > 0 ? distInSeg / segLength : 0;

    const currX = Math.round(pStart.x + (pEnd.x - pStart.x) * t);
    const currY = Math.round(pStart.y + (pEnd.y - pStart.y) * t);
    const pos: Point = { x: currX, y: currY };

    // Calcula direção (heading)
    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

    setCurrentPosition(pos);
    setHeading(angle);

    // Caminho percorrido e restante
    const traversed = [...rawPoints.slice(0, segIdx + 1), pos];
    const remaining = [pos, ...rawPoints.slice(segIdx + 1)];
    setTraversedPath(traversed);
    setRemainingPath(remaining);

    // Atualiza progresso e métricas
    const progress = (clampedDist / totalLengthPxRef.current);
    setProgressPercent(Math.round(progress * 100));

    const totalMeters = routeResult?.totalDistanceMeters || 120;
    const remMeters = Math.max(0, Math.round(totalMeters * (1 - progress)));
    setRemainingDistance(remMeters);
    setRemainingTime(Math.max(1, Math.ceil(remMeters / 60)));

    // Atualiza etapa das instruções
    if (routeResult && routeResult.instructions.length > 0) {
      const stepIdx = Math.min(
        routeResult.instructions.length - 1,
        Math.floor(progress * routeResult.instructions.length)
      );
      setCurrentStepIndex(stepIdx);
    }
  }, [rawPoints, routeResult, onArrival]);

  // Avançar manualmente ou por passo físico
  const stepForward = useCallback((meters: number = 1.0) => {
    if (totalLengthPxRef.current === 0) return;
    const totalMeters = routeResult?.totalDistanceMeters || 120;
    const pxPerMeter = totalLengthPxRef.current / totalMeters;
    const deltaPx = meters * pxPerMeter;

    distanceTraveledPxRef.current += deltaPx;
    updatePositionAtDistance(distanceTraveledPxRef.current);

    setIsMoving(true);
    setSpeedKmh(4.5);

    // Haptic feedback suave ao dar passo
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(35); } catch { /* ignore */ }
    }
  }, [routeResult, updatePositionAtDistance]);

  // Loop de Simulação de Caminhada (Waze Auto-Walk)
  useEffect(() => {
    if (!isSimulating) {
      lastTimestampRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const walkingSpeedMps = 1.35 * simulationSpeed; // metros por segundo
    const totalMeters = routeResult?.totalDistanceMeters || 120;
    const pxPerMeter = totalLengthPxRef.current > 0 && totalMeters > 0 
      ? totalLengthPxRef.current / totalMeters 
      : 1;

    setIsMoving(true);
    setSpeedKmh(Math.round(walkingSpeedMps * 3.6));

    const tick = (now: number) => {
      if (lastTimestampRef.current !== null) {
        const dtSeconds = (now - lastTimestampRef.current) / 1000;
        const deltaMeters = walkingSpeedMps * dtSeconds;
        distanceTraveledPxRef.current += deltaMeters * pxPerMeter;

        updatePositionAtDistance(distanceTraveledPxRef.current);

        if (distanceTraveledPxRef.current >= totalLengthPxRef.current) {
          setIsSimulating(false);
          setIsMoving(false);
          setSpeedKmh(0);
          return;
        }
      }
      lastTimestampRef.current = now;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, simulationSpeed, routeResult, updatePositionAtDistance]);

  // Sensores Reais do Celular (Acelerômetro e Bússola)
  useEffect(() => {
    if (!sensorActive || typeof window === 'undefined') return;

    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const mag = Math.hypot(acc.x, acc.y, acc.z);
      const delta = Math.abs(mag - 9.8); // Subtrai a gravidade terrestre

      const now = Date.now();
      // Limiar de pico de passo (passada humana) com debounce de 360ms
      if (delta > 2.2 && now - lastStepTimeRef.current > 360) {
        lastStepTimeRef.current = now;
        setStepsDetectedCount(prev => prev + 1);
        stepForward(0.85); // Avança ~0.85m por passo
      }
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // @ts-expect-error webkitCompassHeading existe no Safari iOS
      if (typeof e.webkitCompassHeading === 'number') {
        // @ts-expect-error webkitCompassHeading
        setHeading(e.webkitCompassHeading);
      } else if (e.alpha !== null) {
        setHeading(360 - e.alpha);
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sensorActive, stepForward]);

  // Solicitar permissão de sensores para iOS Safari
  const requestSensorPermission = async () => {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      // @ts-expect-error requestPermission é da API do iOS 13+
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      try {
        // @ts-expect-error requestPermission
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm === 'granted') {
          setSensorActive(true);
        } else {
          alert('Permissão de movimento necessária para navegação indoor.');
        }
      } catch (err) {
        console.warn('Erro ao pedir permissão de sensor:', err);
      }
    } else {
      // Android e navegadores padrão que não exigem permissão explícita
      setSensorActive(true);
    }
  };

  const startSimulation = () => setIsSimulating(true);
  const pauseSimulation = () => {
    setIsSimulating(false);
    setIsMoving(false);
    setSpeedKmh(0);
  };

  const recenter = () => setAutoFollow(true);

  const reset = () => {
    distanceTraveledPxRef.current = 0;
    updatePositionAtDistance(0);
    setIsSimulating(false);
    setIsMoving(false);
    setSpeedKmh(0);
    setAutoFollow(true);
    setHasArrived(false);
  };

  return {
    currentPosition,
    heading,
    currentStepIndex,
    remainingDistanceMeters: remainingDistance,
    remainingTimeMinutes: remainingTime,
    progressPercent,
    isMoving,
    speedKmh,
    isSimulating,
    simulationSpeed,
    setSimulationSpeed,
    sensorActive,
    stepsDetectedCount,
    traversedPath,
    remainingPath,
    autoFollow,
    setAutoFollow,
    hasArrived,
    stepForward,
    startSimulation,
    pauseSimulation,
    requestSensorPermission,
    recenter,
    reset
  };
}
