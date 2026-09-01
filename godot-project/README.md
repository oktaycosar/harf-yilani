# 🐍 Harf Yılanı — Godot 4 Projesi

Klasik yılan oyununun **Türkçe kelime öğrenme** sürümü. Yılan harfleri, hedef kelimenin
harflerini **doğru sırayla** yer. Türkçe alfabe (Ç, Ğ, İ, Ö, Ş, Ü) tam desteklidir.

Bu klasör, Next.js ile yapılan oynanabilir web sürümünün **birebir Godot 4 karşılığıdır**.
Aynı oyun mantığı, aynı kelime veritabanı, aynı zorluk kademeleri.

## 📁 Klasör Yapısı

```
godot-project/
├── project.godot              # Godot proje yapılandırması + input map + autoload
├── icon.svg                   # Uygulama ikonu
├── scenes/
│   ├── Main.tscn             # Ana sahne (UI + GameArea + Snake + Letters)
│   └── Letter.tscn           # Tek harf objesi sahnesi
└── scripts/
    ├── constants.gd          # Oyun sabitleri (hız, zorluk kademeleri, alfabe)
    ├── word_manager.gd       # Türkçe kelime veritabanı (WordManager)
    ├── difficulty_manager.gd # Zorluk yöneticisi (bölüm→uzunluk+hız)
    ├── snake.gd              # Yılan hareketi + çarpışma (Snake)
    ├── letter.gd             # Harf objesi (order_index ile)
    ├── game_manager.gd       # Oyun durumu yöneticisi (autoload singleton)
    ├── ui_manager.gd          # HUD + paneller (UIManager)
    └── main.gd               # Ana sahne scripti (girdi + harf yerleştirme)
```

## 🚀 Çalıştırma

1. **Godot 4.3+** indirin: <https://godotengine.org/download>
2. Godot'u açın → **Import** → bu `godot-project/` klasörünü seçin.
3. `scenes/Main.tscn` ana sahne olarak otomatik ayarlanmıştır (project.godot).
4. **F5** ile çalıştırın.

## 🎮 Kontroller

| Tuş | İşlev |
|-----|-------|
| `↑ ↓ ← →` veya `W A S D` | Yılanı yönlendir |
| `P` / `Esc` | Duraklat / Devam et |
| `Enter` / `Space` | Menüde başlat, Game Over'da menüye dön |

## 🧠 Oyun Mantığı

- Hedef kelimenin her harfi için **ayrı bir harf objesi** oluşturulur.
- Her harfin kendi `order_index`i vardır (0'dan başlar).
- **Aynı harften birden fazla** olsa bile sıra karışmaz:
  - `ADAM` → A(0), D(1), A(2), M(3)
  - İlk A(0) yenmeden A(2)'ye çarparsan **YANLIŞ** olur.
- Yılan sıradaki hedef harfi yerse: **+puan, combo, uzar**.
- Yanlış harfe çarparsa: **-1 can**, bölüm baştan.
- 3 can bitince: **Oyun Bitti**.

## ⚙️ Zorluk Kademeleri (`constants.gd`)

| Kademe | Bölüm | Kelime Uzunluğu | Hız |
|--------|-------|-----------------|-----|
| 1 | 1–5 | 3 harf | Yavaş |
| 2 | 6–15 | 4 harf | Normal |
| 3 | 16–25 | 4 harf (tricky) | Hızlı |
| 4 | 26–35 | 5 harf | Hızlı |
| 5 | 36–45 | 5 harf (tricky) | Çok hızlı |
| 6 | 46+ | 6 harf | Uzman |

Değerleri `scripts/constants.gd` içindeki `DIFFICULTY_TIERS` ve `SPEED_*` sabitlerinden değiştirin.

## ➕ Yeni Kelime Ekleme

`scripts/word_manager.gd` içindeki `_build_database()` fonksiyonunda ilgili uzunluk dizisine
kelime ekleyin (BÜYÜK harf, Türkçe alfabe):

```gdscript
_words_by_length[4] = [..., "YENİ", "KELİME"]
```

## 🔧 Node Hiyerarşisi (Main.tscn)

```
Main (Node2D — main.gd)
├── UIManager (CanvasLayer — ui_manager.gd)
│   └── TopBar (Control)
│       ├── LevelLabel (%LevelLabel)
│       ├── ScoreLabel (%ScoreLabel)
│       ├── WordLabel (%WordLabel)
│       ├── LivesLabel (%LivesLabel)
│       ├── MessageLabel (%MessageLabel)
│       └── ComboLabel (%ComboLabel)
├── GameArea (Node2D)
│   ├── Snake (Node2D — snake.gd)
│   └── Letters (Node2D)
└── GameOverPanel (Control — %GameOverPanel)
```

`GameManager` autoload (singleton) olarak `project.godot`'ta kayıtlıdır — tüm sahnelerden
`GameManager.xxx` olarak erişilebilir.

## 📝 Notlar

- `.tscn` sahneleri metin tabanlıdır; Godot editöründe açıp görsel olarak düzenleyebilirsiniz.
- `Letter.tscn` içindeki `AnimationPlayer`'a `pulse` ve `vanish` animasyonlarını
  editörden eklemeniz gerekebilir (sahne iskeleti hazırdır).
- Bu Godot projesi, web (Next.js) sürümüyle aynı mantığı paylaşır —
  web sürümünü `bun run dev` ile `/` route'unda oynayabilirsiniz.

## 🛠️ İleride Eklenebilecekler

Süreli bölümler, liderlik tablosu, günlük kelime, özel görevler, engeller,
bonus harfler, buz/fren alanları, hız artırıcılar, TR→EN modu, kategori seçimi,
çocuklar için kolay mod, ses efektleri, kelime tamamlandığında sesli okuma.
