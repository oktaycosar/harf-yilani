# ============================================================================
# Letter — Oyun alanındaki tek bir harf objesi (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Her harfin kendi order_index'i vardır. Aynı harften birden fazla olduğunda
# (örn. ADAM'da iki A, KAKA'da iki K ve iki A) sıra karışmaz.
# ============================================================================

class_name Letter
extends Area2D

const TEX_GOLD: Texture2D = preload("res://assets/ui/tile_gold.png")
const TEX_CREAM: Texture2D = preload("res://assets/ui/tile_normal.png")
const INK_TEXT: Color = Color("3b1d04")     # açık taş (altın/krem) üstüne koyu yazı

@onready var _sprite: Sprite2D = $Sprite2D
@onready var _label: Label = $Label
@onready var _anim: AnimationPlayer = $AnimationPlayer

## Bonus harf mi? (mor taş) — hedef kelimenin harfleri altın taştır.
## SIRADAKİ HEDEF harf mi? Taş ailesi buna göre seçilir:
##   true  -> ALTIN taş  (şu an yenmesi gereken harf)
##   false -> KREM taş   (sırası henüz gelmemiş harf)
var is_target_tile: bool = true
var _highlight_on: bool = false

## Harfin kendisi (BÜYÜK)
## Setter: harf ağaca eklendikten SONRA atansa bile etiket güncellenir.
var char: String = "A":
	set(value):
		char = value
		if is_node_ready() and _label != null:
			_label.text = value
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
	# Görsel ayar — harf taşı (mockup: yuvarlatılmış pixel-art tablet)
	_label.text = char
	_label.add_theme_font_size_override("font_size", 20)
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	set_family(is_target_tile)


## Taş ailesini seç: SIRADAKİ HEDEF harf = ALTIN, sırası gelmemiş harf = KREM.
## Seçenek 1 / mockup: tahtada TEK altın taş = "şu an yenecek harf", geri kalanı
## sakin krem taş. Böylece oyuncu neyi yiyeceğini bir bakışta görür.
## (Mor/pembe tamamen kaldırıldı; metin her iki ailede de koyu mürekkep.)
func set_family(is_target: bool) -> void:
	is_target_tile = is_target
	if _sprite != null:
		_sprite.texture = TEX_GOLD if is_target else TEX_CREAM
		_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if _label != null:
		_label.add_theme_color_override("font_color", INK_TEXT)


## Sıradaki hedef harf vurgusu — ÇOK hafif parıldama.
## (Durum değişmedikçe animasyonu yeniden başlatmaz: her karede çağrılabilir.)
func set_target_highlight(is_target: bool) -> void:
	if is_target == _highlight_on:
		return
	_highlight_on = is_target
	if is_target:
		_anim.play("pulse")
	else:
		_anim.stop()
		if _sprite != null:
			_sprite.modulate = Color(1, 1, 1, 1)


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
