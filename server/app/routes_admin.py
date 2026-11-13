from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import Settings
from .deps import current_user, err, get_db, get_settings, load_mall, require_master
from .images import ImageRejected, process_floor_image, store_floor_image
from .models import AdminUser, Feedback, MapVersion, Mall, utcnow
from .publish import build_package, canonical_bytes, republish_static, set_latest, write_version_file
from .schemas import DraftSave, FeedbackStatus, MallCreate, PublishIn
from .validator import validate_map

log = logging.getLogger("mallway.admin")
router = APIRouter(prefix="/api", tags=["admin"])

DRAFT_LISTS = ("floors", "units", "nodes", "edges")


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


def empty_map(mall_id: str, name: str, address: str | None) -> dict:
    return {
        "id": mall_id,
        "name": name,
        "address": address or "",
        "status": "draft",
        "floors": [
            {"id": "floor-1", "name": "Piso 1", "shortName": "L1", "elevation": 0, "width": 1000, "height": 800,
             "metersPerPixel": 0.25, "scaleCalibrated": False}
        ],
        "units": [], "nodes": [], "edges": [], "verticalConnectors": [],
    }


def _summary(m: Mall) -> dict:
    units = m.draft_json.get("units") if isinstance(m.draft_json, dict) else None
    return {
        "id": m.id, "name": m.name, "status": m.status, "liveVersion": m.live_version,
        "draftRev": m.draft_rev, "draftUpdatedAt": iso(m.draft_updated_at), "draftUpdatedBy": m.draft_updated_by,
        "unitCount": len(units) if isinstance(units, list) else 0,
    }


def _check_draft_shape(map_data: object, s: Settings) -> None:
    if not isinstance(map_data, dict) or not all(isinstance(map_data.get(k), list) for k in DRAFT_LISTS):
        raise err(422, "DRAFT_SHAPE", "Arquivo de mapa inválido: faltam floors, units, nodes ou edges")
    if len(canonical_bytes(map_data)) > s.max_package_bytes:
        raise err(413, "DRAFT_TOO_LARGE", "Mapa grande demais para salvar")


@router.get("/malls")
def list_malls(user: AdminUser = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    q = select(Mall).order_by(Mall.name)
    if user.role != "master":
        q = q.where(Mall.id == user.mall_id)
    return [_summary(m) for m in db.execute(q).scalars()]


@router.post("/malls", status_code=201)
def create_mall(body: MallCreate, user: AdminUser = Depends(require_master), db: Session = Depends(get_db)) -> dict:
    if db.get(Mall, body.id) is not None:
        raise err(409, "MALL_EXISTS", f"Já existe um shopping com o id '{body.id}'")
    mall = Mall(id=body.id, name=body.name, status="draft", draft_json=empty_map(body.id, body.name, body.address),
                draft_rev=1, draft_updated_by=user.email)
    db.add(mall)
    db.commit()
    return _summary(mall)


@router.get("/malls/{mall_id}/draft")
def get_draft(mall_id: str, user: AdminUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    m = load_mall(mall_id, user, db)
    return {"rev": m.draft_rev, "map": m.draft_json, "updatedAt": iso(m.draft_updated_at),
            "updatedBy": m.draft_updated_by, "liveVersion": m.live_version, "status": m.status}


@router.put("/malls/{mall_id}/draft")
def save_draft(mall_id: str, body: DraftSave, user: AdminUser = Depends(current_user),
               db: Session = Depends(get_db), s: Settings = Depends(get_settings)) -> dict:
    m = load_mall(mall_id, user, db)
    _check_draft_shape(body.map, s)
    new_map = {**body.map, "id": m.id}  # o servidor é a autoridade sobre o id
    # Compare-and-swap atômico no SQL: só grava se ninguém salvou depois da revisão que este cliente viu.
    res = db.execute(
        update(Mall)
        .where(Mall.id == m.id, Mall.draft_rev == body.baseRev)
        .values(draft_json=new_map, draft_rev=Mall.draft_rev + 1, draft_updated_at=utcnow(),
                draft_updated_by=user.email, name=str(new_map.get("name") or m.name)[:200])
        .execution_options(synchronize_session=False)
    )
    if res.rowcount == 0:
        db.rollback()
        db.refresh(m)
        who = m.draft_updated_by or "outra pessoa"
        raise err(409, "DRAFT_CONFLICT",
                  f"{who} salvou alterações neste mapa. Recarregue antes de continuar para não perder o trabalho dela",
                  currentRev=m.draft_rev, updatedBy=m.draft_updated_by, updatedAt=iso(m.draft_updated_at))
    db.commit()
    db.refresh(m)
    return {"rev": m.draft_rev, "updatedAt": iso(m.draft_updated_at)}


@router.post("/malls/{mall_id}/validate")
def validate_draft(mall_id: str, user: AdminUser = Depends(current_user), db: Session = Depends(get_db),
                   s: Settings = Depends(get_settings)) -> dict:
    m = load_mall(mall_id, user, db)
    return {"rev": m.draft_rev, **validate_map(m.draft_json, max_bytes=s.max_package_bytes, mall_id=m.id, public_dir=s.public_dir)}


@router.post("/malls/{mall_id}/publish")
def publish(mall_id: str, body: PublishIn, user: AdminUser = Depends(current_user), db: Session = Depends(get_db),
            s: Settings = Depends(get_settings)) -> dict:
    m = load_mall(mall_id, user, db)
    if body.baseRev != m.draft_rev:
        raise err(409, "DRAFT_STALE", "O rascunho mudou desde que você o abriu. Recarregue e valide de novo antes de publicar",
                  currentRev=m.draft_rev)
    report = validate_map(m.draft_json, max_bytes=s.max_package_bytes, mall_id=m.id, public_dir=s.public_dir)
    if not report["ok"]:
        raise err(422, "VALIDATION_FAILED", "O mapa tem erros que impedem a publicação", report=report)

    version = (db.execute(select(func.max(MapVersion.version)).where(MapVersion.mall_id == m.id)).scalar() or 0) + 1
    package = build_package(m.id, version, m.draft_json)
    try:
        write_version_file(s.public_dir, m.id, version, package)  # imutável: arquivo órfão se o commit falhar é inofensivo
        db.add(MapVersion(mall_id=m.id, version=version, package_json=package, content_hash=package["contentHash"],
                          note=body.note, published_by=user.email))
        m.live_version = version
        m.status = "active"
        db.commit()
    except IntegrityError:
        db.rollback()
        raise err(409, "PUBLISH_RACE", "Outra publicação aconteceu ao mesmo tempo. Tente de novo") from None
    try:
        set_latest(s.public_dir, m.id, version)
    except OSError:
        log.exception("falha ao atualizar latest.json do shopping %s (versão %s já gravada no banco)", m.id, version)
        raise err(500, "STATIC_WRITE_FAILED",
                  f"Versão {version} gravada, mas o arquivo público não pôde ser atualizado. Use 'Ressincronizar'") from None
    return {"version": version, "contentHash": package["contentHash"], "warnings": report["warnings"], "stats": report["stats"]}


@router.get("/malls/{mall_id}/versions")
def list_versions(mall_id: str, user: AdminUser = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    m = load_mall(mall_id, user, db)
    rows = db.execute(select(MapVersion).where(MapVersion.mall_id == m.id).order_by(MapVersion.version.desc())).scalars()
    return [{"version": r.version, "publishedAt": iso(r.published_at), "publishedBy": r.published_by, "note": r.note,
             "contentHash": r.content_hash, "isLive": r.version == m.live_version} for r in rows]


@router.post("/malls/{mall_id}/rollback/{version}")
def rollback(mall_id: str, version: int, user: AdminUser = Depends(current_user), db: Session = Depends(get_db),
             s: Settings = Depends(get_settings)) -> dict:
    m = load_mall(mall_id, user, db)
    row = db.execute(select(MapVersion).where(MapVersion.mall_id == m.id, MapVersion.version == version)).scalar_one_or_none()
    if row is None:
        raise err(404, "VERSION_NOT_FOUND", f"Versão {version} não existe")
    m.live_version = version
    m.status = "active"
    db.commit()
    republish_static(db, s.public_dir, m)
    return {"liveVersion": version}


@router.post("/malls/{mall_id}/resync")
def resync(mall_id: str, user: AdminUser = Depends(require_master), db: Session = Depends(get_db),
           s: Settings = Depends(get_settings)) -> dict:
    m = load_mall(mall_id, user, db)
    return {"ok": republish_static(db, s.public_dir, m)}


@router.post("/malls/{mall_id}/images", status_code=201)
def upload_image(mall_id: str, request: Request, file: UploadFile = File(...), user: AdminUser = Depends(current_user),
                 db: Session = Depends(get_db), s: Settings = Depends(get_settings)) -> dict:
    m = load_mall(mall_id, user, db)
    raw = file.file.read(s.max_upload_bytes + 1)
    if len(raw) > s.max_upload_bytes:
        raise err(413, "IMAGE_TOO_LARGE", f"Imagem maior que {s.max_upload_bytes // (1024 * 1024)} MB")
    try:
        webp, w, h = process_floor_image(raw)
    except ImageRejected as exc:
        raise err(422, exc.code, exc.message) from None
    return {"url": store_floor_image(s.public_dir, m.id, webp), "width": w, "height": h, "bytes": len(webp)}


@router.get("/malls/{mall_id}/feedback")
def list_feedback(mall_id: str, status: str | None = None, user: AdminUser = Depends(current_user),
                  db: Session = Depends(get_db)) -> list[dict]:
    m = load_mall(mall_id, user, db)
    q = select(Feedback).where(Feedback.mall_id == m.id).order_by(Feedback.created_at.desc()).limit(200)
    if status:
        q = q.where(Feedback.status == status)
    return [{"id": f.id, "createdAt": iso(f.created_at), "category": f.category, "message": f.message,
             "routeContext": f.route_context, "status": f.status} for f in db.execute(q).scalars()]


@router.patch("/feedback/{feedback_id}")
def update_feedback(feedback_id: int, body: FeedbackStatus, user: AdminUser = Depends(current_user),
                    db: Session = Depends(get_db)) -> dict:
    f = db.get(Feedback, feedback_id)
    if f is None:
        raise err(404, "NOT_FOUND", "Feedback não encontrado")
    load_mall(f.mall_id, user, db)  # garante que o usuário tem acesso ao shopping deste feedback
    f.status = body.status
    db.commit()
    return {"id": f.id, "status": f.status}
