// ============================================================================
// Harf Yılanı — Zorluk Yöneticisi (DifficultyManager)
// ----------------------------------------------------------------------------
// Bölüm numarasına göre kelime uzunluğu, hızı, engel sayısı ve süreli mod
// belirler. Sabitler constants.ts içindeki DIFFICULTY_TIERS kullanılır.
// ============================================================================

import {
  DIFFICULTY_TIERS,
  SPEED_MAX_MS,
  SPEED_MIN_MS,
  SPEED_STEP_MS,
  getObstacleCount,
  TIMED_MODE_START_LEVEL,
  TIME_PER_LETTER_MS,
  type DifficultyTier,
} from "./constants";
import { getWordsByLength, type Category } from "./wordDatabase";

export interface DifficultyInfo {
  tier: DifficultyTier;
  wordLength: number;
  /** Yılanın adım aralığı (ms) — düşük = hızlı */
  stepMs: number;
  /** Engel sayısı */
  obstacleCount: number;
  /** Süreli mod aktif mi? */
  timed: boolean;
  /** Bölüm süre limiti (ms) — 0 ise süre yok */
  timeLimitMs: number;
}

export function getDifficultyForLevel(level: number): DifficultyInfo {
  let tier = DIFFICULTY_TIERS[0];
  for (const t of DIFFICULTY_TIERS) {
    if (level >= t.minLevel && level <= t.maxLevel) {
      tier = t;
      break;
    }
  }

  const base = SPEED_MAX_MS - (level - 1) * SPEED_STEP_MS;
  const adjusted = base / tier.speedMultiplier;
  const stepMs = Math.max(SPEED_MIN_MS, Math.min(SPEED_MAX_MS, Math.round(adjusted)));

  const obstacleCount = getObstacleCount(level);
  const timed = level >= TIMED_MODE_START_LEVEL;
  const timeLimitMs = timed ? tier.wordLength * TIME_PER_LETTER_MS : 0;

  return {
    tier,
    wordLength: tier.wordLength,
    stepMs,
    obstacleCount,
    timed,
    timeLimitMs,
  };
}

/** Bir bölümde aynı kelimeyi tekrar oynamamak için kullanılacak küçük kelime seçici */
export function pickWordForLevel(
  level: number,
  recentWords: string[],
  category: Category = "karisik",
  rng: () => number = Math.random
): { word: string; length: number } {
  const { wordLength } = getDifficultyForLevel(level);
  let candidates: string[] = getWordsByLength(wordLength, category).filter(
    (w) => !recentWords.includes(w)
  );
  if (candidates.length === 0) candidates = getWordsByLength(wordLength, category);
  if (candidates.length === 0) {
    return { word: "ADAM", length: 4 };
  }
  const word = candidates[Math.floor(rng() * candidates.length)];
  return { word, length: word.length };
}
