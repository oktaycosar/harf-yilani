"use client";

// ============================================================================
// SkinPreview — Küçük animasyonlu yılan önizlemesi.
// Skin seçicide her skin kartında gösterilir. 3 segmentli yılan,
// skin renkleriyle, hafif hareket animasyonu.
// ============================================================================

import { useEffect, useRef } from "react";
import type { SnakeSkin } from "@/lib/game/snakeSkins";
import { lerpColor } from "./GameCanvasUtils";

interface Props {
  skin: SnakeSkin;
  size?: number; // px cinsinden genişlik
}

export function SkinPreview({ skin, size = 48 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const render = () => {
      const t = performance.now() / 1000;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const segR = size * 0.16;
      const segSpacing = size * 0.12;

      // 3 segmentli yılan — hafif dalgalı hareket
      for (let i = 2; i >= 0; i--) {
        const wave = Math.sin(t * 3 + i * 0.8) * size * 0.04;
        const sx = cx - i * segSpacing + wave;
        const sy = cy + Math.cos(t * 3 + i * 0.8) * size * 0.03;
        const ratio = i / 2; // 0=head, 1=tail
        const color = lerpColor(skin.headColor, skin.tailColor, ratio);
        const color2 = lerpColor(skin.headColor, skin.tailColor, Math.min(1, ratio + 0.3));

        const grad = ctx.createRadialGradient(sx - segR / 3, sy - segR / 3, segR / 4, sx, sy, segR);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color2);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, segR, 0, Math.PI * 2);
        ctx.fill();

        // İnce kenar
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.stroke();
      }

      // Baş: gözler
      const headX = cx + Math.sin(t * 3) * size * 0.04;
      const headY = cy + Math.cos(t * 3) * size * 0.03;
      const eyeR = segR * 0.25;
      const eyeOff = segR * 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(headX - eyeOff * 0.5, headY - eyeOff * 0.5, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(headX + eyeOff * 0.5, headY - eyeOff * 0.5, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // Pupiller
      ctx.fillStyle = skin.pupilColor;
      const pupilR = eyeR * 0.55;
      ctx.beginPath();
      ctx.arc(headX - eyeOff * 0.5, headY - eyeOff * 0.5, pupilR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(headX + eyeOff * 0.5, headY - eyeOff * 0.5, pupilR, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [skin, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg bg-slate-900/60"
      style={{ width: size, height: size }}
    />
  );
}
