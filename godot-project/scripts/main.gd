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

@onready var snake: Node2D = $GameArea/Snake
@onready var letters_node: Node2D = $GameArea/Letters
@onready var obstacles_node: Node2D = $GameArea/Obstacles
@onready var bonuses_node: Node2D = $GameArea/Bonuses
@onready var ice_zones_node: Node2D = $GameArea/IceZones
@onready var boosters_node: Node2D = $GameArea/Boosters
@onready var game_over_panel: Control = $GameOverPanel


func _ready() -> void:
                GameManager.status_changed.connect(_on_status_changed)
                GameManager.step_requested.connect(_on_step_requested)
                # Snake sinyallerini GameManager'a bağla
                snake.wall_collision.connect(GameManager.on_wall_collision)
                snake.self_collision.connect(GameManager.on_self_collision)
                snake.obstacle_collision.connect(GameManager.on_obstacle_collision)
                snake.ate_letter.connect(_on_snake_ate_letter)
                snake.ate_bonus.connect(GameManager.on_ate_bonus)
                snake.boost_collected.connect(GameManager.on_boost_collected)
                snake.ice_entered.connect(GameManager.on_ice_entered)
                # Skin uygula
                GameManager.apply_skin_to_snake(snake)
                # Başlangıç menüsü
                _show_menu()


func _process(_delta: float) -> void:
                # Bonus harf yendiğinde UI sayaçlarını güncelle
                _update_entity_counts()


# --------------------------------------------------------------------------
# Status değişimi
# --------------------------------------------------------------------------
func _on_status_changed(new_status: String) -> void:
                if new_status == "playing":
                                _setup_level()
                                _place_entities()
                                _reset_snake()
                elif new_status == "menu":
                                _clear_all()


func _on_step_requested() -> void:
                GameManager.step_snake(snake)
                # Bonus/booster yendikten sonra görsel kaldır
                _refresh_entity_visuals()


# --------------------------------------------------------------------------
# Klavye girişi
# --------------------------------------------------------------------------
func _input(event: InputEvent) -> void:
                if GameManager.status == "menu":
                                if event.is_action_pressed("ui_accept"):
                                                GameManager.start_game()
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
                snake.reset(start_cell, C.SNAKE_START_LENGTH, snake.DIR_RIGHT)


# --------------------------------------------------------------------------
# Snake sinyal işleyiciler
# --------------------------------------------------------------------------
func _on_snake_ate_letter(letter: Dictionary) -> void:
                GameManager.on_letter_reached(letter)
                # Doğru harf yendi mi, görsel kaldır
                if letter["eaten"]:
                                for child in letters_node.get_children():
                                                if child is Letter and child.grid_x == int(letter["x"]) and child.grid_y == int(letter["y"]):
                                                                child.queue_free()
                                                                break
                _update_letter_highlights()


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
                for o in snake.obstacles:
                                var rect: ColorRect = ColorRect.new()
                                rect.size = Vector2(C.CELL_SIZE - 2, C.CELL_SIZE - 2)
                                rect.position = Vector2(int(o["x"]) * C.CELL_SIZE + 1, int(o["y"]) * C.CELL_SIZE + 1)
                                if o["shape"] == "spike":
                                                rect.color = Color("dc2626")
                                else:
                                                rect.color = Color("52525b")
                                obstacles_node.add_child(rect)


func _draw_bonus_letters() -> void:
                for b in snake.bonus_letters:
                                if b["eaten"]:
                                                continue
                                var rect: ColorRect = ColorRect.new()
                                rect.size = Vector2(C.CELL_SIZE - 6, C.CELL_SIZE - 6)
                                rect.position = Vector2(int(b["x"]) * C.CELL_SIZE + 3, int(b["y"]) * C.CELL_SIZE + 3)
                                rect.color = Color("a855f7")
                                bonuses_node.add_child(rect)
                                # Harf label'ı ekle
                                var lbl: Label = Label.new()
                                lbl.text = b["char"]
                                lbl.position = rect.position - Vector2(0, 4)
                                lbl.size = rect.size
                                lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
                                lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
                                lbl.add_theme_color_override("font_color", Color("ffffff"))
                                bonuses_node.add_child(lbl)


func _draw_ice_zones() -> void:
                for iz in snake.ice_zones:
                                var rect: ColorRect = ColorRect.new()
                                rect.size = Vector2(C.CELL_SIZE - 2, C.CELL_SIZE - 2)
                                rect.position = Vector2(int(iz["x"]) * C.CELL_SIZE + 1, int(iz["y"]) * C.CELL_SIZE + 1)
                                rect.color = Color(0.5, 0.7, 0.95, 0.55)
                                ice_zones_node.add_child(rect)


func _draw_speed_boosters() -> void:
                for b in snake.speed_boosters:
                                if b["eaten"]:
                                                continue
                                var rect: ColorRect = ColorRect.new()
                                rect.size = Vector2(C.CELL_SIZE - 6, C.CELL_SIZE - 6)
                                rect.position = Vector2(int(b["x"]) * C.CELL_SIZE + 3, int(b["y"]) * C.CELL_SIZE + 3)
                                rect.color = Color("f59e0b")
                                boosters_node.add_child(rect)
                                var lbl: Label = Label.new()
                                lbl.text = "⚡"
                                lbl.position = rect.position - Vector2(0, 4)
                                lbl.size = rect.size
                                lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
                                lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
                                boosters_node.add_child(lbl)


func _refresh_entity_visuals() -> void:
                # Bonus/booster yendi mi kontrol et, görsel kaldır
                for child in bonuses_node.get_children():
                                child.queue_free()
                _draw_bonus_letters()
                for child in boosters_node.get_children():
                                child.queue_free()
                _draw_speed_boosters()


func _update_letter_highlights() -> void:
                for l in letters_node.get_children():
                                if l is Letter:
                                                l.set_target_highlight(l.order_index == GameManager.current_letter_index)


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
