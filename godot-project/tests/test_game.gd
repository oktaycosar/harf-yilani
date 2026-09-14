# ============================================================================
# Harf Yılanı — Headless doğrulama testi (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Çalıştırma:
#   godot --headless --path godot-project res://tests/test_game.tscn
#
# Çıkış kodu: 0 = tüm testler geçti, 1 = en az bir test başarısız.
# Bu test, "worklog'da yazıyor ama gerçekte çalışmıyor" durumunu önlemek için
# oyun kurallarını gerçekten çalıştırıp doğrular.
# ============================================================================
extends Node

const C = preload("res://scripts/constants.gd")
const SnakeScript = preload("res://scripts/snake.gd")
const WordManagerScript = preload("res://scripts/word_manager.gd")
const DifficultyManagerScript = preload("res://scripts/difficulty_manager.gd")

var _pass: int = 0
var _fail: int = 0


func _ok(cond: bool, label: String) -> void:
		if cond:
				_pass += 1
				print("  [PASS] %s" % label)
		else:
				_fail += 1
				print("  [FAIL] %s" % label)


func _eq(actual: Variant, expected: Variant, label: String) -> void:
		var ok: bool = actual == expected
		if ok:
				_pass += 1
				print("  [PASS] %s" % label)
		else:
				_fail += 1
				print("  [FAIL] %s  (beklenen=%s, gerçek=%s)" % [label, str(expected), str(actual)])


func _group(name: String) -> void:
		print("\n--- %s ---" % name)


func _ready() -> void:
		seed(12345)
		print("========================================")
		print(" Harf Yılanı — headless doğrulama testi")
		print("========================================")

		_test_constants()
		_test_word_manager()
		_test_difficulty()
		_test_snake_letters()
		_test_snake_entities()
		_test_speed_multiplier()
		_test_snake_movement()
		_test_snake_growth()
		_test_duplicate_letters()
		_test_snake_face()
		_test_font_safe_ui()
		_test_hud_hearts()
		_test_letter_tiles()
		_test_night_assets()
		_test_obstacle_tiles()
		_test_hud_panels()
		_test_quit_button()
		_test_atlas_geometry()
		_test_sound()
		_test_game_manager()
		_test_letter_scene()
		_test_main_scene_integrity()
		# En sonda: GameManager durumunu değiştirir (sayaç/sinyal testi)
		_test_star_tail_drop()

		print("\n========================================")
		print(" SONUÇ: %d geçti, %d başarısız" % [_pass, _fail])
		print("========================================")
		get_tree().quit(1 if _fail > 0 else 0)


# ----------------------------------------------------------------------------
# 7b) Mükerrer harf (ANA / ARABA) — hedef kontrolü HARF ile olmalı
# ----------------------------------------------------------------------------
func _test_duplicate_letters() -> void:
		_group("Mükerrer harf — hedef kontrolü harf üzerinden")

		# ANA: hedef 1. harf (A) ama oyuncu İKİNCİ A'yı (order_index 2) yiyor.
		# Taşlar görsel olarak ayırt edilemez -> DOĞRU sayılmalı, can gitmemeli.
		var s: Node2D = SnakeScript.new()
		add_child(s)
		s.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s.place_letters("ANA", false)
		s.current_target_index = 0
		s.current_target_char = "A"
		s.letters[0]["x"] = 20
		s.letters[0]["y"] = 15
		s.letters[1]["x"] = 21
		s.letters[1]["y"] = 15
		s.letters[2]["x"] = 6
		s.letters[2]["y"] = 5
		var hits: Array = []
		var h := func(letter: Dictionary) -> void: hits.append(letter)
		s.ate_letter.connect(h)
		s.step()
		_eq(hits.size(), 1, "ANA: ikinci A yendi → ate_letter yayıldı")
		_eq(s.letters[2]["eaten"], true, "ANA: ikinci A yenmiş sayıldı (can GİTMEMELİ)")
		_eq(s.letters[0]["eaten"], false, "ANA: dokunulmayan A yenmiş sayılmadı")

		# Aynı kural kelimenin SONUNDAKİ A için de geçerli (kalan taş order 0)
		var s2: Node2D = SnakeScript.new()
		add_child(s2)
		s2.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s2.place_letters("ANA", false)
		s2.current_target_index = 2
		s2.current_target_char = "A"
		s2.letters[1]["eaten"] = true
		s2.letters[2]["eaten"] = true
		s2.letters[0]["x"] = 6
		s2.letters[0]["y"] = 5
		s2.letters[1]["x"] = 20
		s2.letters[1]["y"] = 15
		s2.letters[2]["x"] = 21
		s2.letters[2]["y"] = 15
		s2.step()
		_eq(s2.letters[0]["eaten"], true, "ANA: sondaki A da harf eşleşmesiyle yendi")

		# REGRESYON: harf uyuşmuyorsa yanlış kalmalı (ADA'da hedef D iken A)
		var s3: Node2D = SnakeScript.new()
		add_child(s3)
		s3.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s3.place_letters("ADA", false)
		s3.current_target_index = 1
		s3.current_target_char = "D"
		s3.letters[0]["x"] = 6
		s3.letters[0]["y"] = 5
		s3.letters[1]["x"] = 21
		s3.letters[1]["y"] = 15
		s3.letters[2]["x"] = 20
		s3.letters[2]["y"] = 15
		s3.step()
		_eq(s3.letters[0]["eaten"], false, "ADA: hedef D iken A yenirse YANLIŞ kalır")

		# Harf set edilmemişse eski davranış (order_index) korunur
		var s4: Node2D = SnakeScript.new()
		add_child(s4)
		s4.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s4.place_letters("ANA", false)
		s4.current_target_index = 0
		s4.current_target_char = ""
		_ok(s4.is_target_letter({"char": "A", "order_index": 2}) == false,
				"harf set edilmezse order_index kuralı geçerli (geriye uyumlu)")

		# GameManager tarafı: harf eşleşmesi (ANA'da 2. A, hedef A iken DOĞRU)
		var gm: Node = get_node_or_null("/root/GameManager")
		if gm != null:
				var old_word: String = gm.current_word
				var old_idx: int = gm.current_letter_index
				gm.current_word = "ANA"
				gm.current_letter_index = 0
				_eq(gm.current_target_char(), "A", "GameManager: hedef harf A")
				_ok(gm.is_expected_letter({"char": "A", "order_index": 2}),
						"GameManager: ANA'da 2. A → DOĞRU")
				_ok(not gm.is_expected_letter({"char": "N", "order_index": 1}),
						"GameManager: hedef A iken N → YANLIŞ")
				gm.current_letter_index = 1
				_ok(gm.is_expected_letter({"char": "N", "order_index": 1}),
						"GameManager: sıradaki N → DOĞRU")
				_ok(not gm.is_expected_letter({"char": "A", "order_index": 0}),
						"GameManager: hedef N iken A → YANLIŞ (mükerrer harf N'i atlatamaz)")
				gm.current_letter_index = 2
				_ok(gm.is_expected_letter({"char": "A", "order_index": 0}),
						"GameManager: sondaki A → DOĞRU")
				gm.current_word = old_word
				gm.current_letter_index = old_idx


# ----------------------------------------------------------------------------
# 7c) HUD yüz portresi (snake_faces.png)
# ----------------------------------------------------------------------------
func _test_snake_face() -> void:
		_group("HUD yilan yuzu portresi")
		var tex: Texture2D = load("res://assets/snake/snake_faces.png")
		_ok(tex != null, "snake_faces.png yüklendi")
		if tex == null:
				return
		_eq(tex.get_width(), 144, "portre şeridi 3 hücre (48x3 = 144 px)")
		_eq(tex.get_height(), 52, "portre hücre yüksekliği 52 px")

		var scene: PackedScene = load("res://scenes/Main.tscn")
		var inst: Node = scene.instantiate()
		add_child(inst)
		var face: Node = inst.find_child("SnakeFace", true, false)
		_ok(face != null, "Main.tscn içinde SnakeFace düğümü var")
		if face == null:
				inst.queue_free()
				return
		_ok(face is TextureRect, "SnakeFace bir TextureRect")
		var tr: TextureRect = face as TextureRect
		_eq(tr.texture_filter, CanvasItem.TEXTURE_FILTER_NEAREST,
				"portre pixel-art (nearest) filtresi kullanır")

		var ui: Node = inst.find_child("UIManager", true, false)
		if ui != null and ui.has_method("_set_face"):
				_ok(true, "UIManager._set_face() var")
				ui._set_face("normal")
				var at_tex: AtlasTexture = tr.texture as AtlasTexture
				_ok(at_tex != null, "portre dokusu AtlasTexture")
				if at_tex != null:
						_eq(at_tex.region, Rect2(0, 0, 48, 52), "normal ifade → 1. hücre")
						ui._set_face("happy")
						_eq(at_tex.region, Rect2(48, 0, 48, 52), "mutlu ifade → 2. hücre")
						ui._set_face("shock")
						_eq(at_tex.region, Rect2(96, 0, 48, 52), "şaşkın ifade → 3. hücre")
						ui._set_face("bilinmeyen")
						_eq(at_tex.region, Rect2(0, 0, 48, 52),
								"bilinmeyen ifade → güvenli varsayılan (normal)")
		else:
				_ok(false, "UIManager._set_face() bulunamadı")
		inst.queue_free()


# ----------------------------------------------------------------------------
# 7d) Font glif güvenliği — pixel fontta OLMAYAN karakter UI'a sızmamalı
# ----------------------------------------------------------------------------
func _test_font_safe_ui() -> void:
		_group("Font glif güvenliği (PressStart2P)")
		# Bu karakterler PressStart2P'de YOK. Godot onları sistem fontuyla çizer
		# (pixel-art stiline uymaz, boyut/baseline kayar) ya da export/web'de
		# kutu (tofu) olarak gösterir. Yerine: ★ ☆ ♥ • » « ♦ ¤ × ° § ¶ # % + * ^
		# gibi fontta OLAN semboller ya da düz metin kullanılmalı.
		var yasak: String = "♡⚡❄️⭐🌱🌳🌹🍎🎖🎯🎲🏆🐍🐱👑💯📅📖📚📦🔥🔮🚀🚧✨"
		var dosyalar: Array = [
				"res://scripts/ui_manager.gd",
				"res://scripts/main.gd",
				"res://scripts/game_manager.gd",
				"res://scripts/constants.gd",
				"res://scenes/Main.tscn",
		]
		var bulunan: Array = []
		for yol in dosyalar:
				var f: FileAccess = FileAccess.open(yol, FileAccess.READ)
				if f == null:
						_ok(false, "okunamadı: %s" % yol)
						continue
				var no: int = 0
				while not f.eof_reached():
						var satir: String = f.get_line()
						no += 1
						var t: String = satir.strip_edges()
						if t.begins_with("#") or t.begins_with(";"):
								continue                      # yorum satırları serbest
						for ch in yasak:
								if satir.contains(ch):
										bulunan.append("%s:%d" % [yol.get_file(), no])
				f.close()
		_ok(bulunan.is_empty(),
				"UI kaynaklarında desteklenmeyen glif yok" if bulunan.is_empty()
				else "desteklenmeyen glif: %s" % str(bulunan))

		# Bonus etiketi fontta OLAN yıldızı kullanmalı (emoji değil)
		var inst: Node = (load("res://scenes/Main.tscn") as PackedScene).instantiate()
		add_child(inst)
		var ui: Node = inst.find_child("UIManager", true, false)
		var bl: Node = inst.find_child("BonusLabel", true, false)
		if ui != null and bl != null and ui.has_method("update_entity_counts"):
				ui.update_entity_counts(0, 2, 0)
				_ok((bl as Label).text.contains("★"), "Bonus etiketi ★ kullanıyor")
				_ok(not (bl as Label).text.contains("⭐"), "Bonus etiketinde ⭐ emoji yok")
		else:
				_ok(false, "BonusLabel / UIManager bulunamadı")
		inst.queue_free()


# ----------------------------------------------------------------------------
# 7e) HUD can göstergesi — gerçek kalp sprite'ları (metin kalp değil)
# ----------------------------------------------------------------------------
func _test_hud_hearts() -> void:
		_group("HUD can göstergesi (kalp sprite'ları)")
		var full: Texture2D = load("res://assets/ui/heart_full.png")
		var empty: Texture2D = load("res://assets/ui/heart_empty.png")
		_ok(full != null and empty != null, "heart_full / heart_empty yüklendi")
		var inst: Node = (load("res://scenes/Main.tscn") as PackedScene).instantiate()
		add_child(inst)
		var h0: Node = inst.find_child("Heart0", true, false)
		var h1: Node = inst.find_child("Heart1", true, false)
		var h2: Node = inst.find_child("Heart2", true, false)
		_ok(h0 != null and h1 != null and h2 != null, "3 kalp düğümü var")
		_ok(h0 is TextureRect and h1 is TextureRect and h2 is TextureRect,
				"kalpler TextureRect")
		var ll: Node = inst.find_child("LivesLabel", true, false)
		_ok(ll != null and not (ll as Label).text.contains("♥"),
				"can satırı artık metin kalp içermiyor (sprite kullanılıyor)")
		var ui: Node = inst.find_child("UIManager", true, false)
		if ui != null and ui.has_method("_on_lives_changed") and h2 != null:
				ui._on_lives_changed(3)
				_eq((h2 as TextureRect).texture, full, "3 can → üçüncü kalp dolu")
				ui._on_lives_changed(1)
				_eq((h0 as TextureRect).texture, full, "1 can → ilk kalp dolu")
				_eq((h1 as TextureRect).texture, empty, "1 can → ikinci kalp boş")
				_eq((h2 as TextureRect).texture, empty, "1 can → üçüncü kalp boş")
		else:
				_ok(false, "UIManager._on_lives_changed bulunamadı")
		inst.queue_free()


# ----------------------------------------------------------------------------
# 7f) Harf taşı aileleri — seçenek 1: sıradaki hedef ALTIN, diğerleri KREM
# ----------------------------------------------------------------------------
func _test_letter_tiles() -> void:
		_group("Harf taşı aileleri (altın / krem)")
		var gold: Texture2D = load("res://assets/ui/tile_gold.png")
		var cream: Texture2D = load("res://assets/ui/tile_normal.png")
		_ok(gold != null and cream != null, "tile_gold / tile_normal yüklendi")
		var inst: Node = (load("res://scenes/Letter.tscn") as PackedScene).instantiate()
		add_child(inst)
		var spr: Node = inst.find_child("Sprite2D", true, false)
		_ok(spr != null, "Letter içinde Sprite2D var")
		if spr != null:
				inst.call("set_family", true)
				_eq((spr as Sprite2D).texture, gold, "sıradaki hedef harf → ALTIN taş")
				_ok(inst.get("is_target_tile") == true, "is_target_tile = true")
				inst.call("set_family", false)
				_eq((spr as Sprite2D).texture, cream, "sırası gelmemiş harf → KREM taş")
				_ok(inst.get("is_target_tile") == false, "is_target_tile = false")
		inst.queue_free()

		# Bonus artık harf değil: kit'in MAVİ + YILDIZ karosu (tek sprite); pembe tamamen yok
		var blue: Texture2D = load("res://assets/ui/tile_bonus.png")
		var star: Texture2D = load("res://assets/ui/obstacle_stone.png")
		_ok(blue != null and star != null, "bonus karosu (mavi+yıldız) + taş engel karosu yüklendi")
		var src: String = FileAccess.get_file_as_string("res://scripts/main.gd")
		_ok(src.contains("tile_bonus.png"), "bonus MAVİ+YILDIZ karosu ile çiziliyor")
		_ok(not src.contains("icon_star.png"), "bonus artık ayrı ikon katmanı kullanmıyor")
		_ok(not src.contains("tile_purple.png"), "bonusta mor/pembe kalmadı")


func _test_night_assets() -> void:
		_group("Gece varlıkları (gökyüzü + küre)")
		var sky: Texture2D = load("res://assets/ui/bg_sky.png")
		_ok(sky != null, "bg_sky.png yüklendi")
		if sky != null:
				_eq(sky.get_width(), 960, "gökyüzü genişliği 960")
				_eq(sky.get_height(), 760, "gökyüzü yüksekliği 760")

		# Küre magenta zeminden kesildi → saydamlık taşımalı
		for p in ["globe_hud.png", "globe_menu.png"]:
				var t: Texture2D = load("res://assets/ui/" + p)
				_ok(t != null, "%s yüklendi" % p)
				if t != null:
						var img: Image = t.get_image()
						_ok(img != null and img.detect_alpha() != Image.ALPHA_NONE,
								"%s saydam (magenta temizlendi)" % p)

		var inst: Node = (load("res://scenes/Main.tscn") as PackedScene).instantiate()
		add_child(inst)
		var sky_node: Node = inst.find_child("SkyBG", true, false)
		_ok(sky_node is Sprite2D, "SkyBG düğümü var")
		if sky_node is Sprite2D:
				_eq((sky_node as Sprite2D).texture, sky, "SkyBG gökyüzü dokusunu kullanıyor")
				_ok((sky_node as Sprite2D).z_index < 0, "SkyBG her şeyin arkasında (z_index < 0)")
		var frame_tex: Texture2D = load("res://assets/ui/frame_bg.png")
		_ok(frame_tex != null, "frame_bg.png yüklendi (taş çerçeve + dekor)")
		if frame_tex != null:
				_eq(frame_tex.get_width(), 960, "çerçeve görseli 960 geniş")
				_eq(frame_tex.get_height(), 760, "çerçeve görseli 760 yüksek")
		var frame_node: Node = inst.find_child("FrameBG", true, false)
		_ok(frame_node is Sprite2D, "FrameBG düğümü var")
		if frame_node is Sprite2D:
				_eq((frame_node as Sprite2D).texture, frame_tex, "FrameBG çerçeve dokusunu kullanıyor")
				_ok((frame_node as Sprite2D).z_index < 0, "çerçeve tahtanın arkasında")

		# Tahta çerçevenin İÇİNE oturmalı: GameArea + ızgara = çerçevenin iç dikdörtgeni
		var area_node: Node2D = inst.find_child("GameArea", true, false)
		if area_node != null:
				_eq(int(area_node.position.x), 48, "tahta x = çerçeve iç kenarı (48)")
				_eq(int(area_node.position.y), 104, "tahta y = çerçeve iç kenarı (104)")
				_eq(C.GRID_COLS * C.CELL_SIZE, 912 - 48, "tahta genişliği çerçeveye tam oturuyor")
				_eq(C.GRID_ROWS * C.CELL_SIZE, 716 - 104, "tahta yüksekliği çerçeveye tam oturuyor")
		_ok(inst.find_child("Globe", true, false) != null, "HUD küresi var")
		_ok(inst.find_child("MenuGlobe", true, false) != null, "menü küresi var")
		_ok(inst.find_child("MenuOwl", true, false) != null, "menü baykuşu var")
		_ok(inst.find_child("MenuBooks", true, false) != null, "menü kitap yığını var")

		# Dekor sprite'ları saydam olmalı (kit sayfasından kesildi)
		for p in ["decor_owl.png", "decor_books.png"]:
				var dt: Texture2D = load("res://assets/ui/" + p)
				_ok(dt != null, "%s yüklendi" % p)
				if dt != null:
						_ok(dt.get_image().detect_alpha() != Image.ALPHA_NONE, "%s saydam" % p)
		inst.queue_free()

		# Tahta zemini/çerçevesi artık GÖRSELDEN gelir; kod sadece ızgara çizer
		var bb: String = FileAccess.get_file_as_string("res://scripts/board_background.gd")
		_ok(bb.contains("GRID_COLOR"), "tahta zemini ızgara çiziyor")
		_ok(not bb.contains("FRAME_W"), "eski kod-çizimi taş çerçeve kaldırıldı")


func _test_obstacle_tiles() -> void:
		_group("Engel karoları (taş duvar + kırmızı X)")
		var stone: Texture2D = load("res://assets/ui/obstacle_stone.png")
		var spike: Texture2D = load("res://assets/ui/obstacle_spike.png")
		_ok(stone != null and spike != null, "karo dokuları yüklendi")
		if stone != null:
				_eq(stone.get_width(), 34, "taş karo 34 px geniş")
				_eq(stone.get_height(), 34, "taş karo 34 px yüksek")
		if spike != null:
				_ok(spike.get_image().detect_alpha() != Image.ALPHA_NONE, "kırmızı X saydam zeminli")
		var src: String = FileAccess.get_file_as_string("res://scripts/main.gd")
		_ok(src.contains("obstacle_stone.png"), "duvarlar taş tuğla karosu ile çiziliyor")
		_ok(src.contains("obstacle_spike.png"), "tehlike kırmızı X karosu ile çiziliyor")
		_ok(not src.contains("52525b"), "eski düz gri kare rengi kalmadı")
		_ok(not src.contains("dc2626"), "eski düz kırmızı kare rengi kalmadı")


func _test_hud_panels() -> void:
		_group("HUD panelleri (kit ahşap tabela)")
		var plank: Texture2D = load("res://assets/ui/panel_plank.png")
		_ok(plank != null, "panel_plank.png yüklendi")
		if plank != null:
				_ok(plank.get_width() > plank.get_height(), "tabela enine (yatay tabla)")
		var inst: Node = (load("res://scenes/Main.tscn") as PackedScene).instantiate()
		add_child(inst)
		for pname in ["LeftPanel", "WordPanel", "RightPanel"]:
				var p: Node = inst.find_child(pname, true, false)
				_ok(p is NinePatchRect, "%s var ve NinePatchRect" % pname)
				if p is NinePatchRect:
						_eq((p as NinePatchRect).texture, plank, "%s kit tabela dokusunu kullanıyor" % pname)
						_ok((p as NinePatchRect).patch_margin_left >= 16,
								"%s köşe payı var (çerçeve gerilmiyor)" % pname)
		inst.queue_free()


func _test_quit_button() -> void:
		_group("Çıkış (menüde buton + Esc)")
		var inst: Node = (load("res://scenes/Main.tscn") as PackedScene).instantiate()
		add_child(inst)
		var btn: Node = inst.find_child("QuitButton", true, false)
		_ok(btn is Button, "menüde ÇIKIŞ butonu var")
		if btn is Button:
				_ok((btn as Button).text.contains("ÇIKIŞ"), "buton yazısı ÇIKIŞ")
				_ok((btn as Button).text.contains("ESC"), "buton Esc ipucunu gösteriyor")
				_ok((btn as Button).get_theme_stylebox("normal") is StyleBoxTexture,
						"buton ahşap tabela dokusunu kullanıyor")
		inst.queue_free()

		# Kod tarafı: buton bağlanır ve Esc de çıkış yapar
		var src: String = FileAccess.get_file_as_string("res://scripts/main.gd")
		_ok(src.contains("%QuitButton"), "buton %QuitButton ile bağlı")
		_ok(src.contains("pressed.connect(_quit_game)"), "buton pressed -> _quit_game")
		_ok(src.contains("get_tree().quit()"), "çıkış gerçekten kapatıyor")
		_ok(src.contains("is_action_pressed(\"ui_cancel\")"), "Esc (ui_cancel) da çıkış yapıyor")


## Atlas geometrisi sözleşmesi (_tools/refine_snake.py + build_snake_v2.py).
## Bu testler kırılırsa atlas yeniden üretilirken bir şey bozulmuş demektir.
func _test_atlas_geometry() -> void:
		_group("Atlas geometrisi (boru kalınlığı / kafa oranı / keskin kenar)")
		var tex: Texture2D = load("res://assets/snake/snake.png")
		if tex == null:
				_ok(false, "snake.png yüklenemedi")
				return
		# get_image() her çağrıda YENİ bir Image döndürür -> yerinde dönüştürmek
		# güvenli (önbellekteki dokuyu bozmaz) ve kopya sızıntısı yaratmaz.
		var img: Image = tex.get_image()
		img.convert(Image.FORMAT_RGBA8)   # yerinde dönüştürür (void)
		var w: int = img.get_width()
		var data: PackedByteArray = img.get_data()
		var cell: int = 144
		_eq(w, cell * 4, "atlas 4 hücre genişliğinde")
		_eq(img.get_height(), cell * 4, "atlas 4 hücre yüksekliğinde")

		# oyun hücresi 36px, boru 30px -> pencere 54..90, bant 57..87
		const LO: int = 54
		const HI: int = 90
		var names: Array = ["head_r", "head_d", "head_l", "head_u",
				"tail_r", "tail_d", "tail_l", "tail_u",
				"body_h", "body_v", "corner_rd", "corner_dl",
				"corner_lu", "corner_ur"]
		var boxes: Dictionary = {}
		for i in range(names.size()):
				var ox: int = (i % 4) * cell
				var oy: int = (i / 4) * cell
				boxes[names[i]] = _alpha_bbox(data, w, ox, oy, cell)

		# 1) AÇIK KENARDAKİ BORU KALINLIĞI: hepsi 30 (gövdeyle birebir)
		var open_edges: Array = [["head_r", "l"], ["head_l", "r"],
				["head_d", "u"], ["head_u", "d"],
				["tail_r", "l"], ["tail_l", "r"],
				["tail_d", "u"], ["tail_u", "d"],
				["body_h", "l"], ["body_h", "r"],
				["body_v", "u"], ["body_v", "d"]]
		for pair in open_edges:
				var nm: String = pair[0]
				var idx: int = names.find(nm)
				var t: int = _edge_thickness(data, w, (idx % 4) * cell,
						(idx / 4) * cell, pair[1], LO, HI)
				_eq(t, 30, "%s %s kenarı boru kalınlığı 30 (%d)" % [nm, pair[1], t])

		# 2) KAFA: 4 yön AYNI kalınlıkta (dönerken kafa büyüyüp küçülmesin)
		var ht: Array = []
		for d in ["head_r", "head_l", "head_d", "head_u"]:
				var b: Rect2i = boxes[d]
				ht.append(b.size.y if d.begins_with("head_r") or d == "head_l" else b.size.x)
		_eq(ht[0], ht[1], "sağ/sol kafa kalınlığı eşit")
		_eq(ht[2], ht[3], "aşağı/yukarı kafa kalınlığı eşit")
		_eq(ht[0], ht[2], "4 yönün kafa kalınlığı eşit (%d px)" % ht[0])
		_ok(ht[0] >= 30 and ht[0] <= 44,
				"kafa/gövde oranı makul (%d / 30 = %.2f, hedef <= 1.45)" % [ht[0], ht[0] / 30.0])

		# 3) KESKİN KENAR: yarı saydam piksel kalmamalı
		var soft: int = 0
		for y in range(cell * 4):
				for x in range(w):
						var a: float = data[(y * w + x) * 4 + 3] / 255.0
						if a > 0.02 and a < 0.4:
								soft += 1
		_eq(soft, 0, "kısmi (yarı saydam) piksel yok — kenarlar keskin")


func _alpha_bbox(data: PackedByteArray, w: int, ox: int, oy: int, size: int) -> Rect2i:
		var x0: int = size
		var y0: int = size
		var x1: int = -1
		var y1: int = -1
		for y in range(size):
				for x in range(size):
						if data[((oy + y) * w + (ox + x)) * 4 + 3] > 153:
								x0 = mini(x0, x)
								y0 = mini(y0, y)
								x1 = maxi(x1, x)
								y1 = maxi(y1, y)
		if x1 < 0:
				return Rect2i()
		return Rect2i(x0, y0, x1 - x0 + 1, y1 - y0 + 1)


## Açık kenardan ölçülen boru kalınlığı (kenardan 4px içeride ilk geçerli satır).
func _edge_thickness(data: PackedByteArray, w: int, ox: int, oy: int,
		side: String, lo: int, hi: int) -> int:
		for k in range(4):
				var first: int = -1
				var last: int = -1
				for t in range(lo, hi):
						var x: int = lo + k
						var y: int = t
						if side == "r":
								x = hi - 1 - k
						elif side == "u":
								x = t
								y = lo + k
						elif side == "d":
								x = t
								y = hi - 1 - k
						if data[((oy + y) * w + (ox + x)) * 4 + 3] > 153:
								if first < 0:
										first = t
								last = t
				if first >= 0:
						return last - first + 1
		return -1


func _test_star_tail_drop() -> void:
		_group("Yıldız ödülü — her 15 yıldızda 1 kuyruk düşer")
		_eq(C.STARS_PER_TAIL_DROP, 15, "eşik 15 yıldız")
		_ok(C.SNAKE_MIN_LENGTH >= 2, "kuyruk düşürmede alt sınır en az 2 (kafa+kuyruk)")

		# --- Snake.shrink() davranışı ---
		var s: Node2D = SnakeScript.new()
		add_child(s)
		s.reset(Vector2i(10, 9), 6, Vector2i(1, 0))
		_eq(s.body.size(), 6, "başlangıç 6 segment")
		var moved_count: Array = [0]
		s.moved.connect(func(_h: Vector2i) -> void: moved_count[0] += 1)
		_eq(s.shrink(1), 1, "shrink(1) 1 segment düşürür")
		_eq(s.body.size(), 5, "6 -> 5 segment")
		_ok(moved_count[0] == 0, "shrink 'moved' YAYMAZ (adım sayılmamalı)")
		s.shrink(C.SNAKE_MIN_LENGTH + 10)
		_eq(s.body.size(), C.SNAKE_MIN_LENGTH, "alt sınırın altına inmez")
		_eq(s.shrink(1), 0, "alt sınırdıyken düşmez")
		s.queue_free()

		# --- GameManager: sayaç ve sinyal ---
		var saved_level: int = GameManager.level
		GameManager.reset_to_menu()
		GameManager.status = "playing"
		GameManager.stars_eaten = 0
		var drops: Array = [0]
		GameManager.snake_shrink_requested.connect(func(_a: int) -> void: drops[0] += 1)
		for i in range(C.STARS_PER_TAIL_DROP - 1):
				GameManager.on_ate_bonus("X", C.BONUS_LETTER_VALUE)
		_eq(drops[0], 0, "14 yıldızda kuyruk düşmez")
		_eq(GameManager.stars_eaten, 14, "sayaç 14")
		GameManager.on_ate_bonus("X", C.BONUS_LETTER_VALUE)
		_eq(drops[0], 1, "15. yıldızda 1 kuyruk düşer")
		for i in range(C.STARS_PER_TAIL_DROP):
				GameManager.on_ate_bonus("X", C.BONUS_LETTER_VALUE)
		_eq(drops[0], 2, "30. yıldızda tekrar düşer (her 15'te bir)")

		# Bölüm geçişi sayacı SIFIRLAMAZ, yeni oyun sıfırlar
		GameManager.load_level(2)
		_eq(GameManager.stars_eaten, 30, "bölüm geçince sayaç korunur")
		GameManager.reset_to_menu()
		_eq(GameManager.stars_eaten, 0, "menüye dönünce sayaç sıfırlanır")
		GameManager.level = saved_level

		# --- HUD etiketi ilerlemeyi gösterir ---
		var ui_src: String = FileAccess.get_file_as_string("res://scripts/ui_manager.gd")
		_ok(ui_src.contains("STARS_PER_TAIL_DROP"), "HUD yıldız ilerlemesini gösteriyor")
		_ok(ui_src.contains("show_star_reward"), "kuyruk düştüğünde mesaj var")

		# --- ÖDÜL: yıldız seriyi besler (+1 combo) ve puan verir ---
		GameManager.reset_to_menu()
		GameManager.status = "playing"
		GameManager.combo = 3
		GameManager.max_combo = 3
		GameManager.score = 100
		GameManager.stars_eaten = 0
		GameManager.on_ate_bonus("X", C.BONUS_LETTER_VALUE)
		_eq(GameManager.combo, 4, "yıldız combo'yu +1 artırır (seriyi besler)")
		_eq(GameManager.max_combo, 4, "max_combo güncellenir")
		_eq(GameManager.score, 100 + C.BONUS_LETTER_VALUE, "yıldız +%d puan" % C.BONUS_LETTER_VALUE)
		_eq(GameManager.stars_eaten, 1, "yıldız sayacı işler")

		# Yıldız hatayı affetmez: yanlış harfte seri yine sıfırlanır
		var cap_before: int = GameManager.lives
		GameManager.on_letter_reached({"char": "Z", "order_index": 99, "eaten": false, "x": 0, "y": 0})
		_ok(GameManager.combo == 0 or GameManager.lives < cap_before,
				"yanlış harf seriyi bozar (yıldız bunu engellemez)")
		GameManager.reset_to_menu()


# ----------------------------------------------------------------------------
# 1) Sabitler
# ----------------------------------------------------------------------------
func _test_constants() -> void:
		_group("Sabitler / zorluk kademeleri")

		_eq(GameManager.snake_length_for_level(1), C.SNAKE_START_LENGTH, "bölüm 1 → yılan 3 segment")
		_eq(GameManager.snake_length_for_level(2), C.SNAKE_START_LENGTH + C.SNAKE_LENGTH_PER_LEVEL,
				"bölüm 2 → yılan 1 segment uzadı")
		_ok(GameManager.snake_length_for_level(10) > GameManager.snake_length_for_level(5),
				"ileri bölümde yılan daha uzun (zorluk göstergesi)")
		_eq(GameManager.snake_length_for_level(999), C.SNAKE_LENGTH_CAP,
				"çok ileri bölümde üst sınırda durur (%d)" % C.SNAKE_LENGTH_CAP)
		_ok(GameManager.snake_length_for_level(1) < GameManager.snake_length_for_level(3),
				"uzunluk bölümle artıyor (sıfırlanmıyor)")

		# BÜYÜME KURALI: kelime uzunluğuna göre seyrekleşmeli (makarna olmasın)
		_eq(C.grow_every_for_len(3), 1, "3 harfli kelime → her harfte +1")
		_eq(C.grow_every_for_len(4), 1, "4 harfli kelime → her harfte +1")
		_eq(C.grow_every_for_len(5), 2, "5 harfli kelime → 2 harfte bir +1")
		_eq(C.grow_every_for_len(6), 3, "6 harfli kelime → 3 harfte bir +1")
		_eq(C.grow_every_for_len(12), 3, "çok uzun kelimede de 3'te bir")

		# Kademe kelime bonusu: zorlaştıkça artmalı
		_eq(C.tier_word_bonus(1), 20, "başlangıç kademesi kelime bonusu 20")
		_ok(C.tier_word_bonus(30) > C.tier_word_bonus(1), "zor kademede kelime bonusu daha yüksek")
		_eq(C.tier_word_bonus(40), 75, "çok zor kademesi kelime bonusu 75")
		for t in C.DIFFICULTY_TIERS:
				_ok(int(t.get("word_bonus", 0)) > 0, "kademe '%s' word_bonus tanımlı" % t["name"])

		# Bölüm içi tavan: taban + 4'ü geçemez
		_eq(GameManager.max_snake_length(), GameManager.snake_length + C.SNAKE_IN_LEVEL_GROWTH_MAX,
				"bölüm içi uzunluk tavanı = taban + %d" % C.SNAKE_IN_LEVEL_GROWTH_MAX)

		# Tahta 24x17 (taş çerçeve 40px, GameArea 48,104) — çerçeveye tam oturur
		_eq(C.GRID_COLS, 24, "grid 24 sütun (taş çerçeve düzeni)")
		_eq(C.GRID_ROWS, 17, "grid 17 satır (taş çerçeve düzeni)")
		_eq(C.FRAME_BAND, 40, "taş çerçeve kalınlığı 40 px")
		_eq(C.TURKISH_ALPHABET.length(), 29, "Türkçe alfabe 29 harf")

		# Engel sayısı kademeli artmalı
		_eq(C.get_obstacle_count(5), 0, "bölüm 5 → engel yok")
		_eq(C.get_obstacle_count(6), 2, "bölüm 6 → 2 engel")
		_eq(C.get_obstacle_count(20), 4, "bölüm 20 → 4 engel")
		_eq(C.get_obstacle_count(30), 6, "bölüm 30 → 6 engel")
		_eq(C.get_obstacle_count(40), 8, "bölüm 40 → 8 engel")
		_eq(C.get_obstacle_count(50), 10, "bölüm 50 → 10 engel")

		# Kategori dönüşümleri gidiş-dönüş tutarlı olmalı
		for c in C.CATEGORIES:
				var key: String = C.category_key(c["id"])
				_eq(C.category_from_key(key), c["id"], "kategori gidiş-dönüş: %s" % key)
		_eq(C.get_skin_by_id("rose")["id"], "rose", "skin id ile bulunur")
		_eq(C.get_skin_by_id("yok")["id"], C.DEFAULT_SKIN_ID, "bilinmeyen skin → varsayılan")


# ----------------------------------------------------------------------------
# 2) Kelime veritabanı
# ----------------------------------------------------------------------------
func _test_word_manager() -> void:
		_group("WordManager — kelime veritabanı")
		var wm: Node = WordManagerScript.new()
		add_child(wm)  # _ready() → _build_database()

		# Her uzunluk ve kategori için kelime bulunmalı (7 dahil: oyun 7 harfe kadar çıkıyor)
		var lengths: Array = [3, 4, 5, 6, 7]
		for c in C.CATEGORIES:
				for l in lengths:
						var pool: Array = wm.get_words_by_length(l, c["id"])
						_ok(pool.size() > 0, "kelime var: %s / %d harf (%d adet)" % [c["key"], l, pool.size()])
						# Tüm kelimeler tam istenen uzunlukta olmalı
						var all_len_ok: bool = true
						for w in pool:
								if String(w).length() != l:
										all_len_ok = false
										break
						_ok(all_len_ok, "uzunluk doğru: %s / %d harf" % [c["key"], l])

		# Rastgele seçim doğru uzunlukta dönmeli (100 deneme)
		var wrong: int = 0
		for i in range(100):
				var w: String = wm.get_random_word(5, C.Category.KARISIK)
				if w.length() != 5:
						wrong += 1
		_eq(wrong, 0, "get_random_word 100 denemede hep 5 harf")

		# 7 harfli kelime: hem bulunmalı hem de rastgele seçim 7 harf dönmeli
		var wrong7: int = 0
		for i in range(100):
				var w7: String = wm.get_random_word(7, C.Category.KARISIK)
				if w7.length() != 7:
						wrong7 += 1
		_eq(wrong7, 0, "7 harfli kelime: 100 denemede hep 7 harf")
		_ok(wm.get_words_by_length(7, C.Category.KARISIK).size() >= 20,
				"7 harfli havuz yeterli kalabalıkta (>=20)")

		# "karisik" tüm kategorileri kapsamalı (hiç olmazsa doğadan bir kelime içermeli)
		var mixed: Array = wm.get_words_by_length(5, C.Category.KARISIK)
		_ok(mixed.has("BULUT"), "karışık kategori doğa kelimesini içerir")

		# Bilinmeyen kategori → karışığa düşer, boş dönmez
		_ok(wm.get_words_by_length(4, 999).size() > 0, "bilinmeyen kategori → karışık fallback")


# ----------------------------------------------------------------------------
# 3) Zorluk kademeleri
# ----------------------------------------------------------------------------
func _test_difficulty() -> void:
		_group("DifficultyManager — kademeler ve kolay mod")
		var dm: Node = DifficultyManagerScript.new()
		add_child(dm)

		var l1: Dictionary = dm.get_difficulty_for_level(1)
		_eq(l1["word_length"], 3, "bölüm 1 → 3 harf")
		_eq(l1["obstacle_count"], 0, "bölüm 1 → engel yok")
		_eq(l1["timed"], false, "bölüm 1 → süreli değil")

		var l16: Dictionary = dm.get_difficulty_for_level(16)
		_eq(l16["word_length"], 4, "bölüm 16 → 4 harf")
		_eq(l16["obstacle_count"], 4, "bölüm 16 → 4 engel")
		_eq(l16["timed"], true, "bölüm 16 → süreli mod")
		_eq(l16["time_limit_ms"], 4 * C.TIME_PER_LETTER_MS, "bölüm 16 süre = 4 × 9 sn")

		var l46: Dictionary = dm.get_difficulty_for_level(46)
		_eq(l46["word_length"], 6, "bölüm 46 → 6 harf")

		# Kolay mod: yavaş, engelsiz, süresiz
		var easy: Dictionary = dm.get_difficulty_for_level(30, true)
		_eq(easy["obstacle_count"], 0, "kolay mod → engel yok")
		_eq(easy["timed"], false, "kolay mod → süreli değil")
		var normal30: Dictionary = dm.get_difficulty_for_level(30, false)
		_ok(easy["step_sec"] > normal30["step_sec"], "kolay mod daha yavaş (%.3f > %.3f)" % [easy["step_sec"], normal30["step_sec"]])

		# Hız alt/üst sınırda kalmalı
		var l99: Dictionary = dm.get_difficulty_for_level(99)
		_ok(l99["step_sec"] >= C.SPEED_MIN_SEC, "hız alt sınırın altına inmez")

		# Günlük kelime deterministik ve geçerli
		var wm: Node = WordManagerScript.new()
		add_child(wm)
		var d1: String = dm.pick_daily_word(wm)
		var d2: String = dm.pick_daily_word(wm)
		_eq(d1, d2, "günlük kelime aynı gün deterministik")
		# Günlük kelime havuzu bilinçli olarak 4-5 harfli karışıktır (orta zorluk)
		_ok(d1.length() == 4 or d1.length() == 5, "günlük kelime 4 veya 5 harf (gelen: %s)" % d1)

		# Kolay mod HER bölümde daha yavaş olmalı (yüksek bölümlerde de)
		var kademeli_ok: bool = true
		var bozan: String = ""
		for lv in [1, 5, 10, 20, 30, 40, 50]:
				var norm: Dictionary = dm.get_difficulty_for_level(lv, false)
				var ez: Dictionary = dm.get_difficulty_for_level(lv, true)
				if ez["step_sec"] <= norm["step_sec"]:
						kademeli_ok = false
						bozan = "bölüm %d (kolay=%.3f, normal=%.3f)" % [lv, ez["step_sec"], norm["step_sec"]]
						break
		_ok(kademeli_ok, "kolay mod her bölümde daha yavaş%s" % ("" if kademeli_ok else " — " + bozan))


# ----------------------------------------------------------------------------
# 4) Harf yerleştirme — KRİTİK: aynı harften birden fazla olsa bile sıra karışmaz
# ----------------------------------------------------------------------------
func _test_snake_letters() -> void:
		_group("Snake — harf yerleştirme ve order_index")
		var s: Node2D = SnakeScript.new()
		add_child(s)
		s.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))

		_eq(s.body.size(), 3, "yılan başlangıç uzunluğu 3")
		_eq(s.body[0], Vector2i(5, 5), "yılan başı başlangıç hücresinde")

		s.place_letters("ADA", false)
		_eq(s.letters.size(), 3, "ADA → 3 harf objesi")
		_eq(s.letters[0]["char"], "A", "0. harf A")
		_eq(s.letters[1]["char"], "D", "1. harf D")
		_eq(s.letters[2]["char"], "A", "2. harf A")
		_eq(s.letters[0]["order_index"], 0, "ilk A → order_index 0")
		_eq(s.letters[2]["order_index"], 2, "ikinci A → order_index 2 (karışmaz)")

		# Hiçbir harf yılanın üstünde olmamalı
		var overlap: int = 0
		for l in s.letters:
				var cell := Vector2i(int(l["x"]), int(l["y"]))
				if s.body.has(cell):
						overlap += 1
		_eq(overlap, 0, "harfler yılanın üstünde değil")

		# Harfler sınırların içinde olmalı (duvar hücrelerine konmaz)
		var out_of_bounds: int = 0
		for l in s.letters:
				var x: int = int(l["x"])
				var y: int = int(l["y"])
				if x < 1 or y < 1 or x >= C.GRID_COLS - 1 or y >= C.GRID_ROWS - 1:
						out_of_bounds += 1
		_eq(out_of_bounds, 0, "harfler oyun alanı sınırları içinde")

		# tricky yerleşim de çalışmalı ve harfleri birbirinden uzağa koymalı
		s.place_letters("ADAM", true)
		_eq(s.letters.size(), 4, "ADAM (tricky) → 4 harf objesi")


# ----------------------------------------------------------------------------
# 5) Engel / bonus / buz / booster yerleştirme
# ----------------------------------------------------------------------------
func _test_snake_entities() -> void:
		_group("Snake — engel / bonus / buz / booster yerleştirme")
		var s: Node2D = SnakeScript.new()
		add_child(s)
		s.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s.place_letters("KİTAP", false)

		s.place_obstacles(4)
		_eq(s.obstacles.size(), 4, "4 engel yerleştirildi")
		var obstacle_on_letter: int = 0
		for o in s.obstacles:
				var cell := Vector2i(int(o["x"]), int(o["y"]))
				for l in s.letters:
						if Vector2i(int(l["x"]), int(l["y"])) == cell:
								obstacle_on_letter += 1
		_eq(obstacle_on_letter, 0, "engel harfin üstüne konmaz")

		s.place_bonus_letters(C.BONUS_LETTER_COUNT)
		_eq(s.bonus_letters.size(), C.BONUS_LETTER_COUNT, "%d bonus harf yerleştirildi" % C.BONUS_LETTER_COUNT)
		_eq(s.bonus_letters[0]["value"], C.BONUS_LETTER_VALUE, "bonus değeri %d" % C.BONUS_LETTER_VALUE)
		_eq(s.bonus_letters[0]["eaten"], false, "bonus başlangıçta yenmemiş")

		s.place_ice_zones(C.ICE_ZONE_COUNT)
		_eq(s.ice_zones.size(), C.ICE_ZONE_COUNT, "%d buz alanı yerleştirildi" % C.ICE_ZONE_COUNT)
		_eq(s.ice_zones[0]["slow_factor"], C.ICE_SLOW_FACTOR, "buz yavaşlatma katsayısı")

		s.place_speed_boosters(C.SPEED_BOOSTER_COUNT)
		_eq(s.speed_boosters.size(), C.SPEED_BOOSTER_COUNT, "%d hız artırıcı yerleştirildi" % C.SPEED_BOOSTER_COUNT)
		_eq(s.speed_boosters[0]["boost_factor"], C.SPEED_BOOST_FACTOR, "boost katsayısı")

		# Tüm varlıklar birbirinden bağımsız hücrelerde olmalı
		var seen: Dictionary = {}
		var dup: int = 0
		var all_cells: Array = []
		for l in s.letters:
				all_cells.append(Vector2i(int(l["x"]), int(l["y"])))
		for o in s.obstacles:
				all_cells.append(Vector2i(int(o["x"]), int(o["y"])))
		for b in s.bonus_letters:
				all_cells.append(Vector2i(int(b["x"]), int(b["y"])))
		for iz in s.ice_zones:
				all_cells.append(Vector2i(int(iz["x"]), int(iz["y"])))
		for sb in s.speed_boosters:
				all_cells.append(Vector2i(int(sb["x"]), int(sb["y"])))
		for c in all_cells:
				if seen.has(c):
						dup += 1
				seen[c] = true
		_eq(dup, 0, "varlıklar çakışmıyor (toplam %d hücre)" % all_cells.size())

		s.clear_entities()
		_eq(s.letters.size() + s.obstacles.size() + s.bonus_letters.size() + s.ice_zones.size() + s.speed_boosters.size(), 0, "clear_entities hepsini temizler")


# ----------------------------------------------------------------------------
# 6) Hız çarpanı — boost ve buz
# ----------------------------------------------------------------------------
func _test_speed_multiplier() -> void:
		_group("Snake — aktif hız çarpanı")
		var s: Node2D = SnakeScript.new()
		add_child(s)
		s.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))

		_eq(s.get_active_speed_multiplier(), 1.0, "normal durumda çarpan 1.0")

		# Buz üzerinde: 0.5
		s.on_ice = true
		_eq(s.get_active_speed_multiplier(), C.ICE_SLOW_FACTOR, "buz üzerinde çarpan %s" % C.ICE_SLOW_FACTOR)

		# Buz + boost: 0.5 × 1.8 = 0.9
		s.boost_end_time = Time.get_ticks_msec() + 1000
		var expected: float = C.ICE_SLOW_FACTOR * C.SPEED_BOOST_FACTOR
		_ok(absf(s.get_active_speed_multiplier() - expected) < 0.001, "buz + boost = %.2f" % expected)

		# Buzdan çıkınca sadece boost
		s.on_ice = false
		_eq(s.get_active_speed_multiplier(), C.SPEED_BOOST_FACTOR, "boost tek başına %s" % C.SPEED_BOOST_FACTOR)

		_ok(s.boost_remaining_ms() > 0, "boost kalan süre > 0")

		# Süresi dolmuş boost sıfırlanmalı
		s.boost_end_time = Time.get_ticks_msec() - 10
		s.update_boost()
		_eq(s.boost_end_time, 0, "süresi dolan boost sıfırlanır")
		_eq(s.boost_remaining_ms(), 0, "süresi dolan boost kalan süre 0")
		_eq(s.get_active_speed_multiplier(), 1.0, "boost bitince çarpan 1.0'a döner")


# ----------------------------------------------------------------------------
# 7) Hareket, harf yeme ve duvar çarpışması
# ----------------------------------------------------------------------------
func _test_snake_movement() -> void:
		_group("Snake — hareket / harf yeme / duvar")
		var s: Node2D = SnakeScript.new()
		add_child(s)
		s.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))

		# Düz hareket
		s.current_target_index = 0
		s.place_letters("ADA", false)
		# Harfleri yılanın yolundan uzağa taşı (yalnızca hareket testi)
		for i in range(s.letters.size()):
				s.letters[i]["x"] = 20
				s.letters[i]["y"] = 15
		s.step()
		_eq(s.body[0], Vector2i(6, 5), "step() başı sağa taşır")
		_eq(s.body.size(), 3, "normal harekette uzunluk sabit")

		# Ters yöne dönüş engellenmeli (anında ölüm olmasın)
		s.set_direction(Vector2i(-1, 0))
		s.step()
		_eq(s.body[0], Vector2i(7, 5), "ters yön isteği yok sayılır")

		# Doğru harfi yeme → ate_letter + uzama
		var eaten: Array = []
		var handler := func(letter: Dictionary) -> void: eaten.append(letter)
		s.ate_letter.connect(handler)
		s.letters[0]["x"] = 8
		s.letters[0]["y"] = 5
		s.grant_growth(1)   # GameManager büyüme kuralı krediyi verir
		s.step()
		_eq(eaten.size(), 1, "doğru harfte ate_letter sinyali yayıldı")
		_eq(s.letters[0]["eaten"], true, "yenen harf işaretlendi")
		_eq(s.body.size(), 4, "kredi varken harf yenince yılan uzar")

		# Yanlış harf (sıra dışı) → sinyal yayılır ama harf yenmez, yılan uzamaz
		var s2: Node2D = SnakeScript.new()
		add_child(s2)
		s2.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s2.current_target_index = 1  # hedef D
		s2.place_letters("ADA", false)
		# A(0) hücresini önüne koy → yanlış harf
		s2.letters[0]["x"] = 6
		s2.letters[0]["y"] = 5
		s2.letters[1]["x"] = 20
		s2.letters[1]["y"] = 15
		s2.letters[2]["x"] = 21
		s2.letters[2]["y"] = 15
		var wrong_hits: Array = []
		var h2 := func(letter: Dictionary) -> void: wrong_hits.append(letter)
		s2.ate_letter.connect(h2)
		s2.step()
		_eq(wrong_hits.size(), 1, "yanlış harfte de ate_letter yayılır (GameManager can düşürür)")
		_eq(s2.letters[0]["eaten"], false, "yanlış harf yenmiş sayılmaz")

		# Duvar davranışı (WRAP_WALLS açıkken ölüm yok, karşı taraftan çıkış)
		var s3: Node2D = SnakeScript.new()
		add_child(s3)
		var wall_hits: Array = []
		var h3 := func() -> void: wall_hits.append(true)
		s3.wall_collision.connect(h3)
		s3.reset(Vector2i(C.GRID_COLS - 2, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s3.step()  # (cols-1, 5) — hâlâ içeride
		_eq(wall_hits.size(), 0, "sınırın bir içinde duvar yok")
		s3.step()  # (cols, 5) — sınırın dışı
		if C.WRAP_WALLS:
				_eq(wall_hits.size(), 0, "WRAP_WALLS açık: duvara çarpınca ölmez")
				_eq(s3.body[0], Vector2i(0, 5), "duvardan geçince karşı taraftan çıkar")
		else:
				_eq(wall_hits.size(), 1, "sınırı geçince wall_collision sinyali")

		# Engel çarpışması
		var s4: Node2D = SnakeScript.new()
		add_child(s4)
		var obs_hits: Array = []
		var h4 := func() -> void: obs_hits.append(true)
		s4.obstacle_collision.connect(h4)
		s4.reset(Vector2i(5, 5), C.SNAKE_START_LENGTH, Vector2i(1, 0))
		s4.obstacles = [{"id": 0, "x": 6, "y": 5, "shape": "block"}]
		s4.letters = []
		s4.step()
		_eq(obs_hits.size(), 1, "engele çarpınca obstacle_collision sinyali")


# ----------------------------------------------------------------------------
# 7b) Yılan büyüme sistemi — kredi + tavan (makarna olmasın)
# ----------------------------------------------------------------------------
func _test_snake_growth() -> void:
		_group("Yılan büyüme sistemi — kredi / tavan")

		# GameManager kuralı (saf fonksiyon)
		_ok(GameManager.should_grow_on_letter(3, 1), "3 harfli: 1. harfte büyür")
		_ok(not GameManager.should_grow_on_letter(5, 1), "5 harfli: 1. harfte büyümez")
		_ok(GameManager.should_grow_on_letter(5, 2), "5 harfli: 2. harfte büyür")
		_ok(not GameManager.should_grow_on_letter(6, 2), "6 harfli: 2. harfte büyümez")
		_ok(GameManager.should_grow_on_letter(6, 3), "6 harfli: 3. harfte büyür")
		_ok(not GameManager.should_grow_on_letter(6, 0), "hiç harf yenmediyse büyümez")

		var s: Node2D = SnakeScript.new()
		add_child(s)
		s.reset(Vector2i(10, 9), 3, Vector2i(1, 0))
		_eq(s.body.size(), 3, "reset → 3 segment")
		s.max_length = 30

		# Kredi YOKKEN harf yemek büyütmez (kuyruk silinir)
		s.letters = [{"id": 1, "x": 11, "y": 9, "char": "A", "order_index": 0, "eaten": false, "phase": 0.0}]
		s.current_target_index = 0
		s.step()
		_eq(s.letters[0]["eaten"], true, "harf yendi")
		_eq(s.body.size(), 3, "kredi yokken yılan uzamaz")

		# Kredi varsa uzar
		s.grant_growth(1)
		s.letters = [{"id": 2, "x": 12, "y": 9, "char": "B", "order_index": 1, "eaten": false, "phase": 0.0}]
		s.current_target_index = 1
		s.step()
		_eq(s.body.size(), 4, "kredi varken yılan 1 segment uzar")

		# Tavan: max_length aşılamaz
		s.max_length = s.body.size()
		s.grant_growth(1)
		s.letters = [{"id": 3, "x": 13, "y": 9, "char": "C", "order_index": 2, "eaten": false, "phase": 0.0}]
		s.current_target_index = 2
		s.step()
		_eq(s.body.size(), s.max_length, "tavan dolunca harf yemek uzatmaz")

		# Bonus harf ARTIK UZATMAZ (uzunluk ceza; yıldızın ödülü puan + kuyruk düşmesi)
		var s2: Node2D = SnakeScript.new()
		add_child(s2)
		s2.reset(Vector2i(4, 4), 3, Vector2i(1, 0))
		s2.max_length = 30
		s2.letters = []
		s2.bonus_letters = [{"id": 1, "x": 5, "y": 4, "char": "X", "value": 25, "eaten": false, "phase": 0.0}]
		s2.step()
		_eq(s2.body.size(), 3, "yıldız yılanı UZATMAZ (ödül ceza olmasın)")
		_ok(s2.bonus_letters[0]["eaten"], "yıldız yine de yenmiş sayılır")

		# Hız iksiri de hız+s puan verir, UZATMAZ (tutarlılık: hiçbir toplanabilir uzatmaz)
		var s3: Node2D = SnakeScript.new()
		add_child(s3)
		s3.reset(Vector2i(4, 4), 3, Vector2i(1, 0))
		s3.max_length = 30
		s3.letters = []
		s3.bonus_letters = []
		s3.speed_boosters = [{"id": 1, "x": 5, "y": 4, "boost_factor": 2.0, "eaten": false, "phase": 0.0}]
		s3.step()
		_eq(s3.body.size(), 3, "hız iksiri yılanı UZATMAZ")
		_ok(s3.speed_boosters[0]["eaten"], "iksir yenmiş sayılır")
		_ok(s3.boost_end_time > 0, "hız artışı başladı")

		s.queue_free()
		s2.queue_free()
		s3.queue_free()


# ----------------------------------------------------------------------------
# 8) Ses sistemi — dosyasız prosedürel sentez
# ----------------------------------------------------------------------------
func _test_sound() -> void:
		_group("SoundManager — prosedürel ses sentezi")
		var names: Array = [
				"correct", "wrong", "word_complete", "level_up", "game_over",
				"bonus", "boost", "ice", "menu_click", "start", "time_warning",
		]
		for n in names:
				var st = SoundManager._build(n)
				if st == null:
						_ok(false, "sentezlendi: %s" % n)
						continue
				_pass += 1
				print("  [PASS] sentezlendi: %s (%d bayt PCM)" % [n, st.data.size()])
				if st.data.size() <= 0:
						_ok(false, "PCM verisi boş değil: %s" % n)
				if st.mix_rate != SoundManager.SAMPLE_RATE:
						_ok(false, "örnekleme frekansı: %s" % n)
				if st.format != AudioStreamWAV.FORMAT_16_BITS:
						_ok(false, "16-bit format: %s" % n)

		_eq(SoundManager._build("bilinmeyen_efekt"), null, "bilinmeyen efekt adı null döner")

		# Ses kapalıyken çalmaya çalışmak hata vermemeli
		SoundManager.set_enabled(false)
		SoundManager.play("correct")
		_ok(true, "ses kapalıyken play() hata vermiyor")
		SoundManager.set_enabled(true)
		SoundManager.set_volume(0.5)
		SoundManager.play("correct")
		_ok(SoundManager._players.size() == SoundManager.POOL_SIZE, "ses havuzu %d oyuncu" % SoundManager.POOL_SIZE)
		_ok(SoundManager._players[0].stream != null, "play() sonrası oyuncuya stream atandı")
		SoundManager.set_volume(0.0)
		_ok(SoundManager.volume_db <= -79.0, "ses seviyesi 0 → sessiz (-80 dB)")
		SoundManager.set_volume(0.35)


# ----------------------------------------------------------------------------
# 9) GameManager — kalıcılık ve çeviri
# ----------------------------------------------------------------------------
func _test_game_manager() -> void:
		_group("GameManager — autoload / kalıcılık / çeviri")

		# Autoload'u dinamik al (isim doğrudan yazılırsa yokluğunda parse hatası olur)
		var gm: Node = get_node_or_null("/root/GameManager")
		if gm == null:
				_ok(false, "GameManager autoload yüklendi")
				return
		_ok(true, "GameManager autoload yüklendi")

		# İstatistik anahtarları eksiksiz olmalı
		for key in ["bestScore", "bestLevel", "totalGames", "totalWordsCompleted", "soundEnabled", "soundVolume", "ttsVolume"]:
				_ok(gm.stats.has(key), "stats anahtarı var: %s" % key)

		# 14 başarım tanımlı olmalı ve hepsi kilit/açık bilgisi taşımalı
		_eq(gm.achievements.size(), 14, "14 başarım yüklendi")
		var missing_flag: int = 0
		for a in gm.achievements:
				if not a.has("unlocked") or not a.has("id") or not a.has("title"):
						missing_flag += 1
		_eq(missing_flag, 0, "her başarımda id/title/unlocked alanı var")

		# TR→EN sözlüğü çalışmalı
		_eq(gm.get_translation("DENİZ"), "sea", "DENİZ → sea")
		_eq(gm.get_translation("zzz"), "", "bilinmeyen kelime → boş string")

		# Skin kaydetme geri yüklenmeli (test sonrası eski değere döndürülür)
		var original: String = gm.get_skin()["id"]
		gm.save_skin("rose")
		_eq(gm.load_skin()["id"], "rose", "skin kaydedildi ve geri yüklendi")
		gm.save_skin(original)
		_eq(gm.get_skin()["id"], original, "skin eski değerine döndürüldü")

		# Ses ayarları hem GameManager'a hem SoundManager'a yansımalı
		var old_vol: float = gm.sound_volume
		gm.set_sound_volume(0.42)
		_ok(absf(gm.sound_volume - 0.42) < 0.001, "ses seviyesi GameManager'a yansıdı")
		gm.set_sound_volume(old_vol)

		# Haftalık istatistik 7 gün döndürmeli
		_eq(gm.weekly_stats.size(), 7, "haftalık istatistik 7 gün")

		# TTS seviyesi ayarlanabilmeli
		var old_tts: float = gm.tts_volume
		gm.set_tts_volume(0.77)
		_ok(absf(gm.tts_volume - 0.77) < 0.001, "TTS seviyesi ayarlandı")
		gm.set_tts_volume(old_tts)


# ----------------------------------------------------------------------------
# 10) Letter.tscn — sahne bütünlüğü
# ----------------------------------------------------------------------------
func _test_letter_scene() -> void:
		_group("Letter.tscn — sahne bütünlüğü")
		var scene: PackedScene = load("res://scenes/Letter.tscn")
		_ok(scene != null, "Letter.tscn yüklenebildi")
		if scene == null:
				return
		var inst: Node = scene.instantiate()
		add_child(inst)  # _ready() çalışsın

		_ok(inst is Area2D, "kök node Area2D")
		for child_name in ["BG", "Label", "Sprite2D", "CollisionShape2D", "AnimationPlayer"]:
				_ok(inst.get_node_or_null(child_name) != null, "alt node var: %s" % child_name)

		# Harf metni ve konumu ayarlanabilmeli
		inst.set("char", "Ç")
		var label: Label = inst.get_node_or_null("Label")
		if label != null:
				_ok(label.text == "Ç", "Label Türkçe harfi gösterir (Ç)")

		# Animasyonlar tanımlı olmalı (worklog bu maddeyi 'eksik' diye not etmişti)
		var anim: AnimationPlayer = inst.get_node_or_null("AnimationPlayer")
		if anim != null:
				var lib: AnimationLibrary = anim.get_animation_library("")
				_ok(lib != null, "animasyon kütüphanesi atanmış")
				if lib != null:
						_ok(lib.has_animation("pulse"), "pulse animasyonu tanımlı")
						_ok(lib.has_animation("vanish"), "vanish animasyonu tanımlı")

		# Hedef vurgusu animasyonu gerçekten oynatabilmeli
		inst.call("set_target_highlight", true)
		if anim != null:
				_ok(anim.is_playing(), "set_target_highlight(true) → pulse oynuyor")
		inst.call("set_target_highlight", false)
		if anim != null:
				_ok(not anim.is_playing(), "set_target_highlight(false) → animasyon durdu")

		# Test sonunda sahne örneğini serbest bırak (çıkışta sızıntı uyarısını önler)
		inst.queue_free()


# ----------------------------------------------------------------------------
# 11) Main.tscn — UI düğümleri ve unique-name bağlantıları
# ----------------------------------------------------------------------------
func _test_main_scene_integrity() -> void:
		_group("Main.tscn — UI düğümleri")
		var scene: PackedScene = load("res://scenes/Main.tscn")
		_ok(scene != null, "Main.tscn yüklenebildi")
		if scene == null:
				return
		var inst: Node = scene.instantiate()
		add_child(inst)

		# UIManager %UniqueName ile bu düğümlere bağlanır — eksikse oyun çöker
		var required: Array = [
				"LevelLabel", "WordLabel", "ScoreLabel", "LivesLabel", "MessageLabel",
				"ComboLabel", "TimerBar", "ObstacleLabel", "BonusLabel", "IceLabel",
				"BoostLabel", "ComboFlash", "AchievementNotif", "GameOverPanel",
				"AchievementIcon", "AchievementTitle", "AchievementDesc",
		]
		var missing: Array = []
		for n in required:
				if inst.find_child(n, true, false) == null:
						missing.append(n)
		_ok(missing.is_empty(), "tüm UI düğümleri mevcut%s" % ("" if missing.is_empty() else " — eksik: " + str(missing)))

		# Oyun alanı kökleri — entity'ler buraya eklenir
		for root_name in ["GameArea", "UIManager"]:
				_ok(inst.find_child(root_name, true, false) != null, "kök node var: %s" % root_name)

		# Yılan ve entity kapsayıcıları
		for holder in ["Snake", "Letters", "Obstacles", "Bonuses", "IceZones", "Boosters"]:
				_ok(inst.find_child(holder, true, false) != null, "kapsayıcı var: %s" % holder)

		# UI ile oyun alanı çakışmamalı.
		# Üst HUD satırları tahtanın ÜSTÜNDE, durum satırları tahtanın ALTINDA olmalı.
		# Gizli olanlar bile sayılır: sonradan görünür olduklarında yer kaplarlar.
		var top_rows: Array = [
				"LevelLabel", "WordLabel", "ScoreLabel", "LivesLabel",
				"ComboLabel", "TimerBar", "BonusLabel",
		]
		var bottom_rows: Array = [
				"ObstacleLabel", "IceLabel", "BoostLabel", "MessageLabel",
		]
		var ui: Node = inst.find_child("UIManager", true, false)
		var area: Node2D = inst.find_child("GameArea", true, false)
		if ui != null and area != null:
				var top_bar_bottom: float = 0.0
				for n in top_rows:
						var c: Node = inst.find_child(n, true, false)
						if c is Control:
								var ctrl: Control = c
								top_bar_bottom = maxf(top_bar_bottom, ctrl.position.y + ctrl.size.y)
				_ok(area.position.y >= top_bar_bottom,
						"üst HUD (alt=%.0f) oyun alanının (y=%.0f) üstünde" % [top_bar_bottom, area.position.y])

				var area_bottom: float = area.position.y + C.GRID_ROWS * C.CELL_SIZE
				var min_y: float = 99999.0
				for n in bottom_rows:
						var c2: Node = inst.find_child(n, true, false)
						if c2 is Control:
								var ctrl2: Control = c2
								if ctrl2.size.y > 0.0:
										min_y = minf(min_y, ctrl2.position.y)
				_ok(min_y >= area_bottom,
						"durum satırları (en üst y=%.0f) tahtanın altında (tahta alt=%.0f)" % [min_y, area_bottom])

		# Oyun alanı viewport'a SIĞMALI — aksi halde alt satırlar ekran dışında kalır
		var vw: float = float(ProjectSettings.get_setting("display/window/size/viewport_width"))
		var vh: float = float(ProjectSettings.get_setting("display/window/size/viewport_height"))
		if area != null:
				var right: float = area.position.x + C.GRID_COLS * C.CELL_SIZE
				var bottom_edge: float = area.position.y + C.GRID_ROWS * C.CELL_SIZE
				_ok(right <= vw,
						"oyun alanı sağ kenarı (%.0f) viewport genişliğine (%.0f) sığar" % [right, vw])
				_ok(bottom_edge <= vh,
						"oyun alanı alt kenarı (%.0f) viewport yüksekliğine (%.0f) sığar" % [bottom_edge, vh])

		inst.queue_free()
