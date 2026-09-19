"use client";

import { clock, pct, seconds } from "@/lib/format";
import type { EventRecord } from "@/types";

export default function RecentEvents({ events }: { events: EventRecord[] }) {
  const rows = [...events].reverse();
  return (
    <section className="panel p-5">
      <p className="kicker">06 · Recent events</p>
      <h3 className="mb-3 font-display text-2xl font-semibold tracking-wide text-white">
        EPISODE LOG
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
              <th className="pb-2 pr-3 font-medium">Event</th>
              <th className="pb-2 pr-3 font-medium">Time</th>
              <th className="pb-2 pr-3 font-medium">Edge</th>
              <th className="pb-2 pr-3 font-medium">RunPod</th>
              <th className="pb-2 pr-3 font-medium">Cue BPM</th>
              <th className="pb-2 pr-3 font-medium">Recovery</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.episode_id} className="border-t border-white/10 text-white/80">
                <td className="py-2.5 pr-3 font-display text-lg text-white">{e.episode_id}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{clock(e.timestamp_iso)}</td>
                <td className="py-2.5 pr-3 font-mono">{pct(e.edge.confidence)}</td>
                <td className="py-2.5 pr-3 font-mono">{pct(e.runpod.confidence)}</td>
                <td className="py-2.5 pr-3 font-display text-lg">{e.cue.bpm}</td>
                <td className="py-2.5 pr-3 font-mono">{seconds(e.recovery.time_ms)}</td>
                <td className="py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-signal-lime">
                  {e.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
