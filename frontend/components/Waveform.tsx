"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { IMUSample } from "@/types";

const WINDOW = 160;
const Y_MIN = 7.4;
const Y_MAX = 12.6;

export default function Waveform({
  samplesRef,
  color,
}: {
  samplesRef: MutableRefObject<IMUSample[]>;
  color: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastCount = 0;
    let lastArrival = performance.now();
    let period = 40;
    const smooth: number[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const samples = samplesRef.current;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const c = colorRef.current;

      if (samples.length !== lastCount) {
        const dt = now - lastArrival;
        if (dt > 5 && dt < 400) period = period * 0.85 + dt * 0.15;
        lastArrival = now;
        lastCount = samples.length;
      }
      // Sub-sample scroll offset so the trace glides instead of stepping.
      const frac = Math.min(1, (now - lastArrival) / period);

      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let i = 1; i < 8; i++) {
        const x = (w / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // 1 g reference
      const gY = h - ((9.81 - Y_MIN) / (Y_MAX - Y_MIN)) * h;
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.moveTo(0, gY);
      ctx.lineTo(w, gY);
      ctx.stroke();
      ctx.setLineDash([]);

      const view = samples.slice(-WINDOW);
      if (view.length < 3) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "11px var(--font-mono), monospace";
        ctx.fillText("AWAITING IMU STREAM", 14, 22);
        raf = requestAnimationFrame(draw);
        return;
      }

      // Light EMA to remove sensor jitter without hiding the freeze morphology.
      smooth.length = 0;
      let acc = view[0].accel_mag;
      for (const s of view) {
        acc = acc * 0.55 + s.accel_mag * 0.45;
        smooth.push(acc);
      }

      const step = w / (WINDOW - 1);
      const offset = (view.length - 1 + frac) * step - w;
      const pts = smooth.map((v, i) => ({
        x: i * step - offset,
        y: h - ((Math.min(Y_MAX, Math.max(Y_MIN, v)) - Y_MIN) / (Y_MAX - Y_MIN)) * h,
      }));

      const path = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
      };

      // Fill
      path();
      ctx.lineTo(pts[pts.length - 1].x, h);
      ctx.lineTo(pts[0].x, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, hexToRgba(c, 0.32));
      grad.addColorStop(1, hexToRgba(c, 0));
      ctx.fillStyle = grad;
      ctx.fill();

      // Glow stroke
      ctx.save();
      ctx.shadowColor = c;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = hexToRgba(c, 0.55);
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      path();
      ctx.stroke();
      ctx.restore();

      // Core stroke
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      path();
      ctx.stroke();

      // Head marker
      const head = pts[pts.length - 1];
      ctx.fillStyle = "#fff";
      ctx.shadowColor = c;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Left fade
      const fade = ctx.createLinearGradient(0, 0, w * 0.18, 0);
      fade.addColorStop(0, "rgba(6,8,13,0.95)");
      fade.addColorStop(1, "rgba(6,8,13,0)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, w * 0.18, h);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [samplesRef]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

function hexToRgba(hex: string, a: number): string {
  const v = hex.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
