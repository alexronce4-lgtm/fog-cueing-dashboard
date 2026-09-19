export type Phase =
  | "IDLE"
  | "WALKING"
  | "POSSIBLE_FREEZE"
  | "DETECTED"
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

export interface EdgeScore {
  classification: ClassificationLabel;
  confidence: number;
  latency_ms: number;
}

export interface RunPodResult {
  classification: ClassificationLabel;
  confidence: number;
  model_version: string;
  status: "idle" | "pending" | "complete" | "mock" | "error";
}

export interface CueInfo {
  pattern: "rhythmic" | "pulse" | "off";
  bpm: number;
  active: boolean;
  source: "edge_local" | "operator";
}

export interface CueParams {
  pattern: "rhythmic" | "pulse" | "off";
  bpm: number;
}

export interface RecoveryInfo {
  detected: boolean;
  elapsed_ms: number;
  time_ms: number | null;
  pre_cadence: number;
  post_cadence: number | null;
}

export interface EventRecord {
  episode_id: string;
  timestamp_iso: string;
  edge: { classification: ClassificationLabel; confidence: number };
  runpod: RunPodResult;
  cue: CueInfo;
  recovery: { detected: boolean; time_ms: number | null };
  status: string;
  event_duration_ms: number | null;
  pre_cadence: number | null;
  post_cadence: number | null;
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

export type ServiceMode = "MOCK" | "ONLINE";
export type SensorMode = "DEMO" | "LIVE";

export interface Connections {
  stream: "SIMULATED" | "LIVE";
  esp32: SensorMode;
  runpod: ServiceMode;
  grok: ServiceMode;
}

export interface DemoState {
  phase: Phase;
  running: boolean;
  storyStep: number;
  baseline_cadence_bpm: number;
  allowed_next_cues: CueParams[];
  edge: EdgeScore;
  runpod: RunPodResult;
  cue: CueInfo;
  recovery: RecoveryInfo;
  analysis: GrokAnalysis | null;
  events: EventRecord[];
  lastEpisodeId: string | null;
  connections: Connections;
  backendReachable: boolean;
}
