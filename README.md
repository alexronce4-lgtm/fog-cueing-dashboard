# FoG Cueing Lab — HackMIT 2026

Experimental wearable **freeze-like gait cueing** research dashboard.

This is a **research / assistive-technology prototype**, not a validated medical device. The UI never claims diagnosis, treatment, or confirmed freezing of gait. Language is limited to *possible freeze-like event* and *freeze-like gait pattern*.

**Architecture rule:** Grok and RunPod do **not** drive the vibration motor. The intervention loop is local / edge-first. Cloud models only verify or analyze after (or alongside) events.

Core loop: **SENSE → DETECT → INTERVENE → MEASURE RECOVERY → ANALYZE → ADAPT**

```
WALKING → POSSIBLE FREEZE → DETECTED → CUEING → RECOVERING → RECOVERED → ANALYZING → WALKING
```

## Quick start

You need **Python 3.11+** and **Node.js 20+**.

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check: [http://localhost:8000/](http://localhost:8000/)

### 2. Frontend (Next.js)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI streams IMU + state over `ws://localhost:8000/ws/imu`.

Optional env (defaults already match local demo):

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/imu
```

Copy [`.env.example`](.env.example) for backend secrets. The app runs fully in **MOCK** mode without any keys.

### 3. Tests

```bash
cd backend
source .venv/bin/activate
pytest -q
```

## Demo mode (judges)

Demo mode is **self-contained in the browser**: the gait simulator, the automatic
freeze → cue → recovery sequence, and the mock RunPod / Grok services all run
client-side. The dashboard works with the backend offline and never shows an
error banner — pills read `STREAM SIMULATED · ESP32 DEMO · RUNPOD MOCK · GROK MOCK`.

Three controls (keys **1 · 2 · 3**) in the docked bar:

| Control | What happens |
|---|---|
| **1 · START DEMO** | Clears the session, enters **WALKING**, starts the simulated IMU at ~102 BPM, edge low, RunPod idle, cue inactive, timer 0 |
| **2 · TRIGGER FREEZE-LIKE EVENT** | Runs the whole loop automatically (see timeline below). Disabled while a sequence is running. Works from READY too. |
| **3 · RESET** | Cancels all timers, clears waveform / events / analysis, returns to **READY** |

Automatic timeline after **TRIGGER**:

| t | State | On screen |
|---|---|---|
| 0 ms | **POSSIBLE FREEZE** | Waveform collapses to a freeze-like trace; edge score ramps to ~82–88% |
| 500 ms | **DETECTED** | RunPod verification requested (time-boxed, mock fallback) |
| 1000 ms | **CUEING** | RunPod ~88–94%; haptic cue **ACTIVE**, 95 BPM pulse rings |
| 2000 ms | **RECOVERING** | Recovery timer running |
| 3.4–3.8 s | **RECOVERED** | Waveform returns to baseline; timer stops at 1.4–1.8 s; episode E*n* added |
| +250 ms | **ANALYZING** | Verification result stays visible; Grok analysis (time-boxed, mock fallback) |
| +1.25 s | **WALKING** | **ADAPTIVE RESULT** shows Observed / Evidence / Next experiment / Confidence |

The cue is dispatched from the **edge** score. RunPod verifies alongside and Grok
analyses afterwards; neither can pulse the motor. With a handful of episodes the
analysis will not rank cues — it asks for more observations and only proposes a
next tempo from `allowed_next_cues` (80 / 95 / 102 BPM). Arming it is a local
operator click.

Secondary detail (raw phase, latency, model version, backend reachability,
allowed cues) lives in the collapsible **Advanced** panel.

When the backend is reachable, episodes are mirrored to `POST /api/event`
(fire-and-forget) so `GET /api/events` stays in sync.

## Configure Grok (optional)

Set in the environment before starting FastAPI:

```bash
export GROK_API_KEY=xai-...
export GROK_MODEL=grok-3                 # optional
export GROK_API_BASE=https://api.x.ai/v1 # optional
```

If the key is missing or the call fails, `services/grok_service.py` returns a deterministic mock. The dashboard Grok pill shows **MOCK** vs **ONLINE**.

Grok is constrained to:

- observational language only
- `allowed_next_cues` — never invent actuator params
- gather more evidence when n is small
- never command the motor

## Configure RunPod (optional)

```bash
export RUNPOD_API_KEY=...
export RUNPOD_ENDPOINT_ID=...
```

`POST https://api.runpod.ai/v2/{id}/runsync` is used when both are set. Otherwise `services/runpod_service.py` returns mock `{ classification, confidence, model_version }`. RunPod is **secondary verification** and is not on the cue-dispatch path. Outages fall back to mock and cannot stop local cueing.

## Connect an ESP32 later

The wearable should run detection + motor control **on device**. This dashboard is an observer / analyst.

Send IMU packets (JSON) to `POST /api/imu` or over the WebSocket:

```json
{ "timestamp": 843920, "ax": 0.13, "ay": -0.42, "az": 9.71, "gx": 0.4, "gy": 2.7, "gz": -1.1 }
```

When packets arrive, the ESP32 pill switches **DEMO → CONNECTED** (and back to DEMO if the stream goes quiet). Do not have Grok or RunPod GPIO-toggle the motor.

## HTTP API

| Method | Path | Role |
|---|---|---|
| GET | `/` | Health + disclaimer + connection pills |
| WS | `/ws/imu` | Live IMU, phase, detection, cue, recovery, analysis |
| POST | `/api/imu` | Ingest one IMU packet |
| POST | `/api/event` | Append an episode |
| POST | `/api/cue` | Arm next cue **locally** (must be in `allowed_next_cues`) |
| POST | `/api/recovery` | Record recovery / drive demo recovery |
| POST | `/api/runpod/inference` | Secondary classifier (mock if unconfigured) |
| POST | `/api/grok/analyze` | Session analysis (mock if unconfigured) |
| GET | `/api/session/current` | In-memory session |
| GET | `/api/events` | Episode log |
| POST | `/api/demo/start-walking` | Demo |
| POST | `/api/demo/simulate-freeze` | Demo |
| POST | `/api/demo/trigger-cue` | Demo |
| POST | `/api/demo/simulate-recovery` | Demo |
| POST | `/api/demo/run-analysis` | Demo |
| POST | `/api/demo/reset` | Demo |
| POST | `/api/demo/arm-cue` | Demo / operator arm |

In-memory session storage. No auth, accounts, billing, EHR, or caregiver portals.

## Repo layout

```
backend/          FastAPI, WebSockets, Pydantic
  main.py
  models.py
  state_machine.py
  websocket_manager.py
  session_engine.py
  services/runpod_service.py
  services/grok_service.py
  demo/simulator.py
frontend/         Next.js + TypeScript + Tailwind (canvas waveform)
  app/  components/  types/
  lib/demoEngine.ts   client-side state machine + automatic demo sequence
  lib/gaitSim.ts      client-side IMU simulator (mirrors backend/demo/simulator.py)
  lib/services.ts     RunPod / Grok abstractions, time-boxed with mock fallbacks
```

CORS allows `FRONTEND_ORIGIN` (default `http://localhost:3000`).
