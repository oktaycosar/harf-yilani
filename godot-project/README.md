# 🐍 Harf Yılanı — Godot 4 Projesi

Klasik yılan oyununun **Türkçe kelime öğrenme** sürümü. Yılan harfleri, hedef kelimenin
harflerini **doğru sırayla** yer. Türkçe alfabe (Ç, Ğ, İ, Ö, Ş, Ü) tam desteklidir.

Bu klasör, Next.js ile yapılan oynanabilir web sürümünün **birebir Godot 4 karşılığıdır**.
Aynı oyun mantığı, aynı kelime veritabanı, aynı zorluk kademeleri — ek olarak engeller,
bonus harfler, buz alanları, hız artırıcılar, süreli mod, kolay mod, günlük challenge,
TR→EN çeviri, kategori seçimi, yılan skin sistemi, achievement'lar, liderlik tablosu,
kategori ilerleme takibi ve haftalık istatistikler.

> Web sürümü ve lisans bilgisi için depo kökündeki [README](../README.md).

## ⌨️ Kontroller

| Tuş | İşlev |
|---|---|
| ← ↑ → ↓ / WASD | Yön |
| P veya Esc | Duraklat / devam et |
| Enter veya Space | Menüyü başlat |
| Esc (menüde) veya ÇIKIŞ butonu | Oyundan çık |

## ⭐ Bonus (yıldız) kuralı

Yıldız **ödüldür**: +25 puan ve combo +1 verir, yılanı **büyütmez**.
Her **15 yıldızda** yılanın 1 kuyruğu düşer (taban uzunluğun altına inmez).
Böylece uzun vadede yılan uzamaz — bu oyunda uzunluk puan değil,
kendine çarpıp ölme riskidir. Yılanı **sadece doğru harfler** büyütür.

## 📁 Klasör Yapısı

```
godot-project/
├── project.godot              # Godot proje yapılandırması + input map + autoload
├── icon.svg                   # Uygulama ikonu
├── scenes/
│   ├── Main.tscn             # Ana sahne (UI + GameArea + Snake + entities)
│   └── Letter.tscn           # Tek harf objesi sahnesi
├── assets/
│   ├── snake/
│   │   ├── snake.png         # 4x4 atlas (hücre 144px): kafa/kuyruk/gövde/köşe
│   │   ├── snake_faces.png   # HUD portresi (3 ifade)
│   │   └── snake_hue.gdshader # Skin sistemi (hue-shift)
│   └── ui/                   # Çerçeve, paneller, döşemeler, ikonlar, dekor, arka plan
├── scripts/
│   ├── constants.gd          # Sabitler + kategoriler + yılan skinleri
│   ├── word_manager.gd       # Türkçe kelime veritabanı (5 kategori × 4 uzunluk)
│   ├── difficulty_manager.gd # Zorluk yöneticisi (engel/süreli mod + günlük challenge)
│   ├── snake.gd              # Yılan motoru (atlas çizimi + boost/ice state)
│   ├── letter.gd             # Harf objesi (order_index ile)
│   ├── board_background.gd   # Tahta ızgarası + kesişim noktaları
│   ├── game_manager.gd       # Oyun durumu + kalıcılık (ConfigFile) + başarımlar
│   ├── ui_manager.gd         # HUD + paneller + achievement notif + combo flash
│   └── main.gd               # Ana sahne (girdi + entity yerleştirme)
├── tests/
│   └── test_game.gd          # Headless test paketi (368 kontrol)
├── tools/                    # Piksel varlık üreticileri (Python + Pillow)
│   ├── README.md             # Üretim zinciri + ölçülen sözleşmeler
│   └── source/               # Kaynak kit sayfaları (varlıklar sıfırdan üretilebilir)
└── docs/                     # Ekran görüntüleri + tasarım notları
```

## 🚀 Çalıştırma

1. **Godot 4.7+** indirin: <https://godotengine.org/download>
2. Godot'u açın → **Import** → bu `godot-project/` klasörünü seçin.
3. `scenes/Main.tscn` ana sahne olarak otomatik ayarlanmıştır (project.godot).
4. **F5** ile çalıştırın.

> ⚠️ **Projeyi ilk kez açtığınızda** Godot `.godot/` klasörünü oluşturur ve
> `class_name` tanımlarını kaydeder. Bu klasör silinirse `Could not find type
> "Letter"` benzeri parse hataları alırsınız — çözüm: projeyi editörde bir kez açın.

## ✅ Doğrulama (headless test)

Proje, oyun kurallarını gerçekten çalıştıran bir headless test içerir
(`tests/test_game.gd` → 368 kontrol). Kod değiştirdikten sonra çalıştırın:

```bash
godot --headless --path godot-project res://tests/test_game.tscn
```

Çıkış kodu `0` ise tüm testler geçti. Testler şunları doğrular:

- Sabitler ve engel sayısı kademeleri (5 → 0, 6 → 2, … 50 → 10 engel)
- Kategori gidiş-dönüş dönüşümleri ve skin arama
- Kelime veritabanı: her kategori × uzunluk için kelime var, uzunluklar doğru
- Zorluk kademeleri, süreli mod eşiği, **kolay modun her bölümde daha yavaş olması**
- **`order_index` ile duplicate harf sırası** (ADA → A(0), D(1), A(2))
- Harf/engel/bonus/buz/booster yerleştirme ve çakışmama
- Hız çarpanı: normal 1.0, buz 0.5, boost 1.8, buz+boost 0.9, süre dolunca sıfırlanma
- Hareket, ters yön engeli, doğru/yanlış harf, duvar ve engel çarpışması sinyalleri
- Prosedürel ses: 11 efektin PCM sentezi, ses havuzu, sessiz mod
- GameManager: autoload, stats anahtarları, 14 başarım, TR→EN sözlüğü, skin kalıcılığı
- **Yılan atlası geometrisi**: 12 açık kenarda boru kalınlığı tam 30 px, 4 yönün
  kafa kalınlığı eşit, yarı saydam piksel yok (`_test_atlas_geometry`)
- **Yıldız ödülü**: 14 yıldızda kuyruk düşmez, 15'te düşer, 30'da tekrar düşer
- **HUD**: kalp sprite'ları, panel dokuları, kafa portresi ifadeleri, gece varlıkları
- **Çıkış**: menüde ÇIKIŞ butonu var, `%QuitButton` bağlı, Esc de çıkış yapıyor

Ayrıca oyunun kendisini de hatasız başlattığını doğrulayabilirsiniz:

```bash
godot --headless --path godot-project --quit-after 60
```

## 🎮 Kontroller

| Tuş | İşlev |
|-----|-------|
| `↑ ↓ ← →` veya `W A S D` | Yılanı yönlendir |
| `P` / `Esc` | Duraklat / Devam et |
| `Esc` (duraklatılmışken) | Menüye dön |
| `Enter` / `Space` | Menüde başlat, Game Over'da menüye dön |
| `Z` | ui_accept'a eşlenmiş (menü kısayolu) |

## 🧠 Oyun Mantığı

- Hedef kelimenin her harfi için **ayrı bir harf objesi** oluşturulur.
- Her harfin kendi `order_index`i vardır (0'dan başlar).
- **Aynı harften birden fazla** olsa bile sıra karışmaz:
  - `ADAM` → A(0), D(1), A(2), M(3)
  - İlk A(0) yenmeden A(2)'ye çarparsan **YANLIŞ** olur.
- Yılan sıradaki hedef harfi yerse: **+puan, combo, uzar**.
- Yanlış harfe çarparsa: **-1 can**, bölüm baştan.
- Tüm canlar bitince: **Oyun Bitti**.

## 🎯 Oyun Mekanikleri

### Zorluk Kademeleri (`constants.gd`)

| Kademe | Bölüm | Kelime Uzunluğu | Hız | Ek |
|--------|-------|-----------------|-----|----|
| 1 | 1–5 | 3 harf | Yavaş | — |
| 2 | 6–15 | 4 harf | Normal | Engeller başlar (2 adet) |
| 3 | 16–25 | 4 harf (tricky) | Hızlı | Süreli mod başlar |
| 4 | 26–35 | 5 harf | Hızlı | — |
| 5 | 36–45 | 5 harf (tricky) | Çok hızlı | — |
| 6 | 46+ | 6 harf | Uzman | — |

### 🚧 Engeller
- Bölüm 6+ başlar, sayı kademeli artar (2→4→6→8→10).
- Taş blok (gri) veya kırmızı spike.
- Yılan çarpınca **-1 can**, bölüm baştan.

### ⭐ Bonus Harfler
- Her bölümde 2 adet mor yıldız şeklinde bonus harf.
- Yenince **+25 puan**, yılan uzar ama sıra etkilenmez.
- Rastgele Türkçe harf gösterir.

### ❄️ Buz Alanları
- Bölüm 10+ aktif, 3 adet buz karesi.
- Yılan üstünden geçince **0.5x hız** (yavaşlar).
- Yılan buz üzerindeyken mavi renge bürünür.

### ⚡ Hız Artırıcılar
- Bölüm 12+ aktif, 1 adet amber disk + ⚡ ikonu.
- Yenince **4 saniye boyunca 1.8x hız** + **+15 puan**.
- Yılan boost halindeyken amber/altın renge bürünür + baş glow.

### ⏱️ Süreli Mod
- Bölüm 16+ aktif.
- Süre = kelime uzunluğu × 9 saniye (örn. 4 harfli → 36 sn).
- Süre dolunca **-1 can**, bölüm baştan.
- Hızlı tamamlamada kalan süre > %50 ise **+30 zaman bonusu**.
- HUD'da süre çubuğu (son 10s amber, son 5s rose).

### 🎲 Kategoriler
5 kategori: **Karışık 🎲, Hayvanlar 🐱, Yiyecekler 🍎, Eşyalar 📦, Doğa 🌳**.
"Karışık" tüm kategorileri birleştirir.

### 🌐 TR→EN Çeviri
- Kelime tamamlandığında İngilizce çevirisi gösterilir (80+ kelime sözlüğü).
- Örnek: "DENİZ" → "İngilizce: sea".

### 👶 Kolay Mod (Çocuklar için)
- Toplam 5 can (3 + 2 ekstra).
- 0.6x hız (daha yavaş).
- Engel yok, süreli mod kapalı.
- Yaşlı/başlangıç oyuncular için ideal.

### 📅 Günlük Challenge
- Her gün tarihe göre deterministik kelime.
- Tek bölüm, engel/süre yok.
- Tamamlandığında ConfigFile'a işaretlenir.

### 🎨 Yılan Skin Sistemi
5 hazır skin (her biri boost/buz/normal için ayrı renk paleti):

| ID | İsim | Emoji | Normal | Boost | Buz |
|----|------|-------|--------|-------|-----|
| `emerald` | Zümrüt | 🐍 | Yeşil | Amber | Mavi |
| `amber` | Ateş | 🔥 | Amber | Kırmızı | Mavi |
| `sky` | Buz | ❄️ | Mavi | Amber | Mor |
| `rose` | Gül | 🌹 | Pembe | Amber | Mavi |
| `purple` | Mor | 🔮 | Mor | Amber | Mavi |

Skin tercihi `user://harf_yilani.cfg`'ye kaydedilir.

### 🏆 Achievement Sistemi (14 başarım)
- İlk Kelime 🎯, Combo Ustası ×5 🔥, Combo Efsanesi ×10 ⚡
- Yüzü Geç 💯, Beş Yüz Kulübü 🏆, Bin Puan 👑
- Acemi (Bölüm 5) 🌱, Çırak (Bölüm 10) ⭐, Usta (Bölüm 25) 🖖
- Kelime Avcısı (10 kelime) 📚, Kelime Hazinesi (50 kelime) 📖
- Günlük Görev 📅, Hız Toplayıcı 🚀, Kusursuz Bölüm ✨
- Yeni başarım açıldığında sağ üstte bildirim popup (slide-in animasyon).

### 📊 Liderlik Tablosu
- En yüksek 10 skor saklanır.
- Skora göre azalan sıralı, eşitse erken tarihe öncelik.
- Tarih + bölüm + kelime bilgisiyle.

### 📈 Kategori İlerleme Takibi
- Her kategori için tamamlanan kelime sayısı.
- Hedef 10 kelime kategori başına.

### 📅 Haftalık İstatistikler
- Son 7 günün oyun sayısı + en iyi skoru.
- 30 günden eski kayıtlar otomatik temizlenir.

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
│       ├── ComboLabel (%ComboLabel)
│       ├── TimerBar (%TimerBar) — ProgressBar
│       ├── BoostLabel (%BoostLabel)
│       ├── ObstacleLabel (%ObstacleLabel)
│       ├── BonusLabel (%BonusLabel)
│       ├── IceLabel (%IceLabel)
│       ├── ComboFlash (%ComboFlash)
│       └── AchievementNotif (%AchievementNotif)
│           ├── AchievementIcon (%AchievementIcon)
│           ├── AchievementTitle (%AchievementTitle)
│           └── AchievementDesc (%AchievementDesc)
├── GameArea (Node2D)
│   ├── Snake (Node2D — snake.gd)
│   ├── Letters (Node2D)
│   ├── Obstacles (Node2D)
│   ├── Bonuses (Node2D)
│   ├── IceZones (Node2D)
│   └── Boosters (Node2D)
└── GameOverPanel (Control — %GameOverPanel)
```

`GameManager` autoload (singleton) olarak `project.godot`'ta kayıtlıdır — tüm sahnelerden
`GameManager.xxx` olarak erişilebilir.

## 💾 Kalıcılık

Tüm istatistikler Godot'un `user://harf_yilani.cfg` (ConfigFile) yolunda saklanır:

- **Stats**: `bestScore`, `bestLevel`, `totalGames`, `totalWordsCompleted`, `soundEnabled`, `soundVolume`, `ttsVolume`
- **Leaderboard**: Son 10 oyun (skor, bölüm, tarih, kelime)
- **Achievements**: 14 başarım + açılma timestamp'i
- **Category Progress**: 5 kategori × kelime sayısı
- **Weekly Stats**: Son 7 gün × oyun sayısı + en iyi skor
- **Daily Completion**: Günlük challenge tamamlama kaydı
- **Skin**: Seçili skin ID'si

Sıfırlamak için `GameManager.reset_all_stats()` çağrılır.

## ➕ Yeni Kelime Ekleme

`scripts/word_manager.gd` içindeki `_build_database()` fonksiyonunda ilgili kategori +
uzunluk dizisine kelime ekleyin (BÜYÜK harf, Türkçe alfabe):

```gdscript
_db["hayvanlar"][5] = ["BALIK", "SİNEK", "TAVUK", "YENİKELİME"]
```

## 🌐 TR→EN Çeviri Ekleme

`scripts/game_manager.gd` içindeki `TR_EN_DICT` sabitine yeni kelime ekleyin:

```gdscript
"YENİKELİME": "new word",
```

## 📝 Notlar

- `.tscn` sahneleri metin tabanlıdır; Godot editöründe açıp görsel olarak düzenleyebilirsiniz.
- `Letter.tscn` içindeki `AnimationPlayer`'a `pulse` ve `vanish` animasyonlarını
  editörden eklemeniz gerekebilir (sahne iskeleti hazırdır).
- Ses efektleri **prosedürel olarak sentezlenir** (`scripts/sound_manager.gd`) —
  hiçbir ses dosyası gerekmez, 11 efekt (correct, wrong, word_complete, level_up,
  game_over, bonus, boost, ice, menu_click, start, time_warning) çalışma anında
  16-bit PCM olarak üretilip önbelleğe alınır.
- Bu Godot projesi, web (Next.js) sürümüyle aynı mantığı paylaşır —
  web sürümünü `bun run dev` ile `/` route'unda oynayabilirsiniz.

## 📦 Dışa Aktarma (Export)

Projeyi dağıtılabilir hâle getirmek için Godot editöründe:

1. **Editor → Manage Export Templates** → **Download and Install** (sürüm 4.7.1
   şablonları indirilir; bir kez yapılır).
2. **Project → Export…** → **Add…** → hedef platformu seçin
   (Windows Desktop / Web / Linux).
3. **Export Project…** ile derleyin.

Komut satırından (şablonlar kurulduktan sonra):

```bash
# Windows
godot --headless --path godot-project --export-release "Windows Desktop" build/HarfYilani.exe

# Web (HTML5)
godot --headless --path godot-project --export-release "Web" build/web/index.html
```

> Not: `--export-release` için `export_presets.cfg` içinde ilgili preset tanımlı
> olmalıdır. Preset'leri editörden bir kez eklemeniz yeterlidir.
> Web export'u için sunucunuzda `Cross-Origin-Opener-Policy: same-origin` ve
> `Cross-Origin-Embedder-Policy: require-corp` başlıkları gerekir.

## 🛠️ İleride Eklenebilecekler

Godot tarafında **hâlihazırda mevcut**: prosedürel ses (11 efekt), boost izi,
yılan baş detayları (göz, göz bebeği, yön oku), combo flash, achievement bildirimi,
süre çubuğu ve varlık sayaçları (engel/bonus/buz/boost).

Henüz yok:

- Konfeti efekti (kelime tamamlandığında particle burst).
- Yılan ölüm parçalanma efekti.
- Kelime tamamlama harf-by-harf animasyonu.
- Pause menüsü istatistik özeti paneli (şu an yalnızca "DURAKLATILDI" mesajı).
- Achievement detay modalı (tıklanınca açılma tarihi + büyük ikon).
- Menüde skin / kategori seçimi ve TR→EN / kolay mod / günlük challenge butonları.
- Ayarlar paneli (istatistik / başarım / liderlik / kategori / haftalık sekmeleri).
- Yılanın çatal dili (göz ve yön oku var, dil yok).
