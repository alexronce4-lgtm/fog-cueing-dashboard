"use client";

import { pct } from "@/lib/format";
import type { Classification, RunPodResult } from "@/types";

function Meter({
  title,
  kicker,
  value,
  classification,
  footnote,
  pending,
}: {
  title: string;
  kicker: string;
  value: number;
  classification: string;
  footnote: string;
  pending?: boolean;
}) {
  const pctVal = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/60 p-4">
      <p className="kicker">{kicker}</p>
      <h4 className="font-display text-xl font-semibold tracking-wide text-white">{title}</h4>
      <div className="mt-4 flex items-end justify-between">
        <span className="font-display text-5xl font-bold leading-none" style={{ color: "var(--phase)" }}>
          {pending ? "…" : pct(value)}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
          {pending ? "pending" : classification.replace("_", "-")}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pending ? 15 : pctVal}%`, background: "var(--phase)" }}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/45">{footnote}</p>
    </div>
  );
}

export default function DetectionPanel({
  edge,
  runpod,
}: {
  edge: Classification;
  runpod: RunPodResult;
}) {
  return (
    <section className="panel p-5">
      <p className="kicker">02 · Detection</p>
      <h3 className="mb-4 font-display text-2xl font-semibold tracking-wide text-white">
        FREEZE-LIKE PATTERN SCORES
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Meter
          title="EDGE DETECTOR"
          kicker="Latency-first · local"
          value={edge.confidence}
          classification={edge.classification}
          footnote="Owns cue dispatch. Research score for a freeze-like gait pattern — not medically confirmed."
        />
        <Meter
          title="RUNPOD ML"
          kicker="Secondary verification"
          value={runpod.confidence}
          classification={runpod.classification}
          pending={runpod.status === "pending"}
          footnote={`${runpod.model_version} · ${runpod.status}. Cloud verification only — cannot drive the actuator.`}
        />
      </div>
    </section>
  );
}
