"""Mapa mínimo válido de 2 pisos usado pelos testes: entrada → corredor → loja A, e elevador → loja B no piso 2."""
from __future__ import annotations

import copy
import math

MPP = 0.25


def good_map(mall_id: str = "shop-teste") -> dict:
    nodes = [
        {"id": "ent", "floorId": "f1", "x": 20, "y": 150, "type": "entrance", "label": "Entrada A"},
        {"id": "c1", "floorId": "f1", "x": 100, "y": 150, "type": "corridor"},
        {"id": "c2", "floorId": "f1", "x": 200, "y": 150, "type": "corridor"},
        {"id": "door-a", "floorId": "f1", "x": 200, "y": 100, "type": "corridor", "label": "Porta Loja A"},
        {"id": "el1", "floorId": "f1", "x": 300, "y": 150, "type": "vertical_connector"},
        {"id": "el2", "floorId": "f2", "x": 300, "y": 150, "type": "vertical_connector"},
        {"id": "c3", "floorId": "f2", "x": 200, "y": 150, "type": "corridor"},
        {"id": "door-b", "floorId": "f2", "x": 200, "y": 100, "type": "corridor", "label": "Porta Loja B"},
    ]
    by_id = {n["id"]: n for n in nodes}

    def edge(eid: str, a: str, b: str, **extra) -> dict:
        d = math.hypot(by_id[a]["x"] - by_id[b]["x"], by_id[a]["y"] - by_id[b]["y"]) * MPP
        return {"id": eid, "floorId": by_id[a]["floorId"], "nodeA": a, "nodeB": b, "distance": round(d, 1), **extra}

    square = lambda x, y: [{"x": x, "y": y}, {"x": x + 40, "y": y}, {"x": x + 40, "y": y + 40}, {"x": x, "y": y + 40}]  # noqa: E731
    return {
        "id": mall_id,
        "name": "Shopping Teste",
        "address": "Rua X",
        "floors": [
            {"id": "f1", "name": "Térreo", "shortName": "T", "elevation": 0, "width": 400, "height": 300,
             "metersPerPixel": MPP, "scaleCalibrated": True},
            {"id": "f2", "name": "Piso 1", "shortName": "L1", "elevation": 1, "width": 400, "height": 300,
             "metersPerPixel": MPP, "scaleCalibrated": True},
        ],
        "nodes": nodes,
        "edges": [
            edge("e1", "ent", "c1"), edge("e2", "c1", "c2"), edge("e3", "c2", "door-a"),
            edge("e4", "c2", "el1"), edge("e5", "el2", "c3"), edge("e6", "c3", "door-b"),
        ],
        "verticalConnectors": [
            {"id": "elev", "name": "Elevador de serviço", "type": "elevator", "accessible": True, "courierAllowed": True,
             "connections": [{"floorId": "f1", "nodeId": "el1"}, {"floorId": "f2", "nodeId": "el2"}]},
        ],
        "units": [
            {"id": "u-a", "floorId": "f1", "name": "Loja A", "category": "food", "polygon": square(180, 60), "door": {"x": 200, "y": 100}},
            {"id": "u-b", "floorId": "f2", "name": "Loja B", "category": "apparel", "polygon": square(180, 60), "door": {"x": 200, "y": 100}},
        ],
    }


def clone(m: dict) -> dict:
    return copy.deepcopy(m)
