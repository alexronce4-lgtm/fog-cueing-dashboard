# FoG Cueing Lab — HackMIT 2026

Experimental wearable **freeze-like gait cueing** research dashboard.

This is a **research / assistive-technology prototype**, not a validated medical device. The UI never claims diagnosis, treatment, or confirmed freezing of gait. Language is limited to *possible freeze-like event* and *freeze-like gait pattern*.

**Architecture rule:** Grok and RunPod do **not** drive the vibration motor. The intervention loop is local / edge-first. Cloud models only verify or analyze after (or alongside) events.

Core loop: **SENSE → DETECT → CUE → RECOVER → ADAPT**

```
WALKING → POSSIBLE FREEZE → DETECTED → HAPTIC CUE → RECOVERING → RECOVERED → ANALYZING → OUTCOME LEARNED
```

The differentiator is not detection alone: each episode's **recovery time** is measured, logged, and fed back to choose the **next cue experiment**.

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

Demo mode is **self-contained in the browser**: the gait generator, the automatic
freeze → cue → recovery sequence, and the mock RunPod / Grok services all run
client-side. The dashboard works with the backend offline and never shows an
error banner. The header badge reads `DEMO MODE · READY`, `REPLAY MODE · LABELED DATA`
or `LIVE MODE · DEVICE CONNECTED`; technical statuses live in the **Advanced** row.

Three controls (keys **1 · 2 · 3**) in the docked bar:

| Control | DEMO | REPLAY |
|---|---|---|
| **1** | **START DEMO** — clear session, enter **WALKING**, start realistic gait signal | **NEXT REPLAY SAMPLE** — cycle FoG-STAR events |
| **2** | **TRIGGER EVENT** — run the whole loop automatically | **REPLAY LABELED EVENT** — play the labeled window; state syncs to its markers |
| **3** | **RESET** — cancel timers, clear markers / events / analysis, back to **READY** | same |

Automatic timeline after **TRIGGER EVENT**:

| t | State | On screen |
|---|---|---|
| 0 ms | **POSSIBLE FREEZE** | Steps break up into trembling + stalls; detection ramps to ~82–88%; figure's legs collapse to hesitant micro-motion |
| 500 ms | **DETECTED** | `DETECTION` marker on the chart; verification requested (time-boxed, mock fallback) |
| 1000 ms | **HAPTIC CUE** | Verification ~88–94%; cue **ACTIVE**, `CUE` marker; pulse rings from the ankle wearable at 95 BPM |
| 2000 ms | **RECOVERING** | Recovery timer running; step rhythm gradually returns |
| 3.4–3.8 s | **RECOVERED** | `RECOVERY` marker; **RECOVERY DETECTED · 1.xx s** highlighted; episode E*nn* logged |
| +1.2 s | **ANALYZING** | Evidence summary across episodes |
| +2.2 s | **OUTCOME LEARNED** | Observed / Recovery / Evidence / Next experiment / Confidence |

The cue is dispatched from the **edge** score. RunPod verifies alongside and Grok
analyses afterwards; neither can pulse the motor. With a handful of episodes the
analysis will not rank cues — it asks for more observations and only proposes a
next tempo from `allowed_next_cues` (80 / 95 / 102 BPM). Arming it is a local
operator click.

When the backend is reachable, episodes are mirrored to `POST /api/event`
(fire-and-forget) so `GET /api/events` stays in sync.

## Data sources

Everything that feeds the chart implements one interface (`frontend/lib/datasources/types.ts`):

```
DataSource  { kind, start(sink), stop() }
├── DemoSimulatorSource     lib/datasources/demoSimulatorSource.ts   (GaitSim, 25 Hz)
├── ReplayDatasetSource     lib/datasources/replayDatasetSource.ts   (prepared FoG-STAR windows, 60 Hz)
└── ESP32StreamSource       lib/datasources/esp32StreamSource.ts     (backend WebSocket, real device)
```

The engine (`lib/demoEngine.ts`) only sees `IMUSample`s on a common sink; the UI
does not know which source is active.

### Realistic synthetic gait (`lib/gaitSim.ts`)

Not an oscillator. The signal is a sum of **discrete step pulses** — heel-strike
spike, loading bump, push-off bump, swing dip — with per-step jitter on interval
(~3.5%) and amplitude (~11%), slow baseline drift and sensor noise. Freeze-like
mode replaces steps with hesitant micro-steps, bursty 5–7 Hz trembling and short
flat stalls; recovery interpolates regularity back over ~1.6 s. Cadence is
estimated from the generated step intervals.

### Replay of labeled patient IMU data (FoG-STAR)

[FoG-STAR](https://doi.org/10.5281/zenodo.17037669) — 22 people with Parkinson's
disease, ankle L/R + back + wrist IMUs at 60 Hz (acc in g, gyro in °/s), 101
expert video-annotated FoG episodes with severity (shuffling / trembling / akinesia),
activity and task labels.

Prepared windows live in `frontend/public/data/replay/`:

```
index.json            dataset facts + list of events
fogstar-001.json      straight walking · trembling
fogstar-002.json      walking + counting · trembling
fogstar-turning.json  360° turning · trembling
fogstar-doorway.json  walking through doorway · akinesia
```

Each file:

```json
{
  "event_id": "fogstar-001", "source": "FoG-STAR", "subject_id": "S09",
  "task": "straight walking", "label": "freeze_like", "fog_severity": "trembling",
  "sensor": "ankleL (acc + gyro magnitude)", "sample_rate_hz": 60,
  "baseline_cadence_bpm": 83, "duration_s": 13.0,
  "fog_onset_t": 6.0, "fog_offset_t": 9.0,
  "markers": { "detection_t": 6.4, "cue_t": 7.0, "recovery_t": 9.0 },
  "markers_source": { "detection": "derived …", "cue": "derived: no cueing in dataset …", "recovery": "dataset: expert-labelled FoG offset" },
  "samples": [ { "t": 0.0, "acc_mag": 1.02, "gyro_mag": 14.3, "fog": 0 }, … ]
}
```

The dataset contains no cueing, so `detection_t` and `cue_t` are **derived**
(onset + 0.4 s, + 0.6 s) and labelled as such in the file and the Advanced row;
`recovery_t` is the dataset's own FoG-offset label. The amber band on the chart
is the labelled FoG span.

**Add more samples:**

```bash
# download sensor_data.csv from the Zenodo record, then
python data/prepare_fogstar_replay.py --csv sensor_data.csv --list          # list all 101 episodes
python data/prepare_fogstar_replay.py --csv sensor_data.csv \
   --pick 15:1:6:0 --id 15:1:6:0=fogstar-dualtask --title '15:1:6:0=FoG-STAR dual-task event'
```

Pick keys are `subject:session:task:episode_index`. The script rewrites
`index.json`; the UI picks it up on refresh. Any other dataset works if you
emit the same JSON shape.

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
frontend/         Next.js + TypeScript + Tailwind (canvas waveform, SVG gait figure)
  app/  types/
  components/
    CurrentState.tsx  hero state + GaitFigure.tsx (lower-body silhouette, ankle wearable)
    GaitSignal.tsx    Waveform.tsx (time-based canvas, markers, labeled FoG band) + data strip
    ResponsePanel.tsx detection · verification · haptic cue · recovery (+ last 3 episodes)
    OutcomePanel.tsx  OUTCOME LEARNED (adaptive analysis, reasoning: Grok)
    ModeBadge.tsx     DEMO / REPLAY / LIVE switch + compact status badge
    DemoControls.tsx  3-button transport
    AdvancedPanel.tsx raw sensor, event JSON, models, connections, full analysis
  lib/demoEngine.ts   state machine, automatic sequence, replay sync, source switching
  lib/gaitSim.ts      step-pulse gait generator (freeze-like tremor + stalls, recovery)
  lib/datasources/    DataSource interface + Demo / Replay / ESP32 implementations
  lib/services.ts     RunPod / Grok abstractions, time-boxed with mock fallbacks
  public/data/replay/ prepared FoG-STAR windows + index.json
data/prepare_fogstar_replay.py   CSV → replay JSON pipeline
```

CORS allows `FRONTEND_ORIGIN` (default `http://localhost:3000`).
