# ============================================================================
# build_night_assets.py — Gece gökyüzü arka planı + dünya küresi
# ----------------------------------------------------------------------------
# Girdi : snake_gorseller/ChatGPT Image 14 Eyl 2026 19_15_39.png  (gökyüzü)
#         snake_gorseller/ChatGPT Image 14 Eyl 2026 19_17_27.png  (küre, magenta)
# Çıktı : godot-project/assets/ui/bg_sky.png      960x760  (tam ekran arka plan)
#         godot-project/assets/ui/globe_hud.png    ~40x52  (HUD paneli dekoru)
#         godot-project/assets/ui/globe_menu.png   ~150x199 (menü dekoru)
#
# Kullanım: python build_night_assets.py
# ============================================================================
from PIL import Image, ImageFilter

import os

import _paths                                     # ortak yol çözümleyici
OUT = _paths.UI_OUT

SKY_SRC = _paths.sheet("ChatGPT Image 14 Eyl 2026 19_15_39.png")
GLOBE_SRC = _paths.sheet("ChatGPT Image 14 Eyl 2026 19_17_27.png")

SKY_W, SKY_H = 960, 760            # oyun viewport'u

# NOT: Gökyüzüne ay/baykuş EKLENMEDİ. HUD panelleri ekranın üstündeki y 0..104
# şeridini tamamen kaplıyor, gökyüzü oyun içinde GÖRÜNMÜYOR (sadece yanlarda
# ~10 px şerit kalıyor). Oraya çizilen her şey ölü içerik olur.


def build_sky() -> None:
    im = Image.open(SKY_SRC).convert("RGB")
    # En-boy oranı neredeyse birebir (1409x1116 -> 1.2625, 960x760 -> 1.2632)
    im = im.resize((SKY_W, SKY_H), Image.LANCZOS)
    path = os.path.join(OUT, "bg_sky.png")
    im.save(path)
    print("bg_sky.png     ", im.size, os.path.getsize(path), "bayt")


def _magenta_mask(im: Image.Image) -> Image.Image:
    """Magenta zemini (r,yuksek g,dusuk b,yuksek) bulan ikili maske uretir."""
    px = im.load()
    w, h = im.size
    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r > 140 and b > 140 and g < 120 and abs(r - b) < 90:
                mp[x, y] = 0
    return mask


def build_globe() -> None:
    im = Image.open(GLOBE_SRC).convert("RGB")
    mask = _magenta_mask(im)

    # Kenar saçaklarını (magenta ile karışmış yarım pikseller) 2px tıraşla
    mask = mask.filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.MinFilter(3))

    rgba = im.convert("RGBA")
    rgba.putalpha(mask)

    bbox = mask.getbbox()
    if bbox is None:
        raise SystemExit("kure: maske bos cikti")
    rgba = rgba.crop(bbox)
    bw, bh = rgba.size
    print("kure kaynak (magenta temizlenmis):", rgba.size, "oran=%.3f" % (bw / bh))

    for name, target_h in (("globe_hud.png", 52), ("globe_menu.png", 196)):
        tw = max(1, round(bw * (target_h / bh)))
        small = rgba.resize((tw, target_h), Image.LANCZOS)
        # Yumusak hale yerine sert pixel-art kenari
        a = small.getchannel("A").point(lambda v: 255 if v > 110 else 0)
        small.putalpha(a)
        path = os.path.join(OUT, name)
        small.save(path)
        print("%-14s %s %d bayt" % (name, small.size, os.path.getsize(path)))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_sky()
    build_globe()
