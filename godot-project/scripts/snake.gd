# ============================================================================
# Snake — Yılan gövdesi ve hareket sistemi (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Klasik Snake hareketi. Grid tabanlı adımlar. Duvara/kendine çarpma kontrolü.
# Doğru harf yendiğinde uzar.
# ============================================================================

class_name Snake
extends Node2D

const C = preload("res://scripts/constants.gd")

# Yön vektörleri
const DIR_UP: Vector2i = Vector2i(0, -1)
const DIR_DOWN: Vector2i = Vector2i(0, 1)
const DIR_LEFT: Vector2i = Vector2i(-1, 0)
const DIR_RIGHT: Vector2i = Vector2i(1, 0)

signal moved(head_cell: Vector2i)
signal wall_collision()
signal self_collision()
signal ate_letter(letter: Letter)

# Gövde hücreleri [head, ...] Vector2i dizisi
var body: Array[Vector2i] = []
var direction: Vector2i = DIR_RIGHT
var _pending_direction: Vector2i = DIR_RIGHT
var _grow_pending: int = 0

# Sınırlar
var cols: int = C.GRID_COLS
var rows: int = C.GRID_ROWS

# Görsel kökler (runtime'da oluşturulur)
var _head: ColorRect = null
var _segments_node: Node2D = null


func _ready() -> void:
	_segments_node = Node2D.new()
	_segments_node.name = "Segments"
	add_child(_segments_node)


func reset(start_cell: Vector2i, length: int, dir: Vector2i) -> void:
	body.clear()
	direction = dir
	_pending_direction = dir
	_grow_pending = 0
	for i in range(length):
		body.append(start_cell - dir * i)
	_redraw()


func set_direction(dir: Vector2i) -> void:
	# Ters yöne dönüşü engelle (anında ölümü önler)
	if dir == -direction:
		return
	_pending_direction = dir


## Tek adım ilerle. letters: ekrandaki harf objeleri (Letter).
func step(letters: Array) -> void:
	direction = _pending_direction
	var head: Vector2i = body[0] + direction

	# Duvar kontrolü
	if head.x < 0 or head.y < 0 or head.x >= cols or head.y >= rows:
		wall_collision.emit()
		return

	# Büyüyecek mi? (harf yiyeceksek kuyruk kalkmaz)
	var will_grow: bool = false
	for l in letters:
		if not l.eaten and l.grid_x == head.x and l.grid_y == head.y and l.order_index == _current_target_index(letters):
			will_grow = true
			break

	# Kendine çarpma kontrolü (büyüyeceksek tüm gövde, değilsek kuyruk hariç)
	var check_body: Array = body if will_grow else body.slice(0, body.size() - 1)
	for seg in check_body:
		if seg == head:
			self_collision.emit()
			return

	# Hareket
	body.push_front(head)

	# Harf kontrolü
	var eaten_letter: Letter = null
	for l in letters:
		if not l.eaten and l.grid_x == head.x and l.grid_y == head.y:
			eaten_letter = l
			break

	if eaten_letter != null:
		# Doğru/yanlış kontrolü GameManager'da; burada sinyal yayıyoruz.
		ate_letter.emit(eaten_letter)
		# Doğru harfse büyü (GameManager ate_letter sinyalini dinleyip karar verir).
		# Basit prototip: doğruysa büyü (kuyruğu silme), yanlışsa sil.
		# (Detaylı kontrol GameManager'da; burada görsel güncelleme yapılır.)
		_grow_pending += 1
	# Kuyruk silme mantığı
	if _grow_pending > 0:
		_grow_pending -= 1
	else:
		body.pop_back()

	moved.emit(head)
	_redraw()


## Mevcut hedef harfin order_index'ini döndür (GameManager ile senkron tutulur).
func _current_target_index(_letters: Array) -> int:
	# Prototip: GameManager bu bilgiyi set eder. Basit tutuyoruz.
	# Gerçek uygulamada GameManager, snake'e hedef index'i set eder.
	# Burada basitlik için 0 dönüyoruz; GameManager override eder.
	return 0


func grow(amount: int = 1) -> void:
	_grow_pending += amount


func _redraw() -> void:
	for child in _segments_node.get_children():
		child.queue_free()
	for i in range(body.size()):
		var cell: Vector2i = body[i]
		var rect: ColorRect = ColorRect.new()
		rect.size = Vector2(C.CELL_SIZE - 4, C.CELL_SIZE - 4)
		rect.position = Vector2(cell.x * C.CELL_SIZE + 2, cell.y * C.CELL_SIZE + 2)
		if i == 0:
			# Baş
			rect.color = Color("10b981")
		else:
			var t: float = float(i) / float(max(1, body.size() - 1))
			rect.color = Color("047857").lerp(Color("022c22"), t)
		_segments_node.add_child(rect)
