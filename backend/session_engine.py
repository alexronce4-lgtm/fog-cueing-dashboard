"""In-memory session + demo orchestration.

The intervention loop is local/edge-first:
  SENSE → DETECT → INTERVENE → MEASURE RECOVERY → ANALYZE → ADAPT

RunPod verifies alongside / after edge detection.
Grok analyzes after recovery. Neither service commands the motor.
"""

from __future__ import annotations

import asyncio
import math
from datetime import datetime, timezone
from typing import Any, Optional

from demo.simulator import GaitSimulator
from models import (
    PHASE_LABELS,
    Classification,
    ConnectionStatus,
    CueInfo,
    CueParams,
    EdgeResult,
    EventRecord,
    GrokAnalysis,
    IMUPacket,
    IMUSample,
    Phase,
    RecoveryInfo,
    RecoveryRecord,
    RunPodResult,
    SessionState,
)
from services import grok_service, runpod_service
from state_machine import StateMachine
from websocket_manager import WebSocketManager


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _seed_events() -> list[EventRecord]:
    def ev(
        eid: str,
        iso: str,
        edge_c: float,
        rp_c: float,
        bpm: int,
        rec_ms: int,
    ) -> EventRecord:
        return EventRecord(
            episode_id=eid,
            timestamp_iso=iso,
            edge=EdgeResult(classification="freeze_like", confidence=edge_c),
            runpod=RunPodResult(
                classification="freeze_like",
                confidence=rp_c,
                model_version="mock-imu-v0",
                status="mock",
            ),
            cue=CueInfo(pattern="rhythmic", bpm=bpm, active=False, source="edge_local"),
            recovery=RecoveryRecord(detected=True, time_ms=rec_ms),
            status="Recovered",
            event_duration_ms=rec_ms + 900,
            pre_cadence=102.0,
            post_cadence=100.0 if bpm == 95 else 98.0,
        )

    return [
        ev("E1", "2026-09-19T16:02:11+00:00", 0.84, 0.91, 95, 1420),
        ev("E2", "2026-09-19T16:04:40+00:00", 0.77, 0.86, 80, 2630),
        ev("E3", "2026-09-19T16:07:18+00:00", 0.81, 0.89, 95, 1570),
    ]


class SessionEngine:
    def __init__(self, hub: WebSocketManager) -> None:
        self.hub = hub
        self.machine = StateMachine(Phase.WALKING)
        self.sim = GaitSimulator(102.0)
        self.session = self._fresh_session()
        self.connections = ConnectionStatus(
            esp32="DEMO",
            runpod="ONLINE" if runpod_service.runpod_configured() else "MOCK",
            grok="ONLINE" if grok_service.grok_configured() else "MOCK",
        )
        self._lock = asyncio.Lock()
        self._seq = 3
        self._episode: Optional[dict[str, Any]] = None
        self._freeze_task: Optional[asyncio.Task[None]] = None
        self._imu_task: Optional[asyncio.Task[None]] = None
        self._recovery_task: Optional[asyncio.Task[None]] = None
        self._last_esp32_ms: float = 0.0
        self._running = False
        self._hz = 25.0

    def _fresh_session(self) -> SessionState:
        events = _seed_events()
        return SessionState(
            session_id="hackmit-demo-001",
            baseline_cadence_bpm=102.0,
            current_cadence_bpm=102.0,
            events=events,
            phase=Phase.WALKING,
            phase_label=PHASE_LABELS[Phase.WALKING],
            cue=CueInfo(pattern="rhythmic", bpm=95, active=False),
            recovery=RecoveryInfo(pre_cadence=102.0),
            analysis=None,
        )

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._imu_task = asyncio.create_task(self._imu_loop())

    async def stop(self) -> None:
        self._running = False
        for task in (self._imu_task, self._freeze_task, self._recovery_task):
            if task:
                task.cancel()

    # ------------------------------------------------------------------ WS
    def snapshot_payloads(self) -> list[dict[str, Any]]:
        return [
            {"type": "status", "data": self.connections.model_dump()},
            {"type": "state", "data": self._state_data()},
            {"type": "session", "data": self.session.model_dump()},
            {"type": "detection", "data": self._detection_data()},
            {"type": "cue", "data": self.session.cue.model_dump()},
            {"type": "recovery", "data": self.session.recovery.model_dump()},
            {
                "type": "analysis",
                "data": self.session.analysis.model_dump() if self.session.analysis else None,
            },
        ]

    def _state_data(self) -> dict[str, Any]:
        return {
            "phase": self.machine.phase.value,
            "label": self.machine.label,
            "loop_step": self.machine.loop_step,
            "loop": ["SENSE", "DETECT", "INTERVENE", "MEASURE RECOVERY", "ANALYZE", "ADAPT"],
        }

    def _detection_data(self) -> dict[str, Any]:
        return {
            "edge": self.session.edge.model_dump(),
            "runpod": self.session.runpod.model_dump(),
        }

    async def _broadcast(self, payload: dict[str, Any]) -> None:
        await self.hub.broadcast(payload)

    async def _set_phase(self, phase: Phase, *, force: bool = False) -> None:
        if force:
            self.machine.force(phase)
        else:
            try:
                self.machine.enter(phase)
            except ValueError:
                self.machine.force(phase)
        self.session.phase = self.machine.phase
        self.session.phase_label = self.machine.label
        await self._broadcast({"type": "state", "data": self._state_data()})

    # ------------------------------------------------------------------ IMU
    async def _imu_loop(self) -> None:
        interval = 1.0 / self._hz
        while self._running:
            sample = self.sim.sample()
            self.session.current_cadence_bpm = sample.cadence_bpm or self.session.current_cadence_bpm
            await self._broadcast({"type": "imu", "data": sample.model_dump()})
            if self.connections.esp32 == "CONNECTED":
                # Fall back to DEMO if the wearable goes quiet.
                import time as _t

                if _t.time() * 1000 - self._last_esp32_ms > 2500:
                    self.connections.esp32 = "DEMO"
                    await self._broadcast(
                        {"type": "status", "data": self.connections.model_dump()}
                    )
            await asyncio.sleep(interval)

    async def ingest_imu(self, packet: IMUPacket) -> IMUSample:
        import time as _t

        mag = math.sqrt(packet.ax**2 + packet.ay**2 + packet.az**2)
        gmag = math.sqrt(packet.gx**2 + packet.gy**2 + packet.gz**2)
        sample = IMUSample(
            **packet.model_dump(),
            accel_mag=round(mag, 4),
            gyro_mag=round(gmag, 3),
            cadence_bpm=self.session.current_cadence_bpm,
        )
        self._last_esp32_ms = _t.time() * 1000
        if self.connections.esp32 != "CONNECTED":
            self.connections.esp32 = "CONNECTED"
            await self._broadcast({"type": "status", "data": self.connections.model_dump()})
        await self._broadcast({"type": "imu", "data": sample.model_dump()})
        return sample

    # ------------------------------------------------------------------ Demo
    async def start_walking(self) -> SessionState:
        async with self._lock:
            self._cancel_bg()
            self.sim.set_mode("walking")
            self.session.cue.active = False
            self.session.edge = Classification(
                classification="walking", confidence=0.08, source="edge"
            )
            self.session.runpod = RunPodResult(status="idle")
            self.session.recovery = RecoveryInfo(
                pre_cadence=self.session.baseline_cadence_bpm
            )
            await self._set_phase(Phase.WALKING, force=True)
            await self._broadcast({"type": "cue", "data": self.session.cue.model_dump()})
            await self._broadcast({"type": "detection", "data": self._detection_data()})
            await self._broadcast({"type": "recovery", "data": self.session.recovery.model_dump()})
            return self.session

    async def simulate_freeze(self) -> dict[str, str]:
        async with self._lock:
            if self._freeze_task and not self._freeze_task.done():
                return {"status": "already_running"}
            self._freeze_task = asyncio.create_task(self._freeze_sequence())
            return {"status": "started"}

    async def _freeze_sequence(self) -> None:
        """Edge-first freeze-like demo.

        Visual order for judges:
          waveform morph → POSSIBLE FREEZE → edge confidence rises →
          RunPod secondary score → local debounce fires cue → RECOVERING
        Cue dispatch checks EDGE confidence only.
        """
        try:
            await self._freeze_sequence_inner()
        except asyncio.CancelledError:
            return

    async def _freeze_sequence_inner(self) -> None:
        self._episode = {
            "pre_cadence": self.session.current_cadence_bpm,
            "t0": asyncio.get_event_loop().time(),
            "edge": None,
            "runpod": None,
        }
        self.sim.set_mode("freeze")
        self.session.recovery = RecoveryInfo(
            detected=False,
            elapsed_ms=0,
            pre_cadence=self.session.current_cadence_bpm,
        )
        self.session.runpod = RunPodResult(status="idle")
        await self._set_phase(Phase.POSSIBLE_FREEZE, force=True)

        # Ramp edge confidence (latency-first local detector).
        ramp = [0.36, 0.48, 0.61, 0.72, 0.84]
        for conf in ramp:
            self.session.edge = Classification(
                classification="freeze_like" if conf >= 0.6 else "unknown",
                confidence=conf,
                source="edge",
                latency_ms=18,
                note="On-device freeze-like pattern score — not medically confirmed.",
            )
            await self._broadcast({"type": "detection", "data": self._detection_data()})
            await asyncio.sleep(0.18)

        self._episode["edge"] = self.session.edge.model_dump()

        # Secondary cloud verification — MUST NOT gate the motor.
        self.session.runpod = RunPodResult(
            status="pending",
            classification="unknown",
            confidence=0.0,
        )
        await self._broadcast({"type": "detection", "data": self._detection_data()})
        await asyncio.sleep(0.35)
        rp = await runpod_service.infer_gait(
            {
                "accel_variance": 0.12,
                "window": "demo-freeze-like",
                "session_id": self.session.session_id,
            },
            hint="freeze_like",
        )
        self.session.runpod = rp
        self._episode["runpod"] = rp.model_dump()
        await self._broadcast({"type": "detection", "data": self._detection_data()})

        # Local debounce complete. Edge owns the cue.
        if self.session.edge.confidence >= 0.7:
            await self._activate_cue(source="edge_local")

    async def trigger_cue(self) -> SessionState:
        async with self._lock:
            await self._activate_cue(source="operator_or_edge")
            return self.session

    async def _activate_cue(self, *, source: str) -> None:
        # Local/edge (or demo operator) only. Grok/RunPod never call this
        # as a consequence of their own output.
        if self.session.pending_next_cue:
            armed = self.session.pending_next_cue
            allowed = {(c.pattern, c.bpm) for c in self.session.allowed_next_cues}
            if (armed.pattern, armed.bpm) in allowed:
                self.session.cue.pattern = armed.pattern
                self.session.cue.bpm = armed.bpm
        self.session.cue.active = True
        self.session.cue.source = source
        await self._set_phase(Phase.CUE_TRIGGERED, force=True)
        await self._broadcast({"type": "cue", "data": self.session.cue.model_dump()})
        await asyncio.sleep(0.28)
        self.session.recovery.elapsed_ms = 0
        await self._set_phase(Phase.RECOVERY_MONITORING, force=True)
        if self._recovery_task and not self._recovery_task.done():
            self._recovery_task.cancel()
        self._recovery_task = asyncio.create_task(self._recovery_ticker())

    async def _recovery_ticker(self) -> None:
        start = asyncio.get_event_loop().time()
        try:
            while self.machine.phase is Phase.RECOVERY_MONITORING:
                elapsed = int((asyncio.get_event_loop().time() - start) * 1000)
                self.session.recovery.elapsed_ms = elapsed
                await self._broadcast(
                    {"type": "recovery", "data": self.session.recovery.model_dump()}
                )
                await asyncio.sleep(0.08)
        except asyncio.CancelledError:
            return

    async def simulate_recovery(self) -> SessionState:
        async with self._lock:
            if self._freeze_task and not self._freeze_task.done():
                self._freeze_task.cancel()
            if self._recovery_task and not self._recovery_task.done():
                self._recovery_task.cancel()
            elapsed = self.session.recovery.elapsed_ms or 1420
            self.sim.set_mode("recovering")
            self.session.cue.active = False
            await self._broadcast({"type": "cue", "data": self.session.cue.model_dump()})

            self.session.recovery.detected = True
            self.session.recovery.time_ms = elapsed
            self.session.recovery.event_duration_ms = elapsed + 850
            self.session.recovery.post_cadence = round(
                self.session.baseline_cadence_bpm - 1.5, 1
            )
            await self._broadcast({"type": "recovery", "data": self.session.recovery.model_dump()})
            await self._set_phase(Phase.RECOVERED, force=True)

            event = self._log_event(elapsed)
            await self._broadcast({"type": "event_logged", "data": event.model_dump()})
            await self._broadcast({"type": "session", "data": self.session.model_dump()})

            await asyncio.sleep(0.45)
            await self._set_phase(Phase.ANALYZING, force=True)
            analysis = await grok_service.analyze_session(self.session)
            self.session.analysis = analysis
            if analysis.recommended_cue:
                self.session.pending_next_cue = analysis.recommended_cue
            await self._broadcast({"type": "analysis", "data": analysis.model_dump()})
            await self._broadcast({"type": "session", "data": self.session.model_dump()})

            await asyncio.sleep(1.6)
            self.sim.set_mode("walking")
            self.session.edge = Classification(
                classification="walking", confidence=0.09, source="edge"
            )
            self.session.runpod = RunPodResult(
                status="idle" if not runpod_service.runpod_configured() else "complete",
                classification="walking",
                confidence=0.16,
                model_version=self.session.runpod.model_version,
            )
            await self._broadcast({"type": "detection", "data": self._detection_data()})
            await self._set_phase(Phase.WALKING, force=True)
            return self.session

    def _log_event(self, recovery_ms: int) -> EventRecord:
        self._seq += 1
        eid = f"E{self._seq}"
        edge = self.session.edge
        rp = self.session.runpod
        event = EventRecord(
            episode_id=eid,
            timestamp_iso=_iso_now(),
            edge=EdgeResult(
                classification=edge.classification
                if edge.classification in ("walking", "freeze_like", "unknown")
                else "unknown",
                confidence=edge.confidence,
            ),
            runpod=RunPodResult(
                classification=rp.classification,
                confidence=rp.confidence,
                model_version=rp.model_version,
                status=rp.status,
            ),
            cue=CueInfo(
                pattern=self.session.cue.pattern,
                bpm=self.session.cue.bpm,
                active=False,
                source="edge_local",
            ),
            recovery=RecoveryRecord(detected=True, time_ms=recovery_ms),
            status="Recovered",
            event_duration_ms=self.session.recovery.event_duration_ms,
            pre_cadence=self.session.recovery.pre_cadence,
            post_cadence=self.session.recovery.post_cadence,
        )
        self.session.events.append(event)
        return event

    async def run_analysis(self) -> GrokAnalysis:
        async with self._lock:
            prev = self.machine.phase
            await self._set_phase(Phase.ANALYZING, force=True)
            analysis = await grok_service.analyze_session(self.session)
            self.session.analysis = analysis
            if analysis.recommended_cue:
                self.session.pending_next_cue = analysis.recommended_cue
            await self._broadcast({"type": "analysis", "data": analysis.model_dump()})
            await self._broadcast({"type": "session", "data": self.session.model_dump()})
            await asyncio.sleep(0.4)
            await self._set_phase(prev if prev is not Phase.ANALYZING else Phase.WALKING, force=True)
            return analysis

    async def reset_session(self) -> SessionState:
        async with self._lock:
            self._cancel_bg()
            self._seq = 3
            self._episode = None
            self.sim.reset(102.0)
            self.machine.force(Phase.WALKING)
            self.session = self._fresh_session()
            self.connections.esp32 = "DEMO"
            await self._broadcast({"type": "status", "data": self.connections.model_dump()})
            await self._broadcast({"type": "state", "data": self._state_data()})
            await self._broadcast({"type": "session", "data": self.session.model_dump()})
            await self._broadcast({"type": "detection", "data": self._detection_data()})
            await self._broadcast({"type": "cue", "data": self.session.cue.model_dump()})
            await self._broadcast({"type": "recovery", "data": self.session.recovery.model_dump()})
            await self._broadcast({"type": "analysis", "data": None})
            return self.session

    async def arm_next_cue(self, cue: CueParams) -> SessionState:
        """Operator/local arming. Grok may suggest, but only this local call applies it."""
        allowed = {(c.pattern, c.bpm) for c in self.session.allowed_next_cues}
        if (cue.pattern, cue.bpm) not in allowed:
            raise ValueError("Cue is not in allowed_next_cues")
        self.session.pending_next_cue = cue
        self.session.cue.pattern = cue.pattern
        self.session.cue.bpm = cue.bpm
        await self._broadcast({"type": "cue", "data": self.session.cue.model_dump()})
        await self._broadcast({"type": "session", "data": self.session.model_dump()})
        return self.session

    async def post_event(self, event: EventRecord) -> EventRecord:
        self.session.events.append(event)
        await self._broadcast({"type": "event_logged", "data": event.model_dump()})
        await self._broadcast({"type": "session", "data": self.session.model_dump()})
        return event

    async def post_recovery(self, rec: RecoveryRecord) -> SessionState:
        self.session.recovery.detected = rec.detected
        self.session.recovery.time_ms = rec.time_ms
        if rec.detected:
            await self.simulate_recovery()
        return self.session

    def _cancel_bg(self) -> None:
        for task in (self._freeze_task, self._recovery_task):
            if task and not task.done():
                task.cancel()
        self._freeze_task = None
        self._recovery_task = None
