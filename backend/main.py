"""FoG cueing research prototype API.

Research / assistive-technology prototype — NOT a validated medical device.
Cloud (Grok, RunPod) analyzes and verifies. The haptic motor is local/edge-only.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models import (
    CueParams,
    EventRecord,
    GrokAnalysis,
    HealthResponse,
    IMUPacket,
    IMUSample,
    RecoveryRecord,
    RunPodResult,
    SessionState,
)
from services import grok_service, runpod_service
from session_engine import SessionEngine
from websocket_manager import WebSocketManager

load_dotenv()

hub = WebSocketManager()
engine = SessionEngine(hub)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await engine.start()
    yield
    await engine.stop()


app = FastAPI(
    title="FoG Cueing Research Dashboard",
    version="0.1.0",
    description=(
        "HackMIT 2026 experimental wearable freeze-like gait cueing prototype. "
        "Not a medical device. Cloud models do not drive the actuator."
    ),
    lifespan=lifespan,
)

origins = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        phase=engine.machine.phase,
        connections=engine.connections,
    )


@app.websocket("/ws/imu")
async def ws_imu(ws: WebSocket) -> None:
    await hub.connect(ws)
    try:
        for payload in engine.snapshot_payloads():
            await ws.send_json(payload)
        while True:
            # Wearable or demo client may push IMU JSON; otherwise we keep
            # the socket open for server → UI broadcasts.
            msg = await ws.receive_json()
            if isinstance(msg, dict) and "ax" in msg:
                packet = IMUPacket.model_validate(msg)
                await engine.ingest_imu(packet)
    except WebSocketDisconnect:
        hub.disconnect(ws)
    except Exception:
        hub.disconnect(ws)


@app.post("/api/imu", response_model=IMUSample)
async def post_imu(packet: IMUPacket) -> IMUSample:
    return await engine.ingest_imu(packet)


@app.post("/api/event", response_model=EventRecord)
async def post_event(event: EventRecord) -> EventRecord:
    return await engine.post_event(event)


@app.post("/api/cue")
async def post_cue(cue: CueParams) -> dict[str, Any]:
    try:
        session = await engine.arm_next_cue(cue)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "cue": session.cue.model_dump(), "armed": True}


@app.post("/api/recovery", response_model=SessionState)
async def post_recovery(rec: RecoveryRecord) -> SessionState:
    return await engine.post_recovery(rec)


@app.post("/api/runpod/inference", response_model=RunPodResult)
async def runpod_inference(body: dict[str, Any] | None = None) -> RunPodResult:
    features = body or {}
    hint = features.get("hint")
    result = await runpod_service.infer_gait(features, hint=hint)
    engine.session.runpod = result
    await hub.broadcast(
        {
            "type": "detection",
            "data": {
                "edge": engine.session.edge.model_dump(),
                "runpod": result.model_dump(),
            },
        }
    )
    return result


@app.post("/api/grok/analyze", response_model=GrokAnalysis)
async def grok_analyze() -> GrokAnalysis:
    return await engine.run_analysis()


@app.get("/api/session/current", response_model=SessionState)
async def current_session() -> SessionState:
    return engine.session


@app.get("/api/events", response_model=list[EventRecord])
async def list_events() -> list[EventRecord]:
    return engine.session.events


# ----- Demo controls (judges / local operator) --------------------------------


@app.post("/api/demo/start-walking", response_model=SessionState)
async def demo_start_walking() -> SessionState:
    return await engine.start_walking()


@app.post("/api/demo/simulate-freeze")
async def demo_simulate_freeze() -> dict[str, str]:
    return await engine.simulate_freeze()


@app.post("/api/demo/trigger-cue", response_model=SessionState)
async def demo_trigger_cue() -> SessionState:
    return await engine.trigger_cue()


@app.post("/api/demo/simulate-recovery", response_model=SessionState)
async def demo_simulate_recovery() -> SessionState:
    return await engine.simulate_recovery()


@app.post("/api/demo/run-analysis", response_model=GrokAnalysis)
async def demo_run_analysis() -> GrokAnalysis:
    return await engine.run_analysis()


@app.post("/api/demo/reset", response_model=SessionState)
async def demo_reset() -> SessionState:
    return await engine.reset_session()


@app.post("/api/demo/arm-cue", response_model=SessionState)
async def demo_arm_cue(cue: CueParams) -> SessionState:
    try:
        return await engine.arm_next_cue(cue)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
