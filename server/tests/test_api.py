from __future__ import annotations

import io
import json
from dataclasses import replace

from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.models import AdminUser

from .conftest import add_user, auth, create_mall, login, make_settings, set_draft
from .fixtures import clone, good_map

MALL = "shop-teste"


# ---------------------------------------------------------------- auth
def test_login_and_me(client):
    add_user(client, "a@x.test", "senha-forte-1")
    tokens = login(client, "A@X.test ", "senha-forte-1")  # e-mail normalizado
    me = client.get("/auth/me", headers=auth(tokens["accessToken"]))
    assert me.status_code == 200 and me.json()["email"] == "a@x.test"


def test_bad_credentials_are_indistinguishable(client):
    add_user(client, "a@x.test", "senha-forte-1")
    wrong_pw = client.post("/auth/login", json={"email": "a@x.test", "password": "errada"})
    no_user = client.post("/auth/login", json={"email": "ninguem@x.test", "password": "errada"})
    assert wrong_pw.status_code == no_user.status_code == 401
    assert wrong_pw.json() == no_user.json()


def test_login_rate_limited(client):
    add_user(client, "a@x.test", "senha-forte-1")
    statuses = [client.post("/auth/login", json={"email": "a@x.test", "password": "x"}).status_code for _ in range(5)]
    assert statuses[:3] == [401, 401, 401]
    assert 429 in statuses[3:]


def test_protected_routes_require_token(client):
    assert client.get("/api/malls").status_code == 401
    assert client.get("/api/malls", headers={"Authorization": "Bearer lixo"}).status_code == 401


def test_refresh_token_cannot_be_used_as_access(client):
    add_user(client, "a@x.test", "senha-forte-1")
    t = login(client, "a@x.test", "senha-forte-1")
    assert client.get("/api/malls", headers=auth(t["refreshToken"])).status_code == 401
    assert client.post("/auth/refresh", json={"refreshToken": t["refreshToken"]}).status_code == 200
    assert client.post("/auth/refresh", json={"refreshToken": t["accessToken"]}).status_code == 401


def test_deactivated_user_loses_access_immediately(client):
    uid = add_user(client, "a@x.test", "senha-forte-1")
    h = auth(login(client, "a@x.test", "senha-forte-1")["accessToken"])
    assert client.get("/api/malls", headers=h).status_code == 200
    with client.app.state.session_factory() as db:
        db.get(AdminUser, uid).is_active = False
        db.commit()
    assert client.get("/api/malls", headers=h).status_code == 401


def test_token_version_bump_revokes_tokens(client):
    uid = add_user(client, "a@x.test", "senha-forte-1")
    t = login(client, "a@x.test", "senha-forte-1")
    with client.app.state.session_factory() as db:
        db.get(AdminUser, uid).token_version += 1
        db.commit()
    assert client.get("/api/malls", headers=auth(t["accessToken"])).status_code == 401
    assert client.post("/auth/refresh", json={"refreshToken": t["refreshToken"]}).status_code == 401


def test_expired_token_rejected(settings):
    s = replace(settings, access_ttl_min=-1)
    with TestClient(create_app(s)) as c:
        add_user(c, "a@x.test", "senha-forte-1")
        t = login(c, "a@x.test", "senha-forte-1")
        assert c.get("/api/malls", headers=auth(t["accessToken"])).status_code == 401


# ---------------------------------------------------------------- permissões por shopping
def test_mall_admin_is_scoped_to_own_mall(client, master):
    create_mall(client, master, "shop-a")
    create_mall(client, master, "shop-b")
    add_user(client, "adm-a@x.test", "senha-forte-1", role="mall_admin", mall_id="shop-a")
    h = auth(login(client, "adm-a@x.test", "senha-forte-1")["accessToken"])
    assert [m["id"] for m in client.get("/api/malls", headers=h).json()] == ["shop-a"]
    assert client.get("/api/malls/shop-a/draft", headers=h).status_code == 200
    # shopping alheio: 404 (não revela que existe) em TODAS as rotas por shopping
    for method, url in [("get", "/api/malls/shop-b/draft"), ("post", "/api/malls/shop-b/validate"),
                        ("get", "/api/malls/shop-b/versions"), ("post", "/api/malls/shop-b/rollback/1"),
                        ("get", "/api/malls/shop-b/feedback")]:
        assert getattr(client, method)(url, headers=h).status_code == 404, url
    assert client.put("/api/malls/shop-b/draft", json={"baseRev": 1, "map": good_map()}, headers=h).status_code == 404
    assert client.post("/api/malls/shop-b/publish", json={"baseRev": 1}, headers=h).status_code == 404
    assert client.post("/api/malls", json={"id": "novo-shop", "name": "Novo"}, headers=h).status_code == 403


def test_mall_slug_validation(client, master):
    for bad in ["Ab", "api", "p", "x", "tem espaço", "../etc", "UPPER_case", "-ruim-", "a" * 60]:
        r = client.post("/api/malls", json={"id": bad, "name": "Teste"}, headers=master)
        assert r.status_code == 422, bad
    create_mall(client, master, "ok-shop")
    assert client.post("/api/malls", json={"id": "ok-shop", "name": "Dup"}, headers=master).status_code == 409


# ---------------------------------------------------------------- rascunho e concorrência
def test_draft_roundtrip_and_server_forces_id(client, master):
    create_mall(client, master)
    m = good_map("id-errado-vindo-do-cliente")
    rev = set_draft(client, master, MALL, m)
    d = client.get(f"/api/malls/{MALL}/draft", headers=master).json()
    assert d["rev"] == rev == 2
    assert d["map"]["id"] == MALL
    assert d["updatedBy"] == "master@mallway.test"


def test_concurrent_save_gets_409_and_nothing_is_overwritten(client, master):
    create_mall(client, master)
    base = client.get(f"/api/malls/{MALL}/draft", headers=master).json()["rev"]
    first = clone(good_map())
    first["name"] = "Edição da Ana"
    ok = client.put(f"/api/malls/{MALL}/draft", json={"baseRev": base, "map": first}, headers=master)
    assert ok.status_code == 200
    second = clone(good_map())
    second["name"] = "Edição do Bruno (partiu da mesma revisão)"
    r = client.put(f"/api/malls/{MALL}/draft", json={"baseRev": base, "map": second}, headers=master)
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["code"] == "DRAFT_CONFLICT" and detail["updatedBy"] == "master@mallway.test"
    assert detail["currentRev"] == base + 1
    assert client.get(f"/api/malls/{MALL}/draft", headers=master).json()["map"]["name"] == "Edição da Ana"


def test_garbage_drafts_rejected(client, master):
    create_mall(client, master)
    for bad in [{}, {"floors": []}, {"floors": "x", "units": [], "nodes": [], "edges": []}, []]:
        r = client.put(f"/api/malls/{MALL}/draft", json={"baseRev": 1, "map": bad}, headers=master)
        assert r.status_code == 422, bad
    assert client.put(f"/api/malls/{MALL}/draft", json={"baseRev": 0, "map": good_map()}, headers=master).status_code == 422


def test_oversized_draft_rejected(settings):
    s = replace(settings, max_package_bytes=500)
    with TestClient(create_app(s)) as c:
        add_user(c, "m@x.test", "senha-forte-1")
        h = auth(login(c, "m@x.test", "senha-forte-1")["accessToken"])
        create_mall(c, h)
        r = c.put(f"/api/malls/{MALL}/draft", json={"baseRev": 1, "map": good_map()}, headers=h)
        assert r.status_code == 413


def test_invalid_draft_can_be_saved_but_not_published(client, master):
    create_mall(client, master)
    bad = good_map()
    bad["floors"][0]["scaleCalibrated"] = False
    rev = set_draft(client, master, MALL, bad)
    r = client.post(f"/api/malls/{MALL}/publish", json={"baseRev": rev}, headers=master)
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail["code"] == "VALIDATION_FAILED"
    assert any(e["code"] == "FLOOR_SCALE_UNCALIBRATED" for e in detail["report"]["errors"])
    assert not (client.app.state.settings.public_dir / "p" / MALL / "latest.json").exists()


# ---------------------------------------------------------------- publicação / rollback
def publish(client, headers, note=None):
    rev = client.get(f"/api/malls/{MALL}/draft", headers=headers).json()["rev"]
    return client.post(f"/api/malls/{MALL}/publish", json={"baseRev": rev, "note": note}, headers=headers)


def pub_dir(client):
    return client.app.state.settings.public_dir / "p" / MALL


def test_publish_writes_immutable_version_and_latest(client, master):
    create_mall(client, master)
    set_draft(client, master, MALL, good_map())
    r = publish(client, master, "primeira")
    assert r.status_code == 200 and r.json()["version"] == 1
    v1 = json.loads((pub_dir(client) / "v1.json").read_text(encoding="utf-8"))
    latest = json.loads((pub_dir(client) / "latest.json").read_text(encoding="utf-8"))
    assert v1 == latest
    assert latest["schemaVersion"] == 1 and latest["mallId"] == MALL and latest["version"] == 1
    assert latest["map"]["id"] == MALL and len(latest["contentHash"]) == 64
    # servido pelo mesmo caminho que o PWA usa
    assert client.get(f"/p/{MALL}/latest.json").json()["version"] == 1
    assert not list(pub_dir(client).glob("*.tmp"))


def test_publish_rejects_stale_revision(client, master):
    create_mall(client, master)
    rev = set_draft(client, master, MALL, good_map())
    set_draft(client, master, MALL, good_map())  # alguém salvou de novo
    r = client.post(f"/api/malls/{MALL}/publish", json={"baseRev": rev}, headers=master)
    assert r.status_code == 409 and r.json()["detail"]["code"] == "DRAFT_STALE"


def test_second_publish_increments_and_rollback_repoints_latest(client, master):
    create_mall(client, master)
    m1 = good_map()
    m1["name"] = "Versão Um"
    set_draft(client, master, MALL, m1)
    assert publish(client, master).json()["version"] == 1
    m2 = good_map()
    m2["name"] = "Versão Dois"
    set_draft(client, master, MALL, m2)
    assert publish(client, master).json()["version"] == 2
    assert client.get(f"/p/{MALL}/latest.json").json()["map"]["name"] == "Versão Dois"

    assert client.post(f"/api/malls/{MALL}/rollback/1", headers=master).status_code == 200
    assert client.get(f"/p/{MALL}/latest.json").json()["map"]["name"] == "Versão Um"
    versions = client.get(f"/api/malls/{MALL}/versions", headers=master).json()
    assert [(v["version"], v["isLive"]) for v in versions] == [(2, False), (1, True)]
    # depois do rollback, a próxima publicação NÃO reaproveita o número 2
    set_draft(client, master, MALL, m2)
    assert publish(client, master).json()["version"] == 3
    assert client.post(f"/api/malls/{MALL}/rollback/99", headers=master).status_code == 404


def test_latest_json_recreated_from_database_on_startup(settings):
    with TestClient(create_app(settings)) as c:
        add_user(c, "m@x.test", "senha-forte-1")
        h = auth(login(c, "m@x.test", "senha-forte-1")["accessToken"])
        create_mall(c, h)
        set_draft(c, h, MALL, good_map())
        assert publish(c, h).status_code == 200
    latest = settings.public_dir / "p" / MALL / "latest.json"
    latest.unlink()  # simula banco restaurado em máquina nova / disco limpo
    (settings.public_dir / "p" / MALL / "v1.json").unlink()
    with TestClient(create_app(settings)) as c2:
        assert latest.is_file()
        assert c2.get(f"/p/{MALL}/latest.json").json()["version"] == 1


# ---------------------------------------------------------------- imagem da planta
def png_bytes(w=800, h=600, color=(200, 30, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, format="PNG")
    return buf.getvalue()


def test_image_upload_converts_to_webp_and_is_referenceable(client, master):
    create_mall(client, master)
    r = client.post(f"/api/malls/{MALL}/images", files={"file": ("../../evil name.png", png_bytes(), "image/png")}, headers=master)
    assert r.status_code == 201, r.text
    url = r.json()["url"]
    assert url.startswith(f"/p/{MALL}/floors/") and url.endswith(".webp") and ".." not in url
    assert client.get(url).headers["content-type"] == "image/webp"

    m = good_map()
    m["floors"][0]["backgroundImage"] = url
    m["floors"][0]["width"], m["floors"][0]["height"] = 800, 600  # mesma proporção da imagem
    set_draft(client, master, MALL, m)
    report = client.post(f"/api/malls/{MALL}/validate", headers=master).json()
    assert report["ok"], report["errors"]
    assert "FLOOR_IMAGE_ASPECT" not in {w["code"] for w in report["warnings"]}
    m["floors"][0]["width"], m["floors"][0]["height"] = 400, 600  # proporção diferente → aviso
    set_draft(client, master, MALL, m)
    report = client.post(f"/api/malls/{MALL}/validate", headers=master).json()
    assert "FLOOR_IMAGE_ASPECT" in {w["code"] for w in report["warnings"]}


def test_image_upload_rejects_garbage(client, master):
    create_mall(client, master)
    for name, data in [("a.png", b"isto nao e imagem"), ("a.svg", b"<svg onload=alert(1)/>"), ("a.png", png_bytes(50, 50))]:
        r = client.post(f"/api/malls/{MALL}/images", files={"file": (name, data, "image/png")}, headers=master)
        assert r.status_code == 422, name


def test_image_upload_size_limit(settings):
    s = replace(settings, max_upload_bytes=1000)
    with TestClient(create_app(s)) as c:
        add_user(c, "m@x.test", "senha-forte-1")
        h = auth(login(c, "m@x.test", "senha-forte-1")["accessToken"])
        create_mall(c, h)
        r = c.post(f"/api/malls/{MALL}/images", files={"file": ("a.png", png_bytes(900, 900), "image/png")}, headers=h)
        assert r.status_code == 413


def test_image_upload_needs_auth_and_scope(client, master):
    create_mall(client, master, "shop-a")
    create_mall(client, master, "shop-b")
    assert client.post("/api/malls/shop-a/images", files={"file": ("a.png", png_bytes(), "image/png")}).status_code == 401
    add_user(client, "adm-a@x.test", "senha-forte-1", role="mall_admin", mall_id="shop-a")
    h = auth(login(client, "adm-a@x.test", "senha-forte-1")["accessToken"])
    assert client.post("/api/malls/shop-b/images", files={"file": ("a.png", png_bytes(), "image/png")}, headers=h).status_code == 404


# ---------------------------------------------------------------- feedback, beacon, health
def test_feedback_flow(client, master):
    create_mall(client, master)
    body = {"mallId": MALL, "category": "store_closed", "message": "Loja X fechou", "routeContext": {"unit": "u-a"}}
    r = client.post("/api/feedback", json=body)
    assert r.status_code == 201
    fid = r.json()["id"]
    assert client.post("/api/feedback", json={**body, "category": "xss<script>"}).status_code == 422
    assert client.post("/api/feedback", json={**body, "mallId": "nao-existe"}).status_code == 404
    items = client.get(f"/api/malls/{MALL}/feedback", headers=master).json()
    assert len(items) == 1 and items[0]["status"] == "new"
    assert client.patch(f"/api/feedback/{fid}", json={"status": "done"}, headers=master).json()["status"] == "done"
    assert client.patch(f"/api/feedback/{fid}", json={"status": "inventado"}, headers=master).status_code == 422
    assert client.get(f"/api/malls/{MALL}/feedback?status=new", headers=master).json() == []


def test_feedback_is_rate_limited_and_scoped(client, master):
    create_mall(client, master, "shop-a")
    create_mall(client, master, "shop-b")
    body = {"mallId": "shop-a", "category": "other", "message": "ola mundo"}
    codes = [client.post("/api/feedback", json=body).status_code for _ in range(12)]
    assert codes.count(201) == 10 and 429 in codes
    add_user(client, "adm-b@x.test", "senha-forte-1", role="mall_admin", mall_id="shop-b")
    h = auth(login(client, "adm-b@x.test", "senha-forte-1")["accessToken"])
    fid = client.get("/api/malls/shop-a/feedback", headers=master).json()[0]["id"]
    assert client.patch(f"/api/feedback/{fid}", json={"status": "done"}, headers=h).status_code == 404


def test_beacon_accepts_small_and_rejects_large(client):
    assert client.post("/api/beacon", json={"message": "boom", "stack": "at x"}).status_code == 204
    assert client.post("/api/beacon", json={"message": "x" * 600}).status_code == 422


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_prod_requires_strong_secret(monkeypatch):
    import pytest

    from app.config import load_settings

    monkeypatch.setenv("MALLWAY_ENV", "prod")
    monkeypatch.setenv("MALLWAY_SECRET_KEY", "curta")
    with pytest.raises(RuntimeError):
        load_settings()
    monkeypatch.delenv("MALLWAY_SECRET_KEY")
    with pytest.raises(RuntimeError):
        load_settings()
