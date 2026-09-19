import type { Phase } from "@/types";

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
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const PHASE_CLASS: Record<Phase, string> = {
  WALKING: "phase-walking",
  POSSIBLE_FREEZE: "phase-freeze",
  CUE_TRIGGERED: "phase-cue",
  RECOVERY_MONITORING: "phase-recover",
  RECOVERED: "phase-recovered",
  ANALYZING: "phase-analyze",
};

export const PHASE_COLOR: Record<Phase, string> = {
  WALKING: "#3ee0ff",
  POSSIBLE_FREEZE: "#ffb020",
  CUE_TRIGGERED: "#ff4d6d",
  RECOVERY_MONITORING: "#ff8a3d",
  RECOVERED: "#b6ff4a",
  ANALYZING: "#c084fc",
};

export const PHASE_ORDER: Phase[] = [
  "WALKING",
  "POSSIBLE_FREEZE",
  "CUE_TRIGGERED",
  "RECOVERY_MONITORING",
  "RECOVERED",
  "ANALYZING",
];

export const PHASE_CAPTION: Record<Phase, string> = {
  WALKING: "Locomotion nominal. Edge detector sampling at ~25 Hz.",
  POSSIBLE_FREEZE: "Freeze-like gait pattern scored on-device. Not a diagnosis.",
  CUE_TRIGGERED: "Local haptic cue dispatched by the edge loop. Cloud is not in this path.",
  RECOVERY_MONITORING: "Timing return to baseline cadence after the cue.",
  RECOVERED: "Cadence restored. Episode logged for observational analysis.",
  ANALYZING: "Grok summarising evidence. Recommendations limited to allowed cues.",
};
