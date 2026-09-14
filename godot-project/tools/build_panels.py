# ============================================================================
# build_panels.py — Kit #8'in HUD panellerini temizleyip oyuna hazir hale getirir
# ----------------------------------------------------------------------------
# Kaynak: snake_gorseller/ChatGPT Image 14 Eyl 2026 19_13_53.png (saydam zemin)
# Cikti : assets/ui/panel_plank.png       (ahsap tabela; "Bolum 1"/"Skor" yazilari SILINDI)
#         assets/ui/panel_stone_word.png  (tas cerceveli koyu panel; harfler SILINDI)
#         _tools/_panels_preview.png      (2x dogrulama)
#
# Yontem: panelin ic bolgesindeki PARLAK pikseller = yazi. Her satir icin
# yazi olmayan koyu piksellerin medyani alinir ve yazi pikselleri onunla
# boyanir -> dikey gradyan korunur, leke olusmaz.
#
# Kullanim: python build_panels.py
# ============================================================================
import os
import statistics

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "snake_gorseller", "ChatGPT Image 14 Eyl 2026 19_13_53.png")
OUT = os.path.join(ROOT, "yilan_oyunu", "godot-project", "assets", "ui")
PREV = os.path.join(ROOT, "_tools", "_panels_preview.png")

# (isim, panel dikdortgeni (x0,y0,x1,y1), ic bolge, parlaklik esigi)
JOBS = [
    ("panel_plank.png", (34, 679, 437, 748), (66, 692, 406, 740), 115),
    ("panel_stone_word.png", (465, 650, 766, 771), (480, 662, 752, 759), 62),
]


def luminance(px):
    r, g, b = px[0], px[1], px[2]
    return (r * 299 + g * 587 + b * 114) // 1000


def clean_text(panel, inner, limit):
    """inner dikdortgenindeki parlak (yazi) pikselleri satir medyaniyla boyar."""
    x0, y0, x1, y1 = inner
    px = panel.load()
    w, h = panel.size
    x0 = max(0, x0)
    y0 = max(0, y0)
    x1 = min(w, x1)
    y1 = min(h, y1)

    # Yazi alanini (parlak piksellerin bbox'i) bul
    tx0, ty0, tx1, ty1 = 1 << 30, 1 << 30, -1, -1
    for y in range(y0, y1):
        for x in range(x0, x1):
            if luminance(px[x, y]) >= limit:
                tx0 = min(tx0, x)
                ty0 = min(ty0, y)
                tx1 = max(tx1, x)
                ty1 = max(ty1, y)
    if tx1 < 0:
        return None
    # Kontur da gitsin diye alani 3px genislet
    tx0 = max(x0, tx0 - 3)
    ty0 = max(y0, ty0 - 3)
    tx1 = min(x1 - 1, tx1 + 3)
    ty1 = min(y1 - 1, ty1 + 3)
    print("   yazi alani: x %d..%d  y %d..%d (%dx%d)" % (tx0, tx1, ty0, ty1, tx1 - tx0 + 1, ty1 - ty0 + 1))

    # Her satirin medyanini YAZI BLOGUNUN DISINDAKI kolonlardan al
    # (yazi satirin buyuk kismini kapliyorsa medyan yaniltir -> acik cizgiler).
    row_col = {}
    for y in range(y0, y1):
        samples = [px[x, y] for x in list(range(x0, tx0)) + list(range(tx1 + 1, x1))]
        if len(samples) >= 10:
            row_col[y] = (int(statistics.median(p[0] for p in samples)),
                          int(statistics.median(p[1] for p in samples)),
                          int(statistics.median(p[2] for p in samples)),
                          int(statistics.median(p[3] for p in samples)))
    if not row_col:
        # Yazi blogu ic bolgenin TAMAMINI kapliyorsa disarida ornek yok:
        # o zaman satirin tamaminin medyanini kullan (yazi ince, medyan = zemin).
        for y in range(y0, y1):
            samples = [px[x, y] for x in range(x0, x1)]
            row_col[y] = (int(statistics.median(p[0] for p in samples)),
                          int(statistics.median(p[1] for p in samples)),
                          int(statistics.median(p[2] for p in samples)),
                          int(statistics.median(p[3] for p in samples)))

    def color_for(y):
        if y in row_col:
            return row_col[y]
        for d in range(1, y1 - y0 + 1):     # en yakin bilinen satiri kullan
            if y - d in row_col:
                return row_col[y - d]
            if y + d in row_col:
                return row_col[y + d]
        return next(iter(row_col.values()))

    for y in range(ty0, ty1 + 1):
        mr, mg, mb, ma = color_for(y)
        for x in range(tx0, tx1 + 1):
            px[x, y] = (mr, mg, mb, ma)
    return (tx0, ty0, tx1, ty1)


def strip_green(img):
    """Yesil (yaprak) pikselleri ayni satirdaki en yakin yesil olmayan komsuyla boyar.

    Tas cerceve icin: cerceve duz oldugu icin yaprak izi kalmaz.
    """
    px = img.load()
    w, h = img.size

    def is_green(p):
        # Yaprak hem yesil hem koyu TEAL (yesil≈mavi) olabiliyor.
        # Tas cerceve mavi-gri (mavi > yesil) ve ic bolge koyu lacivert -> yakalanmaz.
        return p[1] > p[0] + 8 and p[1] >= p[2] - 4 and p[1] > 25

    changed = 0
    for y in range(h):
        for x in range(w):
            if not is_green(px[x, y]):
                continue
            src = None
            for d in range(1, w):
                if x - d >= 0 and not is_green(px[x - d, y]):
                    src = px[x - d, y]
                    break
                if x + d < w and not is_green(px[x + d, y]):
                    src = px[x + d, y]
                    break
            if src is not None:
                px[x, y] = src
                changed += 1
    return changed


def main() -> None:
    sheet = Image.open(SHEET).convert("RGBA")
    tiles = []
    for name, rect, inner, limit in JOBS:
        panel = sheet.crop(rect).copy()
        print("%s %s" % (name, panel.size))
        # ic bolge koordinatlari panel-gorelidir
        rel = (inner[0] - rect[0], inner[1] - rect[1], inner[2] - rect[0], inner[3] - rect[1])
        bbox = clean_text(panel, rel, limit)
        if name.startswith("panel_stone"):
            n = strip_green(panel)
            print("   yaprak temizlendi: %d piksel" % n)
        path = os.path.join(OUT, name)
        panel.save(path)
        print("   kaydedildi %s (%d bayt)" % (path, os.path.getsize(path)))
        tiles.append(panel)

    z = 2
    W = max(t.size[0] for t in tiles) * z + 40
    H = sum(t.size[1] for t in tiles) * z + 60
    m = Image.new("RGBA", (W, H), (19, 26, 43, 255))
    y = 20
    for t in tiles:
        big = t.resize((t.size[0] * z, t.size[1] * z), Image.NEAREST)
        m.paste(big, (20, y), big)
        y += big.size[1] + 20
    m.save(PREV)
    print("onizleme:", PREV)


if __name__ == "__main__":
    main()
