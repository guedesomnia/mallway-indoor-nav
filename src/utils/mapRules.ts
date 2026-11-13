// Regras de mapa compartilhadas pelo app. Espelham server/app/graph.py: mudar aqui exige mudar lá.
import type { BuildingMap, FloorLevel, StoreUnit, WayNode } from '../types/map';

export const ENTRY_TYPES: ReadonlyArray<WayNode['type']> = ['entrance', 'courier_parking', 'qr_anchor'];
const SNAPPABLE_TYPES: ReadonlyArray<WayNode['type']> = ['corridor', 'entrance', 'courier_parking', 'dock', 'qr_anchor'];
export const DOOR_SNAP_PX = 40;
// Constante que o editor antigo usava (distância_px / 4). Só vale para mapas ainda não calibrados.
export const LEGACY_METERS_PER_PIXEL = 0.25;

export function isEntryNode(n: WayNode): boolean {
  return ENTRY_TYPES.includes(n.type);
}

/** Pontos de partida/QR do shopping, em ordem estável: pontos de motoboy primeiro (público principal do app). */
export function listEntrances(map: BuildingMap): WayNode[] {
  const rank = (n: WayNode) => (n.type === 'courier_parking' ? 0 : n.type === 'entrance' ? 1 : 2);
  return map.nodes.filter(isEntryNode).sort((a, b) => rank(a) - rank(b));
}

export function metersPerPixel(floor: FloorLevel | undefined): number {
  const v = floor?.metersPerPixel;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : LEGACY_METERS_PER_PIXEL;
}

/**
 * Nó do grafo que representa a porta da loja: ligação explícita, ou o nó transitável mais próximo da porta
 * (até DOOR_SNAP_PX). Devolve null quando não há ligação confiável — nunca "chuta" outro destino.
 */
export function resolveUnitDoorNode(map: BuildingMap, unit: StoreUnit): WayNode | null {
  if (unit.doorNodeId) {
    return map.nodes.find((n) => n.id === unit.doorNodeId) ?? null;
  }
  let best: { d: number; node: WayNode } | null = null;
  for (const n of map.nodes) {
    if (n.floorId !== unit.floorId || !SNAPPABLE_TYPES.includes(n.type)) continue;
    const d = Math.hypot(n.x - unit.door.x, n.y - unit.door.y);
    if (!best || d < best.d) best = { d, node: n };
  }
  return best && best.d <= DOOR_SNAP_PX ? best.node : null;
}

/** Acha a loja do mapa a partir do id usado nas telas (Restaurant.id == StoreUnit.id). */
export function findUnit(map: BuildingMap, unitId: string): StoreUnit | undefined {
  return map.units.find((u) => u.id === unitId);
}
