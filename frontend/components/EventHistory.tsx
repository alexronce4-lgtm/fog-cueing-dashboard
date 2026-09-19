"use client";

import { pct, seconds } from "@/lib/format";
import type { EventRecord } from "@/types";

export default function EventHistory({ events, highlight }: { events: EventRecord[]; highlight: string | null }) {
  const rows = [...events].reverse().slice(0, 5);
  if (rows.length === 0) return null;

  return (
    <section className="card px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="label">Event history · last {rows.length}</p>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{events.length} total</span>
      </div>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="label">
            <th className="pb-1 font-normal">Event</th>
            <th className="pb-1 font-normal">Edge</th>
            <th className="pb-1 font-normal">RunPod</th>
            <th className="pb-1 font-normal">Cue</th>
            <th className="pb-1 font-normal">Recovery</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const isNew = e.episode_id === highlight;
            return (
              <tr
                key={e.episode_id}
                className={`border-t border-white/[0.07] ${isNew ? "rise" : ""}`}
                style={isNew ? { background: "rgb(var(--phase-rgb) / 0.07)" } : undefined}
              >
                <td className="value-display py-1.5 text-lg font-semibold text-white">{e.episode_id}</td>
                <td className="value-display py-1.5 text-base text-white">{pct(e.edge.confidence)}</td>
                <td className="value-display py-1.5 text-base text-white">{pct(e.runpod.confidence)}</td>
                <td className="value-display py-1.5 text-base text-white">
                  {e.cue.bpm}
                  <span className="ml-1 font-mono text-[9px] text-white/40">BPM</span>
                </td>
                <td className="value-display py-1.5 text-base text-white">{seconds(e.recovery.time_ms)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
