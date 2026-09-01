"use client";

// ============================================================================
// useSnakeGame — React tarafında GameManager görevi görür.
// SnakeEngine'i sarmalar, oyun döngüsünü (requestAnimationFrame + accumulator)
// çalıştırır, klavye/dokunma girdisini yönetir, bölüm akışını idare eder,
// ses efektlerini çalar ve istatistikleri localStorage'a kaydeder.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { SnakeEngine } from "@/lib/game/snakeEngine";
import { getDifficultyForLevel, pickWordForLevel } from "@/lib/game/difficulty";
import {
  LEVEL_COMPLETE_DELAY,
  START_LIVES,
  WRONG_LETTER_DELAY,
} from "@/lib/game/constants";
import type { GameSnapshot } from "@/lib/game/types";
import type { Category } from "@/lib/game/wordDatabase";
import { SoundManager, type SfxName } from "@/lib/game/sound";
import {
  loadStats,
  recordGameEnd,
  resetStats,
  saveStats,
  setSoundEnabled as persistSound,
  loadLeaderboard,
  addToLeaderboard,
  type GameStats,
  type LeaderboardEntry,
} from "@/lib/game/storage";

export interface UseSnakeGameApi {
  snapshot: GameSnapshot;
  startGame: () => void;
  retry: () => void;
  nextLevel: () => void;
  pause: () => void;
  resume: () => void;
  backToMenu: () => void;
  setDirection: (dir: GameSnapshot["direction"]) => void;
  /** Sıradaki hedef harf (kelime tamamlandıysa null) */
  nextTargetChar: string | null;
  /** Kalıcı istatistikler */
  stats: GameStats;
  /** Ses açık mı */
  soundEnabled: boolean;
  toggleSound: () => void;
  resetAllStats: () => void;
  /** Kelime tamamlama konfeti tetikleyici (her tamamlamada değişir) */
  confettiTrigger: number;
  /** Aktif kelime kategorisi */
  category: Category;
  setCategory: (c: Category) => void;
  /** Liderlik tablosu (top 10) */
  leaderboard: LeaderboardEntry[];
}

export function useSnakeGame(): UseSnakeGameApi {
  const [engine] = useState(() => new SnakeEngine());
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engine.getSnapshot());
  const [stats, setStats] = useState<GameStats>(() => loadStats());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadStats().soundEnabled);
  const [confettiTrigger, setConfettiTrigger] = useState<number>(0);
  const [category, setCategory] = useState<Category>("karisik");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());

  const recentWordsRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const lastSigRef = useRef<string>("");
  const lastEventSigRef = useRef<string>("");
  const lastWarningSecRef = useRef<number>(-1);
  const wordsCompletedThisRunRef = useRef<number>(0);
  const statsRef = useRef<GameStats>(stats);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const categoryRef = useRef<Category>(category);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  // İlk yüklemede SoundManager'ı senkronize et
  useEffect(() => {
    SoundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const publish = useCallback(() => {
    setSnapshot(engine.getSnapshot());
  }, [engine]);

  const playSfx = useCallback((name: SfxName) => {
    if (!soundEnabledRef.current) return;
    SoundManager.play(name);
  }, []);

  // --- Bölüm yükleme yardımcısı ---
  const loadLevel = useCallback(
    (level: number, isAdvancement: boolean = false) => {
      const diff = getDifficultyForLevel(level);
      const { word } = pickWordForLevel(level, recentWordsRef.current, categoryRef.current);
      recentWordsRef.current = [...recentWordsRef.current.slice(-6), word];
      engine.loadLevel({
        level,
        word,
        tierName: diff.tier.name,
        stepMs: diff.stepMs,
        tricky: diff.tier.tricky,
        obstacleCount: diff.obstacleCount,
        timed: diff.timed,
        timeLimitMs: diff.timeLimitMs,
      });
      lastStepRef.current = performance.now();
      accRef.current = 0;
      if (isAdvancement && level > 1) playSfx("level_up");
      publish();
    },
    [engine, publish, playSfx]
  );

  // --- Oyun döngüsü ---
  useEffect(() => {
    const loop = (now: number) => {
      if (engine.status === "playing") {
        const rawDt = now - lastStepRef.current;
        lastStepRef.current = now;
        // dt'yi kırp: sekme arka plandayken rAF durur, geri gelince devasa dt
        // birikir. Bu, sürenin anında bitmesine ve çoklu time_up olaylarına
        // yol açar. 100ms ile sınırla (en fazla ~6 adım atlar).
        const dt = Math.min(rawDt, 100);
        // Süreli mod: gerçek zaman akışı (tick bağımsız)
        if (engine.timeLimitMs > 0) {
          engine.updateTime(dt);
        }
        // Hareket tick'leri
        if (engine.status === "playing") {
          accRef.current += dt;
          while (accRef.current >= engine.stepMs) {
            accRef.current -= engine.stepMs;
            engine.tick();
            if (engine.status !== "playing") break;
          }
        }
      }
      const s = engine.getSnapshot();
      const ev = s.lastEvent;
      const evSig = `${ev.kind}|${"index" in ev ? ev.index : ""}|${"char" in ev ? ev.char : ""}|${"combo" in ev ? ev.combo : ""}|${"gained" in ev ? ev.gained : ""}`;
      const sig = `${s.status}|${s.score}|${s.lives}|${s.combo}|${s.level}|${s.currentLetterIndex}|${s.snake.length}|${s.snake[0]?.x ?? -1}|${s.snake[0]?.y ?? -1}|${Math.floor(s.timeRemainingMs / 100)}|${evSig}`;

      // Süre uyarısı: son 5 saniyede her saniye tik-tak
      if (s.timeLimitMs > 0 && s.timeRemainingMs > 0 && s.timeRemainingMs <= 5000) {
        const secLeft = Math.ceil(s.timeRemainingMs / 1000);
        if (secLeft !== lastWarningSecRef.current && secLeft >= 1) {
          lastWarningSecRef.current = secLeft;
          if (soundEnabledRef.current) SoundManager.play("time_warning");
        }
      } else {
        lastWarningSecRef.current = -1;
      }

      // Yeni olay tespit edildi → ses çal
      if (evSig !== lastEventSigRef.current && ev.kind !== "none") {
        lastEventSigRef.current = evSig;
        switch (ev.kind) {
          case "ate_correct":
            playSfx("correct");
            break;
          case "ate_wrong":
            playSfx("wrong");
            break;
          case "ate_bonus":
            playSfx("bonus");
            break;
          case "word_complete":
            playSfx("word_complete");
            wordsCompletedThisRunRef.current += 1;
            setConfettiTrigger((c) => c + 1);
            {
              const cur = statsRef.current;
              const next: GameStats = {
                ...cur,
                bestScore: Math.max(cur.bestScore, s.score),
                bestLevel: Math.max(cur.bestLevel, s.level),
                totalWordsCompleted: cur.totalWordsCompleted + 1,
              };
              if (
                next.bestScore !== cur.bestScore ||
                next.bestLevel !== cur.bestLevel ||
                next.totalWordsCompleted !== cur.totalWordsCompleted
              ) {
                statsRef.current = next;
                saveStats(next);
                setStats(next);
              }
            }
            break;
          case "self_collision":
          case "wall_collision":
          case "obstacle_collision":
          case "time_up":
            playSfx("wrong");
            break;
        }
      }

      // Game over'a ilk geçişte istatistik kaydet + ses + liderlik tablosu
      if (s.status === "game_over" && lastSigRef.current.split("|")[0] !== "game_over") {
        playSfx("game_over");
        const updated = recordGameEnd(statsRef.current, {
          score: s.score,
          level: s.level,
          wordsCompleted: wordsCompletedThisRunRef.current,
        });
        setStats(updated);
        // Liderlik tablosuna ekle (yalnızca skor > 0 ise)
        if (s.score > 0) {
          const entry: LeaderboardEntry = {
            score: s.score,
            level: s.level,
            date: Date.now(),
            word: s.targetWord,
          };
          const newBoard = addToLeaderboard(entry);
          setLeaderboard(newBoard);
        }
      }

      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setSnapshot(s);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [engine, playSfx]);

  // --- Durum geçişleri için zamanlayıcılar ---
  useEffect(() => {
    if (snapshot.status === "level_complete") {
      const t = setTimeout(() => {
        engine.incrementLevel();
        loadLevel(engine.level, true);
      }, LEVEL_COMPLETE_DELAY);
      return () => clearTimeout(t);
    }
    if (
      (snapshot.status === "wrong_letter" || snapshot.status === "time_up") &&
      snapshot.lives > 0
    ) {
      const t = setTimeout(() => {
        engine.retryLevel();
        publish();
      }, WRONG_LETTER_DELAY);
      return () => clearTimeout(t);
    }
  }, [snapshot.status, snapshot.lives, engine, loadLevel, publish]);

  // --- Dışarı açılan API ---
  const startGame = useCallback(() => {
    SoundManager.ensureContext();
    playSfx("start");
    wordsCompletedThisRunRef.current = 0;
    engine.resetRun();
    recentWordsRef.current = [];
    loadLevel(1);
  }, [engine, loadLevel, playSfx]);

  const retry = useCallback(() => {
    playSfx("menu_click");
    engine.retryLevel();
    lastStepRef.current = performance.now();
    accRef.current = 0;
    publish();
  }, [engine, publish, playSfx]);

  const nextLevel = useCallback(() => {
    playSfx("menu_click");
    engine.incrementLevel();
    loadLevel(engine.level, true);
  }, [engine, loadLevel, playSfx]);

  const pause = useCallback(() => {
    if (engine.status === "playing") {
      engine.setStatus("paused");
      publish();
    }
  }, [engine, publish]);

  const resume = useCallback(() => {
    if (engine.status === "paused") {
      engine.setStatus("playing");
      lastStepRef.current = performance.now();
      publish();
    }
  }, [engine, publish]);

  const backToMenu = useCallback(() => {
    playSfx("menu_click");
    engine.resetAll();
    publish();
  }, [engine, publish, playSfx]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      SoundManager.setEnabled(next);
      const updated = persistSound(next, statsRef.current);
      setStats(updated);
      if (next) SoundManager.play("menu_click");
      return next;
    });
  }, []);

  const resetAllStats = useCallback(() => {
    const cleared = resetStats();
    setStats(cleared);
    setSoundEnabled(cleared.soundEnabled);
    SoundManager.setEnabled(cleared.soundEnabled);
    setLeaderboard([]);
  }, []);

  // Ref tabanlı aksiyonlar (klavye handler'ı stale closure yaşamaz)
  const actionsRef = useRef({
    startGame: () => {},
    backToMenu: () => {},
    resume: () => {},
    pause: () => {},
  });
  useEffect(() => {
    actionsRef.current = { startGame, backToMenu, resume, pause };
  }, [startGame, backToMenu, resume, pause]);

  // --- Klavye girdisi ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "w", "arrowdown", "s", "arrowleft", "a", "arrowright", "d"].includes(k)) {
        e.preventDefault();
      }
      if (engine.status === "menu" && (k === "enter" || k === " ")) {
        actionsRef.current.startGame();
        return;
      }
      if (engine.status === "game_over" && (k === "enter" || k === " ")) {
        actionsRef.current.backToMenu();
        return;
      }
      if (k === "p" || k === "escape") {
        if (engine.status === "playing") {
          engine.setStatus("paused");
          publish();
        } else if (engine.status === "paused") {
          actionsRef.current.resume();
        }
        return;
      }
      if (engine.status !== "playing") return;
      if (k === "arrowup" || k === "w") engine.setDirection("up");
      else if (k === "arrowdown" || k === "s") engine.setDirection("down");
      else if (k === "arrowleft" || k === "a") engine.setDirection("left");
      else if (k === "arrowright" || k === "d") engine.setDirection("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [publish]);

  const setDirection = useCallback(
    (dir: GameSnapshot["direction"]) => {
      engine.setDirection(dir);
    },
    [engine]
  );

  const nextTargetChar =
    snapshot.currentLetterIndex < snapshot.targetWord.length
      ? snapshot.targetWord[snapshot.currentLetterIndex]
      : null;

  // Dev test kancası
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __harfYilani?: unknown }).__harfYilani = {
      engine,
      setDirection,
      getSnapshot: () => engine.getSnapshot(),
      sound: SoundManager,
    };
  }, [engine, setDirection]);

  return {
    snapshot,
    startGame,
    retry,
    nextLevel,
    pause,
    resume,
    backToMenu,
    setDirection,
    nextTargetChar,
    stats,
    soundEnabled,
    toggleSound,
    resetAllStats,
    confettiTrigger,
    category,
    setCategory,
    leaderboard,
  };
}
