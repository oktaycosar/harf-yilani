"use client";

// ============================================================================
// WeeklyGoalNotification — Haftalık hedef tamamlandığında bildirim.
// Tam ekran amber flash + "Haftalık Hedef Tamamlandı!" yazısı + bonus.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy } from "lucide-react";

interface Props {
  show: boolean;
  bonus: number;
}

export function WeeklyGoalNotification({ show, bonus }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Tam ekran amber/green flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, times: [0, 0.3, 1] }}
            className="pointer-events-none fixed inset-0 z-[60] bg-gradient-to-br from-emerald-500/30 via-amber-500/20 to-transparent"
          />
          {/* Merkez bildirim */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: -30 }}
            animate={{ scale: [0.5, 1.1, 1], opacity: [0, 1, 1, 0], y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 5, times: [0, 0.1, 0.85, 1] }}
            className="pointer-events-none fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-amber-400/60 bg-slate-900/95 px-8 py-6 shadow-[0_0_40px_rgba(251,191,36,0.5)] backdrop-blur-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                  🎯 Haftalık Hedef
                </div>
                <div className="mt-1 text-2xl font-extrabold text-white">
                  Tamamlandı!
                </div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-emerald-300">
                  <Trophy className="h-4 w-4" />
                  +{bonus} bonus puan kazandın!
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
