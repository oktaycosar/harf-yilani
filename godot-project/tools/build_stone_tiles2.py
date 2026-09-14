# ============================================================================
# build_stone_tiles.py — Kit #8'den tas duvar / tehlike doseme sprite'lari
# ----------------------------------------------------------------------------
# Kaynak: snake_gorseller/ChatGPT Image 14 Eyl 2026 19_13_53.png (saydam zemin)
# Cikti : godot-project/assets/ui/obstacle_stone.png  (34x34, engel duvari)
#         godot-project/assets/ui/obstacle_spike.png  (34x34, kirmizi X)
#         _tools/_stone_probe.png                     (6x dogrulama zoomu)
#
# Kit'teki tas blogu: 2 KOLON x 4 SIRA, tugla ~31x19 px (yatay dikdortgen).
# 34x34 kareye en az bozulmayla oturmasi icin blogun UST 3 SIRASI alinir:
#   kaynak 66x58 -> 34x30 (kx 0.515 / ky 0.517, neredeyse TEK olcek) -> 34x34 tuvale ortalanir.
#
# Kullanim: python build_stone_tiles.py
# ============================================================================
import os

from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "snake_gorseller", "ChatGPT Image 14 Eyl 2026 19_13_53.png")
OUT = os.path.join(ROOT, "yilan_oyunu", "godot-project", "assets", "ui")
PROBE = os.path.join(ROOT, "_tools", "_stone_probe.png")

CELL = 34
ALPHA_MIN = 200          # "dolu tas" esigi (yumusak golgeyi disarida birakir)
STONE_GAIN = 1.18        # tas lacivert zeminde kaybolmasin diye hafif parlaklik

STONE_WIN = (305, 898, 400, 1008)
SPIKE_WIN = (1140, 510, 1235, 600)      # kirmizi X karosu (DANGER)
BONUS_WIN = (923, 510, 1020, 600)       # mavi + altin yildiz karosu (BONUS)


def solid_runs(im, win, axis):
    """Pencere icinde ALPHA_MIN ustu piksel sayisinin en uzun seri araligini bulur."""
    crop = im.crop(win)
    a = crop.getchannel("A")
    w, h = crop.size
    if axis == "y":
        counts = [sum(1 for x in range(w) if a.getpixel((x, y)) >= ALPHA_MIN) for y in range(h)]
    else:
        counts = [sum(1 for y in range(h) if a.getpixel((x, y)) >= ALPHA_MIN) for x in range(w)]
    limit = 0.75 * max(counts)
    best = (0, -1)
    start = None
    for i, c in enumerate(counts):
        if c >= limit:
            if start is None:
                start = i
        else:
            if start is not None:
                if i - 1 - start > best[1] - best[0]:
                    best = (start, i - 1)
                start = None
    if start is not None and (len(counts) - 1 - start) > (best[1] - best[0]):
        best = (start, len(counts) - 1)
    off = win[1] if axis == "y" else win[0]
    return off + best[0], off + best[1]


def to_cell(img, cell=CELL, keep_ratio=True, gain=1.0):
    """Sprite'i hucreye sigdirir (keep_ratio=False ise tam doldurur) ve ortalar."""
    if keep_ratio:
        k = min(cell / img.size[0], cell / img.size[1])
        tw, th = max(1, round(img.size[0] * k)), max(1, round(img.size[1] * k))
    else:
        tw = th = cell
    small = img.resize((tw, th), Image.LANCZOS)
    if gain != 1.0:
        a = small.getchannel("A")
        rgb = ImageEnhance.Brightness(small.convert("RGB")).enhance(gain)
        small = rgb.convert("RGBA")
        small.putalpha(a)
    a = small.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    small.putalpha(a)
    tile = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    tile.paste(small, ((cell - tw) // 2, (cell - th) // 2))
    return tile


def crop_content(im, win):
    """Pencere icindeki gercek icerigi alfa ile kirpar."""
    c = im.crop(win)
    a = c.getchannel("A").point(lambda v: 255 if v >= 16 else 0)
    box = a.getbbox()
    if box is None:
        raise SystemExit("bos pencere: %s" % (win,))
    return c.crop(box)


def main() -> None:
    sheet = Image.open(SHEET).convert("RGBA")

    y0, y1 = solid_runs(sheet, STONE_WIN, "y")
    x0, x1 = solid_runs(sheet, STONE_WIN, "x")
    print("tas blogu: x %d..%d  y %d..%d  (%dx%d)" % (x0, x1, y0, y1, x1 - x0 + 1, y1 - y0 + 1))

    # 4 sira var -> ust 3 sirayi al (en az bozulma icin)
    rows = 4
    rh = (y1 - y0 + 1) / rows
    y_top3 = y0 + round(rh * 3) - 1
    block = sheet.crop((x0, y0, x1 + 1, y_top3 + 1))
    print("kullanilan blok: %dx%d (ust 3 sira)" % block.size)

    tile = to_cell(block, keep_ratio=False, gain=STONE_GAIN)
    tile.save(os.path.join(OUT, "obstacle_stone.png"))
    print("obstacle_stone.png", tile.size)

    spike = crop_content(sheet, SPIKE_WIN)
    st = to_cell(spike)
    st.save(os.path.join(OUT, "obstacle_spike.png"))
    print("obstacle_spike.png", st.size, "(kaynak %dx%d)" % spike.size)

    # Bonus artik kit'in MAVI + ALTIN YILDIZ karosu (tek sprite, ayri ikon gerekmez)
    bonus = crop_content(sheet, BONUS_WIN)
    bt = to_cell(bonus)
    bt.save(os.path.join(OUT, "tile_bonus.png"))
    print("tile_bonus.png", bt.size, "(kaynak %dx%d)" % bonus.size)

    # ---- 6x dogrulama zoomu ----
    z = 6
    tiles3 = [tile, st, bt]
    mont = Image.new("RGBA", (3 * CELL * z + 80, CELL * z + 40), (19, 26, 43, 255))
    for i, t in enumerate(tiles3):
        big = t.resize((CELL * z, CELL * z), Image.NEAREST)
        mont.paste(big, (20 + i * (CELL * z + 20), 20), big)
    mont.save(PROBE)
    print("zoom:", PROBE)


if __name__ == "__main__":
    main()
