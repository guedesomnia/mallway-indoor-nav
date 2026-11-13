"""Validador de publicação.

Um mapa só vira pacote publicado se passar aqui. Erros bloqueiam a publicação; avisos não.
Cada issue carrega `ref` ({type, id}) para o editor poder selecionar o elemento problemático.
"""
from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path

from .graph import (
    ENTRY_TYPES,
    as_str,
    PROFILES,
    build_adjacency,
    is_number,
    resolve_door_node,
    shortest_distances,
)

NODE_TYPES = {"corridor", "entrance", "courier_parking", "dock", "vertical_connector", "qr_anchor"}
KNOWN_CATEGORIES = {"food", "apparel", "pharmacy", "service", "dock", "restroom", "parking", "entertainment"}
MAX_PER_CODE = 25
IMPLAUSIBLE_ROUTE_M = 1200
DISTANCE_TOLERANCE = 0.30
FLOOR_IMAGE_RE = re.compile(r"^[0-9a-f]{16}\.webp$")


class _Collector:
    def __init__(self) -> None:
        self.errors: list[dict] = []
        self.warnings: list[dict] = []
        self._count: dict[tuple[str, str], int] = defaultdict(int)

    def add(self, severity: str, code: str, message: str, ref: dict | None = None) -> None:
        self._count[(severity, code)] += 1
        if self._count[(severity, code)] > MAX_PER_CODE:
            return
        bucket = self.errors if severity == "error" else self.warnings
        issue = {"code": code, "message": message}
        if ref:
            issue["ref"] = ref
        bucket.append(issue)

    def error(self, code: str, message: str, ref: dict | None = None) -> None:
        self.add("error", code, message, ref)

    def warn(self, code: str, message: str, ref: dict | None = None) -> None:
        self.add("warning", code, message, ref)

    def finish(self) -> None:
        for (severity, code), n in self._count.items():
            if n > MAX_PER_CODE:
                extra = {"code": code, "message": f"… e mais {n - MAX_PER_CODE} ocorrências de {code}"}
                (self.errors if severity == "error" else self.warnings).append(extra)


def _ref(kind: str, ident: object) -> dict:
    return {"type": kind, "id": ident}


def _check_ids(items: list, kind: str, c: _Collector) -> dict[str, dict]:
    seen: dict[str, dict] = {}
    for i, item in enumerate(items):
        if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not item["id"].strip():
            c.error("MAP_SHAPE", f"{kind} na posição {i} sem 'id' válido")
            continue
        if item["id"] in seen:
            c.error("ID_DUPLICATE", f"{kind} com id duplicado: {item['id']}", _ref(kind, item["id"]))
            continue
        seen[item["id"]] = item
    return seen


def _check_image(floor: dict, mall_id: str | None, public_dir: Path | None, c: _Collector) -> None:
    fid = floor["id"]
    url = floor.get("backgroundImage")
    if not url:
        c.warn("FLOOR_NO_BACKGROUND", f"Piso '{floor.get('name', fid)}' sem planta de fundo", _ref("floor", fid))
        return
    if not isinstance(url, str) or url.startswith(("data:", "http://", "https://", "//")) or ".." in url or not url.startswith("/"):
        c.error("IMAGE_URL_INVALID", f"Planta do piso '{fid}' deve ser um caminho local (upload pelo editor)", _ref("floor", fid))
        return
    if url.startswith("/p/"):
        prefix = f"/p/{mall_id}/floors/"
        if not mall_id or not url.startswith(prefix) or not FLOOR_IMAGE_RE.match(url[len(prefix):]):
            c.error("IMAGE_URL_INVALID", f"Planta do piso '{fid}' aponta para caminho não permitido", _ref("floor", fid))
            return
        if public_dir is None:
            return
        path = public_dir / "p" / mall_id / "floors" / url[len(prefix):]
        if not path.is_file():
            c.error("FLOOR_IMAGE_MISSING", f"Arquivo da planta do piso '{fid}' não existe no servidor", _ref("floor", fid))
            return
        try:
            from PIL import Image

            with Image.open(path) as im:
                iw, ih = im.size
            fw, fh = floor.get("width"), floor.get("height")
            if is_number(fw) and is_number(fh) and fw > 0 and fh > 0 and ih > 0:
                if abs((iw / ih) / (fw / fh) - 1) > 0.03:
                    c.warn(
                        "FLOOR_IMAGE_ASPECT",
                        f"Proporção da planta ({iw}x{ih}) difere do piso ({fw}x{fh}); o mapa pode ficar distorcido",
                        _ref("floor", fid),
                    )
        except Exception:  # noqa: BLE001 - imagem corrompida é erro de publicação
            c.error("FLOOR_IMAGE_MISSING", f"Arquivo da planta do piso '{fid}' ilegível", _ref("floor", fid))


def validate_map(
    map_data: object,
    *,
    max_bytes: int = 2 * 1024 * 1024,
    mall_id: str | None = None,
    public_dir: Path | None = None,
) -> dict:
    c = _Collector()
    stats: dict = {}

    if not isinstance(map_data, dict):
        c.error("MAP_SHAPE", "O mapa deve ser um objeto JSON")
        return _report(c, stats)

    size = len(json.dumps(map_data, separators=(",", ":"), ensure_ascii=False).encode())
    stats["package_bytes"] = size
    if size > max_bytes:
        c.error("PACKAGE_TOO_LARGE", f"Mapa com {size / 1024:.0f} KB excede o limite de {max_bytes / 1024:.0f} KB")

    if not isinstance(map_data.get("name"), str) or not map_data["name"].strip():
        c.error("MAP_SHAPE", "O shopping precisa de um nome")

    fatal = False
    for key in ("floors", "units", "nodes", "edges"):
        if not isinstance(map_data.get(key), list):
            c.error("MAP_SHAPE", f"Campo obrigatório ausente ou inválido: {key}")
            fatal = True
    if not isinstance(map_data.get("verticalConnectors", []), list):
        c.error("MAP_SHAPE", "Campo verticalConnectors inválido")
        fatal = True
    if fatal:
        return _report(c, stats)

    floors = _check_ids(map_data["floors"], "floor", c)
    units = _check_ids(map_data["units"], "unit", c)
    nodes = _check_ids(map_data["nodes"], "node", c)
    edges = _check_ids(map_data["edges"], "edge", c)
    connectors = _check_ids(map_data.get("verticalConnectors", []), "connector", c)

    stats.update(floors=len(floors), units=len(units), nodes=len(nodes), edges=len(edges))

    if not floors:
        c.error("NO_FLOORS", "O mapa não tem nenhum piso")
    if not units:
        c.error("NO_UNITS", "O mapa não tem nenhuma loja cadastrada")

    # --- pisos: tamanho, escala calibrada, planta ---
    mpp_by_floor: dict[str, float] = {}
    for fid, f in floors.items():
        if not (is_number(f.get("width")) and is_number(f.get("height")) and f["width"] > 0 and f["height"] > 0):
            c.error("FLOOR_SIZE", f"Piso '{fid}' sem largura/altura válidas", _ref("floor", fid))
        mpp = f.get("metersPerPixel")
        if not (is_number(mpp) and 0 < mpp < 10) or f.get("scaleCalibrated") is not True:
            c.error(
                "FLOOR_SCALE_UNCALIBRATED",
                f"Piso '{f.get('name', fid)}' sem escala calibrada: toda distância e tempo estimado ficariam incorretos",
                _ref("floor", fid),
            )
        else:
            mpp_by_floor[fid] = float(mpp)
        _check_image(f, mall_id, public_dir, c)

    # --- nós ---
    valid_nodes: dict[str, dict] = {}
    for nid, n in nodes.items():
        ok = True
        if as_str(n.get("floorId")) not in floors:
            c.error("REF_BROKEN", f"Nó '{nid}' aponta para piso inexistente", _ref("node", nid))
            ok = False
        if not (is_number(n.get("x")) and is_number(n.get("y"))):
            c.error("MAP_SHAPE", f"Nó '{nid}' sem coordenadas numéricas", _ref("node", nid))
            ok = False
        if as_str(n.get("type")) not in NODE_TYPES:
            c.error("MAP_SHAPE", f"Nó '{nid}' com tipo inválido: {n.get('type')!r}", _ref("node", nid))
            ok = False
        if not ok:
            continue
        valid_nodes[nid] = n
        f = floors[n["floorId"]]
        if is_number(f.get("width")) and is_number(f.get("height")):
            if not (0 <= n["x"] <= f["width"] and 0 <= n["y"] <= f["height"]):
                c.warn("NODE_OUT_OF_BOUNDS", f"Nó '{nid}' fora dos limites do piso (fica fora da tela)", _ref("node", nid))

    # --- arestas ---
    seen_pairs: set[frozenset[str]] = set()
    degree: dict[str, int] = defaultdict(int)
    for eid, e in edges.items():
        a, b = as_str(e.get("nodeA")), as_str(e.get("nodeB"))
        if a not in nodes or b not in nodes:
            c.error("REF_BROKEN", f"Aresta '{eid}' liga nó inexistente ({a} → {b})", _ref("edge", eid))
            continue
        if a == b:
            c.error("EDGE_SELF_LOOP", f"Aresta '{eid}' liga um nó a ele mesmo", _ref("edge", eid))
            continue
        if nodes[a].get("floorId") != nodes[b].get("floorId"):
            c.error("EDGE_CROSS_FLOOR", f"Aresta '{eid}' liga pisos diferentes; use um conector vertical", _ref("edge", eid))
            continue
        d = e.get("distance")
        if not (is_number(d) and d > 0):
            c.error("EDGE_DISTANCE_INVALID", f"Aresta '{eid}' com distância inválida: {d!r}", _ref("edge", eid))
        pair = frozenset((a, b))
        if pair in seen_pairs:
            c.warn("EDGE_DUPLICATE", f"Arestas duplicadas entre '{a}' e '{b}'", _ref("edge", eid))
        seen_pairs.add(pair)
        degree[a] += 1
        degree[b] += 1
        mpp = mpp_by_floor.get(as_str(nodes[a].get("floorId")))
        if mpp and a in valid_nodes and b in valid_nodes and is_number(d) and d > 0:
            expected = math.hypot(valid_nodes[a]["x"] - valid_nodes[b]["x"], valid_nodes[a]["y"] - valid_nodes[b]["y"]) * mpp
            if abs(d - expected) > max(3.0, DISTANCE_TOLERANCE * expected):
                c.warn(
                    "EDGE_DISTANCE_MISMATCH",
                    f"Aresta '{eid}': distância {d:.0f} m difere da geometria ({expected:.0f} m) — recalibre a escala",
                    _ref("edge", eid),
                )

    # --- conectores verticais ---
    for cid, vc in connectors.items():
        conns = vc.get("connections")
        if not isinstance(conns, list) or len(conns) < 2:
            c.error("CONNECTOR_INVALID", f"Conector '{cid}' precisa ligar ao menos 2 pisos", _ref("connector", cid))
            continue
        for conn in conns:
            if not isinstance(conn, dict):
                c.error("CONNECTOR_INVALID", f"Conector '{cid}' com ligação malformada", _ref("connector", cid))
                continue
            nid, fid = as_str(conn.get("nodeId")), as_str(conn.get("floorId"))
            if nid not in nodes or fid not in floors:
                c.error("REF_BROKEN", f"Conector '{cid}' aponta para nó/piso inexistente", _ref("connector", cid))
            elif nodes[nid].get("floorId") != fid:
                c.error("CONNECTOR_FLOOR_MISMATCH", f"Conector '{cid}': nó '{nid}' não está no piso '{fid}'", _ref("connector", cid))
            else:
                degree[nid] += 1

    # --- lojas ---
    names_by_floor: dict[tuple[str, str], list[str]] = defaultdict(list)
    unit_door: dict[str, str] = {}
    for uid, u in units.items():
        if not isinstance(u.get("name"), str) or not u["name"].strip():
            c.error("UNIT_NAME_MISSING", f"Loja '{uid}' sem nome", _ref("unit", uid))
        if as_str(u.get("floorId")) not in floors:
            c.error("REF_BROKEN", f"Loja '{uid}' aponta para piso inexistente", _ref("unit", uid))
            continue
        poly = u.get("polygon")
        if not (isinstance(poly, list) and len(poly) >= 3 and all(isinstance(p, dict) and is_number(p.get("x")) and is_number(p.get("y")) for p in poly)):
            c.error("UNIT_POLYGON_INVALID", f"Loja '{u.get('name', uid)}' sem contorno válido (mínimo 3 pontos)", _ref("unit", uid))
        if as_str(u.get("category")) not in KNOWN_CATEGORIES:
            c.warn("UNIT_CATEGORY_UNKNOWN", f"Loja '{u.get('name', uid)}' com categoria desconhecida: {u.get('category')!r}", _ref("unit", uid))
        names_by_floor[(u["floorId"], str(u.get("name", "")).strip().lower())].append(uid)

        node_id, source, dist = resolve_door_node(map_data, u)
        if source == "broken":
            c.error("REF_BROKEN", f"Loja '{u.get('name', uid)}' aponta para nó de porta inexistente ({u.get('doorNodeId')})", _ref("unit", uid))
        elif node_id is None:
            c.error(
                "UNIT_NO_DOOR_NODE",
                f"Loja '{u.get('name', uid)}' não está ligada ao corredor: nenhum ponto de passagem perto da porta. "
                "Sem isso o app mandaria o entregador para o lugar errado",
                _ref("unit", uid),
            )
        else:
            if nodes[node_id].get("floorId") != u["floorId"]:
                c.error("REF_BROKEN", f"Porta da loja '{u.get('name', uid)}' está em outro piso", _ref("unit", uid))
                continue
            unit_door[uid] = node_id
            if source == "explicit" and dist is not None and dist > 80:
                c.warn("UNIT_DOOR_FAR", f"Porta de '{u.get('name', uid)}' está a {dist:.0f}px do nó ligado — confira", _ref("unit", uid))

    for (fid, name), ids in names_by_floor.items():
        if len(ids) > 1 and name:
            c.warn("UNIT_DUPLICATE_NAME", f"{len(ids)} lojas chamadas '{name}' no mesmo piso (confunde a busca)", _ref("unit", ids[0]))

    # --- entradas ---
    entries = [nid for nid, n in valid_nodes.items() if n["type"] in ENTRY_TYPES]
    stats["entrances"] = len(entries)
    if not entries:
        c.error("NO_ENTRANCE", "O mapa não tem nenhuma entrada/ponto de QR (tipo entrance, courier_parking ou qr_anchor)")
    for nid in entries:
        if degree.get(nid, 0) == 0:
            c.error("ENTRANCE_ISOLATED", f"Entrada '{valid_nodes[nid].get('label', nid)}' não está ligada a nenhum corredor", _ref("node", nid))

    door_nodes = set(unit_door.values())
    for nid in valid_nodes:
        if degree.get(nid, 0) == 0 and nid not in entries and nid not in door_nodes:
            c.warn("NODE_ORPHAN", f"Ponto '{valid_nodes[nid].get('label', nid)}' sem conexões (sobra de edição?)", _ref("node", nid))

    # --- simulação exaustiva: toda entrada × toda loja × perfil ---
    routes_checked = 0
    longest_courier = 0.0
    if entries and unit_door:
        for profile, accessible in PROFILES:
            adj = build_adjacency(map_data, profile, accessible)
            dist_by_entry = {e: shortest_distances(adj, e) for e in entries}
            routes_checked += len(entries) * len(unit_door)
            label = {("courier", False): "entregador", ("customer", False): "cliente", ("customer", True): "cliente (acessível)"}[(profile, accessible)]
            missing_by_entry: dict[str, list[str]] = defaultdict(list)
            for uid, door in unit_door.items():
                reach = [e for e in entries if door in dist_by_entry[e]]
                uname = units[uid].get("name", uid)
                if profile == "courier":
                    for e in reach:
                        longest_courier = max(longest_courier, dist_by_entry[e][door])
                    if not reach:
                        c.error("UNIT_UNREACHABLE", f"Loja '{uname}' não é alcançável por entregador a partir de nenhuma entrada", _ref("unit", uid))
                        continue
                    for e in entries:
                        if e not in reach:
                            missing_by_entry[e].append(uname)
                elif not reach:
                    code = "UNIT_UNREACHABLE_ACCESSIBLE" if accessible else "UNIT_UNREACHABLE_CUSTOMER"
                    c.warn(code, f"Loja '{uname}' inalcançável para {label} (esperado só em lojas de serviço/doca)", _ref("unit", uid))
            for e, names in missing_by_entry.items():
                c.warn(
                    "UNIT_UNREACHABLE_FROM_ENTRANCE",
                    f"Entrada '{valid_nodes[e].get('label', e)}' não alcança {len(names)} loja(s), ex.: {', '.join(names[:3])}",
                    _ref("node", e),
                )
    stats["routes_checked"] = routes_checked
    stats["longest_courier_route_m"] = round(longest_courier)
    if longest_courier > IMPLAUSIBLE_ROUTE_M:
        c.warn("ROUTE_IMPLAUSIBLE", f"Maior rota de entregador tem {longest_courier:.0f} m — confira a calibração da escala")

    return _report(c, stats)


def _report(c: _Collector, stats: dict) -> dict:
    c.finish()
    return {"ok": not c.errors, "errors": c.errors, "warnings": c.warnings, "stats": stats}
