# -*- coding: utf-8 -*-
"""SNAKE v2 — "tek parça yılan" ureticisi.

KOK NEDEN (olculdu):
  Su anki atlas'ta her parca AYRI olcekle uretiliyor:
    kafa    = kaynak_yilan_borusu(46-51) -> 30   (k = 0.59-0.65)
    govde   = kaynak_boru(66)             -> 30   (k = 0.4545)
    kose    = kendi kolu(62)              -> 30   (k = 0.48)
    kuyruk  = kendi borusu                -> 30   (k = 0.4545)
  => kontur kalinligi, doku frekansi ve kol kalinligi parca parca FARKLI
  => ek yerlerinde "yaka / basamak / halka" (kullanicinin gordugu sorun)

COZUM:
  TUM govde parcalarini KAFANIN CIKTIGI YILANIN KENDISINDEN, TEK olcekte turet:
   - kaynak: kit'teki tam yilan (saga bakar) -> k = 30/boru  (kafa ile ayni olcek)
   - govde birimi : o yilanin DUZ govdesinden 36px pencere (aynali -> dikişsiz tekrar)
   - kose         : o borusun KESITIyle tarak (sweep) -> 4 kose birebir ayni kalinlik
   - kuyruk        : o yilanin KENDI kuyrugu -> taban kesiti govdeyle ayni
   - kafalar       : MEVCUT atlas'tan AYNEN kopyalanir (dokunulmaz)

Cikti: _tools/_v2_snake.png (oyun dosyasina DOKUNMAZ) + karsilastirmali onizleme
"""
import importlib.util
import os
from PIL import Image

TOOLS = r"C:\Users\OktayC\Desktop\Harness_Genel_26\_tools"
GAME_SNAKE = (r"C:\Users\OktayC\Desktop\Harness_Genel_26\yilan_oyunu"
              r"\godot-project\assets\snake\snake.png")
SRC_KIT = (r"C:\Users\OktayC\Desktop\Harness_Genel_26\snake_gorseller"
           r"\ChatGPT Image 14 Eyl 2026 14_07_08.png")

spec = importlib.util.spec_from_file_location(
    "kit2", os.path.join(TOOLS, "build_snake_kit2.py"))
kit2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kit2)

CELL, GAME, TUBE, MID, HALF = 144, 36, 30, 72, 15
LO = MID - GAME // 2          # 54
HI = LO + GAME                # 90
BAND0 = MID - TUBE // 2       # 57
BAND1 = BAND0 + TUBE          # 87 (dahil degil) -> 57..86


def cell_from(im, cx, cy):
    """im'i (cx,cy) merkezli 36x36 pencereye kirp, 144'luk hucre ortasina koy."""
    out = Image.new("RGBA", (GAME, GAME), (0, 0, 0, 0))
    left, top = int(round(cx)) - GAME // 2, int(round(cy)) - GAME // 2
    out.alpha_composite(im.crop((left, top, left + GAME, top + GAME)))
    c = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    c.alpha_composite(out, ((CELL - GAME) // 2, (CELL - GAME) // 2))
    return c


# ============================================================ KAYNAK YILAN
print("=== 1) KAYNAK: kit'teki TAM YILAN (saga bakan) ===")
kit = kit2.key_magenta(Image.open(SRC_KIT))
best = None
for b in kit2.find_parts(kit, step=2):
    spr = Image.new("RGBA", (b[2] - b[0], b[3] - b[1]), (0, 0, 0, 0))
    spr.alpha_composite(kit.crop(b), (0, 0))
    w, h = spr.size
    if max(w, h) / float(min(w, h)) < 2.2:
        continue
    can, d, ayna = kit2.to_canonical_head_right(spr)
    prof = kit2.cross_profile(can, "x")
    if kit2.is_taper(prof):
        continue
    print("   sekil %s -> kanonik %s (ayna=%s) boyut=%s"
          % (spr.size, d, ayna, can.size))
    if d == "r" and (best is None or can.width > best.width):
        best = can

assert best is not None, "saga bakan tam yilan bulunamadi"
tube_src = kit2.tube_thickness(kit2.cross_profile(best, "x"))
k = TUBE / float(tube_src)
strip = best.resize((max(1, int(round(best.width * k))),
                     max(1, int(round(best.height * k)))), Image.LANCZOS)
print("   kaynak boru=%dpx  k=%.4f  ->  oyun olceginde yilan %s"
      % (tube_src, k, strip.size))

colh = kit2.cross_profile(strip, "x")
# DUZ GOVDE = |kesit-30|<=2 olan EN UZUN blok
run = (0, 0, 0)                     # (uzunluk, bas, son)
i = 0
while i < len(colh):
    if abs(colh[i] - TUBE) > 2:
        i += 1
        continue
    j = i
    while j + 1 < len(colh) and abs(colh[j + 1] - TUBE) <= 2:
        j += 1
    if j - i + 1 > run[0]:
        run = (j - i + 1, i, j)
    i = j + 1
print("   duz govde blogu: %d kolon (x %d..%d)  [pencere 36px, yeterli: %s]"
      % (run[0], run[1], run[2], run[0] >= 40))

# boru ekseni (duz govdenin ortasinda sabit)
sp = strip.load()
mid_x = (run[1] + run[2]) // 2
ys = [y for y in range(strip.height) if sp[mid_x, y][3] > 60]
axis = (min(ys) + max(ys)) / 2.0
print("   boru ekseni y=%.1f  (bant %.0f..%.0f)" % (axis, axis - 15, axis + 14))

# 2B doku: T[t][x]  (t=0 borunun USTU, t=29 ALTI)
T = []
for t in range(TUBE):
    row = []
    for x in range(run[1], run[2] + 1):
        row.append(sp[x, int(round(axis - HALF + 0.5 + t))])
    T.append(row)
N = len(T[0])
print("   doku matrisi: %dx%d" % (TUBE, N))


# ============================================================ GOVDE BIRIMI
print("\n=== 2) GOVDE BIRIMI (36px, aynali -> dikişsiz tekrar) ===")
HALFW = GAME // 2                          # 18: aynali yarim -> 36px tam
pos = run[1] + N // 2 - HALFW
half_cols = list(range(pos, pos + HALFW))
img = Image.new("RGBA", (GAME, TUBE), (0, 0, 0, 0))
px = img.load()
for j, col in enumerate(half_cols + half_cols[::-1]):
    for t in range(TUBE):
        px[j, t] = T[t][col]

body_h = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
body_h.alpha_composite(img, (LO, BAND0))
body_v = kit2.turn_cw(body_h, 1)
bh_b = body_h.getchannel("A").getbbox()
print("   body_h icerik bbox=%s -> %dx%d  body_v icerik bbox=%s"
      % (bh_b, bh_b[2] - bh_b[0], bh_b[3] - bh_b[1],
         body_v.getchannel("A").getbbox()))

# ============================================================ KOSELER (sweep)
print("\n=== 3) KOSELER (boru kesiti tarak/sweep -> govdeyle BIREBIR) ===")
import math
SS = 3                                    # supersampling
corner_rd = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
cp = corner_rd.load()
phi0 = -math.pi / 2.0                     # giris: (HI, MID)
R_MID = 18.0
for y in range(LO, HI):
    for x in range(LO, HI):
        ar = ag = ab = aa = 0.0
        for sy in range(SS):
            for sx in range(SS):
                pxx = x + (sx + 0.5) / SS
                pyy = y + (sy + 0.5) / SS
                dx, dy = pxx - HI, pyy - HI
                r = math.hypot(dx, dy)
                phi = math.atan2(dy, dx)
                # ic yaricap = R_MID - HALF (=3), dis = R_MID + HALF (=33)
                if not (R_MID - HALF <= r <= R_MID + HALF):
                    continue
                if not (-math.pi <= phi <= phi0):
                    continue
                t = int(round(HALF - (r - R_MID)))
                t = max(0, min(TUBE - 1, t))
                s = (phi0 - phi) * R_MID
                v = int(round(s)) % N
                c = T[t][v]
                a = c[3] / 255.0
                ar += c[0] * a
                ag += c[1] * a
                ab += c[2] * a
                aa += a
        if aa <= 0.0:
            continue
        cp[x, y] = (int(round(ar / aa)), int(round(ag / aa)), int(round(ab / aa)),
                    int(round(255.0 * aa / (SS * SS))))
corners = {"rd": corner_rd}
for nm, q in (("dl", 1), ("lu", 2), ("ur", 3)):
    corners[nm] = kit2.turn_cw(corner_rd, q)
print("   corner_rd uretildi, digerleri 90/180/270 donus (birebir ayni kalinlik)")

# ============================================================ KUYRUK
print("\n=== 4) KUYRUK (yilanin KENDI kuyrugu -> taban kesiti govdeyle ayni) ===")
tail_w = run[1] + 2
tail_src = strip.crop((0, 0, tail_w, strip.height)).transpose(
    Image.FLIP_LEFT_RIGHT)                # taban SOLDA, sivri uc SAGDA
tpx = tail_src.load()
tys = [y for y in range(tail_src.height) if tpx[2, y][3] > 60]
tyc = (min(tys) + max(tys)) / 2.0
tail_r = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
tail_r.alpha_composite(tail_src, (LO, int(round(MID - tyc))))
ORDER3 = {"r": 0, "d": 1, "l": 2, "u": 3}
sp_out = {"tail_r": tail_r}
for d, q in ORDER3.items():
    sp_out["tail_" + d] = kit2.turn_cw(tail_r, q)
print("   kuyruk tabani: %d kolon (duz govdenin kesitinden)  -> 4 yon" % tail_w)

# ============================================================ KAFALAR (aynen)
print("\n=== 5) KAFALAR: mevcut atlas'tan AYNEN kopyalandi (dokunulmadi) ===")
cur = Image.open(GAME_SNAKE).convert("RGBA")
LAY = ["head_r", "head_d", "head_l", "head_u",
       "tail_r", "tail_d", "tail_l", "tail_u",
       "body_h", "body_v", "corner_rd", "corner_dl",
       "corner_lu", "corner_ur"]
for i, nm in enumerate(LAY[:4]):
    sp_out[nm] = cur.crop(((i % 4) * CELL, (i // 4) * CELL,
                           (i % 4 + 1) * CELL, (i // 4 + 1) * CELL))
    print("   %s kopyalandi (bbox %s)"
          % (nm, sp_out[nm].getchannel("A").getbbox()))

sp_out.update({"body_h": body_h, "body_v": body_v,
               "corner_rd": corners["rd"], "corner_dl": corners["dl"],
               "corner_lu": corners["lu"], "corner_ur": corners["ur"]})

# ============================================================ HUCRE HIZALAMA
# acik kenar bandini kanonik 57..86'ya oturt (gerekirse 1px kaydir)
OPEN = {"head_r": "l", "head_l": "r", "head_d": "u", "head_u": "d",
        "tail_r": "l", "tail_l": "r", "tail_d": "u", "tail_u": "d",
        "body_h": "lr", "body_v": "ud", "corner_rd": "rd",
        "corner_dl": "dl", "corner_lu": "lu", "corner_ur": "ur"}


def band_range(img, side, ex=4):
    p = img.getchannel("A").load()
    vals = []
    if side in ("l", "r"):
        xs = range(LO, LO + ex) if side == "l" else range(HI - ex, HI)
        for y in range(LO, HI):
            if any(p[x, y] > 60 for x in xs):
                vals.append(y)
    else:
        ys = range(LO, LO + ex) if side == "u" else range(HI - ex, HI)
        for x in range(LO, HI):
            if any(p[x, y] > 60 for y in ys):
                vals.append(x)
    return (min(vals), max(vals)) if vals else None


for nm, sides in OPEN.items():
    # SADECE kaynak-sanattan gelen KUYRUKLAR hizalanir. Govde/kose prosedurel
    # uretiliyor (kanonik geometri) -> hizalama onlari KAYDIRIP 4 koseyi
    # birbirinden farkli yapar. Kafalar mevcut atlas'tan zaten hizali gelir.
    if nm not in sp_out or not nm.startswith("tail_"):
        continue
    img = sp_out[nm]
    dx = dy = 0
    for side in sides:
        rng = band_range(img, side)
        if rng is None:
            continue
        mn, mx = rng
        # bandi MERKEZE oturt (kenar basina yuvarlama yapma -> titreme olmasin)
        delta = MID - (mn + mx + 1) // 2
        if side in ("l", "r"):
            dy = delta
        else:
            dx = delta
    if dx or dy:
        out = Image.new("RGBA", img.size, (0, 0, 0, 0))
        out.alpha_composite(img, (dx, dy))
        sp_out[nm] = out
        print("   hizala %-10s (%+d,%+d)" % (nm, dx, dy))

# ============================================================ BOYUN ONARIMI
# Kafa sprite'inin boyun bolgesi govde borusundan KALIN (36-42px vs 30px) ve
# ucunda koyu bir "kapak" var -> kafanin arkasinda YAKA/halka olarak gorunuyor.
# YUZE DOKUNMADAN yalnizca BORU bolgesini govdenin kendisiyle esitliyoruz.
REF_COL = half_cols[0]          # govdenin SOL ucu ile ayni doku kolonu

CANON_BACK = {"r": 0, "l": 0, "u": 3, "d": 1}


def to_canon(cell, d):
    if d == "l":
        return cell.transpose(Image.FLIP_LEFT_RIGHT)
    if d == "u":
        return kit2.turn_cw(cell, 1)
    if d == "d":
        return kit2.turn_cw(cell, 3)
    return cell


def from_canon(cell, d):
    if d == "l":
        return cell.transpose(Image.FLIP_LEFT_RIGHT)
    if d == "u":
        return kit2.turn_cw(cell, 3)
    if d == "d":
        return kit2.turn_cw(cell, 1)
    return cell


def repair_neck(cell, d):
    """Kanonik (saga bakan) karede boynu govde borusuna esitler."""
    can = to_canon(cell, d).copy()
    p = can.getchannel("A").load()
    bb = can.getchannel("A").getbbox()
    if not bb:
        return cell, None
    x0 = bb[0]
    face0 = None
    for x in range(x0, bb[2]):
        ys = [y for y in range(can.height) if p[x, y] > 60]
        if ys and (max(ys) - min(ys) + 1) > TUBE + 4:
            face0 = x
            break
    if face0 is None:
        return cell, None
    out = Image.new("RGBA", can.size, (0, 0, 0, 0))
    out.alpha_composite(can, (0, 0))
    op = out.load()
    for x in range(max(0, x0 - 2), face0):
        for y in range(can.height):
            if BAND0 <= y < BAND0 + TUBE:
                op[x, y] = T[y - BAND0][REF_COL]
            else:
                op[x, y] = (0, 0, 0, 0)
    return from_canon(out, d), (x0, face0)


# ============================================================ SHEET
layout = [["head_r", "head_d", "head_l", "head_u"],
          ["tail_r", "tail_d", "tail_l", "tail_u"],
          ["body_h", "body_v", "corner_rd", "corner_dl"],
          ["corner_lu", "corner_ur", None, None]]

dir_of = {"head_r": "r", "head_l": "l", "head_u": "u", "head_d": "d"}
neck_info = {}
sp_rep = dict(sp_out)
for nm, d in dir_of.items():
    img, info = repair_neck(sp_out[nm], d)
    sp_rep[nm] = img
    neck_info[nm] = info
    print("   boyun %-7s onarildi: x %s" % (nm, info))


def write_sheet(sp, path):
    sheet = Image.new("RGBA", (CELL * 4, CELL * 4), (0, 0, 0, 0))
    for r, row in enumerate(layout):
        for c, nm in enumerate(row):
            if nm:
                sheet.paste(sp[nm], (c * CELL, r * CELL))
    sheet.save(path)
    return path


v2_path = write_sheet(sp_out, os.path.join(TOOLS, "_v2_snake.png"))
v2b_path = write_sheet(sp_rep, os.path.join(TOOLS, "_v2b_snake.png"))
print("\nSHEET A (kafalar dokunulmamis) -> %s" % v2_path)
print("SHEET B (boyun onarimli)        -> %s" % v2b_path)
