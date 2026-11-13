import { 
  BuildingMap, 
  UserProfile, 
  RouteResult, 
  RouteInstruction, 
  WayNode, 
  Point 
} from '../types/map';

interface GraphEdge {
  targetNodeId: string;
  weight: number; // custo usado para escolher o caminho (inclui descontos/penalidades)
  meters: number; // distância física real percorrida (0 em conexões verticais)
  isVertical: boolean;
  connectorName?: string;
  connectorType?: 'elevator' | 'escalator' | 'stairs' | 'ramp';
  targetFloorId: string;
}


interface HeapItem {
  nodeId: string;
  dist: number;
}

class MinHeap {
  private a: HeapItem[] = [];
  get length(): number {
    return this.a.length;
  }
  push(item: HeapItem): void {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].dist <= a[i].dist) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): HeapItem | undefined {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].dist < a[m].dist) m = l;
        if (r < a.length && a[r].dist < a[m].dist) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function buildGraph(
  map: BuildingMap,
  profile: UserProfile,
  accessibleOnly: boolean
): { nodeMap: Map<string, WayNode>; adj: Map<string, GraphEdge[]> } {
  const nodeMap = new Map<string, WayNode>();
  map.nodes.forEach(n => nodeMap.set(n.id, n));

  // Montar lista de adjacência
  const adj = new Map<string, GraphEdge[]>();
  map.nodes.forEach(n => adj.set(n.id, []));

  // 1. Adicionar arestas normais do piso
  map.edges.forEach(edge => {
    // Restrição de cliente em áreas exclusivas de entregador/serviço
    if (profile === 'customer' && edge.courierOnly) {
      return;
    }
    // Restrição de acessibilidade (evitar degraus)
    if (accessibleOnly && edge.accessible === false) {
      return;
    }

    const nodeA = nodeMap.get(edge.nodeA);
    const nodeB = nodeMap.get(edge.nodeB);
    if (!nodeA || !nodeB) return;

    // Se entregador estiver usando corredor de serviço, damos um leve desconto de "prioridade operacional"
    let weight = edge.distance;
    if (profile === 'courier' && edge.courierOnly) {
      weight = edge.distance * 0.85; // Favorece corredor rápido sem clientes no caminho
    }

    adj.get(edge.nodeA)?.push({
      targetNodeId: edge.nodeB,
      weight,
      meters: edge.distance,
      isVertical: false,
      targetFloorId: nodeB.floorId
    });

    adj.get(edge.nodeB)?.push({
      targetNodeId: edge.nodeA,
      weight,
      meters: edge.distance,
      isVertical: false,
      targetFloorId: nodeA.floorId
    });
  });

  // 2. Adicionar conexões verticais (Elevadores, Escadas Rolantes, etc.)
  map.verticalConnectors.forEach(vc => {
    if (accessibleOnly && !vc.accessible) return;
    if (profile === 'courier' && !vc.courierAllowed) return;

    // Conectar todos os pares de andares atendidos pelo conector
    for (let i = 0; i < vc.connections.length; i++) {
      for (let j = 0; j < vc.connections.length; j++) {
        if (i !== j) {
          const connFrom = vc.connections[i];
          const connTo = vc.connections[j];

          const nodeFrom = nodeMap.get(connFrom.nodeId);
          const nodeTo = nodeMap.get(connTo.nodeId);
          if (!nodeFrom || !nodeTo) continue;

          // Custo da transição vertical
          let verticalWeight = 20;
          if (vc.type === 'stairs') verticalWeight = 30;
          if (vc.type === 'escalator') verticalWeight = 22;

          adj.get(connFrom.nodeId)?.push({
            targetNodeId: connTo.nodeId,
            weight: verticalWeight,
            meters: 0,
            isVertical: true,
            connectorName: vc.name,
            connectorType: vc.type,
            targetFloorId: connTo.floorId
          });
        }
      }
    }
  });

  return { nodeMap, adj };
}

/**
 * Metros reais a pé do ponto de partida até cada nó alcançável (uma única busca), seguindo o caminho de menor
 * custo. Usado nas listas de lojas para mostrar distância real em vez de um número fixo cadastrado.
 */
export function routeDistancesFrom(
  map: BuildingMap,
  startNodeId: string,
  profile: UserProfile = 'courier',
  accessibleOnly: boolean = false
): Map<string, number> {
  const { nodeMap, adj } = buildGraph(map, profile, accessibleOnly);
  const meters = new Map<string, number>();
  if (!nodeMap.has(startNodeId)) return meters;
  const cost = new Map<string, number>([[startNodeId, 0]]);
  meters.set(startNodeId, 0);
  const heap = new MinHeap();
  heap.push({ nodeId: startNodeId, dist: 0 });
  while (heap.length > 0) {
    const { nodeId, dist: d } = heap.pop()!;
    if (d > (cost.get(nodeId) ?? Infinity)) continue;
    for (const e of adj.get(nodeId) ?? []) {
      const nd = d + e.weight;
      if (nd < (cost.get(e.targetNodeId) ?? Infinity)) {
        cost.set(e.targetNodeId, nd);
        meters.set(e.targetNodeId, (meters.get(nodeId) ?? 0) + e.meters);
        heap.push({ nodeId: e.targetNodeId, dist: nd });
      }
    }
  }
  return meters;
}

export function calculateIndoorRoute(
  map: BuildingMap,
  startNodeId: string,
  targetNodeId: string,
  profile: UserProfile = 'courier',
  accessibleOnly: boolean = false
): RouteResult | null {
  const { nodeMap, adj } = buildGraph(map, profile, accessibleOnly);

  const startNode = nodeMap.get(startNodeId);
  const targetNode = nodeMap.get(targetNodeId);

  if (!startNode || !targetNode) return null;

  // 3. Execução do algoritmo de Dijkstra
  const distances = new Map<string, number>();
  const previous = new Map<string, { prevNodeId: string; edge: GraphEdge }>();
  const visited = new Set<string>();

  map.nodes.forEach(n => distances.set(n.id, Infinity));
  distances.set(startNodeId, 0);

  const priorityQueue = new MinHeap();
  priorityQueue.push({ nodeId: startNodeId, dist: 0 });

  while (priorityQueue.length > 0) {
    const { nodeId: currentId, dist: currentDist } = priorityQueue.pop()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === targetNodeId) break;

    const neighbors = adj.get(currentId) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.targetNodeId)) continue;

      const newDist = currentDist + edge.weight;
      if (newDist < (distances.get(edge.targetNodeId) ?? Infinity)) {
        distances.set(edge.targetNodeId, newDist);
        previous.set(edge.targetNodeId, { prevNodeId: currentId, edge });
        priorityQueue.push({ nodeId: edge.targetNodeId, dist: newDist });
      }
    }
  }

  if (distances.get(targetNodeId) === Infinity) {
    return null;
  }

  // 4. Reconstrução do caminho
  const pathNodeIds: string[] = [];
  const pathEdges: GraphEdge[] = [];

  let curr = targetNodeId;
  pathNodeIds.unshift(curr);

  while (curr !== startNodeId) {
    const prevInfo = previous.get(curr);
    if (!prevInfo) break;
    pathEdges.unshift(prevInfo.edge);
    curr = prevInfo.prevNodeId;
    pathNodeIds.unshift(curr);
  }

  // 5. Agrupamento por segmentos de piso
  const floorNameMap = new Map(map.floors.map(f => [f.id, f.name]));
  const floorSegments: RouteResult['floorSegments'] = [];
  const instructions: RouteInstruction[] = [];

  let currentFloorId = startNode.floorId;
  let currentPoints: Point[] = [{ x: startNode.x, y: startNode.y }];
  let currentSegmentDistance = 0;
  let totalDistanceMeters = 0;

  // Instrução inicial
  instructions.push({
    id: 'inst-start',
    floorId: startNode.floorId,
    floorName: floorNameMap.get(startNode.floorId) || 'Piso',
    title: 'Início da rota',
    description: `Partida de ${startNode.label || 'Entrada B (Acesso Entregadores)'}.`,
    iconType: startNode.type === 'courier_parking' ? 'dock' : 'start',
    estimatedSeconds: 5
  });

  for (let i = 0; i < pathEdges.length; i++) {
    const edge = pathEdges[i];
    const nextNode = nodeMap.get(pathNodeIds[i + 1])!;

    if (edge.isVertical) {
      if (currentPoints.length > 0) {
        floorSegments.push({
          floorId: currentFloorId,
          points: [...currentPoints],
          distanceMeters: Math.round(currentSegmentDistance)
        });
      }

      const targetFloorName = floorNameMap.get(edge.targetFloorId) || edge.targetFloorId;
      instructions.push({
        id: `inst-vert-${i}`,
        floorId: currentFloorId,
        floorName: floorNameMap.get(currentFloorId) || '',
        title: `Use o ${edge.connectorName || 'elevador de serviço'}`,
        description: `Suba até o ${targetFloorName}.`,
        iconType: edge.connectorType === 'stairs' ? 'stairs' : edge.connectorType === 'escalator' ? 'escalator' : 'elevator',
        estimatedSeconds: 30,
        hasPhoto: true,
        photoDescription: `${edge.connectorName || 'Elevador de serviço'} – acesso exclusivo`
      });

      currentFloorId = edge.targetFloorId;
      currentPoints = [{ x: nextNode.x, y: nextNode.y }];
      currentSegmentDistance = 0;
    } else {
      currentPoints.push({ x: nextNode.x, y: nextNode.y });
      currentSegmentDistance += edge.meters;
      totalDistanceMeters += edge.meters;

      if (nextNode.label && nextNode.id !== targetNodeId) {
        instructions.push({
          id: `inst-walk-${i}`,
          floorId: currentFloorId,
          floorName: floorNameMap.get(currentFloorId) || '',
          title: `Siga pelo corredor`,
          description: `Passe por ${nextNode.label} (~${Math.round(edge.meters)}m).`,
          iconType: 'walk',
          estimatedSeconds: Math.round(edge.meters / 1.2)
        });
      }
    }
  }

  if (currentPoints.length > 0) {
    floorSegments.push({
      floorId: currentFloorId,
      points: currentPoints,
      distanceMeters: Math.round(currentSegmentDistance)
    });
  }

  // Instrução final
  instructions.push({
    id: 'inst-dest',
    floorId: targetNode.floorId,
    floorName: floorNameMap.get(targetNode.floorId) || 'Piso',
    title: 'Chegada ao restaurante',
    description: `Você chegou: ${targetNode.label || 'Ponto de Retirada'}.`,
    iconType: 'destination',
    estimatedSeconds: 5
  });

  const walkingSpeed = 1.2;
  const estimatedMinutes = Math.max(1, Math.round((totalDistanceMeters / walkingSpeed) / 60));

  return {
    floorSegments,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    estimatedMinutes,
    instructions
  };
}
