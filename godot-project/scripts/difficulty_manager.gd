# ============================================================================
# DifficultyManager — Zorluk yöneticisi (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Bölüm numarasına göre kelime uzunluğu ve hız belirler.
# ============================================================================

class_name DifficultyManager
extends Node

const C = preload("res://scripts/constants.gd")


# {tier, word_length, step_sec}
func get_difficulty_for_level(level: int) -> Dictionary:
	var tier: Dictionary = C.DIFFICULTY_TIERS[0]
	for t in C.DIFFICULTY_TIERS:
		if level >= t["min_level"] and level <= t["max_level"]:
			tier = t
			break

	# Hız: her bölümde biraz daha hızlı
	var base: float = C.SPEED_MAX_SEC - (level - 1) * C.SPEED_STEP_SEC
	var adjusted: float = base / tier["speed_multiplier"]
	var step_sec: float = clampf(adjusted, C.SPEED_MIN_SEC, C.SPEED_MAX_SEC)

	return {
		"tier": tier,
		"word_length": tier["word_length"],
		"step_sec": step_sec,
	}


# Bir bölüm için kelime seç (son oynananları ele)
func pick_word_for_level(level: int, recent_words: Array, word_manager: Node) -> Dictionary:
	var diff: Dictionary = get_difficulty_for_level(level)
	var word: String = word_manager.get_random_word(diff["word_length"], recent_words)
	return {"word": word, "length": word.length()}
