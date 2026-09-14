# -*- coding: utf-8 -*-
"""SNAKE v3 — atlas İNCE AYAR (üreticiden SONRA çalışır).

build_snake_v2.py'nin çıktısını (_v2b_snake.png) alır, üç şeyi düzeltir:

  1) KAFA ORANI   (notlar madde 8-c / madde 3-2)
     Şu an kafa kalınlığı 46-52px, gövde borusu 30px -> oran 1.53-1.73.
     Üstelik 4 yönün kafası FARKLI boyutta (46/49/50/52) -> aynı yılan
     dönerken kafası büyüyüp küçülüyor.
     Çözüm: her kafanın GÖVDE BULGUSU (boru dışındaki kısım) tek bir hedefe
     ölçeklenir. Boru/ense dokunulmaz (zaten 30px'e onarılmış).
     Bağlama noktası: kafanın ARKA kenarı (boruya birleştiği yer) sabit.

  2) KUYRUK TABANI (ölçüm: 29px, gövde 30px -> 1px basamak)
     Kuyruğun açık ucu, gövdenin açık ucuyla BİREBİR aynı dokuya getirilir
     (kafa boynu için kullanılan yöntemin aynısı).

  3) (ops.) KENAR SERTLEŞTİRME (notlar madde 8-d)
     Atlas'ta %9.2 kısmi alfa var (küçültmenin bıraktığı yumuşak kenar).
     Alfa eşiklenir -> jilet gibi pixel-art kenarı.

Kullanım:
    python refine_snake.py                # sadece önizleme üretir
    python refine_snake.py --apply        # oyunun snake.png'ini de yazar
"""
import os
import sys
from PIL import Image

TOOLS = r"C:\Users\OktayC\Desktop\Harness_Genel_26\_tools"
GAME = (r"C:\Users\OktayC\Desktop\Harness_Genel_26\yilan_oyunu"
        r"\godot-project\assets\snake\snake.png")
GEN = os.path.join(TOOLS, "_v2b_snake.png")      # build_snake_v2.py çıktısı

CELL, GAME_CELL, TUBE, MID = 144, 36, 30, 72
LO = MID - GAME_CELL // 2                        # 54
HI = LO + GAME_CELL                              # 90
BAND0 = MID - TUBE // 2                          # 57
BAND1 = BAND0 + TUBE                             # 87 (hariç)
BAND_MID = (BAND0 + BAND1) / 2.0                 # 71.5 — boru ekseni

HEAD_RATIO = 1.15          # kafa kalınlığı / gövde kalınlığı (notlar: "%15 büyük")
TARGET_HEAD = int(round(HEAD_RATIO * TUBE))      # 35 px
TAIL_STRIP = 8             # kuyruk tabanında gövde dokusuyla doldurulacak px
ALPHA_CUT = 110            # alfa eşiği (sertleştirme)

LAYOUT = [["head_r", "head_d", "head_l", "head_u"],
          ["tail_r", "tail_d", "tail_l", "tail_u"],
          ["body_h", "body_v", "corner_rd", "corner_dl"],
          ["corner_lu", "corner_ur", None, None]]


def turn_cw(img, q):
    q %= 4
    if q == 0:
        return img
    if q == 1:
        return img.transpose(Image.ROTATE_270)
    if q == 2:
        return img.transpose(Image.ROTATE_180)
    return img.transpose(Image.ROTATE_90)


# ------------------------------------------------ kanonik çerçeveler
# KAFALAR: kanonik = kafa SAĞA bakar, boru SOL kenardan açılır.
def head_to_canon(cell, d):
    if d == "l":
        return cell.transpose(Image.FLIP_LEFT_RIGHT)
    if d == "u":
        return turn_cw(cell, 1)
    if d == "d":
        return turn_cw(cell, 3)
    return cell


def head_from_canon(cell, d):
    if d == "l":
        return cell.transpose(Image.FLIP_LEFT_RIGHT)
    if d == "u":
        return turn_cw(cell, 3)
    if d == "d":
        return turn_cw(cell, 1)
    return cell


# KUYRUKLAR: kanonik = sivri uç SAĞDA, taban SOL kenarda.
def tail_to_canon(cell, d):
    if d == "l":
        return cell.transpose(Image.FLIP_LEFT_RIGHT)
    if d == "u":
        return turn_cw(cell, 1)
    if d == "d":
        return turn_cw(cell, 3)
    return cell


def tail_from_canon(cell, d):
    if d == "l":
        return cell.transpose(Image.FLIP_LEFT_RIGHT)
    if d == "u":
        return turn_cw(cell, 3)
    if d == "d":
        return turn_cw(cell, 1)
    return cell


# ------------------------------------------------ yardımcılar
def col_height(img, x):
    p = img.getchannel("A").load()
    ys = [y for y in range(img.height) if p[x, y] > 60]
    return (max(ys) - min(ys) + 1) if ys else 0


def left_of_bbox(img):
    bb = img.getchannel("A").getbbox()
    return bb[0] if bb else 0


def resize_premul(img, size):
    """Alfa-duyarlı küçültme (premultiply -> resize -> unpremultiply).

    PIL RGBA'yı premultiply ETMEDEN küçültür: kenar pikselinin RGB'si
    komşu ŞEFFAF pikselin RGB'siyle (0,0,0) karışır -> kenarda koyu/mor
    hale oluşur. (Bu projede daha önce magenta zemin yüzünden yaşanan
    'mor kenar' sorununun aynısı.) Önce alfa ile çarpıp siyaha göre
    composite ediyoruz, küçültüyoruz, sonra alfaya bölüyoruz."""
    w, h = size
    a = img.getchannel("A")
    prem = Image.alpha_composite(
        Image.new("RGBA", img.size, (0, 0, 0, 255)), img).convert("RGB")
    prem = prem.resize((w, h), Image.LANCZOS)
    a2 = a.resize((w, h), Image.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pp, ap, op = prem.load(), a2.load(), out.load()
    for y in range(h):
        for x in range(w):
            al = ap[x, y]
            if al == 0:
                continue
            r, g, b = pp[x, y]
            f = 255.0 / al
            op[x, y] = (min(255, int(round(r * f))),
                        min(255, int(round(g * f))),
                        min(255, int(round(b * f))), al)
    return out


def body_block(body_h_cell):
    """Gövde döşemesi: 36x30 blok (bandın içinde)."""
    return body_h_cell.crop((LO, BAND0, LO + GAME_CELL, BAND1))


def fill_body(cell, x0, x1, block):
    """x0..x1 arasını GÖVDE DÖŞEMESİYLE doldurur (yatayda karo, faz = hücre
    ızgarası), bandın dışını ŞEFFAF yapar.

    NEDEN KARO (tek kolon tekrarı değil): tek kolonu tekrarlamak dikey
    çizgiler üretiyordu; boyun/kuyruk tabanı gövde deseninden farklı
    görünüp yine bir "ek yeri" gibi okunuyordu."""
    p = cell.load()
    bp = block.load()
    bw = block.size[0]
    for x in range(max(0, x0), min(cell.width, x1)):
        sx = (x - LO) % bw
        for y in range(cell.height):
            p[x, y] = (bp[sx, y - BAND0] if BAND0 <= y < BAND1
                       else (0, 0, 0, 0))
    return cell


# ------------------------------------------------ 1) KAFA ORANI
def fit_bulk(region, target):
    """Bulgu bölgesini (boru dışı kısım) hedef KALINLIĞA ölçekler.

    NEDEN DÖNGÜ: ölçekleme sonrası alfa eşiği, yumuşak kenarın dış halkasını
    atar -> gerçek kalınlık hedefin ALTINA düşer (38 hedeflenip 34 çıkıyordu).
    Eşikten SONRAki bbox'a göre yeniden ölçekleyerek hedefe oturtuyoruz."""
    cur = region
    for _ in range(5):
        bb = cur.getchannel("A").getbbox()
        if not bb:
            return cur
        cur = cur.crop(bb)
        h = cur.size[1]
        if h == target:
            break
        s = target / float(h)
        cur = harden(resize_premul(
            cur, (max(1, int(round(cur.size[0] * s))),
                  max(1, int(round(h * s))))))
        nb = cur.getchannel("A").getbbox()
        if nb and (nb[3] - nb[1]) == target:
            cur = cur.crop(nb)
            break
    return cur


def normalize_head(cell, d, block, report):
    can = head_to_canon(cell, d)
    x0 = left_of_bbox(can)
    face0 = None
    for x in range(x0, can.width):
        if col_height(can, x) > TUBE + 4:
            face0 = x
            break
    if face0 is None or face0 <= x0 + 1:
        report.append("   %-7s bulgu ayrisamadi (face0=%s) -> DOKUNULMADI"
                      % (d, face0))
        return cell

    region = can.crop((face0, 0, can.width, can.height))
    bb = region.getchannel("A").getbbox()
    if not bb:
        report.append("   %-7s bulgu bos -> DOKUNULMADI" % d)
        return cell
    bx0, by0, bx1, by1 = face0 + bb[0], bb[1], face0 + bb[2], bb[3]

    # bulguyu hedef kalınlığa ölçekle (alfa eşiğinden SONRAki gerçek kalınlık)
    bulk = fit_bulk(can.crop((bx0, by0, bx1, by1)), TARGET_HEAD)
    nb = bulk.getchannel("A").getbbox()
    if nb:
        bulk = bulk.crop(nb)
    nw, nh = bulk.size

    out = Image.new("RGBA", can.size, (0, 0, 0, 0))
    # boruyu bulgunun ARKA kenarına kadar uzat (kafa arkası boş kalmasın)
    fill_body(out, x0, bx0 + 3, block)
    # DİKEY BAĞLAMA: bulguyu BORU EKSENİNE ortala.
    # (Sanatın kendi kaymasını korumak alt kenarda 1-2px basamak bırakıyordu:
    #  kafa altı boru altından yukarıda kalıp gövdenin konturu dışarı taşıyordu.)
    out.alpha_composite(bulk, (bx0, int(round(BAND_MID - nh / 2.0))))

    report.append("   %-7s bulgu %dx%d -> %dx%d  kalinlik %d -> %d px (hedef %d)"
                  % (d, bx1 - bx0, by1 - by0, nw, nh, by1 - by0, nh,
                     TARGET_HEAD))
    return head_from_canon(out, d)


# ------------------------------------------------ 2) KUYRUK TABANI
def repair_tail(cell, d, block, report):
    can = tail_to_canon(cell, d)
    nz = [y for y in range(can.height)
          if any(can.getpixel((x, y))[3] > 60 for x in (LO, LO + 1))]
    before = (max(nz) - min(nz) + 1) if nz else 0
    fill_body(can, LO, LO + TAIL_STRIP, block)
    nz = [y for y in range(can.height)
          if any(can.getpixel((x, y))[3] > 60 for x in (LO, LO + 1))]
    after = (max(nz) - min(nz) + 1) if nz else 0
    report.append("   %-7s taban %2d -> %2d px  (band %d..%d)"
                  % (d, before, after, BAND0, BAND1 - 1))
    return tail_from_canon(can, d)


# ------------------------------------------------ 3) KENAR SERTLEŞTİRME
def harden(im):
    a = im.getchannel("A").point(lambda v: 255 if v >= ALPHA_CUT else 0)
    out = im.copy()
    out.putalpha(a)
    return out


def soft_ratio(im):
    h = im.getchannel("A").histogram()
    op, soft = sum(h[200:]), sum(h[1:200])
    return 100.0 * soft / max(1, op + soft)


# ------------------------------------------------ render (karşılaştırma)
DIR_NAME = {(1, 0): "r", (-1, 0): "l", (0, 1): "d", (0, -1): "u"}
CORNER = {frozenset("rd"): "rd", frozenset("dl"): "dl",
          frozenset("lu"): "lu", frozenset("ur"): "ur"}
CASES = {
    "sag": [(6, 2), (5, 2), (4, 2), (3, 2), (2, 2), (1, 2)],
    "yukari": [(3, 6), (3, 5), (3, 4), (3, 3), (3, 2), (3, 1)],
    "asagi": [(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6)],
    "donus": [(6, 5), (6, 4), (6, 3), (5, 3), (4, 3), (3, 3)],
}


def piece(sheet, name):
    i = LAYOUT_FLAT.index(name)
    im = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    im.alpha_composite(sheet.crop(((i % 4) * CELL, (i // 4) * CELL,
                                   (i % 4 + 1) * CELL, (i // 4 + 1) * CELL)))
    return im


def seg_name(body, i):
    n = len(body)
    if i == 0:
        return "head_" + DIR_NAME[(body[1][0] - body[0][0], body[1][1] - body[0][1])]
    if i == n - 1:
        return "tail_" + DIR_NAME[(body[n - 1][0] - body[n - 2][0],
                                   body[n - 1][1] - body[n - 2][1])]
    a = (body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1])
    b = (body[i + 1][0] - body[i][0], body[i + 1][1] - body[i][1])
    if a == b or a == (-b[0], -b[1]):
        return "body_v" if a[0] == 0 else "body_h"
    return "corner_" + CORNER[frozenset([DIR_NAME[a], DIR_NAME[b]])]


def render(sheet, body, z=5):
    xs = [c[0] for c in body]
    ys = [c[1] for c in body]
    ox, oy = min(xs), min(ys)
    w = (max(xs) - ox + 1) * GAME_CELL
    h = (max(ys) - oy + 1) * GAME_CELL
    M = CELL // 2
    im = Image.new("RGBA", (w + 2 * M, h + 2 * M), (19, 26, 43, 255))
    for i in range(len(body) - 1, -1, -1):
        cx = M + (body[i][0] - ox) * GAME_CELL + GAME_CELL // 2 - CELL // 2
        cy = M + (body[i][1] - oy) * GAME_CELL + GAME_CELL // 2 - CELL // 2
        im.alpha_composite(piece(sheet, seg_name(body, i)), (cx, cy))
    return im.resize((im.width * z, im.height * z), Image.NEAREST)


LAYOUT_FLAT = [n for row in LAYOUT for n in row if n]


# ------------------------------------------------ ana akış
def build(src_path):
    src = Image.open(src_path).convert("RGBA")
    assert src.size == (CELL * 4, CELL * 4), src.size
    cells = {}
    for r, row in enumerate(LAYOUT):
        for c, nm in enumerate(row):
            if nm:
                cells[nm] = src.crop((c * CELL, r * CELL,
                                      (c + 1) * CELL, (r + 1) * CELL))

    block = body_block(cells["body_h"])
    rep = []
    rep.append("1) KAFA ORANI  (hedef %d px = %.2f x %d)"
               % (TARGET_HEAD, TARGET_HEAD / float(TUBE), TUBE))
    for d in "rdlu":
        cells["head_" + d] = normalize_head(cells["head_" + d], d, block, rep)
    rep.append("2) KUYRUK TABANI (gövde dokusuyla birebir):")
    for d in "rdlu":
        cells["tail_" + d] = repair_tail(cells["tail_" + d], d, block, rep)

    sheet = Image.new("RGBA", (CELL * 4, CELL * 4), (0, 0, 0, 0))
    for r, row in enumerate(LAYOUT):
        for c, nm in enumerate(row):
            if nm:
                sheet.paste(cells[nm], (c * CELL, r * CELL))
    return sheet, rep


def main():
    src = GEN if os.path.exists(GEN) else GAME
    print("kaynak: %s" % os.path.basename(src))
    sheet, rep = build(src)
    print("\n".join(rep))

    soft = sheet
    hard = harden(sheet)
    print("\nyumusak kenar: %.1f%% kismi alfa" % soft_ratio(soft))
    print("sert kenar   : %.1f%% kismi alfa" % soft_ratio(hard))

    outs = [("_v3_snake.png", soft), ("_v3h_snake.png", hard)]
    # karşılaştırma render'ı (eski vs yeni)
    cur = Image.open(GAME).convert("RGBA")
    for label, body in CASES.items():
        a = render(cur, body)
        b = render(soft, body)
        c = render(hard, body)
        W = max(a.width, b.width, c.width)
        out = Image.new("RGBA", (W, a.height + b.height + c.height), (10, 14, 24, 255))
        out.alpha_composite(a, (0, 0))
        out.alpha_composite(b, (0, a.height))
        out.alpha_composite(c, (0, a.height + b.height))
        p = os.path.join(TOOLS, "_v3kars_%s.png" % label)
        out.save(p)
        print("karsilastirma -> %s  (ust: MEVCUT, orta: v3 yumusak, alt: v3 sert)"
              % os.path.basename(p))

    for nm, im in outs:
        p = os.path.join(TOOLS, nm)
        im.save(p)
        print("OK -> %s" % p)

    if "--apply" in sys.argv:
        out = soft if "--soft" in sys.argv else hard
        out.save(GAME)
        print("\n>>> OYUN ATLASI YAZILDI: %s  (%s kenar)"
              % (GAME, "yumusak" if "--soft" in sys.argv else "sert"))
    else:
        print("\n(oyun dosyasina yazmak icin: --apply [: --soft ile yumusak])")


if __name__ == "__main__":
    main()
