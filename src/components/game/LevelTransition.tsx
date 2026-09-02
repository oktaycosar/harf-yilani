"use client";

// ============================================================================
// LevelTransition — Bölüm geçişinde kısa fade/sweep animasyonu.
// Level değiştiğinde "BÖLÜM N" yazısı ekranda belirir ve kaybolur.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  level: number;
  tierName: string;
  status: string;
}

export function LevelTransition({ level, tierName, status }: Props) {
  // Yalnızca playing durumuna geçişte ve level > 1 ise göster
  const show = status === "playing" && level > 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={level}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, times: [0, 0.15, 0.7, 1] }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-2">
            <motion.div
              initial={{ scale: 0.5, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="rounded-2xl border-2 border-emerald-500/40 bg-slate-900/80 px-8 py-4 shadow-2xl backdrop-blur-md"
            >
              <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                {tierName}
              </div>
              <div className="text-3xl font-extrabold tracking-tight text-white">
                Bölüm {level}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
