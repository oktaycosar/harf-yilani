"use client";

// ============================================================================
// useSnakeGame — React tarafında GameManager görevi görür.
// SnakeEngine'i sarmalar, oyun döngüsünü (requestAnimationFrame + accumulator)
// çalıştırır, klavye/dokunma girdisini yönetir, bölüm akışını idare eder.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { SnakeEngine, type EngineEvent } from "@/lib/game/snakeEngine";
import { getDifficultyForLevel, pickWordForLevel } from "@/lib/game/difficulty";
import {
  LEVEL_COMPLETE_DELAY,
  START_LIVES,
  WRONG_LETTER_DELAY,
} from "@/lib/game/constants";
import type { GameSnapshot } from "@/lib/game/types";

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
}

export function useSnakeGame(): UseSnakeGameApi {
  // Engine'i useState lazy-init ile bir kez oluştur (mutasyon için kullanırız,
  // setState çağırmıyoruz). Ref yerine state kullanmak render sırasında
  // ref.current erişimi lint hatasını önler.
  const [engine] = useState(() => new SnakeEngine());

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engine.getSnapshot());
  const recentWordsRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(0);
  const accRef = useRef<number>(0);

  const publish = useCallback(() => {
    setSnapshot(engine.getSnapshot());
  }, [engine]);

  // --- Olay işleme ---
  // Oyun döngüsü her karede publish() çağırır, bu yüzden ek bir onEvent
  // mekanizmasına gerek yok. Motor içindeki lastEvent alanı snapshot'a yansır.

  // --- Bölüm yükleme yardımcısı ---
  const loadLevel = useCallback(
    (level: number) => {
      const diff = getDifficultyForLevel(level);
      const { word } = pickWordForLevel(level, recentWordsRef.current);
      recentWordsRef.current = [...recentWordsRef.current.slice(-6), word];
      engine.loadLevel(level, word, diff.tier.name, diff.stepMs, diff.tier.tricky);
      lastStepRef.current = performance.now();
      accRef.current = 0;
      publish();
    },
    [engine, publish]
  );

  // --- Oyun döngüsü ---
  // Durum değiştiğinde publish eder (imza karşılaştırması ile gereksiz
  // render önlenir). Bu, manuel tick'lerde ve nadir geçişlerde React'in
  // güncel kalmasını sağlar.
  const lastSigRef = useRef<string>("");
  useEffect(() => {
    const loop = (now: number) => {
      if (engine.status === "playing") {
        const dt = now - lastStepRef.current;
        lastStepRef.current = now;
        accRef.current += dt;
        // Tick sınırına ulaşınca adım at
        while (accRef.current >= engine.stepMs) {
          accRef.current -= engine.stepMs;
          engine.tick();
          if (engine.status !== "playing") break;
        }
      }
      // Her karede imzayı kontrol et, değiştiyse publish et
      const s = engine.getSnapshot();
      const ev = s.lastEvent;
      const sig = `${s.status}|${s.score}|${s.lives}|${s.combo}|${s.level}|${s.currentLetterIndex}|${s.snake.length}|${s.snake[0]?.x ?? -1}|${s.snake[0]?.y ?? -1}|${ev.kind}|${"index" in ev ? ev.index : ""}|${"char" in ev ? ev.char : ""}`;
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
  }, [engine]);

  // --- Durum geçişleri için zamanlayıcılar ---
  useEffect(() => {
    if (snapshot.status === "level_complete") {
      const t = setTimeout(() => {
        engine.incrementLevel();
        loadLevel(engine.level);
      }, LEVEL_COMPLETE_DELAY);
      return () => clearTimeout(t);
    }
    if (snapshot.status === "wrong_letter" && snapshot.lives > 0) {
      // Yanlış harfte kısa bekleme sonra aynı bölümü yeniden yükle
      const t = setTimeout(() => {
        engine.retryLevel();
        publish();
      }, WRONG_LETTER_DELAY);
      return () => clearTimeout(t);
    }
  }, [snapshot.status, snapshot.lives, engine, loadLevel, publish]);

  // --- Dışarı açılan API (klavye effect'inden önce tanımla) ---
  const startGame = useCallback(() => {
    engine.resetRun();
    recentWordsRef.current = [];
    loadLevel(1);
  }, [engine, loadLevel]);

  const retry = useCallback(() => {
    engine.retryLevel();
    lastStepRef.current = performance.now();
    accRef.current = 0;
    publish();
  }, [engine, publish]);

  const nextLevel = useCallback(() => {
    engine.incrementLevel();
    loadLevel(engine.level);
  }, [engine, loadLevel]);

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
    engine.resetAll();
    publish();
  }, [engine, publish]);

  // En son aksiyonları ref'te tut (klavye handler'ı stale closure yaşamaz)
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

  // Dev test kancası: tarayıcı konsolundan motor durumunu okumayı sağlar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __harfYilani?: unknown }).__harfYilani = {
      engine,
      setDirection,
      getSnapshot: () => engine.getSnapshot(),
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
  };
}
