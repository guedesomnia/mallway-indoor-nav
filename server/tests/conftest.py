from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.models import AdminUser, Mall
from app.security import hash_password


def make_settings(tmp_path: Path, **over) -> Settings:
    base = Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        secret_key="t" * 40,
        public_dir=tmp_path / "public",
        env="test",
        login_max_attempts=3,
        serve_static=True,
    )
    return replace(base, **over)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)


@pytest.fixture
def client(settings: Settings):
    with TestClient(create_app(settings)) as c:
        yield c


def add_user(client: TestClient, email: str, password: str, role: str = "master", mall_id: str | None = None, active: bool = True) -> int:
    with client.app.state.session_factory() as db:
        u = AdminUser(email=email, password_hash=hash_password(password), role=role, mall_id=mall_id, is_active=active)
        db.add(u)
        db.commit()
        return u.id


def login(client: TestClient, email: str, password: str) -> dict:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def master(client: TestClient) -> dict:
    add_user(client, "master@mallway.test", "senha-forte-1")
    return auth(login(client, "master@mallway.test", "senha-forte-1")["accessToken"])


def create_mall(client: TestClient, headers: dict, mall_id: str = "shop-teste") -> dict:
    r = client.post("/api/malls", json={"id": mall_id, "name": "Shopping Teste"}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def set_draft(client: TestClient, headers: dict, mall_id: str, map_data: dict) -> int:
    rev = client.get(f"/api/malls/{mall_id}/draft", headers=headers).json()["rev"]
    r = client.put(f"/api/malls/{mall_id}/draft", json={"baseRev": rev, "map": map_data}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["rev"]


def count_malls(client: TestClient) -> int:
    with client.app.state.session_factory() as db:
        return db.query(Mall).count()
