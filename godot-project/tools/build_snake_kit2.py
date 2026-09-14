# -*- coding: utf-8 -*-
"""KIT-2 (begenilen yeni snake kit) -> oyun atlasi.

NEDEN BU YOL: Tek basina duran 12 kafada boyun tupu hep ALTTA (yalniz (0,1)
satirinda USTTE). Bu yuzden "yuz hareket yonune baksin" ile "boyun govde
tarafinda olsun" ayni sprite'ta SAGLANAMIYOR -> boyun her donuste kayik.

COZUM: Kit'in alt satirinda 4 YONE BAKAN TAM YILAN var (#23,#24,#25,#26).
Onlarda boyun govde ekseniyle AYNI hizada. Kafayi bu tam yilanlardan gövde
eksenine DIK bir duzlemde kesiyoruz:
  * kesit = saf boru kesiti  -> govde parcasiyla BIREBIR ayni (dikissiz)
  * boyun = yilanin KENDI borusundan bir dilim -> renk/kalinlik birebir
  * yuz   = hareket yonu (tam yilanin yonu ne ise o)
=> Hangi yone donerse donsun boyun govdeyle TAM birlesir.

Atlas duzeni (snake.gd ile birebir):
  satir 0: head_r  head_d  head_l  head_u
  satir 1: tail_r  tail_d  tail_l  tail_u
  satir 2: body_h  body_v  corner_rd  corner_dl
  satir 3: corner_lu  corner_ur
"""
import os
from collections import Counter, deque

from PIL import Image

SRC = (r"C:\Users\OktayC\Desktop\Harness_Genel_26\snake_gorseller"
       r"\ChatGPT Image 14 Eyl 2026 14_07_08.png")
SNAKE_DIR = r"C:\Users\OktayC\Desktop\Harness_Genel_26\yilan_oyunu\godot-project\assets\snake"
TOOLS_DIR = r"C:\Users\OktayC\Desktop\Harness_Genel_26\_tools"

SHEET_CELL = 144          # atlas hucresi
GAME_CELL = 36            # oyun hucresi (CELL_SIZE)
TUBE = 30                 # hedef boru kalinligi (px)
FWD = 5                   # kafayi hucresinin onune kaydirma
MIN_AREA = 0.0004         # leke esigi (kaynak alanina oran)


# ---------------------------------------------------------------- temel
def key_magenta(im):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if (r - g) > 45 and (b - g) > 45 and g < 150:
                px[x, y] = (0, 0, 0, 0)
    return im


def find_parts(im, step=2):
    """Bagli bilesen ile parcalari bulur -> [bbox,...] (y,x) sirali."""
    W, H = im.size
    px = im.load()
    gw, gh = (W + step - 1) // step, (H + step - 1) // step
    seen = [[False] * gw for _ in range(gh)]

    def solid(x, y):
        return px[x, y][3] > 60

    out = []
    for gy0 in range(gh):
        for gx0 in range(gw):
            if seen[gy0][gx0] or not solid(gx0 * step, gy0 * step):
                continue
            seen[gy0][gx0] = True
            q = deque([(gx0, gy0)])
            x0 = x1 = gx0 * step
            y0 = y1 = gy0 * step
            n = 0
            while q:
                gx, gy = q.popleft()
                x, y = gx * step, gy * step
                n += 1
                x0, x1 = min(x0, x), max(x1, x)
                y0, y1 = min(y0, y), max(y1, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = gx + dx, gy + dy
                    if 0 <= nx < gw and 0 <= ny < gh and not seen[ny][nx] \
                            and solid(nx * step, ny * step):
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if n * step * step > (W * H) * MIN_AREA:
                out.append((x0, y0, x1 + step, y1 + step))
    out.sort(key=lambda b: (round(b[1] / (im.height / 14.0)), b[0]))
    return out


def turn_cw(img, q):
    q %= 4
    if q == 0:
        return img
    if q == 1:
        return img.transpose(Image.ROTATE_270)
    if q == 2:
        return img.transpose(Image.ROTATE_180)
    return img.transpose(Image.ROTATE_90)


def center_cell(im):
    c = Image.new("RGBA", (SHEET_CELL, SHEET_CELL), (0, 0, 0, 0))
    c.alpha_composite(im, ((SHEET_CELL - im.width) // 2,
                           (SHEET_CELL - im.height) // 2))
    return c


def crop_to_cell(im, cx, cy):
    """36x36 pencereyi (cx,cy) merkezine gore kirp -> hucre kenarinda DUZ kesim."""
    half = GAME_CELL // 2
    left, top = int(round(cx)) - half, int(round(cy)) - half
    out = Image.new("RGBA", (GAME_CELL, GAME_CELL), (0, 0, 0, 0))
    out.alpha_composite(im.crop((left, top, left + GAME_CELL, top + GAME_CELL)))
    c = Image.new("RGBA", (SHEET_CELL, SHEET_CELL), (0, 0, 0, 0))
    c.alpha_composite(out, ((SHEET_CELL - GAME_CELL) // 2,
                            (SHEET_CELL - GAME_CELL) // 2))
    return c


def band_center_h(im, side):
    p = im.getchannel("A").load()
    x = 2 if side == "l" else im.width - 3
    ys = [y for y in range(im.height) if p[x, y] > 60]
    return (min(ys) + max(ys)) / 2.0 if ys else im.height / 2.0


def band_center_v(im, side):
    p = im.getchannel("A").load()
    y = 2 if side == "u" else im.height - 3
    xs = [x for x in range(im.width) if p[x, y] > 60]
    return (min(xs) + max(xs)) / 2.0 if xs else im.width / 2.0


def empty_quadrant(im):
    """L seklinin BOS kadrani -> (acik kenarlar, kadran doluluk %).
    Bos kadran dirsegin (bending) CAPRAZIdir; borunun iki ucu o kadrana
    komsu iki kenardan cikar.  ->  'dl' | 'rd' | 'lu' | 'ur'"""
    w, h = im.size
    p = im.getchannel("A").load()
    q = [[0, 0], [0, 0]]
    tot = [[0, 0], [0, 0]]
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            gy, gx = (1 if y >= h // 2 else 0), (1 if x >= w // 2 else 0)
            tot[gy][gx] += 1
            if p[x, y] > 60:
                q[gy][gx] += 1
    frac = [[q[gy][gx] / float(tot[gy][gx] or 1) for gx in (0, 1)]
            for gy in (0, 1)]
    flat = [("tl", frac[0][0]), ("tr", frac[0][1]),
            ("bl", frac[1][0]), ("br", frac[1][1])]
    name = min(flat, key=lambda t: t[1])[0]
    quads = {k: round(v * 100) for k, v in flat}
    return {"bl": "dl", "br": "rd", "tl": "lu", "tr": "ur"}[name], quads


def cross_profile(spr, along="x"):
    """Eksen boyunca kesit (kalib) dizisi."""
    p = spr.getchannel("A").load()
    W, H = spr.size
    if along == "x":
        return [sum(1 for y in range(H) if p[x, y] > 60) for x in range(W)]
    return [sum(1 for x in range(W) if p[x, y] > 60) for y in range(H)]


def is_taper(prof):
    """Kesit bir ucta belirgin sekilde kuculuyor mu (sivri uc)?"""
    if not prof:
        return False
    mx = max(prof) or 1
    band = max(1, len(prof) // 5)
    return min(max(prof[:band]), max(prof[-band:])) < mx * 0.45


def tube_thickness(prof, tol=2, min_run=20):
    """Boru kalinligi = en UZUN neredeyse-sabit kesit blogu.
    Sivrilen kuyruk (her kolonda degisir) ve genisleyen kafa kisa bloklar
    verir; duz govde tek uzun blok verir.
    NOT: Eskiden 'en sik deger' (mode) kullaniliyordu; kuyruk sivrilirken
    tekrar eden degerleri sayip YANLIS sonuc veriyordu (52 cikiyordu, gercek 66)
    -> kesme duzlemi govdenin ORTASINA dusuyor ve 'kafa' 170px cikiyordu."""
    n = len(prof)
    best = (0, None)
    x = 0
    while x < n:
        y = x
        lo = hi = prof[x]
        while y + 1 < n:
            v = prof[y + 1]
            if max(hi, v) - min(lo, v) > tol:
                break
            lo, hi = min(lo, v), max(hi, v)
            y += 1
        if y - x + 1 > best[0] and prof[x] > 0:
            best = (y - x + 1, int(round((lo + hi) / 2.0)))
        x = y + 1
    if best[1] and best[0] >= min_run:
        return best[1]
    return Counter(v for v in prof if v > 0).most_common(1)[0][0]


# ---------------------------------------------------------------- kafa
def to_canonical_head_right(spr):
    """Kafasi SAGA bakacak sekilde YATAY kanonik hale getirir.
    Dondurur: (kanonik_img, yon, ayna_mi)
    !! ayna_mi ONEMLI !!  AYNA ile kanoniklestirilen parca AYNA ile geri
    donmelidir; 180 derece DONDURME ile geri donulurse kafa TERS (dikey
    aynalanmis) cikar. ('sola giderken kafa ters' hatasinin kok nedeni.)"""
    W, H = spr.size
    if W >= H:
        prof = cross_profile(spr, "x")
        band = max(1, len(prof) // 8)
        head_start = max(prof[:band]) > max(prof[-band:])
        if head_start:                       # kafa SOLDA -> aynala
            return spr.transpose(Image.FLIP_LEFT_RIGHT), "l", True
        return spr, "r", False
    prof = cross_profile(spr, "y")
    band = max(1, len(prof) // 8)
    head_top = max(prof[:band]) > max(prof[-band:])
    if head_top:                             # kafa USTTE -> 90 CW dondur
        return spr.transpose(Image.ROTATE_270), "u", False
    return spr.transpose(Image.ROTATE_90), "d", False


def undo_canonical(img, d):
    """to_canonical_head_right'in TERSINI uygular (ayna ise ayna, donme ise donme)."""
    if d == "l":
        return img.transpose(Image.FLIP_LEFT_RIGHT)   # aynanin tersi = ayna
    if d == "u":
        return img.transpose(Image.ROTATE_90)         # CCW: sag -> yukari
    if d == "d":
        return img.transpose(Image.ROTATE_270)        # CW:  sag -> asagi
    return img


def arm_thick(img, side):
    """ACIK kenardaki boru kolunun kalinligi (MEDYAN).
    DIKKAT: kenarin hemen dibinden olcmek yanlis; kollar yuvarlak bittigi icin
    orasi ince cikar. Kenardan %25'lik banttaki kesitlerin MEDYANI alinir.
    Ayrica mutlaka ACILAN kenarla cagirilmali: kapali kenarda (dirsegin dis
    tarafi) olcum kolu degil tum govdeyi olcer."""
    p = img.getchannel("A").load()
    W, H = img.size
    vals = []
    if side in ("u", "d"):
        ys = (range(2, max(3, H // 4)) if side == "u"
              else range(max(0, H - H // 4), H - 2))
        for y in ys:
            xs = [x for x in range(W) if p[x, y] > 60]
            if xs:
                vals.append(max(xs) - min(xs) + 1)
    else:
        xs = (range(2, max(3, W // 4)) if side == "l"
              else range(max(0, W - W // 4), W - 2))
        for x in xs:
            ys2 = [y for y in range(H) if p[x, y] > 60]
            if ys2:
                vals.append(max(ys2) - min(ys2) + 1)
    if not vals:
        return 0
    vals.sort()
    return vals[len(vals) // 2]


def build_head(snake, want):
    """Tam yilandan kafayi keser -> 144'luk hazir kafa hucresi (yonu 'want')."""

    can, d, _ayna = to_canonical_head_right(snake)
    if d != want:
        print(f"    !! yon tespiti '{d}' beklenen '{want}' (yine de '{d}' kullanildi)")
    cw, ch = can.size
    colh = cross_profile(can, "x")
    tube = tube_thickness(colh)
    p = can.getchannel("A").load()
    ax = next(x for x in range(cw) if colh[x] == tube)
    ys = [y for y in range(ch) if p[ax, y] > 60]
    axis = (min(ys) + max(ys)) / 2.0
    tube_h = max(ys) - min(ys) + 1
    # kesme duzlemi: KAFANIN EN KALIN noktasindan SOLA yurunce kesitin boruya
    # dondugu yer. (Eskiden soldan saga taraniyordu; kuyruk sivrilerek
    # GENISLEDIGI icin tarama kuyrukta takiliyor, 'kafa' 170px cikiyordu.)
    xmax = max(range(cw), key=lambda x: colh[x])
    xc = xmax
    while xc > 0 and colh[xc] > tube * 1.05:
        xc -= 1
    # kafanin KENDI borusu = TUBE -> govdeyle ayni kalinlik
    k_h = TUBE / float(tube_h)
    CH = int(round(SHEET_CELL / k_h))

    def tocell(img):
        tmp = Image.new("RGBA", (img.width, CH), (0, 0, 0, 0))
        tmp.alpha_composite(img, (0, int(round(CH / 2.0 - axis))))
        return tmp.resize((max(1, int(round(img.width * k_h))), SHEET_CELL),
                          Image.LANCZOS)

    strip_raw = max(2, int(round(10.0 / k_h)))
    neck = tocell(can.crop((max(0, xc - strip_raw), 0, xc, ch)))
    head = tocell(can.crop((xc, 0, cw, ch)))
    out = Image.new("RGBA", (SHEET_CELL, SHEET_CELL), (0, 0, 0, 0))
    head_left = int(round(SHEET_CELL / 2.0 + FWD - head.width / 2.0))
    # BOYUN UZUNLUGU: eskiden 0'dan basliyordu -> kafa sprite'i 99px (2.75 huc)
    # oluyor ve KOCA GOVDEYI yiyordu ("gövdeyi çok kisaltmissin"). Oysa boyun
    # yalnizca ARKADAKI govde hucresine degmeli. O hucrenin merkezi
    # SHEET_CELL/2 - GAME_CELL = 36 -> oradan baslamak yeterli (1 hucre boyun).
    neck_x0 = max(0, SHEET_CELL // 2 - GAME_CELL)
    sx = neck_x0
    while sx < head_left + 6:
        out.alpha_composite(neck, (sx, 0))
        sx += neck.width
    out.alpha_composite(head, (head_left, 0))
    out = undo_canonical(out, d)                # AYNA ise ayna, donme ise donme
    hb = out.getchannel("A").getbbox()          # gercek icerik (144 dolgu degil)
    icerik = (hb[2] - hb[0], hb[3] - hb[1]) if hb else (0, 0)
    return out, d, tube_h, tube, icerik


# ---------------------------------------------------------------- main
def main():
    im = key_magenta(Image.open(SRC))
    parts = [im.crop(b) for b in find_parts(im)]
    total = float(im.width * im.height)
    print(f"kaynak {im.size}  ->  {len(parts)} parca\n")

    # ---- otomatik siniflandirma ----
    snakes, tubes, tails, corners = [], [], [], []
    for i, s in enumerate(parts):
        w, h = s.size
        ar = max(w, h) / float(min(w, h))
        if w * h > 0.02 * total and ar < 3.0:
            continue                                  # birlesmis grup
        prof = cross_profile(s, "x" if w >= h else "y")
        if ar >= 2.4 and not is_taper(prof):
            snakes.append(i)                          # TAM YILAN
        elif ar >= 1.6:
            (tails if is_taper(prof) else tubes).append(i)
        else:
            p = s.getchannel("A").load()
            W, H = s.size
            q = [0, 0, 0, 0]
            for y in range(0, H, 2):
                for x in range(0, W, 2):
                    if p[x, y] > 60:
                        q[(1 if y >= H // 2 else 0) * 2 + (1 if x >= W // 2 else 0)] += 1
            if min(q) < max(q) * 0.12:
                corners.append(i)                     # L seklinde BOS kadran
            # aksi halde tek basina kafa (kullanilmiyor: kafa yilandan kesiliyor)
    print(f"  TAM YILAN : {[(i, parts[i].size) for i in snakes]}")
    print(f"  boru      : {[(i, parts[i].size) for i in tubes]}")
    print(f"  kuyruk    : {[(i, parts[i].size) for i in tails]}")
    print(f"  kose      : {[(i, parts[i].size) for i in corners]}\n")

    # ---- tek global olcek: boru kalinligi = TUBE ----
    bh = next(i for i in tubes if parts[i].width > parts[i].height)
    bv = next(i for i in tubes if parts[i].height > parts[i].width)
    k = TUBE / float(parts[bh].height)
    print(f"GLOBAL OLCEK k = {k:.5f}  (boru {parts[bh].height}px -> {TUBE}px)")

    def scaled(i):
        s = parts[i]
        return s.resize((max(1, round(s.width * k)), max(1, round(s.height * k))),
                        Image.LANCZOS)

    sp = {}

    # ============ KAFALAR: tam yilanlardan KES ============
    print("\nKAFA: alttaki TAM YILANLARDAN kesiliyor "
          "(boyun govdeyle ayni hizada -> dikissiz)")
    for i in snakes:
        img, d, tube_h, tube, hsz = build_head(parts[i], "")
        sp["head_" + d] = img
        print(f"  head_{d}: parca#{i} {parts[i].size}  "
              f"yilan_borusu={tube_h}px yilan_kafasi={hsz}  "
              f"(kafa/boru={hsz[1] / float(TUBE):.2f}x)")
    for n in ("head_r", "head_d", "head_l", "head_u"):
        if n not in sp:
            print(f"  !! {n} URETILEMEDI")

    # ============ GOVDE BORULARI ============
    # Yatay boru kaynaktan kirpilir; DIKEY boru onun 90 derece donmusudur.
    # (Kaynak kit'teki dikey parca 62x132 ile COK KISA: 36px'lik oyun penceresini
    #  doldurmuyor -> parcalar arasinda bosluk kalirdi. Donmusu 36+ verir, renk
    #  ve kalinlik birebir ayni kalir.)
    s = scaled(bh)
    sp["body_h"] = crop_to_cell(s, s.width / 2.0, band_center_h(s, "l"))
    print(f"  body_h: #{bh} {parts[bh].size} -> {s.size} "
          f"(merkez {s.width / 2.0:.0f},{band_center_h(s, 'l'):.0f})")
    sv = s.transpose(Image.ROTATE_90)
    sp["body_v"] = crop_to_cell(sv, band_center_v(sv, "u"), sv.height / 2.0)
    print(f"  body_v: body_h'nin 90 donmusu -> {sv.size} "
          f"(merkez {band_center_v(sv, 'u'):.0f},{sv.height / 2.0:.0f})")

    # ============ KOSELER ============
    # OLCULDU (ASCII harita): kit'te yalnizca 2 FARKLI kose var ->
    #   #14 = acik YUKARI+ SAG  ('ur')      #15/#16/#17 = acik YUKARI+SOL ('lu')
    # Eksik ikisi 180 derece donusle BIREBIR uretilir:
    #   rotate180('lu') = acik SAG+ASAGI = 'rd'
    #   rotate180('ur') = acik ASAGI+SOL = 'dl'
    found = {}
    for i in corners:
        p0 = parts[i]
        # OLCULDU: kit'in koseleri govdeden INCE cizilmis (kol ~47px, govde 66px).
        # Global k ile olceklenince kol 22-24px kaliyor, govde 30px ->
        # donuslerde boru incelip tekrar kalinlasiyor ("tuhaf kayma").
        # Cozum: her koseyi KENDI kol kalinligina gore olcekle -> kol = TUBE.
        pair0, _q0 = empty_quadrant(p0)
        side_h = "l" if "l" in pair0 else "r"
        side_v = "u" if "u" in pair0 else "d"
        raw_h = arm_thick(p0, side_h)
        raw_v = arm_thick(p0, side_v)
        ref = [v for v in (raw_h, raw_v) if v > 0]
        k_c = TUBE / float(sum(ref) / len(ref)) if ref else k
        s = p0.resize((max(1, round(p0.width * k_c)),
                       max(1, round(p0.height * k_c))), Image.LANCZOS)
        pair, quads = empty_quadrant(s)
        th_h, th_v = arm_thick(s, side_h), arm_thick(s, side_v)
        print(f"  kose #{i} {p0.size} -> {pair}  ham_kol=({raw_h},{raw_v})px "
              f"k_c={k_c:.3f}  SONUC kol=({th_h},{th_v})px (hedef {TUBE})"
              + ("   (ayni yon, atlandi)" if pair in found else ""))
        if pair in found:
            continue
        found[pair] = crop_to_cell(s, band_center_v(s, side_v),
                                   band_center_h(s, side_h))
    for pair, src in (("rd", "lu"), ("dl", "ur")):
        if pair not in found and src in found:
            found[pair] = turn_cw(found[src], 2)
            print(f"  corner_{pair}: corner_{src}'nin 180 donmusu (kit'te yok)")
    for pair, img in found.items():
        sp["corner_" + pair] = img

    # ============ KUYRUKLAR ============
    def tail_right(i):
        """Kaynak kuyrugu 'ucu SAGA bakan yatay' hale getirir."""
        s = scaled(i)
        if s.height > s.width:
            prof = cross_profile(s, "y")
            band = max(1, len(prof) // 5)
            tip_bottom = max(prof[-band:]) < max(prof[:band])
            s = s.transpose(Image.ROTATE_90 if tip_bottom else Image.ROTATE_270)
        prof = cross_profile(s, "x")
        band = max(1, len(prof) // 5)
        if max(prof[:band]) < max(prof[-band:]):        # ucu solda -> cevir
            s = s.transpose(Image.FLIP_LEFT_RIGHT)
        return s

    def tail_cell(i, d):
        s = tail_right(i)
        cy = band_center_h(s, "l")
        s = s.crop((int(TUBE / 2.0), 0, s.width, s.height))   # tabani DUZ kes
        c = Image.new("RGBA", (SHEET_CELL, SHEET_CELL), (0, 0, 0, 0))
        base_x = SHEET_CELL // 2 - GAME_CELL // 2
        c.alpha_composite(s, (base_x, int(round(SHEET_CELL / 2.0 - cy))))
        ORDER3 = {"r": 0, "d": 1, "l": 2, "u": 3}
        return turn_cw(c, ORDER3[d] % 4)

    if tails:
        src_tail = max(tails, key=lambda i: parts[i].width if
                       parts[i].width >= parts[i].height else parts[i].height)
        for d in ("r", "d", "l", "u"):
            sp["tail_" + d] = tail_cell(src_tail, d)
        print(f"  tail: kaynak #{src_tail} {parts[src_tail].size} "
              f"-> 4 yon (taban hucre kenarinda duz kesildi)")

    # ============ HIZALAMA PASS (sheet'ten ONCE) ============
    OPEN_SIDES = {
        "head_r": "l", "head_l": "r", "head_d": "u", "head_u": "d",
        "tail_r": "l", "tail_l": "r", "tail_d": "u", "tail_u": "d",
        "body_h": "lr", "body_v": "ud",
        "corner_rd": "rd", "corner_dl": "dl",
        "corner_lu": "lu", "corner_ur": "ur",
    }
    LO = (SHEET_CELL - GAME_CELL) // 2
    HI = LO + GAME_CELL
    MID = SHEET_CELL // 2

    def _band_range(img, side, ex=4):
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

    for _n in list(sp.keys()):
        if _n not in OPEN_SIDES:
            continue
        img = sp[_n]
        dx = dy = 0
        for side in OPEN_SIDES[_n]:
            rng = _band_range(img, side)
            if rng is None:
                continue
            mn, mx = rng
            want = MID - (mx - mn + 1) // 2
            if side in ("l", "r"):
                dy = want - mn
            else:
                dx = want - mn
        if dx or dy:
            out = Image.new("RGBA", img.size, (0, 0, 0, 0))
            out.alpha_composite(img, (dx, dy))
            sp[_n] = out
    print("  hizalama: parcalar kanonik banda oturtuldu")

    # ============ SHEET ============
    layout = [
        ["head_r", "head_d", "head_l", "head_u"],
        ["tail_r", "tail_d", "tail_l", "tail_u"],
        ["body_h", "body_v", "corner_rd", "corner_dl"],
        ["corner_lu", "corner_ur", None, None],
    ]
    sheet = Image.new("RGBA", (SHEET_CELL * 4, SHEET_CELL * 4), (0, 0, 0, 0))
    eksik = []
    for r, row in enumerate(layout):
        for c, nm in enumerate(row):
            if nm and nm in sp:
                sheet.paste(sp[nm], (c * SHEET_CELL, r * SHEET_CELL))
            elif nm:
                eksik.append(nm)
    os.makedirs(SNAKE_DIR, exist_ok=True)
    sheet.save(os.path.join(SNAKE_DIR, "snake.png"))
    print(f"\nSHEET -> snake.png {sheet.size}  hucre={SHEET_CELL}  "
          + (("EKSIK " + str(eksik)) if eksik else "tam"))

    # hucre bazli dogrulama
    print("\nHUCRE DOGRULAMA (merkez 72,72 olmali):")
    for nm, (r, c) in ((n, (r, c)) for r, row in enumerate(layout)
                       for c, n in enumerate(row) if n):
        sub = sheet.crop((c * SHEET_CELL, r * SHEET_CELL,
                          (c + 1) * SHEET_CELL, (r + 1) * SHEET_CELL))
        bb = sub.getchannel("A").getbbox()
        if not bb:
            print(f"  {nm:<11} BOS !!")
            continue
        cx, cy = (bb[0] + bb[2]) / 2.0, (bb[1] + bb[3]) / 2.0
        print(f"  {nm:<11} bbox={bb} {bb[2]-bb[0]}x{bb[3]-bb[1]} "
              f"merkez=({cx:.1f},{cy:.1f})  sapma=({cx-72:+.1f},{cy-72:+.1f})")

    # ============ ZINCIR TESTI (oyunun mantigini birebir taklit) ============
    body = [(10, 4), (9, 4), (8, 4), (7, 4), (7, 3), (7, 2), (7, 1),
            (6, 1), (5, 1), (4, 1)]

    def seg_name(idx):
        if idx == 0:
            d = (body[0][0] - body[1][0], body[0][1] - body[1][1])
            return "head_" + {(1, 0): "r", (-1, 0): "l",
                              (0, 1): "d", (0, -1): "u"}[d]
        if idx == len(body) - 1:
            d = (body[idx][0] - body[idx - 1][0], body[idx][1] - body[idx - 1][1])
            return "tail_" + {(1, 0): "r", (-1, 0): "l",
                              (0, 1): "d", (0, -1): "u"}[d]
        sides = set()
        for cc in (body[idx - 1], body[idx + 1]):
            dd = (cc[0] - body[idx][0], cc[1] - body[idx][1])
            sides.add({(1, 0): "r", (-1, 0): "l", (0, 1): "d", (0, -1): "u"}[dd])
        if sides == {"l", "r"}:
            return "body_h"
        if sides == {"u", "d"}:
            return "body_v"
        return "corner_" + "".join(x for x in "dlur" if x in sides)

    Z, GW, GH = 3, 13, 7
    board = Image.new("RGBA", (GW * GAME_CELL, GH * GAME_CELL), (19, 26, 43, 255))
    names = []
    for i in range(len(body) - 1, -1, -1):
        n = seg_name(i)
        names.append(n)
        if n not in sp:
            print(f"  !! eksik parca: {n}")
            continue
        cx, cy = body[i]
        board.alpha_composite(sp[n],
                              (cx * GAME_CELL + GAME_CELL // 2 - SHEET_CELL // 2,
                               cy * GAME_CELL + GAME_CELL // 2 - SHEET_CELL // 2))
    print("  zincir: " + " ".join(reversed(names)))
    board.resize((board.width * Z, board.height * Z), Image.NEAREST).save(
        os.path.join(TOOLS_DIR, "_kit2_chain.png"))
    print("PREVIEW -> _kit2_chain.png")


if __name__ == "__main__":
    main()
