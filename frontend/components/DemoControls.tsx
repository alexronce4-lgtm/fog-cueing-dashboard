"use client";

import { useEffect } from "react";
import type { Phase } from "@/types";

export default function DemoControls({
  phase,
  running,
  onStart,
  onTrigger,
  onReset,
}: {
  phase: Phase;
  running: boolean;
  onStart: () => void;
  onTrigger: () => void;
  onReset: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName)) return;
      if (e.key === "1") onStart();
      else if (e.key === "2" && !running) onTrigger();
      else if (e.key === "3") onReset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart, onTrigger, onReset, running]);

  const idle = phase === "IDLE";

  return (
    <div className="transport fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="hidden shrink-0 lg:block">
          <p className="label">Demo</p>
          <p className="value-display text-lg font-semibold text-white">CONTROLS</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">keys 1 · 2 · 3</p>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Btn keyLabel="1" title="Start demo" hint={idle ? "Begin simulated walking" : "Restart walking"} onClick={onStart} primary={idle} />
          <Btn
            keyLabel="2"
            title="Trigger freeze-like event"
            hint={running ? "Sequence running…" : "Runs the full loop automatically"}
            onClick={onTrigger}
            disabled={running}
            primary={!idle && !running}
          />
          <Btn keyLabel="3" title="Reset" hint="Clear session" onClick={onReset} />
        </div>
      </div>
    </div>
  );
}

function Btn({
  keyLabel,
  title,
  hint,
  onClick,
  primary,
  disabled,
}: {
  keyLabel: string;
  title: string;
  hint: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`transport-btn ${primary ? "primary" : ""}`}>
      <span className="key">{keyLabel}</span>
      <span className="min-w-0">
        <span className="value-display block truncate text-[17px] font-semibold leading-tight text-white">{title}</span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{hint}</span>
      </span>
      {primary && !disabled && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full phase-bg shadow-[0_0_10px_var(--phase)]" />}
    </button>
  );
}
