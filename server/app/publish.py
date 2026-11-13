from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import SCHEMA_VERSION
from .models import MapVersion, Mall

log = logging.getLogger("mallway.publish")


def canonical_bytes(obj: object) -> bytes:
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False, sort_keys=True).encode()


def build_package(mall_id: str, version: int, map_data: dict) -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "mallId": mall_id,
        "version": version,
        "publishedAt": datetime.now(timezone.utc).isoformat(),
        "contentHash": hashlib.sha256(canonical_bytes(map_data)).hexdigest(),
        "map": map_data,
    }


def atomic_write(path: Path, data: bytes) -> None:
    """Escreve em arquivo temporário e troca por rename: o PWA nunca baixa um JSON pela metade."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    with open(tmp, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def mall_dir(public_dir: Path, mall_id: str) -> Path:
    return public_dir / "p" / mall_id


def write_version_file(public_dir: Path, mall_id: str, version: int, package: dict) -> None:
    atomic_write(mall_dir(public_dir, mall_id) / f"v{version}.json", canonical_bytes(package))


def set_latest(public_dir: Path, mall_id: str, version: int) -> None:
    src = mall_dir(public_dir, mall_id) / f"v{version}.json"
    atomic_write(mall_dir(public_dir, mall_id) / "latest.json", src.read_bytes())


def republish_static(db: Session, public_dir: Path, mall: Mall) -> bool:
    """Recria os arquivos estáticos da versão ao vivo a partir do banco (fonte da verdade)."""
    if mall.live_version is None:
        return False
    row = db.execute(
        select(MapVersion).where(MapVersion.mall_id == mall.id, MapVersion.version == mall.live_version)
    ).scalar_one_or_none()
    if row is None:
        log.error("live_version %s do shopping %s não existe em map_versions", mall.live_version, mall.id)
        return False
    write_version_file(public_dir, mall.id, row.version, row.package_json)
    set_latest(public_dir, mall.id, row.version)
    return True


def resync_missing(db: Session, public_dir: Path) -> int:
    """No startup: se o banco foi restaurado numa máquina nova, o latest.json some. Recria o que faltar."""
    fixed = 0
    for mall in db.execute(select(Mall).where(Mall.live_version.is_not(None))).scalars():
        if not (mall_dir(public_dir, mall.id) / "latest.json").is_file():
            if republish_static(db, public_dir, mall):
                fixed += 1
    return fixed
