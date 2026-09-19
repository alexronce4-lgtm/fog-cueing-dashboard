"use client";

import type { Classification, RunPodResult } from "@/types";
import Gauge from "./Gauge";

function Tile({
  index,
  kicker,
  title,
  gaugeLabel,
  value,
  pending,
  meta,
  note,
  hot,
}: {
  index: string;
  kicker: string;
  title: string;
  gaugeLabel: string;
  value: number;
  pending?: boolean;
  meta: string;
  note: string;
  hot?: boolean;
}) {
  return (
    <section className={`card flex h-full flex-col p-5 ${hot ? "card-accent" : ""}`}>
      <p className="label">
        {index} · {kicker}
      </p>
      <h3 className="value-display text-2xl font-semibold text-white">{title}</h3>
      <div className="mt-3 flex flex-1 items-center gap-5">
        <Gauge value={value} pending={pending} label={gaugeLabel} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">{meta}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/55">{note}</p>
        </div>
      </div>
    </section>
  );
}

const fmt = (c: string) => c.replace("_", "-").toUpperCase();

export function EdgeTile({ edge }: { edge: Classification }) {
  return (
    <Tile
      index="02"
      kicker="Edge detector"
      title="LOCAL · LATENCY-FIRST"
      gaugeLabel={fmt(edge.classification)}
      value={edge.confidence}
      hot={edge.classification === "freeze_like"}
      meta={edge.latency_ms ? `${edge.latency_ms} ms on-device` : "on-device · owns cue"}
      note="Owns cue dispatch. Research score for a freeze-like gait pattern — never a medical confirmation."
    />
  );
}

export function RunPodTile({ runpod }: { runpod: RunPodResult }) {
  return (
    <Tile
      index="03"
      kicker="RunPod ML"
      title="CLOUD · VERIFICATION"
      gaugeLabel={runpod.status === "pending" ? "PENDING" : fmt(runpod.classification)}
      value={runpod.confidence}
      pending={runpod.status === "pending"}
      hot={runpod.classification === "freeze_like"}
      meta={`${runpod.model_version} · ${runpod.status}`}
      note="Secondary check only. Cannot pulse the motor; an outage never blocks local cueing."
    />
  );
}
