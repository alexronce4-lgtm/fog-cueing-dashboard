"""Pydantic models shared across the API and websocket layers."""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class GaitState(str, Enum):
    """High-level state produced by the detector."""

    WALKING = "walking"
    FREEZING = "freezing"
    STILL = "still"


class CueMode(str, Enum):
    """Sensory modality the cue engine reports as active."""

    AUDITORY = "auditory"
    HAPTIC = "haptic"
    VISUAL = "visual"


class DetectorConfig(BaseModel):
    """Tunable parameters for the freeze-index detector."""

    freeze_threshold: float = Field(
        default=2.0,
        ge=0.5,
        le=10.0,
        description="Freeze-index ratio above which a freeze is flagged.",
    )
    power_threshold: float = Field(
        default=0.04,
        ge=0.0,
        le=5.0,
        description="Minimum locomotor-band power to distinguish gait from standing still.",
    )


class CueConfig(BaseModel):
    """Tunable parameters for the cueing engine."""

    auto_cue: bool = Field(
        default=True,
        description="Automatically start a cue when a freeze is detected.",
    )
    mode: CueMode = Field(default=CueMode.AUDITORY)
    bpm: int = Field(
        default=90,
        ge=40,
        le=180,
        description="Cue tempo in beats per minute.",
    )


class SessionConfig(BaseModel):
    """Combined, user-editable configuration."""

    detector: DetectorConfig = Field(default_factory=DetectorConfig)
    cue: CueConfig = Field(default_factory=CueConfig)


class ConfigUpdate(BaseModel):
    """Partial configuration update payload."""

    freeze_threshold: Optional[float] = Field(default=None, ge=0.5, le=10.0)
    power_threshold: Optional[float] = Field(default=None, ge=0.0, le=5.0)
    auto_cue: Optional[bool] = None
    mode: Optional[CueMode] = None
    bpm: Optional[int] = Field(default=None, ge=40, le=180)


class ManualCueRequest(BaseModel):
    """Request body to force the cue on or off."""

    active: bool


class FogEvent(BaseModel):
    """A recorded freezing-of-gait episode."""

    id: int
    started_at: float
    ended_at: Optional[float] = None
    peak_freeze_index: float
    duration_s: Optional[float] = None
    cued: bool = False


class Sample(BaseModel):
    """A single processed telemetry sample streamed to clients."""

    t: float
    accel: float
    freeze_index: float
    power: float
    state: GaitState


class CueState(BaseModel):
    """Current state of the cueing engine."""

    active: bool
    mode: CueMode
    bpm: int
    source: str = "idle"  # idle | auto | manual


class StatusResponse(BaseModel):
    """Aggregate status returned by REST and pushed over the websocket."""

    running: bool
    state: GaitState
    freeze_index: float
    power: float
    cue: CueState
    config: SessionConfig
    active_event: Optional[FogEvent] = None
    total_events: int


class StreamMessage(BaseModel):
    """Envelope pushed to websocket subscribers."""

    type: str = "tick"
    sample: Sample
    status: StatusResponse
    recent: List[float] = Field(default_factory=list)
