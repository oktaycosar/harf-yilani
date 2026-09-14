# -*- coding: utf-8 -*-
"""Ortak yol çözümleyici — araçlar MUTLAK yol kullanmasın.

Tüm scriptler yollarını buradan alır. Böylece araçlar ister projenin içindeki
`godot-project/tools/` klasöründe, ister dışarıdaki `_tools/` klasöründe dursun
doğru klasörleri bulur.

  SCRIPT_DIR : bu dosyanın klasörü      (ara çıktılar buraya yazılır)
  PROJECT    : içinde project.godot olan klasör (yukarı doğru aranır)
  ASSETS     : PROJECT/assets
  SNAKE_PNG  : assets/snake/snake.png   (oyunun kullandığı atlas)
  UI_OUT     : assets/ui                (arayüz varlıkları)
  SHEETS     : kaynak kit sayfalarının klasörü ("snake_gorseller")
  SOURCE_KIT : yılan kiti PNG'si

`snake_gorseller` yukarı doğru aranır; başka bir yere taşıdıysan
HARF_YILANI_SHEETS ortam değişkeniyle yolunu verebilirsin.
"""
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _up(start, name, depth=6):
    """Yukarı doğru çıkıp `name` adlı alt klasörü barındıran ilk klasörü
    döndürür (yoksa None)."""
    p = os.path.abspath(start)
    for _ in range(depth):
        if os.path.isdir(os.path.join(p, name)):
            return p
        parent = os.path.dirname(p)
        if parent == p:
            break
        p = parent
    return None


# --- Godot projesi ---
# `_tools` klasörü projenin ÜSTÜNDE değil YANINDA duruyor, o yüzden yukarı
# doğru çıkarken bir de bilinen yerleşimi deniyoruz:
#     <üst klasör>/yilan_oyunu/godot-project
_HINT = "yilan_oyunu/godot-project"


def _find_project(start):
    env = os.environ.get("HARF_YILANI_PROJECT")
    if env and os.path.exists(os.path.join(env, "project.godot")):
        return os.path.abspath(env)
    p = os.path.abspath(start)
    for _ in range(6):
        if os.path.exists(os.path.join(p, "project.godot")):
            return p
        hint = os.path.join(p, *_HINT.split("/"))
        if os.path.exists(os.path.join(hint, "project.godot")):
            return hint
        parent = os.path.dirname(p)
        if parent == p:
            break
        p = parent
    return None


PROJECT = _find_project(SCRIPT_DIR)

if PROJECT is None:
    raise SystemExit(
        "project.godot bulunamadı.\n"
        "  Bu araçlar Godot projesinin içinde (godot-project/tools/) ya da\n"
        "  hemen yanında (_tools/) durmalı. Farklı bir yerdeyse\n"
        "  HARF_YILANI_PROJECT ortam değişkeniyle proje yolunu ver.")

ASSETS = os.path.join(PROJECT, "assets")
SNAKE_PNG = os.path.join(ASSETS, "snake", "snake.png")
UI_OUT = os.path.join(ASSETS, "ui")

# --- Kaynak kit sayfaları ---
# Sıra: ortam değişkeni -> script'in yanındaki source/sheets -> yukarıda
# 'snake_gorseller' klasörü (projenin dışında duran klasik yerleşim).
SHEETS = os.environ.get("HARF_YILANI_SHEETS")
if not SHEETS:
    _local = os.path.join(SCRIPT_DIR, "source", "sheets")
    if os.path.isdir(_local):
        SHEETS = _local
    else:
        _base = _up(SCRIPT_DIR, "snake_gorseller")
        SHEETS = os.path.join(_base, "snake_gorseller") if _base else None

SOURCE_KIT = os.path.join(SCRIPT_DIR, "source", "kit_snake.png")
if not os.path.exists(SOURCE_KIT):
    SOURCE_KIT = (os.path.join(SHEETS, "ChatGPT Image 14 Eyl 2026 14_07_08.png")
                  if SHEETS else None)


def sheet(name):
    """Kaynak kit sayfasının tam yolu (yoksa anlaşılır hata verir)."""
    if not SHEETS:
        raise SystemExit(
            "Kaynak klasörü bulunamadı.\n"
            "  'snake_gorseller' klasörünü projenin yanına koy ya da\n"
            "  HARF_YILANI_SHEETS ortam değişkeniyle yolunu ver.")
    p = os.path.join(SHEETS, name)
    if not os.path.exists(p):
        raise SystemExit("Kaynak bulunamadı: %s" % p)
    return p
