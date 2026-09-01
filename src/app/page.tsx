"use client";

// ============================================================================
// Harf Yılanı — Ana Sayfa (/)
// Tek oynanabilir route. GameManager (useSnakeGame) + HUD + Canvas + Overlays.
// ============================================================================

import { useEffect, useState } from "react";
import { Gamepad2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useSnakeGame } from "@/components/game/useSnakeGame";
import { GameCanvas } from "@/components/game/GameCanvas";
import { HUD } from "@/components/game/HUD";
import { Overlays } from "@/components/game/Overlays";
import { FloatingFeedback } from "@/components/game/FloatingFeedback";
import { TouchControls } from "@/components/game/TouchControls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  const game = useSnakeGame();
  const { snapshot, nextTargetChar } = game;
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const playing = snapshot.status === "playing" || snapshot.status === "paused";

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* ---------------------------------------------------------------- HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-md">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-extrabold tracking-tight">
                Harf <span className="text-emerald-400">Yılanı</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Türkçe kelime • yılan oyunu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {playing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (snapshot.status === "paused" ? game.resume() : game.pause())}
                className="text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {snapshot.status === "paused" ? (
                  <>
                    <Play className="mr-1 h-4 w-4" /> Devam
                  </>
                ) : (
                  <>
                    <Pause className="mr-1 h-4 w-4" /> Duraklat
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500"
              aria-label="Sessiz (yakında)"
              disabled
            >
              <VolumeX className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- MAIN */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-3 py-4 sm:px-4 sm:py-6">
        <HUD snapshot={snapshot} nextTargetChar={nextTargetChar} />

        {/* Oyun alanı */}
        <div className="relative mt-1 flex-1">
          <div
            className={cn(
              "relative h-[52vh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-800/60 shadow-2xl sm:h-[58vh] sm:min-h-[380px]",
              "bg-slate-950"
            )}
          >
            <GameCanvas snapshot={snapshot} nextTargetChar={nextTargetChar} />
            <FloatingFeedback snapshot={snapshot} />
            <Overlays
              snapshot={snapshot}
              nextTargetChar={nextTargetChar}
              onStart={game.startGame}
              onRetry={game.retry}
              onContinue={game.nextLevel}
              onBackToMenu={game.backToMenu}
              onResume={game.resume}
            />
          </div>

          {/* Mobil dokunmatik kontroller */}
          {isTouch && snapshot.status === "playing" && (
            <div className="mt-3 flex justify-center sm:hidden">
              <TouchControls
                visible={snapshot.status === "playing"}
                onDirection={game.setDirection}
              />
            </div>
          )}
        </div>

        {/* Yardımcı bilgi şeridi */}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span><kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">↑ ↓ ← →</kbd> / <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">WASD</kbd> hareket</span>
          <span><kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">P</kbd> / <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">ESC</kbd> duraklat</span>
          <span className="text-emerald-500">Sıradaki harf altın halkayla parlar</span>
        </div>
      </main>

      {/* ---------------------------------------------------------------- FOOTER */}
      <footer className="mt-auto border-t border-slate-800/60 bg-slate-950/80 py-3">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1 px-4 text-center text-[11px] text-slate-500 sm:flex-row sm:text-left">
          <p>
            <span className="font-semibold text-slate-400">Harf Yılanı</span> — Godot 4 +
            Next.js öğrenme oyunu. Türkçe alfabe desteklidir.
          </p>
          <p>Godot kaynak kodu: <code className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-400">godot-project/</code></p>
        </div>
      </footer>
    </div>
  );
}
