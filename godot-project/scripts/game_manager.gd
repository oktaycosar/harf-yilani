# ============================================================================
# GameManager — Tüm oyun durumunu yönetir (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Autoload (singleton) olarak kayıtlıdır. Bölüm akışını, skoru, canları,
# doğru/yanlış harf kontrolünü, yılan-harf çarpışma mantığını, engelleri,
# bonus harfleri, buz alanlarını, hız artırıcıları, süreli modu, kolay modu,
# günlük challenge'ı, TR→EN çeviriyi, skin seçimini, istatistik kalıcılığını,
# liderlik tablosunu, achievement'ları, kategori ilerlemesini ve haftalık
# istatistikleri yönetir.
#
# Kalıcılık: ConfigFile (user://harf_yilani.cfg) — Godot'un standalone
# localStorage karşılığı. Tüm istatistik + ayar + leaderboard burada.
# ============================================================================

extends Node

const C = preload("res://scripts/constants.gd")

# --------------------------------------------------------------------------
# Sinyaller
# --------------------------------------------------------------------------
signal score_changed(score: int)
signal lives_changed(lives: int)
signal level_changed(level: int, tier_name: String)
signal word_changed(word: String, current_index: int)
signal status_changed(status: String)
signal letter_correct(char: String, index: int, combo: int, gained: int)
signal letter_wrong(char: String, expected: String)
signal word_complete(word: String, bonus: int, translation: String)
signal game_over(score: int, level: int, words_completed: int)
signal level_complete()
signal step_requested()

# Yeni olay sinyalleri
signal obstacle_collision()
signal time_up()
signal ate_bonus(char: String, gained: int)
signal boost_collected(gained: int)
signal ice_entered()
signal time_changed(remaining_ms: int, limit_ms: int)
signal boost_changed(remaining_ms: int)
signal combo_changed(combo: int)
signal achievement_unlocked(achievement: Dictionary)
signal stats_changed(stats: Dictionary)
signal leaderboard_changed(leaderboard: Array)
signal category_progress_changed(category: String, count: int)
signal translation_shown(word: String, translation: String)

# --------------------------------------------------------------------------
# Oyun durumu
# --------------------------------------------------------------------------
var level: int = 1
var lives: int = C.START_LIVES
var score: int = 0
var combo: int = 0
var max_combo: int = 0
var current_word: String = ""
var current_letter_index: int = 0
var status: String = "menu"  # menu | playing | paused | wrong_letter | level_complete | game_over | time_up
var step_sec: float = 0.22
var tier_name: String = "Başlangıç"

# Süreli mod
var time_limit_ms: int = 0
var time_remaining_ms: int = 0

# Boost durumu (Snake kendi boost_end_time'ını tutar; burası UI için ayna)
var boost_remaining_ms: int = 0

# Mod seçimi
var easy_mode: bool = false
var daily_challenge: bool = false
var tr_en_mode: bool = false
var category: int = C.Category.KARISIK

# Oyun içi sayaçlar
var words_completed_in_run: int = 0
var no_death_streak: int = 0

# Aktif skin
var current_skin: Dictionary = {}

# TR→EN çeviri sözlüğü
const TR_EN_DICT: Dictionary = {
                # 3 harf
                "ADA": "island", "ANA": "mother", "ARI": "bee", "BAL": "honey", "DAL": "branch",
                "GÜL": "rose", "KOL": "arm", "ÇAY": "tea", "AŞK": "love", "SÜT": "milk",
                "YAĞ": "oil", "KÖY": "village", "GÖL": "lake", "YIL": "year", "SAÇ": "hair",
                "SUÇ": "crime", "BEŞ": "five", "DİŞ": "tooth", "GÜÇ": "power", "SÖZ": "word",
                "YÜZ": "face", "ÇOK": "much", "ÖZÜ": "essence", "EKİ": "affix", "İŞİ": "his work",
                # 4 harf
                "ADAM": "man", "MASA": "table", "ELMA": "apple", "KAPI": "door", "BABA": "father",
                "KALE": "castle", "EVİM": "my house", "ÇİLE": "suffering", "BORU": "pipe",
                "BALO": "ball", "EKİM": "October", "KÜPE": "earring", "YAZI": "text",
                "BORA": "bora", "DURU": "clear", "SABA": "saba", "TUĞL": "brick",
                "DİŞİ": "female", "SUCU": "water seller", "YÜZÜ": "his face", "GÖLÜ": "his lake",
                "GÖCE": "migration", "KEÇİ": "goat", "EŞEK": "donkey", "TAVU": "rooster",
                "BALI": "honey (acc)", "KOYU": "dark", "KUŞU": "his bird", "ARIK": "lean",
                # 5 harf
                "KİTAP": "book", "KALEM": "pencil", "ÇİÇEK": "flower", "BULUT": "cloud",
                "DENİZ": "sea", "YILAN": "snake", "BALIK": "fish", "KÖPRÜ": "bridge",
                "SİNEK": "fly", "GÜNEŞ": "sun", "MAKAS": "scissors", "DEFNE": "laurel",
                "KAĞIT": "paper", "ÇANTA": "bag", "BİLGİ": "knowledge", "SULAR": "waters",
                "BİLGE": "wise", "MÜZİK": "music", "SEBZE": "vegetable", "ARMUT": "pear",
                "TAVUK": "chicken", "GÖMLE": "shirt", "CAMLI": "glassy", "EKMEK": "bread",
                "ARPA": "barley", "ÇİLEK": "strawberry", "KARPU": "watermelon",
                # 6 harf
                "BİLİM": "science", "BAHÇE": "garden", "KAHVE": "coffee", "GÖMLEK": "shirt",
                "BÖLÜM": "section", "YILDIZ": "star", "KUŞLAR": "birds", "ŞARKIL": "song",
                "KAĞIDI": "his paper", "SEPETİ": "his basket", "TRENLER": "trains",
                "SOKAKL": "street", "YATAKL": "bed", "ÇOCUKL": "child", "KAPILA": "gates",
                "TORBASI": "his bag", "TARÇIN": "cinnamon", "TAVŞAN": "rabbit",
}

# Achievement tanımları
const ACHIEVEMENT_DEFS: Array = [
                {"id": "first_word", "title": "İlk Kelime", "description": "İlk kelimeni tamamla", "icon": "🎯"},
                {"id": "combo_5", "title": "Combo Ustası", "description": "5x combo yap", "icon": "🔥"},
                {"id": "combo_10", "title": "Combo Efsanesi", "description": "10x combo yap", "icon": "⚡"},
                {"id": "score_100", "title": "Yüzü Geç", "description": "100 puana ulaş", "icon": "💯"},
                {"id": "score_500", "title": "Beş Yüz Kulübü", "description": "500 puana ulaş", "icon": "🏆"},
                {"id": "score_1000", "title": "Bin Puan", "description": "1000 puana ulaş", "icon": "👑"},
                {"id": "level_5", "title": "Acemi", "description": "5. bölüme ulaş", "icon": "🌱"},
                {"id": "level_10", "title": "Çırak", "description": "10. bölüme ulaş", "icon": "⭐"},
                {"id": "level_25", "title": "Usta", "description": "25. bölüme ulaş", "icon": "🎖️"},
                {"id": "words_10", "title": "Kelime Avcısı", "description": "10 kelime tamamla", "icon": "📚"},
                {"id": "words_50", "title": "Kelime Hazinesi", "description": "50 kelime tamamla", "icon": "📖"},
                {"id": "daily_done", "title": "Günlük Görev", "description": "Günlük kelimeyi tamamla", "icon": "📅"},
                {"id": "booster_collect", "title": "Hız Toplayıcı", "description": "İlk hız boostunu topla", "icon": "🚀"},
                {"id": "no_death_run", "title": "Kusursuz Bölüm", "description": "Hatayla 5 kelime üst üste tamamla", "icon": "✨"},
]

# --------------------------------------------------------------------------
# Alt sistemler
# --------------------------------------------------------------------------
var word_manager: WordManager = null
var difficulty_manager: DifficultyManager = null

# Son oynanan kelimeler (tekrar önlemek için)
var _recent_words: Array = []
# Son bölümün yüklediği kelime (retry için)
var _loaded_word: String = "ADAM"
var _loaded_tricky: bool = false
var _loaded_obstacles: int = 0
var _loaded_timed: bool = false
var _loaded_time_limit_ms: int = 0

# Zamanlayıcı
var _step_timer: Timer = null
var _transition_timer: Timer = null

# ConfigFile (kalıcılık)
var _config: ConfigFile = null
const CONFIG_PATH: String = "user://harf_yilani.cfg"

# Stats
var stats: Dictionary = {}
var leaderboard: Array = []
var achievements: Array = []
var category_progress: Dictionary = {}
var weekly_stats: Array = []  # 7 Dictionary: {date, gamesPlayed, score}

# Ses (basit — gerçek ses dosyası yok, sadece state)
var sound_enabled: bool = true
var sound_volume: float = 0.35
var tts_volume: float = 0.9


# ==========================================================================
# Yaşam döngüsü
# ==========================================================================
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

                _load_persisted_state()
                current_skin = _load_skin()


func _process(_delta: float) -> void:
                if status == "playing":
                                # Süreli mod: gerçek zaman akışı
                                if time_limit_ms > 0:
                                                update_time(int(_delta * 1000.0))
                                # Boost güncelle
                                update_boost()


# ==========================================================================
# Bölüm yükleme
# ==========================================================================
func load_level(p_level: int) -> void:
                level = p_level
                var diff: Dictionary = difficulty_manager.get_difficulty_for_level(level, easy_mode)
                tier_name = diff["tier"]["name"]
                step_sec = diff["step_sec"]
                _loaded_tricky = diff["tier"]["tricky"]
                _loaded_obstacles = diff["obstacle_count"]
                _loaded_timed = diff["timed"]
                _loaded_time_limit_ms = diff["time_limit_ms"]

                var pick: Dictionary
                if daily_challenge:
                                # Günlük challenge tek bölüm, engel/süre yok
                                current_word = difficulty_manager.pick_daily_word(word_manager)
                                pick = {"word": current_word, "length": current_word.length()}
                                _loaded_obstacles = 0
                                _loaded_timed = false
                                _loaded_time_limit_ms = 0
                else:
                                pick = difficulty_manager.pick_word_for_level(level, _recent_words, word_manager, category)
                                current_word = pick["word"]
                current_letter_index = 0
                combo = 0
                words_completed_in_run = 0
                _loaded_word = current_word
                _recent_words.append(current_word)
                if _recent_words.size() > 7:
                                _recent_words = _recent_words.slice(_recent_words.size() - 7)

                # Süreli mod
                time_limit_ms = _loaded_time_limit_ms
                time_remaining_ms = time_limit_ms

                # Stat güncelle (en ileri bölüm)
                if level > int(stats.get("bestLevel", 1)):
                                stats["bestLevel"] = level
                                _save_stats()

                status = "playing"
                _emit_all()
                _start_step_timer()


func retry_level() -> void:
                if lives <= 0:
                                return
                current_word = _loaded_word
                current_letter_index = 0
                combo = 0
                time_limit_ms = _loaded_time_limit_ms
                time_remaining_ms = time_limit_ms
                status = "playing"
                _emit_all()
                _start_step_timer()


func start_game() -> void:
                var start_lives: int = C.START_LIVES
                if easy_mode:
                                start_lives += C.EASY_MODE_EXTRA_LIVES
                lives = start_lives
                score = 0
                combo = 0
                max_combo = 0
                words_completed_in_run = 0
                no_death_streak = 0
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


# ==========================================================================
# Yılan-harf çarpışma kontrolü (Snake.gd'den gelen sinyaller)
# ==========================================================================
func on_letter_reached(letter: Dictionary) -> void:
                if status != "playing":
                                return
                if int(letter["order_index"]) == current_letter_index:
                                # DOĞRU harf
                                current_letter_index += 1
                                combo += 1
                                max_combo = max(max_combo, combo)
                                var gained: int = C.SCORE_PER_LETTER + C.COMBO_BONUS * max(0, combo - 1)
                                score += gained
                                letter_correct.emit(letter["char"], letter["order_index"], combo, gained)
                                combo_changed.emit(combo)
                                score_changed.emit(score)
                                word_changed.emit(current_word, current_letter_index)
                                _check_achievements_realtime(combo)
                                # Kelime tamamlandı mı?
                                if current_letter_index >= current_word.length():
                                                var time_bonus: int = 0
                                                if time_limit_ms > 0 and float(time_remaining_ms) / float(time_limit_ms) > C.TIME_BONUS_THRESHOLD:
                                                                time_bonus = C.TIME_BONUS_POINTS
                                                                score += time_bonus
                                                score += C.SCORE_WORD_BONUS
                                                words_completed_in_run += 1
                                                no_death_streak += 1
                                                # İstatistik güncelle
                                                stats["totalWordsCompleted"] = int(stats.get("totalWordsCompleted", 0)) + 1
                                                if score > int(stats.get("bestScore", 0)):
                                                                stats["bestScore"] = score
                                                _save_stats()
                                                # Kategori ilerlemesi
                                                var cat_key: String = C.category_key(category)
                                                category_progress[cat_key] = int(category_progress.get(cat_key, 0)) + 1
                                                _save_category_progress()
                                                category_progress_changed.emit(cat_key, category_progress[cat_key])
                                                # TR→EN çeviri
                                                var translation: String = ""
                                                if tr_en_mode:
                                                                translation = get_translation(current_word)
                                                # Günlük challenge işaretle
                                                if daily_challenge:
                                                                _mark_daily_completed()
                                                                _check_achievements_realtime(0, true)
                                                # Achievement kontrol
                                                _check_achievements()
                                                # Boost kalan süre
                                                boost_remaining_ms = 0
                                                score_changed.emit(score)
                                                status = "level_complete"
                                                status_changed.emit(status)
                                                word_complete.emit(current_word, C.SCORE_WORD_BONUS + time_bonus, translation)
                                                if not translation.is_empty():
                                                                translation_shown.emit(current_word, translation)
                                                level_complete.emit()
                                                _step_timer.stop()
                                                _transition_timer.start(C.LEVEL_COMPLETE_DELAY)
                else:
                                # YANLIŞ harf
                                combo = 0
                                no_death_streak = 0
                                lives -= 1
                                var expected: String = current_word[current_letter_index] if current_letter_index < current_word.length() else "?"
                                letter_wrong.emit(letter["char"], expected)
                                lives_changed.emit(lives)
                                combo_changed.emit(combo)
                                if lives <= 0:
                                                _handle_game_over()
                                else:
                                                status = "wrong_letter"
                                                status_changed.emit(status)
                                                _step_timer.stop()
                                                _transition_timer.start(C.WRONG_LETTER_DELAY)


func on_wall_collision() -> void:
                _fail_with("wall_collision")


func on_self_collision() -> void:
                _fail_with("self_collision")


func on_obstacle_collision() -> void:
                _fail_with("obstacle_collision")
                obstacle_collision.emit()


func on_ate_bonus(char: String, gained: int) -> void:
                if status != "playing":
                                return
                score += gained
                ate_bonus.emit(char, gained)
                score_changed.emit(score)


func on_boost_collected(gained: int) -> void:
                if status != "playing":
                                return
                score += gained
                boost_collected.emit(gained)
                score_changed.emit(score)
                _check_achievements_realtime(0, false, true)


func on_ice_entered() -> void:
                ice_entered.emit()


func _fail_with(kind: String) -> void:
                if status != "playing":
                                return
                combo = 0
                no_death_streak = 0
                lives -= 1
                lives_changed.emit(lives)
                combo_changed.emit(combo)
                if lives <= 0:
                                _handle_game_over()
                else:
                                status = "wrong_letter"
                                status_changed.emit(status)
                                _step_timer.stop()
                                _transition_timer.start(C.WRONG_LETTER_DELAY)


func _handle_game_over() -> void:
                status = "game_over"
                status_changed.emit(status)
                _step_timer.stop()
                # Stats kayıt
                stats["totalGames"] = int(stats.get("totalGames", 0)) + 1
                if score > int(stats.get("bestScore", 0)):
                                stats["bestScore"] = score
                if level > int(stats.get("bestLevel", 1)):
                                stats["bestLevel"] = level
                _save_stats()
                # Liderlik tablosuna ekle
                _add_to_leaderboard(score, level, current_word)
                # Haftalık stat kaydı
                _record_weekly_play(score)
                # Achievement kontrol
                _check_achievements()
                game_over.emit(score, level, words_completed_in_run)


# ==========================================================================
# Zamanlayıcı callback'leri
# ==========================================================================
func _on_step() -> void:
                step_requested.emit()


## Main sahnesi bunu çağırır: yılanı bir adım ilerletir.
func step_snake(snake: Node) -> void:
                if status != "playing":
                                return
                # Boost güncelle (süresi dolduysa sıfırla)
                snake.update_boost()
                # Hız çarpanına göre step_timer'ı yeniden ayarla
                var mult: float = snake.get_active_speed_multiplier()
                var effective_step: float = step_sec / mult if mult > 0 else step_sec
                _step_timer.wait_time = clampf(effective_step, C.SPEED_MIN_SEC * 0.5, C.SPEED_MAX_SEC * 2.0)
                # Snake içinde current_target_index set et
                snake.current_target_index = current_letter_index
                snake.step()
                # Boost kalan süre aynala
                boost_remaining_ms = snake.boost_remaining_ms()
                boost_changed.emit(boost_remaining_ms)


func _on_transition() -> void:
                if status == "level_complete":
                                if daily_challenge:
                                                # Günlük challenge tek bölüm — menüye dön
                                                reset_to_menu()
                                else:
                                                level += 1
                                                load_level(level)
                elif status == "wrong_letter":
                                retry_level()
                elif status == "time_up":
                                retry_level()


# ==========================================================================
# Süre / Boost güncellemeleri
# ==========================================================================
func update_time(dt_ms: int) -> void:
                if status != "playing" or time_limit_ms <= 0:
                                return
                if time_remaining_ms <= 0:
                                return
                # dt kırpma (sekme arka plan senaryosu)
                var dt: int = min(dt_ms, 100)
                time_remaining_ms = max(0, time_remaining_ms - dt)
                time_changed.emit(time_remaining_ms, time_limit_ms)
                if time_remaining_ms <= 0:
                                combo = 0
                                no_death_streak = 0
                                lives -= 1
                                lives_changed.emit(lives)
                                combo_changed.emit(combo)
                                time_up.emit()
                                if lives <= 0:
                                                _handle_game_over()
                                else:
                                                status = "time_up"
                                                status_changed.emit(status)
                                                _step_timer.stop()
                                                _transition_timer.start(C.WRONG_LETTER_DELAY)


func update_boost() -> void:
                # Boost süresi Snake tarafında yönetiliyor; UI için kalanı yayınla
                # (Snake.step_snake içinde güncelleniyor; burada yalnızca boost_end kontrolü)
                pass


# ==========================================================================
# Durum kontrolü
# ==========================================================================
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


func set_easy_mode(enabled: bool) -> void:
                easy_mode = enabled


func set_daily_challenge(enabled: bool) -> void:
                daily_challenge = enabled


func set_tr_en_mode(enabled: bool) -> void:
                tr_en_mode = enabled


func set_category(cat: int) -> void:
                category = cat


# ==========================================================================
# TR→EN çeviri
# ==========================================================================
func get_translation(tr_word: String) -> String:
                var key: String = tr_word.to_upper()
                if TR_EN_DICT.has(key):
                                return TR_EN_DICT[key]
                return ""


# ==========================================================================
# Skin yönetimi
# ==========================================================================
func load_skin() -> Dictionary:
                current_skin = _load_skin()
                return current_skin


func save_skin(id: String) -> void:
                _config.set_value("cosmetics", "skin", id)
                _save_config()
                current_skin = C.get_skin_by_id(id)


func _load_skin() -> Dictionary:
                var id: String = _config.get_value("cosmetics", "skin", C.DEFAULT_SKIN_ID)
                return C.get_skin_by_id(id)


func get_skin() -> Dictionary:
                if current_skin.is_empty():
                                current_skin = _load_skin()
                return current_skin


# ==========================================================================
# Ses ayarları
# ==========================================================================
func set_sound_enabled(enabled: bool) -> void:
                sound_enabled = enabled
                stats["soundEnabled"] = enabled
                _save_stats()
                stats_changed.emit(stats)


func set_sound_volume(v: float) -> void:
                sound_volume = clamp(v, 0.0, 1.0)
                stats["soundVolume"] = sound_volume
                _save_stats()
                stats_changed.emit(stats)


func set_tts_volume(v: float) -> void:
                tts_volume = clamp(v, 0.0, 1.0)
                stats["ttsVolume"] = tts_volume
                _save_stats()
                stats_changed.emit(stats)


# ==========================================================================
# Achievement sistemi
# ==========================================================================
func _check_achievements() -> void:
                var newly_unlocked: Array = []
                var best_score: int = int(stats.get("bestScore", 0))
                var best_level: int = int(stats.get("bestLevel", 1))
                var total_words: int = int(stats.get("totalWordsCompleted", 0))
                for a in achievements:
                                if a["unlocked"]:
                                                continue
                                var should: bool = false
                                match a["id"]:
                                                "first_word": should = total_words >= 1
                                                "combo_5": should = max_combo >= 5
                                                "combo_10": should = max_combo >= 10
                                                "score_100": should = best_score >= 100
                                                "score_500": should = best_score >= 500
                                                "score_1000": should = best_score >= 1000
                                                "level_5": should = best_level >= 5
                                                "level_10": should = best_level >= 10
                                                "level_25": should = best_level >= 25
                                                "words_10": should = total_words >= 10
                                                "words_50": should = total_words >= 50
                                                "booster_collect": should = false  # realtime ile
                                                "daily_done": should = false  # realtime ile
                                                "no_death_run": should = no_death_streak >= 5
                                if should:
                                                a["unlocked"] = true
                                                a["unlockedAt"] = Time.get_unix_time_from_system()
                                                newly_unlocked.append(a)
                if not newly_unlocked.is_empty():
                                _save_achievements()
                                for a in newly_unlocked:
                                                achievement_unlocked.emit(a)


## Anlık olay bazlı achievement kontrol (combo, daily, booster)
func _check_achievements_realtime(combo_now: int = 0, daily_completed: bool = false, booster_collected: bool = false) -> void:
                for a in achievements:
                                if a["unlocked"]:
                                                continue
                                var should: bool = false
                                match a["id"]:
                                                "combo_5": should = combo_now >= 5
                                                "combo_10": should = combo_now >= 10
                                                "daily_done": should = daily_completed
                                                "booster_collect": should = booster_collected
                                                "no_death_run": should = no_death_streak >= 5
                                if should:
                                                a["unlocked"] = true
                                                a["unlockedAt"] = Time.get_unix_time_from_system()
                                                _save_achievements()
                                                achievement_unlocked.emit(a)
                # Diğer kategorik achievement'lar da kontrol edilsin
                _check_achievements()


# ==========================================================================
# Kalıcılık — ConfigFile
# ==========================================================================
func _load_persisted_state() -> void:
                _config = ConfigFile.new()
                _config.load(CONFIG_PATH)
                # Stats
                stats = {
                                "bestScore": int(_config.get_value("stats", "bestScore", 0)),
                                "bestLevel": int(_config.get_value("stats", "bestLevel", 1)),
                                "totalGames": int(_config.get_value("stats", "totalGames", 0)),
                                "totalWordsCompleted": int(_config.get_value("stats", "totalWordsCompleted", 0)),
                                "soundEnabled": bool(_config.get_value("stats", "soundEnabled", true)),
                                "soundVolume": float(_config.get_value("stats", "soundVolume", 0.35)),
                                "ttsVolume": float(_config.get_value("stats", "ttsVolume", 0.9)),
                }
                sound_enabled = stats["soundEnabled"]
                sound_volume = stats["soundVolume"]
                tts_volume = stats["ttsVolume"]
                # Liderlik
                leaderboard = _config.get_value("leaderboard", "entries", [])
                # Achievement'lar
                var ach_map: Dictionary = _config.get_value("achievements", "map", {})
                achievements = []
                for def in ACHIEVEMENT_DEFS:
                                var a: Dictionary = def.duplicate()
                                if ach_map.has(def["id"]):
                                                a["unlocked"] = true
                                                a["unlockedAt"] = int(ach_map[def["id"]])
                                else:
                                                a["unlocked"] = false
                                achievements.append(a)
                # Kategori ilerleme
                category_progress = _config.get_value("progress", "categories", {})
                # Haftalık stats
                weekly_stats = _load_weekly_stats()


func _save_config() -> void:
                _config.save(CONFIG_PATH)


func _save_stats() -> void:
                _config.set_value("stats", "bestScore", int(stats.get("bestScore", 0)))
                _config.set_value("stats", "bestLevel", int(stats.get("bestLevel", 1)))
                _config.set_value("stats", "totalGames", int(stats.get("totalGames", 0)))
                _config.set_value("stats", "totalWordsCompleted", int(stats.get("totalWordsCompleted", 0)))
                _config.set_value("stats", "soundEnabled", bool(stats.get("soundEnabled", true)))
                _config.set_value("stats", "soundVolume", float(stats.get("soundVolume", 0.35)))
                _config.set_value("stats", "ttsVolume", float(stats.get("ttsVolume", 0.9)))
                _save_config()
                stats_changed.emit(stats)


func _save_achievements() -> void:
                var m: Dictionary = {}
                for a in achievements:
                                if a["unlocked"] and a.has("unlockedAt"):
                                                m[a["id"]] = int(a["unlockedAt"])
                _config.set_value("achievements", "map", m)
                _save_config()


func _save_category_progress() -> void:
                _config.set_value("progress", "categories", category_progress)
                _save_config()


func _add_to_leaderboard(s: int, lvl: int, word: String) -> void:
                var entry: Dictionary = {
                                "score": s, "level": lvl,
                                "date": int(Time.get_unix_time_from_system()),
                                "word": word,
                }
                leaderboard.append(entry)
                # Skora göre azalan sırala, eşitse eski tarih önce
                leaderboard.sort_custom(Callable(self, "_leaderboard_compare"))
                if leaderboard.size() > 10:
                                leaderboard = leaderboard.slice(0, 10)
                _config.set_value("leaderboard", "entries", leaderboard)
                _save_config()
                leaderboard_changed.emit(leaderboard)


## Liderlik sıralama karşılaştırıcısı: skora göre azalan, eşitse tarihe göre artan.
func _leaderboard_compare(a: Dictionary, b: Dictionary) -> bool:
                if int(b["score"]) != int(a["score"]):
                                return int(b["score"]) < int(a["score"])
                return int(a["date"]) < int(b["date"])


# ---------------------------------------------------------------------------
# Haftalık istatistikler
# ---------------------------------------------------------------------------
func _today_key() -> String:
                var d: Dictionary = Time.get_datetime_dict_from_system()
                return "%04d-%02d-%02d" % [d["year"], d["month"], d["day"]]


func _load_weekly_stats() -> Array:
                var stored: Dictionary = _config.get_value("weekly", "map", {})
                var out: Array = []
                var now_unix: int = int(Time.get_unix_time_from_system())
                for i in range(6, -1, -1):
                                var t: int = now_unix - i * 86400
                                var dd: Dictionary = Time.get_datetime_dict_from_unix_time(t)
                                var key: String = "%04d-%02d-%02d" % [dd["year"], dd["month"], dd["day"]]
                                var entry: Dictionary = stored.get(key, {"gamesPlayed": 0, "score": 0})
                                out.append({
                                                "date": key,
                                                "gamesPlayed": int(entry.get("gamesPlayed", 0)),
                                                "score": int(entry.get("score", 0)),
                                })
                return out


func _record_weekly_play(s: int) -> void:
                var stored: Dictionary = _config.get_value("weekly", "map", {})
                var key: String = _today_key()
                var cur: Dictionary = stored.get(key, {"gamesPlayed": 0, "score": 0})
                stored[key] = {
                                "gamesPlayed": int(cur.get("gamesPlayed", 0)) + 1,
                                "score": max(int(cur.get("score", 0)), s),
                }
                # 30 günden eski kayıtları temizle
                var cutoff_unix: int = Time.get_unix_time_from_system() - 30 * 86400
                var cutoff_d: Dictionary = Time.get_datetime_dict_from_unix_time(cutoff_unix)
                var cutoff_key: String = "%04d-%02d-%02d" % [cutoff_d["year"], cutoff_d["month"], cutoff_d["day"]]
                for k in stored.keys():
                                if k < cutoff_key:
                                                stored.erase(k)
                _config.set_value("weekly", "map", stored)
                _save_config()
                weekly_stats = _load_weekly_stats()


# ---------------------------------------------------------------------------
# Günlük challenge
# ---------------------------------------------------------------------------
func is_daily_completed() -> bool:
                var key: String = "harf-yilani-daily-" + _today_key()
                return _config.get_value("daily", key, false) == true


func _mark_daily_completed() -> void:
                var key: String = "harf-yilani-daily-" + _today_key()
                _config.set_value("daily", key, true)
                _save_config()


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------
func reset_all_stats() -> void:
                stats = {
                                "bestScore": 0, "bestLevel": 1, "totalGames": 0,
                                "totalWordsCompleted": 0, "soundEnabled": true,
                                "soundVolume": 0.35, "ttsVolume": 0.9,
                }
                sound_enabled = true
                sound_volume = 0.35
                tts_volume = 0.9
                leaderboard = []
                achievements = []
                for def in ACHIEVEMENT_DEFS:
                                var a: Dictionary = def.duplicate()
                                a["unlocked"] = false
                                achievements.append(a)
                category_progress = {}
                # Config'i temizle
                _config.clear()
                _save_config()
                stats_changed.emit(stats)
                leaderboard_changed.emit(leaderboard)


# ==========================================================================
# Yardımcılar
# ==========================================================================
func _start_step_timer() -> void:
                _step_timer.wait_time = step_sec
                _step_timer.start()


func _emit_all() -> void:
                level_changed.emit(level, tier_name)
                score_changed.emit(score)
                lives_changed.emit(lives)
                word_changed.emit(current_word, current_letter_index)
                status_changed.emit(status)
                combo_changed.emit(combo)
                if time_limit_ms > 0:
                                time_changed.emit(time_remaining_ms, time_limit_ms)


## Bir sonraki hedef harf (UI vurgusu için)
func next_target_char() -> String:
                if current_letter_index < current_word.length():
                                return current_word[current_letter_index]
                return ""


## Yılan skin'ini güncelle (UI/main.gd çağırır)
func apply_skin_to_snake(snake: Node) -> void:
                snake.skin = get_skin()
