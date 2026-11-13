from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Segmentos que o Nginx/API já usam como rota; um shopping com esse slug quebraria URLs.
RESERVED_SLUGS = {"api", "p", "auth", "admin", "assets", "static", "health", "demo", "master"}


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=200)

    @field_validator("email")
    @classmethod
    def _norm_email(cls, v: str) -> str:
        return v.strip().lower()


class RefreshIn(BaseModel):
    refreshToken: str = Field(min_length=10, max_length=2000)


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    mallId: str | None


class TokenOut(BaseModel):
    accessToken: str
    refreshToken: str
    user: UserOut


class MallCreate(BaseModel):
    id: str
    name: str = Field(min_length=2, max_length=200)
    address: str | None = Field(default=None, max_length=300)

    @field_validator("id")
    @classmethod
    def _slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not SLUG_RE.match(v) or v in RESERVED_SLUGS:
            raise ValueError("id inválido: use 3-50 caracteres a-z, 0-9 e hífen (não reservado)")
        return v


class DraftSave(BaseModel):
    baseRev: int = Field(ge=1)
    map: dict


class PublishIn(BaseModel):
    baseRev: int = Field(ge=1)
    note: str | None = Field(default=None, max_length=500)


class FeedbackIn(BaseModel):
    mallId: str = Field(max_length=50)
    category: str = Field(pattern=r"^(store_closed|store_moved|sign_missing|wrong_route|other)$")
    message: str = Field(min_length=3, max_length=1000)
    routeContext: dict | None = None

    @field_validator("routeContext")
    @classmethod
    def _small_ctx(cls, v: dict | None) -> dict | None:
        if v is not None and len(str(v)) > 2000:
            raise ValueError("routeContext grande demais")
        return v


class FeedbackStatus(BaseModel):
    status: str = Field(pattern=r"^(new|triaged|done)$")


class BeaconIn(BaseModel):
    message: str = Field(max_length=500)
    stack: str | None = Field(default=None, max_length=2000)
    mallId: str | None = Field(default=None, max_length=50)
    url: str | None = Field(default=None, max_length=300)
