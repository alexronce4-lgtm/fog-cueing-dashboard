"""Synthetic gait signal generator with periodic freezing episodes.

Produces a single-channel vertical-acceleration signal resembling a lower-limb
IMU. During normal walking the signal is dominated by a ~1 Hz stride rhythm.
During a freezing episode the stride rhythm collapses and is replaced by a
low-amplitude 3-8 Hz tremor, which is exactly what the freeze-index detector is
designed to pick up.
"""

from __future__ import annotations

import math
import random


class GaitSimulator:
    """Generate walking / freezing / still acceleration samples over time."""

    def __init__(self, sample_rate: float = 50.0, seed: int | None = 7) -> None:
        self.sample_rate = sample_rate
        self._rng = random.Random(seed)
        self._t = 0.0
        # Scripted timeline (seconds) of (state, duration).
        self._script = [
            ("still", 3.0),
            ("walking", 8.0),
            ("freezing", 4.0),
            ("walking", 6.0),
            ("freezing", 3.0),
            ("walking", 7.0),
            ("still", 2.0),
        ]
        self._segment_index = 0
        self._segment_elapsed = 0.0
        self._tremor_phase = 0.0

    @property
    def current_state(self) -> str:
        return self._script[self._segment_index][0]

    def _advance_segment(self, dt: float) -> None:
        self._segment_elapsed += dt
        _, duration = self._script[self._segment_index]
        if self._segment_elapsed >= duration:
            self._segment_elapsed = 0.0
            self._segment_index = (self._segment_index + 1) % len(self._script)

    def next_sample(self) -> float:
        """Return the next acceleration sample and advance simulated time."""
        dt = 1.0 / self.sample_rate
        state = self.current_state
        noise = self._rng.gauss(0.0, 0.03)

        if state == "walking":
            stride = 1.0 * math.sin(2.0 * math.pi * 1.0 * self._t)
            harmonic = 0.3 * math.sin(2.0 * math.pi * 2.0 * self._t)
            accel = stride + harmonic + noise
        elif state == "freezing":
            tremor_hz = 6.0
            self._tremor_phase += 2.0 * math.pi * tremor_hz * dt
            tremor = 0.35 * math.sin(self._tremor_phase)
            residual = 0.08 * math.sin(2.0 * math.pi * 1.0 * self._t)
            accel = tremor + residual + noise
        else:  # still
            accel = noise

        self._t += dt
        self._advance_segment(dt)
        return accel

    def reset(self) -> None:
        self._t = 0.0
        self._segment_index = 0
        self._segment_elapsed = 0.0
        self._tremor_phase = 0.0
