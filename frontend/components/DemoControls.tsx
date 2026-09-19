"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import type { Phase } from "@/types";

export const DEMO_ACTIONS = [
  { id: "walk", key: "1", label: "Start walking", hint: "Locomotion capture", fn: () => api.startWalking() },
  { id: "freeze", key: "2", label: "Simulate freeze-like event", hint: "Edge detect → verify → local cue", fn: () => api.simulateFreeze() },
  { id: "cue", key: "3", label: "Trigger cue", hint: "Edge / operator only", fn: () => api.triggerCue() },
  { id: "rec", key: "4", label: "Simulate recovery", hint: "Stop timer → log → analyze", fn: () => api.simulateRecovery() },
  { id: "an", key: "5", label: "Run analysis", hint: "Evidence-first Grok", fn: () => api.runAnalysis() },
  { id: "reset", key: "6", label: "Reset session", hint: "Restore E1–E3", fn: () => api.reset() },
] as const;

function suggested(phase: Phase): string {
  switch (phase) {
    case "WALKING":
      return "freeze";
    case "POSSIBLE_FREEZE":
      return "cue";
    case "CUE_TRIGGERED":
    case "RECOVERY_MONITORING":
      return "rec";
    case "RECOVERED":
      return "an";
    default:
      return "walk";
  }
}

export default function DemoControls({
  busy,
  phase,
  run,
}: {
  busy: string | null;
  phase: Phase;
  run: (label: string, fn: () => Promise<unknown>) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const action = DEMO_ACTIONS.find((a) => a.key === e.key);
      if (action && busy === null) run(action.id, action.fn);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, run]);

  const next = suggested(phase);

  return (
    <div className="transport fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="hidden shrink-0 lg:block">
          <p className="label">Demo controls</p>
          <p className="value-display text-lg font-semibold text-white">JUDGE SEQUENCE</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">keys 1–6</p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {DEMO_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy !== null}
              onClick={() => run(a.id, a.fn)}
              className={`transport-btn ${a.id === next ? "primary" : ""}`}
            >
              <span className="key">{a.key}</span>
              <span className="min-w-0">
                <span className="value-display block truncate text-[15px] font-semibold leading-tight text-white">
                  {a.label}
                </span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                  {busy === a.id ? "running…" : a.hint}
                </span>
              </span>
              {a.id === next && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full phase-bg shadow-[0_0_10px_var(--phase)]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
