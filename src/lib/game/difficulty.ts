// ============================================================================
// Harf Yılanı — Zorluk Yöneticisi (DifficultyManager)
// ----------------------------------------------------------------------------
// Bölüm numarasına göre kelime uzunluğu ve hızı belirler.
// Sabitler constants.ts içindeki DIFFICULTY_TIERS kullanılır.
// ============================================================================

import {
  DIFFICULTY_TIERS,
  SPEED_MAX_MS,
  SPEED_MIN_MS,
  SPEED_STEP_MS,
  type DifficultyTier,
} from "./constants";
import { getWordsByLength } from "./wordDatabase";

export interface DifficultyInfo {
  tier: DifficultyTier;
  wordLength: number;
  /** Yılanın adım aralığı (ms) — düşük = hızlı */
  stepMs: number;
}

export function getDifficultyForLevel(level: number): DifficultyInfo {
  let tier = DIFFICULTY_TIERS[0];
  for (const t of DIFFICULTY_TIERS) {
    if (level >= t.minLevel && level <= t.maxLevel) {
      tier = t;
      break;
    }
  }

  // Hız: her bölümde biraz daha hızlı (SPEED_STEP_MS azalma), çarpılarak ayarlanır.
  const base = SPEED_MAX_MS - (level - 1) * SPEED_STEP_MS;
  const adjusted = base / tier.speedMultiplier;
  const stepMs = Math.max(SPEED_MIN_MS, Math.min(SPEED_MAX_MS, Math.round(adjusted)));

  return {
    tier,
    wordLength: tier.wordLength,
    stepMs,
  };
}

/** Bir bölümde aynı kelimeyi tekrar oynamamak için kullanılacak küçük kelime seçici */
export function pickWordForLevel(
  level: number,
  recentWords: string[],
  rng: () => number = Math.random
): { word: string; length: number } {
  const { wordLength } = getDifficultyForLevel(level);
  // Son oynanan kelimeleri ele
  let candidates: string[] = [];
  candidates = getWordsByLength(wordLength).filter((w) => !recentWords.includes(w));
  if (candidates.length === 0) candidates = getWordsByLength(wordLength);
  if (candidates.length === 0) {
    // Fallback: herhangi bir uzunluk
    return { word: "ADAM", length: 4 };
  }
  const word = candidates[Math.floor(rng() * candidates.length)];
  return { word, length: word.length };
}
