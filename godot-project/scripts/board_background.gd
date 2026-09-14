# ============================================================================
# BoardBackground — Oyun tahtası ızgarası (zemin + taş çerçeve GÖRSELDEN gelir)
# ----------------------------------------------------------------------------
# Zemin ve taş çerçeve artık `assets/ui/frame_bg.png` içinde (üreten:
# _tools/build_frame_bg.py). Burada SADECE hücre ızgarası ve kesişim noktaları
# çizilir; böylece oyuncu hücreleri sayabilir.
#
# GameArea'nın İLK çocuğudur (her şeyin altında kalsın).
# ============================================================================

extends Node2D

const C = preload("res://scripts/constants.gd")

const GRID_COLOR: Color = Color(0.42, 0.56, 0.86, 0.10)      # çok silik çizgi
const DOT_COLOR: Color = Color(0.52, 0.66, 0.95, 0.20)       # kesişim noktası


func _draw() -> void:
		var w: float = float(C.GRID_COLS * C.CELL_SIZE)
		var h: float = float(C.GRID_ROWS * C.CELL_SIZE)
		var cell: float = float(C.CELL_SIZE)

		# --------------------------------------------- çok silik ızgara
		for x in range(C.GRID_COLS + 1):
				draw_line(Vector2(x * cell, 0.0), Vector2(x * cell, h), GRID_COLOR, 1.0)
		for y in range(C.GRID_ROWS + 1):
				draw_line(Vector2(0.0, y * cell), Vector2(w, y * cell), GRID_COLOR, 1.0)

		# ---------------------------------- kesişimlerde küçük nokta
		var dot: float = 2.0
		for y in range(C.GRID_ROWS + 1):
				for x in range(C.GRID_COLS + 1):
						draw_rect(Rect2(x * cell - dot * 0.5, y * cell - dot * 0.5, dot, dot), DOT_COLOR)
