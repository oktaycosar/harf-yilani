# ============================================================================
# WordManager — Türkçe kelime veritabanı (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Kelimeleri uzunluğa göre sözlükte tutar. Yeni kelime eklemek için ilgili
# diziye kelime eklemeniz yeterli. Tüm harfler BÜYÜK ve Türkçe alfabesinden.
# ============================================================================

class_name WordManager
extends Node

# Uzunluk → kelime listesi
var _words_by_length: Dictionary = {}


func _ready() -> void:
	_build_database()


func _build_database() -> void:
	_words_by_length[3] = [
		"ADA", "ANA", "ARI", "BAL", "DAL", "GÜL", "KOL", "ÇAY", "AŞK", "SÜT",
		"YAĞ", "EKİ", "ILK", "KÖY", "ÖZÜ", "İŞİ", "GÖL", "YIL", "ORU",
		"SAÇ", "SUÇ", "TÜK", "BEŞ", "DİŞ", "GÜÇ", "SÖZ", "YÜZ", "ÇOK", "AZI",
	]
	_words_by_length[4] = [
		"ADAM", "MASA", "ELMA", "KAPI", "BABA", "KALE", "EVİM", "ÇİLE", "BORU",
		"DİŞİ", "SUCU", "YÜZÜ", "GÖLÜ", "BALO", "EKİM", "KÜPE", "YAZI", "BORA",
		"DURU", "SABA", "TUĞL",
	]
	_words_by_length[5] = [
		"KİTAP", "KALEM", "ÇİÇEK", "BULUT", "DENİZ", "YILAN", "BALIK", "KÖPRÜ",
		"SİNEK", "GÜNEŞ", "MAKAS", "DEFNE", "KAĞIT", "CAMLI", "GÖMLE", "ÇANTA",
		"BİLGİ", "SULAR", "BİLGE", "MÜZİK", "YAPRA", "SEBZE", "ARMUT", "TAVUK",
	]
	_words_by_length[6] = [
		"BİLİM", "BAHÇE", "KAHVE", "ANNESİ", "GÖMLEK", "BÖLÜM", "YILDIZ",
		"KAPILA", "SOKAKL", "ÇOCUKL", "YATAKL", "KUŞLAR", "ŞARKIL", "TRENLER",
		"KAĞIDI", "SEPETİ", "TORBASI",
	]


func get_words_by_length(length: int) -> Array:
	return _words_by_length.get(length, [])


func get_random_word(length: int, exclude: Array = []) -> String:
	var pool: Array = get_words_by_length(length)
	if pool.is_empty():
		# En yakın uzunluğa düş
		for l in _words_by_length.keys():
			if l <= length and not _words_by_length[l].is_empty():
				pool = _words_by_length[l]
	if pool.is_empty():
		return "ADAM" # son çare güvenli kelime
	# Dışlananları ele
	var candidates: Array = []
	for w in pool:
		if not exclude.has(w):
			candidates.append(w)
	if candidates.is_empty():
		candidates = pool
	return candidates[randi() % candidates.size()]
