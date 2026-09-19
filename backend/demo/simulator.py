"""Synthetic IMU gait generator for the HackMIT demo.

Walking: ~baseline cadence oscillation on accel magnitude.
Freeze-like: collapsed stepping amplitude + higher-frequency tremor.
Never labeled as clinically confirmed FoG.
"""

from __future__ import annotations

import math
import random
import time
from typing import Literal

from models import IMUSample

GaitMode = Literal["walking", "freeze", "recovering"]


class GaitSimulator:
    def __init__(self, baseline_cadence_bpm: float = 102.0) -> None:
        self.baseline_cadence_bpm = baseline_cadence_bpm
        self.cadence_bpm = baseline_cadence_bpm
        self.mode: GaitMode = "walking"
        self._t0 = time.perf_counter()
        self._blend = 1.0  # 1 = walking, 0 = freeze-like
        self._noise = random.Random(2026)

    def set_mode(self, mode: GaitMode) -> None:
        self.mode = mode

    def reset(self, baseline_cadence_bpm: float | None = None) -> None:
        if baseline_cadence_bpm is not None:
            self.baseline_cadence_bpm = baseline_cadence_bpm
        self.cadence_bpm = self.baseline_cadence_bpm
        self.mode = "walking"
        self._t0 = time.perf_counter()
        self._blend = 1.0

    def sample(self) -> IMUSample:
        t = time.perf_counter() - self._t0
        target = 1.0 if self.mode == "walking" else 0.0
        if self.mode == "recovering":
            target = 1.0
        # Smooth visual blend so judges see the waveform morph.
        self._blend += (target - self._blend) * 0.12

        step_hz = max(0.4, self.cadence_bpm / 60.0)
        walk_amp = 2.35 * self._blend
        freeze_amp = 0.12 * (1.0 - self._blend)
        tremor = (1.0 - self._blend) * 0.55 * math.sin(2 * math.pi * 7.5 * t)

        n = lambda s: self._noise.gauss(0.0, s)
        osc = walk_amp * math.sin(2 * math.pi * step_hz * t) + freeze_amp * math.sin(
            2 * math.pi * 0.7 * t
        )
        ax = 0.18 * math.sin(2 * math.pi * step_hz * t + 0.4) * self._blend + n(0.04)
        ay = -0.35 * math.cos(2 * math.pi * step_hz * t) * self._blend + n(0.05)
        az = 9.73 + osc + tremor + n(0.06)
        gx = (18.0 * self._blend) * math.sin(2 * math.pi * step_hz * t) + n(0.4)
        gy = (9.0 * self._blend) * math.cos(2 * math.pi * step_hz * t) + n(0.3)
        gz = n(0.25) + (1.0 - self._blend) * 2.2 * math.sin(2 * math.pi * 7.5 * t)

        accel_mag = math.sqrt(ax * ax + ay * ay + az * az)
        gyro_mag = math.sqrt(gx * gx + gy * gy + gz * gz)

        # Instantaneous cadence estimate: walking cadence collapses in freeze-like mode.
        self.cadence_bpm = (
            self.baseline_cadence_bpm * (0.22 + 0.78 * self._blend)
            + n(0.6) * self._blend
        )

        return IMUSample(
            timestamp=round(t * 1000.0, 2),
            ax=round(ax, 4),
            ay=round(ay, 4),
            az=round(az, 4),
            gx=round(gx, 3),
            gy=round(gy, 3),
            gz=round(gz, 3),
            accel_mag=round(accel_mag, 4),
            gyro_mag=round(gyro_mag, 3),
            cadence_bpm=round(self.cadence_bpm, 1),
        )
