"use client";

// ============================================================================
// FloatingFeedback — Doğru harf, combo, yanlış harf anlık bildirimleri.
// ============================================================================

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Trophy } from "lucide-react";
import type { GameSnapshot } from "@/lib/game/types";

interface Props {
  snapshot: GameSnapshot;
}

export function FloatingFeedback({ snapshot }: Props) {
  const ev = snapshot.lastEvent;
  const show =
    snapshot.status === "playing" &&
    (ev.kind === "ate_correct" || ev.kind === "ate_wrong");

  let content: React.ReactNode = null;
  let key = "none";

  if (ev.kind === "ate_correct") {
    key = `ok-${ev.index}`;
    content = (
      <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-emerald-200 shadow-lg">
        <Sparkles className="h-4 w-4" />
        <span className="font-bold">+{ev.gained}</span>
        {ev.combo > 1 && (
          <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-200">
            COMBO ×{ev.combo}
          </span>
        )}
      </div>
    );
  } else if (ev.kind === "ate_wrong") {
    key = `wrong-${ev.char}-${ev.expected}`;
    content = (
      <div className="flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-rose-200 shadow-lg">
        <X className="h-4 w-4" />
        <span className="font-bold">Yanlış! {ev.char} ≠ {ev.expected}</span>
      </div>
    );
  } else if (ev.kind === "word_complete") {
    key = `word-${ev.word}`;
    content = (
      <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/30 px-5 py-2.5 text-emerald-100 shadow-lg">
        <Trophy className="h-5 w-5" />
        <span className="font-extrabold">KELİME TAMAMLANDI! +{ev.bonus}</span>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2">
      <AnimatePresence mode="wait">
        {show && content && (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: -16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
