import type { IMUSample } from "@/types";

export type GaitMode = "idle" | "walking" | "freeze" | "recovering";

/** Client-side port of backend/demo/simulator.py so the demo never depends on the network. */
export class GaitSim {
  baseline: number;
  cadence: number;
  mode: GaitMode = "idle";
  private t0 = performance.now();
  private lastT = 0;
  private phase = 0;
  private blend = 0; // 1 = walking amplitude, 0 = flat / freeze-like

  constructor(baseline = 102) {
    this.baseline = baseline;
    this.cadence = baseline;
  }

  setMode(mode: GaitMode) {
    this.mode = mode;
  }

  reset(baseline?: number) {
    if (baseline) this.baseline = baseline;
    this.cadence = this.baseline;
    this.mode = "idle";
    this.t0 = performance.now();
    this.lastT = 0;
    this.phase = 0;
    this.blend = 0;
  }

  sample(): IMUSample {
    const t = (performance.now() - this.t0) / 1000;
    const dt = Math.max(0, Math.min(0.2, t - this.lastT));
    this.lastT = t;

    const target = this.mode === "walking" || this.mode === "recovering" ? 1 : 0;
    this.blend += (target - this.blend) * 0.12;
    const freezeLike = this.mode === "freeze" ? 1 - this.blend : 0;

    const stepHz = Math.max(0.4, this.cadence / 60);
    this.phase += 2 * Math.PI * stepHz * dt;
    const ph = this.phase;

    const walkAmp = 2.35 * this.blend;
    const tremor = freezeLike * 0.55 * Math.sin(2 * Math.PI * 7.5 * t);
    const stride = Math.sin(ph) + 0.28 * Math.sin(2 * ph + 0.6);
    const osc = walkAmp * stride + freezeLike * 0.12 * Math.sin(2 * Math.PI * 0.7 * t);

    const ax = 0.18 * Math.sin(ph + 0.4) * this.blend + gauss(0.02);
    const ay = -0.35 * Math.cos(ph) * this.blend + gauss(0.02);
    const az = 9.73 + osc + tremor + gauss(0.03);
    const gx = 18 * this.blend * Math.sin(ph) + gauss(0.3);
    const gy = 9 * this.blend * Math.cos(ph) + gauss(0.3);
    const gz = gauss(0.2) + freezeLike * 2.2 * Math.sin(2 * Math.PI * 7.5 * t);

    const targetCadence = this.mode === "idle" ? 0 : this.baseline * (0.22 + 0.78 * this.blend);
    this.cadence += (targetCadence - this.cadence) * 0.2 + gauss(0.15) * this.blend;

    return {
      timestamp: Math.round(t * 1000),
      ax,
      ay,
      az,
      gx,
      gy,
      gz,
      accel_mag: Math.sqrt(ax * ax + ay * ay + az * az),
      gyro_mag: Math.sqrt(gx * gx + gy * gy + gz * gz),
      cadence_bpm: Math.max(0, this.cadence),
    };
  }
}

function gauss(sd: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
