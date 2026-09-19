"use client";

import { PHASE_CAPTION, PHASE_ORDER } from "@/lib/format";
import type { Classification, CueInfo, Phase, StatePayload } from "@/types";

const SHORT: Record<Phase, string> = {
  WALKING: "SENSE",
  POSSIBLE_FREEZE: "DETECT",
  CUE_TRIGGERED: "INTERVENE",
  RECOVERY_MONITORING: "MEASURE",
  RECOVERED: "RECOVERED",
  ANALYZING: "ADAPT",
};

export default function StateBanner({
  state,
  edge,
  cue,
}: {
  state: StatePayload;
  edge: Classification;
  cue: CueInfo;
}) {
  const idx = PHASE_ORDER.indexOf(state.phase);

  return (
    <section className="card card-accent relative flex h-full flex-col justify-between gap-6 overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--phase)" }}
      />
      <div className="relative">
        <p className="label flex items-center gap-2">
          <span className="live-dot" />
          System state
        </p>
        <h2
          key={state.phase}
          className="phase-text value-display rise mt-2 text-[64px] font-bold leading-[0.95] sm:text-[84px]"
        >
          {state.label}
        </h2>
        <p key={`${state.phase}-cap`} className="rise mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
          {PHASE_CAPTION[state.phase]}
        </p>
      </div>

      <div className="relative">
        <p className="label mb-4">Intervention loop</p>
        <div className="absolute left-[7px] right-[7px] top-[43px] h-px bg-white/12" />
        <div
          className="absolute left-[7px] top-[43px] h-px phase-bg transition-all duration-500"
          style={{ width: `calc(${(idx / (PHASE_ORDER.length - 1)) * 100}% - 14px)` }}
        />
        <ol className="relative grid grid-cols-6 gap-1">
          {PHASE_ORDER.map((p, i) => (
            <li key={p} className={`loop-node ${i < idx ? "done" : ""} ${i === idx ? "active" : ""}`}>
              <span className="dot" />
              <span className="text-center text-[11px] leading-tight tracking-[0.16em]">{SHORT[p]}</span>
            </li>
          ))}
        </ol>
      </div>

      <dl className="relative grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
        <Fact label="Edge score" value={`${Math.round(edge.confidence * 100)}%`} />
        <Fact label="Cue source" value={cue.active ? (cue.source || "edge").split("_")[0].toUpperCase() : "STANDBY"} />
        <Fact label="Motor control" value="LOCAL ONLY" accent />
      </dl>
    </section>
  );
}

function Fact({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`value-display mt-1 text-xl font-semibold ${accent ? "phase-text" : "text-white"}`}>{value}</dd>
    </div>
  );
}
