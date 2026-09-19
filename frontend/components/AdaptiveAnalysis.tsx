"use client";

import { useState } from "react";
import type { CueParams, GrokAnalysis } from "@/types";
import AnalysisModal from "./AnalysisModal";

export default function AdaptiveAnalysis({
  analysis,
  pending,
  onArm,
}: {
  analysis: GrokAnalysis | null;
  pending?: CueParams | null;
  onArm: (bpm: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="panel flex h-full flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="kicker">05 · Adaptive analysis</p>
          <h3 className="font-display text-2xl font-semibold tracking-wide text-white">GROK</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
          {analysis?.mock === false ? "live" : "mock ok"}
        </span>
      </div>

      {!analysis ? (
        <p className="text-sm text-white/45">
          No analysis yet. Simulate a recovery or press Run Analysis. Recommendations stay inside allowed_next_cues.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <Block label="Observation" text={analysis.observation} />
          <Block label="Evidence" text={analysis.evidence} />
          <Block label="Next experiment" text={analysis.next_experiment} accent />
          <Block label="Confidence" text={analysis.confidence_statement} />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-white/15 px-3 py-1.5 font-display text-sm tracking-wide text-white hover:border-white/40"
            >
              View full analysis
            </button>
            {analysis.recommended_cue && (
              <button
                type="button"
                onClick={() => onArm(analysis.recommended_cue!.bpm)}
                className="rounded-lg px-3 py-1.5 font-display text-sm tracking-wide text-ink-950"
                style={{ background: "var(--phase)" }}
              >
                Arm {analysis.recommended_cue.bpm} BPM locally
              </button>
            )}
          </div>
          {pending && (
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              Next cue armed: {pending.pattern} {pending.bpm} BPM (local only)
            </p>
          )}
        </div>
      )}

      {open && analysis && <AnalysisModal analysis={analysis} onClose={() => setOpen(false)} />}
    </section>
  );
}

function Block({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div>
      <p className="kicker">{label}</p>
      <p className={accent ? "text-white" : "text-white/70"}>{text}</p>
    </div>
  );
}
