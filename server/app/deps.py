from __future__ import annotations

from collections.abc import Iterator

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import Settings
from .models import AdminUser, Mall
from .security import decode_token

_bearer = HTTPBearer(auto_error=False)


def err(status: int, code: str, message: str, **extra: object) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message, **extra})


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request) -> Iterator[Session]:
    session: Session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AdminUser:
    if creds is None:
        raise err(401, "AUTH_REQUIRED", "Faça login para continuar")
    payload = decode_token(settings.secret_key, creds.credentials, kind="access")
    if payload is None:
        raise err(401, "TOKEN_INVALID", "Sessão expirada. Entre novamente")
    user = db.get(AdminUser, int(payload["sub"]))
    # Usuário desativado ou com senha trocada perde acesso imediatamente, não só ao expirar o token.
    if user is None or not user.is_active or user.token_version != payload.get("tv"):
        raise err(401, "TOKEN_INVALID", "Sessão expirada. Entre novamente")
    return user


def require_master(user: AdminUser = Depends(current_user)) -> AdminUser:
    if user.role != "master":
        raise err(403, "FORBIDDEN", "Apenas a equipe master pode fazer isso")
    return user


def load_mall(mall_id: str, user: AdminUser, db: Session) -> Mall:
    """Shopping acessível ao usuário. Para quem não tem acesso devolve 404 (não revela que existe)."""
    mall = db.get(Mall, mall_id)
    if mall is None or (user.role != "master" and user.mall_id != mall_id):
        raise err(404, "MALL_NOT_FOUND", "Shopping não encontrado")
    return mall
