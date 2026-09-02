# Task 13 — Skin Sistemi + Pause Menü + Achievement Detay + Haftalık Stats

Agent: webDevReview cron (Z.ai Code)
Task ID: 13

## Yapılan İşler

### 1. Yılan Skin Seçim Sistemi
- **`src/lib/game/snakeSkins.ts`** (yeni): 5 skin tanımlı — `emerald` (Zümrüt 🐍), `amber` (Ateş 🔥), `sky` (Buz ❄️), `rose` (Gül 🌹), `purple` (Mor 🔮). Her skin: `id`, `name`, `emoji`, `headColor`, `tailColor`, `boostHead`, `boostTail`, `iceHead`, `iceTail`, `pupilColor`. Fonksiyonlar: `loadSkin()`, `saveSkin(id)`, `getSkinById(id)`, `SNAKE_SKINS` array. localStorage anahtarı: `harf-yilani-skin-v1`.
- **`useSnakeGame.ts`**: `skin` state (default `loadSkin()`), `setSkin(id)` callback (localStorage'a kaydeder), `weeklyStats` state. API interface'e eklendi.
- **`GameCanvas.tsx`**: `skin?: SnakeSkin` prop eklendi. `skinRef` ile render döngüsü güncel skin'i görür (useEffect ile senkronize — React 19 refs-during-render kuralına uyum). `drawSnake` artık hardcoded emerald/amber/sky renkleri yerine `skin.headColor/tailColor/boostHead/boostTail/iceHead/iceTail/pupilColor` kullanıyor.
- **`Overlays.tsx` MenuOverlay**: "Yılan Skin" bölümü eklendi — 5 skin kartı grid (emoji + isim + 2 renk önizleme noktası). Aktif skin emerald glow + border ile vurgulanır. `skin` ve `onSetSkin` Props'a eklendi.
- **`page.tsx`**: `GameCanvas`'a `skin={game.skin}` prop'u, `Overlays`'a `skin` + `onSetSkin` prop'ları, `SettingsDialog`'a `weeklyStats` prop'u eklendi.

### 2. Pause Menü "Menüye Dön" Butonu
- **`Overlays.tsx` PauseOverlay**: "Devam Et" butonunun altına ghost variant "Menüye Dön" butonu eklendi (rose/slate renkleri, border-rose-900/40, hover:bg-rose-900/30). `onBackToMenu` prop'unu çağırır.

### 3. Achievement Detay Görünümü
- **`SettingsDialog.tsx`**: `selectedAchievement` state eklendi. Achievement kartları artık `<button>` — tıklayınca `setSelectedAchievement(a)` çağırır. `AchievementDetailModal` bileşeni eklendi:
  - Büyük 4xl ikon (açık: skin rengi, kilitli: Lock ikonu grayscale)
  - Başlık (açık: amber-200, kilitli: slate-300)
  - Açıklama
  - Açıkksa: açılma tarihi (tr-TR, gün+ay+yıl+saat:dakika) + emerald border kart
  - Kilitliyse: "Henüz açılmadı" + slate border kart
  - "Kapat" butonu + X kapat ikonu
  - ESC ile kapatma (useEffect ile keydown listener)
  - Backdrop tıklayınca kapatma, içerik tıklayınca `stopPropagation`

### 4. Haftalık İstatistik Özeti
- **`storage.ts`**: `WeeklyStatEntry` interface (`{ date: string; gamesPlayed: number; score: number }`). `loadWeeklyStats()` (son 7 gün, eksik günler 0), `recordGamePlay(score)` (bugüne oyun sayısı + max skor kaydet, 30 günden eski kayıtları temizle). `WEEKLY_STATS_KEY = "harf-yilani-weekly-stats-v1"`. `resetStats` haftalık stats'ı da temizler.
- **`useSnakeGame.ts`**: Game over'a ilk geçişte `recordGamePlay(s.score)` çağrılır, `weeklyStats` state güncellenir. `resetAllStats` haftalık stats'ı reload eder.
- **`SettingsDialog.tsx`**: 5. sekme "Haftalık" (CalendarClock ikonu) eklendi. `WeeklyTab` bileşeni:
  - 3 özet kart: Toplam Oyun (emerald), En İyi Gün (amber), Hafta Skoru (sky)
  - 7-günlük bar chart: gradient barlar (emerald normal, amber+glow bugün), gün etiketleri (Paz-Cmt) + gün numaraları
  - 0 skorlu günler minimum yükseklik (4%) ile gösterilir
  - Title attribute ile tooltip (tarih + skor + oyun sayısı)
  - Boş hafta için "Bu hafta henüz oyun oynamadın" mesajı

### 5. Styling Polish
- Skin kartları: emoji + 2 renk önizleme noktası + isim; aktif = emerald glow + shadow
- Achievement detay modalı: amber gradient arka plan (açık), kilitli için slate, büyük ikon + check badge
- Haftalık bar chart: emerald→emerald-400 gradient (normal), amber-600→amber-300 + glow (bugün)
- Pause menü "Menüye Dön": rose/slate ghost buton

## Lint & Dev Server
- `bun run lint`: ESLint temiz (0 error, 0 warning). React 19 `refs-during-render` kuralı `useEffect` ile çözüldü (skinRef senkronizasyonu).
- `dev.log`: 3000 portunda çalışıyor, `GET / 200` cevapları sağlıklı. (Geliştirme sırasında bir ara 500 runtime error oldu — skin prop'unun ilk geçişinde undefined olmasından; `useEffect` fix'i ile çözüldü.)

## QA Doğrulama (agent-browser + VLM)

1. **Menu skin selector** (VLM): 5 skin kartı (🐍 Zümrüt, 🔥 Ateş, ❄️ Buz, 🌹 Gül, 🔮 Mor) ✓, her kartta emoji + isim + 2 renk önizleme noktası ✓, Zümrüt aktif emerald glow ile vurgulu ✓.
2. **Ateş skin render** (VLM): "yılanın başı amber/turuncu (Ateş skin) renktir" ✓.
3. **Gül skin render** (VLM): "yılanın başı pembe (rose) tonlu (Gül skin)" ✓.
4. **Skin persistence**: localStorage `harf-yilani-skin-v1: "amber"` ✓ (sayfa yenilenince korunuyor).
5. **Pause menü** (VLM): "Devam Et" butonu ✓, "Menüye Dön" butonu ✓ (rose/kırmızı tonlu, emerald değil), 2x2 istatistik grid (Skor/Bölüm/Combo/Kelime) ✓.
6. **Achievement detay modal** (VLM): açık ✓, büyük 🎯 ikon ✓, "İlk Kelime" başlık ✓, açılma tarihi ("1 Eylül 2026 23:34") ✓, "Kapat" butonu ✓.
7. **Haftalık tab** (VLM): 3 özet kart (Toplam Oyun: 3, En İyi Gün: 0, Hafta Skoru: 0) ✓, 7 günlük bar chart ✓, bugünün barı (Sal) amber/altın + glow ✓, diğerleri emerald yeşil ✓, gün etiketleri (Çar/Per/Cum/Cmt/Paz/Pzt/Sal) + gün numaraları (26-31, 1) ✓.
8. **localStorage weekly**: `harf-yilani-weekly-stats-v1: {"2026-09-01":{"gamesPlayed":3,"score":0}}` ✓ (3 game over olayı kaydedildi).

## Stage Summary
- Oyun artık 5 farklı yılan skin'i (her biri boost/buz/normal durumları için ayrı renk paleti), gelişmiş pause menüsü (Menüye Dön), tıklanabilir achievement kartları + detay modalı (açılma tarihi dahil) ve haftalık istatistik grafik sekmesi içeren tam özellikli bir deneyim.
- Skin seçimi localStorage'a kaydedilir, sayfa yenilenince korunur.
- Haftalık istatistik her game over'da otomatik kaydedilir (oyun sayısı + en iyi skor).

## Unresolved Issues / Risks
- Godot projesi güncellenmedi (yalnızca web sürümü).
- Skin seçimi yalnızca menüden — oyun sırasında değiştirilemez (tasarım kararı).
- Haftalık istatistik yalnızca game over'da kaydedilir — pause→Menüye Dön ile çıkarsa kaydedilmez.
- `dailyWord` değişkeni MenuOverlay'de unused (önceden de öyle, lint geçiyor).

## Sonraki Tur İçin Öneriler
1. Godot projesini güncelle (skin sistemi, achievement detay, haftalık stats, pause menü).
2. Skin preview'ı menüde küçük animasyonlu yılan gösterebilir.
3. Haftalık stats'a "günün en iyi kategorisi" eklenebilir.
4. Achievement detay modalında " paylaş" butonu eklenebilir.
5. Skin başına ayrı achievement'lar eklenebilir (her skinle 10 kelime tamamla vb.).
6. Haftalık hedef sistemi (haftada 5 oyun oyna → bonus) eklenebilir.
7. Boost/ice durumunda skin renkleri için preview eklenebilir (skin seçicide hover).
