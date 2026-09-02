// ============================================================================
// snakeSkins — Yılan skin (dış görünüm) sistemi.
// ----------------------------------------------------------------------------
// 5 hazır skin: emerald, amber, sky, rose, purple. Her skin baş/kuyruk rengini
// normal/boost/buz durumları için ayrı verir. localStorage'a kaydedilir.
// ============================================================================

export interface SnakeSkin {
  id: string;
  name: string;
  emoji: string;
  /** Normal durumda baş rengi (hex) */
  headColor: string;
  /** Normal durumda kuyruk rengi (hex) — lerp hedefi */
  tailColor: string;
  /** Boost aktifken baş rengi */
  boostHead: string;
  /** Boost aktifken kuyruk rengi */
  boostTail: string;
  /** Buz üzerindeyken baş rengi */
  iceHead: string;
  /** Buz üzerindeyken kuyruk rengi */
  iceTail: string;
  /** Göz bebek rengi (genelde koyu) */
  pupilColor: string;
}

const STORAGE_KEY = "harf-yilani-skin-v1";

export const SNAKE_SKINS: SnakeSkin[] = [
  {
    id: "emerald",
    name: "Zümrüt",
    emoji: "🐍",
    headColor: "#10b981",
    tailColor: "#022c22",
    boostHead: "#f59e0b",
    boostTail: "#78350f",
    iceHead: "#38bdf8",
    iceTail: "#082f49",
    pupilColor: "#0f172a",
  },
  {
    id: "amber",
    name: "Ateş",
    emoji: "🔥",
    headColor: "#f59e0b",
    tailColor: "#78350f",
    boostHead: "#ef4444",
    boostTail: "#7f1d1d",
    iceHead: "#38bdf8",
    iceTail: "#082f49",
    pupilColor: "#1c1917",
  },
  {
    id: "sky",
    name: "Buz",
    emoji: "❄️",
    headColor: "#38bdf8",
    tailColor: "#082f49",
    boostHead: "#f59e0b",
    boostTail: "#78350f",
    iceHead: "#818cf8",
    iceTail: "#1e1b4b",
    pupilColor: "#0c4a6e",
  },
  {
    id: "rose",
    name: "Gül",
    emoji: "🌹",
    headColor: "#f43f5e",
    tailColor: "#4c0519",
    boostHead: "#f59e0b",
    boostTail: "#78350f",
    iceHead: "#38bdf8",
    iceTail: "#082f49",
    pupilColor: "#4c0519",
  },
  {
    id: "purple",
    name: "Mor",
    emoji: "🔮",
    headColor: "#a855f7",
    tailColor: "#3b0764",
    boostHead: "#f59e0b",
    boostTail: "#78350f",
    iceHead: "#38bdf8",
    iceTail: "#082f49",
    pupilColor: "#3b0764",
  },
];

const DEFAULT_SKIN_ID = "emerald";

/** ID'den skin bulur; yoksa varsayılan skin döner. */
export function getSkinById(id: string): SnakeSkin {
  return SNAKE_SKINS.find((s) => s.id === id) ?? SNAKE_SKINS[0];
}

/** localStorage'dan aktif skin'i yükler; yoksa varsayılan skin döner. */
export function loadSkin(): SnakeSkin {
  if (typeof window === "undefined") return getSkinById(DEFAULT_SKIN_ID);
  try {
    const id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) return getSkinById(DEFAULT_SKIN_ID);
    return getSkinById(id);
  } catch {
    return getSkinById(DEFAULT_SKIN_ID);
  }
}

/** Aktif skin'i localStorage'a kaydeder. */
export function saveSkin(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // sessizce yoksay
  }
}
