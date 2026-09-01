# ============================================================================
# GameManager — Tüm oyun durumunu yönetir (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Autoload (singleton) olarak kayıtlıdır. Bölüm akışını, skoru, canları,
# doğru/yanlış harf kontrolünü ve yılan-harf çarpışma mantığını yönetir.
#
# ÖNEMLİ: Aynı harften birden fazla olan kelimelerde (örn. KAKA, ADAM) doğru
# sırayı garanti etmek için her harfin kendi order_index'i vardır. Çarpışma
# kontrolü order_index == current_letter_index karşılaştırması yapar.
# ============================================================================

extends Node

const C = preload("res://scripts/constants.gd")

signal score_changed(score: int)
signal lives_changed(lives: int)
signal level_changed(level: int, tier_name: String)
signal word_changed(word: String, current_index: int)
signal status_changed(status: String)
signal letter_correct(char: String, index: int, combo: int, gained: int)
signal letter_wrong(char: String, expected: String)
signal word_complete(word: String, bonus: int)
signal game_over()
signal level_complete()

# Durum
var level: int = 1
var lives: int = C.START_LIVES
var score: int = 0
var combo: int = 0
var max_combo: int = 0
var current_word: String = ""
var current_letter_index: int = 0
var status: String = "menu"  # menu | playing | paused | wrong_letter | level_complete | game_over
var step_sec: float = 0.22
var tier_name: String = "Başlangıç"

# Alt sistemler
var word_manager: WordManager = null
var difficulty_manager: DifficultyManager = null

# Son oynanan kelimeler (tekrar önlemek için)
var _recent_words: Array = []
# Son bölümün yüklediği kelime (retry için)
var _loaded_word: String = "ADAM"
var _loaded_tricky: bool = false

# Zamanlayıcı
var _step_timer: Timer = null
var _transition_timer: Timer = null


func _ready() -> void:
	word_manager = WordManager.new()
	add_child(word_manager)
	difficulty_manager = DifficultyManager.new()
	add_child(difficulty_manager)

	_step_timer = Timer.new()
	_step_timer.name = "StepTimer"
	_step_timer.one_shot = false
	_step_timer.timeout.connect(_on_step)
	add_child(_step_timer)

	_transition_timer = Timer.new()
	_transition_timer.one_shot = true
	_transition_timer.timeout.connect(_on_transition)
	add_child(_transition_timer)


# --------------------------------------------------------------------------
# Bölüm yükleme
# --------------------------------------------------------------------------
func load_level(p_level: int) -> void:
	level = p_level
	var diff: Dictionary = difficulty_manager.get_difficulty_for_level(level)
	tier_name = diff["tier"]["name"]
	step_sec = diff["step_sec"]
	var pick: Dictionary = difficulty_manager.pick_word_for_level(level, _recent_words, word_manager)
	current_word = pick["word"]
	current_letter_index = 0
	combo = 0
	_loaded_word = current_word
	_loaded_tricky = diff["tier"]["tricky"]
	_recent_words.append(current_word)
	if _recent_words.size() > 7:
		_recent_words = _recent_words.slice(_recent_words.size() - 7)

	status = "playing"
	_emit_all()
	_start_step_timer()


func retry_level() -> void:
	if lives <= 0:
		return
	current_word = _loaded_word
	current_letter_index = 0
	combo = 0
	status = "playing"
	_emit_all()
	_start_step_timer()


func start_game() -> void:
	lives = C.START_LIVES
	score = 0
	combo = 0
	max_combo = 0
	level = 1
	_recent_words.clear()
	load_level(1)


func reset_to_menu() -> void:
	lives = C.START_LIVES
	score = 0
	combo = 0
	max_combo = 0
	level = 1
	status = "menu"
	_step_timer.stop()
	_transition_timer.stop()
	_emit_all()


# --------------------------------------------------------------------------
# Yılan-harf çarpışma kontrolü (Snake.gd'den çağrılır)
# --------------------------------------------------------------------------
func on_letter_reached(letter: Letter) -> void:
	if status != "playing":
		return
	if letter.order_index == current_letter_index:
		# DOĞRU harf
		letter.consume()
		current_letter_index += 1
		combo += 1
		max_combo = max(max_combo, combo)
		var gained: int = C.SCORE_PER_LETTER + C.COMBO_BONUS * max(0, combo - 1)
		score += gained
		letter_correct.emit(letter.char, letter.order_index, combo, gained)
		score_changed.emit(score)
		word_changed.emit(current_word, current_letter_index)
		# Kelime tamamlandı mı?
		if current_letter_index >= current_word.length():
			score += C.SCORE_WORD_BONUS
			score_changed.emit(score)
			status = "level_complete"
			status_changed.emit(status)
			word_complete.emit(current_word, C.SCORE_WORD_BONUS)
			level_complete.emit()
			_step_timer.stop()
			_transition_timer.start(C.LEVEL_COMPLETE_DELAY)
	else:
		# YANLIŞ harf
		combo = 0
		lives -= 1
		var expected: String = current_word[current_letter_index] if current_letter_index < current_word.length() else "?"
		letter_wrong.emit(letter.char, expected)
		lives_changed.emit(lives)
		if lives <= 0:
			status = "game_over"
			status_changed.emit(status)
			game_over.emit()
			_step_timer.stop()
		else:
			status = "wrong_letter"
			status_changed.emit(status)
			_step_timer.stop()
			_transition_timer.start(C.WRONG_LETTER_DELAY)


func on_wall_collision() -> void:
	if status != "playing":
		return
	lives -= 1
	lives_changed.emit(lives)
	if lives <= 0:
		status = "game_over"
		status_changed.emit(status)
		game_over.emit()
		_step_timer.stop()
	else:
		status = "wrong_letter"
		status_changed.emit(status)
		_step_timer.stop()
		_transition_timer.start(C.WRONG_LETTER_DELAY)


func on_self_collision() -> void:
	on_wall_collision()


# --------------------------------------------------------------------------
# Zamanlayıcı callback'leri
# --------------------------------------------------------------------------
func _on_step() -> void:
	# Snake.gd step() metodunu çağırır; Main sahnesi snake referansını verir.
	# Gerçek projede Main, GameManager.step_snake() çağırır.
	# Burada sinyal yayıyoruz; Main dinler.
	step_requested.emit() if has_signal("step_requested") else null


## Main sahnesi bunu çağırır: yılanı bir adım ilerletir.
func step_snake(snake: Node, letters: Array) -> void:
	if status != "playing":
		return
	snake.step(letters)


func _on_transition() -> void:
	if status == "level_complete":
		level += 1
		load_level(level)
	elif status == "wrong_letter":
		retry_level()


# --------------------------------------------------------------------------
# Durum kontrolü
# --------------------------------------------------------------------------
func pause_game() -> void:
	if status == "playing":
		status = "paused"
		status_changed.emit(status)
		_step_timer.stop()


func resume_game() -> void:
	if status == "paused":
		status = "playing"
		status_changed.emit(status)
		_start_step_timer()


# --------------------------------------------------------------------------
# Yardımcılar
# --------------------------------------------------------------------------
func _start_step_timer() -> void:
	_step_timer.wait_time = step_sec
	_step_timer.start()


func _emit_all() -> void:
	level_changed.emit(level, tier_name)
	score_changed.emit(score)
	lives_changed.emit(lives)
	word_changed.emit(current_word, current_letter_index)
	status_changed.emit(status)


# Bir sonraki hedef harf (UI vurgusu için)
func next_target_char() -> String:
	if current_letter_index < current_word.length():
		return current_word[current_letter_index]
	return ""


# Custom signal tanımı (step_requested) — Main sahnesi bunu dinler.
signal step_requested()
