# ============================================================================
# Harf Yılanı — Oyun Sabitleri (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Buradaki değerleri değiştirerek oyunun davranışını ayarlayabilirsiniz.
# Web (Next.js) sürümündeki constants.ts ile birebir aynı değerler.
# ============================================================================

class_name GameConstants
extends RefCounted

# Oyun alanı (hücre sayısı)
const GRID_COLS: int = 26
const GRID_ROWS: int = 18
const CELL_SIZE: int = 32

# Yılanın başlangıç uzunluğu
const SNAKE_START_LENGTH: int = 3

# Başlangıç can sayısı
const START_LIVES: int = 3

# Puanlama
const SCORE_PER_LETTER: int = 10
const SCORE_WORD_BONUS: int = 50
const COMBO_BONUS: int = 5

# Zamanlama (ms)
const LEVEL_COMPLETE_DELAY: float = 1.8
const WRONG_LETTER_DELAY: float = 1.4

# Hız ayarları (saniye cinsinden adım aralığı)
const SPEED_MAX_SEC: float = 0.22   # en yavaş
const SPEED_MIN_SEC: float = 0.08    # en hızlı
const SPEED_STEP_SEC: float = 0.006  # her bölümde azalma

# Türkçe alfabesi (29 harf)
const TURKISH_ALPHABET: String = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ"

# Zorluk kademeleri
# {min_level, max_level, word_length, speed_multiplier, tricky}
const DIFFICULTY_TIERS: Array = [
	{"id": 1, "name": "Başlangıç", "min_level": 1, "max_level": 5, "word_length": 3, "speed_multiplier": 0.85, "tricky": false},
	{"id": 2, "name": "Kolay", "min_level": 6, "max_level": 15, "word_length": 4, "speed_multiplier": 0.95, "tricky": false},
	{"id": 3, "name": "Orta", "min_level": 16, "max_level": 25, "word_length": 4, "speed_multiplier": 1.15, "tricky": true},
	{"id": 4, "name": "Zor", "min_level": 26, "max_level": 35, "word_length": 5, "speed_multiplier": 1.1, "tricky": false},
	{"id": 5, "name": "Çok Zor", "min_level": 36, "max_level": 45, "word_length": 5, "speed_multiplier": 1.35, "tricky": true},
	{"id": 6, "name": "Uzman", "min_level": 46, "max_level": 99999, "word_length": 6, "speed_multiplier": 1.5, "tricky": true},
]
