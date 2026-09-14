# -*- coding: utf-8 -*-
"""Mevcut oyun atlasini (snake.png) olcer:
  - her hucrenin alfa bbox'i
  - acik kenarlardaki BORU kalinligi
  - KAFANIN GOVDEYE orani  (madde 8-c)
  - kenar yumusakligi: kismi alfa piksel orani  (madde 8-d)
"""
import os
from PIL import Image

import _paths                                     # ortak yol çözümleyici
GAME_SNAKE = _paths.SNAKE_PNG
CELL, GAME, TUBE, MID = 144, 36, 30, 72
LO, HI = MID - GAME // 2, MID + GAME // 2          # 54..90
BAND0, BAND1 = MID - TUBE // 2, MID + TUBE // 2    # 57..87

LAYOUT = [["head_r", "head_d", "head_l", "head_u"],
          ["tail_r", "tail_d", "tail_l", "tail_u"],
          ["body_h", "body_v", "corner_rd", "corner_dl"],
          ["corner_lu", "corner_ur", None, None]]

im = Image.open(GAME_SNAKE).convert("RGBA")
print("snake.png %s  (%s)" % (im.size, os.path.basename(GAME_SNAKE)))
assert im.size == (CELL * 4, CELL * 4), "beklenen 576x576"

cells = {}
for r, row in enumerate(LAYOUT):
    for c, nm in enumerate(row):
        if nm:
            cells[nm] = im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))


def bbox(img):
    return img.getchannel("A").getbbox()


def band(img, side, ex=4):
    """Acik kenardan ex px iceride alfa spamini olc (boru kalinligi)."""
    p = img.getchannel("A").load()
    if side == "l":
        for x in range(LO, LO + ex):
            ys = [y for y in range(LO, HI) if p[x, y] > 60]
            if ys:
                return max(ys) - min(ys) + 1, min(ys), max(ys)
    if side == "r":
        for x in range(HI - 1, HI - ex - 1, -1):
            ys = [y for y in range(LO, HI) if p[x, y] > 60]
            if ys:
                return max(ys) - min(ys) + 1, min(ys), max(ys)
    if side == "u":
        for y in range(LO, LO + ex):
            xs = [x for x in range(LO, HI) if p[x, y] > 60]
            if xs:
                return max(xs) - min(xs) + 1, min(xs), max(xs)
    if side == "d":
        for y in range(HI - 1, HI - ex - 1, -1):
            xs = [x for x in range(LO, HI) if p[x, y] > 60]
            if xs:
                return max(xs) - min(xs) + 1, min(xs), max(xs)
    return None


print("\n=== 1) BORU KALINLIGI (acik kenarlar) — madde 3: hepsi AYNI olmali ===")
OPEN = {"head_r": "l", "head_l": "r", "head_d": "u", "head_u": "d",
        "tail_r": "l", "tail_l": "r", "tail_d": "u", "tail_u": "d",
        "body_h": "l", "body_v": "u"}
for nm, side in OPEN.items():
    b = band(cells[nm], side)
    if b:
        print("  %-9s %s kenari: boru=%2d px  (bant %d..%d)  %s"
              % (nm, side, b[0], b[1], b[2],
                 "OK" if b[0] == TUBE else "<-- FARKLI (hedef %d)" % TUBE))

# govde hucresinin KENDI butun bandi (tekrarda dikissiz olmali)
for nm in ("body_h", "body_v"):
    bb = bbox(cells[nm])
    print("  %-9s icerik bbox=%s  (36x30 beklenir)" % (nm, bb))

print("\n=== 2) KAFA / GOVDE ORANI — madde 8-c (hedef ~1.15) ===")
body_t = band(cells["body_h"], "l")[0]
for nm in ("head_r", "head_l", "head_d", "head_u"):
    bb = bbox(cells[nm])
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    # kafa yatay kafada: boyun yatay eksende -> KALINLIK = yukseklik
    thick = h if nm in ("head_r", "head_l") else w
    face = w if nm in ("head_r", "head_l") else h
    print("  %-7s bbox=%s  %2dx%2d  kafa KALINLIGI=%d  oran=%.2f  %s"
          % (nm, bb, w, h, thick, thick / float(body_t),
             "OK" if abs(thick / float(body_t) - 1.15) < 0.12 else "<-- HEDEF 1.15"))
print("  govde boru kalinligi = %d px" % body_t)

# govde ile kafa boyun hizasi (bant 57..86 mi?)
print("\n=== 3) BOYUN HIZASI (kafa arkasindaki boru kanonik bantta mi?) ===")
for nm, side in (("head_r", "l"), ("head_l", "r"), ("head_d", "u"), ("head_u", "d")):
    b = band(cells[nm], side)
    if b:
        print("  %-7s bant %d..%d  %s"
              % (nm, b[1], b[2],
                 "OK (57..86)" if (b[1], b[2]) == (BAND0, BAND1 - 1)
                 else "<-- KAYIK"))

print("\n=== 4) KENAR YUMUSAKLIGI — madde 8-d ===")
a = im.getchannel("A")
hist = a.histogram()
opaque = sum(hist[200:])
soft = sum(hist[1:200])
print("  tam opak piksel : %d" % opaque)
print("  kismi alfa      : %d  (%.1f%%)  %s"
      % (soft, 100.0 * soft / max(1, opaque + soft),
         "yumusak (anti-alias var)" if soft > opaque * 0.1 else "sert"))
