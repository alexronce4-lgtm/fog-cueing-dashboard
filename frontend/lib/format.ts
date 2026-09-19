export function pct(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

export function seconds(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

export function clock(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

export const PHASE_CLASS: Record<string, string> = {
  WALKING: "phase-walking",
  POSSIBLE_FREEZE: "phase-freeze",
  CUE_TRIGGERED: "phase-cue",
  RECOVERY_MONITORING: "phase-recover",
  RECOVERED: "phase-recovered",
  ANALYZING: "phase-analyze",
};
