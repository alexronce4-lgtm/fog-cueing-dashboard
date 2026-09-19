"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SessionConfig } from "@/lib/types";

interface ConfigPanelProps {
  config: SessionConfig;
}

export function ConfigPanel({ config }: ConfigPanelProps) {
  const [threshold, setThreshold] = useState(config.detector.freeze_threshold);
  const [bpm, setBpm] = useState(config.cue.bpm);
  const [autoCue, setAutoCue] = useState(config.cue.auto_cue);
  const [mode, setMode] = useState(config.cue.mode);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setThreshold(config.detector.freeze_threshold);
    setBpm(config.cue.bpm);
    setAutoCue(config.cue.auto_cue);
    setMode(config.cue.mode);
  }, [config, dirty]);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const apply = async () => {
    await api.updateConfig({
      freeze_threshold: threshold,
      bpm,
      auto_cue: autoCue,
      mode,
    });
    setDirty(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-panel/70 p-5 shadow-xl">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Configuration
      </h2>

      <div className="space-y-5 text-sm">
        <div>
          <div className="mb-1 flex justify-between text-slate-300">
            <label htmlFor="threshold">Freeze threshold</label>
            <span className="font-mono text-slate-100">{threshold.toFixed(1)}</span>
          </div>
          <input
            id="threshold"
            type="range"
            min={0.5}
            max={6}
            step={0.1}
            value={threshold}
            onChange={(e) => mark(setThreshold)(parseFloat(e.target.value))}
            className="w-full accent-sky-400"
          />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-slate-300">
            <label htmlFor="bpm">Cue tempo</label>
            <span className="font-mono text-slate-100">{bpm} BPM</span>
          </div>
          <input
            id="bpm"
            type="range"
            min={40}
            max={180}
            step={1}
            value={bpm}
            onChange={(e) => mark(setBpm)(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-400"
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="mode" className="text-slate-300">
            Cue modality
          </label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => mark(setMode)(e.target.value as SessionConfig["cue"]["mode"])}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
          >
            <option value="auditory">Auditory</option>
            <option value="haptic">Haptic</option>
            <option value="visual">Visual</option>
          </select>
        </div>

        <label className="flex items-center justify-between text-slate-300">
          Auto-cue on freeze
          <input
            type="checkbox"
            checked={autoCue}
            onChange={(e) => mark(setAutoCue)(e.target.checked)}
            className="h-4 w-4 accent-sky-400"
          />
        </label>

        <button
          onClick={apply}
          disabled={!dirty}
          className="w-full rounded-lg bg-sky-500 px-3 py-2 font-medium text-sky-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {dirty ? "Apply changes" : "Saved"}
        </button>
      </div>
    </div>
  );
}
