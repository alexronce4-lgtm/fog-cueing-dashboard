"use client";

import { useState } from "react";
import type { CueInfo, CueParams, GrokAnalysis, Phase } from "@/types";
import AnalysisModal from "./AnalysisModal";

export default function AdaptiveResult({
  analysis,
  phase,
  cue,
  onArm,
}: {
  analysis: GrokAnalysis | null;
  phase: Phase;
  cue: CueInfo;
  onArm: (cue: CueParams) => void;
}) {
  const [open, setOpen] = useState(false);
  const analyzing = phase === "ANALYZING";

  if (!analysis && !analyzing) {
    return (
      <section className="card flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="label">Adaptive result</p>
          <p className="mt-1 text-[15px] text-white/60">Appears after the first freeze-like episode is analysed.</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Grok · idle</span>
      </section>
    );
  }

  return (
    <section className={`card flex h-full flex-col p-5 ${analyzing ? "card-accent" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">Adaptive result</p>
          <h3 className="value-display text-2xl font-semibold text-white">GROK ANALYSIS</h3>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
          {analyzing ? "analysing…" : analysis?.mock ? "mock" : "live"}
        </span>
      </div>

      {analyzing && !analysis ? (
        <div className="mt-6 flex flex-1 items-center gap-3 text-white/60">
          <span className="live-dot" />
          <p className="text-[15px]">Summarising evidence from the episode log…</p>
        </div>
      ) : analysis ? (
        <div key={analysis.summary + analysis.observation} className="rise mt-4 flex flex-1 flex-col gap-4">
          <Row label="Observed" text={analysis.observation} />
          <Row label="Evidence" text={analysis.evidence} />
          <div
            className="rounded-xl border p-4"
            style={{ background: "rgb(var(--phase-rgb) / 0.08)", borderColor: "rgb(var(--phase-rgb) / 0.4)" }}
          >
            <p className="label">Next experiment</p>
            <p className="mt-1 text-[18px] font-medium leading-snug text-white">{analysis.next_experiment}</p>
          </div>
          <Row label="Confidence" text={analysis.confidence_statement} />

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:border-white/40"
            >
              View full analysis
            </button>
            {analysis.recommended_cue && analysis.recommended_cue.bpm !== cue.bpm && (
              <button
                type="button"
                onClick={() => onArm(analysis.recommended_cue!)}
                className="rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-black phase-bg"
              >
                Arm {analysis.recommended_cue.bpm} BPM for next trial
              </button>
            )}
            {analysis.recommended_cue && analysis.recommended_cue.bpm === cue.bpm && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                next cue armed locally · {cue.bpm} BPM
              </span>
            )}
          </div>
        </div>
      ) : null}

      {open && analysis && <AnalysisModal analysis={analysis} onClose={() => setOpen(false)} />}
    </section>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-white/80">{text}</p>
    </div>
  );
}
