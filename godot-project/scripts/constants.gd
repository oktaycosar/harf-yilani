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

# ----------------------------------------------------------------------------
# ENGEL SİSTEMİ
# ----------------------------------------------------------------------------
const OBSTACLES_START_LEVEL: int = 6
const OBSTACLES_MAX: int = 12

## Engel sayısını bölüme göre hesapla (üst sınır uygulanır)
static func get_obstacle_count(level: int) -> int:
		if level < OBSTACLES_START_LEVEL:
				return 0
		# 6-15: 2, 16-25: 4, 26-35: 6, 36-45: 8, 46+: 10
		if level < 16:
				return 2
		elif level < 26:
				return 4
		elif level < 36:
				return 6
		elif level < 46:
				return 8
		return 10

# ----------------------------------------------------------------------------
# BONUS HARF SİSTEMİ
# ----------------------------------------------------------------------------
const BONUS_LETTER_COUNT: int = 2
const BONUS_LETTER_VALUE: int = 25

# ----------------------------------------------------------------------------
# SÜRELİ BÖLÜM MODU
# ----------------------------------------------------------------------------
const TIMED_MODE_START_LEVEL: int = 16
const TIME_PER_LETTER_MS: int = 9000
const TIME_BONUS_THRESHOLD: float = 0.5
const TIME_BONUS_POINTS: int = 30

# ----------------------------------------------------------------------------
# BUZ ALANI SİSTEMİ
# ----------------------------------------------------------------------------
const ICE_ZONES_START_LEVEL: int = 10
const ICE_ZONE_COUNT: int = 3
const ICE_SLOW_FACTOR: float = 0.5

# ----------------------------------------------------------------------------
# HIZ ARTIRICI SİSTEM
# ----------------------------------------------------------------------------
const SPEED_BOOSTERS_START_LEVEL: int = 12
const SPEED_BOOSTER_COUNT: int = 1
const SPEED_BOOST_FACTOR: float = 1.8
const SPEED_BOOST_DURATION_MS: int = 4000
const SPEED_BOOST_POINTS: int = 15

# ----------------------------------------------------------------------------
# KOLAY MOD (çocuklar için)
# ----------------------------------------------------------------------------
const EASY_MODE_SPEED_MULTIPLIER: float = 0.6
const EASY_MODE_EXTRA_LIVES: int = 2
const EASY_MODE_NO_OBSTACLES: bool = true

# ----------------------------------------------------------------------------
# KATEGORİ SİSTEMİ
# ----------------------------------------------------------------------------
enum Category { KARISIK, HAYVANLAR, YIYECEKLER, ESYA, DOGA }

const CATEGORIES: Array = [
		{"id": Category.KARISIK, "key": "karisik", "label": "Karışık", "icon": "🎲"},
		{"id": Category.HAYVANLAR, "key": "hayvanlar", "label": "Hayvanlar", "icon": "🐱"},
		{"id": Category.YIYECEKLER, "key": "yiyecekler", "label": "Yiyecekler", "icon": "🍎"},
		{"id": Category.ESYA, "key": "esya", "label": "Eşyalar", "icon": "📦"},
		{"id": Category.DOGA, "key": "doga", "label": "Doğa", "icon": "🌳"},
]

## Category enum değerinden string key'e çevir
static func category_key(cat: int) -> String:
		for c in CATEGORIES:
				if c["id"] == cat:
						return c["key"]
		return "karisik"

## String key'den Category enum değerine çevir
static func category_from_key(key: String) -> int:
		for c in CATEGORIES:
				if c["key"] == key:
						return c["id"]
		return Category.KARISIK

# ----------------------------------------------------------------------------
# YILAN SKİN SİSTEMİ
# ----------------------------------------------------------------------------
# Her skin: id, name, emoji, headColor, tailColor, boostHead, boostTail,
# iceHead, iceTail, pupilColor (hex string olarak).
const SNAKE_SKINS: Array = [
		{
				"id": "emerald", "name": "Zümrüt", "emoji": "🐍",
				"headColor": "10b981", "tailColor": "022c22",
				"boostHead": "f59e0b", "boostTail": "78350f",
				"iceHead": "38bdf8", "iceTail": "082f49",
				"pupilColor": "0f172a",
		},
		{
				"id": "amber", "name": "Ateş", "emoji": "🔥",
				"headColor": "f59e0b", "tailColor": "78350f",
				"boostHead": "ef4444", "boostTail": "7f1d1d",
				"iceHead": "38bdf8", "iceTail": "082f49",
				"pupilColor": "1c1917",
		},
		{
				"id": "sky", "name": "Buz", "emoji": "❄️",
				"headColor": "38bdf8", "tailColor": "082f49",
				"boostHead": "f59e0b", "boostTail": "78350f",
				"iceHead": "818cf8", "iceTail": "1e1b4b",
				"pupilColor": "0c4a6e",
		},
		{
				"id": "rose", "name": "Gül", "emoji": "🌹",
				"headColor": "f43f5e", "tailColor": "4c0519",
				"boostHead": "f59e0b", "boostTail": "78350f",
				"iceHead": "38bdf8", "iceTail": "082f49",
				"pupilColor": "4c0519",
		},
		{
				"id": "purple", "name": "Mor", "emoji": "🔮",
				"headColor": "a855f7", "tailColor": "3b0764",
				"boostHead": "f59e0b", "boostTail": "78350f",
				"iceHead": "38bdf8", "iceTail": "082f49",
				"pupilColor": "3b0764",
		},
]

const DEFAULT_SKIN_ID: String = "emerald"

## ID'den skin bulur; yoksa varsayılan skin döner.
static func get_skin_by_id(id: String) -> Dictionary:
		for s in SNAKE_SKINS:
				if s["id"] == id:
						return s
		return SNAKE_SKINS[0]
