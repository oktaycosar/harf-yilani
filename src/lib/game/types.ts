// ============================================================================
// Harf Yılanı — Paylaşılan Tipler
// ============================================================================

export type Point = { x: number; y: number };

export type Direction = "up" | "down" | "left" | "right";

/** Hedef kelimedeki tek bir harf (oyun alanındaki obje) */
export interface LetterEntity {
  id: number;
  /** Grid x (sütun) */
  x: number;
  /** Grid y (satır) */
  y: number;
  /** Harfin kendisi (büyük) */
  char: string;
  /** Hedef kelimedeki sıra index'i (0'dan başlar) */
  orderIndex: number;
  /** Yenildi mi? */
  eaten: boolean;
  /** Hafif animasyon fazı (görünüm için) */
  phase: number;
}

/** Engel objesi (duvar/blok) — yılan çarpınca ölür */
export interface Obstacle {
  id: number;
  x: number;
  y: number;
  /** Şekil (görünüm için) */
  shape: "block" | "spike";
}

/** Bonus harf — altın yıldız, sıra dışı, ekstra puan */
export interface BonusLetter {
  id: number;
  x: number;
  y: number;
  /** Harf (rastgele Türkçe alfabe) */
  char: string;
  /** Puan değeri */
  value: number;
  /** Yenildi mi? */
  eaten: boolean;
  /** Animasyon fazı */
  phase: number;
}

export type GameStatus =
  | "menu"
  | "playing"
  | "paused"
  | "wrong_letter"
  | "level_complete"
  | "game_over"
  | "time_up";

/** Oyun anlık durumu (UI tarafından okunur) */
export interface GameSnapshot {
  status: GameStatus;
  level: number;
  lives: number;
  score: number;
  combo: number;
  maxCombo: number;
  targetWord: string;
  /** Şu an yememiz gereken harfin index'i */
  currentLetterIndex: number;
  /** Yenmemiş harfler (ekranda kalanlar dahil) */
  letters: LetterEntity[];
  /** Engel objeleri */
  obstacles: Obstacle[];
  /** Bonus harfler */
  bonusLetters: BonusLetter[];
  tierName: string;
  stepMs: number;
  /** Yılan */
  snake: Point[];
  direction: Direction;
  /** Bölüm süresi (ms) — 0 ise süreli mod kapalı */
  timeLimitMs: number;
  /** Kalan süre (ms) */
  timeRemainingMs: number;
  /** Son olay (UI feedback için) */
  lastEvent:
    | { kind: "none" }
    | { kind: "ate_correct"; char: string; index: number; combo: number; gained: number }
    | { kind: "ate_wrong"; char: string; expected: string }
    | { kind: "ate_bonus"; char: string; gained: number }
    | { kind: "word_complete"; word: string; bonus: number }
    | { kind: "self_collision" }
    | { kind: "wall_collision" }
    | { kind: "obstacle_collision" }
    | { kind: "time_up" };
}
