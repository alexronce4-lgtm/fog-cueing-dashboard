"use client";

import { CueControls } from "@/components/CueControls";
import { ConfigPanel } from "@/components/ConfigPanel";
import { EventLog } from "@/components/EventLog";
import { FogStatusCard } from "@/components/FogStatusCard";
import { GaitChart } from "@/components/GaitChart";
import { useSession } from "@/lib/useSession";

const CONNECTION_LABEL = {
  connecting: { text: "Connecting…", dot: "bg-amber-400" },
  open: { text: "Live", dot: "bg-emerald-400" },
  closed: { text: "Disconnected", dot: "bg-red-400" },
} as const;

export default function Dashboard() {
  const { status, trace, events, connection } = useSession();
  const conn = CONNECTION_LABEL[connection];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            HackMIT 2026
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">FoG Cueing Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Wearable freezing-of-gait detection with adaptive rhythmic cueing. Streaming a
            simulated lower-limb IMU through a real-time freeze-index detector.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-panel/70 px-3 py-1.5 text-xs text-slate-300">
          <span className={`h-2 w-2 rounded-full ${conn.dot} ${connection === "open" ? "animate-pulse" : ""}`} />
          {conn.text}
        </span>
      </header>

      {!status ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-panel/50 text-slate-400">
          Waiting for telemetry from the backend…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <GaitChart trace={trace} state={status.state} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FogStatusCard
                state={status.state}
                freezeIndex={status.freeze_index}
                power={status.power}
                threshold={status.config.detector.freeze_threshold}
              />
              <CueControls cue={status.cue} />
            </div>
            <EventLog events={events} total={status.total_events} />
          </div>
          <div className="space-y-5">
            <ConfigPanel config={status.config} />
          </div>
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-slate-600">
        Simulated data for demonstration only — not a medical device.
      </footer>
    </main>
  );
}
