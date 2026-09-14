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
# Büyüme kredisi: GameManager doğru harfte 1 kredi verir, step() onu harcar
# (kredi harcanırsa kuyruk silinmez -> yılan 1 segment uzar).
var _grow_pending: int = 0
# Uzunluk tavanı (0 = sınırsız). Bölüm başında main.gd ayarlar.
var max_length: int = 0

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

# Boost izi — boost aktifken dolar: [{cell: Vector2i, t: int}]
var _trail: Array = []
const TRAIL_MAX_MS: int = 500
const TRAIL_MAX_POINTS: int = 8

# --------------------------------------------------------------------------
# Sprite sheet (32x32, top-down pixel-art)
#   satır 0: head_r   head_d   head_l   head_u
#   satır 1: tail_r   tail_d   tail_l   tail_u
#   satır 2: body_h   body_v   corner_rd  corner_dl
#   satır 3: corner_lu corner_ur
# Yön kuralı: sprite'ın ÖN ekseni adındaki yönü gösterir, gövde bağlantısı
# karşı taraftadır. Köşe adı = AÇIK olan iki kenar (corner_rd: sağ+aşağı).
# Top-down olduğu için parçalar birbirine dikişsiz oturur: boru bandı
# hücre içinde 6..25 satır/sütunlarıdır.
# --------------------------------------------------------------------------
const SHEET_PATH: String = "res://assets/snake/snake.png"
const HUE_SHADER_PATH: String = "res://assets/snake/snake_hue.gdshader"
const SHEET_CELL: int = 144   # sheet hücresi: 576/4 = 144 (build_assets_from_indir.py ile aynı olmalı!)
const SHEET_COLS: int = 4
const BASE_HUE: float = 0.261   # sprite gövdesinin ÖLÇÜLEN hue değeri (#78e028)

const SPRITE_LAYOUT: Array = [
                "head_r", "head_d", "head_l", "head_u",
                "tail_r", "tail_d", "tail_l", "tail_u",
                "body_h", "body_v", "corner_rd", "corner_dl",
                "corner_lu", "corner_ur", "", "",
]
const CORNER_NAMES: Array = ["rd", "dl", "lu", "ur"]

# Aktif skin (Dictionary; constants.gd SNAKE_SKINS'ten)
var skin: Dictionary = {}

# Görsel kökler (runtime'da oluşturulur)
var _segments_node: Node2D = null

# Sprite sheet önbelleği
var _sheet: Texture2D = null
var _hue_shader: Shader = null
var _atlas_cache: Dictionary = {}
var _hue_material: ShaderMaterial = null
var _hue_value: float = -1.0

# Bir sonraki hedef harfin order_index'i (GameManager ile senkron)
var current_target_index: int = 0
# Bir sonraki hedef harfin KENDİSİ (BÜYÜK). Mükerrer harfli kelimelerde
# (ANA, ARABA, KAKA...) aynı harften birden fazla taş olur ve oyuncu hangisinin
# kaçıncı sıraya ait olduğunu AYIRT EDEMEZ -> hedef kontrolü HARF ile yapılır.
# Boş string ise eski davranış (order_index) kullanılır.
var current_target_char: String = ""


func _ready() -> void:
                _segments_node = Node2D.new()
                _segments_node.name = "Segments"
                add_child(_segments_node)
                if skin.is_empty():
                                skin = C.get_skin_by_id(C.DEFAULT_SKIN_ID)
                _sheet = load(SHEET_PATH)
                _hue_shader = load(HUE_SHADER_PATH)


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


## Yenen harf sıradaki HEDEF harf mi?
## Mükerrer harfli kelimelerde (ANA, ARABA) "ikinci A"yı yemek de DOĞRU
## sayılmalı: taşlar görsel olarak ayırt edilemez. Bu yüzden karşılaştırma
## order_index ile değil HARF ile yapılır.
func is_target_letter(letter: Dictionary) -> bool:
                if current_target_char != "":
                                return str(letter["char"]) == current_target_char
                return int(letter["order_index"]) == current_target_index


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
                # WRAP_WALLS açıkken ölüm yok: kenardan çıkınca karşı taraftan girer
                if head.x < 0 or head.y < 0 or head.x >= cols or head.y >= rows:
                                if C.WRAP_WALLS:
                                                head.x = posmod(head.x, cols)
                                                head.y = posmod(head.y, rows)
                                else:
                                                wall_collision.emit()
                                                return

                # Engel kontrolü
                for o in obstacles:
                                if Vector2i(int(o["x"]), int(o["y"])) == head:
                                                obstacle_collision.emit()
                                                return

                # Çakışma kontrolü: doğru harf veya booster yenecekse büyür.
                # YILDIZ (bonus) ARTIK UZATMAZ — uzunluk bu oyunda AVANTAJ DEĞİL:
                # kendine çarpma ölümle biter, yani uzamak cezadır. Yıldızın ödülü
                # +puan ve her 15 yıldızda kuyruk düşmesidir (bkz. GameManager).
                var letter: Dictionary = _find_letter_at(head.x, head.y)
                var bonus: Dictionary = _find_bonus_at(head.x, head.y)
                var booster: Dictionary = _find_booster_at(head.x, head.y)

                var under_cap: bool = max_length <= 0 or body.size() < max_length
                var will_grow: bool = false
                if under_cap and not letter.is_empty() and not letter["eaten"] and is_target_letter(letter):
                                will_grow = true
                if under_cap and not booster.is_empty():
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

                # Hız artırıcı toplama (ödül: puan + 4 sn hız; ARTIK UZATMAZ)
                if not booster.is_empty() and not booster["eaten"]:
                                booster["eaten"] = true
                                boost_end_time = Time.get_ticks_msec() + C.SPEED_BOOST_DURATION_MS
                                boost_collected.emit(C.SPEED_BOOST_POINTS)

                # Bonus yıldız yeme (ödül: puan + combo; ARTIK UZATMAZ)
                if not bonus.is_empty() and not bonus["eaten"]:
                                bonus["eaten"] = true
                                ate_bonus.emit(bonus["char"], bonus["value"])

                # Hedef harf kontrolü
                if not letter.is_empty() and not letter["eaten"]:
                                if is_target_letter(letter):
                                                # DOĞRU harf — GameManager skoru/sırayı/büyümeyi yönetir.
                                                # Büyüme kredisi sinyal içinde (senkron) verilir.
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

                # --- BÜYÜME KARARI (kuyruk silinsin mi?) ---
                # Uzama SADECE doğru harften gelir (GameManager grant_growth() ile
                # kredi verir). Toplanabilir öğeler (yıldız, hız iksiri) UZATMAZ:
                # bu oyunda uzunluk skor değil — kendine çarpma ölümcül olduğu için
                # her fazla segment ÖLÜM RİSKİDİR. Ödüller puan/combo/kuyruk düşmesi.
                var grow_now: bool = false
                if under_cap and _grow_pending > 0:
                                _grow_pending -= 1
                                grow_now = true
                if not grow_now:
                                body.pop_back()

                moved.emit(head)
                _redraw()


## GameManager doğru harfte büyüme kredisi verir (bölüm içi büyüme kuralına göre).
func grant_growth(amount: int = 1) -> void:
                _grow_pending += amount


## Kuyruktan segment düşürür (yıldız ödülü: her 15 yıldızda 1).
## C.SNAKE_MIN_LENGTH altına inmez. Döner: gerçekten düşen segment sayısı.
## NOT: `moved` sinyali YAYILMAZ — yayılırsa GameManager bunu bir adım sanıp
## harf yeme kontrolü yapar ve haksız harf yenir.
func shrink(amount: int = 1) -> int:
                var removed: int = 0
                while removed < amount and body.size() > C.SNAKE_MIN_LENGTH:
                                body.pop_back()
                                removed += 1
                if removed > 0:
                                _redraw()
                return removed


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
                if body.is_empty():
                                return

                var boost_active: bool = boost_end_time > 0 and Time.get_ticks_msec() < boost_end_time
                _apply_hue(_hue_shift_for_state(boost_active))

                var n: int = body.size()
                # TERSTEN çiz: kuyruk önce, KAFA en son -> kafa üstte kalır
                # (kafa ve boncuk hücreden taşar; boncuklar komşusuyla 2px bindirir)
                for i in range(n - 1, -1, -1):
                                var cell: Vector2i = body[i]
                                var tex: AtlasTexture = _atlas(_segment_sprite(i, n))
                                if tex == null:
                                                continue
                                var spr: Sprite2D = Sprite2D.new()
                                spr.texture = tex
                                spr.centered = true
                                spr.position = Vector2(
                                                cell.x * C.CELL_SIZE + C.CELL_SIZE * 0.5,
                                                cell.y * C.CELL_SIZE + C.CELL_SIZE * 0.5)
                                spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
                                spr.material = _hue_material
                                _segments_node.add_child(spr)

                _draw_trail(boost_active)
                _draw_head_details(boost_active)


## Bu gövde hücresi için hangi sprite? (kafa / düz / köşe / kuyruk)
func _segment_sprite(i: int, n: int) -> String:
                if n == 1:
                                return "head_" + _dir_letter(direction)
                if i == 0:
                                # GÖRDÜĞÜ YÖN = kafadan boyuna değil, boyundan kafaya!
                                # (_step_dir(body[0], body[1]) geri yönü verir -> kafa ters bakar)
                                var d0: Vector2i = _step_dir(body[1], body[0])
                                if d0 == Vector2i.ZERO:
                                                d0 = direction
                                return "head_" + _dir_letter(d0)
                if i == n - 1:
                                var dt: Vector2i = _step_dir(body[n - 2], body[n - 1])
                                if dt == Vector2i.ZERO:
                                                dt = direction
                                return "tail_" + _dir_letter(dt)

                var prev_dir: Vector2i = _step_dir(body[i], body[i - 1])
                var next_dir: Vector2i = _step_dir(body[i], body[i + 1])
                if prev_dir == -next_dir or prev_dir == next_dir:
                                return "body_v" if prev_dir.x == 0 else "body_h"
                var a: String = _dir_letter(prev_dir)
                var b: String = _dir_letter(next_dir)
                if CORNER_NAMES.has(a + b):
                                return "corner_" + a + b
                return "corner_" + b + a


## İki komşu hücre arasındaki birim adım (duvardan geçişi de hesaba katar).
func _step_dir(from: Vector2i, to: Vector2i) -> Vector2i:
                var d: Vector2i = to - from
                if d.x > 1:
                                d.x -= cols
                elif d.x < -1:
                                d.x += cols
                if d.y > 1:
                                d.y -= rows
                elif d.y < -1:
                                d.y += rows
                return d


func _dir_letter(d: Vector2i) -> String:
                if d.x > 0:
                                return "r"
                if d.x < 0:
                                return "l"
                if d.y > 0:
                                return "d"
                return "u"


## Sheet'ten tek döşemeyi AtlasTexture olarak döndürür (önbellekli).
func _atlas(sprite_name: String) -> AtlasTexture:
                if sprite_name.is_empty():
                                return null
                if _atlas_cache.has(sprite_name):
                                return _atlas_cache[sprite_name]
                var idx: int = SPRITE_LAYOUT.find(sprite_name)
                if idx < 0:
                                return null
                if _sheet == null:
                                _sheet = load(SHEET_PATH)
                var at: AtlasTexture = AtlasTexture.new()
                at.atlas = _sheet
                at.region = Rect2((idx % SHEET_COLS) * SHEET_CELL, (idx / SHEET_COLS) * SHEET_CELL,
                                SHEET_CELL, SHEET_CELL)
                _atlas_cache[sprite_name] = at
                return at


## Aktif duruma göre gövde hue kaydırması (skin + boost + buz).
func _hue_shift_for_state(boost_active: bool) -> float:
                var hex_str: String = "10b981"
                if boost_active:
                                hex_str = str(skin.get("boostHead", "f59e0b"))
                elif on_ice:
                                hex_str = str(skin.get("iceHead", "38bdf8"))
                else:
                                hex_str = str(skin.get("headColor", "10b981"))
                var col: Color = Color.from_string("#" + hex_str, Color(0.13, 0.73, 0.51))
                return wrapf(col.h - BASE_HUE, 0.0, 1.0)


func _apply_hue(shift: float) -> void:
                if _hue_material == null:
                                if _hue_shader == null:
                                                _hue_shader = load(HUE_SHADER_PATH)
                                _hue_material = ShaderMaterial.new()
                                _hue_material.shader = _hue_shader
                if not is_equal_approx(shift, _hue_value):
                                _hue_value = shift
                                _hue_material.set_shader_parameter("hue_shift", shift)


## Boost izi — boost aktifken başın geçtiği hücrelerde solan altın kareler.
func _draw_trail(boost_active: bool) -> void:
                if not boost_active or body.is_empty():
                                _trail.clear()
                                return
                var now: int = Time.get_ticks_msec()
                var head_cell: Vector2i = body[0]
                if _trail.is_empty() or _trail[_trail.size() - 1]["cell"] != head_cell:
                                _trail.append({"cell": head_cell, "t": now})
                while _trail.size() > TRAIL_MAX_POINTS:
                                _trail.pop_front()
                var alive: Array = []
                for p in _trail:
                                if now - int(p["t"]) < TRAIL_MAX_MS:
                                                alive.append(p)
                _trail = alive
                # Eski noktalar daha saydam (kuyruk → baş yönünde koyulaşır)
                for p in _trail:
                                var age: float = float(now - int(p["t"])) / float(TRAIL_MAX_MS)
                                var alpha: float = clampf(1.0 - age, 0.0, 1.0) * 0.4
                                if alpha <= 0.02:
                                                continue
                                var cell: Vector2i = p["cell"]
                                var rect: ColorRect = ColorRect.new()
                                rect.size = Vector2(C.CELL_SIZE - 4, C.CELL_SIZE - 4)
                                rect.position = Vector2(cell.x * C.CELL_SIZE + 2, cell.y * C.CELL_SIZE + 2)
                                rect.color = Color(0.98, 0.75, 0.2, alpha)
                                _segments_node.add_child(rect)


## Baş detayı — boost aktifken yön oku (gözler artık sprite'ın içinde).
func _draw_head_details(boost_active: bool) -> void:
                if not boost_active or body.is_empty():
                                return
                var head_cell: Vector2i = body[0]
                var forward: Vector2 = Vector2(direction.x, direction.y)
                var perp: Vector2 = Vector2(-direction.y, direction.x)
                var centre: Vector2 = Vector2(
                                head_cell.x * C.CELL_SIZE + C.CELL_SIZE * 0.5,
                                head_cell.y * C.CELL_SIZE + C.CELL_SIZE * 0.5)
                var arrow: Polygon2D = Polygon2D.new()
                var tip: Vector2 = centre + forward * (C.CELL_SIZE * 0.98)
                var back: Vector2 = centre + forward * (C.CELL_SIZE * 0.66)
                var spread: Vector2 = perp * (C.CELL_SIZE * 0.20)
                arrow.polygon = PackedVector2Array([tip, back + spread, back - spread])
                arrow.color = Color(0.99, 0.85, 0.3, 0.95)
                _segments_node.add_child(arrow)
