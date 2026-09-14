# ============================================================================
# slice_sheet_magenta.py — MAGENTA zeminli kit sayfasini bilesenlere ayirir
# ----------------------------------------------------------------------------
# slice_sheet_cc.py'nin magenta varyanti: once magenta zemini alfaya cevirir,
# sonra bagli bilesen (BFS) ile dilimler; numarali montaj sayfasi uretir.
#
# Kullanim: python slice_sheet_magenta.py [sheet.png] [cikis_klasoru] [dilate]
# ============================================================================
import os
import sys
from collections import deque

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SHEET = os.path.join(ROOT, "snake_gorseller", "ChatGPT Image 14 Eyl 2026 19_54_42.png")
DEFAULT_OUT = os.path.join(ROOT, "_tools", "_frame_parts")

ALPHA_MIN = 16
MIN_AREA = 200


def is_mag(p) -> bool:
    r, g, b = p[0], p[1], p[2]
    return r > 110 and b > 110 and g < 100


def de_fringe(im: Image.Image) -> int:
    """Kenarda kalan magenta-gul karisimi pikselleri komsu gercek renkle boyar.

    Magenta zemine karsi anti-aliased cizilmis piksellerden kalan MOR KENAR
    olceklemede de kalir; bu pass onu temizler.
    """
    px = im.load()
    w, h = im.size
    fixed = 0
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] == 0 or not is_mag(p):
                continue
            src = None
            for d in range(1, w):
                if x - d >= 0:
                    q = px[x - d, y]
                    if q[3] > 0 and not is_mag(q):
                        src = q
                        break
                if x + d < w:
                    q = px[x + d, y]
                    if q[3] > 0 and not is_mag(q):
                        src = q
                        break
            if src is not None:
                px[x, y] = (src[0], src[1], src[2], p[3])
                fixed += 1
    return fixed


def magenta_to_alpha(im: Image.Image) -> Image.Image:
    out = im.convert("RGBA")
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r > 140 and b > 140 and g < 120 and abs(r - b) < 90:
                px[x, y] = (0, 0, 0, 0)
    n = de_fringe(out)
    print("kenar temizligi:", n, "piksel")
    return out


def label(mask, w, h):
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
            x0 = min(x0, x)
            x1 = max(x1, x)
            y0 = min(y0, y)
            y1 = max(y1, y)
            for j in (i - 1, i + 1, i - w, i + w):
                if j == i - 1 and x == 0:
                    continue
                if j == i + 1 and x == w - 1:
                    continue
                if 0 <= j < w * h and mask[j] and not lab[j]:
                    lab[j] = cur
                    q.append(j)
        boxes.append((x0, y0, x1 + 1, y1 + 1))
    return lab, boxes


def main() -> None:
    sheet_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SHEET
    out_dir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    dilate = int(sys.argv[3]) if len(sys.argv) > 3 else 9
    os.makedirs(out_dir, exist_ok=True)

    src = magenta_to_alpha(Image.open(sheet_path))
    w, h = src.size
    print("sayfa:", src.size)
    alpha = src.getchannel("A")
    solid = alpha.point(lambda v: 255 if v >= ALPHA_MIN else 0)
    dilated = solid.filter(ImageFilter.MaxFilter(dilate))

    dense = [v > 0 for v in dilated.getdata()]
    lab, boxes = label(dense, w, h)
    alpha_px = alpha.load()

    parts = []
    for idx, (x0, y0, x1, y1) in enumerate(boxes, start=1):
        rx0 = ry0 = 10 ** 9
        rx1 = ry1 = -1
        for y in range(y0, y1):
            row = y * w
            for x in range(x0, x1):
                if lab[row + x] == idx and alpha_px[x, y] >= ALPHA_MIN:
                    rx0 = min(rx0, x)
                    rx1 = max(rx1, x)
                    ry0 = min(ry0, y)
                    ry1 = max(ry1, y)
        if rx1 < 0:
            continue
        bw, bh = rx1 - rx0 + 1, ry1 - ry0 + 1
        if bw * bh < MIN_AREA:
            continue
        parts.append((rx0, ry0, bw, bh))

    parts.sort(key=lambda p: (p[1] // 60, p[0]))
    print("bulunan parca:", len(parts))

    for n, (x, y, bw, bh) in enumerate(parts, start=1):
        src.crop((x, y, x + bw, y + bh)).save(
            os.path.join(out_dir, "%02d_%dx%d_at_%d_%d.png" % (n, bw, bh, x, y)))

    cols = 5
    cw = max(p[2] for p in parts) + 24
    ch = max(p[3] for p in parts) + 34
    rows = (len(parts) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * ch), (19, 26, 43, 255))
    d = ImageDraw.Draw(mont)
    for i, (x, y, bw, bh) in enumerate(parts):
        cx = (i % cols) * cw
        cy = (i // cols) * ch
        d.rectangle([cx + 2, cy + 2, cx + cw - 3, cy + ch - 3], outline=(70, 90, 130, 255))
        sp = src.crop((x, y, x + bw, y + bh))
        mont.paste(sp, (cx + (cw - bw) // 2, cy + 22 + (ch - 22 - bh) // 2), sp)
        d.text((cx + 8, cy + 6), "%02d  %dx%d" % (i + 1, bw, bh), fill=(255, 220, 120, 255))
    mont.save(os.path.join(out_dir, "_montaj.png"))
    for n, (x, y, bw, bh) in enumerate(parts, start=1):
        print("%02d  %4dx%-4d  @%d,%d" % (n, bw, bh, x, y))
    print("montaj:", os.path.join(out_dir, "_montaj.png"))


if __name__ == "__main__":
    main()
