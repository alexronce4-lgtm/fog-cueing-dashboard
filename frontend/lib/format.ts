import type { Phase } from "@/types";

export function pct(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

export function seconds(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(2)} s`;
}

export const PHASE_LABEL: Record<Phase, string> = {
  IDLE: "READY",
  WALKING: "WALKING",
  POSSIBLE_FREEZE: "POSSIBLE FREEZE",
  DETECTED: "DETECTED",
  CUE_TRIGGERED: "CUEING",
  RECOVERY_MONITORING: "RECOVERING",
  RECOVERED: "RECOVERED",
  ANALYZING: "ANALYZING",
};

export const PHASE_CLASS: Record<Phase, string> = {
  IDLE: "phase-idle",
  WALKING: "phase-walking",
  POSSIBLE_FREEZE: "phase-freeze",
  DETECTED: "phase-detected",
  CUE_TRIGGERED: "phase-cue",
  RECOVERY_MONITORING: "phase-recover",
  RECOVERED: "phase-recovered",
  ANALYZING: "phase-analyze",
};

export const PHASE_COLOR: Record<Phase, string> = {
  IDLE: "#8fa3b8",
  WALKING: "#3ee0ff",
  POSSIBLE_FREEZE: "#ffb020",
  DETECTED: "#ff6a3d",
  CUE_TRIGGERED: "#ff4d6d",
  RECOVERY_MONITORING: "#2dd4bf",
  RECOVERED: "#b6ff4a",
  ANALYZING: "#c084fc",
};

export const PHASE_CAPTION: Record<Phase, string> = {
  IDLE: "Press START DEMO to begin simulated walking.",
  WALKING: "Locomotion nominal. Edge detector watching the gait signal.",
  POSSIBLE_FREEZE: "Freeze-like gait pattern scored on-device.",
  DETECTED: "Edge threshold reached. RunPod verification requested.",
  CUE_TRIGGERED: "Local haptic cue dispatched by the edge loop.",
  RECOVERY_MONITORING: "Timing the return to baseline cadence.",
  RECOVERED: "Cadence restored. Episode logged.",
  ANALYZING: "Grok summarising the evidence.",
};

/** The 8-beat judge story shown under the current state. */
export const STORY = [
  "WALKING",
  "FREEZE-LIKE",
  "DETECTED",
  "HAPTIC CUE",
  "RECOVERY",
  "VERIFIED",
  "ANALYSIS",
  "NEXT EXPERIMENT",
] as const;
