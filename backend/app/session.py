"""Session manager tying together the simulator, detector, and cue engine.

Runs a background asyncio task that pulls samples from the simulator at the
configured rate, feeds them through the detector, updates the cue engine, records
freeze events, and broadcasts telemetry to all connected websocket clients.
"""

from __future__ import annotations

import asyncio
import time
from collections import deque
from typing import Deque, List, Optional, Set

from .cueing import CueEngine
from .detector import FreezeDetector
from .models import (
    ConfigUpdate,
    CueState,
    FogEvent,
    GaitState,
    Sample,
    SessionConfig,
    StatusResponse,
    StreamMessage,
)
from .simulator import GaitSimulator

SAMPLE_RATE = 50.0
RECENT_WINDOW = 150  # ~3 seconds of trace shown to clients


class Session:
    """Owns all runtime state for a single dashboard session."""

    def __init__(self) -> None:
        self.config = SessionConfig()
        self.simulator = GaitSimulator(sample_rate=SAMPLE_RATE)
        self.detector = FreezeDetector(sample_rate=SAMPLE_RATE)
        self.cue_engine = CueEngine(self.config.cue)

        self._recent: Deque[float] = deque(maxlen=RECENT_WINDOW)
        self._events: List[FogEvent] = []
        self._active_event: Optional[FogEvent] = None
        self._event_counter = 0

        self._state = GaitState.STILL
        self._freeze_index = 0.0
        self._power = 0.0
        self._cue = CueState(active=False, mode=self.config.cue.mode, bpm=self.config.cue.bpm)

        self._subscribers: Set[asyncio.Queue] = set()
        self._task: Optional[asyncio.Task] = None
        self._running = False

    # ---- lifecycle -----------------------------------------------------
    async def start(self) -> None:
        if self._task is None or self._task.done():
            self._running = True
            self._task = asyncio.create_task(self._run(), name="gait-loop")

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    # ---- subscriptions -------------------------------------------------
    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=10)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    # ---- configuration -------------------------------------------------
    def update_config(self, update: ConfigUpdate) -> SessionConfig:
        if update.freeze_threshold is not None:
            self.config.detector.freeze_threshold = update.freeze_threshold
        if update.power_threshold is not None:
            self.config.detector.power_threshold = update.power_threshold
        if update.auto_cue is not None:
            self.config.cue.auto_cue = update.auto_cue
        if update.mode is not None:
            self.config.cue.mode = update.mode
        if update.bpm is not None:
            self.config.cue.bpm = update.bpm
        # CueEngine shares the same CueConfig instance, so it sees updates live.
        return self.config

    def set_manual_cue(self, active: bool) -> None:
        self.cue_engine.set_manual(active)
        # Reflect the override immediately so callers see it before the next tick.
        self._cue = self.cue_engine.update(self._state)

    def clear_manual_cue(self) -> None:
        self.cue_engine.clear_manual()
        self._cue = self.cue_engine.update(self._state)

    # ---- accessors -----------------------------------------------------
    def status(self) -> StatusResponse:
        return StatusResponse(
            running=self._running,
            state=self._state,
            freeze_index=round(self._freeze_index, 3),
            power=round(self._power, 4),
            cue=self._cue,
            config=self.config,
            active_event=self._active_event,
            total_events=len(self._events),
        )

    def events(self) -> List[FogEvent]:
        return list(reversed(self._events))

    def recent_trace(self) -> List[float]:
        return list(self._recent)

    # ---- core loop -----------------------------------------------------
    def _record_event_transition(self, state: GaitState, now: float) -> None:
        if state == GaitState.FREEZING and self._active_event is None:
            self._event_counter += 1
            self._active_event = FogEvent(
                id=self._event_counter,
                started_at=now,
                peak_freeze_index=self._freeze_index,
            )
            self._events.append(self._active_event)
        elif state == GaitState.FREEZING and self._active_event is not None:
            self._active_event.peak_freeze_index = max(
                self._active_event.peak_freeze_index, self._freeze_index
            )
            if self._cue.active:
                self._active_event.cued = True
        elif state != GaitState.FREEZING and self._active_event is not None:
            self._active_event.ended_at = now
            self._active_event.duration_s = round(now - self._active_event.started_at, 2)
            self._active_event = None

    async def _run(self) -> None:
        interval = 1.0 / SAMPLE_RATE
        while self._running:
            loop_start = time.perf_counter()
            now = time.time()

            accel = self.simulator.next_sample()
            self.detector.push(accel)
            freeze_index, power, state = self.detector.evaluate(self.config.detector)

            self._freeze_index = freeze_index
            self._power = power
            self._state = state
            self._recent.append(round(accel, 4))
            self._cue = self.cue_engine.update(state)
            self._record_event_transition(state, now)

            sample = Sample(
                t=round(now, 3),
                accel=round(accel, 4),
                freeze_index=round(freeze_index, 3),
                power=round(power, 4),
                state=state,
            )
            message = StreamMessage(
                sample=sample,
                status=self.status(),
                recent=self.recent_trace(),
            )
            self._broadcast(message)

            elapsed = time.perf_counter() - loop_start
            await asyncio.sleep(max(0.0, interval - elapsed))

    def _broadcast(self, message: StreamMessage) -> None:
        payload = message.model_dump()
        dead: List[asyncio.Queue] = []
        for queue in self._subscribers:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                # Slow client: drop the oldest item and enqueue the newest.
                try:
                    queue.get_nowait()
                    queue.put_nowait(payload)
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    dead.append(queue)
        for queue in dead:
            self._subscribers.discard(queue)
