"use client";

import { useState } from "react";
import { API_URL, WS_URL } from "@/lib/services";
import type { DemoState } from "@/types";

export default function AdvancedPanel({ state }: { state: DemoState }) {
  const [open, setOpen] = useState(false);
  const rows: [string, string][] = [
    ["Phase (raw)", state.phase],
    ["Sequence running", state.running ? "yes" : "no"],
    ["Edge latency", `${state.edge.latency_ms} ms on-device`],
    ["Cue source", state.cue.source],
    ["Cue pattern", `${state.cue.pattern} · ${state.cue.bpm} BPM`],
    ["Allowed next cues", state.allowed_next_cues.map((c) => `${c.bpm}`).join(" / ") + " BPM"],
    ["RunPod model", `${state.runpod.model_version} · ${state.runpod.status}`],
    ["Grok mode", state.analysis ? (state.analysis.mock ? "mock (local)" : "live") : "idle"],
    ["Backend", state.backendReachable ? `reachable · ${API_URL}` : `not reachable · ${API_URL} (demo continues locally)`],
    ["Sensor stream", `${state.connections.stream} · ${WS_URL}`],
    ["Motor control", "local / edge only — cloud never commands the actuator"],
  ];

  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="label">Advanced · engineering detail</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 border-t border-white/[0.07] px-5 py-4 md:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-white/[0.05] py-1.5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">{k}</dt>
              <dd className="text-right font-mono text-[12px] text-white/80">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
