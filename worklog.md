# Harf Yılanı — Proje Worklog

Bu dosya, "Harf Yılanı" (Letter Snake) oyununun geliştirme kayıtlarını içerir.
Sonraki geliştirme turları bu dosyayı okuyarak devam etmeli.

---
Task ID: 1-6 (Web sürümü + doğrulama)
Agent: Ana geliştirici (Z.ai Code)
Task: Godot 4 "Harf Yılanı" oyunu — oynanabilir Next.js web sürümü + Godot 4 kaynak kodu

Work Log:
- Oyun çekirdeği (framework bağımsız saf TS): `src/lib/game/constants.ts`, `types.ts`, `wordDatabase.ts` (Türkçe alfabe, 3/4/5/6 harfli kelimeler), `difficulty.ts` (6 kademeli zorluk), `snakeEngine.ts` (yılan hareketi + çarpışma + doğru/yanlış harf kontrolü + order_index ile duplicate harf sırası).
- React katmanı: `useSnakeGame.ts` (GameManager görevi — oyun döngüsü rAF + accumulator, durum geçişleri, klavye girdisi, publish imza karşılaştırması ile gereksiz render önlenir).
- Canvas: `GameCanvas.tsx` — yüksek DPI, responsive, ızgara, yılan (gradient + gözler + ölüm/kutlama efektleri), harf diskleri (altın halka ile sıradaki hedef vurgusu).
- UI: `HUD.tsx` (Bölüm + zorluk + hız + skor + can + combo + hedef kelime gösterimi), `Overlays.tsx` (menü / game over / level complete / wrong letter / pause — framer-motion animasyonlu), `FloatingFeedback.tsx` (anlık combo/skor bildirimi), `TouchControls.tsx` (mobil D-pad).
- `page.tsx`: sticky header + HUD + oyun alanı + overlay + sticky footer. Koyu tema (slate + emerald + amber — indigo/mavi kullanılmadı).
- Godot 4 projesi `godot-project/`: `project.godot` (autoload GameManager + input map), `scripts/` (7 ayrı script: constants, word_manager, difficulty_manager, snake, letter, game_manager, ui_manager, main), `scenes/Main.tscn` + `scenes/Letter.tscn`, `icon.svg`, `README.md`.
- Lint: ESLint temiz (React 19 kurallarına uyum — useState immutability, refs-during-render, setState-in-effect).
- Doğrulama (agent-browser + VLM + deterministik engine testi):
  - Menü renders correctly (başlık, talimatlar, Oyna butonu).
  - Oyun başlayınca yılan + harfler + hedef kelime + sıradaki harf vurgusu doğru.
  - Türkçe karakterler (Ç, Ğ, İ, Ö, Ş, Ü) düzgün render.
  - **Doğru harf yeme**: idx 0→1, skor +10, yılan uzadı, combo +1. ✓
  - **Combo bonus**: ×1 → +10, ×2 → +15, ×3 → +20 (her ekstra doğru harf COMBO_BONUS kadar bonus). ✓
  - **Kelime tamamlama**: +50 bonus, status=level_complete, "Kelime Tamamlandı!" overlay (başlık + kelime + bonus + Sonraki Bölüm butonu). ✓
  - **KRİTİK duplicate harf testi** ("ADA"): A(orderIndex 2)'yi sıra D'deyken yeme → YANLIŞ, lives 3→2, combo sıfırlandı, lastEvent={ate_wrong, char:"A", expected:"D"}, harf yenmedi. ✓
  - **Duvar çarpışması** → can kaybı → otomatik tekrar → 3 can bitince game over. ✓
  - Publish fix: `publish()` artık her karede imza değiştiyse çağrılıyor (status değişiminde overlay garanti).

Stage Summary:
- Web sürümü tamamen oynanabilir ve doğrulandı. / route'unda çalışır.
- Godot 4 kaynak kodu `godot-project/` içinde, README ile birlikte. Godot editöründe açılıp çalıştırılabilir.
- Temiz mimari: her scriptin/modülün tek sorumluluğu var. Kelime havuzu, zorluk ve hız sabitleri tek yerden değiştirilebilir.
- Dev test kancası: `window.__harfYilani` (yalnız dev modunda) — motor durumunu konsoldan okumaya izin verir.

Unresolved issues / risks:
- Letter.tscn içindeki AnimationPlayer `pulse`/`vanish` animasyonları editörden elle eklenmeli (sahne iskeleti hazır, animasyon kaynakları placeholder). Godot editöründe açınca animasyonları oluşturmak gerekir.
- Godot sahnelerini burada (headless ortamda) çalıştırıp doğrulayamıyoruz; web sürümü doğrulandı. Godot tarafı kod olarak doğru GDScript 2.0 syntax'ı ile yazıldı.
- Web sürümünde skor/ilerleme kalıcı değil (localStorage yok) — ileride eklenebilir.

Sonraki adım önerileri (ileride eklenebilecekler):
- Ses efektleri (doğru harf, yanlış harf, kelime tamamlama) + kelime tamamlandığında sesli okuma (TTS skill).
- localStorage ile skor/bölüm kaydetme + liderlik tablosu.
- Süreli bölümler, engeller, bonus harfler, buz/fren alanları, hız artırıcılar.
- TR→EN modu, kategori seçimi, çocuklar için kolay mod.
- Kelime tamamlandığında kısa confetti / particle efekti.
- Mobil için swipe (kaydırma) girişi (şu an D-pad var).

---
Task ID: 7 (Cron turu 1 — Ses + localStorage + Konfeti + Swipe + Styling polish)
Agent: webDevReview cron (Z.ai Code)
Task: Oyunu QA et, bugları fixle, yeni özellikler ekle (ses, kalıcılık, konfeti, swipe, styling polish)

Work Log:
- **Ses sistemi** (`src/lib/game/sound.ts`): Web Audio API ile sentezlenen SFX — asset dosyası yok, çevrimdışı çalışır, <1KB. 7 efekt: correct (660→880Hz), wrong (220→165Hz sawtooth), word_complete (C-E-G-C zafer akoru), level_up, game_over (392→311→247Hz düşüş), menu_click, start. ADSR envelope ile click önlenir. İlk kullanıcı etkileşiminde AudioContext resume (autoplay policy). Header'da Volume2/VolumeX toggle butonu.
- **localStorage kalıcılık** (`src/lib/game/storage.ts`): `harf-yilani-stats-v1` key. bestScore, bestLevel, totalGames, totalWordsCompleted, soundEnabled. SSR-safe. Game over'da `recordGameEnd`, kelime tamamlandığında anlık bestScore/bestLevel/totalWordsCompleted güncelleme (oyuncu oyundan çıksa bile rekoru korunur). Ayarlar dialog'undan sıfırlama.
- **Konfeti efekti** (`ConfettiBurst.tsx`): Kelime tamamlandığında 110 parçalı renkli patlama (rect + circle shapes, 7 renk, yerçekimi, rotasyon, fade-out). Parent `key={trigger}` ile her patlama için fresh child instance remount — "setState in effect" lint hatası temiz şekilde önlenir. AnimatePresence ile mount/unmount fade.
- **Mobil swipe** (`useSwipe.ts`): Dokunmatik kaydırma ile yön kontrolü (24px eşik). D-pad'e ek olarak. Oyun alanına `ref` ile bağlanır, `touchmove` preventDefault ile sayfa kaymasını önler.
- **Ayarlar paneli** (`SettingsDialog.tsx`): shadcn Dialog + Switch. Ses aç/kapa + 4 istatistik kartı (en iyi skor, en ileri bölüm, tamamlanan kelime, toplam oyun) + sıfırla (iki adımlı onay).
- **Styling polish**:
  - Animated gradient mesh arka plan (3 blob, 12s ease-in-out infinite, `@keyframes blob` globals.css'te).
  - Subtle ızgara overlay (32px, 2.5% opacity).
  - Logo pulse: emerald gradient + amber ping dot.
  - Button hover scale-[1.02] + active:scale-[0.98] + shadow-glow.
  - HUD'da **kelime ilerleme çubuğu** (emerald gradient, spring animation, yüzde gösterimi).
  - Skor pill'de "REKOR!" badge (skor ≥ bestScore ise amber glow).
  - Can heart'lar drop-shadow glow + scale pulse.
  - Bölüm badge spring animate on level change.
  - prefers-reduced-motion desteği (animasyonları devre dışı bırak).
  - Özel ince scrollbar styling.
- **Overlays geliştirmeleri**: Menüde en iyi skor rozeti + combo talimatı. Game Over'da "YENİ REKOR!" badge + highlight stat card. Spring animasyonlar (scale + rotate) ikonlara.
- **Lint fixes**: React 19 kuralları — `statsRef.current = stats` render-dışı useEffect'e taşındı, `soundEnabledRef` aynı şekilde, `useSwipe` `dirRef` useEffect'e, `ConfettiBurst` tamamen refactor edildi (parent/child key pattern, senkron setState yok).

QA Doğrulama (agent-browser + VLM + deterministik engine test):
- Menü: 8/10 polish (VLM) — animated blob arka plan ✓, logo pulse ✓, en iyi skor rozeti ✓, ses + ayarlar butonları ✓.
- Gameplay: ADA kelimesi tamamlandı → status=level_complete, score=95, "Kelime Tamamlandı!" overlay + **konfeti patlaması aynı anda** ✓ (VLM doğruladı: "vibrant burst of colorful particles... pink, yellow, blue, purple, green").
- Ses: correct letter yendi → rAF loop event tespit etti → `playSfx("correct")` → AudioContext created + state="running" ✓.
- localStorage: game over sonrası `{bestScore:95, bestLevel:2, totalGames:1, totalWordsCompleted:1, soundEnabled:true}` ✓. Kelime tamamlandığında anlık bestScore güncelleme ✓.
- Ses toggle: buton tıklandı → soundEnabled: false → localStorage'a yazıldı ✓.
- Ayarlar dialog: 4 stat kartı + ses switch + sıfırla butonu (iki adımlı onay) ✓.
- Mobil (iPhone 14 viewport): tam responsive, overflow yok, D-pad oyun sırasında görünür ✓.
- Lint: ESLint temiz (0 error, 0 warning).
- Dev server: 3000 portunda çalışıyor, derleme hatasız.

Stage Summary:
- Oyun artık sesli, kalıcı istatistikli, konfetili, mobil swipe destekli, polished UI'lı tam bir deneyim.
- Tüm yeni özellikler mevcut temiz mimariye entegre edildi (SoundManager, StorageManager ayrı modüller).
- localStorage kalıcılık hem game_over'da hem kelime tamamlandığında anlık çalışır.
- Cron turu sonrası oyun tamamen oynanabilir ve doğrulanmış durumda.

Unresolved issues / risks:
- Godot projesine ses/konfeti/localStorage eklenmedi (yalnızca web sürümü güncellendi). Godot tarafı README'de belirtilen animasyon eksikleri hâlâ var.
- Liderlik tablosu (sadece本地 best score var, global yok — çevrimdışı oyun olduğu için yeterli).
- Ses efektleri basit sentez tonları; istenirse gerçek ses dosyalarıyla değiştirilebilir.
- Süreli bölümler, engeller, bonus harfler, buz/fren alanları, hız artırıcılar hâlâ eklenmedi (ileriki turlar için).

Sonraki tur için öneriler:
1. Süreli bölüm modu (her bölümde geri sayım, süre dolunca can kaybı).
2. Engeller (duvar/blok objeleri oyun alanında, yılan çarpınca ölür).
3. Bonus harfler (altın yıldızlı, +25 puan, sıra dışı harf).
4. TR→EN modu (kelime tamamlandığında İngilizce çevirisi göster).
5. Godot projesini de güncelle (ses + konfeti + localStorage).
6. Liderlik tablosu (haftalık/günlük, localStorage tabanlı sıralama).
7. Kategori seçimi (hayvanlar, yiyecekler, eşyalar vb. kelime kategorileri).

