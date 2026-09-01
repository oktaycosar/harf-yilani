"use client";

// ============================================================================
// HUD — Oyun üst bilgi çubuğu (Bölüm, Hedef kelime, Skor, Can, Combo)
// ============================================================================

import { Heart, Sparkles, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameSnapshot } from "@/lib/game/types";
import { START_LIVES } from "@/lib/game/constants";

interface Props {
  snapshot: GameSnapshot;
  nextTargetChar: string | null;
}

export function HUD({ snapshot, nextTargetChar }: Props) {
  const { level, targetWord, currentLetterIndex, score, lives, combo, tierName, stepMs } = snapshot;

  return (
    <div className="w-full">
      {/* Üst satır: Bölüm + Zorluk + Hız bilgisi */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
            Bölüm {level}
          </span>
          <span className="rounded-lg bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300">
            {tierName}
          </span>
          <span className="hidden items-center gap-1 rounded-lg bg-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-400 sm:inline-flex">
            <Zap className="h-3 w-3" />
            {(1000 / stepMs).toFixed(1)} adım/sn
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ScorePill score={score} />
          <LivesPill lives={lives} />
        </div>
      </div>

      {/* Hedef kelime gösterimi */}
      <div className="mt-3 rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Hedef Kelime
          </span>
          {combo > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              <Sparkles className="h-3 w-3" />
              COMBO ×{combo}
            </span>
          )}
        </div>
        <WordDisplay word={targetWord} currentIndex={currentLetterIndex} nextTargetChar={nextTargetChar} />
      </div>
    </div>
  );
}

function WordDisplay({
  word,
  currentIndex,
  nextTargetChar,
}: {
  word: string;
  currentIndex: number;
  nextTargetChar: string | null;
}) {
  if (!word) {
    return (
      <div className="flex h-10 items-center text-slate-500">
        <span className="text-sm">Başlamak için &quot;Oyna&quot; butonuna bas…</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {word.split("").map((ch, i) => {
        const eaten = i < currentIndex;
        const isNext = i === currentIndex;
        return (
          <span
            key={i}
            className={cn(
              "flex h-10 w-9 items-center justify-center rounded-md border text-2xl font-extrabold transition-all sm:h-11 sm:w-10",
              eaten
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                : isNext
                  ? "animate-pulse border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                  : "border-slate-700/60 bg-slate-800/60 text-slate-500"
            )}
          >
            {eaten ? ch : isNext ? ch : "_"}
          </span>
        );
      })}
      {nextTargetChar && (
        <span className="ml-2 hidden text-sm text-slate-400 sm:inline">
          → Sıradaki: <span className="font-bold text-amber-300">{nextTargetChar}</span>
        </span>
      )}
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-300">
      <Trophy className="h-4 w-4" />
      {score}
    </span>
  );
}

function LivesPill({ lives }: { lives: number }) {
  const total = START_LIVES;
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <Heart
          key={i}
          className={cn(
            "h-4 w-4 transition-all",
            i < lives ? "fill-rose-500 text-rose-500" : "fill-slate-700 text-slate-700"
          )}
        />
      ))}
    </span>
  );
}
