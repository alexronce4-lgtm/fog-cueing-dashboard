"use client";

import type { MutableRefObject } from "react";
import type { IMUSample, Phase, SensorMode } from "@/types";
import Waveform from "./Waveform";

export default function GaitSignal({
  samplesRef,
  cadence,
  baseline,
  phase,
  color,
  sensor,
}: {
  samplesRef: MutableRefObject<IMUSample[]>;
  cadence: number;
  baseline: number;
  phase: Phase;
  color: string;
  sensor: SensorMode;
}) {
  const freeze = phase === "POSSIBLE_FREEZE" || phase === "DETECTED" || phase === "CUE_TRIGGERED" || phase === "RECOVERY_MONITORING";
  const status =
    phase === "IDLE" ? "Standby" : freeze ? "Freeze-like pattern" : "Rhythmic stepping";

  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4">
        <div>
          <p className="label">Live gait signal</p>
          <h3 className="value-display text-2xl font-semibold text-white">ACCELERATION MAGNITUDE</h3>
        </div>
        <div className="flex gap-6">
          <Readout label="Cadence" value={cadence > 1 ? cadence.toFixed(0) : "—"} unit="BPM" hot={freeze} />
          <Readout label="Baseline" value={baseline.toFixed(0)} unit="BPM" />
          <Readout label="Sensor" value={sensor} />
        </div>
      </div>
      <div className="relative mt-2 min-h-[220px] flex-1">
        <Waveform samplesRef={samplesRef} color={color} />
        <div className="pointer-events-none absolute left-5 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
          <span className="live-dot" />
          {status}
        </div>
      </div>
    </section>
  );
}

function Readout({ label, value, unit, hot }: { label: string; value: string; unit?: string; hot?: boolean }) {
  return (
    <div className="text-right">
      <p className="label">{label}</p>
      <p className={`value-display text-3xl font-semibold leading-none ${hot ? "phase-text" : "text-white"}`}>
        {value}
        {unit && <span className="ml-1 text-sm text-white/40">{unit}</span>}
      </p>
    </div>
  );
}
