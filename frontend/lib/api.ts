import type { FogEvent, SessionConfig, StatusResponse } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export function wsUrl(): string {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/ws/stream`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export interface ConfigUpdate {
  freeze_threshold?: number;
  power_threshold?: number;
  auto_cue?: boolean;
  mode?: string;
  bpm?: number;
}

export const api = {
  status: () => request<StatusResponse>("/api/status"),
  events: () => request<FogEvent[]>("/api/events"),
  updateConfig: (update: ConfigUpdate) =>
    request<SessionConfig>("/api/config", {
      method: "POST",
      body: JSON.stringify(update),
    }),
  manualCue: (active: boolean) =>
    request<StatusResponse>("/api/cue/manual", {
      method: "POST",
      body: JSON.stringify({ active }),
    }),
  autoCue: () =>
    request<StatusResponse>("/api/cue/auto", { method: "POST" }),
};
