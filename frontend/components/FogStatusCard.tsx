"use client";

import type { GaitState } from "@/lib/types";

interface FogStatusCardProps {
  state: GaitState;
  freezeIndex: number;
  power: number;
  threshold: number;
}

const STATE_META: Record<GaitState, { label: string; badge: string; glow: string }> = {
  walking: {
    label: "Walking",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    glow: "shadow-[0_0_40px_-8px_rgba(56,189,248,0.6)]",
  },
  freezing: {
    label: "Freezing of Gait",
    badge: "bg-red-500/15 text-red-300 border-red-500/40",
    glow: "shadow-[0_0_50px_-6px_rgba(248,113,113,0.7)]",
  },
  still: {
    label: "Standing still",
    badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    glow: "",
  },
};

export function FogStatusCard({ state, freezeIndex, power, threshold }: FogStatusCardProps) {
  const meta = STATE_META[state];
  const ratio = Math.min(1, freezeIndex / (threshold * 2));

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-panel/70 p-5 shadow-xl transition-shadow ${meta.glow}`}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Detection
      </h2>
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${meta.badge}`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            state === "freezing" ? "animate-pulse bg-red-400" : "bg-current"
          }`}
        />
        {meta.label}
      </span>

      <dl className="mt-5 space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Freeze index</dt>
            <dd className="font-mono text-lg text-slate-100">{freezeIndex.toFixed(2)}</dd>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                freezeIndex >= threshold ? "bg-red-400" : "bg-sky-400"
              }`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">threshold {threshold.toFixed(1)}</p>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Band power</dt>
          <dd className="font-mono text-lg text-slate-100">{power.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  );
}
