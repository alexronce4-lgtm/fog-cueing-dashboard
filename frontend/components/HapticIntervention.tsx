"use client";

import type { CueInfo } from "@/types";

export default function HapticIntervention({ cue }: { cue: CueInfo }) {
  const ms = Math.round(60000 / Math.max(40, cue.bpm));
  return (
    <section className="panel flex h-full flex-col p-5">
      <p className="kicker">03 · Haptic intervention</p>
      <h3 className="font-display text-2xl font-semibold tracking-wide text-white">CUE</h3>
      <div className="mt-3 flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 font-mono text-[11px] tracking-[0.2em] ${
            cue.active
              ? "bg-rose-500/20 text-rose-200"
              : "bg-white/5 text-white/45"
          }`}
        >
          {cue.active ? "ACTIVE" : "INACTIVE"}
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/40">
          {cue.pattern}
        </span>
      </div>

      <div className="relative mx-auto mt-6 h-36 w-36">
        <div
          className="absolute inset-0 rounded-full border border-white/10"
          style={{ boxShadow: cue.active ? "0 0 30px color-mix(in srgb, var(--phase) 45%, transparent)" : undefined }}
        />
        {cue.active && (
          <>
            <div
              className="haptic-ring absolute inset-3 rounded-full border-2"
              style={{ borderColor: "var(--phase)", animationDelay: "0ms", ["--pulse-ms" as string]: `${ms}ms` }}
            />
            <div
              className="haptic-ring absolute inset-3 rounded-full border-2"
              style={{
                borderColor: "var(--phase)",
                animationDelay: `${Math.round(ms / 3)}ms`,
                ["--pulse-ms" as string]: `${ms}ms`,
              }}
            />
          </>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold text-white">{cue.bpm}</span>
          <span className="font-mono text-[10px] tracking-[0.22em] text-white/40">BPM</span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-white/45">
        Tempo armed locally from allowed_next_cues. Grok may recommend a next experiment;
        it does not pulse the motor.
      </p>
    </section>
  );
}
