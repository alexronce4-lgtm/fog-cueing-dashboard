export type GaitState = "walking" | "freezing" | "still";
export type CueMode = "auditory" | "haptic" | "visual";
export type CueSource = "idle" | "auto" | "manual";

export interface CueState {
  active: boolean;
  mode: CueMode;
  bpm: number;
  source: CueSource;
}

export interface DetectorConfig {
  freeze_threshold: number;
  power_threshold: number;
}

export interface CueConfig {
  auto_cue: boolean;
  mode: CueMode;
  bpm: number;
}

export interface SessionConfig {
  detector: DetectorConfig;
  cue: CueConfig;
}

export interface FogEvent {
  id: number;
  started_at: number;
  ended_at: number | null;
  peak_freeze_index: number;
  duration_s: number | null;
  cued: boolean;
}

export interface Sample {
  t: number;
  accel: number;
  freeze_index: number;
  power: number;
  state: GaitState;
}

export interface StatusResponse {
  running: boolean;
  state: GaitState;
  freeze_index: number;
  power: number;
  cue: CueState;
  config: SessionConfig;
  active_event: FogEvent | null;
  total_events: number;
}

export interface StreamMessage {
  type: "tick" | "snapshot";
  sample?: Sample;
  status: StatusResponse;
  recent: number[];
}
