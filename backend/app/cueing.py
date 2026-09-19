"""Cueing engine.

Tracks whether a rhythmic cue should currently be playing. A cue can be started
automatically when a freeze is detected (if auto-cue is enabled) or forced on/off
manually by the operator. The engine only reports intent; the actual beep/haptic
is rendered by the client.
"""

from __future__ import annotations

from .models import CueConfig, CueState, GaitState


class CueEngine:
    """State machine for auditory/haptic/visual cueing."""

    def __init__(self, config: CueConfig) -> None:
        self.config = config
        self._manual_override: bool | None = None

    def set_manual(self, active: bool) -> None:
        """Force the cue on (True) or off (False) regardless of detection."""
        self._manual_override = active

    def clear_manual(self) -> None:
        self._manual_override = None

    def update(self, state: GaitState) -> CueState:
        """Recompute cue state from the latest gait state."""
        if self._manual_override is not None:
            active = self._manual_override
            source = "manual"
        elif self.config.auto_cue and state == GaitState.FREEZING:
            active = True
            source = "auto"
        else:
            active = False
            source = "idle"

        return CueState(
            active=active,
            mode=self.config.mode,
            bpm=self.config.bpm,
            source=source,
        )
