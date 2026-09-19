const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request("/") ,
  session: () => request("/api/session/current"),
  events: () => request("/api/events"),
  startWalking: () => request("/api/demo/start-walking", { method: "POST" }),
  simulateFreeze: () => request("/api/demo/simulate-freeze", { method: "POST" }),
  triggerCue: () => request("/api/demo/trigger-cue", { method: "POST" }),
  simulateRecovery: () => request("/api/demo/simulate-recovery", { method: "POST" }),
  runAnalysis: () => request("/api/demo/run-analysis", { method: "POST" }),
  reset: () => request("/api/demo/reset", { method: "POST" }),
  armCue: (bpm: number, pattern = "rhythmic") =>
    request("/api/demo/arm-cue", {
      method: "POST",
      body: JSON.stringify({ pattern, bpm, active: false }),
    }),
};

export function wsUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/imu";
}
