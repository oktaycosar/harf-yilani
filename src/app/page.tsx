"use client";

// ============================================================================
// Harf Yılanı — Ana Sayfa (/)
// Tek oynanabilir route. GameManager (useSnakeGame) + HUD + Canvas + Overlays
// + Ses + localStorage istatistik + konfeti + swipe.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { Gamepad2, Pause, Play, Volume2, VolumeX, Trophy, MessageCircle } from "lucide-react";
import { useSnakeGame } from "@/components/game/useSnakeGame";
import { GameCanvas } from "@/components/game/GameCanvas";
import { HUD } from "@/components/game/HUD";
import { Overlays } from "@/components/game/Overlays";
import { FloatingFeedback } from "@/components/game/FloatingFeedback";
import { TouchControls } from "@/components/game/TouchControls";
import { ConfettiBurst } from "@/components/game/ConfettiBurst";
import { SettingsDialog } from "@/components/game/SettingsDialog";
import { ComboFlash } from "@/components/game/ComboFlash";
import { LevelTransition } from "@/components/game/LevelTransition";
import { useSwipe } from "@/components/game/useSwipe";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  const game = useSnakeGame();
  const { snapshot, nextTargetChar } = game;
  const [isTouch, setIsTouch] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Swipe ile yön kontrolü (mobil)
  useSwipe(gameAreaRef, {
    onDirection: game.setDirection,
    enabled: snapshot.status === "playing",
  });

  const playing = snapshot.status === "playing" || snapshot.status === "paused";
  const isNewBest = game.stats.bestScore > 0 && snapshot.score > 0 && snapshot.score >= game.stats.bestScore;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* ---------------------------------------------------------------- ANIMATED BG */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Gradient mesh blobs */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl animate-blob" />
        <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl animate-blob [animation-delay:4s]" />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ---------------------------------------------------------------- HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-md shadow-emerald-500/30">
              <Gamepad2 className="h-5 w-5 text-white" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-400/80" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
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
            {/* En iyi skor rozeti */}
            {game.stats.bestScore > 0 && (
              <div className="mr-1 hidden items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 sm:inline-flex">
                <Trophy className="h-3.5 w-3.5" />
                En İyi: {game.stats.bestScore}
              </div>
            )}
            {playing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (snapshot.status === "paused" ? game.resume() : game.pause())}
                className="text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
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
              onClick={game.toggleSound}
              aria-label={game.soundEnabled ? "Sesi kapat" : "Sesi aç"}
              className={cn(
                "transition-colors",
                game.soundEnabled
                  ? "text-emerald-400 hover:bg-emerald-500/10"
                  : "text-slate-500 hover:bg-slate-800"
              )}
            >
              {game.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={game.toggleTTS}
              aria-label={game.ttsEnabled ? "Sesli okumayı kapat" : "Sesli okumayı aç"}
              title={game.ttsEnabled ? "Sesli okuma açık" : "Sesli okuma kapalı"}
              className={cn(
                "transition-colors",
                game.ttsEnabled
                  ? "text-sky-400 hover:bg-sky-500/10"
                  : "text-slate-500 hover:bg-slate-800"
              )}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <SettingsDialog
              stats={game.stats}
              soundEnabled={game.soundEnabled}
              leaderboard={game.leaderboard}
              onToggleSound={(v) => {
                if (v !== game.soundEnabled) game.toggleSound();
              }}
              onReset={game.resetAllStats}
            />
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- MAIN */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-3 py-4 sm:px-4 sm:py-6">
        <HUD snapshot={snapshot} nextTargetChar={nextTargetChar} bestScore={game.stats.bestScore} />

        {/* Oyun alanı */}
        <div className="relative mt-1 flex-1">
          <div
            ref={gameAreaRef}
            className={cn(
              "relative h-[52vh] min-h-[320px] w-full overflow-hidden rounded-2xl border shadow-2xl sm:h-[58vh] sm:min-h-[380px]",
              "border-slate-800/60 bg-slate-950 shadow-emerald-950/30"
            )}
          >
            <GameCanvas snapshot={snapshot} nextTargetChar={nextTargetChar} />
            <FloatingFeedback snapshot={snapshot} />
            <ConfettiBurst trigger={game.confettiTrigger} wordLength={snapshot.targetWord.length || 3} />
            <ComboFlash combo={snapshot.combo} status={snapshot.status} />
            <LevelTransition level={snapshot.level} tierName={snapshot.tierName} status={snapshot.status} />
            <Overlays
              snapshot={snapshot}
              nextTargetChar={nextTargetChar}
              stats={game.stats}
              isNewBest={isNewBest}
              category={game.category}
              onSetCategory={game.setCategory}
              showTranslation={game.showTranslation}
              onToggleTranslation={game.toggleTranslation}
              easyMode={game.easyMode}
              onToggleEasyMode={game.toggleEasyMode}
              onStartDaily={game.startDaily}
              onStart={game.startGame}
              onRetry={game.retry}
              onContinue={game.nextLevel}
              onBackToMenu={game.backToMenu}
              onResume={game.resume}
              ttsEnabled={game.ttsEnabled}
              onToggleTTS={game.toggleTTS}
              onSpeakWord={(word) => {
                import("@/lib/game/tts").then(({ TTSManager }) => TTSManager.speak(word));
              }}
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
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">↑↓←→</kbd>
            <span className="text-slate-400">/</span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">WASD</kbd>
            <span>hareket</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">P</kbd>
            <span className="text-slate-400">/</span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">ESC</kbd>
            <span>duraklat</span>
          </span>
          {isTouch && (
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              kaydırarak hareket ettir
            </span>
          )}
          <span className="flex items-center gap-1 text-emerald-500">
            <span className="h-1 w-1 rounded-full bg-amber-400" />
            sıradaki harf altın halkayla parlar
          </span>
        </div>
      </main>

      {/* ---------------------------------------------------------------- FOOTER */}
      <footer className="relative z-10 mt-auto border-t border-slate-800/60 bg-slate-950/80 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1 px-4 text-center text-[11px] text-slate-500 sm:flex-row sm:text-left">
          <p className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-400">Harf Yılanı</span>
            <span className="text-slate-600">•</span>
            <span>Godot 4 + Next.js öğrenme oyunu</span>
            <span className="text-slate-600">•</span>
            <span>Türkçe alfabe</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span>Godot kaynak:</span>
            <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-emerald-400">godot-project/</code>
          </p>
        </div>
      </footer>
    </div>
  );
}
