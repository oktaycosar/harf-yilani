# ============================================================================
# build_menu_decor.py — Menu dekoru: mezuniyet kepli baykus + kitap yigini
# ----------------------------------------------------------------------------
# Kaynak: snake_gorseller/ChatGPT Image 14 Eyl 2026 19_13_53.png (saydam zemin)
# Cikti : godot-project/assets/ui/decor_owl.png
#         godot-project/assets/ui/decor_books.png
#
# Kullanim: python build_menu_decor.py
# ============================================================================
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "snake_gorseller", "ChatGPT Image 14 Eyl 2026 19_13_53.png")
OUT = os.path.join(ROOT, "yilan_oyunu", "godot-project", "assets", "ui")

ALPHA_MIN = 16

# (isim, arama penceresi (x0,y0,x1,y1), hedef yukseklik)
JOBS = [
    ("decor_owl.png", (1112, 668, 1278, 794), 100),
    ("decor_books.png", (1124, 795, 1292, 906), 78),
]


def alpha_bbox(im: Image.Image, win) -> Image.Image:
    """Pencere icindeki gercek alfa sinirlarina gore kirpar."""
    crop = im.crop(win)
    a = crop.getchannel("A").point(lambda v: 255 if v >= ALPHA_MIN else 0)
    box = a.getbbox()
    if box is None:
        raise SystemExit("bos pencere: %s" % (win,))
    return crop.crop(box)


def main() -> None:
    sheet = Image.open(SHEET).convert("RGBA")
    for name, win, target_h in JOBS:
        sp = alpha_bbox(sheet, win)
        bw, bh = sp.size
        tw = max(1, round(bw * (target_h / bh)))
        small = sp.resize((tw, target_h), Image.LANCZOS)
        a = small.getchannel("A").point(lambda v: 255 if v > 110 else 0)
        small.putalpha(a)
        path = os.path.join(OUT, name)
        small.save(path)
        print("%-16s kaynak %dx%d -> %s  %d bayt" % (name, bw, bh, small.size, os.path.getsize(path)))


if __name__ == "__main__":
    main()
