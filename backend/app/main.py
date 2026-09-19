"""FastAPI application for the FoG Cueing Dashboard."""

from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .models import (
    ConfigUpdate,
    FogEvent,
    ManualCueRequest,
    SessionConfig,
    StatusResponse,
)
from .session import Session


@asynccontextmanager
async def lifespan(app: FastAPI):
    session = Session()
    app.state.session = session
    await session.start()
    try:
        yield
    finally:
        await session.stop()


app = FastAPI(
    title="FoG Cueing Dashboard API",
    version=__version__,
    description="Experimental wearable freezing-of-gait detection and cueing demo.",
    lifespan=lifespan,
)

_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_session() -> Session:
    return app.state.session


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "version": __version__}


@app.get("/api/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    return get_session().status()


@app.get("/api/config", response_model=SessionConfig)
async def get_config() -> SessionConfig:
    return get_session().config


@app.post("/api/config", response_model=SessionConfig)
async def update_config(update: ConfigUpdate) -> SessionConfig:
    return get_session().update_config(update)


@app.get("/api/events", response_model=List[FogEvent])
async def events() -> List[FogEvent]:
    return get_session().events()


@app.post("/api/cue/manual", response_model=StatusResponse)
async def manual_cue(request: ManualCueRequest) -> StatusResponse:
    session = get_session()
    session.set_manual_cue(request.active)
    return session.status()


@app.post("/api/cue/auto", response_model=StatusResponse)
async def clear_manual_cue() -> StatusResponse:
    """Return cueing control to the automatic detector."""
    session = get_session()
    session.clear_manual_cue()
    return session.status()


@app.websocket("/ws/stream")
async def stream(websocket: WebSocket) -> None:
    await websocket.accept()
    session = get_session()
    queue = session.subscribe()

    # Prime the client with the current snapshot immediately.
    await websocket.send_json(
        {
            "type": "snapshot",
            "status": session.status().model_dump(),
            "recent": session.recent_trace(),
        }
    )

    try:
        while True:
            payload = await queue.get()
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        raise
    finally:
        session.unsubscribe(queue)
