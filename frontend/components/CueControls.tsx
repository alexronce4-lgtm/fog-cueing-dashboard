"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CueState } from "@/lib/types";

interface CueControlsProps {
  cue: CueState;
}

/**
 * Renders a metronome-style beep in time with the cue tempo whenever the
 * backend reports an active cue and the operator has enabled sound.
 */
function useCueBeep(active: boolean, bpm: number, soundOn: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!active || !soundOn) return;

    const beep = () => {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!ctxRef.current) ctxRef.current = new AudioCtx();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    };

    beep();
    timerRef.current = setInterval(beep, (60 / bpm) * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, bpm, soundOn]);
}

export function CueControls({ cue }: CueControlsProps) {
  const [soundOn, setSoundOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useCueBeep(cue.active, cue.bpm, soundOn);

  const send = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-panel/70 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Cueing
        </h2>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase text-slate-400">
          {cue.source}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 text-center text-xs font-semibold uppercase tracking-wide ${
            cue.active
              ? "animate-pulseCue border-emerald-400 bg-emerald-400/20 text-emerald-200"
              : "border-slate-700 bg-slate-800/40 text-slate-500"
          }`}
        >
          {cue.active ? `${cue.mode}` : "idle"}
        </div>
        <div className="text-sm text-slate-300">
          <p>
            Cue is{" "}
            <span className={cue.active ? "font-semibold text-emerald-300" : "text-slate-400"}>
              {cue.active ? "ACTIVE" : "off"}
            </span>
          </p>
          <p className="text-slate-500">{cue.bpm} BPM · {cue.mode}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          disabled={busy}
          onClick={() => send(() => api.manualCue(true))}
          className="rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          Force on
        </button>
        <button
          disabled={busy}
          onClick={() => send(() => api.manualCue(false))}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-600 disabled:opacity-50"
        >
          Force off
        </button>
        <button
          disabled={busy}
          onClick={() => send(() => api.autoCue())}
          className="rounded-lg bg-sky-500/90 px-3 py-2 text-sm font-medium text-sky-950 transition hover:bg-sky-400 disabled:opacity-50"
        >
          Auto
        </button>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={soundOn}
          onChange={(e) => setSoundOn(e.target.checked)}
          className="h-4 w-4 accent-emerald-400"
        />
        Play audible cue in browser
      </label>
    </div>
  );
}
