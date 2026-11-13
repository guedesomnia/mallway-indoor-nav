"""Porte server-side das regras de grafo de src/utils/pathfinding.ts.

Qualquer mudança nas regras de arestas/conectores (courierOnly, accessible, courierAllowed) deve
ser espelhada nos dois lados, senão o validador aprova rotas que o app não consegue calcular.
"""
from __future__ import annotations

import heapq
import math

DOOR_SNAP_PX = 40.0
SNAPPABLE_TYPES = {"corridor", "entrance", "courier_parking", "dock", "qr_anchor"}
ENTRY_TYPES = {"entrance", "courier_parking", "qr_anchor"}
# (perfil, somente_acessivel)
PROFILES: tuple[tuple[str, bool], ...] = (("courier", False), ("customer", False), ("customer", True))

Adjacency = dict[str, list[tuple[str, float]]]


def as_str(v: object) -> str | None:
    """Referências vindas de JSON podem ter qualquer tipo; só str é usável como chave/lookup."""
    return v if isinstance(v, str) else None


def is_number(v: object) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def resolve_door_node(map_data: dict, unit: dict) -> tuple[str | None, str | None, float | None]:
    """Nó do grafo que representa a porta da loja.

    Retorna (node_id, origem, distância_px). origem: 'explicit' | 'snap' | 'broken' | None.
    Nunca "adivinha" por texto de label: se não houver ligação confiável, devolve None.
    """
    nodes = [n for n in (map_data.get("nodes") or []) if isinstance(n, dict) and isinstance(n.get("id"), str)]
    explicit = unit.get("doorNodeId")
    door = unit.get("door")
    if not isinstance(door, dict):
        door = {}
    if explicit not in (None, ""):
        if isinstance(explicit, str):
            for n in nodes:
                if n["id"] == explicit:
                    dist = (
                        math.hypot(n["x"] - door["x"], n["y"] - door["y"])
                        if is_number(door.get("x")) and is_number(door.get("y")) and is_number(n.get("x")) and is_number(n.get("y"))
                        else None
                    )
                    return explicit, "explicit", dist
        return None, "broken", None

    if not (is_number(door.get("x")) and is_number(door.get("y"))):
        return None, None, None
    best: tuple[float, str] | None = None
    for n in nodes:
        if n.get("floorId") != unit.get("floorId") or as_str(n.get("type")) not in SNAPPABLE_TYPES:
            continue
        if not (is_number(n.get("x")) and is_number(n.get("y"))):
            continue
        d = math.hypot(n["x"] - door["x"], n["y"] - door["y"])
        if best is None or d < best[0]:
            best = (d, n["id"])
    if best and best[0] <= DOOR_SNAP_PX:
        return best[1], "snap", best[0]
    return None, None, best[0] if best else None


def build_adjacency(map_data: dict, profile: str, accessible_only: bool) -> Adjacency:
    nodes = {n["id"]: n for n in map_data.get("nodes", []) if isinstance(n, dict) and isinstance(n.get("id"), str)}
    adj: Adjacency = {nid: [] for nid in nodes}

    for e in map_data.get("edges", []):
        if not isinstance(e, dict):
            continue
        if profile == "customer" and e.get("courierOnly"):
            continue
        if accessible_only and e.get("accessible") is False:
            continue
        a, b = as_str(e.get("nodeA")), as_str(e.get("nodeB"))
        if a not in nodes or b not in nodes or not is_number(e.get("distance")) or e["distance"] <= 0:
            continue
        w = float(e["distance"])
        if profile == "courier" and e.get("courierOnly"):
            w *= 0.85
        adj[a].append((b, w))
        adj[b].append((a, w))

    for vc in map_data.get("verticalConnectors", []) or []:
        if not isinstance(vc, dict):
            continue
        if accessible_only and not vc.get("accessible"):
            continue
        if profile == "courier" and not vc.get("courierAllowed"):
            continue
        raw_conns = vc.get("connections")
        conns = [c for c in raw_conns if isinstance(c, dict)] if isinstance(raw_conns, list) else []
        weight = {"stairs": 30.0, "escalator": 22.0}.get(as_str(vc.get("type")), 20.0)
        for i, ci in enumerate(conns):
            for j, cj in enumerate(conns):
                if i != j and as_str(ci.get("nodeId")) in nodes and as_str(cj.get("nodeId")) in nodes:
                    adj[ci["nodeId"]].append((cj["nodeId"], weight))
    return adj


def shortest_distances(adj: Adjacency, source: str) -> dict[str, float]:
    dist: dict[str, float] = {source: 0.0}
    heap: list[tuple[float, str]] = [(0.0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, math.inf):
            continue
        for v, w in adj.get(u, ()):
            nd = d + w
            if nd < dist.get(v, math.inf):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist
