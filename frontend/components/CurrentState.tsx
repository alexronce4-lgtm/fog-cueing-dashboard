"use client";

import { PHASE_CAPTION, PHASE_LABEL, STORY } from "@/lib/format";
import type { Phase } from "@/types";

export default function CurrentState({ phase, storyStep }: { phase: Phase; storyStep: number }) {
  const label = PHASE_LABEL[phase];
  return (
    <section className="card card-accent relative flex h-full flex-col justify-between gap-6 overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--phase)" }}
      />
      <div className="relative">
        <p className="label flex items-center gap-2">
          <span className="live-dot" />
          Current state
        </p>
        <h2
          key={phase}
          className={`phase-text value-display rise mt-2 font-bold leading-[0.95] ${
            label.length > 9 ? "text-[56px] sm:text-[72px]" : "text-[72px] sm:text-[92px]"
          }`}
        >
          {label}
        </h2>
        <p key={`${phase}-cap`} className="rise mt-3 text-[16px] text-white/70">
          {PHASE_CAPTION[phase]}
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-[7px] right-[7px] top-[7px] h-px bg-white/12" />
        <div
          className="absolute left-[7px] top-[7px] h-px phase-bg transition-all duration-500"
          style={{ width: `calc(${(storyStep / (STORY.length - 1)) * 100}% - 14px)` }}
        />
        <ol className="relative grid grid-cols-8 gap-1">
          {STORY.map((step, i) => (
            <li key={step} className={`loop-node ${i < storyStep ? "done" : ""} ${i === storyStep ? "active" : ""}`}>
              <span className="dot" />
              <span className="text-center text-[9.5px] leading-tight tracking-[0.12em]">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
