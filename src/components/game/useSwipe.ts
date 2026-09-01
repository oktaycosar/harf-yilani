"use client";

// ============================================================================
// useSwipe — Dokunmatik kaydırma (swipe) ile yön kontrolü.
// Bir elemana bağlanan ref üzerinden çalışır. Mobil cihazlarda D-pad yerine
// doğal kaydırma deneyimi sunar. Eşik: 24px.
// ============================================================================

import { useEffect, useRef, type RefObject } from "react";
import type { Direction } from "@/lib/game/types";

interface Options {
  onDirection: (dir: Direction) => void;
  enabled: boolean;
}

export function useSwipe<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { onDirection, enabled }: Options
) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const dirRef = useRef(onDirection);
  useEffect(() => {
    dirRef.current = onDirection;
  }, [onDirection]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
    };
    const onMove = (e: TouchEvent) => {
      const start = startRef.current;
      const t = e.touches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const THRESH = 24;
      if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
      // Yatay mı dikey mi?
      if (Math.abs(dx) > Math.abs(dy)) {
        dirRef.current(dx > 0 ? "right" : "left");
      } else {
        dirRef.current(dy > 0 ? "down" : "up");
      }
      startRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
      // Sayfanın kaymasını önle
      e.preventDefault();
    };
    const onEnd = () => {
      startRef.current = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, ref]);
}
