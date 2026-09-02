"use client";

// ============================================================================
// ConfettiBurst — Kelime tamamlandığında gelişmiş konfeti patlaması.
// ----------------------------------------------------------------------------
// Kelime uzunluğuna göre parça sayısı ve renk paleti değişir.
// Daha zengin efekt: yıldız + konfeti şerit + daire + glow.
// Parent `trigger` her değiştiğinde child remount olur (key ile).
// ============================================================================

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  /** Tetikleyici — her artış yeni bir patlama başlatır */
  trigger: number;
  /** Kelime uzunluğu (parça sayısı ve renk paletini etkiler) */
  wordLength?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  life: number;
  shape: "rect" | "circle" | "star";
  // Glow efekti için
  glow: boolean;
}

// Kelime uzunluğuna göre renk paletleri
const PALETTES: Record<string, string[]> = {
  short: ["#fbbf24", "#f59e0b", "#fde047", "#fef3c7"], // amber/sarı
  medium: ["#34d399", "#10b981", "#6ee7b7", "#fbbf24", "#f59e0b"], // emerald + amber
  long: ["#a78bfa", "#8b5cf6", "#c4b5fd", "#34d399", "#fbbf24", "#f87171"], // mor + yeşil + amber + kırmızı
};

const DURATION_MS = 2800;

export function ConfettiBurst({ trigger, wordLength = 3 }: Props) {
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <ConfettiInstance key={trigger} trigger={trigger} wordLength={wordLength} />
      )}
    </AnimatePresence>
  );
}

function ConfettiInstance({ trigger: _trigger, wordLength }: { trigger: number; wordLength: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Kelime uzunluğuna göre palet ve parça sayısı
    const paletteKey = wordLength <= 3 ? "short" : wordLength <= 5 ? "medium" : "long";
    const colors = PALETTES[paletteKey];
    const particleCount = Math.min(180, 80 + wordLength * 25);

    const cx = w / 2;
    const cy = h / 2;
    const particles: Particle[] = [];

    // İlk dalga: merkez patlama
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      const shape = Math.random() > 0.7 ? "star" : Math.random() > 0.4 ? "rect" : "circle";
      particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.5,
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        shape,
        glow: Math.random() > 0.6,
      });
    }

    // İkinci dalga: üstten yağmur (gecikmeli)
    const rainDelay = 200;
    const rainCount = Math.floor(particleCount * 0.4);

    const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? size / 2 : size / 4;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    const start = performance.now();
    const render = (now: number) => {
      const elapsed = now - start;
      const t = elapsed / DURATION_MS;

      // İkinci dalga parçaları ekle (yağmur)
      if (elapsed > rainDelay && particles.length < particleCount + rainCount) {
        for (let i = 0; i < 3 && particles.length < particleCount + rainCount; i++) {
          particles.push({
            x: Math.random() * w,
            y: -10,
            vx: (Math.random() - 0.5) * 2,
            vy: 2 + Math.random() * 3,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 0.3,
            size: 5 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1,
            shape: Math.random() > 0.5 ? "rect" : "circle",
            glow: Math.random() > 0.7,
          });
        }
      }

      ctx.clearRect(0, 0, w, h);
      const gravity = 0.28;
      for (const p of particles) {
        p.vy += gravity;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life = Math.max(0, 1 - t);
        if (p.life <= 0 || p.y > h + 20) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        // Glow efekti
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // star
          drawStar(ctx, p.size);
        }
        ctx.restore();
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    rafRef.current = requestAnimationFrame(render);

    const timeout = window.setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, DURATION_MS + 200);

    return () => {
      window.clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [wordLength]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
    />
  );
}
