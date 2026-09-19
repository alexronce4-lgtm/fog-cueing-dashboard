"use client";

import type { ConnectionStatus } from "@/types";

function Pill({
  name,
  value,
  ok,
}: {
  name: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-signal-lime" : "bg-signal-amber"} shadow-[0_0_8px_currentColor]`} />
      <span className="font-mono text-[10px] tracking-[0.2em] text-white/40">{name}</span>
      <span className="font-display text-sm font-semibold tracking-wider text-white">{value}</span>
    </div>
  );
}

export default function ConnectionPills({
  connections,
  wsOk,
}: {
  connections: ConnectionStatus;
  wsOk: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Pill name="STREAM" value={wsOk ? "LIVE" : "RECONNECT"} ok={wsOk} />
      <Pill name="ESP32" value={connections.esp32} ok={connections.esp32 === "CONNECTED"} />
      <Pill name="RUNPOD" value={connections.runpod} ok={connections.runpod === "ONLINE"} />
      <Pill name="GROK" value={connections.grok} ok={connections.grok === "ONLINE"} />
    </div>
  );
}
