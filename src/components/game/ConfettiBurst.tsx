"use client";

// ============================================================================
// ConfettiBurst — Kelime tamamlandığında konfeti patlaması.
// Parent, trigger değiştikçe child instance'ı remount eder (key ile).
// Child kendi animasyonunu yönetir ve bitince onDone çağırır.
// Bu pattern, "setState in effect" lint hatasını temiz şekilde önler.
// ============================================================================

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  /** Tetikleyici — her artış yeni bir patlama başlatır */
  trigger: number;
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
  shape: "rect" | "circle";
}

const COLORS = ["#fbbf24", "#34d399", "#f87171", "#60a5fa", "#a78bfa", "#f472b6", "#fde047"];
const DURATION_MS = 2200;

export function ConfettiBurst({ trigger }: Props) {
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <ConfettiInstance key={trigger} trigger={trigger} />
      )}
    </AnimatePresence>
  );
}

function ConfettiInstance({ trigger: _trigger }: { trigger: number }) {
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

    const cx = w / 2;
    const cy = h / 2;
    const particles: Particle[] = [];
    for (let i = 0; i < 110; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
        shape: Math.random() > 0.4 ? "rect" : "circle",
      });
    }

    const start = performance.now();
    const render = (now: number) => {
      const t = (now - start) / DURATION_MS;
      ctx.clearRect(0, 0, w, h);
      const gravity = 0.32;
      for (const p of particles) {
        p.vy += gravity;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life = Math.max(0, 1 - t);
        if (p.life <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
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

    // Animasyon süresi kadar sonra parent bunu unmount eder (key değişince)
    const timeout = window.setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, DURATION_MS + 100);

    return () => {
      window.clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
