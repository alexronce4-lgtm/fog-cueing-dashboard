"use client";

import { Area, AreaChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { IMUSample, Phase } from "@/types";

export default function GaitSignal({
  samples,
  cadence,
  baseline,
  phase,
  sensor,
}: {
  samples: IMUSample[];
  cadence: number;
  baseline: number;
  phase: Phase;
  sensor: string;
}) {
  const freeze = phase === "POSSIBLE_FREEZE" || phase === "CUE_TRIGGERED";
  const data = samples.map((s, i) => ({
    i,
    mag: s.accel_mag,
    gyro: 9.4 + (s.gyro_mag || 0) / 40,
  }));

  return (
    <section className="panel h-full p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">01 · Live gait signal</p>
          <h3 className="font-display text-2xl font-semibold tracking-wide text-white">IMU WAVEFORM</h3>
        </div>
        <div className="flex gap-6 font-mono text-xs uppercase tracking-[0.16em] text-white/50">
          <div>
            Cadence{" "}
            <span className="text-lg text-white">{cadence.toFixed(0)}</span>
            <span className="text-white/40"> BPM</span>
          </div>
          <div>
            Baseline{" "}
            <span className="text-lg text-white">{baseline.toFixed(0)}</span>
            <span className="text-white/40"> BPM</span>
          </div>
          <div>
            Sensor <span className="text-lg text-white">{sensor}</span>
          </div>
        </div>
      </div>
      <div className="h-[220px] w-full">
        {data.length < 4 ? (
          <div className="flex h-full items-center justify-center font-mono text-xs tracking-[0.2em] text-white/35">
            AWAITING IMU STREAM…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="magFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--phase)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--phase)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <YAxis domain={[7.6, 13.2]} hide />
              <Area
                type="monotone"
                dataKey="mag"
                stroke="var(--phase)"
                fill="url(#magFill)"
                strokeWidth={2.2}
                isAnimationActive={false}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="gyro"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={1}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.2em] text-white/35">
        <span>ACCEL MAGNITUDE {freeze ? "· FREEZE-LIKE PATTERN" : "· LOCOMOTION"}</span>
        <span>GYRO (DIM) · ~25 Hz</span>
      </div>
    </section>
  );
}
