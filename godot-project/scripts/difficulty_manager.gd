# ============================================================================
# DifficultyManager — Zorluk yöneticisi (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Bölüm numarasına göre kelime uzunluğu, hız, engel sayısı ve süreli mod
# bilgisini döndürür. Kolay modu ve kategori seçimini hesaba katar.
# ============================================================================

class_name DifficultyManager
extends Node

const C = preload("res://scripts/constants.gd")


## {tier, word_length, step_sec, obstacle_count, timed, time_limit_ms}
func get_difficulty_for_level(level: int, easy_mode: bool = false) -> Dictionary:
                var tier: Dictionary = C.DIFFICULTY_TIERS[0]
                for t in C.DIFFICULTY_TIERS:
                                if level >= t["min_level"] and level <= t["max_level"]:
                                                tier = t
                                                break

                # Hız: her bölümde biraz daha hızlı
                var base: float = C.SPEED_MAX_SEC - (level - 1) * C.SPEED_STEP_SEC
                var adjusted: float = base / tier["speed_multiplier"]
                # Kolay mod: daha yavaş
                if easy_mode:
                                adjusted = adjusted / C.EASY_MODE_SPEED_MULTIPLIER
                var step_sec: float = clampf(adjusted, C.SPEED_MIN_SEC, C.SPEED_MAX_SEC)

                # Engel sayısı: kolay modda engel yok
                var obstacle_count: int = 0
                if not easy_mode or not C.EASY_MODE_NO_OBSTACLES:
                                obstacle_count = C.get_obstacle_count(level)

                # Süreli mod: kolay modda kapalı
                var timed: bool = false
                var time_limit_ms: int = 0
                if not easy_mode and level >= C.TIMED_MODE_START_LEVEL:
                                timed = true
                                time_limit_ms = tier["word_length"] * C.TIME_PER_LETTER_MS

                return {
                                "tier": tier,
                                "word_length": tier["word_length"],
                                "step_sec": step_sec,
                                "obstacle_count": obstacle_count,
                                "timed": timed,
                                "time_limit_ms": time_limit_ms,
                }


## Bir bölüm için kelime seç (son oynananları ele; kategoriye göre).
func pick_word_for_level(level: int, recent_words: Array, word_manager: Node,
                                category: int = C.Category.KARISIK) -> Dictionary:
                var diff: Dictionary = get_difficulty_for_level(level)
                var word: String = word_manager.get_random_word(diff["word_length"], category, recent_words)
                return {"word": word, "length": word.length()}


## Günlük challenge için kelime — tarihe göre deterministik.
func pick_daily_word(word_manager: Node) -> String:
                var candidates: Array = [
                                "ADAM", "MASA", "ELMA", "KAPI", "BABA", "KALEM", "ÇİÇEK", "BALIK",
                                "DENİZ", "YILAN", "KÖPRÜ", "GÜNEŞ", "KİTAP", "ÇANTA", "BULUT",
                ]
                var seed_val: int = _date_seed(_today_key())
                return candidates[seed_val % candidates.size()]


## YYYY-MM-DD formatında bugünün tarih anahtarı (yerel saat)
func _today_key() -> String:
                var d: Dictionary = Time.get_datetime_dict_from_system()
                return "%04d-%02d-%02d" % [d["year"], d["month"], d["day"]]


## Date'ten seed üret (günlük deterministik kelime için)
func _date_seed(date_key: String) -> int:
                var h: int = 0
                for i in range(date_key.length()):
                                h = (h * 31 + date_key.unicode_at(i)) & 0xFFFFFFFF
                return h
