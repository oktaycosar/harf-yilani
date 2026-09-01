"use client";

// ============================================================================
// GameCanvas — Oyun alanını HTML5 Canvas üzerine çizer.
// Snake + harfler + ızgara + canlandırma efektleri.
// Çizim mantığı Godot versiyonundaki draw rutinleriyle birebir uyuşur.
// ============================================================================

import { useEffect, useRef } from "react";
import type { GameSnapshot } from "@/lib/game/types";
import { GRID_COLS, GRID_ROWS } from "@/lib/game/constants";

interface Props {
  snapshot: GameSnapshot;
  /** Bir sonraki hedef harf (highlight için) */
  nextTargetChar: string | null;
}

// Türkçe karakterleri canvas'ta doğru render etmek için fontu şapkalı/tilkeli
// destekleyen bir aile kullanıyoruz. Sistemde genelde mevcuttur.
const FONT_FAMILY = "'Segoe UI', 'Noto Sans', system-ui, sans-serif";

export function GameCanvas({ snapshot, nextTargetChar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Yüksek DPI ve responsive boyutlandırma
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      // En boy oranını koru (cols:rows)
      const aspect = GRID_COLS / GRID_ROWS;
      let w = rect.width;
      let h = w / aspect;
      if (h > rect.height) {
        h = rect.height;
        w = h * aspect;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${Math.floor(w)}px`;
      canvas.style.height = `${Math.floor(h)}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Render döngüsü (sürekli; hafif animasyonlar için)
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) draw(ctx, canvas, snapshot, nextTargetChar);
      }
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [snapshot, nextTargetChar]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full rounded-xl" />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Çizim
// ----------------------------------------------------------------------------
function draw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  s: GameSnapshot,
  nextTargetChar: string | null
) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  const cell = Math.min(w / GRID_COLS, h / GRID_ROWS);
  const boardW = cell * GRID_COLS;
  const boardH = cell * GRID_ROWS;
  const offX = (w - boardW) / 2;
  const offY = (h - boardH) / 2;

  // Arka plan
  ctx.clearRect(0, 0, w, h);
  drawBoardBg(ctx, offX, offY, boardW, boardH, cell);

  // Izgara çizgileri (hafif)
  drawGrid(ctx, offX, offY, cell);

  // Harfler
  const t = performance.now() / 1000;
  for (const letter of s.letters) {
    if (letter.eaten) continue;
    const cx = offX + letter.x * cell + cell / 2;
    const cy = offY + letter.y * cell + cell / 2;
    const isTarget = letter.orderIndex === s.currentLetterIndex;
    drawLetter(ctx, cx, cy, cell, letter.char, isTarget, t + letter.phase, nextTargetChar);
  }

  // Yılan
  drawSnake(ctx, s, offX, offY, cell, t);

  // Hatalı harf / ölüm efekti
  if (s.status === "wrong_letter" || s.status === "game_over") {
    ctx.fillStyle = "rgba(127, 29, 29, 0.28)";
    ctx.fillRect(offX, offY, boardW, boardH);
  }
  if (s.status === "level_complete") {
    ctx.fillStyle = "rgba(6, 78, 59, 0.30)";
    ctx.fillRect(offX, offY, boardW, boardH);
  }
}

function drawBoardBg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cell: number
) {
  // Yumuşak gradient tahta
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#111c33");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, Math.min(16, cell / 2));
  ctx.fill();

  // Kenarlık
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.stroke();
}

function drawGrid(ctx: CanvasRenderingContext2D, offX: number, offY: number, cell: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID_COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(offX + i * cell, offY);
    ctx.lineTo(offX + i * cell, offY + cell * GRID_ROWS);
    ctx.stroke();
  }
  for (let j = 1; j < GRID_ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(offX, offY + j * cell);
    ctx.lineTo(offX + cell * GRID_COLS, offY + j * cell);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLetter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  char: string,
  isTarget: boolean,
  time: number,
  nextTargetChar: string | null
) {
  const pulse = 1 + Math.sin(time * 2.5) * 0.04;
  const r = (cell * 0.42) * pulse;

  // Eğer bu harf aynı zamanda "sıradaki hedef" ise altın halka
  if (isTarget || char === nextTargetChar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(251, 191, 36, 0.7)";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();
  }

  // Harf diski
  const baseColor = isTarget ? "#f59e0b" : "#fbbf24";
  const grad = ctx.createRadialGradient(cx - r / 3, cy - r / 3, r / 4, cx, cy, r);
  grad.addColorStop(0, "#fde68a");
  grad.addColorStop(0.5, baseColor);
  grad.addColorStop(1, "#b45309");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // İç kenar
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(180, 83, 9, 0.9)";
  ctx.stroke();

  // Harf
  ctx.fillStyle = "#3b1d04";
  ctx.font = `800 ${Math.floor(cell * 0.5)}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, cx, cy + cell * 0.02);
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  s: GameSnapshot,
  offX: number,
  offY: number,
  cell: number,
  time: number
) {
  const dead = s.status === "wrong_letter" || s.status === "game_over";
  const celebrate = s.status === "level_complete";
  const body = s.snake;
  if (body.length === 0) return;

  // Gövde segmentleri (kuyruktan başa)
  for (let i = body.length - 1; i >= 0; i--) {
    const seg = body[i];
    const cx = offX + seg.x * cell + cell / 2;
    const cy = offY + seg.y * cell + cell / 2;
    const t = i / Math.max(1, body.length - 1); // 0=head,1=tail
    const r = cell * (0.42 - t * 0.08);

    let color1: string, color2: string;
    if (dead) {
      color1 = "#7f1d1d";
      color2 = "#450a0a";
    } else if (celebrate) {
      color1 = "#34d399";
      color2 = "#059669";
    } else {
      // Baş → kuyruk: emerald tonları
      color1 = lerpColor("#10b981", "#022c22", t);
      color2 = lerpColor("#047857", "#022c22", t);
    }
    const grad = ctx.createRadialGradient(cx - r / 3, cy - r / 3, r / 4, cx, cy, r);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // İnce kenar
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
  }

  // Baş detayları (gözler)
  const head = body[0];
  const hx = offX + head.x * cell + cell / 2;
  const hy = offY + head.y * cell + cell / 2;
  const eyeOffset = cell * 0.13;
  const eyeR = cell * 0.07;
  const dir = s.direction;
  const ex1 = hx + (dir === "left" ? -eyeOffset : dir === "right" ? eyeOffset : -eyeOffset * 0.6);
  const ey1 = hy + (dir === "up" ? -eyeOffset : dir === "down" ? eyeOffset : -eyeOffset * 0.6);
  const ex2 = hx + (dir === "left" ? -eyeOffset : dir === "right" ? eyeOffset : eyeOffset * 0.6);
  const ey2 = hy + (dir === "up" ? -eyeOffset : dir === "down" ? eyeOffset : -eyeOffset * 0.6);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dead ? "#7f1d1d" : "#0f172a";
  const pupilR = eyeR * 0.55;
  ctx.beginPath(); ctx.arc(ex1, ey1, pupilR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex2, ey2, pupilR, 0, Math.PI * 2); ctx.fill();

  // Kutlama efekti: baş çevresinde parıltı
  if (celebrate) {
    ctx.save();
    const glow = 0.5 + Math.sin(time * 6) * 0.5;
    ctx.fillStyle = `rgba(52, 211, 153, ${0.15 + glow * 0.2})`;
    ctx.beginPath();
    ctx.arc(hx, hy, cell * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// Yardımcılar
// ----------------------------------------------------------------------------
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(h: string): [number, number, number] {
  const m = h.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
