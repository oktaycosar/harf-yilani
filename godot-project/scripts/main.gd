# ============================================================================
# Main — Ana sahne scripti (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Sahne hiyerarşisi:
#   Main (Node2D)
#   ├── GameManager (autoload — global, sahnede değil)
#   ├── UIManager (CanvasLayer)
#   │   ├── LevelLabel (Label)
#   │   ├── WordLabel (Label)
#   │   ├── ScoreLabel (Label)
#   │   ├── LivesLabel (Label)
#   │   ├── MessageLabel (Label)
#   │   └── ComboLabel (Label)
#   ├── GameArea (Node2D)
#   │   ├── Snake (Node2D — snake.gd)
#   │   └── Letters (Node2D — harf objeleri buraya eklenir)
#   └── GameOverPanel (Control)
#
# Bu script klavye girdisini yönetir, harfleri sahneye yerleştirir ve
# GameManager ile Snake arasında köprü kurar.
# ============================================================================

extends Node2D

const C = preload("res://scripts/constants.gd")

@onready var snake: Node2D = $GameArea/Snake
@onready var letters_node: Node2D = $GameArea/Letters
@onready var game_over_panel: Control = $GameOverPanel


func _ready() -> void:
	GameManager.status_changed.connect(_on_status_changed)
	GameManager.step_requested.connect(_on_step_requested)
	# Başlangıç menüsü
	_show_menu()


func _on_status_changed(new_status: String) -> void:
	if new_status == "playing":
		_place_letters()
		_reset_snake()
	elif new_status == "menu":
		_clear_letters()


func _on_step_requested() -> void:
	# GameManager'dan gelen adım isteği: yılanı ilerlet
	var letters: Array = []
	for l in letters_node.get_children():
		letters.append(l)
	GameManager.step_snake(snake, letters)
	# Harf vurgusunu güncelle (sıradaki hedef)
	_update_letter_highlights()


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
# Yardımcılar
# --------------------------------------------------------------------------
func _show_menu() -> void:
	game_over_panel.visible = false


func _reset_snake() -> void:
	var start_cell: Vector2i = Vector2i(C.GRID_COLS / 2, C.GRID_ROWS / 2)
	snake.cols = C.GRID_COLS
	snake.rows = C.GRID_ROWS
	snake.reset(start_cell, C.SNAKE_START_LENGTH, snake.DIR_RIGHT)


func _place_letters() -> void:
	_clear_letters()
	var word: String = GameManager.current_word
	# Boş hücreleri topla (yılan gövdesi hariç)
	var occupied: Dictionary = {}
	for seg in snake.body:
		occupied[seg] = true
	var free_cells: Array = []
	for y in range(1, C.GRID_ROWS - 1):
		for x in range(1, C.GRID_COLS - 1):
			if not occupied.has(Vector2i(x, y)):
				free_cells.append(Vector2i(x, y))
	free_cells.shuffle()
	# Her harf için bir Letter objesi oluştur
	for i in range(word.length()):
		if free_cells.is_empty():
			break
		var cell: Vector2i = free_cells.pop_back()
		var letter: Letter = preload("res://scenes/Letter.tscn").instantiate()
		letter.char = word[i]
		letter.order_index = i
		letter.grid_x = cell.x
		letter.grid_y = cell.y
		letter.position = Vector2(cell.x * C.CELL_SIZE + C.CELL_SIZE / 2.0, cell.y * C.CELL_SIZE + C.CELL_SIZE / 2.0)
		letter.add_to_group("letters")
		letters_node.add_child(letter)
	_update_letter_highlights()


func _update_letter_highlights() -> void:
	for l in letters_node.get_children():
		if l is Letter:
			l.set_target_highlight(l.order_index == GameManager.current_letter_index)


func _clear_letters() -> void:
	for child in letters_node.get_children():
		child.queue_free()
