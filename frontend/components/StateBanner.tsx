"use client";

import type { StatePayload } from "@/types";

export default function StateBanner({ state }: { state: StatePayload }) {
  return (
    <section className="panel banner-scan relative isolate px-5 py-5 sm:px-8 sm:py-6">
      <div
        className="pointer-events-none absolute -left-10 top-0 h-full w-40 opacity-40 blur-2xl"
        style={{ background: "var(--phase)" }}
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="kicker flex items-center gap-2">
              <span className="live-dot" />
              Intervention loop · {state.loop_step}
            </p>
            <h2
              className="font-display text-5xl font-bold leading-none tracking-[0.12em] sm:text-7xl"
              style={{ color: "var(--phase)", textShadow: "0 0 28px color-mix(in srgb, var(--phase) 55%, transparent)" }}
            >
              {state.label}
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/60 lg:text-right">
            Local/edge cueing. Grok and RunPod never command the vibration motor.
          </p>
        </div>
        <ol className="flex flex-wrap gap-2">
          {state.loop.map((step) => {
            const active =
              state.loop_step === step ||
              (state.loop_step.includes("ANALYZE") && (step === "ANALYZE" || step === "ADAPT"));
            return (
              <li key={step} className={`loop-chip ${active ? "active" : ""}`}>
                {step}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
