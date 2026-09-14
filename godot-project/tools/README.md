# godot-project/tools — Varlık (asset) üretim araçları

Bu klasördeki Python scriptleri oyunun **piksel varlıklarını ve yılan atlasını**
üretir. Hepsi Pillow kullanır (`pip install pillow`).

> ⚠ **Yollar mutlak (absolute).** Scriptlerin başındaki `SRC` / `TOOLS` / `GAME_SNAKE`
> gibi sabitler `C:\Users\OktayC\Desktop\Harness_Genel_26\...` yolunu gösterir.
> Başka bir makinede çalıştırmadan önce bu sabitleri düzelt.

---

## 1) Yılan atlası — İKİ AŞAMALI zincir

Son çıktı: `assets/snake/snake.png` — **576×576, 4×4 ızgara, hücre 144 px**.
Bu düzen `scripts/snake.gd` içindeki `SHEET_CELL = 144` ile birebir eşleşmek
zorundadır.

```
tools/source/kit_snake.png          (kaynak: 4x4 magenta zeminli tam yılan kiti)
        │
        │  1)  python build_snake_v2.py
        ▼
_tools/_v2b_snake.png               (ara çıktı — kafa/gövde/köşe/kuyruk üretilir)
        │
        │  2)  python refine_snake.py --apply
        ▼
assets/snake/snake.png              (OYUNUN KULLANDIĞI DOSYA)
```

`build_snake_v2.py` şunları üretir:

| Parça | Nasıl üretilir |
|---|---|
| `body_h` | Kaynak yılanın **düz gövdesinden** 36 px'lik dilim, aynalanıp karo yapılır → dikişsiz tekrar |
| `body_v` | `body_h`'ın 90° dönmüşü (birebir aynı kalınlık) |
| `corner_*` | Borunun **kendi kesiti** bir yay boyunca süpürülür (sweep) → 4 köşe birbirinin dönüşü |
| `tail_*` | Kaynak yılanın kendi kuyruğu, 4 yöne döndürülür |
| `head_*` | Mevcut atlas'tan kopyalanır + boyun borusu gövdeye göre onarılır |

`refine_snake.py` ince ayar yapar:

1. **Kafa oranı** — 4 yönün kafası da `HEAD_RATIO` kadar kalın olacak şekilde
   ölçeklenir (tek satırla değiştirilir). Ölçüm **alfa eşiğinden SONRA** yapılır,
   yoksa hedeflenen kalınlık pratikte daha ince çıkar.
2. **Kuyruk tabanı** — açık uç, gövde döşemesiyle birebir aynı dokuya getirilir.
3. **Kenar sertleştirme** — alfa eşiklenir, yarı saydam piksel kalmaz.

### Ölçülen sözleşmeler (testle kilitli)

`tests/test_game.gd` → `_test_atlas_geometry()` bunları doğrular:

* 12 açık kenarda (4 kafa, 4 kuyruk, `body_h` sol/sağ, `body_v` üst/alt)
  **boru kalınlığı tam 30 px** ve bant **57..86** aralığında olmalı
* 4 kafanın kalınlığı **birbirine eşit** ve 30–44 px arası olmalı
* Atlas'ta **kısmi alfa bulunmamalı** (kenarlar keskin)

Oyun hücresi 36 px, oyun penceresi (hücre içi) **54..90**.

---

## 2) Diğer varlık üreticileri

| Script | Çıktı |
|---|---|
| `build_frame_bg.py` | `assets/ui/frame_bg.png` — tahta çerçeve (taş bantlar, köşeler, fener, sarmaşık) |
| `build_panels.py` | `assets/ui/panel_plank.png` — HUD ahşap tabela dokusu (yazısız) |
| `build_stone_tiles2.py` | `assets/tiles/obstacle_stone.png`, `obstacle_spike.png`, `tile_bonus.png` |
| `build_night_assets.py` | `bg_sky.png`, `globe_hud.png`, `globe_menu.png` |
| `build_menu_decor.py` | `decor_owl.png`, `decor_books.png` |
| `slice_sheet_magenta.py` | Magenta zeminli kit sayfalarını parçalara ayırır (alfa temizliği dahil) |

---

## 3) Doğrulama

```powershell
# Atlasi üret
python refine_snake.py --apply

# Godot'ya içe aktart (YENİ PNG'DEN SONRA ŞART — yoksa eski .ctex çizilir)
& $godot --headless --path <proje> --import

# Sözleşmeleri ölç
python measure_head_ratio.py

# Testler
& $godot --headless --path <proje> --quit res://tests/test_game.tscn
```

`measure_head_ratio.py` boru kalınlığını, kafa oranını, boyun hizasını ve
kenar yumuşaklığını ölçüp yazdırır.

---

## 4) Tasarım kararları (neden böyle)

* **Tek global ölçek**: tüm parçalar kaynak yılanın kendi borusuna göre
  ölçeklenir; parça başına ayrı ölçek "yaka/basamak/halka" artefaktı üretiyordu.
* **Köşeler süpürme ile üretilir**, hazır sprite ile değil: hazır köşe
  parçalarının uçlarında krem "kesik uç" vardı ve zincir "kesilmiş sosis" gibi
  görünüyordu.
* **Alfa-duyarlı küçültme** (premultiply → resize → unpremultiply): düz LANCZOS
  şeffaf piksellerin siyahını kenara karıştırıp koyu hale yapıyor.
* **Boyun/kuyruk tabanı gövde döşemesiyle doldurulur**: tek kolon tekrarı dikey
  çizgi bırakıp ek yeri gibi okunuyordu.
