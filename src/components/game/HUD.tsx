"use client";

// ============================================================================
// HUD — Oyun üst bilgi çubuğu (Bölüm, Hedef kelime, Skor, Can, Combo)
// + kelime ilerleme çubuğu + en iyi skor rozeti
// ============================================================================

import { Heart, Sparkles, Trophy, Gauge, Timer, Boxes, Star, Zap, Snowflake, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GameSnapshot } from "@/lib/game/types";
import { START_LIVES } from "@/lib/game/constants";

interface Props {
  snapshot: GameSnapshot;
  nextTargetChar: string | null;
  bestScore: number;
  streak: number;
}

export function HUD({ snapshot, nextTargetChar, bestScore, streak }: Props) {
  const { level, targetWord, currentLetterIndex, score, lives, combo, tierName, stepMs } = snapshot;
  const progress = targetWord.length > 0 ? (currentLetterIndex / targetWord.length) * 100 : 0;
  const timed = snapshot.timeLimitMs > 0;
  const timePercent = timed ? (snapshot.timeRemainingMs / snapshot.timeLimitMs) * 100 : 0;
  const timeSec = Math.max(0, Math.ceil(snapshot.timeRemainingMs / 1000));
  const timeLow = timed && timeSec <= 5;
  const timeMid = timed && timeSec <= 10 && timeSec > 5;

  return (
    <div className="w-full">
      {/* Üst satır: Bölüm + Zorluk + Hız bilgisi */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <motion.span
            key={level}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/20"
          >
            Bölüm {level}
          </motion.span>
          <span className="rounded-lg bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300">
            {tierName}
          </span>
          <span className="hidden items-center gap-1 rounded-lg bg-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-400 sm:inline-flex">
            <Gauge className="h-3 w-3" />
            {(1000 / stepMs).toFixed(1)} adım/sn
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ScorePill score={score} bestScore={bestScore} />
          {streak > 0 && <StreakPill streak={streak} />}
          <LivesPill lives={lives} />
        </div>
      </div>

      {/* Hedef kelime gösterimi */}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 shadow-lg">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Hedef Kelime
          </span>
          <div className="flex items-center gap-2">
            {combo > 1 && (
              <motion.span
                key={combo}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: [0.7, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 transition-colors",
                  combo >= 10
                    ? "bg-rose-500/25 text-rose-200 ring-rose-400/50 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                    : combo >= 5
                      ? "bg-amber-500/25 text-amber-100 ring-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                      : "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                )}
              >
                <Sparkles className="h-3 w-3" />
                COMBO ×{combo}
                {combo >= 5 && <span className="text-[9px] uppercase">🔥</span>}
              </motion.span>
            )}
          </div>
        </div>
        <WordDisplay word={targetWord} currentIndex={currentLetterIndex} nextTargetChar={nextTargetChar} />

        {/* Kelime ilerleme çubuğu */}
        {targetWord.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{currentLetterIndex} / {targetWord.length} harf</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
              />
            </div>
          </div>
        )}

        {/* Süre + Engel + Bonus + Boost + Buz göstergeleri */}
        {targetWord.length > 0 && (timed || snapshot.obstacles.length > 0 || snapshot.bonusLetters.some((b) => !b.eaten) || snapshot.boostRemainingMs > 0 || snapshot.iceZones.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {timed && (
              <div className="flex flex-1 items-center gap-1.5">
                <Timer className={cn("h-3.5 w-3.5", timeLow ? "text-rose-400" : timeMid ? "text-amber-400" : "text-slate-400")} />
                <span className={cn("text-[11px] font-bold tabular-nums", timeLow ? "text-rose-400" : timeMid ? "text-amber-400" : "text-slate-300")}>
                  {timeSec}s
                </span>
                <div className="h-1 flex-[2] overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-100",
                      timeLow ? "bg-rose-500" : timeMid ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${timePercent}%` }}
                  />
                </div>
              </div>
            )}
            {snapshot.boostRemainingMs > 0 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/40"
                title="Hız boostu aktif"
              >
                <Zap className="h-3 w-3 fill-amber-400" />
                {(snapshot.boostRemainingMs / 1000).toFixed(1)}s
              </motion.span>
            )}
            {snapshot.obstacles.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300" title="Engel sayısı">
                <Boxes className="h-3 w-3" />
                {snapshot.obstacles.length}
              </span>
            )}
            {snapshot.bonusLetters.some((b) => !b.eaten) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300" title="Bonus harf">
                <Star className="h-3 w-3" />
                {snapshot.bonusLetters.filter((b) => !b.eaten).length}
              </span>
            )}
            {snapshot.iceZones.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300" title="Buz alanı">
                <Snowflake className="h-3 w-3" />
                {snapshot.iceZones.length}
              </span>
            )}
          </div>
        )}
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
          <motion.span
            key={i}
            initial={false}
            animate={eaten ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "flex h-10 w-9 items-center justify-center rounded-md border text-2xl font-extrabold transition-all sm:h-11 sm:w-10",
              eaten
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                : isNext
                  ? "animate-pulse border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                  : "border-slate-700/60 bg-slate-800/60 text-slate-500"
            )}
          >
            {eaten ? ch : isNext ? ch : "_"}
          </motion.span>
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

function ScorePill({ score, bestScore }: { score: number; bestScore: number }) {
  const isBest = bestScore > 0 && score >= bestScore && score > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
        isBest
          ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/50"
          : "bg-amber-500/15 text-amber-300"
      )}
    >
      <Trophy className="h-4 w-4" />
      {score}
      {isBest && <span className="text-[9px] uppercase">rekor!</span>}
    </span>
  );
}

function StreakPill({ streak }: { streak: number }) {
  const isHot = streak >= 3;
  const isFire = streak >= 5;
  return (
    <motion.span
      key={streak}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition-colors",
        isFire
          ? "bg-orange-500/25 text-orange-200 ring-orange-400/50 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
          : isHot
            ? "bg-amber-500/25 text-amber-100 ring-amber-400/50"
            : "bg-slate-700/40 text-slate-300 ring-slate-600/30"
      )}
      title={`Üst üste ${streak} hatasız kelime`}
    >
      <Flame className={cn("h-3.5 w-3.5", isFire && "fill-orange-400")} />
      {streak}
    </motion.span>
  );
}

function LivesPill({ lives }: { lives: number }) {
  // Toplam can sayısını dinamik hesapla (kolay modda 5 olabilir)
  const total = Math.max(START_LIVES, lives);
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={i < lives ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-all",
              i < lives ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.5)]" : "fill-slate-700 text-slate-700"
            )}
          />
        </motion.div>
      ))}
    </span>
  );
}
