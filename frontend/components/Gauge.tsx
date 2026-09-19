"use client";

export default function Gauge({
  value,
  size = 132,
  pending,
  label,
}: {
  value: number;
  size?: number;
  pending?: boolean;
  label: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const sweep = 270;
  const circ = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * circ;
  const v = Math.max(0, Math.min(1, value));
  const offset = arcLen * (1 - (pending ? 0.12 : v));
  const rotate = 135;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-0">
        <g transform={`rotate(${rotate} ${cx} ${cx})`}>
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            strokeDasharray={`${arcLen} ${circ}`}
            strokeLinecap="round"
          />
          <circle
            className={`gauge-arc ${pending ? "animate-pulse" : ""}`}
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="var(--phase)"
            strokeWidth={stroke}
            strokeDasharray={`${arcLen} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 8px rgb(var(--phase-rgb) / 0.7))" }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="value-display text-4xl font-bold leading-none text-white">
          {pending ? "…" : `${Math.round(v * 100)}`}
          {!pending && <span className="text-lg text-white/45">%</span>}
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
          {label}
        </span>
      </div>
    </div>
  );
}
