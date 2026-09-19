"""API-level tests exercising the FastAPI app end to end."""

from __future__ import annotations

import time

from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    with TestClient(app) as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


def test_status_and_config_roundtrip() -> None:
    with TestClient(app) as client:
        resp = client.get("/api/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["running"] is True
        assert "cue" in body

        update = client.post(
            "/api/config",
            json={"freeze_threshold": 3.5, "bpm": 120, "auto_cue": False},
        )
        assert update.status_code == 200
        cfg = update.json()
        assert cfg["detector"]["freeze_threshold"] == 3.5
        assert cfg["cue"]["bpm"] == 120
        assert cfg["cue"]["auto_cue"] is False


def test_manual_cue_toggles_state() -> None:
    with TestClient(app) as client:
        on = client.post("/api/cue/manual", json={"active": True})
        assert on.status_code == 200
        assert on.json()["cue"]["active"] is True
        assert on.json()["cue"]["source"] == "manual"

        off = client.post("/api/cue/auto")
        assert off.status_code == 200
        assert off.json()["cue"]["source"] in {"idle", "auto"}


def test_websocket_streams_samples() -> None:
    with TestClient(app) as client:
        with client.websocket_connect("/ws/stream") as ws:
            snapshot = ws.receive_json()
            assert snapshot["type"] == "snapshot"
            tick = ws.receive_json()
            assert tick["type"] == "tick"
            assert "sample" in tick
            assert "status" in tick


def test_events_accumulate_over_time() -> None:
    with TestClient(app) as client:
        # The scripted simulator enters a freeze within a few seconds.
        deadline = time.time() + 20
        total = 0
        while time.time() < deadline:
            total = client.get("/api/status").json()["total_events"]
            if total > 0:
                break
            time.sleep(0.5)
        assert total > 0
        events = client.get("/api/events").json()
        assert len(events) == total
        assert events[0]["peak_freeze_index"] >= 0
