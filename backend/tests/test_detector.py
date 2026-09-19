"""Unit tests for the freeze-index detector against synthetic signals."""

from __future__ import annotations

import math

import numpy as np

from app.detector import FreezeDetector
from app.models import DetectorConfig, GaitState

FS = 50.0


def _feed(detector: FreezeDetector, freq: float, amplitude: float, seconds: float) -> None:
    n = int(FS * seconds)
    for i in range(n):
        t = i / FS
        detector.push(amplitude * math.sin(2.0 * math.pi * freq * t))


def test_walking_signal_is_classified_as_walking() -> None:
    detector = FreezeDetector(sample_rate=FS)
    _feed(detector, freq=1.0, amplitude=1.0, seconds=5.0)
    freeze_index, power, state = detector.evaluate(DetectorConfig())
    assert state == GaitState.WALKING
    assert freeze_index < 2.0
    assert power > 0.04


def test_tremor_signal_is_classified_as_freezing() -> None:
    detector = FreezeDetector(sample_rate=FS)
    _feed(detector, freq=6.0, amplitude=1.0, seconds=5.0)
    freeze_index, power, state = detector.evaluate(DetectorConfig())
    assert state == GaitState.FREEZING
    assert freeze_index >= 2.0


def test_quiet_signal_is_classified_as_still() -> None:
    detector = FreezeDetector(sample_rate=FS)
    rng = np.random.default_rng(0)
    for _ in range(int(FS * 5)):
        detector.push(float(rng.normal(0.0, 0.01)))
    _, power, state = detector.evaluate(DetectorConfig())
    assert state == GaitState.STILL
    assert power < 0.04


def test_power_threshold_is_configurable() -> None:
    detector = FreezeDetector(sample_rate=FS)
    _feed(detector, freq=6.0, amplitude=0.1, seconds=5.0)
    _, power, state = detector.evaluate(DetectorConfig())
    assert state == GaitState.FREEZING

    # Raising the power gate above the signal's own power forces "still".
    strict = DetectorConfig(power_threshold=power * 2.0)
    _, _, state = detector.evaluate(strict)
    assert state == GaitState.STILL
