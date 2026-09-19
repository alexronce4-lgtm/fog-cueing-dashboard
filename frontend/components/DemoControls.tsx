"use client";

import { api } from "@/lib/api";

const ACTIONS = [
  { id: "walk", label: "START WALKING", hint: "Return to locomotion capture", fn: () => api.startWalking() },
  { id: "freeze", label: "SIMULATE FREEZE-LIKE EVENT", hint: "Edge detect → RunPod verify → local cue", fn: () => api.simulateFreeze() },
  { id: "cue", label: "TRIGGER CUE", hint: "Edge/operator dispatch only", fn: () => api.triggerCue() },
  { id: "rec", label: "SIMULATE RECOVERY", hint: "Timer stop → log → Grok adapt", fn: () => api.simulateRecovery() },
  { id: "an", label: "RUN ANALYSIS", hint: "Evidence-first, allowed cues only", fn: () => api.runAnalysis() },
  { id: "reset", label: "RESET SESSION", hint: "Restore seeded E1–E3 demo", fn: () => api.reset() },
] as const;

export default function DemoControls({
  busy,
  run,
}: {
  busy: string | null;
  run: (label: string, fn: () => Promise<unknown>) => void;
}) {
  return (
    <section className="panel flex h-full flex-col p-5">
      <p className="kicker">Demo controls</p>
      <h3 className="font-display text-2xl font-semibold tracking-wide text-white">JUDGE SEQUENCE</h3>
      <p className="mt-1 mb-4 text-sm text-white/50">
        Walk the loop in 5–10 seconds. Freeze-like language only — no medical claims.
      </p>
      <div className="flex flex-1 flex-col gap-2">
        {ACTIONS.map((a, i) => (
          <button
            key={a.id}
            type="button"
            disabled={busy !== null}
            onClick={() => run(a.id, a.fn)}
            className="group flex items-center justify-between rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2.5 text-left transition hover:border-white/25 hover:bg-ink-700"
          >
            <span>
              <span className="block font-display text-lg font-semibold tracking-[0.08em] text-white">
                {String(i + 1).padStart(2, "0")}  {a.label}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                {a.hint}
              </span>
            </span>
            <span
              className="h-2 w-2 rounded-full bg-white/20 group-hover:bg-white"
              style={{ background: busy === a.id ? "var(--phase)" : undefined }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
