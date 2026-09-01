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

export type GameStatus =
  | "menu"
  | "playing"
  | "paused"
  | "wrong_letter"
  | "level_complete"
  | "game_over";

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
  tierName: string;
  stepMs: number;
  /** Yılan */
  snake: Point[];
  direction: Direction;
  /** Son olay (UI feedback için) */
  lastEvent:
    | { kind: "none" }
    | { kind: "ate_correct"; char: string; index: number; combo: number; gained: number }
    | { kind: "ate_wrong"; char: string; expected: string }
    | { kind: "word_complete"; word: string; bonus: number }
    | { kind: "self_collision" }
    | { kind: "wall_collision" };
}
