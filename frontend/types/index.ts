export type Phase =
  | "WALKING"
  | "POSSIBLE_FREEZE"
  | "CUE_TRIGGERED"
  | "RECOVERY_MONITORING"
  | "RECOVERED"
  | "ANALYZING";

export type ClassificationLabel = "walking" | "freeze_like" | "unknown";

export interface IMUSample {
  timestamp: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  accel_mag: number;
  gyro_mag: number;
  cadence_bpm?: number | null;
}

export interface Classification {
  classification: ClassificationLabel;
  confidence: number;
  source?: string;
  latency_ms?: number | null;
  model_version?: string | null;
  note?: string;
  status?: string;
}

export interface RunPodResult {
  classification: ClassificationLabel;
  confidence: number;
  model_version: string;
  status: "idle" | "pending" | "complete" | "mock" | "error";
  note?: string;
}

export interface CueInfo {
  pattern: string;
  bpm: number;
  active: boolean;
  source?: string;
  note?: string;
}

export interface CueParams {
  pattern: "rhythmic" | "pulse" | "off";
  bpm: number;
  active?: boolean;
}

export interface RecoveryInfo {
  detected: boolean;
  time_ms?: number | null;
  elapsed_ms: number;
  pre_cadence?: number | null;
  post_cadence?: number | null;
  event_duration_ms?: number | null;
}

export interface EventRecord {
  episode_id: string;
  timestamp_iso: string;
  edge: { classification: ClassificationLabel; confidence: number };
  runpod: RunPodResult;
  cue: CueInfo;
  recovery: { detected: boolean; time_ms?: number | null };
  status: string;
  event_duration_ms?: number | null;
  pre_cadence?: number | null;
  post_cadence?: number | null;
}

export interface GrokAnalysis {
  summary: string;
  observation: string;
  evidence: string;
  next_experiment: string;
  confidence_statement: string;
  full_analysis: string;
  session_summary: string;
  cue_comparison: string;
  observations: string;
  safety: string;
  limitation: string;
  recommended_cue?: CueParams | null;
  mock: boolean;
}

export interface SessionState {
  session_id: string;
  baseline_cadence_bpm: number;
  current_cadence_bpm: number;
  allowed_next_cues: CueParams[];
  events: EventRecord[];
  phase: Phase;
  phase_label: string;
  cue: CueInfo;
  recovery: RecoveryInfo;
  edge: Classification;
  runpod: RunPodResult;
  analysis?: GrokAnalysis | null;
  pending_next_cue?: CueParams | null;
  disclaimer: string;
}

export interface ConnectionStatus {
  esp32: "CONNECTED" | "DEMO";
  runpod: "ONLINE" | "MOCK" | "ERROR";
  grok: "ONLINE" | "MOCK" | "ERROR";
}

export interface StatePayload {
  phase: Phase;
  label: string;
  loop_step: string;
  loop: string[];
}
