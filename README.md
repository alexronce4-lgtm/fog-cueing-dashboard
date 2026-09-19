# FoG Cueing Dashboard

HackMIT 2026 experimental wearable **Freezing-of-Gait (FoG)** cueing demo.

A FastAPI backend streams a simulated lower-limb IMU signal through a real-time
freeze-index detector and adaptive cueing engine; a Next.js dashboard visualizes
the live gait waveform, detection state, cue status, and freeze-event history.

> Simulated data for demonstration only — **not a medical device**.

## Architecture

```
┌────────────────────┐        WebSocket /ws/stream        ┌────────────────────┐
│  Next.js dashboard │  <──────────────────────────────  │  FastAPI backend    │
│  (frontend/)       │        REST /api/*                 │  (backend/)         │
└────────────────────┘  ──────────────────────────────>  └────────────────────┘
                                                            │
                          simulator → detector → cue engine → event log
```

- **Gait simulator** (`backend/app/simulator.py`) — scripted walking / freezing /
  still episodes as a 50 Hz vertical-acceleration signal.
- **Freeze detector** (`backend/app/detector.py`) — sliding-window FFT freeze
  index: power in the 3–8 Hz freeze band ÷ power in the 0.5–3 Hz locomotor band.
- **Cue engine** (`backend/app/cueing.py`) — auto-starts a rhythmic cue on freeze
  detection; supports manual override and configurable tempo/modality.

## Getting started

### Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

Run tests:

```bash
cd backend && . .venv/bin/activate && pytest
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

The dashboard reads the API base URL from `NEXT_PUBLIC_API_URL`
(defaults to `http://localhost:8000`).

## API

| Method | Path              | Description                              |
| ------ | ----------------- | ---------------------------------------- |
| GET    | `/api/health`     | Liveness probe                           |
| GET    | `/api/status`     | Current gait state, freeze index, cue    |
| GET    | `/api/config`     | Current detector + cue configuration     |
| POST   | `/api/config`     | Update thresholds / cue settings         |
| GET    | `/api/events`     | Recorded freeze episodes                 |
| POST   | `/api/cue/manual` | Force the cue on/off                     |
| POST   | `/api/cue/auto`   | Return cue control to the detector       |
| WS     | `/ws/stream`      | Live telemetry stream (~50 Hz)           |

## Cloud Agent environment

`.cursor/environment.json` installs both apps via `.cursor/install.sh` and runs
the backend (port 8000) and frontend (port 3000) as persistent terminals.
