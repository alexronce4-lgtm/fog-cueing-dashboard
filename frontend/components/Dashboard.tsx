"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, wsUrl } from "@/lib/api";
import { PHASE_CLASS, PHASE_COLOR } from "@/lib/format";
import type {
  Classification,
  ConnectionStatus,
  CueInfo,
  EventRecord,
  GrokAnalysis,
  IMUSample,
  RecoveryInfo,
  RunPodResult,
  SessionState,
  StatePayload,
} from "@/types";
import AdaptiveAnalysis from "./AdaptiveAnalysis";
import ConnectionPills from "./ConnectionPills";
import DemoControls from "./DemoControls";
import { EdgeTile, RunPodTile } from "./DetectionPanel";
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
const EMPTY_EDGE: Classification = { classification: "walking", confidence: 0.08, source: "edge" };
const EMPTY_RP: RunPodResult = {
  classification: "unknown",
  confidence: 0,
  model_version: "mock-imu-v0",
  status: "idle",
};
const EMPTY_REC: RecoveryInfo = { detected: false, elapsed_ms: 0, pre_cadence: 102 };

export default function Dashboard() {
  const [state, setState] = useState<StatePayload>(EMPTY_STATE);
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
  const [cadence, setCadence] = useState(102);
  const [wsOk, setWsOk] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // IMU samples live in a ref; the canvas reads them at 60 fps without re-rendering React.
  const samplesRef = useRef<IMUSample[]>([]);
  const lastCadenceAt = useRef(0);

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
        let msg: { type: string; data: unknown };
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        switch (msg.type) {
          case "imu": {
            const s = msg.data as IMUSample;
            const buf = samplesRef.current;
            buf.push(s);
            if (buf.length > 400) buf.splice(0, buf.length - 400);
            const now = performance.now();
            if (s.cadence_bpm != null && now - lastCadenceAt.current > 250) {
              lastCadenceAt.current = now;
              setCadence(s.cadence_bpm);
            }
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
              return prev.some((e) => e.episode_id === next.episode_id) ? prev : [...prev, next];
            });
            break;
        }
      };
    };

    connect();
    api
      .session()
      .then((raw) => {
        const s = raw as SessionState;
        setSession(s);
        setEvents(s.events || []);
        setCue(s.cue);
        setEdge(s.edge);
        setRunpod(s.runpod);
        setRecovery(s.recovery);
        if (s.analysis) setAnalysis(s.analysis);
        setState({ ...EMPTY_STATE, phase: s.phase, label: s.phase_label });
      })
      .catch(() => {});

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      sock?.close();
    };
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }, []);

  const phaseClass = PHASE_CLASS[state.phase] || "phase-walking";
  const color = PHASE_COLOR[state.phase] || PHASE_COLOR.WALKING;

  return (
    <div className={`stage ${phaseClass}`} data-phase={state.phase}>
      <div className="relative z-10 mx-auto max-w-[1680px] px-4 pb-32 pt-4 sm:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-black/30">
              <span className="h-3 w-3 rounded-full phase-bg shadow-[0_0_16px_var(--phase)]" />
            </div>
            <div>
              <h1 className="value-display text-2xl font-bold leading-none tracking-wide text-white">
                FoG CUEING LAB
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.26em] text-white/45">
                HackMIT 2026 · Wearable research prototype · Not a medical device
              </p>
            </div>
          </div>
          <ConnectionPills connections={connections} wsOk={wsOk} />
        </header>

        {error && (
          <div className="mb-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5 2xl:col-span-4">
            <StateBanner state={state} edge={edge} cue={cue} />
          </div>
          <div className="min-h-[340px] xl:col-span-7 2xl:col-span-8">
            <GaitSignal
              samplesRef={samplesRef}
              cadence={cadence}
              baseline={session?.baseline_cadence_bpm ?? 102}
              phase={state.phase}
              color={color}
              sensor={connections.esp32}
            />
          </div>

          <div className="md:col-span-1 xl:col-span-3">
            <EdgeTile edge={edge} />
          </div>
          <div className="xl:col-span-3">
            <RunPodTile runpod={runpod} />
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
              analyzing={state.phase === "ANALYZING"}
              onArm={(bpm) => run("arm", () => api.armCue(bpm))}
            />
          </div>
          <div className="xl:col-span-7">
            <RecentEvents events={events} />
          </div>
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
          Research / assistive-technology prototype. Signals describe possible freeze-like events only — never a
          confirmed diagnosis, treatment, or validated FoG detector. Cloud models never command the motor.
        </p>
      </div>

      <DemoControls busy={busy} phase={state.phase} run={run} />
    </div>
  );
}
