"use client";

import { seconds } from "@/lib/format";
import type { Phase, RecoveryInfo } from "@/types";

export default function RecoveryPanel({
  recovery,
  phase,
}: {
  recovery: RecoveryInfo;
  phase: Phase;
}) {
  const live = phase === "RECOVERY_MONITORING";
  const ms = live ? recovery.elapsed_ms : recovery.time_ms ?? recovery.elapsed_ms;

  return (
    <section className={`card flex h-full flex-col p-5 ${live ? "card-accent" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label">05 · Recovery</p>
          <h3 className="value-display text-2xl font-semibold text-white">TIME TO BASELINE</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-[11px] tracking-[0.22em] ${
            recovery.detected ? "bg-signal-lime/20 text-signal-lime" : live ? "phase-bg text-black" : "bg-white/5 text-white/45"
          }`}
        >
          {recovery.detected ? "DETECTED" : live ? "TIMING" : "IDLE"}
        </span>
      </div>

      <p className={`value-display mt-3 text-[64px] font-bold leading-none ${live ? "phase-text" : "text-white"}`}>
        {seconds(ms)}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
        {live ? "elapsed since cue" : recovery.detected ? "cue → baseline cadence" : "awaiting episode"}
      </p>

      <dl className="mt-auto grid grid-cols-3 gap-3 pt-4">
        <Stat label="Pre cadence" value={recovery.pre_cadence ? `${recovery.pre_cadence.toFixed(0)}` : "—"} />
        <Stat label="Post cadence" value={recovery.post_cadence ? `${recovery.post_cadence.toFixed(0)}` : "—"} />
        <Stat label="Event" value={seconds(recovery.event_duration_ms)} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="value-display text-2xl font-semibold text-white">{value}</dd>
    </div>
  );
}
