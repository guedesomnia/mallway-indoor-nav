from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import Settings, load_settings
from .db import Base, make_engine, make_session_factory
from .publish import resync_missing
from .routes_admin import router as admin_router
from .routes_auth import router as auth_router
from .routes_public import router as public_router
from .security import RateLimiter

log = logging.getLogger("mallway")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    (settings.public_dir / "p").mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        Base.metadata.create_all(engine)
        with session_factory() as db:
            fixed = resync_missing(db, settings.public_dir)
            if fixed:
                log.warning("latest.json recriado para %d shopping(s) a partir do banco", fixed)
        yield
        engine.dispose()

    prod = settings.env == "prod"
    app = FastAPI(title="Mallway API", lifespan=lifespan, docs_url=None if prod else "/docs", redoc_url=None, openapi_url=None if prod else "/openapi.json")
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.limiter = RateLimiter()

    if settings.cors_origins:
        app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins), allow_methods=["*"], allow_headers=["*"])

    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(public_router)
    if settings.serve_static:  # em produção o Nginx serve /p/ direto do disco
        app.mount("/p", StaticFiles(directory=settings.public_dir / "p"), name="public")
    return app


def get_app() -> FastAPI:
    """Entrada do uvicorn: `uvicorn app.main:get_app --factory`."""
    return create_app()
