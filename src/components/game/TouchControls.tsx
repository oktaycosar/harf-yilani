"use client";

// ============================================================================
// TouchControls — Mobil cihazlar için yön tuşları (D-pad) + kaydırma desteği.
// ============================================================================

import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Direction } from "@/lib/game/types";

interface Props {
  onDirection: (dir: Direction) => void;
  visible: boolean;
}

export function TouchControls({ onDirection, visible }: Props) {
  return (
    <div
      className={cn(
        "pointer-events-none select-none transition-opacity",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5" style={{ touchAction: "none" }}>
        <span />
        <DPadButton dir="up" onDirection={onDirection} />
        <span />
        <DPadButton dir="left" onDirection={onDirection} />
        <span />
        <DPadButton dir="right" onDirection={onDirection} />
        <span />
        <DPadButton dir="down" onDirection={onDirection} />
        <span />
      </div>
    </div>
  );
}

function DPadButton({ dir, onDirection }: { dir: Direction; onDirection: (d: Direction) => void }) {
  const Icon = dir === "up" ? ChevronUp : dir === "down" ? ChevronDown : dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={dir}
      onPointerDown={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
      className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-xl border border-slate-600/60 bg-slate-800/70 text-slate-200 shadow-lg active:bg-emerald-600/70 active:scale-95"
    >
      <Icon className="h-7 w-7" />
    </button>
  );
}
