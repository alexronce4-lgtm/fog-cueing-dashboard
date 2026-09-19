"use client";

import type { GaitState } from "@/lib/types";

interface GaitChartProps {
  trace: number[];
  state: GaitState;
}

const STATE_STROKE: Record<GaitState, string> = {
  walking: "#38bdf8",
  freezing: "#f87171",
  still: "#94a3b8",
};

function buildPath(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const max = Math.max(1.4, ...values.map((v) => Math.abs(v)));
  const stepX = width / (values.length - 1);
  const mid = height / 2;
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = mid - (v / max) * (mid - 8);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function GaitChart({ trace, state }: GaitChartProps) {
  const width = 720;
  const height = 220;
  const path = buildPath(trace, width, height);
  const stroke = STATE_STROKE[state];

  return (
    <div className="rounded-2xl border border-white/10 bg-panel/70 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Vertical acceleration
        </h2>
        <span className="text-xs text-slate-500">live IMU stream · 50 Hz</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Live gait acceleration waveform"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#1e293b"
          strokeWidth="1"
        />
        {path && (
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
