# ============================================================================
# slice_sheet_cc.py — Saydam zeminli kit sayfasini bilesenlere ayirir
# ----------------------------------------------------------------------------
# Alfa kanalina gore bagli bilesen (connected component) bulur, yakindaki
# parcalari birlestirir, her sprite'i ayri PNG olarak kaydeder ve isimlendirme
# icin numarali bir montaj sayfasi uretir.
#
# Kullanim: python slice_sheet_cc.py "<sheet.png>" [cikis_klasoru]
# ============================================================================
import os
import sys
from collections import deque

from PIL import Image, ImageDraw, ImageFilter

import _paths                                     # ortak yol çözümleyici
DEFAULT_SHEET = _paths.sheet("ChatGPT Image 14 Eyl 2026 19_13_53.png")
DEFAULT_OUT = os.path.join(_paths.SCRIPT_DIR, "_sheet_parts")

ALPHA_MIN = 16          # bunun uzerindeki alfayi "dolu" say
DILATE = 9              # 9 -> 4px yakinliktaki parcalar tek sprite sayilir
MIN_AREA = 120          # cok kucuk kirintilari at


def label(mask, w, h):
    """Bagli bilesen etiketleme (BFS). Doner: etiket haritasi (liste)."""
    lab = [0] * (w * h)
    boxes = []
    cur = 0
    for start in range(w * h):
        if lab[start] or not mask[start]:
            continue
        cur += 1
        x0 = y0 = 10 ** 9
        x1 = y1 = -1
        q = deque([start])
        lab[start] = cur
        while q:
            i = q.popleft()
            y, x = divmod(i, w)
            if x < x0:
                x0 = x
            if x > x1:
                x1 = x
            if y < y0:
                y0 = y
            if y > y1:
                y1 = y
            if x > 0 and mask[i - 1] and not lab[i - 1]:
                lab[i - 1] = cur
                q.append(i - 1)
            if x < w - 1 and mask[i + 1] and not lab[i + 1]:
                lab[i + 1] = cur
                q.append(i + 1)
            if y > 0 and mask[i - w] and not lab[i - w]:
                lab[i - w] = cur
                q.append(i - w)
            if y < h - 1 and mask[i + w] and not lab[i + w]:
                lab[i + w] = cur
                q.append(i + w)
        boxes.append((x0, y0, x1 + 1, y1 + 1))
    return lab, boxes


def main() -> None:
    sheet_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SHEET
    out_dir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    os.makedirs(out_dir, exist_ok=True)

    src = Image.open(sheet_path).convert("RGBA")
    w, h = src.size
    print("sayfa:", src.size)

    alpha = src.getchannel("A")
    solid = alpha.point(lambda v: 255 if v >= ALPHA_MIN else 0)
    dilated = solid.filter(ImageFilter.MaxFilter(DILATE))

    dense = [v > 0 for v in dilated.getdata()]
    fine = dilated.load()  # mask pointer yeniden kullanilamaz, liste uzerinden gidiyoruz
    lab, boxes = label(dense, w, h)

    # Etiket bolgesi icinde GERCEK alfa pikselinin sinirini bul (dilate payini at)
    alpha_px = alpha.load()
    parts = []
    for idx, (x0, y0, x1, y1) in enumerate(boxes, start=1):
        rx0 = ry0 = 10 ** 9
        rx1 = ry1 = -1
        for y in range(y0, y1):
            row = y * w
            for x in range(x0, x1):
                if lab[row + x] == idx and alpha_px[x, y] >= ALPHA_MIN:
                    if x < rx0:
                        rx0 = x
                    if x > rx1:
                        rx1 = x
                    if y < ry0:
                        ry0 = y
                    if y > ry1:
                        ry1 = y
        if rx1 < 0:
            continue
        bw, bh = rx1 - rx0 + 1, ry1 - ry0 + 1
        if bw * bh < MIN_AREA:
            continue
        parts.append((rx0, ry0, bw, bh))

    parts.sort(key=lambda p: (p[1] // 40, p[0]))
    print("bulunan sprite:", len(parts))

    for n, (x, y, bw, bh) in enumerate(parts, start=1):
        crop = src.crop((x, y, x + bw, y + bh))
        crop.save(os.path.join(out_dir, "%02d_%dx%d_at_%d_%d.png" % (n, bw, bh, x, y)))

    # ---- numarali montaj sayfasi (isimlendirme icin) ----
    scale = 1
    cols = 8
    cell_w = max(p[2] for p in parts) + 24
    cell_h = max(p[3] for p in parts) + 34
    rows = (len(parts) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cell_w, rows * cell_h), (24, 28, 40, 255))
    d = ImageDraw.Draw(mont)
    for i, (x, y, bw, bh) in enumerate(parts):
        cx = (i % cols) * cell_w
        cy = (i // cols) * cell_h
        d.rectangle([cx + 2, cy + 2, cx + cell_w - 3, cy + cell_h - 3], outline=(70, 90, 130, 255))
        sp = src.crop((x, y, x + bw, y + bh))
        mont.paste(sp, (cx + (cell_w - bw) // 2, cy + 22 + (cell_h - 22 - bh) // 2), sp)
        d.text((cx + 8, cy + 6), "%02d  %dx%d" % (i + 1, bw, bh), fill=(255, 220, 120, 255))
    mont_path = os.path.join(out_dir, "_montaj.png")
    mont.save(mont_path)
    print("montaj:", mont_path, mont.size)
    for n, (x, y, bw, bh) in enumerate(parts, start=1):
        print("%02d  %4dx%-4d  @%d,%d" % (n, bw, bh, x, y))


if __name__ == "__main__":
    main()
