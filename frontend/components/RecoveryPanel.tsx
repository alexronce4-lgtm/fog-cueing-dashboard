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
    <section className="panel flex h-full flex-col p-5">
      <p className="kicker">04 · Recovery</p>
      <h3 className="font-display text-2xl font-semibold tracking-wide text-white">MEASURE</h3>
      <p className="mt-4 font-display text-6xl font-bold leading-none text-white">{seconds(ms)}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
        {live ? "Elapsed since cue" : "Recovery time"}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Detected</dt>
          <dd className="font-display text-xl text-white">{recovery.detected ? "YES" : "NO"}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Event</dt>
          <dd className="font-display text-xl text-white">{seconds(recovery.event_duration_ms)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Pre cadence</dt>
          <dd className="font-display text-xl text-white">
            {recovery.pre_cadence ? `${recovery.pre_cadence.toFixed(0)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Post cadence</dt>
          <dd className="font-display text-xl text-white">
            {recovery.post_cadence ? `${recovery.post_cadence.toFixed(0)}` : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
