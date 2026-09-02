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

// ----------------------------------------------------------------------------
// ENGEL SİSTEMİ
// ----------------------------------------------------------------------------
/** Engellerin başladığı bölüm (öncesi engelsiz) */
export const OBSTACLES_START_LEVEL = 6;

/** Engel sayısını bölüme göre hesapla (üst sınır uygulanır) */
export function getObstacleCount(level: number): number {
  if (level < OBSTACLES_START_LEVEL) return 0;
  // 6-15: 2, 16-25: 4, 26-35: 6, 36-45: 8, 46+: 10
  const tier = level < 16 ? 2 : level < 26 ? 4 : level < 36 ? 6 : level < 46 ? 8 : 10;
  return tier;
}

/** Engel üst sınırı (oyun alanını tıkamamak için) */
export const OBSTACLES_MAX = 12;

// ----------------------------------------------------------------------------
// BONUS HARF SİSTEMİ
// ----------------------------------------------------------------------------
/** Bonus harf sayısı (bölüm başına) */
export const BONUS_LETTER_COUNT = 2;

/** Bonus harf puan değeri */
export const BONUS_LETTER_VALUE = 25;

// ----------------------------------------------------------------------------
// SÜRELİ BÖLÜM MODU
// ----------------------------------------------------------------------------
/** Süreli modun başladığı bölüm */
export const TIMED_MODE_START_LEVEL = 16;

/** Kelime uzunluğu başına süre (ms). Örn. 4 harfli kelimede 4 * 8 sn = 32 sn. */
export const TIME_PER_LETTER_MS = 9000;

/** Süre dolduğunda ekstra can eşiği (kal süre > %50 ise bölüm tamamlanınca +0, yoksa uyarı) */
export const TIME_BONUS_THRESHOLD = 0.5;

/** Kalan süre yüzdesi > eşiği geçerse ekstra puan */
export const TIME_BONUS_POINTS = 30;

// ----------------------------------------------------------------------------
// BUZ ALANI SİSTEMİ
// ----------------------------------------------------------------------------
/** Buz alanlarının başladığı bölüm */
export const ICE_ZONES_START_LEVEL = 10;

/** Buz alanı sayısı (sabit) */
export const ICE_ZONE_COUNT = 3;

/** Buz üzerinde yavaşlama çarpanı (0.5 = yarım hız) */
export const ICE_SLOW_FACTOR = 0.5;

// ----------------------------------------------------------------------------
// HIZ ARTIRICI SİSTEMİ
// ----------------------------------------------------------------------------
/** Hız artırıcıların başladığı bölüm */
export const SPEED_BOOSTERS_START_LEVEL = 12;

/** Hız artırıcı sayısı (bölüm başına) */
export const SPEED_BOOSTER_COUNT = 1;

/** Boost çarpanı (2.0 = 2x hız) */
export const SPEED_BOOST_FACTOR = 1.8;

/** Boost süresi (ms) */
export const SPEED_BOOST_DURATION_MS = 4000;

/** Boost toplama puanı */
export const SPEED_BOOST_POINTS = 15;

// ----------------------------------------------------------------------------
// KOLAY MOD (çocuklar için)
// ----------------------------------------------------------------------------
/** Kolay mod hız çarpanı (daha yavaş) */
export const EASY_MODE_SPEED_MULTIPLIER = 0.6;

/** Kolay mod ekstra can */
export const EASY_MODE_EXTRA_LIVES = 2;

/** Kolay mod engel yok mu? */
export const EASY_MODE_NO_OBSTACLES = true;


