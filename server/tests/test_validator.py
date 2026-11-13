from __future__ import annotations

import os
import random

import pytest

from app.graph import resolve_door_node
from app.validator import validate_map

from .fixtures import clone, good_map


def codes(report: dict, kind: str = "errors") -> set[str]:
    return {i["code"] for i in report[kind]}


def test_valid_map_passes():
    r = validate_map(good_map())
    assert r["ok"], r["errors"]
    assert r["stats"]["routes_checked"] > 0
    assert r["stats"]["entrances"] == 1


def test_uncalibrated_scale_blocks_publish():
    m = good_map()
    m["floors"][0]["scaleCalibrated"] = False
    assert "FLOOR_SCALE_UNCALIBRATED" in codes(validate_map(m))


def test_missing_or_absurd_scale_blocks_publish():
    for bad in (None, 0, -1, 99, "0.25", True):
        m = good_map()
        m["floors"][0]["metersPerPixel"] = bad
        assert "FLOOR_SCALE_UNCALIBRATED" in codes(validate_map(m)), bad


def test_duplicate_ids_detected():
    m = good_map()
    m["nodes"].append(clone(m["nodes"][0]))
    assert "ID_DUPLICATE" in codes(validate_map(m))


def test_broken_edge_reference():
    m = good_map()
    m["edges"][0]["nodeB"] = "fantasma"
    assert "REF_BROKEN" in codes(validate_map(m))


def test_cross_floor_edge_rejected():
    m = good_map()
    m["edges"].append({"id": "bad", "floorId": "f1", "nodeA": "c2", "nodeB": "c3", "distance": 10})
    assert "EDGE_CROSS_FLOOR" in codes(validate_map(m))


@pytest.mark.parametrize("d", [0, -5, None, "10", float("nan")])
def test_invalid_edge_distance(d):
    m = good_map()
    m["edges"][0]["distance"] = d
    assert "EDGE_DISTANCE_INVALID" in codes(validate_map(m))


def test_unit_without_door_node_is_error_not_silent_fallback():
    m = good_map()
    m["units"][0]["door"] = {"x": 390, "y": 290}  # longe de qualquer nó
    r = validate_map(m)
    assert "UNIT_NO_DOOR_NODE" in codes(r)
    assert not r["ok"]


def test_explicit_door_node_overrides_snap_and_must_exist():
    m = good_map()
    m["units"][0]["door"] = {"x": 390, "y": 290}
    m["units"][0]["doorNodeId"] = "door-a"
    assert validate_map(m)["ok"]
    m["units"][0]["doorNodeId"] = "nao-existe"
    assert "REF_BROKEN" in codes(validate_map(m))


def test_explicit_door_node_on_other_floor_rejected():
    m = good_map()
    m["units"][0]["doorNodeId"] = "door-b"
    assert not validate_map(m)["ok"]


def test_unreachable_unit_for_courier_is_error():
    m = good_map()
    m["verticalConnectors"][0]["courierAllowed"] = False  # entregador não pode usar este elevador
    r = validate_map(m)
    assert "UNIT_UNREACHABLE" in codes(r)
    assert any(i["ref"]["id"] == "u-b" for i in r["errors"] if i["code"] == "UNIT_UNREACHABLE")


def test_customer_unreachable_is_only_a_warning():
    m = good_map()
    next(e for e in m["edges"] if e["id"] == "e3")["courierOnly"] = True
    r = validate_map(m)
    assert r["ok"], r["errors"]
    assert "UNIT_UNREACHABLE_CUSTOMER" in codes(r, "warnings")


def test_stairs_only_building_flags_accessibility():
    m = good_map()
    m["verticalConnectors"][0].update(type="stairs", accessible=False)
    r = validate_map(m)
    assert r["ok"]
    assert "UNIT_UNREACHABLE_ACCESSIBLE" in codes(r, "warnings")


def test_no_entrance_and_isolated_entrance():
    m = good_map()
    m["nodes"][0]["type"] = "corridor"
    assert "NO_ENTRANCE" in codes(validate_map(m))
    m = good_map()
    m["edges"] = [e for e in m["edges"] if e["id"] != "e1"]
    assert "ENTRANCE_ISOLATED" in codes(validate_map(m))


def test_orphan_node_is_warning_only():
    m = good_map()
    m["nodes"].append({"id": "sobra", "floorId": "f1", "x": 10, "y": 10, "type": "corridor"})
    r = validate_map(m)
    assert r["ok"] and "NODE_ORPHAN" in codes(r, "warnings")


def test_scale_mismatch_warns():
    m = good_map()
    for e in m["edges"]:
        e["distance"] *= 40
    r = validate_map(m)
    assert "EDGE_DISTANCE_MISMATCH" in codes(r, "warnings")
    assert "ROUTE_IMPLAUSIBLE" in codes(r, "warnings")


def test_out_of_bounds_node_warns():
    m = good_map()
    m["nodes"][1]["x"] = 5000
    assert "NODE_OUT_OF_BOUNDS" in codes(validate_map(m), "warnings")


@pytest.mark.parametrize("url", ["data:image/png;base64,AAAA", "http://evil.test/x.png", "//evil.test/x.png", "../../etc/passwd", "rel/path.png", "/p/outro-shop/floors/0123456789abcdef.webp", "/p/shop-teste/floors/../../x.webp"])
def test_bad_image_urls_rejected(url):
    m = good_map()
    m["floors"][0]["backgroundImage"] = url
    assert "IMAGE_URL_INVALID" in codes(validate_map(m, mall_id="shop-teste")), url


def test_legacy_local_image_path_allowed():
    m = good_map()
    m["floors"][0]["backgroundImage"] = "/bangu_floorplan.png"
    assert validate_map(m, mall_id="shop-teste")["ok"]


def test_uploaded_image_must_exist_on_disk(tmp_path):
    m = good_map()
    m["floors"][0]["backgroundImage"] = "/p/shop-teste/floors/0123456789abcdef.webp"
    assert "FLOOR_IMAGE_MISSING" in codes(validate_map(m, mall_id="shop-teste", public_dir=tmp_path))


def test_package_too_large():
    assert "PACKAGE_TOO_LARGE" in codes(validate_map(good_map(), max_bytes=100))


def test_empty_units_and_floors():
    m = good_map()
    m["units"] = []
    assert "NO_UNITS" in codes(validate_map(m))
    m = good_map()
    m["floors"] = []
    assert "NO_FLOORS" in codes(validate_map(m))


def test_issue_flood_is_capped():
    m = good_map()
    for i in range(200):
        m["nodes"].append({"id": f"o{i}", "floorId": "f1", "x": 1, "y": 1, "type": "corridor"})
    r = validate_map(m)
    assert len(r["warnings"]) < 40
    assert any("mais" in w["message"] for w in r["warnings"])


@pytest.mark.parametrize("junk", [None, [], "x", 5, {}, {"floors": "x"}, {"floors": [1, None], "units": [], "nodes": [], "edges": []},
                                  {"name": "a", "floors": [], "units": [], "nodes": [], "edges": [], "verticalConnectors": "x"}])
def test_hostile_top_level_input_never_raises(junk):
    r = validate_map(junk)
    assert r["ok"] is False


def test_fuzzed_mutations_never_raise():
    """Corrompe campos aleatórios de um mapa válido: o validador deve sempre responder, nunca estourar exceção."""
    rng = random.Random(int(os.environ.get("FUZZ_SEED", "1234")))
    junk = [None, "x", -1, 0, 1e9, [], {}, True, float("inf")]

    def paths(o, prefix=()):
        if isinstance(o, dict):
            for k, v in o.items():
                yield prefix + (k,)
                yield from paths(v, prefix + (k,))
        elif isinstance(o, list):
            for i, v in enumerate(o):
                yield prefix + (i,)
                yield from paths(v, prefix + (i,))

    for _ in range(600):
        m = good_map()
        for _ in range(rng.randint(1, 4)):
            p = rng.choice(list(paths(m)))
            target = m
            for k in p[:-1]:
                target = target[k]
            if rng.random() < 0.25:
                if isinstance(target, dict):
                    target.pop(p[-1], None)
                else:
                    del target[p[-1]]
            else:
                target[p[-1]] = rng.choice(junk)
        r = validate_map(m)
        assert isinstance(r["ok"], bool)


def test_resolve_door_node_snap_threshold():
    m = good_map()
    u = m["units"][0]
    assert resolve_door_node(m, u)[:2] == ("door-a", "snap")
    u["door"] = {"x": 200, "y": 100 + 41}  # além do raio de 40px do nó (e sem outro nó mais perto)
    u["door"] = {"x": 340, "y": 20}
    assert resolve_door_node(m, u)[0] is None
