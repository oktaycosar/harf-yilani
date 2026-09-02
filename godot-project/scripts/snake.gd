# ============================================================================
# Snake — Yılan gövdesi ve hareket sistemi (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Klasik Snake hareketi. Grid tabanlı adımlar. Duvar/kendine/engel çarpışma.
# Doğru harf yendiğinde uzar, bonus harf + hız artırıcı da benzer şekilde.
# Buz alanı üzerine gelince yavaşlar, hız artırıcı yiyince geçici hızlanır.
# Web sürümündeki snakeEngine.ts ile birebir mantık.
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
signal obstacle_collision()
signal ate_letter(letter: Dictionary)
signal ate_bonus(char: String, gained: int)
signal boost_collected(gained: int)
signal ice_entered()

# Gövde hücreleri [head, ...] Vector2i dizisi
var body: Array[Vector2i] = []
var direction: Vector2i = DIR_RIGHT
var _pending_direction: Vector2i = DIR_RIGHT
var _grow_pending: int = 0

# Sınırlar
var cols: int = C.GRID_COLS
var rows: int = C.GRID_ROWS

# --- Yeni oyun mekaniği durumları ---
# LetterEntity: { id, x, y, char, order_index, eaten, phase }
var letters: Array = []
# Obstacle: { id, x, y, shape }  shape: "block" | "spike"
var obstacles: Array = []
# BonusLetter: { id, x, y, char, value, eaten, phase }
var bonus_letters: Array = []
# IceZone: { id, x, y, slow_factor }
var ice_zones: Array = []
# SpeedBooster: { id, x, y, boost_factor, eaten, phase }
var speed_boosters: Array = []

# Aktif boost bitiş zamanı (Time.get_ticks_msec() ile; 0 = boost yok)
var boost_end_time: int = 0
# Bu tick'te buz üzerinde miyiz?
var on_ice: bool = false

# Aktif skin (Dictionary; constants.gd SNAKE_SKINS'ten)
var skin: Dictionary = {}

# Görsel kökler (runtime'da oluşturulur)
var _segments_node: Node2D = null

# Bir sonraki hedef harfin order_index'i (GameManager ile senkron)
var current_target_index: int = 0


func _ready() -> void:
                _segments_node = Node2D.new()
                _segments_node.name = "Segments"
                add_child(_segments_node)
                if skin.is_empty():
                                skin = C.get_skin_by_id(C.DEFAULT_SKIN_ID)


func reset(start_cell: Vector2i, length: int, dir: Vector2i) -> void:
                body.clear()
                direction = dir
                _pending_direction = dir
                _grow_pending = 0
                for i in range(length):
                                body.append(start_cell - dir * i)
                boost_end_time = 0
                on_ice = false
                _redraw()


func set_direction(dir: Vector2i) -> void:
                # Ters yöne dönüşü engelle (anında ölümü önler)
                if dir == -direction:
                                return
                _pending_direction = dir


## Aktif hız çarpanı (boost + ice etkisiyle).
func get_active_speed_multiplier() -> float:
                var mult: float = 1.0
                if boost_end_time > 0 and Time.get_ticks_msec() < boost_end_time:
                                mult *= C.SPEED_BOOST_FACTOR
                if on_ice:
                                mult *= C.ICE_SLOW_FACTOR
                return mult


## Boost bitiş zamanını güncelle (süresi dolduysa sıfırla).
func update_boost() -> void:
                if boost_end_time > 0 and Time.get_ticks_msec() >= boost_end_time:
                                boost_end_time = 0


## Boost için kalan ms (UI göstergesi için).
func boost_remaining_ms() -> int:
                if boost_end_time <= 0:
                                return 0
                return max(0, boost_end_time - Time.get_ticks_msec())


# --------------------------------------------------------------------------
# Yerleştirme metotları
# --------------------------------------------------------------------------
func clear_entities() -> void:
                letters.clear()
                obstacles.clear()
                bonus_letters.clear()
                ice_zones.clear()
                speed_boosters.clear()
                current_target_index = 0


## Hedef kelimenin her harfi için bir obje oluştur ve rastgele yerleştir.
func place_letters(word: String, tricky: bool) -> void:
                var occupied: Dictionary = {}
                for seg in body:
                                occupied[_key(seg)] = true
                # Yılanın önündeki 3 hücreyi de boş bırak (ilk hareket güvenliği)
                var head: Vector2i = body[0]
                for i in range(1, 4):
                                occupied[_key(Vector2i(head.x + i, head.y))] = true

                var free_cells: Array = []
                for y in range(1, rows - 1):
                                for x in range(1, cols - 1):
                                                var c: Vector2i = Vector2i(x, y)
                                                if not occupied.has(_key(c)):
                                                                free_cells.append(c)
                free_cells.shuffle()

                var entities: Array = []
                for i in range(word.length()):
                                entities.append({
                                                "id": i, "x": 0, "y": 0,
                                                "char": word[i], "order_index": i, "eaten": false,
                                                "phase": randf() * TAU,
                                })

                if tricky:
                                _place_tricky(entities, free_cells)
                else:
                                for e in entities:
                                                if free_cells.is_empty():
                                                                break
                                                var c: Vector2i = free_cells.pop_back()
                                                e["x"] = c.x
                                                e["y"] = c.y
                letters = entities


func _place_tricky(entities: Array, free_cells: Array) -> void:
                if free_cells.is_empty() or entities.is_empty():
                                return
                var first_idx: int = randi() % free_cells.size()
                var first: Vector2i = free_cells[first_idx]
                free_cells.remove_at(first_idx)
                entities[0]["x"] = first.x
                entities[0]["y"] = first.y

                for i in range(1, entities.size()):
                                var prev: Dictionary = entities[i - 1]
                                var best_idx: int = 0
                                var best_score: float = -1.0
                                for j in range(free_cells.size()):
                                                var c: Vector2i = free_cells[j]
                                                var dx: int = c.x - int(prev["x"])
                                                var dy: int = c.y - int(prev["y"])
                                                var dist: float = float(dx * dx + dy * dy)
                                                var score: float = dist * (0.8 + randf() * 0.4)
                                                if score > best_score:
                                                                best_score = score
                                                                best_idx = j
                                if free_cells.is_empty():
                                                break
                                var c2: Vector2i = free_cells[best_idx]
                                free_cells.remove_at(best_idx)
                                entities[i]["x"] = c2.x
                                entities[i]["y"] = c2.y


## Engelleri rastgele yerleştir (yılan başlangıcı + harflerden uzak).
func place_obstacles(count: int) -> void:
                var occupied: Dictionary = {}
                for seg in body:
                                occupied[_key(seg)] = true
                var head: Vector2i = body[0]
                for i in range(0, 6):
                                occupied[_key(Vector2i(head.x + i, head.y))] = true
                                occupied[_key(Vector2i(head.x + i, head.y - 1))] = true
                                occupied[_key(Vector2i(head.x + i, head.y + 1))] = true
                for l in letters:
                                occupied[_key(Vector2i(int(l["x"]), int(l["y"])))] = true

                var free_cells: Array = []
                for y in range(2, rows - 2):
                                for x in range(2, cols - 2):
                                                var c: Vector2i = Vector2i(x, y)
                                                if not occupied.has(_key(c)):
                                                                free_cells.append(c)
                free_cells.shuffle()

                var out: Array = []
                for i in range(count):
                                if free_cells.is_empty():
                                                break
                                var c: Vector2i = free_cells.pop_back()
                                out.append({
                                                "id": i, "x": c.x, "y": c.y,
                                                "shape": "block" if randf() > 0.5 else "spike",
                                })
                obstacles = out


## Bonus harfleri rastgele yerleştir.
func place_bonus_letters(count: int) -> void:
                var occupied: Dictionary = {}
                for seg in body:
                                occupied[_key(seg)] = true
                for l in letters:
                                occupied[_key(Vector2i(int(l["x"]), int(l["y"])))] = true
                for o in obstacles:
                                occupied[_key(Vector2i(int(o["x"]), int(o["y"])))] = true

                var free_cells: Array = []
                for y in range(1, rows - 1):
                                for x in range(1, cols - 1):
                                                var c: Vector2i = Vector2i(x, y)
                                                if not occupied.has(_key(c)):
                                                                free_cells.append(c)
                free_cells.shuffle()

                var out: Array = []
                var alpha: String = C.TURKISH_ALPHABET
                for i in range(count):
                                if free_cells.is_empty():
                                                break
                                var c: Vector2i = free_cells.pop_back()
                                var ch: String = alpha[randi() % alpha.length()]
                                out.append({
                                                "id": i, "x": c.x, "y": c.y, "char": ch,
                                                "value": C.BONUS_LETTER_VALUE, "eaten": false,
                                                "phase": randf() * TAU,
                                })
                bonus_letters = out


## Buz alanlarını rastgele yerleştir (yılan koridoru hariç).
func place_ice_zones(count: int) -> void:
                var occupied: Dictionary = {}
                for seg in body:
                                occupied[_key(seg)] = true
                for l in letters:
                                occupied[_key(Vector2i(int(l["x"]), int(l["y"])))] = true
                for o in obstacles:
                                occupied[_key(Vector2i(int(o["x"]), int(o["y"])))] = true
                for b in bonus_letters:
                                occupied[_key(Vector2i(int(b["x"]), int(b["y"])))] = true
                var head: Vector2i = body[0]
                for i in range(0, 5):
                                occupied[_key(Vector2i(head.x + i, head.y))] = true

                var free_cells: Array = []
                for y in range(1, rows - 1):
                                for x in range(1, cols - 1):
                                                var c: Vector2i = Vector2i(x, y)
                                                if not occupied.has(_key(c)):
                                                                free_cells.append(c)
                free_cells.shuffle()

                var out: Array = []
                for i in range(count):
                                if free_cells.is_empty():
                                                break
                                var c: Vector2i = free_cells.pop_back()
                                out.append({"id": i, "x": c.x, "y": c.y, "slow_factor": C.ICE_SLOW_FACTOR})
                ice_zones = out


## Hız artırıcıları rastgele yerleştir.
func place_speed_boosters(count: int) -> void:
                var occupied: Dictionary = {}
                for seg in body:
                                occupied[_key(seg)] = true
                for l in letters:
                                occupied[_key(Vector2i(int(l["x"]), int(l["y"])))] = true
                for o in obstacles:
                                occupied[_key(Vector2i(int(o["x"]), int(o["y"])))] = true
                for b in bonus_letters:
                                occupied[_key(Vector2i(int(b["x"]), int(b["y"])))] = true
                for iz in ice_zones:
                                occupied[_key(Vector2i(int(iz["x"]), int(iz["y"])))] = true
                var head: Vector2i = body[0]
                for i in range(0, 5):
                                occupied[_key(Vector2i(head.x + i, head.y))] = true

                var free_cells: Array = []
                for y in range(1, rows - 1):
                                for x in range(1, cols - 1):
                                                var c: Vector2i = Vector2i(x, y)
                                                if not occupied.has(_key(c)):
                                                                free_cells.append(c)
                free_cells.shuffle()

                var out: Array = []
                for i in range(count):
                                if free_cells.is_empty():
                                                break
                                var c: Vector2i = free_cells.pop_back()
                                out.append({
                                                "id": i, "x": c.x, "y": c.y,
                                                "boost_factor": C.SPEED_BOOST_FACTOR, "eaten": false,
                                                "phase": randf() * TAU,
                                })
                speed_boosters = out


# --------------------------------------------------------------------------
# Hareket — tek adım
# --------------------------------------------------------------------------
func step() -> void:
                direction = _pending_direction
                var head: Vector2i = body[0] + direction

                # Duvar kontrolü
                if head.x < 0 or head.y < 0 or head.x >= cols or head.y >= rows:
                                wall_collision.emit()
                                return

                # Engel kontrolü
                for o in obstacles:
                                if Vector2i(int(o["x"]), int(o["y"])) == head:
                                                obstacle_collision.emit()
                                                return

                # Çakışma kontrolü: doğru harf, bonus veya booster yenecekse büyür
                var letter: Dictionary = _find_letter_at(head.x, head.y)
                var bonus: Dictionary = _find_bonus_at(head.x, head.y)
                var booster: Dictionary = _find_booster_at(head.x, head.y)

                var will_grow: bool = false
                if not letter.is_empty() and not letter["eaten"] and letter["order_index"] == current_target_index:
                                will_grow = true
                if not bonus.is_empty():
                                will_grow = true
                if not booster.is_empty():
                                will_grow = true

                # Kendine çarpma kontrolü
                var check_body: Array = body if will_grow else body.slice(0, body.size() - 1)
                for seg in check_body:
                                if seg == head:
                                                self_collision.emit()
                                                return

                # Hareket
                body.push_front(head)

                # Buz alanı kontrolü (yeni baş pozisyonunda)
                var was_on_ice: bool = on_ice
                on_ice = false
                for iz in ice_zones:
                                if Vector2i(int(iz["x"]), int(iz["y"])) == head:
                                                on_ice = true
                                                break
                if on_ice and not was_on_ice:
                                ice_entered.emit()

                # Hız artırıcı toplama
                if not booster.is_empty() and not booster["eaten"]:
                                booster["eaten"] = true
                                boost_end_time = Time.get_ticks_msec() + C.SPEED_BOOST_DURATION_MS
                                boost_collected.emit(C.SPEED_BOOST_POINTS)

                # Bonus harf yeme
                if not bonus.is_empty() and not bonus["eaten"]:
                                bonus["eaten"] = true
                                ate_bonus.emit(bonus["char"], bonus["value"])

                # Hedef harf kontrolü
                if not letter.is_empty() and not letter["eaten"]:
                                if letter["order_index"] == current_target_index:
                                                # DOĞRU harf — GameManager skoru/sırayı yönetir
                                                letter["eaten"] = true
                                                ate_letter.emit(letter)
                                else:
                                                # YANLIŞ harf — sinyal yay; GameManager can kaybı yapar
                                                ate_letter.emit(letter)
                                                # Yanlış harfte kuyruk silinir (yılan kısalmaz ama büyümez de)
                                                body.pop_back()
                                                moved.emit(head)
                                                _redraw()
                                                return
                elif bonus.is_empty() and booster.is_empty():
                                # Normal hareket: kuyruğu sil
                                body.pop_back()
                # Bonus veya booster yendi: büyü (kuyruk silme)

                moved.emit(head)
                _redraw()


func grow(amount: int = 1) -> void:
                _grow_pending += amount


# --------------------------------------------------------------------------
# Yardımcılar
# --------------------------------------------------------------------------
func _find_letter_at(x: int, y: int) -> Dictionary:
                for l in letters:
                                if not l["eaten"] and int(l["x"]) == x and int(l["y"]) == y:
                                                return l
                return {}


func _find_bonus_at(x: int, y: int) -> Dictionary:
                for b in bonus_letters:
                                if not b["eaten"] and int(b["x"]) == x and int(b["y"]) == y:
                                                return b
                return {}


func _find_booster_at(x: int, y: int) -> Dictionary:
                for b in speed_boosters:
                                if not b["eaten"] and int(b["x"]) == x and int(b["y"]) == y:
                                                return b
                return {}


func _key(c: Vector2i) -> String:
                return "%d,%d" % [c.x, c.y]


# --------------------------------------------------------------------------
# Görsel güncelleme
# --------------------------------------------------------------------------
func _redraw() -> void:
                for child in _segments_node.get_children():
                                child.queue_free()
                if skin.is_empty():
                                skin = C.get_skin_by_id(C.DEFAULT_SKIN_ID)
                var boost_active: bool = boost_end_time > 0 and Time.get_ticks_msec() < boost_end_time
                for i in range(body.size()):
                                var cell: Vector2i = body[i]
                                var rect: ColorRect = ColorRect.new()
                                rect.size = Vector2(C.CELL_SIZE - 4, C.CELL_SIZE - 4)
                                rect.position = Vector2(cell.x * C.CELL_SIZE + 2, cell.y * C.CELL_SIZE + 2)
                                if i == 0:
                                                # Baş — duruma göre renk
                                                if boost_active:
                                                                rect.color = _skin_color(skin["boostHead"])
                                                elif on_ice:
                                                                rect.color = _skin_color(skin["iceHead"])
                                                else:
                                                                rect.color = _skin_color(skin["headColor"])
                                else:
                                                var t: float = float(i) / float(max(1, body.size() - 1))
                                                var head_col: Color
                                                var tail_col: Color
                                                if boost_active:
                                                                head_col = _skin_color(skin["boostHead"])
                                                                tail_col = _skin_color(skin["boostTail"])
                                                elif on_ice:
                                                                head_col = _skin_color(skin["iceHead"])
                                                                tail_col = _skin_color(skin["iceTail"])
                                                else:
                                                                head_col = _skin_color(skin["headColor"])
                                                                tail_col = _skin_color(skin["tailColor"])
                                                rect.color = head_col.lerp(tail_col, t)
                                _segments_node.add_child(rect)


## Skin hex string'inden Color üret (6 haneli RRGGBB).
func _skin_color(hex_str: String) -> Color:
                return Color.from_string("#" + hex_str, Color(0.5, 0.5, 0.5, 1.0))
