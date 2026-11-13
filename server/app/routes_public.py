from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from .deps import client_ip, err, get_db, get_settings
from .models import Feedback, Mall
from .schemas import BeaconIn, FeedbackIn

router = APIRouter(prefix="/api", tags=["public"])
beacon_log = logging.getLogger("mallway.beacon")


def _limit(request: Request, bucket: str, limit: int) -> None:
    if not request.app.state.limiter.allow(f"{bucket}:{client_ip(request)}", limit=limit, window_sec=60):
        raise err(429, "RATE_LIMITED", "Muitas requisições. Tente novamente em instantes")


@router.get("/health")
def health(request: Request, db: Session = Depends(get_db)) -> dict:
    """Usado pelo omnia-health: banco responde e a pasta pública é gravável."""
    db.execute(text("SELECT 1"))
    public_dir = get_settings(request).public_dir
    probe = public_dir / ".health"
    try:
        public_dir.mkdir(parents=True, exist_ok=True)
        probe.write_text("ok")
        probe.unlink()
    except OSError as exc:
        raise err(503, "PUBLIC_DIR_UNWRITABLE", f"Pasta pública não gravável: {exc}") from None
    return {"status": "ok"}


@router.post("/feedback", status_code=201)
def create_feedback(body: FeedbackIn, request: Request, db: Session = Depends(get_db)) -> dict:
    _limit(request, "feedback", 10)
    if db.get(Mall, body.mallId) is None:
        raise err(404, "MALL_NOT_FOUND", "Shopping não encontrado")
    fb = Feedback(mall_id=body.mallId, category=body.category, message=body.message.strip(), route_context=body.routeContext)
    db.add(fb)
    db.commit()
    return {"id": fb.id}


@router.post("/beacon", status_code=204)
def beacon(body: BeaconIn, request: Request) -> None:
    """Erros do front-end viram uma linha de log estruturada (journald), sem tabela e sem dado pessoal."""
    _limit(request, "beacon", 30)
    beacon_log.warning(json.dumps({"mall": body.mallId, "msg": body.message, "stack": body.stack, "url": body.url,
                                   "ua": request.headers.get("user-agent", "")[:200]}, ensure_ascii=False))
