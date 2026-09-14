# ============================================================================
# Harf Yılanı — Oyun Sabitleri (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Buradaki değerleri değiştirerek oyunun davranışını ayarlayabilirsiniz.
# Web (Next.js) sürümündeki constants.ts ile birebir aynı değerler.
# ============================================================================

class_name GameConstants
extends RefCounted

# Oyun alanı (hücre sayısı)
# 26x18 -> 24x17 (14.09.2026): tahta taş çerçeveyle çevrildi. Çerçeve 40px
# kalınlıkta ve tahta tam ortada: 24*36=864 ve 17*36=612 ->
# GameArea (48,104), çerçeve dış kenarı x 8..952 / y 64..756 (bkz. frame_bg.png)
const GRID_COLS: int = 24
const GRID_ROWS: int = 17
const CELL_SIZE: int = 36

# Tahta taş çerçevesinin kalınlığı (px) — frame_bg.png ile birebir aynı olmalı
const FRAME_BAND: int = 40

# Yılanın başlangıç uzunluğu
const SNAKE_START_LENGTH: int = 3

# YILAN UZUNLUĞU = ZORLUK GÖSTERGESİ
# Uzunluk her bölümde kalıcı olarak artar (zorluk rampası) ve tahtayı
# kullanılamaz hale getirmemesi için üst sınırı vardır.
const SNAKE_LENGTH_PER_LEVEL: int = 1
const SNAKE_LENGTH_CAP: int = 30   # tahta 26x18 = 468 hücre -> %6.4 (güvenli)

# BÖLÜM İÇİ GEÇİCİ BÜYÜME (ödül hissi)
# Oyuncu kelime içinde her doğru harfte büyüme beklemez; büyüme "harf başına"
# değil kelime uzunluğuna göre seyrekleşir. Böylece uzun kelimede yılan
# makarnaya dönmez. Bölüm başında yılan taban uzunluğuna döner.
const SNAKE_IN_LEVEL_GROWTH_MAX: int = 4

# Kaç doğru harfte +1 segment? (kelime uzunluğuna göre)
#   3-4 harf -> her doğru harfte 1  (kısa kelime, mekanik öğrenilirken)
#   5 harf   -> 2 harfte bir 1
#   6+ harf  -> 3 harfte bir 1
const SNAKE_GROW_EVERY: Array = [
		{"max_len": 4, "every": 1},
		{"max_len": 5, "every": 2},
		{"max_len": 999, "every": 3},
]

# Kelime tamamlanınca ekstra büyüme (bitirme her zaman görünür ödül verir)
const SNAKE_WORD_COMPLETE_GROWTH: int = 1

## Kelime uzunluğuna göre "kaç doğru harfte +1 segment" kuralı.
static func grow_every_for_len(word_len: int) -> int:
		for rule in SNAKE_GROW_EVERY:
				if word_len <= int(rule["max_len"]):
						return int(rule["every"])
		return int(SNAKE_GROW_EVERY[SNAKE_GROW_EVERY.size() - 1]["every"])

## Bölümün kademesine göre kelime bitirme bonusu.
static func tier_word_bonus(level: int) -> int:
		for t in DIFFICULTY_TIERS:
				if level >= int(t["min_level"]) and level <= int(t["max_level"]):
						return int(t.get("word_bonus", SCORE_WORD_BONUS))
		return SCORE_WORD_BONUS

# Duvarlar öldürsün mü?
# true  -> yılan duvara çarpınca ÖLMEZ, kenardan geçip karşı taraftan çıkar
# false -> duvara çarpınca can kaybeder (klasik mod)
const WRAP_WALLS: bool = true

# Başlangıç can sayısı
const START_LIVES: int = 3

# Puanlama
const SCORE_PER_LETTER: int = 10
const SCORE_WORD_BONUS: int = 50   # kademede word_bonus yoksa yedek
const SCORE_FLAWLESS_BONUS: int = 20   # kelimeyi hiç yanlışsız bitirme
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
# {min_level, max_level, word_length, speed_multiplier, tricky, hide_word, word_bonus}
# hide_word: hedef sözcük üst çubukta gizlensin mi?
#   false → sözcük görünür (ilk etaplar), true → harfler "_" ile maskelenir
# word_bonus: kelime tamamlama puanı (kolayda küçük, zorda büyük)
const DIFFICULTY_TIERS: Array = [
		{"id": 1, "name": "Başlangıç", "min_level": 1, "max_level": 5, "word_length": 3, "speed_multiplier": 0.85, "tricky": false, "hide_word": false, "word_bonus": 20},
		{"id": 2, "name": "Kolay", "min_level": 6, "max_level": 15, "word_length": 4, "speed_multiplier": 0.95, "tricky": false, "hide_word": false, "word_bonus": 20},
		{"id": 3, "name": "Orta", "min_level": 16, "max_level": 25, "word_length": 4, "speed_multiplier": 1.15, "tricky": true, "hide_word": false, "word_bonus": 35},
		{"id": 4, "name": "Zor", "min_level": 26, "max_level": 35, "word_length": 5, "speed_multiplier": 1.1, "tricky": false, "hide_word": false, "word_bonus": 50},
		{"id": 5, "name": "Çok Zor", "min_level": 36, "max_level": 45, "word_length": 5, "speed_multiplier": 1.35, "tricky": true, "hide_word": false, "word_bonus": 75},
		{"id": 6, "name": "Uzman", "min_level": 46, "max_level": 60, "word_length": 6, "speed_multiplier": 1.5, "tricky": true, "hide_word": false, "word_bonus": 75},
		{"id": 7, "name": "Efsane", "min_level": 61, "max_level": 99999, "word_length": 7, "speed_multiplier": 1.6, "tricky": true, "hide_word": false, "word_bonus": 100},
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
# YILDIZ ÖDÜLÜ — HER 15 YILDIZDA 1 KUYRUK DÜŞER
# ----------------------------------------------------------------------------
# Sayaç KOŞU boyunca birikir (bölüm geçişinde sıfırlanmaz; yeni oyunda sıfırlanır).
# Bölüm başına sadece 2 yıldız çıktığı için tek bölümde 15'e ulaşmak imkânsız —
# ödül "yıldız biriktirme" mekaniğidir.
# ÖNEMLİ: yıldız ARTIK UZATMAZ. Bu oyunda uzunluk avataj değil: kendine çarpma
# ölümle bittiği için uzamak CEZAdır. Yıldızın ödülü: +puan ve kuyruk düşmesi.
const STARS_PER_TAIL_DROP: int = 15
const SNAKE_MIN_LENGTH: int = 2      # kuyruk düşürmede alt sınır (kafa + kuyruk)

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
		{"id": Category.KARISIK, "key": "karisik", "label": "Karışık", "icon": "★"},
		{"id": Category.HAYVANLAR, "key": "hayvanlar", "label": "Hayvanlar", "icon": "♥"},
		{"id": Category.YIYECEKLER, "key": "yiyecekler", "label": "Yiyecekler", "icon": "•"},
		{"id": Category.ESYA, "key": "esya", "label": "Eşyalar", "icon": "§"},
		{"id": Category.DOGA, "key": "doga", "label": "Doğa", "icon": "¶"},
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
				"id": "emerald", "name": "Zümrüt", "emoji": "★",
				"headColor": "78e028", "tailColor": "1d7a12",
				"boostHead": "f59e0b", "boostTail": "78350f",
				"iceHead": "38bdf8", "iceTail": "082f49",
				"pupilColor": "0f172a",
		},
		{
				"id": "amber", "name": "Ateş", "emoji": "†",
				"headColor": "f59e0b", "tailColor": "78350f",
				"boostHead": "ef4444", "boostTail": "7f1d1d",
				"iceHead": "38bdf8", "iceTail": "082f49",
				"pupilColor": "1c1917",
		},
		{
				"id": "sky", "name": "Buz", "emoji": "*",
				"headColor": "38bdf8", "tailColor": "082f49",
				"boostHead": "f59e0b", "boostTail": "78350f",
				"iceHead": "818cf8", "iceTail": "1e1b4b",
				"pupilColor": "0c4a6e",
		},
		{
				"id": "rose", "name": "Gül", "emoji": "«",
				"headColor": "f43f5e", "tailColor": "4c0519",
				"boostHead": "f59e0b", "boostTail": "78350f",
				"iceHead": "38bdf8", "iceTail": "082f49",
				"pupilColor": "4c0519",
		},
		{
				"id": "purple", "name": "Mor", "emoji": "»",
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
