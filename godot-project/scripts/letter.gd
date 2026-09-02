# ============================================================================
# Letter — Oyun alanındaki tek bir harf objesi (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Her harfin kendi order_index'i vardır. Aynı harften birden fazla olduğunda
# (örn. ADAM'da iki A, KAKA'da iki K ve iki A) sıra karışmaz.
# ============================================================================

class_name Letter
extends Area2D

@onready var _sprite: Sprite2D = $Sprite2D
@onready var _label: Label = $Label
@onready var _anim: AnimationPlayer = $AnimationPlayer

## Harfin kendisi (BÜYÜK)
var char: String = "A"
## Hedef kelimedeki sıra index'i (0'dan başlar)
var order_index: int = 0
## Hücre koordinatları
var grid_x: int = 0
var grid_y: int = 0
## Yenildi mi?
var eaten: bool = false

signal letter_eaten(letter: Letter)


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	# Görsel ayar
	_label.text = char
	_label.add_theme_font_size_override("font_size", 22)
	_label.add_theme_color_override("font_color", Color("3b1d04"))
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER


## Bu harfin "sıradaki hedef" olup olmadığını görsel olarak vurgula
func set_target_highlight(is_target: bool) -> void:
	if is_target:
		_sprite.modulate = Color("f59e0b")
		_anim.play("pulse")
	else:
		_sprite.modulate = Color("fbbf24")
		_anim.stop()


func consume() -> void:
	if eaten:
		return
	eaten = true
	letter_eaten.emit(self)
	_anim.play("vanish")
	await _anim.animation_finished
	queue_free()


func _on_body_entered(body: Node) -> void:
	# Snake gövdesi çarptığında GameManager event'i yönetir.
	# Burada yalnızca sinyal yayıyoruz; mantık GameManager'da.
	if body.is_in_group("snake_head"):
		letter_eaten.emit(self)
