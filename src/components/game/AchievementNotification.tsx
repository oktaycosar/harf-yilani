"use client";

// ============================================================================
// AchievementNotification — Yeni achievement açıldığında ekranda bildirim.
// Sağ üst köşede slide-in animasyonu, 4 saniye sonra kaybolur.
// ============================================================================

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Achievement } from "@/lib/game/storage";

interface Props {
  achievement: Achievement | null;
  onDismiss?: () => void;
}

export function AchievementNotification({ achievement, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed right-4 top-20 z-50 max-w-xs"
        >
          <div className="flex items-center gap-3 rounded-xl border-2 border-amber-400/50 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-2xl shadow-lg">
              {achievement.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                🏆 Başarım Açıldı!
              </div>
              <div className="truncate text-sm font-bold text-white">
                {achievement.title}
              </div>
              <div className="truncate text-[11px] text-slate-400">
                {achievement.description}
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
