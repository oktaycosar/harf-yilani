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

  // Engeller
  const t = performance.now() / 1000;
  for (const obs of s.obstacles) {
    const cx = offX + obs.x * cell + cell / 2;
    const cy = offY + obs.y * cell + cell / 2;
    drawObstacle(ctx, cx, cy, cell, obs.shape, t);
  }

  // Buz alanları
  for (const ice of s.iceZones) {
    const cx = offX + ice.x * cell;
    const cy = offY + ice.y * cell;
    drawIce(ctx, cx, cy, cell, t);
  }

  // Hız artırıcılar
  for (const booster of s.speedBoosters) {
    if (booster.eaten) continue;
    const cx = offX + booster.x * cell + cell / 2;
    const cy = offY + booster.y * cell + cell / 2;
    drawBooster(ctx, cx, cy, cell, t + booster.phase);
  }

  // Bonus harfler
  for (const bonus of s.bonusLetters) {
    if (bonus.eaten) continue;
    const cx = offX + bonus.x * cell + cell / 2;
    const cy = offY + bonus.y * cell + cell / 2;
    drawBonus(ctx, cx, cy, cell, bonus.char, t + bonus.phase);
  }

  // Harfler
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
  if (s.status === "wrong_letter" || s.status === "game_over" || s.status === "time_up") {
    const isTime = s.status === "time_up";
    ctx.fillStyle = isTime ? "rgba(180, 83, 9, 0.30)" : "rgba(127, 29, 29, 0.28)";
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

// ----------------------------------------------------------------------------
// Engel çizimi
// ----------------------------------------------------------------------------
function drawObstacle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  shape: "block" | "spike",
  time: number
) {
  const half = cell * 0.42;
  if (shape === "block") {
    // Taş blok
    const grad = ctx.createLinearGradient(cx - half, cy - half, cx + half, cy + half);
    grad.addColorStop(0, "#475569");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    roundRect(ctx, cx - half, cy - half, half * 2, half * 2, 4);
    ctx.fill();
    // Üst highlight
    ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
    roundRect(ctx, cx - half + 2, cy - half + 2, half * 2 - 4, 4, 2);
    ctx.fill();
    // Çatlak
    ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - half / 2, cy);
    ctx.lineTo(cx + half / 3, cy - half / 3);
    ctx.lineTo(cx + half / 2, cy + half / 4);
    ctx.stroke();
  } else {
    // Spike — dönen tehlike işareti
    const pulse = 1 + Math.sin(time * 3) * 0.08;
    const r = half * pulse;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.5);
    // Arka glow
    ctx.shadowColor = "rgba(244, 63, 94, 0.6)";
    ctx.shadowBlur = 12;
    // Yıldız spike
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rad = i % 2 === 0 ? r : r * 0.5;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // İç nokta
    ctx.fillStyle = "#fef2f2";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// Buz alanı çizimi — buzlu kare, kristal parıltıları
// ----------------------------------------------------------------------------
function drawIce(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  time: number
) {
  const pad = 2;
  const w = cell - pad * 2;
  const h = cell - pad * 2;

  // Buz arka plan (açık mavi-beyaz gradient)
  const grad = ctx.createLinearGradient(x + pad, y + pad, x + pad + w, y + pad + h);
  grad.addColorStop(0, "rgba(186, 230, 253, 0.45)");
  grad.addColorStop(0.5, "rgba(224, 242, 254, 0.55)");
  grad.addColorStop(1, "rgba(125, 211, 252, 0.4)");
  ctx.fillStyle = grad;
  roundRect(ctx, x + pad, y + pad, w, h, 6);
  ctx.fill();

  // Kenar (buz kristali effect)
  ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Kristal parıltıları (move slowly)
  ctx.save();
  const sparkleCount = 3;
  for (let i = 0; i < sparkleCount; i++) {
    const sx = x + cell / 2 + Math.cos(time * 0.8 + i * 2.1) * (cell * 0.2);
    const sy = y + cell / 2 + Math.sin(time * 0.8 + i * 2.1) * (cell * 0.2);
    const sr = 1.5 + Math.sin(time * 3 + i) * 0.8;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time * 4 + i) * 0.3})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Merkez buz kristali (basit yıldız şekil)
  ctx.save();
  ctx.translate(x + cell / 2, y + cell / 2);
  ctx.rotate(time * 0.3);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.2;
  const r = cell * 0.18;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// Hız artırıcı çizimi — şimşek ikonu, sarı/amber glow
// ----------------------------------------------------------------------------
function drawBooster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  time: number
) {
  const pulse = 1 + Math.sin(time * 4) * 0.08;
  const r = cell * 0.38 * pulse;

  // Dış glow halkası (amber)
  ctx.save();
  ctx.shadowColor = "rgba(251, 191, 36, 0.8)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Arka plan disk (amber gradient)
  const grad = ctx.createRadialGradient(cx - r / 3, cy - r / 3, r / 4, cx, cy, r);
  grad.addColorStop(0, "#fef3c7");
  grad.addColorStop(0.5, "#f59e0b");
  grad.addColorStop(1, "#b45309");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Şimşek ikonu (zigzag)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 1;
  const sw = r * 0.45;
  const sh = r * 0.7;
  ctx.beginPath();
  ctx.moveTo(-sw * 0.3, -sh * 0.5);
  ctx.lineTo(sw * 0.2, -sh * 0.1);
  ctx.lineTo(-sw * 0.05, -sh * 0.1);
  ctx.lineTo(sw * 0.3, sh * 0.5);
  ctx.lineTo(-sw * 0.2, sh * 0.1);
  ctx.lineTo(sw * 0.05, sh * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ----------------------------------------------------------------------------
// Bonus harf çizimi — altın yıldız + harf
// ----------------------------------------------------------------------------
function drawBonus(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  char: string,
  time: number
) {
  const pulse = 1 + Math.sin(time * 3.5) * 0.06;
  const r = cell * 0.4 * pulse;

  // Dış halka glow
  ctx.save();
  ctx.shadowColor = "rgba(168, 85, 247, 0.7)";
  ctx.shadowBlur = 16;
  ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Mor yıldız arka plan
  const grad = ctx.createRadialGradient(cx - r / 3, cy - r / 3, r / 4, cx, cy, r);
  grad.addColorStop(0, "#f3e8ff");
  grad.addColorStop(0.5, "#a855f7");
  grad.addColorStop(1, "#6b21a8");
  ctx.fillStyle = grad;
  ctx.beginPath();
  // 5 köşeli yıldız
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.55;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // İnce kenar
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(107, 33, 168, 0.9)";
  ctx.stroke();

  // Harf
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.floor(cell * 0.42)}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, cx, cy + cell * 0.02);
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
  const dead = s.status === "wrong_letter" || s.status === "game_over" || s.status === "time_up";
  const celebrate = s.status === "level_complete";
  const boosted = s.boostRemainingMs > 0;
  const onIce = s.activeSpeedMultiplier < 1;
  const body = s.snake;
  if (body.length === 0) return;

  // Boost halinde baş çevresinde glow
  if (boosted && !dead && !celebrate) {
    const head = body[0];
    const hx = offX + head.x * cell + cell / 2;
    const hy = offY + head.y * cell + cell / 2;
    ctx.save();
    const glow = 0.5 + Math.sin(time * 10) * 0.5;
    ctx.fillStyle = `rgba(251, 191, 36, ${0.15 + glow * 0.2})`;
    ctx.beginPath();
    ctx.arc(hx, hy, cell * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

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
    } else if (boosted) {
      // Boost: amber/altın tonları
      color1 = lerpColor("#f59e0b", "#b45309", t);
      color2 = lerpColor("#d97706", "#78350f", t);
    } else if (onIce) {
      // Buz üzerinde: mavi-yeşil tonları
      color1 = lerpColor("#38bdf8", "#0c4a6e", t);
      color2 = lerpColor("#0ea5e9", "#082f49", t);
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
