"""Freeze-index based freezing-of-gait detector.

Implements a simplified version of the Moore/Bachlin freeze index: the ratio of
spectral power in the "freeze" band (3-8 Hz) to the "locomotor" band (0.5-3 Hz)
computed over a sliding window of vertical acceleration samples. A freeze is
flagged when that ratio exceeds a threshold and there is enough total power to
rule out the person simply standing still.
"""

from __future__ import annotations

from collections import deque
from typing import Deque, Tuple

import numpy as np

from .models import DetectorConfig, GaitState

FREEZE_BAND = (3.0, 8.0)
LOCOMOTOR_BAND = (0.5, 3.0)


class FreezeDetector:
    """Sliding-window freeze-index detector."""

    def __init__(self, sample_rate: float, window_size: int = 128) -> None:
        self.sample_rate = sample_rate
        self.window_size = window_size
        self._buffer: Deque[float] = deque(maxlen=window_size)
        self._window = np.hanning(window_size)
        self._freqs = np.fft.rfftfreq(window_size, d=1.0 / sample_rate)
        self._freeze_mask = (self._freqs >= FREEZE_BAND[0]) & (self._freqs < FREEZE_BAND[1])
        self._loco_mask = (self._freqs >= LOCOMOTOR_BAND[0]) & (self._freqs < LOCOMOTOR_BAND[1])

    def push(self, accel: float) -> None:
        """Add a raw acceleration sample to the sliding window."""
        self._buffer.append(float(accel))

    def _band_power(self) -> Tuple[float, float]:
        """Return (freeze_power, locomotor_power) for the current window."""
        if len(self._buffer) < self.window_size:
            return 0.0, 0.0
        signal = np.asarray(self._buffer, dtype=np.float64)
        signal = signal - signal.mean()
        spectrum = np.abs(np.fft.rfft(signal * self._window)) ** 2
        freeze_power = float(spectrum[self._freeze_mask].sum())
        loco_power = float(spectrum[self._loco_mask].sum())
        norm = float(self.window_size)
        return freeze_power / norm, loco_power / norm

    def evaluate(self, config: DetectorConfig) -> Tuple[float, float, GaitState]:
        """Compute the freeze index, total band power, and gait state."""
        freeze_power, loco_power = self._band_power()
        total_power = freeze_power + loco_power
        freeze_index = freeze_power / (loco_power + 1e-6)

        if total_power < config.power_threshold:
            state = GaitState.STILL
        elif freeze_index >= config.freeze_threshold:
            state = GaitState.FREEZING
        else:
            state = GaitState.WALKING

        return freeze_index, total_power, state

    def reset(self) -> None:
        self._buffer.clear()
