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
