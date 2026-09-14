# ============================================================================
# WordManager — Türkçe kelime veritabanı (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Kelimeler uzunluk VE kategoriye göre organize edilir.
# Web sürümündeki wordDatabase.ts ile birebir aynı içerik.
# Yeni kelime eklemek için ilgili kategori dizisine kelime eklemeniz yeterli.
# Tüm harfler BÜYÜK ve Türkçe alfabesinden.
# ============================================================================

class_name WordManager
extends Node

const C = preload("res://scripts/constants.gd")

# Kategori keyi → { uzunluk → [kelimeler] }
var _db: Dictionary = {}


func _ready() -> void:
		_build_database()


func _build_database() -> void:
		_db["karisik"] = {
				3: ["ADA", "ANA", "ARI", "BAL", "DAL", "GÜL", "KOL", "ÇAY", "AŞK", "SÜT", "YAĞ", "KÖY", "GÖL", "YIL", "SAÇ", "SUÇ", "BEŞ", "DİŞ", "GÜÇ", "SÖZ", "YÜZ", "ÇOK", "ÖZÜ", "EKİ", "İŞİ"],
				4: ["ADAM", "MASA", "ELMA", "KAPI", "BABA", "KALE", "EVİM", "ÇİLE", "BORU", "BALO", "EKİM", "KÜPE", "YAZI", "BORA", "DURU", "SABA", "TUĞL", "DİŞİ", "SUCU", "YÜZÜ", "GÖLÜ", "GÖCE", "KEÇİ", "EŞEK", "TAVU"],
				5: ["KİTAP", "KALEM", "ÇİÇEK", "BULUT", "DENİZ", "YILAN", "BALIK", "KÖPRÜ", "SİNEK", "GÜNEŞ", "MAKAS", "DEFNE", "KAĞIT", "ÇANTA", "BİLGİ", "SULAR", "BİLGE", "MÜZİK", "SEBZE", "ARMUT", "TAVUK", "GÖMLE", "CAMLI", "EKMEK", "ARPA"],
				6: ["BİLİM", "BAHÇE", "KAHVE", "GÖMLEK", "BÖLÜM", "YILDIZ", "KUŞLAR", "ŞARKIL", "KAĞIDI", "SEPETİ", "TRENLER", "SOKAKL", "YATAKL", "ÇOCUKL", "KAPILA", "TORBASI", "TARÇIN", "TAVŞAN"],
				7: ["PENCERE", "KELEBEK", "PATATES", "KURBAĞA", "PAPATYA", "MENEKŞE", "ŞEMSİYE", "TELEFON", "ARKADAŞ", "ÖĞRENCİ", "HARFLER", "OYUNLAR", "SEVİMLİ", "KÜÇÜCÜK", "ÇİÇEKLİ", "GÖKYÜZÜ", "BULUTLU", "GÜNEŞLİ", "AĞAÇLAR", "SAATLER", "RENKLER", "TİYATRO", "KİTAPLI", "OYUNCAK", "MÜZİKLİ", "RESİMLİ", "KOCAMAN", "ÇALIŞMA", "ÇEKİRGE", "DENİZCİ"],
		}
		_db["hayvanlar"] = {
				3: ["ARI", "BAL", "DAL"],
				4: ["KEÇİ", "EŞEK", "TAVU", "BALI", "KOYU", "KUŞU", "ARIK"],
				5: ["BALIK", "SİNEK", "TAVUK"],
				6: ["TAVŞAN", "YILDIZ"],
				7: ["KELEBEK", "KURBAĞA", "ÇEKİRGE", "PENGUEN", "BALIKÇI"],
		}
		_db["yiyecekler"] = {
				3: ["BAL", "SÜT", "ÇAY", "YAĞ", "EKİ"],
				4: ["ELMA", "BALO", "ARPA", "EKİM", "DİŞİ", "SUCU", "YÜZÜ"],
				5: ["ARMUT", "SEBZE", "ÇİLEK", "KARPU", "EKMEK", "BALIK"],
				6: ["KAHVE", "TARÇIN", "BAKLIM"],
				7: ["PATATES", "KAHVELİ", "SEBZELİ", "BALIKLI", "MEYVELİ", "ÇİLEKLİ", "KARPUZU"],
		}
		_db["esya"] = {
				3: ["KOL", "KÖY", "GÖL"],
				4: ["MASA", "KAPI", "KALE", "BORU", "KÜPE", "YAZI", "BALO", "DURU", "SABA", "TUĞL", "KEÇİ", "EŞEK"],
				5: ["KİTAP", "KALEM", "MAKAS", "KAĞIT", "ÇANTA", "GÖMLE", "KÖPRÜ", "DEFNE", "CAMLI"],
				6: ["GÖMLEK", "SEPETİ", "TORBASI", "KAĞIDI", "BÖLÜM"],
				7: ["PENCERE", "ŞEMSİYE", "TELEFON", "SANDAYE", "KİTAPLI", "DOLAPLI", "KALEMLİ"],
		}
		_db["doga"] = {
				3: ["ADA", "DAL", "GÜL", "GÖL", "ÇAY", "YAĞ", "YIL", "KÖY"],
				4: ["EVİM", "BORU", "BALO", "BORA", "DURU", "SABA", "TUĞL", "GÖCE", "GÖLÜ"],
				5: ["BULUT", "DENİZ", "GÜNEŞ", "ÇİÇEK", "DEFNE", "SULAR", "CAMLI", "GÖMLE"],
				6: ["BAHÇE", "YILDIZ", "YATAKL", "SOKAKL", "ÇOCUKL", "KAPILA"],
				7: ["GÖKYÜZÜ", "BULUTLU", "GÜNEŞLİ", "AĞAÇLAR", "DENİZLİ", "ORMANLI", "ÇİÇEKLİ"],
		}


## Belirli uzunluk + kategori için kelime listesi.
## "karisik" kategorisi tüm kategorileri birleştirir.
func get_words_by_length(length: int, category: int = C.Category.KARISIK) -> Array:
		var cat_key: String = C.category_key(category)
		if cat_key == "karisik":
				var all: Dictionary = {}
				for ck in _db.keys():
						var pool: Array = _db[ck].get(length, [])
						for w in pool:
								if w.length() == length:
										all[w] = true
				return all.keys()
		var pool2: Array = _db.get(cat_key, {}).get(length, [])
		var out: Array = []
		for w in pool2:
				if w.length() == length:
						out.append(w)
		return out


## Verilen uzunluk ve kategoride rastgele bir kelime döndürür.
## exclude: son oynanan kelimeler (tekrar önlemek için).
func get_random_word(length: int, category: int = C.Category.KARISIK, exclude: Array = []) -> String:
		var pool: Array = get_words_by_length(length, category)
		if pool.is_empty():
				# Karışık kategoriye düş
				pool = get_words_by_length(length, C.Category.KARISIK)
		if pool.is_empty():
				# En yakın uzunluğa düş
				for l in [6, 5, 4, 3]:
						if l <= length:
								var fallback: Array = get_words_by_length(l, category)
								if not fallback.is_empty():
										pool = fallback
										break
		if pool.is_empty():
				return "ADAM"
		var candidates: Array = []
		for w in pool:
				if not exclude.has(w):
						candidates.append(w)
		if candidates.is_empty():
				candidates = pool
		return candidates[randi() % candidates.size()]
