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
  weight: number;
  isVertical: boolean;
  connectorName?: string;
  connectorType?: 'elevator' | 'escalator' | 'stairs' | 'ramp';
  targetFloorId: string;
}

export function calculateIndoorRoute(
  map: BuildingMap,
  startNodeId: string,
  targetNodeId: string,
  profile: UserProfile = 'courier',
  accessibleOnly: boolean = false
): RouteResult | null {
  const nodeMap = new Map<string, WayNode>();
  map.nodes.forEach(n => nodeMap.set(n.id, n));

  const startNode = nodeMap.get(startNodeId);
  const targetNode = nodeMap.get(targetNodeId);

  if (!startNode || !targetNode) return null;

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
      isVertical: false,
      targetFloorId: nodeB.floorId
    });

    adj.get(edge.nodeB)?.push({
      targetNodeId: edge.nodeA,
      weight,
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
            isVertical: true,
            connectorName: vc.name,
            connectorType: vc.type,
            targetFloorId: connTo.floorId
          });
        }
      }
    }
  });

  // 3. Execução do algoritmo de Dijkstra
  const distances = new Map<string, number>();
  const previous = new Map<string, { prevNodeId: string; edge: GraphEdge }>();
  const visited = new Set<string>();

  map.nodes.forEach(n => distances.set(n.id, Infinity));
  distances.set(startNodeId, 0);

  const priorityQueue: { nodeId: string; dist: number }[] = [
    { nodeId: startNodeId, dist: 0 }
  ];

  while (priorityQueue.length > 0) {
    priorityQueue.sort((a, b) => a.dist - b.dist);
    const { nodeId: currentId, dist: currentDist } = priorityQueue.shift()!;

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
      currentSegmentDistance += edge.weight;
      totalDistanceMeters += edge.weight;

      if (nextNode.label && nextNode.id !== targetNodeId) {
        instructions.push({
          id: `inst-walk-${i}`,
          floorId: currentFloorId,
          floorName: floorNameMap.get(currentFloorId) || '',
          title: `Siga pelo corredor`,
          description: `Passe por ${nextNode.label} (~${Math.round(edge.weight)}m).`,
          iconType: 'walk',
          estimatedSeconds: Math.round(edge.weight / 1.2)
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
