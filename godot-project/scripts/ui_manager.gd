# ============================================================================
# UIManager — Üst bilgi çubuğu ve durum panelleri (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Control node'ları: LevelLabel, WordLabel, ScoreLabel, LivesLabel, MessageLabel
# GameManager sinyallerini dinler ve UI'ı günceller.
# ============================================================================

class_name UIManager
extends CanvasLayer

@onready var level_label: Label = %LevelLabel
@onready var word_label: Label = %WordLabel
@onready var score_label: Label = %ScoreLabel
@onready var lives_label: Label = %LivesLabel
@onready var message_label: Label = %MessageLabel
@onready var combo_label: Label = %ComboLabel
@onready var game_over_panel: Control = %GameOverPanel


func _ready() -> void:
	GameManager.score_changed.connect(_on_score_changed)
	GameManager.lives_changed.connect(_on_lives_changed)
	GameManager.level_changed.connect(_on_level_changed)
	GameManager.word_changed.connect(_on_word_changed)
	GameManager.status_changed.connect(_on_status_changed)
	GameManager.letter_correct.connect(_on_letter_correct)
	GameManager.letter_wrong.connect(_on_letter_wrong)
	GameManager.word_complete.connect(_on_word_complete)
	_update_word_display("", 0)


func _on_score_changed(s: int) -> void:
	score_label.text = "Skor: %d" % s


func _on_lives_changed(l: int) -> void:
	var hearts: String = ""
	for i in range(GameManager.C.START_LIVES):
		hearts += "♥ " if i < l else "♡ "
	lives_label.text = "Can: " + hearts


func _on_level_changed(lvl: int, tier: String) -> void:
	level_label.text = "Bölüm %d  •  %s" % [lvl, tier]


func _on_word_changed(word: String, idx: int) -> void:
	_update_word_display(word, idx)


func _on_status_changed(s: String) -> void:
	match s:
		"playing":
			message_label.text = ""
			game_over_panel.visible = false
		"wrong_letter":
			message_label.text = "YANLIŞ HARF!"
		"level_complete":
			message_label.text = "BÖLÜM TAMAMLANDI!"
		"game_over":
			message_label.text = "OYUN BİTTİ"
			game_over_panel.visible = true
		"paused":
			message_label.text = "DURAKLATILDI"
		"menu":
			message_label.text = ""
			game_over_panel.visible = false


func _on_letter_correct(_char: String, _index: int, combo: int, _gained: int) -> void:
	if combo > 1:
		combo_label.text = "COMBO ×%d" % combo
		combo_label.visible = true
	else:
		combo_label.visible = false


func _on_letter_wrong(_char: String, _expected: String) -> void:
	combo_label.visible = false


func _on_word_complete(_word: String, _bonus: int) -> void:
	combo_label.visible = false


# Hedef kelimeyi göster: yenmiş harfler görünür, diğerleri "_"
func _update_word_display(word: String, idx: int) -> void:
	if word.is_empty():
		word_label.text = "—"
		return
	var display: String = ""
	for i in range(word.length()):
		if i < idx:
			display += word[i]
		else:
			display += "_"
		if i < word.length() - 1:
			display += " "
	word_label.text = display


const C = preload("res://scripts/constants.gd")
