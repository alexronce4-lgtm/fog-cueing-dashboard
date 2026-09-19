"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, wsUrl } from "@/lib/api";
import { PHASE_CLASS } from "@/lib/format";
import type {
  ConnectionStatus,
  CueInfo,
  EventRecord,
  GrokAnalysis,
  IMUSample,
  Classification,
  RecoveryInfo,
  RunPodResult,
  SessionState,
  StatePayload,
} from "@/types";
import AdaptiveAnalysis from "./AdaptiveAnalysis";
import ConnectionPills from "./ConnectionPills";
import DemoControls from "./DemoControls";
import DetectionPanel from "./DetectionPanel";
import GaitSignal from "./GaitSignal";
import HapticIntervention from "./HapticIntervention";
import RecentEvents from "./RecentEvents";
import RecoveryPanel from "./RecoveryPanel";
import StateBanner from "./StateBanner";

const EMPTY_STATE: StatePayload = {
  phase: "WALKING",
  label: "WALKING",
  loop_step: "SENSE",
  loop: ["SENSE", "DETECT", "INTERVENE", "MEASURE RECOVERY", "ANALYZE", "ADAPT"],
};

const EMPTY_CUE: CueInfo = { pattern: "rhythmic", bpm: 95, active: false };
const EMPTY_EDGE: Classification = {
  classification: "walking",
  confidence: 0.08,
  source: "edge",
};
const EMPTY_RP: RunPodResult = {
  classification: "unknown",
  confidence: 0,
  model_version: "mock-imu-v0",
  status: "idle",
};
const EMPTY_REC: RecoveryInfo = { detected: false, elapsed_ms: 0, pre_cadence: 102 };

export default function Dashboard() {
  const [state, setState] = useState<StatePayload>(EMPTY_STATE);
  const [imu, setImu] = useState<IMUSample[]>([]);
  const [connections, setConnections] = useState<ConnectionStatus>({
    esp32: "DEMO",
    runpod: "MOCK",
    grok: "MOCK",
  });
  const [cue, setCue] = useState<CueInfo>(EMPTY_CUE);
  const [edge, setEdge] = useState<Classification>(EMPTY_EDGE);
  const [runpod, setRunpod] = useState<RunPodResult>(EMPTY_RP);
  const [recovery, setRecovery] = useState<RecoveryInfo>(EMPTY_REC);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [analysis, setAnalysis] = useState<GrokAnalysis | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [wsOk, setWsOk] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buffer = useRef<IMUSample[]>([]);

  useEffect(() => {
    let closed = false;
    let sock: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        sock = new WebSocket(wsUrl());
      } catch {
        setWsOk(false);
        retry = setTimeout(connect, 1500);
        return;
      }
      sock.onopen = () => setWsOk(true);
      sock.onclose = () => {
        setWsOk(false);
        if (!closed) retry = setTimeout(connect, 1500);
      };
      sock.onerror = () => setWsOk(false);
      sock.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { type: string; data: unknown };
          switch (msg.type) {
            case "imu": {
              const sample = msg.data as IMUSample;
              buffer.current = [...buffer.current.slice(-179), sample];
              setImu(buffer.current);
              break;
            }
            case "state":
              setState(msg.data as StatePayload);
              break;
            case "status":
              setConnections(msg.data as ConnectionStatus);
              break;
            case "cue":
              setCue(msg.data as CueInfo);
              break;
            case "detection": {
              const d = msg.data as { edge: Classification; runpod: RunPodResult };
              if (d.edge) setEdge(d.edge);
              if (d.runpod) setRunpod(d.runpod);
              break;
            }
            case "recovery":
              setRecovery(msg.data as RecoveryInfo);
              break;
            case "session": {
              const s = msg.data as SessionState;
              setSession(s);
              setEvents(s.events || []);
              if (s.cue) setCue(s.cue);
              if (s.analysis) setAnalysis(s.analysis);
              break;
            }
            case "analysis":
              setAnalysis(msg.data as GrokAnalysis | null);
              break;
            case "event_logged":
              setEvents((prev) => {
                const next = msg.data as EventRecord;
                if (prev.some((e) => e.episode_id === next.episode_id)) return prev;
                return [...prev, next];
              });
              break;
            default:
              break;
          }
        } catch {
          /* ignore malformed frames */
        }
      };
    };

    connect();
    api
      .session()
      .then((s) => {
        const sess = s as SessionState;
        setSession(sess);
        setEvents(sess.events || []);
        setCue(sess.cue);
        setEdge(sess.edge);
        setRunpod(sess.runpod);
        setRecovery(sess.recovery);
        if (sess.analysis) setAnalysis(sess.analysis);
        setState({
          phase: sess.phase,
          label: sess.phase_label,
          loop_step: EMPTY_STATE.loop_step,
          loop: EMPTY_STATE.loop,
        });
      })
      .catch(() => {
        /* backend may still be booting */
      });

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      sock?.close();
    };
  }, []);

  const cadence = useMemo(() => {
    const last = imu[imu.length - 1];
    return last?.cadence_bpm ?? session?.current_cadence_bpm ?? 102;
  }, [imu, session]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  const phaseClass = PHASE_CLASS[state.phase] || "phase-walking";

  return (
    <div className={`lab-grid min-h-screen ${phaseClass}`} data-phase={state.phase}>
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-4 sm:px-6">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="kicker">HackMIT 2026 · Wearable research prototype</p>
            <h1 className="font-display text-3xl font-semibold tracking-wide text-white sm:text-4xl">
              FoG CUEING LAB
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/55">
              Experimental freeze-like gait cueing dashboard. Not a medical device.
              Cloud models analyze after the fact — they do not drive the motor.
            </p>
          </div>
          <ConnectionPills connections={connections} wsOk={wsOk} />
        </header>

        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-200">
          Research / assistive technology prototype — possible freeze-like events only.
          Never a confirmed diagnosis, treatment, or validated FoG detector.
        </div>

        <StateBanner state={state} />

        {error && (
          <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <GaitSignal
              samples={imu}
              cadence={cadence}
              baseline={session?.baseline_cadence_bpm ?? 102}
              phase={state.phase}
              sensor={connections.esp32}
            />
          </div>
          <div className="xl:col-span-4">
            <DemoControls busy={busy} run={run} />
          </div>

          <div className="xl:col-span-6">
            <DetectionPanel edge={edge} runpod={runpod} />
          </div>
          <div className="xl:col-span-3">
            <HapticIntervention cue={cue} />
          </div>
          <div className="xl:col-span-3">
            <RecoveryPanel recovery={recovery} phase={state.phase} />
          </div>

          <div className="xl:col-span-5">
            <AdaptiveAnalysis
              analysis={analysis}
              pending={session?.pending_next_cue}
              onArm={(bpm) => run("arm", () => api.armCue(bpm))}
            />
          </div>
          <div className="xl:col-span-7">
            <RecentEvents events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
