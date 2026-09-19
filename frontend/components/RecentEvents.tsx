"use client";

import { clock, pct, seconds } from "@/lib/format";
import type { EventRecord } from "@/types";

export default function RecentEvents({ events }: { events: EventRecord[] }) {
  const rows = [...events].reverse();
  const newest = rows[0]?.episode_id;

  return (
    <section className="card flex h-full flex-col p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label">07 · Recent events</p>
          <h3 className="value-display text-2xl font-semibold text-white">EPISODE LOG</h3>
        </div>
        <span className="value-display text-2xl font-semibold text-white/60">
          {events.length}
          <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">episodes</span>
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="label">
              <th className="pb-2 pr-3 font-normal">Event</th>
              <th className="pb-2 pr-3 font-normal">Time</th>
              <th className="pb-2 pr-3 font-normal">Edge</th>
              <th className="pb-2 pr-3 font-normal">RunPod</th>
              <th className="pb-2 pr-3 font-normal">Cue</th>
              <th className="pb-2 pr-3 font-normal">Recovery</th>
              <th className="pb-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const isNew = e.episode_id === newest && events.length > 3;
              return (
                <tr
                  key={e.episode_id}
                  className={`border-t border-white/[0.07] ${isNew ? "rise" : ""}`}
                  style={isNew ? { background: "rgb(var(--phase-rgb) / 0.07)" } : undefined}
                >
                  <td className="value-display py-3 pr-3 text-xl font-semibold text-white">{e.episode_id}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-white/60">{clock(e.timestamp_iso)}</td>
                  <td className="value-display py-3 pr-3 text-lg text-white">{pct(e.edge.confidence)}</td>
                  <td className="value-display py-3 pr-3 text-lg text-white">{pct(e.runpod.confidence)}</td>
                  <td className="value-display py-3 pr-3 text-lg text-white">
                    {e.cue.bpm}
                    <span className="ml-1 font-mono text-[10px] text-white/40">BPM</span>
                  </td>
                  <td className="value-display py-3 pr-3 text-lg text-white">{seconds(e.recovery.time_ms)}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-signal-lime/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-signal-lime">
                      {e.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
