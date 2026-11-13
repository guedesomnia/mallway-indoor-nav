from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import Settings
from .deps import client_ip, current_user, err, get_db, get_settings
from .models import AdminUser
from .schemas import LoginIn, RefreshIn, TokenOut, UserOut
from .security import DUMMY_HASH, create_token, decode_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(u: AdminUser) -> UserOut:
    return UserOut(id=u.id, email=u.email, role=u.role, mallId=u.mall_id)


def _tokens(u: AdminUser, s: Settings) -> TokenOut:
    return TokenOut(
        accessToken=create_token(s.secret_key, user_id=u.id, token_version=u.token_version, kind="access", ttl=timedelta(minutes=s.access_ttl_min)),
        refreshToken=create_token(s.secret_key, user_id=u.id, token_version=u.token_version, kind="refresh", ttl=timedelta(days=s.refresh_ttl_days)),
        user=_user_out(u),
    )


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db), s: Settings = Depends(get_settings)) -> TokenOut:
    limiter = request.app.state.limiter
    ip_ok = limiter.allow(f"login:ip:{client_ip(request)}", limit=s.login_max_attempts, window_sec=s.login_window_sec)
    # Limite por e-mail barra tentativa distribuída contra uma conta específica.
    email_ok = limiter.allow(f"login:email:{body.email}", limit=s.login_max_attempts * 2, window_sec=s.login_window_sec)
    if not (ip_ok and email_ok):
        raise err(429, "RATE_LIMITED", "Muitas tentativas. Aguarde um minuto e tente de novo")

    user = db.execute(select(AdminUser).where(AdminUser.email == body.email)).scalar_one_or_none()
    # Sempre executa uma verificação de hash, exista o usuário ou não (mesmo tempo de resposta).
    ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if not (user and ok and user.is_active):
        raise err(401, "BAD_CREDENTIALS", "E-mail ou senha incorretos")
    return _tokens(user, s)


@router.post("/refresh", response_model=TokenOut)
def refresh(body: RefreshIn, db: Session = Depends(get_db), s: Settings = Depends(get_settings)) -> TokenOut:
    payload = decode_token(s.secret_key, body.refreshToken, kind="refresh")
    user = db.get(AdminUser, int(payload["sub"])) if payload else None
    if user is None or not user.is_active or user.token_version != payload.get("tv"):
        raise err(401, "TOKEN_INVALID", "Sessão expirada. Entre novamente")
    return _tokens(user, s)


@router.get("/me", response_model=UserOut)
def me(user: AdminUser = Depends(current_user)) -> UserOut:
    return _user_out(user)
