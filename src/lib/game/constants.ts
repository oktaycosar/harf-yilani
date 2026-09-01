// ============================================================================
// Harf Yılanı — Oyun Sabitleri
// ----------------------------------------------------------------------------
// Buradaki değerleri değiştirerek oyunun davranışını kolayca ayarlayabilirsiniz.
// ============================================================================

/** Oyun alanı (hücre sayısı) */
export const GRID_COLS = 26;
export const GRID_ROWS = 18;

/** Hücre piksel boyutu (canvas ölçeklemesi için başlangıç) */
export const CELL_SIZE = 32;

/** Yılanın başlangıç uzunluğu */
export const SNAKE_START_LENGTH = 3;

/** Başlangıç can sayısı */
export const START_LIVES = 3;

/** Doğru harf başına puan */
export const SCORE_PER_LETTER = 10;

/** Kelime tamamlandığında bonus puan */
export const SCORE_WORD_BONUS = 50;

/** Combo bonusu: her ekstra doğru harf için bonus = COMBO_BONUS * comboCount */
export const COMBO_BONUS = 5;

/** Bölüm tamamlandıktan sonra bekleme süresi (ms) */
export const LEVEL_COMPLETE_DELAY = 1800;

/** Hatalı harfte bekleme / yeniden deneme süresi (ms) */
export const WRONG_LETTER_DELAY = 1400;

// ----------------------------------------------------------------------------
// HIZ AYARLARI
// Her adımda yılanın hareket etme aralığı (ms). Düşük değer = daha hızlı.
// ----------------------------------------------------------------------------
export const SPEED_MAX_MS = 220; // en yavaş (1. bölüm)
export const SPEED_MIN_MS = 80; // en hızlı üst sınır
export const SPEED_STEP_MS = 6; // her bölümde bu kadar azalır

// ----------------------------------------------------------------------------
// ZORLUK KADEMELERİ
// ----------------------------------------------------------------------------
export interface DifficultyTier {
  id: number;
  name: string;
  minLevel: number;
  maxLevel: number;
  wordLength: number;
  /** 1.0 = normal, >1 daha hızlı, <1 daha yavaş */
  speedMultiplier: number;
  /** Aynı harften tekrarlananları yerleştirmek için karışıklık */
  tricky: boolean;
}

export const DIFFICULTY_TIERS: DifficultyTier[] = [
  { id: 1, name: "Başlangıç", minLevel: 1, maxLevel: 5, wordLength: 3, speedMultiplier: 0.85, tricky: false },
  { id: 2, name: "Kolay", minLevel: 6, maxLevel: 15, wordLength: 4, speedMultiplier: 0.95, tricky: false },
  { id: 3, name: "Orta", minLevel: 16, maxLevel: 25, wordLength: 4, speedMultiplier: 1.15, tricky: true },
  { id: 4, name: "Zor", minLevel: 26, maxLevel: 35, wordLength: 5, speedMultiplier: 1.1, tricky: false },
  { id: 5, name: "Çok Zor", minLevel: 36, maxLevel: 45, wordLength: 5, speedMultiplier: 1.35, tricky: true },
  { id: 6, name: "Uzman", minLevel: 46, maxLevel: 9999, wordLength: 6, speedMultiplier: 1.5, tricky: true },
];

/** Türkçe alfabesi (29 harf) — büyük harf, düzgün sıralama */
export const TURKISH_ALPHABET = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ" as const;
