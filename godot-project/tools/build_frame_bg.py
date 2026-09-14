# ============================================================================
# build_frame_bg.py — Oyun ekrani cercevesi + dekor (tek 960x760 arka plan)
# ----------------------------------------------------------------------------
# Girdi : _tools/_frame_parts/*.png  (slice_sheet_magenta.py ciktilari)
# Cikti : godot-project/assets/ui/frame_bg.png  (960x760 RGBA)
#         _tools/_frame_preview.png             (dogrulama: cerceve + tahta)
#
# Yerlesim (viewport 960x760):
#   Cerceve dis dikdortgen : x 8..952 , y 64..756
#   Tahta (oyun alani)     : x 48..912, y 104..716   -> GRID 24x17 @ CELL 36
#   Bant kalinligi         : 40 px
# ============================================================================
import os

from PIL import Image, ImageOps

import _paths                                     # ortak yol çözümleyici
PARTS = os.path.join(_paths.SCRIPT_DIR, "_frame_parts")
OUT = _paths.UI_OUT
PREV = os.path.join(_paths.SCRIPT_DIR, "_frame_preview.png")

W, H = 960, 760
FX0, FY0, FX1, FY1 = 8, 64, 952, 756       # cerceve dis kenar
BX0, BY0, BX1, BY1 = 48, 104, 912, 716     # tahta (ic) kenar
BAND = BX0 - FX0                            # 40
FLOOR = (10, 24, 48)                        # mockup'tan olculen lacivert
FLOOR_ALPHA = 214                           # ~0.84 -> arkadaki yildizlar silik gecer

# parca dosyalari (slice cikti adlari)
P = {
    "corner_tl": "06_141x125_at_59_395.png",
    "band_top": "07_359x55_at_246_395.png",
    "corner_tr": "08_142x130_at_658_387.png",
    "lantern": "09_100x210_at_883_405.png",
    "ivy": "10_188x236_at_1027_429.png",
    "band_left": "11_76x221_at_67_536.png",
    "band_right": "12_78x222_at_723_536.png",
    "books": "13_173x128_at_1234_485.png",
    "banner": "14_156x245_at_917_649.png",
    "corner_bl": "15_143x110_at_55_779.png",
    "corner_br": "16_141x121_at_654_769.png",
    "band_small": "17_184x99_at_1147_735.png",
    "band_bottom": "18_371x55_at_239_819.png",
    "nameplate": "19_635x133_at_404_926.png",
}


def load(name: str) -> Image.Image:
    im = Image.open(os.path.join(PARTS, P[name])).convert("RGBA")
    a = im.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    im.putalpha(a)
    return im


def scaled(im: Image.Image, h: int = None, w: int = None, size=None) -> Image.Image:
    """Oranli (veya verilen olcuye) olcekle. BOX = halkasiz, pixel-art dostu."""
    if size is not None:
        im2 = im.resize(size, Image.BOX)
    else:
        sw, sh = im.size
        k = (h / sh) if h else (w / sw)
        im2 = im.resize((max(1, round(sw * k)), max(1, round(sh * k))), Image.BOX)
    a = im2.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    im2.putalpha(a)
    return im2


def tile_h(dst: Image.Image, tile: Image.Image, x0: int, x1: int, y: int) -> None:
    x = x0
    while x < x1:
        dst.alpha_composite(tile, (x, y))
        x += tile.size[0]


def tile_v(dst: Image.Image, tile: Image.Image, y0: int, y1: int, x: int) -> None:
    y = y0
    while y < y1:
        dst.alpha_composite(tile, (x, y))
        y += tile.size[1]


def build() -> Image.Image:
    cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    band_h = scaled(load("band_top"), h=BAND)
    band_b = scaled(load("band_bottom"), h=BAND)
    band_l = scaled(load("band_left"), w=BAND)
    band_r = scaled(load("band_right"), w=BAND)
    c_tl = scaled(load("corner_tl"), h=int(BAND * 1.45))
    c_tr = scaled(load("corner_tr"), h=int(BAND * 1.45))
    c_bl = scaled(load("corner_bl"), h=int(BAND * 1.45))
    c_br = scaled(load("corner_br"), h=int(BAND * 1.45))

    # --- bantlar (koselerin arasini doldur) ---
    tile_h(cv, band_h, FX0 + 40, FX1 - 40, FY0)
    tile_h(cv, band_b, FX0 + 40, FX1 - 40, FY1 - band_b.size[1])
    tile_v(cv, band_l, FY0 + 40, FY1 - 40, FX0)
    tile_v(cv, band_r, FY0 + 40, FY1 - 40, FX1 - band_r.size[0])

    # --- koseler ---
    cv.alpha_composite(c_tl, (FX0, FY0))
    cv.alpha_composite(c_tr, (FX1 - c_tr.size[0], FY0))
    cv.alpha_composite(c_bl, (FX0, FY1 - c_bl.size[1]))
    cv.alpha_composite(c_br, (FX1 - c_br.size[0], FY1 - c_br.size[1]))

    # --- tahta zemini (duz lacivert; izgara + noktalar kodda cizilir) ---
    floor = Image.new("RGBA", (BX1 - BX0, BY1 - BY0), (*FLOOR, FLOOR_ALPHA))
    cv.alpha_composite(floor, (BX0, BY0))

    # ------------------------------------------------------------------ DEKOR
    lantern = scaled(load("lantern"), h=78)
    lw, lh = lantern.size            # ~37x78
    # 4 fener: cerceve koselerine asili (mockup gibi ustte biraz tasar)
    cv.alpha_composite(lantern, (FX0 + 2, FY0 + 2))
    cv.alpha_composite(lantern, (FX1 - lw - 2, FY0 + 2))
    cv.alpha_composite(lantern, (FX0 + 2, FY1 - lh - 2))
    cv.alpha_composite(lantern, (FX1 - lw - 2, FY1 - lh - 2))

    # Sarmasik: ust banttan sarkar (mockup'ta oldugu gibi tahtanin ustune biner)
    ivy = scaled(load("ivy"), h=64)
    for x in (150, 430, 700):
        cv.alpha_composite(ivy, (x, FY0 - 12))

    # Sancaklar: sol/sag dikey bant uzerinde (bant genisligine gore)
    banner = scaled(load("banner"), w=BAND - 6)
    cv.alpha_composite(banner, (FX0 + 3, 300))
    cv.alpha_composite(ImageOps.mirror(banner), (FX1 - BAND + 3, 300))

    # Kitap yigini: sol alt kose
    books = scaled(load("books"), h=58)
    cv.alpha_composite(books, (FX0 + 4, FY1 - books.size[1] + 4))

    # Isim plakasi (mesaj icin): alt bantin ortasi, yatay hafif gerilmis
    plate = scaled(load("nameplate"), size=(430, 46))
    cv.alpha_composite(plate, ((W - plate.size[0]) // 2, FY1 - 46 + 6))

    return cv


def main() -> None:
    cv = build()
    path = os.path.join(OUT, "frame_bg.png")
    cv.save(path)
    print("frame_bg.png", cv.size, os.path.getsize(path), "bayt")
    # onizleme: koyu zemin uzerine
    prev = Image.new("RGBA", cv.size, (19, 26, 43, 255))
    prev.alpha_composite(cv)
    prev.save(PREV)
    print("onizleme:", PREV)


if __name__ == "__main__":
    main()
