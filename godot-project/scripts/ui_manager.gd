# ============================================================================
# UIManager — Üst bilgi çubuğu ve durum panelleri (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Control node'ları: LevelLabel, WordLabel, ScoreLabel, LivesLabel,
# MessageLabel, ComboLabel, TimerBar, ObstacleLabel, BonusLabel, IceLabel,
# BoostLabel, AchievementNotif, ComboFlash, GameOverPanel.
# GameManager sinyallerini dinler ve UI'ı günceller.
# ============================================================================

class_name UIManager
extends CanvasLayer

const C = preload("res://scripts/constants.gd")

@onready var level_label: Label = %LevelLabel
@onready var word_label: RichTextLabel = %WordLabel
@onready var score_label: Label = %ScoreLabel
@onready var lives_label: Label = %LivesLabel
@onready var message_label: Label = %MessageLabel
@onready var combo_label: Label = %ComboLabel
@onready var game_over_panel: Control = %GameOverPanel

@onready var timer_bar: ProgressBar = %TimerBar
@onready var obstacle_label: Label = %ObstacleLabel
@onready var bonus_label: Label = %BonusLabel
@onready var ice_label: Label = %IceLabel
@onready var boost_label: Label = %BoostLabel

@onready var achievement_notif: Control = %AchievementNotif
@onready var achievement_icon: Label = %AchievementIcon
@onready var achievement_title: Label = %AchievementTitle
@onready var achievement_desc: Label = %AchievementDesc

@onready var combo_flash: Label = %ComboFlash
@onready var snake_face: TextureRect = %SnakeFace
@onready var heart_0: TextureRect = %Heart0
@onready var heart_1: TextureRect = %Heart1
@onready var heart_2: TextureRect = %Heart2

# Can gostergesi: kalpler artik METIN degil, kit'in pixel-art sprite'lari.
# (PressStart2P'de ♥ ici BOS ciziliyor, bos kalp ♡ ise fontta YOK -> can durumu
#  okunmuyordu. Gercek sprite'lar hem net hem stile birebir uyumlu.)
const TEX_HEART_FULL: Texture2D = preload("res://assets/ui/heart_full.png")
const TEX_HEART_EMPTY: Texture2D = preload("res://assets/ui/heart_empty.png")

# --- Yilan yuzu portresi (HUD) -----------------------------------------
# snake_faces.png = 3 ifade, her biri 48x52: normal | mutlu(yiyor) | saskin
const FACES_PATH: String = "res://assets/snake/snake_faces.png"
const FACE_W: int = 48
const FACE_H: int = 52
const FACE_ORDER: Array = ["normal", "happy", "shock"]
var _faces_sheet: Texture2D = null
var _face_atlas: AtlasTexture = null
var _face_timer: Timer = null

# Achievement notif timer
var _achievement_hide_timer: Timer = null
# Combo flash timer
var _combo_flash_timer: Timer = null


func _ready() -> void:
		GameManager.score_changed.connect(_on_score_changed)
		GameManager.lives_changed.connect(_on_lives_changed)
		GameManager.level_changed.connect(_on_level_changed)
		GameManager.word_changed.connect(_on_word_changed)
		GameManager.status_changed.connect(_on_status_changed)
		GameManager.letter_correct.connect(_on_letter_correct)
		GameManager.letter_wrong.connect(_on_letter_wrong)
		GameManager.word_complete.connect(_on_word_complete)
		GameManager.combo_changed.connect(_on_combo_changed)
		GameManager.time_changed.connect(_on_time_changed)
		GameManager.boost_changed.connect(_on_boost_changed)
		GameManager.obstacle_collision.connect(_on_obstacle_collision)
		GameManager.time_up.connect(_on_time_up)
		GameManager.ate_bonus.connect(_on_ate_bonus)
		GameManager.stars_changed.connect(_on_stars_changed)
		GameManager.boost_collected.connect(_on_boost_collected)
		GameManager.ice_entered.connect(_on_ice_entered)
		GameManager.achievement_unlocked.connect(_on_achievement_unlocked)
		GameManager.translation_shown.connect(_on_translation_shown)
		_update_word_display("", 0)

		_achievement_hide_timer = Timer.new()
		_achievement_hide_timer.one_shot = true
		_achievement_hide_timer.wait_time = 4.0
		_achievement_hide_timer.timeout.connect(_hide_achievement_notif)
		add_child(_achievement_hide_timer)

		_combo_flash_timer = Timer.new()
		_combo_flash_timer.one_shot = true
		_combo_flash_timer.wait_time = 1.2
		_combo_flash_timer.timeout.connect(_hide_combo_flash)
		add_child(_combo_flash_timer)

		# Yuz portresi: ifade 1.1 sn sonra kendiliginden "normal"e doner
		_face_timer = Timer.new()
		_face_timer.one_shot = true
		_face_timer.wait_time = 1.1
		_face_timer.timeout.connect(_on_face_timer_timeout)
		add_child(_face_timer)
		_set_face("normal")

		# İlk başlangıç durumu
		if achievement_notif:
				achievement_notif.visible = false
		if combo_flash:
				combo_flash.visible = false
		if timer_bar:
				timer_bar.visible = false
		if boost_label:
				boost_label.visible = false


# --------------------------------------------------------------------------
# Sinyal işleyiciler
# --------------------------------------------------------------------------
func _on_score_changed(s: int) -> void:
		var best_score: int = int(GameManager.stats.get("bestScore", 0))
		if s >= best_score and s > 0:
				score_label.text = "★ Skor: %d (REKOR!)" % s
		else:
				score_label.text = "Skor: %d" % s


func _on_lives_changed(l: int) -> void:
		var total_lives: int = C.START_LIVES
		if GameManager.easy_mode:
				total_lives += C.EASY_MODE_EXTRA_LIVES
		lives_label.text = "Can:"
		var hearts: Array = [heart_0, heart_1, heart_2]
		for i in range(hearts.size()):
				var h: TextureRect = hearts[i]
				if h == null:
						continue
				h.visible = i < total_lives
				h.texture = TEX_HEART_FULL if i < l else TEX_HEART_EMPTY


func _on_level_changed(lvl: int, tier: String) -> void:
		if GameManager.daily_challenge:
				level_label.text = "Günlük Challenge  •  %s" % tier
		else:
				level_label.text = "Bölüm %d  •  %s" % [lvl, tier]


func _on_word_changed(word: String, idx: int) -> void:
		_update_word_display(word, idx)


# --------------------------------------------------------------------------
# Yilan yuzu portresi — normal / mutlu / saskin
# --------------------------------------------------------------------------
func _set_face(expr: String) -> void:
		if snake_face == null:
				return
		if _faces_sheet == null:
				_faces_sheet = load(FACES_PATH)
		if _faces_sheet == null:
				return
		var idx: int = FACE_ORDER.find(expr)
		if idx < 0:
				idx = 0
		if _face_atlas == null:
				_face_atlas = AtlasTexture.new()
				_face_atlas.atlas = _faces_sheet
				snake_face.texture = _face_atlas
		_face_atlas.region = Rect2(idx * FACE_W, 0, FACE_W, FACE_H)
		# Sevinç / şaşkınlıkta küçük "pop" (normalde animasyon yok)
		if expr != "normal":
				snake_face.pivot_offset = snake_face.size / 2.0
				var tw: Tween = create_tween()
				tw.tween_property(snake_face, "scale", Vector2(1.16, 1.16), 0.08)
				tw.tween_property(snake_face, "scale", Vector2.ONE, 0.18)
				if _face_timer != null:
						_face_timer.start()


func _on_face_timer_timeout() -> void:
		_set_face("normal")


func _on_status_changed(s: String) -> void:
		match s:
				"playing":
						message_label.text = ""
						game_over_panel.visible = false
						_set_face("normal")
				"wrong_letter":
						message_label.text = "YANLIŞ HARF!"
						_set_face("shock")
				"level_complete":
						message_label.text = "BÖLÜM TAMAMLANDI!"
						_set_face("happy")
				"game_over":
						message_label.text = "OYUN BİTTİ"
						game_over_panel.visible = true
						_set_face("shock")
				"time_up":
						message_label.text = "SÜRE DOLDU!"
						_set_face("shock")
				"paused":
						message_label.text = "DURAKLATILDI"
				"menu":
						message_label.text = ""
						game_over_panel.visible = false
						_set_face("normal")
						if timer_bar:
								timer_bar.visible = false
						if boost_label:
								boost_label.visible = false


func _on_letter_correct(_char: String, _index: int, _combo: int, _gained: int) -> void:
		# combo_changed skoru/combo'yu isler; yuz portresi de sevinir
		_set_face("happy")


func _on_letter_wrong(_char: String, _expected: String) -> void:
		combo_label.visible = false
		_set_face("shock")


func _on_word_complete(_word: String, _bonus: int, _translation: String) -> void:
		combo_label.visible = false
		_set_face("happy")


func _on_combo_changed(c: int) -> void:
		if c > 1:
				combo_label.text = "COMBO ×%d" % c
				combo_label.visible = true
				# Combo seviyesine göre renk
				if c >= 10:
						combo_label.add_theme_color_override("font_color", Color("f43f5e"))
				elif c >= 5:
						combo_label.add_theme_color_override("font_color", Color("f59e0b"))
						# x5'in katlarında ekran flash
						if c % 5 == 0:
								_show_combo_flash(c)
				else:
						combo_label.add_theme_color_override("font_color", Color("f59e0b"))
		else:
				combo_label.visible = false


func _on_time_changed(remaining_ms: int, limit_ms: int) -> void:
		if not timer_bar:
				return
		if limit_ms <= 0:
				timer_bar.visible = false
				return
		timer_bar.visible = true
		var ratio: float = float(remaining_ms) / float(limit_ms)
		timer_bar.value = ratio * 100.0
		# Son 10s amber, son 5s rose
		if remaining_ms <= 5000:
				timer_bar.modulate = Color("f43f5e")
		elif remaining_ms <= 10000:
				timer_bar.modulate = Color("f59e0b")
		else:
				timer_bar.modulate = Color("10b981")


func _on_boost_changed(remaining_ms: int) -> void:
		if not boost_label:
				return
		if remaining_ms > 0:
				boost_label.visible = true
				var sec: float = remaining_ms / 1000.0
				boost_label.text = "» Boost: %.1fs" % sec
				boost_label.add_theme_color_override("font_color", Color("f59e0b"))
		else:
				boost_label.visible = false


func _on_obstacle_collision() -> void:
		# Obstacle sayacı için snake'ten okuma Main'e bırakılır; burada feedback yeter
		pass


func _on_time_up() -> void:
		pass  # status_changed zaten mesaj gösteriyor


func _on_ate_bonus(_char: String, _gained: int) -> void:
		if bonus_label:
				var cur: int = int(bonus_label.get_meta("count", 0))
				bonus_label.set_meta("count", max(0, cur - 1))
				_update_entity_counts()


func _on_boost_collected(_gained: int) -> void:
		if boost_label:
				boost_label.visible = true


func _on_ice_entered() -> void:
		pass  # görsel efekt Snake üzerinden yansır


func _on_achievement_unlocked(a: Dictionary) -> void:
		if not achievement_notif:
				return
		achievement_icon.text = a.get("icon", "★")
		achievement_title.text = a.get("title", "Başarım!")
		achievement_desc.text = a.get("description", "")
		achievement_notif.visible = true
		achievement_notif.modulate = Color(1, 1, 1, 1)
		# Tween ile slide-in
		var tween: Tween = create_tween()
		achievement_notif.position.x = 700
		tween.tween_property(achievement_notif, "position:x", 560, 0.4).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		_achievement_hide_timer.start()


func _on_translation_shown(_word: String, translation: String) -> void:
		if message_label and not translation.is_empty():
				message_label.text = "EN: %s" % translation


## YILDIZ ÖDÜLÜ: 15 yıldız doldu -> kuyruktan 1 segment düştü.
func show_star_reward(stars: int) -> void:
		if message_label == null:
				return
		message_label.text = "★ %d YILDIZ — 1 KUYRUK DÜŞTÜ" % stars
		var t: SceneTreeTimer = get_tree().create_timer(2.5)
		t.timeout.connect(func() -> void:
				if message_label and message_label.text.begins_with("★"):
						message_label.text = "")


## Yıldız ilerlemesi değişti — etiketi tazele
func _on_stars_changed(_stars: int, _needed: int) -> void:
		if bonus_label:
				_update_entity_counts()


# --------------------------------------------------------------------------
# Entity sayaçlarını güncelle (Main.gd çağırır)
# --------------------------------------------------------------------------
func update_entity_counts(obstacles: int, bonuses: int, ice_zones: int) -> void:
		if obstacle_label:
				obstacle_label.text = "Engeller: %d" % obstacles
				obstacle_label.visible = obstacles > 0
		if bonus_label:
				# ★ Bonus: tahtadaki yıldız sayısı  •  ödüle kalan ilerleme (her 15'te 1 kuyruk)
				var need: int = C.STARS_PER_TAIL_DROP
				var prog: int = GameManager.stars_eaten % need if need > 0 else 0
				bonus_label.text = "★ Bonus: %d • %d/%d" % [bonuses, prog, need]
				bonus_label.visible = bonuses > 0 or prog > 0
		if ice_label:
				ice_label.text = "Buz: %d" % ice_zones
				ice_label.visible = ice_zones > 0


func _update_entity_counts() -> void:
		# Bonus harf yendiğinde bu çağrılır; snake'in bonus_letters dizisindeki
		# kalan (eaten=false) sayısı için Main güncellemeli.
		pass


# --------------------------------------------------------------------------
# Combo flash
# --------------------------------------------------------------------------
func _show_combo_flash(c: int) -> void:
		if not combo_flash:
				return
		combo_flash.text = "COMBO ×%d!" % c
		combo_flash.visible = true
		combo_flash.modulate = Color("f59e0b")
		combo_flash.scale = Vector2(0.5, 0.5)
		var tween: Tween = create_tween()
		tween.tween_property(combo_flash, "scale", Vector2(1.2, 1.2), 0.3).set_ease(Tween.EASE_OUT)
		tween.tween_property(combo_flash, "scale", Vector2(1.0, 1.0), 0.2).set_ease(Tween.EASE_IN_OUT)
		_combo_flash_timer.start()


func _hide_combo_flash() -> void:
		if combo_flash:
				var tween: Tween = create_tween()
				tween.tween_property(combo_flash, "modulate:a", 0.0, 0.3)
				tween.tween_callback(func(): combo_flash.visible = false)


# --------------------------------------------------------------------------
# Achievement notif gizle
# --------------------------------------------------------------------------
func _hide_achievement_notif() -> void:
		if achievement_notif:
				var tween: Tween = create_tween()
				tween.tween_property(achievement_notif, "modulate:a", 0.0, 0.4)
				tween.tween_callback(func(): achievement_notif.visible = false)
				tween.tween_callback(func(): achievement_notif.modulate = Color(1, 1, 1, 1))


# --------------------------------------------------------------------------
# Yardımcılar
# --------------------------------------------------------------------------
## Hedef kelimeyi göster:
## - hide_word kapalıysa kelimenin TAMAMI görünür
##     yenmiş harfler yeşil, sıradaki harf sarı+kalin, kalanlar soluk beyaz
## - hide_word açıksa (yüksek zorluk) henüz yenmemiş harfler "_" ile maskelenir
func _update_word_display(word: String, idx: int) -> void:
		if word.is_empty():
				word_label.text = "[center][color=#64748b]—[/color][/center]"
				return

		if GameManager.is_word_hidden():
				var mask: String = ""
				for i in range(word.length()):
						mask += (word[i] if i < idx else "_")
						if i < word.length() - 1:
								mask += " "
				word_label.text = "[center][font_size=30][color=#e2e8f0]%s[/color][/font_size][/center]" % mask
				return

		var parts: PackedStringArray = PackedStringArray()
		for i in range(word.length()):
				var ch: String = word[i]
				if i < idx:
						# Yenmiş harf — yeşil
						parts.append("[color=#34d399]%s[/color]" % ch)
				elif i == idx:
						# Sıradaki hedef harf — sarı ve kalin
						parts.append("[color=#fbbf24][b]%s[/b][/color]" % ch)
				else:
						# Henüz yenmemiş harf — soluk
						parts.append("[color=#94a3b8]%s[/color]" % ch)
		word_label.text = "[center][font_size=30]%s[/font_size][/center]" % " ".join(parts)
