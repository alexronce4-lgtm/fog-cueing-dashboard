"""Smoke tests for the FoG cueing research API (in-memory, mock services)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from main import app


def test_health() -> None:
    with TestClient(app) as client:
        r = client.get("/")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "not a medical device" in body["disclaimer"].lower()


def test_session_seeded() -> None:
    with TestClient(app) as client:
        r = client.get("/api/session/current")
        assert r.status_code == 200
        body = r.json()
        assert body["session_id"] == "hackmit-demo-001"
        ids = [e["episode_id"] for e in body["events"]]
        assert ids[:3] == ["E1", "E2", "E3"]
        assert body["allowed_next_cues"][0]["bpm"] in (80, 95, 102)


def test_events_and_demo_reset() -> None:
    with TestClient(app) as client:
        r = client.get("/api/events")
        assert r.status_code == 200
        assert len(r.json()) >= 3
        reset = client.post("/api/demo/reset")
        assert reset.status_code == 200
        assert reset.json()["phase"] == "WALKING"


def test_imu_ingest() -> None:
    with TestClient(app) as client:
        r = client.post(
            "/api/imu",
            json={
                "timestamp": 843920,
                "ax": 0.13,
                "ay": -0.42,
                "az": 9.71,
                "gx": 0.4,
                "gy": 2.7,
                "gz": -1.1,
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert "accel_mag" in body


def test_runpod_and_grok_mock() -> None:
    with TestClient(app) as client:
        rp = client.post("/api/runpod/inference", json={"hint": "freeze_like"})
        assert rp.status_code == 200
        assert rp.json()["classification"] == "freeze_like"
        assert rp.json()["status"] in ("mock", "complete", "error")
        grok = client.post("/api/grok/analyze")
        assert grok.status_code == 200
        body = grok.json()
        assert "next_experiment" in body
        assert "Insufficient" in body["confidence_statement"] or "No ranking" in body["confidence_statement"]
        rec = body.get("recommended_cue")
        if rec:
            assert rec["bpm"] in (80, 95, 102)


def test_cue_must_be_allowed() -> None:
    with TestClient(app) as client:
        bad = client.post("/api/cue", json={"pattern": "rhythmic", "bpm": 199})
        assert bad.status_code >= 400


def test_demo_freeze_then_recovery() -> None:
    with TestClient(app) as client:
        client.post("/api/demo/reset")
        started = client.post("/api/demo/simulate-freeze")
        assert started.status_code == 200
        rec = client.post("/api/demo/simulate-recovery")
        assert rec.status_code == 200
        session = rec.json()
        assert any(e["episode_id"].startswith("E") for e in session["events"])
        assert session["analysis"] is not None
        assert "motor" in session["analysis"]["safety"].lower()
