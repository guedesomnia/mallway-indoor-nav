from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

SCHEMA_VERSION = 1
MIN_SECRET_LEN = 32


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    public_dir: Path
    env: str = "dev"
    access_ttl_min: int = 30
    refresh_ttl_days: int = 7
    cors_origins: tuple[str, ...] = ()
    serve_static: bool = True
    max_package_bytes: int = 2 * 1024 * 1024
    max_upload_bytes: int = 10 * 1024 * 1024
    login_max_attempts: int = 5
    login_window_sec: int = 60


def load_settings() -> Settings:
    env = os.environ.get("MALLWAY_ENV", "dev")
    secret = os.environ.get("MALLWAY_SECRET_KEY", "")
    if env == "prod" and len(secret) < MIN_SECRET_LEN:
        raise RuntimeError(
            f"MALLWAY_SECRET_KEY ausente ou curta demais (mínimo {MIN_SECRET_LEN} caracteres) em produção"
        )
    if not secret:
        secret = "dev-only-secret-change-me-dev-only-secret"
    origins = tuple(
        o.strip() for o in os.environ.get("MALLWAY_CORS_ORIGINS", "").split(",") if o.strip()
    )
    return Settings(
        database_url=os.environ.get("MALLWAY_DATABASE_URL", "sqlite:///./mallway-dev.db"),
        secret_key=secret,
        public_dir=Path(os.environ.get("MALLWAY_PUBLIC_DIR", "./public_out")).resolve(),
        env=env,
        cors_origins=origins,
        serve_static=os.environ.get("MALLWAY_SERVE_STATIC", "1" if env != "prod" else "0") == "1",
    )
