"use client";

import { useState } from "react";
import type { CueParams, GrokAnalysis } from "@/types";
import AnalysisModal from "./AnalysisModal";

export default function AdaptiveAnalysis({
  analysis,
  pending,
  analyzing,
  onArm,
}: {
  analysis: GrokAnalysis | null;
  pending?: CueParams | null;
  analyzing: boolean;
  onArm: (bpm: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`card flex h-full flex-col p-5 ${analyzing ? "card-accent" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">06 · Adaptive analysis</p>
          <h3 className="value-display text-2xl font-semibold text-white">GROK · OBSERVATIONAL</h3>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          {analyzing ? "analyzing…" : analysis ? (analysis.mock ? "mock" : "live") : "idle"}
        </span>
      </div>

      {!analysis ? (
        <div className="mt-6 flex flex-1 flex-col items-start justify-center gap-2 text-white/50">
          <p className="text-[15px]">No analysis yet.</p>
          <p className="text-[13px] leading-relaxed">
            Simulate a recovery or press <span className="font-mono text-white/70">5</span>. Recommendations are limited to allowed_next_cues.
          </p>
        </div>
      ) : (
        <div key={analysis.summary + analysis.observation} className="rise mt-4 flex flex-1 flex-col gap-4">
          <div
            className="rounded-xl border p-4"
            style={{ background: "rgb(var(--phase-rgb) / 0.08)", borderColor: "rgb(var(--phase-rgb) / 0.4)" }}
          >
            <p className="label">Next experiment</p>
            <p className="mt-1 text-[17px] font-medium leading-snug text-white">{analysis.next_experiment}</p>
          </div>
          <Row label="Observation" text={analysis.observation} />
          <div className="grid grid-cols-2 gap-4">
            <Row label="Evidence" text={analysis.evidence} />
            <Row label="Confidence" text={analysis.confidence_statement} />
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:border-white/40"
            >
              View full analysis
            </button>
            {analysis.recommended_cue && (
              <button
                type="button"
                onClick={() => onArm(analysis.recommended_cue!.bpm)}
                className="rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-black phase-bg"
              >
                Arm {analysis.recommended_cue.bpm} BPM locally
              </button>
            )}
            {pending && (
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                armed · {pending.pattern} {pending.bpm} BPM
              </span>
            )}
          </div>
        </div>
      )}

      {open && analysis && <AnalysisModal analysis={analysis} onClose={() => setOpen(false)} />}
    </section>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-white/75">{text}</p>
    </div>
  );
}
