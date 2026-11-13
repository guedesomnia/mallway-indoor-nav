import type { BuildingMap, WayNode } from '../types/map';

export const MIN_CALIBRATION_PX = 60; // pontos muito próximos tornam a escala sensível a erro de clique
export const MIN_MPP = 0.02;
export const MAX_MPP = 2;

export function pixelDistance(a: WayNode, b: WayNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export type CalibrationCheck = { ok: true; metersPerPixel: number } | { ok: false; reason: string };

/** Escala a partir de dois pontos do piso cuja distância real (em metros) a pessoa conhece. */
export function computeScale(a: WayNode | undefined, b: WayNode | undefined, realMeters: number): CalibrationCheck {
  if (!a || !b) return { ok: false, reason: 'Escolha os dois pontos de referência.' };
  if (a.id === b.id) return { ok: false, reason: 'Escolha dois pontos diferentes.' };
  if (a.floorId !== b.floorId) return { ok: false, reason: 'Os dois pontos precisam estar no mesmo piso.' };
  if (!Number.isFinite(realMeters) || realMeters <= 0) return { ok: false, reason: 'Informe a distância real em metros.' };
  const px = pixelDistance(a, b);
  if (px < MIN_CALIBRATION_PX) {
    return { ok: false, reason: `Os pontos estão muito perto (${Math.round(px)} px). Use pontos mais afastados para a medida ficar confiável.` };
  }
  const mpp = realMeters / px;
  if (mpp < MIN_MPP || mpp > MAX_MPP) {
    return { ok: false, reason: `Escala de ${mpp.toFixed(3)} m por pixel é implausível. Confira a distância informada.` };
  }
  return { ok: true, metersPerPixel: mpp };
}

/**
 * Aplica a escala ao piso e recalcula a distância de todas as arestas daquele piso pela geometria.
 * Sem o recálculo, as distâncias antigas (baseadas na constante antiga de 4 px/m) continuariam erradas.
 */
export function calibrateFloor(map: BuildingMap, floorId: string, metersPerPixel: number): BuildingMap {
  const nodes = new Map(map.nodes.map((n) => [n.id, n]));
  return {
    ...map,
    floors: map.floors.map((f) =>
      f.id === floorId ? { ...f, metersPerPixel: Math.round(metersPerPixel * 100000) / 100000, scaleCalibrated: true } : f,
    ),
    edges: map.edges.map((e) => {
      const a = nodes.get(e.nodeA);
      const b = nodes.get(e.nodeB);
      if (!a || !b || a.floorId !== floorId || b.floorId !== floorId) return e;
      return { ...e, distance: Math.max(0.1, Math.round(pixelDistance(a, b) * metersPerPixel * 10) / 10) };
    }),
  };
}
