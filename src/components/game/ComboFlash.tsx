"use client";

// ============================================================================
// ComboFlash — Combo x5+ ulaştığında ekran parıltısı.
// Combo her 5'in katına ulaştığında kısa amber flash + "COMBO x5!" yazısı.
// Görünürlük props'tan türetilir; setState-in-effect'ten kaçınılır.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface Props {
  combo: number;
  status: string;
}

export function ComboFlash({ combo, status }: Props) {
  // Combo tam 5'in katı VE en az 5 ise flash göster
  const shouldFlash = status === "playing" && combo >= 5 && combo % 5 === 0;

  return (
    <AnimatePresence>
      {shouldFlash && (
        <ComboFlashInstance key={combo} milestone={combo} />
      )}
    </AnimatePresence>
  );
}

function ComboFlashInstance({ milestone }: { milestone: number }) {
  return (
    <>
      {/* Tam ekran amber flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, times: [0, 0.3, 1] }}
        className="pointer-events-none absolute inset-0 z-25 rounded-xl bg-gradient-to-br from-amber-400/40 via-amber-500/20 to-transparent"
      />
      {/* "COMBO x5!" yazısı */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: -20 }}
        animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 1, 0], y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2, times: [0, 0.2, 0.7, 1] }}
        className="pointer-events-none absolute left-1/2 top-1/3 z-26 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="flex items-center gap-2 rounded-full border-2 border-amber-400 bg-amber-500/30 px-5 py-2.5 shadow-[0_0_25px_rgba(251,191,36,0.6)] backdrop-blur-sm">
          <Zap className="h-6 w-6 fill-amber-300 text-amber-200" />
          <span className="text-2xl font-extrabold tracking-wider text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            COMBO ×{milestone}!
          </span>
        </div>
      </motion.div>
    </>
  );
}
