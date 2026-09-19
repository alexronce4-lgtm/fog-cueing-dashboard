"use client";

import { pct, seconds } from "@/lib/format";
import type { DemoState } from "@/types";
import Gauge from "./Gauge";

export default function ResponsePanel({ state }: { state: DemoState }) {
  const { phase, edge, runpod, cue, recovery, lastEpisodeId } = state;
  const live = phase === "RECOVERY_MONITORING";
  const recoveryMs = live ? recovery.elapsed_ms : recovery.time_ms;
  const pulseMs = Math.round(60000 / Math.max(40, cue.bpm));
  const focus =
    phase === "POSSIBLE_FREEZE" ? "edge"
    : phase === "DETECTED" ? "runpod"
    : phase === "CUE_TRIGGERED" ? "cue"
    : phase === "RECOVERY_MONITORING" ? "recovery"
    : null;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label">Response</p>
          <h3 className="value-display text-2xl font-semibold text-white">DETECT · CUE · RECOVER</h3>
        </div>
        {lastEpisodeId && phase !== "POSSIBLE_FREEZE" && (
          <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
            episode {lastEpisodeId}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric title="Edge" focus={focus === "edge"} sub={edge.classification.replace("_", "-").toUpperCase()}>
          <Gauge value={edge.confidence} size={104} label="" />
        </Metric>

        <Metric
          title="RunPod"
          focus={focus === "runpod"}
          sub={runpod.status === "pending" ? "VERIFYING…" : runpod.status === "idle" ? "IDLE" : runpod.classification.replace("_", "-").toUpperCase()}
        >
          <Gauge value={runpod.confidence} size={104} pending={runpod.status === "pending"} label="" />
        </Metric>

        <Metric title="Haptic cue" focus={focus === "cue"} sub={cue.active ? "ACTIVE" : "INACTIVE"} subHot={cue.active}>
          <div className="relative h-[104px] w-[104px]" style={{ ["--pulse-ms" as string]: `${pulseMs}ms` } as React.CSSProperties}>
            {cue.active && (
              <>
                <span className="ring absolute inset-3 rounded-full" />
                <span className="ring absolute inset-3 rounded-full" style={{ animationDelay: `${pulseMs / 2}ms` }} />
              </>
            )}
            <div
              className={`absolute inset-4 flex flex-col items-center justify-center rounded-full border ${
                cue.active ? "core-beat phase-border" : "border-white/15"
              }`}
              style={cue.active ? { boxShadow: "0 0 26px rgb(var(--phase-rgb) / 0.5)" } : undefined}
            >
              <span className="value-display text-3xl font-bold leading-none text-white">{cue.bpm}</span>
              <span className="font-mono text-[9px] tracking-[0.2em] text-white/45">BPM</span>
            </div>
          </div>
        </Metric>

        <Metric title="Recovery" focus={focus === "recovery"} sub={recovery.detected ? "DETECTED" : live ? "TIMING" : "—"} subHot={recovery.detected}>
          <div className="flex h-[104px] flex-col items-center justify-center">
            <span className={`value-display text-[40px] font-bold leading-none ${live ? "phase-text" : "text-white"}`}>
              {recoveryMs == null ? "0.00 s" : seconds(recoveryMs)}
            </span>
          </div>
        </Metric>
      </div>
    </section>
  );
}

function Metric({
  title,
  sub,
  subHot,
  focus,
  children,
}: {
  title: string;
  sub: string;
  subHot?: boolean;
  focus: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border p-3 transition ${
        focus ? "border-[rgb(var(--phase-rgb)/0.5)] bg-[rgb(var(--phase-rgb)/0.08)]" : "border-white/[0.07] bg-white/[0.02]"
      }`}
    >
      <p className="label self-start">{title}</p>
      <div className="my-1">{children}</div>
      <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${subHot ? "phase-text" : "text-white/55"}`}>{sub}</p>
    </div>
  );
}

export { pct };
