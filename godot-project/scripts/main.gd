# ============================================================================
# Main — Ana sahne scripti (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Sahne hiyerarşisi:
#   Main (Node2D)
#   ├── GameManager (autoload — global)
#   ├── UIManager (CanvasLayer — ui_manager.gd)
#   │   ├── TopBar (Control)
#   │   │   ├── LevelLabel, ScoreLabel, WordLabel, LivesLabel
#   │   │   ├── MessageLabel, ComboLabel
#   │   │   ├── TimerBar (ProgressBar), BoostLabel
#   │   │   ├── ObstacleLabel, BonusLabel, IceLabel
#   │   │   ├── ComboFlash (Label)
#   │   │   └── AchievementNotif (Control)
#   ├── GameArea (Node2D)
#   │   ├── Snake (Node2D — snake.gd)
#   │   ├── Letters (Node2D — harf objeleri buraya eklenir)
#   │   ├── Obstacles (Node2D)
#   │   ├── Bonuses (Node2D)
#   │   ├── IceZones (Node2D)
#   │   └── Boosters (Node2D)
#   └── GameOverPanel (Control)
#
# Bu script klavye girdisini yönetir, harfleri/engelleri/bonusları yerleştirir
# ve GameManager ile Snake arasında köprü kurar.
# ============================================================================

extends Node2D

const C = preload("res://scripts/constants.gd")
# Bonus artık kit'in MAVİ + ALTIN YILDIZ karosu: tek sprite, ayrı ikon katmanı yok
const TEX_BONUS: Texture2D = preload("res://assets/ui/tile_bonus.png")
const TEX_BOOSTER_ICON: Texture2D = preload("res://assets/ui/icon_potion.png")
# Engel karoları (kit #8): taş tuğla duvar + kırmızı X tehlike
const TEX_OBSTACLE_STONE: Texture2D = preload("res://assets/ui/obstacle_stone.png")
const TEX_OBSTACLE_SPIKE: Texture2D = preload("res://assets/ui/obstacle_spike.png")
const HIGHLIGHT_RANGE: int = 5   # sıradaki harfe bu mesafeye girince hafifçe parıldar

@onready var snake: Node2D = $GameArea/Snake
@onready var letters_node: Node2D = $GameArea/Letters
@onready var obstacles_node: Node2D = $GameArea/Obstacles
@onready var bonuses_node: Node2D = $GameArea/Bonuses
@onready var ice_zones_node: Node2D = $GameArea/IceZones
@onready var boosters_node: Node2D = $GameArea/Boosters
@onready var game_over_panel: Control = $UIManager/GameOverPanel
@onready var menu_panel: Control = $UIManager/MenuPanel
@onready var quit_button: Button = %QuitButton


func _ready() -> void:
                GameManager.status_changed.connect(_on_status_changed)
                GameManager.step_requested.connect(_on_step_requested)
                # Ses ayarlarını kalıcı veriden uygula (SoundManager autoload)
                SoundManager.set_enabled(GameManager.sound_enabled)
                SoundManager.set_volume(GameManager.sound_volume)
                # Snake sinyallerini GameManager'a bağla
                snake.wall_collision.connect(GameManager.on_wall_collision)
                snake.self_collision.connect(GameManager.on_self_collision)
                snake.obstacle_collision.connect(GameManager.on_obstacle_collision)
                snake.ate_letter.connect(_on_snake_ate_letter)
                snake.ate_bonus.connect(GameManager.on_ate_bonus)
                snake.boost_collected.connect(GameManager.on_boost_collected)
                snake.ice_entered.connect(GameManager.on_ice_entered)
                # Büyüme kredisi: GameManager kuralı -> yılan (her harfte değil)
                GameManager.snake_grow_requested.connect(_on_snake_grow_requested)
                # Yıldız ödülü: her 15 yıldızda 1 kuyruk düşer
                GameManager.snake_shrink_requested.connect(_on_snake_shrink_requested)
                # Ek ses tetikleyicileri (GameManager bağlantılarına ek olarak)
                snake.wall_collision.connect(_on_snake_error)
                snake.self_collision.connect(_on_snake_error)
                snake.obstacle_collision.connect(_on_snake_error)
                snake.ate_bonus.connect(_on_snake_ate_bonus)
                snake.boost_collected.connect(_on_snake_boost)
                snake.ice_entered.connect(_on_snake_ice)
                # Skin uygula
                GameManager.apply_skin_to_snake(snake)
                # Çıkış butonu (menüde) — Esc de aynı işi yapar
                if quit_button:
                                quit_button.pressed.connect(_quit_game)
                # Başlangıç menüsü
                _show_menu()


func _process(_delta: float) -> void:
                # Bonus harf yendiğinde UI sayaçlarını güncelle
                _update_entity_counts()
                # Sıradaki hedef harf yılan yaklaşınca hafifçe parıldasın
                _update_letter_highlights()


# --------------------------------------------------------------------------
# Status değişimi
# --------------------------------------------------------------------------
func _on_status_changed(new_status: String) -> void:
                if new_status == "playing":
                                menu_panel.visible = false
                                # ÖNEMLİ: yılan önce konumlandırılmalı —
                                # place_letters() boş body'de body[0] okuduğu için çöküyordu
                                _reset_snake()
                                _setup_level()
                                _place_entities()
                elif new_status == "level_complete":
                                SoundManager.play("word_complete")
                elif new_status == "game_over":
                                SoundManager.play("game_over")
                elif new_status == "time_up":
                                SoundManager.play("wrong")
                elif new_status == "menu":
                                _clear_all()
                                menu_panel.visible = true


func _on_step_requested() -> void:
                GameManager.step_snake(snake)
                # Bonus/booster yendikten sonra görsel kaldır
                _refresh_entity_visuals()


## OYUNDAN ÇIKIŞ — menüdeki ÇIKIŞ butonu veya Esc.
## (Masaüstünde pencereyi kapatmak da yeter; bu, tam ekranda/başlıksız
## pencerede tek çıkış yoludur ve oyuncunun aradığı yerdir.)
func _quit_game() -> void:
                get_tree().quit()


# --------------------------------------------------------------------------
# Klavye girişi
# --------------------------------------------------------------------------
func _input(event: InputEvent) -> void:
                if GameManager.status == "menu":
                                if event.is_action_pressed("ui_accept"):
                                                GameManager.start_game()
                                elif event.is_action_pressed("ui_cancel"):
                                                _quit_game()
                                return
                if GameManager.status == "game_over":
                                if event.is_action_pressed("ui_accept"):
                                                GameManager.reset_to_menu()
                                return
                if event.is_action_pressed("pause"):
                                if GameManager.status == "playing":
                                                GameManager.pause_game()
                                elif GameManager.status == "paused":
                                                GameManager.resume_game()
                                return
                if GameManager.status != "playing":
                                return
                if event.is_action_pressed("move_up"):
                                snake.set_direction(snake.DIR_UP)
                elif event.is_action_pressed("move_down"):
                                snake.set_direction(snake.DIR_DOWN)
                elif event.is_action_pressed("move_left"):
                                snake.set_direction(snake.DIR_LEFT)
                elif event.is_action_pressed("move_right"):
                                snake.set_direction(snake.DIR_RIGHT)


# --------------------------------------------------------------------------
# Bölüm kurulumu
# --------------------------------------------------------------------------
func _setup_level() -> void:
                snake.cols = C.GRID_COLS
                snake.rows = C.GRID_ROWS
                snake.clear_entities()
                # Skin uygula
                GameManager.apply_skin_to_snake(snake)
                # Harfleri yerleştir
                snake.place_letters(GameManager.current_word, GameManager._loaded_tricky)
                # Engel yoksa kolay modda atla
                var obstacle_count: int = GameManager._loaded_obstacles
                if obstacle_count > 0:
                                snake.place_obstacles(obstacle_count)
                # Bonus harfler
                if C.BONUS_LETTER_COUNT > 0:
                                snake.place_bonus_letters(C.BONUS_LETTER_COUNT)
                # Buz alanları
                if GameManager.level >= C.ICE_ZONES_START_LEVEL and not GameManager.easy_mode:
                                snake.place_ice_zones(C.ICE_ZONE_COUNT)
                # Hız artırıcılar
                if GameManager.level >= C.SPEED_BOOSTERS_START_LEVEL and not GameManager.easy_mode:
                                snake.place_speed_boosters(C.SPEED_BOOSTER_COUNT)


func _place_entities() -> void:
                # Snake içine yerleştirilen entities'leri görsel objelere dök
                _clear_visual_entities()
                _draw_letters()
                _draw_obstacles()
                _draw_bonus_letters()
                _draw_ice_zones()
                _draw_speed_boosters()
                _update_entity_counts()


func _reset_snake() -> void:
                var start_cell: Vector2i = Vector2i(C.GRID_COLS / 2, C.GRID_ROWS / 2)
                # Uzunluk bölümle artar (zorluk göstergesi). Bölüm içinde harf yedikçe
                # GameManager kuralına göre kısa süre uzar; bölüm başında bu tabana döner.
                snake.max_length = GameManager.max_snake_length()
                snake.reset(start_cell, GameManager.snake_length, snake.DIR_RIGHT)


# --------------------------------------------------------------------------
# Snake sinyal işleyiciler
# --------------------------------------------------------------------------
## GameManager büyüme kredisi verdi -> yılan bir sonraki yemede uzar.
func _on_snake_grow_requested(amount: int) -> void:
                snake.grant_growth(amount)


## YILDIZ ÖDÜLÜ: 15 yıldız doldu -> kuyruktan 1 segment düşer.
## Yılan zaten alt sınırdaysa düşmez (shrink 0 döner) — oyuncuya boş vaat vermeyiz.
func _on_snake_shrink_requested(amount: int) -> void:
                var removed: int = snake.shrink(amount)
                if removed <= 0:
                                return
                SoundManager.play("bonus")
                var ui: CanvasLayer = $UIManager
                if ui and ui.has_method("show_star_reward"):
                                ui.show_star_reward(GameManager.stars_eaten)


func _on_snake_ate_letter(letter: Dictionary) -> void:
                GameManager.on_letter_reached(letter)
                # Doğru harf yendi mi, görsel kaldır
                if letter["eaten"]:
                                SoundManager.play("correct")
                                for child in letters_node.get_children():
                                                if child is Letter and child.grid_x == int(letter["x"]) and child.grid_y == int(letter["y"]):
                                                                child.queue_free()
                                                                break
                else:
                                SoundManager.play("wrong")
                _update_letter_highlights()


# --------------------------------------------------------------------------
# Ses tetikleyicileri (Snake sinyalleri)
# --------------------------------------------------------------------------
func _on_snake_error() -> void:
                SoundManager.play("wrong")


func _on_snake_ate_bonus(_char: String, _gained: int) -> void:
                SoundManager.play("bonus")


func _on_snake_boost(_gained: int) -> void:
                SoundManager.play("boost")


func _on_snake_ice() -> void:
                SoundManager.play("ice")


# --------------------------------------------------------------------------
# Görsel çizim
# --------------------------------------------------------------------------
func _draw_letters() -> void:
                for l in snake.letters:
                                var lp: Vector2 = Vector2(int(l["x"]) * C.CELL_SIZE + C.CELL_SIZE / 2.0,
                                                int(l["y"]) * C.CELL_SIZE + C.CELL_SIZE / 2.0)
                                var letter_scene: Letter = preload("res://scenes/Letter.tscn").instantiate()
                                letter_scene.char = l["char"]
                                letter_scene.order_index = int(l["order_index"])
                                letter_scene.grid_x = int(l["x"])
                                letter_scene.grid_y = int(l["y"])
                                letter_scene.position = lp
                                letter_scene.add_to_group("letters")
                                letters_node.add_child(letter_scene)
                _update_letter_highlights()


func _draw_obstacles() -> void:
                # Engel düz renk kare DEĞİL: kit'in taş tuğlası (duvar) ya da
                # kırmızı X karosu (tehlike). Hücrenin ortasına oturur.
                for o in snake.obstacles:
                                var spr: Sprite2D = Sprite2D.new()
                                if o["shape"] == "spike":
                                                spr.texture = TEX_OBSTACLE_SPIKE
                                else:
                                                spr.texture = TEX_OBSTACLE_STONE
                                spr.position = Vector2(int(o["x"]) * C.CELL_SIZE + C.CELL_SIZE * 0.5,
                                                int(o["y"]) * C.CELL_SIZE + C.CELL_SIZE * 0.5)
                                spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
                                obstacles_node.add_child(spr)


func _draw_bonus_letters() -> void:
                # BONUS = kit'in MAVİ + ALTIN YILDIZ karosu (HARF DEĞİL).
                # Eskiden mor kutu + rastgele harf vardı: (1) pembe palete uymuyordu,
                # (2) bonusun hangi harf olduğu oyun açısından hiçbir şey ifade
                # etmiyor (sadece +puan ve büyüme), (3) "kelimenin parçası mı?"
                # diye kafa karıştırıyordu. Yıldız da artık karoya BASILI.
                for b in snake.bonus_letters:
                                if b["eaten"]:
                                                continue
                                var cx: float = int(b["x"]) * C.CELL_SIZE + C.CELL_SIZE * 0.5
                                var cy: float = int(b["y"]) * C.CELL_SIZE + C.CELL_SIZE * 0.5
                                var tile: Sprite2D = Sprite2D.new()
                                tile.texture = TEX_BONUS
                                tile.position = Vector2(cx, cy)
                                tile.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
                                bonuses_node.add_child(tile)


func _draw_ice_zones() -> void:
                for iz in snake.ice_zones:
                                var rect: ColorRect = ColorRect.new()
                                rect.size = Vector2(C.CELL_SIZE - 2, C.CELL_SIZE - 2)
                                rect.position = Vector2(int(iz["x"]) * C.CELL_SIZE + 1, int(iz["y"]) * C.CELL_SIZE + 1)
                                rect.color = Color(0.5, 0.7, 0.95, 0.55)
                                ice_zones_node.add_child(rect)


func _draw_speed_boosters() -> void:
                # Hız artırıcı = iksir ikonu (eskiden amber kare + "⚡" etiketi vardı;
                # ⚡ pixel fontta YOK, sistem fontuyla çiziliyordu)
                for b in snake.speed_boosters:
                                if b["eaten"]:
                                                continue
                                var cx: float = int(b["x"]) * C.CELL_SIZE + C.CELL_SIZE * 0.5
                                var cy: float = int(b["y"]) * C.CELL_SIZE + C.CELL_SIZE * 0.5
                                var icon: Sprite2D = Sprite2D.new()
                                icon.texture = TEX_BOOSTER_ICON
                                icon.position = Vector2(cx, cy)
                                icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
                                boosters_node.add_child(icon)


func _refresh_entity_visuals() -> void:
                # Bonus/booster yendi mi kontrol et, görsel kaldır
                for child in bonuses_node.get_children():
                                child.queue_free()
                _draw_bonus_letters()
                for child in boosters_node.get_children():
                                child.queue_free()
                _draw_speed_boosters()


func _update_letter_highlights() -> void:
                # Taşların hepsi aynı ailedendir (renk kodlaması YOK — oyunu fazla
                # kolaylaştırıyordu). Sadece sıradaki harf, yılan YAKLAŞINCA çok hafif
                # parıldar (mockup notu).
                if snake.body.is_empty():
                                return
                var head: Vector2i = snake.body[0]
                # Taş ailesi: SIRADAKİ harf altın, diğerleri krem (seçenek 1 / mockup).
                # Mükerrer harfli kelimede (ANA, ARABA) sıradaki harfin TÜM kopyaları
                # geçerlidir -> hepsi altın olur ve hafifçe parıldar.
                var want: String = GameManager.current_target_char()
                for l in letters_node.get_children():
                                if l is Letter:
                                                var dist: int = absi(l.grid_x - head.x) + absi(l.grid_y - head.y)
                                                var is_next: bool = (l.char == want) if want != "" \
                                                                else (l.order_index == GameManager.current_letter_index)
                                                l.set_family(is_next)
                                                l.set_target_highlight(is_next and dist <= HIGHLIGHT_RANGE)


func _update_entity_counts() -> void:
                var ui: CanvasLayer = $UIManager
                if ui and ui.has_method("update_entity_counts"):
                                var active_bonuses: int = 0
                                for b in snake.bonus_letters:
                                                if not b["eaten"]:
                                                                active_bonuses += 1
                                var active_boosters: int = 0
                                for b in snake.speed_boosters:
                                                if not b["eaten"]:
                                                                active_boosters += 1
                                ui.update_entity_counts(snake.obstacles.size(), active_bonuses, snake.ice_zones.size())


# --------------------------------------------------------------------------
# Temizlik
# --------------------------------------------------------------------------
func _clear_visual_entities() -> void:
                for child in letters_node.get_children():
                                child.queue_free()
                for child in obstacles_node.get_children():
                                child.queue_free()
                for child in bonuses_node.get_children():
                                child.queue_free()
                for child in ice_zones_node.get_children():
                                child.queue_free()
                for child in boosters_node.get_children():
                                child.queue_free()


func _clear_all() -> void:
                _clear_visual_entities()


func _show_menu() -> void:
                game_over_panel.visible = false
                menu_panel.visible = true
