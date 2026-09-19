"use client";

import type { CueInfo } from "@/types";

export default function HapticIntervention({ cue }: { cue: CueInfo }) {
  const ms = Math.round(60000 / Math.max(40, cue.bpm));
  const style = { ["--pulse-ms" as string]: `${ms}ms` } as React.CSSProperties;

  return (
    <section className={`card flex h-full flex-col p-5 ${cue.active ? "card-accent" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label">04 · Haptic intervention</p>
          <h3 className="value-display text-2xl font-semibold text-white">CUE · {cue.pattern.toUpperCase()}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-[11px] tracking-[0.22em] ${
            cue.active ? "phase-bg text-black" : "bg-white/5 text-white/45"
          }`}
        >
          {cue.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div className="mt-3 flex flex-1 items-center gap-5">
        <div className="relative h-[132px] w-[132px] shrink-0" style={style}>
          {cue.active && (
            <>
              <span className="ring absolute inset-4 rounded-full" />
              <span className="ring absolute inset-4 rounded-full" style={{ animationDelay: `${ms / 2}ms` }} />
            </>
          )}
          <div
            className={`absolute inset-6 flex flex-col items-center justify-center rounded-full border ${
              cue.active ? "core-beat phase-border" : "border-white/15"
            }`}
            style={cue.active ? { boxShadow: "0 0 30px rgb(var(--phase-rgb) / 0.5)" } : undefined}
          >
            <span className="value-display text-4xl font-bold leading-none text-white">{cue.bpm}</span>
            <span className="font-mono text-[10px] tracking-[0.22em] text-white/45">BPM</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
            {cue.active ? `pulse every ${ms} ms` : "armed · standby"}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/55">
            Tempo chosen locally from allowed_next_cues. Grok may suggest the next experiment; it never drives the motor.
          </p>
        </div>
      </div>
    </section>
  );
}
