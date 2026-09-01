// ============================================================================
// StorageManager — localStorage ile kalıcı istatistikler
// ----------------------------------------------------------------------------
// En yüksek skor, en ileri bölüm, toplam oynanış, kazanılmış kelime sayısı,
// ses tercihi. SSR-safe (window yoksa no-op).
// ============================================================================

const KEY = "harf-yilani-stats-v1";
const LEADERBOARD_KEY = "harf-yilani-leaderboard-v1";
const LEADERBOARD_MAX = 10;

export interface GameStats {
  bestScore: number;
  bestLevel: number;
  totalGames: number;
  totalWordsCompleted: number;
  soundEnabled: boolean;
}

export interface LeaderboardEntry {
  score: number;
  level: number;
  date: number; // epoch ms
  word: string;
}

const DEFAULT_STATS: GameStats = {
  bestScore: 0,
  bestLevel: 1,
  totalGames: 0,
  totalWordsCompleted: 0,
  soundEnabled: true,
};

export function loadStats(): GameStats {
  if (typeof window === "undefined") return { ...DEFAULT_STATS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(stats: GameStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // kota dolu veya erişim engelli — sessizce yoksay
  }
}

/** Bir oyun oturumu bittiğinde çağrılır; istatistikleri günceller ve döndürür */
export function recordGameEnd(
  prev: GameStats,
  data: { score: number; level: number; wordsCompleted: number }
): GameStats {
  const next: GameStats = {
    ...prev,
    bestScore: Math.max(prev.bestScore, data.score),
    bestLevel: Math.max(prev.bestLevel, data.level),
    totalGames: prev.totalGames + 1,
    totalWordsCompleted: prev.totalWordsCompleted + data.wordsCompleted,
  };
  saveStats(next);
  return next;
}

export function resetStats(): GameStats {
  saveStats({ ...DEFAULT_STATS });
  // Liderlik tablosunu da sıfırla
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEADERBOARD_KEY);
  }
  return { ...DEFAULT_STATS };
}

export function setSoundEnabled(enabled: boolean, prev: GameStats): GameStats {
  const next = { ...prev, soundEnabled: enabled };
  saveStats(next);
  return next;
}

// ---------------------------------------------------------------------------
// Liderlik tablosu
// ---------------------------------------------------------------------------
export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, LEADERBOARD_MAX);
  } catch {
    return [];
  }
}

export function addToLeaderboard(entry: LeaderboardEntry): LeaderboardEntry[] {
  const current = loadLeaderboard();
  current.push(entry);
  // Skora göre azalan sırala, eşitse daha erken tarihe öncelik
  current.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.date - b.date;
  });
  const trimmed = current.slice(0, LEADERBOARD_MAX);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
    } catch {
      // yoksay
    }
  }
  return trimmed;
}
