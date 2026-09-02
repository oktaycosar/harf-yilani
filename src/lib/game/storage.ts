// ============================================================================
// StorageManager — localStorage ile kalıcı istatistikler
// ----------------------------------------------------------------------------
// En yüksek skor, en ileri bölüm, toplam oynanış, kazanılmış kelime sayısı,
// ses tercihi. SSR-safe (window yoksa no-op).
// ============================================================================

const KEY = "harf-yilani-stats-v1";
const LEADERBOARD_KEY = "harf-yilani-leaderboard-v1";
const ACHIEVEMENTS_KEY = "harf-yilani-achievements-v1";
const CATEGORY_PROGRESS_KEY = "harf-yilani-category-progress-v1";
const WEEKLY_STATS_KEY = "harf-yilani-weekly-stats-v1";
const LEADERBOARD_MAX = 10;

export interface GameStats {
  bestScore: number;
  bestLevel: number;
  totalGames: number;
  totalWordsCompleted: number;
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  ttsVolume: number; // 0-1
  /** Mevcut streak (üst üste hatasız tamamlanan kelime) */
  currentStreak: number;
  /** En iyi streak */
  bestStreak: number;
}

export interface LeaderboardEntry {
  score: number;
  level: number;
  date: number; // epoch ms
  word: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Açılmış mı? */
  unlocked: boolean;
  /** Açılma tarihi (epoch ms) */
  unlockedAt?: number;
}

export interface CategoryProgress {
  /** Kategori → tamamlanan kelime sayısı */
  [category: string]: number;
}

const DEFAULT_STATS: GameStats = {
  bestScore: 0,
  bestLevel: 1,
  totalGames: 0,
  totalWordsCompleted: 0,
  soundEnabled: true,
  soundVolume: 0.35,
  ttsVolume: 0.9,
  currentStreak: 0,
  bestStreak: 0,
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
  // Streak: bu oturumda en az 1 kelime tamamlandıysa streak artar, aksi halde sıfırlanır
  const newStreak = data.wordsCompleted > 0 ? prev.currentStreak + 1 : 0;
  const next: GameStats = {
    ...prev,
    bestScore: Math.max(prev.bestScore, data.score),
    bestLevel: Math.max(prev.bestLevel, data.level),
    totalGames: prev.totalGames + 1,
    totalWordsCompleted: prev.totalWordsCompleted + data.wordsCompleted,
    currentStreak: newStreak,
    bestStreak: Math.max(prev.bestStreak, newStreak),
  };
  saveStats(next);
  return next;
}

/** Streak'i sıfırla (oyuncu öldüğünde ama kelime tamamlamadığında kullanılmaz —
 *  recordGameEnd zaten wordsCompleted=0 ise streak'i sıfırlar). */
export function resetStreak(prev: GameStats): GameStats {
  const next = { ...prev, currentStreak: 0 };
  saveStats(next);
  return next;
}

export function resetStats(): GameStats {
  saveStats({ ...DEFAULT_STATS });
  // Liderlik tablosunu, achievement'ları, kategori ilerlemesini ve haftalık
  // istatistikleri de sıfırla
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEADERBOARD_KEY);
    window.localStorage.removeItem(ACHIEVEMENTS_KEY);
    window.localStorage.removeItem(CATEGORY_PROGRESS_KEY);
    window.localStorage.removeItem(WEEKLY_STATS_KEY);
  }
  return { ...DEFAULT_STATS };
}

export function setSoundEnabled(enabled: boolean, prev: GameStats): GameStats {
  const next = { ...prev, soundEnabled: enabled };
  saveStats(next);
  return next;
}

export function setSoundVolume(volume: number, prev: GameStats): GameStats {
  const next = { ...prev, soundVolume: Math.max(0, Math.min(1, volume)) };
  saveStats(next);
  return next;
}

export function setTtsVolume(volume: number, prev: GameStats): GameStats {
  const next = { ...prev, ttsVolume: Math.max(0, Math.min(1, volume)) };
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

// ---------------------------------------------------------------------------
// Achievement (başarım) sistemi
// ---------------------------------------------------------------------------

/** Tüm achievement tanımları (varsayılan kilitli) */
export const ACHIEVEMENT_DEFS: Omit<Achievement, "unlocked" | "unlockedAt">[] = [
  { id: "first_word", title: "İlk Kelime", description: "İlk kelimeni tamamla", icon: "🎯" },
  { id: "combo_5", title: "Combo Ustası", description: "5x combo yap", icon: "🔥" },
  { id: "combo_10", title: "Combo Efsanesi", description: "10x combo yap", icon: "⚡" },
  { id: "score_100", title: "Yüzü Geç", description: "100 puana ulaş", icon: "💯" },
  { id: "score_500", title: "Beş Yüz Kulübü", description: "500 puana ulaş", icon: "🏆" },
  { id: "score_1000", title: "Bin Puan", description: "1000 puana ulaş", icon: "👑" },
  { id: "level_5", title: "Acemi", description: "5. bölüme ulaş", icon: "🌱" },
  { id: "level_10", title: "Çırak", description: "10. bölüme ulaş", icon: "⭐" },
  { id: "level_25", title: "Usta", description: "25. bölüme ulaş", icon: "🎖️" },
  { id: "words_10", title: "Kelime Avcısı", description: "10 kelime tamamla", icon: "📚" },
  { id: "words_50", title: "Kelime Hazinesi", description: "50 kelime tamamla", icon: "📖" },
  { id: "daily_done", title: "Günlük Görev", description: "Günlük kelimeyi tamamla", icon: "📅" },
  { id: "booster_collect", title: "Hız Toplayıcı", description: "İlk hız boostunu topla", icon: "🚀" },
  { id: "no_death_run", title: "Kusursuz Bölüm", description: "Hatayla 5 kelime üst üste tamamla", icon: "✨" },
];

export function loadAchievements(): Achievement[] {
  if (typeof window === "undefined") {
    return ACHIEVEMENT_DEFS.map((d) => ({ ...d, unlocked: false }));
  }
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) {
      return ACHIEVEMENT_DEFS.map((d) => ({ ...d, unlocked: false }));
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    return ACHIEVEMENT_DEFS.map((d) => ({
      ...d,
      unlocked: parsed[d.id] != null,
      unlockedAt: parsed[d.id],
    }));
  } catch {
    return ACHIEVEMENT_DEFS.map((d) => ({ ...d, unlocked: false }));
  }
}

export function saveAchievement(id: string): Achievement[] {
  const current = loadAchievements();
  const updated = current.map((a) =>
    a.id === id && !a.unlocked ? { ...a, unlocked: true, unlockedAt: Date.now() } : a
  );
  if (typeof window !== "undefined") {
    const map: Record<string, number> = {};
    for (const a of updated) {
      if (a.unlocked && a.unlockedAt) map[a.id] = a.unlockedAt;
    }
    try {
      window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(map));
    } catch {
      // yoksay
    }
  }
  return updated;
}

/**
 * Mevcut istatistiklere göre achievement'ları kontrol et ve yeni açılanları döndür.
 * `extra` parametresi anlık olaylar için (combo, booster toplama vb.).
 */
export function checkAchievements(
  prev: Achievement[],
  stats: GameStats,
  extra?: { combo?: number; dailyCompleted?: boolean; boosterCollected?: boolean }
): { achievements: Achievement[]; newlyUnlocked: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];
  const updated = prev.map((a) => {
    if (a.unlocked) return a;
    let shouldUnlock = false;
    switch (a.id) {
      case "first_word": shouldUnlock = stats.totalWordsCompleted >= 1; break;
      case "combo_5": shouldUnlock = (extra?.combo ?? 0) >= 5; break;
      case "combo_10": shouldUnlock = (extra?.combo ?? 0) >= 10; break;
      case "score_100": shouldUnlock = stats.bestScore >= 100; break;
      case "score_500": shouldUnlock = stats.bestScore >= 500; break;
      case "score_1000": shouldUnlock = stats.bestScore >= 1000; break;
      case "level_5": shouldUnlock = stats.bestLevel >= 5; break;
      case "level_10": shouldUnlock = stats.bestLevel >= 10; break;
      case "level_25": shouldUnlock = stats.bestLevel >= 25; break;
      case "words_10": shouldUnlock = stats.totalWordsCompleted >= 10; break;
      case "words_50": shouldUnlock = stats.totalWordsCompleted >= 50; break;
      case "daily_done": shouldUnlock = extra?.dailyCompleted === true; break;
      case "booster_collect": shouldUnlock = extra?.boosterCollected === true; break;
      case "no_death_run": shouldUnlock = stats.bestStreak >= 5; break;
    }
    if (shouldUnlock) {
      const unlocked = { ...a, unlocked: true, unlockedAt: Date.now() };
      newlyUnlocked.push(unlocked);
      return unlocked;
    }
    return a;
  });

  // localStorage'a kaydet
  if (newlyUnlocked.length > 0 && typeof window !== "undefined") {
    const map: Record<string, number> = {};
    for (const a of updated) {
      if (a.unlocked && a.unlockedAt) map[a.id] = a.unlockedAt;
    }
    try {
      window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(map));
    } catch {
      // yoksay
    }
  }

  return { achievements: updated, newlyUnlocked };
}

// ---------------------------------------------------------------------------
// Kategori ilerleme takibi
// ---------------------------------------------------------------------------

export function loadCategoryProgress(): CategoryProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CATEGORY_PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CategoryProgress;
  } catch {
    return {};
  }
}

export function incrementCategoryProgress(category: string): CategoryProgress {
  const current = loadCategoryProgress();
  current[category] = (current[category] ?? 0) + 1;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CATEGORY_PROGRESS_KEY, JSON.stringify(current));
    } catch {
      // yoksay
    }
  }
  return current;
}

// ---------------------------------------------------------------------------
// Haftalık istatistik — son 7 günün oyun sayısı + en iyi skoru
// ---------------------------------------------------------------------------

export interface WeeklyStatEntry {
  /** YYYY-MM-DD formatında tarih (yerel) */
  date: string;
  /** O gün oynanan oyun sayısı */
  gamesPlayed: number;
  /** O günki en iyi skor */
  score: number;
}

/** Bugünün YYYY-MM-DD formatındaki tarih string'i (yerel saat). */
function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Son 7 günün (bugün dahil) haftalık istatistik dizisi. Eksik günler 0 olarak döner. */
export function loadWeeklyStats(): WeeklyStatEntry[] {
  const stored = readWeeklyMap();
  const out: WeeklyStatEntry[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = todayStr(d);
    const entry = stored[key];
    out.push({
      date: key,
      gamesPlayed: entry?.gamesPlayed ?? 0,
      score: entry?.score ?? 0,
    });
  }
  return out;
}

/** Bir oyun bittiğinde çağrılır — bugüne oyun sayısı + en iyi skoru kaydeder. */
export function recordGamePlay(score: number): WeeklyStatEntry[] {
  const stored = readWeeklyMap();
  const key = todayStr();
  const cur = stored[key] ?? { gamesPlayed: 0, score: 0 };
  stored[key] = {
    gamesPlayed: cur.gamesPlayed + 1,
    score: Math.max(cur.score, score),
  };
  // 30 günden eski kayıları temizle (performans için)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffKey = todayStr(cutoff);
  for (const k of Object.keys(stored)) {
    if (k < cutoffKey) delete stored[k];
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WEEKLY_STATS_KEY, JSON.stringify(stored));
    } catch {
      // yoksay
    }
  }
  return loadWeeklyStats();
}

function readWeeklyMap(): Record<string, { gamesPlayed: number; score: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WEEKLY_STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, { gamesPlayed: number; score: number }>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Haftalık hedef sistemi — haftada 5 oyun oyna → bonus
// ---------------------------------------------------------------------------

const WEEKLY_GOAL_KEY = "harf-yilani-weekly-goal-v1";
export const WEEKLY_GOAL_TARGET = 5;
export const WEEKLY_GOAL_BONUS = 100;

export interface WeeklyGoalState {
  /** Bu haftanın başlangıç tarihi (YYYY-MM-DD, Pazartesi) */
  weekStart: string;
  /** Bu hafta oynanan oyun sayısı */
  gamesPlayed: number;
  /** Hedef tamamlandı mı? */
  completed: boolean;
  /** Tamamlanma tarihi (epoch ms) */
  completedAt?: number;
}

/** Bu haftanın Pazartesi gününün YYYY-MM-DD formatını döndürür. */
function getWeekStart(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0=Pazar, 1=Pazartesi, ...
  const diff = day === 0 ? -6 : 1 - day; // Pazartesi'ye geri say
  date.setDate(date.getDate() + diff);
  return todayStr(date);
}

export function loadWeeklyGoal(): WeeklyGoalState {
  if (typeof window === "undefined") {
    return { weekStart: getWeekStart(), gamesPlayed: 0, completed: false };
  }
  try {
    const raw = window.localStorage.getItem(WEEKLY_GOAL_KEY);
    if (!raw) {
      return { weekStart: getWeekStart(), gamesPlayed: 0, completed: false };
    }
    const parsed = JSON.parse(raw) as WeeklyGoalState;
    // Hafta değiştiyse sıfırla
    const currentWeek = getWeekStart();
    if (parsed.weekStart !== currentWeek) {
      return { weekStart: currentWeek, gamesPlayed: 0, completed: false };
    }
    return parsed;
  } catch {
    return { weekStart: getWeekStart(), gamesPlayed: 0, completed: false };
  }
}

/**
 * Bir oyun bittiğinde çağrılır. Haftalık hedef oyun sayısını artırır.
 * Hedef tamamlandıysa (5 oyun) bonus işaretler ve true döndürür.
 */
export function incrementWeeklyGoal(
  prev: WeeklyGoalState
): { state: WeeklyGoalState; justCompleted: boolean } {
  const currentWeek = getWeekStart();
  // Hafta değiştiyse sıfırla
  const state: WeeklyGoalState =
    prev.weekStart !== currentWeek
      ? { weekStart: currentWeek, gamesPlayed: 0, completed: false }
      : { ...prev };

  state.gamesPlayed += 1;

  let justCompleted = false;
  if (!state.completed && state.gamesPlayed >= WEEKLY_GOAL_TARGET) {
    state.completed = true;
    state.completedAt = Date.now();
    justCompleted = true;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WEEKLY_GOAL_KEY, JSON.stringify(state));
    } catch {
      // yoksay
    }
  }

  return { state, justCompleted };
}
