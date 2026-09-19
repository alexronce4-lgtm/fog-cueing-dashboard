"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { GaitSim } from "./gaitSim";
import {
  WS_URL,
  analyzeWithGrok,
  mirrorEvent,
  mirrorReset,
  probeBackend,
  verifyWithRunPod,
} from "./services";
import type {
  CueParams,
  DemoState,
  EventRecord,
  GrokAnalysis,
  IMUSample,
  Phase,
  RunPodResult,
} from "@/types";

// ------------------------------------------------------------------ state

const ALLOWED: CueParams[] = [
  { pattern: "rhythmic", bpm: 80 },
  { pattern: "rhythmic", bpm: 95 },
  { pattern: "rhythmic", bpm: 102 },
];

const BASELINE = 102;

function initialState(): DemoState {
  return {
    phase: "IDLE",
    running: false,
    storyStep: 0,
    baseline_cadence_bpm: BASELINE,
    allowed_next_cues: ALLOWED,
    edge: { classification: "walking", confidence: 0.06, latency_ms: 18 },
    runpod: { classification: "unknown", confidence: 0, model_version: "mock-imu-v0", status: "idle" },
    cue: { pattern: "rhythmic", bpm: 95, active: false, source: "edge_local" },
    recovery: { detected: false, elapsed_ms: 0, time_ms: null, pre_cadence: BASELINE, post_cadence: null },
    analysis: null,
    events: [],
    lastEpisodeId: null,
    connections: { stream: "SIMULATED", esp32: "DEMO", runpod: "MOCK", grok: "MOCK" },
    backendReachable: false,
  };
}

type Action =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "SEQUENCE_START" }
  | { type: "PHASE"; phase: Phase; storyStep?: number }
  | { type: "EDGE"; confidence: number }
  | { type: "RUNPOD"; runpod: RunPodResult }
  | { type: "CUE_ACTIVE"; active: boolean }
  | { type: "RECOVERY_TICK"; elapsed_ms: number }
  | { type: "RECOVERED"; event: EventRecord }
  | { type: "ANALYSIS"; analysis: GrokAnalysis }
  | { type: "SEQUENCE_DONE" }
  | { type: "ARM"; cue: CueParams }
  | { type: "CONNECTIONS"; patch: Partial<DemoState["connections"]>; reachable?: boolean };

function reducer(s: DemoState, a: Action): DemoState {
  switch (a.type) {
    case "START": {
      const fresh = initialState();
      return {
        ...fresh,
        phase: "WALKING",
        connections: s.connections,
        backendReachable: s.backendReachable,
        cue: { ...fresh.cue, bpm: s.cue.bpm },
      };
    }
    case "RESET":
      return { ...initialState(), connections: s.connections, backendReachable: s.backendReachable };
    case "SEQUENCE_START": {
      const fresh = initialState();
      return {
        ...s,
        running: true,
        phase: "POSSIBLE_FREEZE",
        storyStep: 1,
        analysis: null,
        runpod: fresh.runpod,
        recovery: { ...fresh.recovery, pre_cadence: s.baseline_cadence_bpm },
        cue: { ...s.cue, active: false },
      };
    }
    case "PHASE":
      return { ...s, phase: a.phase, storyStep: a.storyStep ?? s.storyStep };
    case "EDGE":
      return {
        ...s,
        edge: { ...s.edge, confidence: a.confidence, classification: a.confidence >= 0.6 ? "freeze_like" : a.confidence >= 0.3 ? "unknown" : "walking" },
      };
    case "RUNPOD":
      return { ...s, runpod: a.runpod };
    case "CUE_ACTIVE":
      return { ...s, cue: { ...s.cue, active: a.active } };
    case "RECOVERY_TICK":
      return { ...s, recovery: { ...s.recovery, elapsed_ms: a.elapsed_ms } };
    case "RECOVERED":
      return {
        ...s,
        phase: "RECOVERED",
        storyStep: 5,
        cue: { ...s.cue, active: false },
        recovery: {
          detected: true,
          elapsed_ms: a.event.recovery.time_ms ?? s.recovery.elapsed_ms,
          time_ms: a.event.recovery.time_ms,
          pre_cadence: a.event.pre_cadence ?? BASELINE,
          post_cadence: a.event.post_cadence,
        },
        events: [...s.events, a.event],
        lastEpisodeId: a.event.episode_id,
      };
    case "ANALYSIS":
      return { ...s, analysis: a.analysis };
    case "SEQUENCE_DONE":
      return { ...s, phase: "WALKING", storyStep: 7, running: false };
    case "ARM":
      return { ...s, cue: { ...s.cue, bpm: a.cue.bpm, pattern: a.cue.pattern } };
    case "CONNECTIONS":
      return {
        ...s,
        connections: { ...s.connections, ...a.patch },
        backendReachable: a.reachable ?? s.backendReachable,
      };
  }
}

// ------------------------------------------------------------------ engine

export function useDemoEngine() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [cadence, setCadence] = useState(0);

  const samplesRef = useRef<IMUSample[]>([]);
  const simRef = useRef<GaitSim | null>(null);
  if (!simRef.current) simRef.current = new GaitSim(BASELINE);

  const timers = useRef<number[]>([]);
  const recoveryTimer = useRef<number | null>(null);
  const runId = useRef(0);
  const runningRef = useRef(false);
  const liveSensor = useRef(false);
  const episodeCount = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ---- simulator loop (one interval for the component lifetime)
  useEffect(() => {
    const sim = simRef.current!;
    let lastCadenceAt = 0;
    const id = window.setInterval(() => {
      if (liveSensor.current) return;
      const s = sim.sample();
      const buf = samplesRef.current;
      buf.push(s);
      if (buf.length > 400) buf.splice(0, buf.length - 400);
      const now = performance.now();
      if (now - lastCadenceAt > 250) {
        lastCadenceAt = now;
        setCadence(s.cadence_bpm ?? 0);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, []);

  // ---- optional backend probe + live-sensor socket (never surfaces errors)
  useEffect(() => {
    let closed = false;
    let sock: WebSocket | null = null;
    let retry: number | null = null;
    let backoff = 2000;

    probeBackend().then((r) => {
      if (closed) return;
      dispatch({ type: "CONNECTIONS", patch: r.connections, reachable: r.reachable });
    });

    const connect = () => {
      if (closed) return;
      try {
        sock = new WebSocket(WS_URL);
      } catch {
        retry = window.setTimeout(connect, backoff);
        return;
      }
      sock.onopen = () => {
        backoff = 2000;
      };
      sock.onclose = () => {
        liveSensor.current = false;
        dispatch({ type: "CONNECTIONS", patch: { esp32: "DEMO", stream: "SIMULATED" } });
        if (!closed) {
          retry = window.setTimeout(connect, backoff);
          backoff = Math.min(backoff * 2, 15000);
        }
      };
      sock.onerror = () => {
        /* handled by onclose; demo mode is unaffected */
      };
      sock.onmessage = (ev) => {
        let msg: { type: string; data: unknown };
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "status") {
          const st = msg.data as { esp32?: string; runpod?: string; grok?: string };
          const live = st.esp32 === "CONNECTED";
          liveSensor.current = live;
          dispatch({
            type: "CONNECTIONS",
            patch: {
              esp32: live ? "LIVE" : "DEMO",
              stream: live ? "LIVE" : "SIMULATED",
              runpod: st.runpod === "ONLINE" ? "ONLINE" : "MOCK",
              grok: st.grok === "ONLINE" ? "ONLINE" : "MOCK",
            },
            reachable: true,
          });
        } else if (msg.type === "imu" && liveSensor.current) {
          // Only a real wearable may drive the trace; backend demo state never overwrites the UI.
          const s = msg.data as IMUSample;
          const buf = samplesRef.current;
          buf.push(s);
          if (buf.length > 400) buf.splice(0, buf.length - 400);
          if (s.cadence_bpm != null) setCadence(s.cadence_bpm);
        }
      };
    };
    connect();

    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      sock?.close();
    };
  }, []);

  // ---- scheduling helpers
  const cancelSequence = useCallback(() => {
    runId.current += 1;
    runningRef.current = false;
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    if (recoveryTimer.current != null) {
      window.clearInterval(recoveryTimer.current);
      recoveryTimer.current = null;
    }
  }, []);

  useEffect(() => cancelSequence, [cancelSequence]);

  // ---- controls
  const startDemo = useCallback(() => {
    cancelSequence();
    const sim = simRef.current!;
    sim.reset(BASELINE);
    sim.setMode("walking");
    samplesRef.current = [];
    dispatch({ type: "START" });
  }, [cancelSequence]);

  const reset = useCallback(() => {
    cancelSequence();
    const sim = simRef.current!;
    sim.reset(BASELINE);
    sim.setMode("idle");
    samplesRef.current = [];
    episodeCount.current = 0;
    setCadence(0);
    dispatch({ type: "RESET" });
    mirrorReset();
  }, [cancelSequence]);

  const triggerFreeze = useCallback(() => {
    if (runningRef.current) return;
    if (stateRef.current.phase === "IDLE") startDemo();

    const id = ++runId.current;
    runningRef.current = true;
    const sim = simRef.current!;
    const t0 = performance.now();
    const alive = () => runId.current === id;
    const until = (ms: number) =>
      new Promise<void>((resolve) => {
        const delay = Math.max(0, t0 + ms - performance.now());
        timers.current.push(window.setTimeout(resolve, delay));
      });

    const run = async () => {
      // 0 ms — possible freeze-like pattern; edge score ramps quickly.
      dispatch({ type: "SEQUENCE_START" });
      sim.setMode("freeze");
      const edgeTarget = 0.82 + Math.random() * 0.06;
      const ramp = [0.42, 0.58, 0.71, 0.78, edgeTarget];
      for (let i = 0; i < ramp.length; i++) {
        await until(i * 90);
        if (!alive()) return;
        dispatch({ type: "EDGE", confidence: ramp[i] });
      }

      // 500 ms — detected; ask RunPod for secondary verification (time-boxed).
      await until(500);
      if (!alive()) return;
      dispatch({ type: "PHASE", phase: "DETECTED", storyStep: 2 });
      dispatch({ type: "RUNPOD", runpod: { classification: "unknown", confidence: 0, model_version: "…", status: "pending" } });
      const verification = verifyWithRunPod({ accel_variance: 0.12, window: "demo-freeze-like" }, "freeze_like", 450);

      // 1000 ms — cue fires from the EDGE score; RunPod result is displayed alongside.
      await until(1000);
      if (!alive()) return;
      const rp = await verification;
      if (!alive()) return;
      dispatch({ type: "RUNPOD", runpod: rp });
      dispatch({ type: "PHASE", phase: "CUE_TRIGGERED", storyStep: 3 });
      dispatch({ type: "CUE_ACTIVE", active: true });

      // 2000 ms — recovery monitoring starts.
      await until(2000);
      if (!alive()) return;
      dispatch({ type: "PHASE", phase: "RECOVERY_MONITORING", storyStep: 4 });
      const recStart = performance.now();
      recoveryTimer.current = window.setInterval(() => {
        if (!alive()) return;
        dispatch({ type: "RECOVERY_TICK", elapsed_ms: Math.round(performance.now() - recStart) });
      }, 50);

      // Waveform begins returning ~400 ms before RECOVERED so the morph is visible.
      const recoverAt = 3400 + Math.random() * 400; // → 1.4–1.8 s recovery
      await until(recoverAt - 400);
      if (!alive()) return;
      sim.setMode("recovering");

      await until(recoverAt);
      if (!alive()) return;
      if (recoveryTimer.current != null) {
        window.clearInterval(recoveryTimer.current);
        recoveryTimer.current = null;
      }
      const recoveryMs = Math.round(performance.now() - recStart);
      const cur = stateRef.current;
      episodeCount.current += 1;
      const event: EventRecord = {
        episode_id: `E${episodeCount.current}`,
        timestamp_iso: new Date().toISOString(),
        edge: { classification: "freeze_like", confidence: cur.edge.confidence },
        runpod: rp,
        cue: { ...cur.cue, active: false },
        recovery: { detected: true, time_ms: recoveryMs },
        status: "Recovered",
        event_duration_ms: Math.round(recoverAt),
        pre_cadence: BASELINE,
        post_cadence: Math.round(BASELINE - 1 - Math.random() * 2),
      };
      dispatch({ type: "RECOVERED", event });
      mirrorEvent(event);

      // Immediately after — analysis (verification result stays on screen).
      await until(recoverAt + 250);
      if (!alive()) return;
      dispatch({ type: "PHASE", phase: "ANALYZING", storyStep: 6 });
      const events = [...cur.events, event];
      const analysisP = analyzeWithGrok(events, ALLOWED, BASELINE, 800);

      await until(recoverAt + 1250);
      if (!alive()) return;
      const analysis = await analysisP;
      if (!alive()) return;
      dispatch({ type: "ANALYSIS", analysis });
      sim.setMode("walking");
      dispatch({ type: "SEQUENCE_DONE" });
      runningRef.current = false;
    };

    void run().catch(() => {
      // Any unexpected failure lands the demo back in a safe, walkable state.
      if (!alive()) return;
      sim.setMode("walking");
      dispatch({ type: "SEQUENCE_DONE" });
      runningRef.current = false;
    });
  }, [startDemo]);

  const armCue = useCallback((cue: CueParams) => {
    if (!ALLOWED.some((c) => c.bpm === cue.bpm && c.pattern === cue.pattern)) return;
    dispatch({ type: "ARM", cue });
  }, []);

  return { state, cadence, samplesRef, startDemo, triggerFreeze, reset, armCue };
}
