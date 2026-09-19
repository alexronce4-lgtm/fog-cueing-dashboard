"use client";

import type { FogEvent } from "@/lib/types";

interface EventLogProps {
  events: FogEvent[];
  total: number;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EventLog({ events, total }: EventLogProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel/70 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Freeze events
        </h2>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
          {total} total
        </span>
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No freezing episodes detected yet.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Episode #{event.id}
                  {event.ended_at === null && (
                    <span className="ml-2 animate-pulse text-xs text-red-400">ongoing</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{formatTime(event.started_at)}</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono text-slate-300">
                  FI {event.peak_freeze_index.toFixed(1)}
                </p>
                <p className="text-slate-500">
                  {event.duration_s !== null ? `${event.duration_s.toFixed(1)}s` : "—"}
                  {event.cued && <span className="ml-1 text-emerald-400">· cued</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
