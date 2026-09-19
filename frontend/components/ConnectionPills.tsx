"use client";

import type { Connections } from "@/types";

function Pill({ name, value, ok }: { name: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-signal-lime shadow-[0_0_8px_#b6ff4a]" : "bg-signal-amber shadow-[0_0_8px_#ffb020]"}`} />
      <span className="font-mono text-[10px] tracking-[0.22em] text-white/45">{name}</span>
      <span className="value-display text-sm font-semibold tracking-wider text-white">{value}</span>
    </div>
  );
}

export default function ConnectionPills({ connections }: { connections: Connections }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Pill name="STREAM" value={connections.stream} ok={connections.stream === "LIVE"} />
      <Pill name="ESP32" value={connections.esp32} ok={connections.esp32 === "LIVE"} />
      <Pill name="RUNPOD" value={connections.runpod} ok={connections.runpod === "ONLINE"} />
      <Pill name="GROK" value={connections.grok} ok={connections.grok === "ONLINE"} />
    </div>
  );
}
