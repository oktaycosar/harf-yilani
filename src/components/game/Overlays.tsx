"use client";

// ============================================================================
// Overlays — Başlangıç, Oyun bitti, Bölüm tamamlandı, Yanlış harf, Duraklat
// panelleri. GameCanvas'ı saydam bir perdeyle örter.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, RotateCcw, Play, ChevronRight, HeartCrack, CheckCircle2, AlertTriangle, Pause } from "lucide-react";
import type { GameSnapshot } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  snapshot: GameSnapshot;
  nextTargetChar: string | null;
  onStart: () => void;
  onRetry: () => void;
  onContinue: () => void;
  onBackToMenu: () => void;
  onResume: () => void;
}

export function Overlays(props: Props) {
  const { snapshot } = props;
  const status = snapshot.status;
  return (
    <AnimatePresence>
      {status === "menu" && <MenuOverlay key="menu" {...props} />}
      {status === "game_over" && <GameOverOverlay key="go" {...props} />}
      {status === "level_complete" && <LevelCompleteOverlay key="lc" {...props} />}
      {status === "wrong_letter" && snapshot.lives > 0 && <WrongLetterOverlay key="wl" {...props} />}
      {status === "paused" && <PauseOverlay key="pa" {...props} />}
    </AnimatePresence>
  );
}

// ----------------------------------------------------------------------------
function Shell({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "rose" | "emerald" | "amber" }) {
  const toneClass = {
    slate: "from-slate-900/80 to-slate-950/80",
    rose: "from-rose-950/80 to-slate-950/85",
    emerald: "from-emerald-950/80 to-slate-950/85",
    amber: "from-amber-950/80 to-slate-950/85",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-gradient-to-br p-4 backdrop-blur-sm",
        toneClass
      )}
    >
      <motion.div
        initial={{ scale: 0.92, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function MenuOverlay({ onStart }: Props) {
  return (
    <Shell>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg">
          <Gamepad2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Harf <span className="text-emerald-400">Yılanı</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Yılanı harflere ulaştır, hedef kelimeyi <span className="font-semibold text-amber-300">doğru sırayla</span> tamamla.
          Türkçe alfabe desteklidir.
        </p>

        <div className="mt-5 rounded-lg border border-slate-700/50 bg-slate-800/40 p-4 text-left text-xs text-slate-300">
          <p className="mb-2 font-semibold text-slate-200">Nasıl Oynanır?</p>
          <ul className="space-y-1.5">
            <li>• <b className="text-amber-300">Ok tuşları</b> / <b className="text-amber-300">WASD</b> ile yılanı yönlendir.</li>
            <li>• Üstteki hedef kelimenin <b className="text-amber-300">sıradaki harfi</b> altın renkte parlar.</li>
            <li>• Sıradan farklı bir harfe çarparsan <b className="text-rose-300">can kaybedersin</b>.</li>
            <li>• Aynı harften birden fazla varsa <b className="text-amber-300">sırayı</b> takip et!</li>
            <li>• Duvara veya kendine çarpma.</li>
          </ul>
        </div>

        <Button onClick={onStart} size="lg" className="mt-5 w-full bg-emerald-500 text-white hover:bg-emerald-600">
          <Play className="mr-2 h-5 w-5" /> Oyna
        </Button>
        <p className="mt-2 text-[11px] text-slate-500">Enter / Space ile de başlat</p>
      </div>
    </Shell>
  );
}

function GameOverOverlay({ snapshot, onBackToMenu }: Props) {
  return (
    <Shell tone="rose">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
          <HeartCrack className="h-9 w-9 text-rose-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Oyun Bitti</h2>
        <p className="mt-1 text-sm text-slate-400">Canların tükendi. Bölüm {snapshot.level} başarısız.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <Stat label="Skor" value={snapshot.score} />
          <Stat label="Bölüm" value={snapshot.level} />
          <Stat label="En Yüksek Combo" value={`×${snapshot.maxCombo}`} />
          <Stat label="Son Kelime" value={snapshot.targetWord || "—"} />
        </div>

        <Button onClick={onBackToMenu} size="lg" className="mt-5 w-full bg-rose-500 text-white hover:bg-rose-600">
          <RotateCcw className="mr-2 h-4 w-4" /> Menüye Dön
        </Button>
      </div>
    </Shell>
  );
}

function LevelCompleteOverlay({ snapshot, onContinue }: Props) {
  return (
    <Shell tone="emerald" key={`lc-${snapshot.level}`}>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
        >
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        </motion.div>
        <h2 className="text-2xl font-extrabold text-white">Kelime Tamamlandı!</h2>
        <p className="mt-1 text-lg font-bold text-emerald-300">{snapshot.targetWord}</p>
        <p className="mt-1 text-xs text-slate-400">+50 bonus • Bölüm {snapshot.level} bitti</p>
        <Button onClick={onContinue} size="lg" variant="outline" className="mt-5 w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
          <ChevronRight className="mr-2 h-4 w-4" /> Sonraki Bölüm
        </Button>
      </div>
    </Shell>
  );
}

function WrongLetterOverlay({ snapshot, onRetry }: Props) {
  const ev = snapshot.lastEvent;
  const expected = ev.kind === "ate_wrong" ? ev.expected : "?";
  const got = ev.kind === "ate_wrong" ? ev.char : "?";
  const isWall = ev.kind === "wall_collision";
  const isSelf = ev.kind === "self_collision";
  return (
    <Shell tone="amber">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white">
          {isWall ? "Duvara Çarptın!" : isSelf ? "Kendine Çarptın!" : "Yanlış Harf!"}
        </h2>
        {!isWall && !isSelf && (
          <p className="mt-1 text-sm text-slate-300">
            <span className="font-bold text-rose-400">{got}</span> yerine{" "}
            <span className="font-bold text-emerald-400">{expected}</span> harfi gerekliydi.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">Bir can kaybettin. Kalan can: {snapshot.lives}</p>
        <Button onClick={onRetry} size="lg" className="mt-5 w-full bg-amber-500 text-white hover:bg-amber-600">
          <RotateCcw className="mr-2 h-4 w-4" /> Tekrar Dene
        </Button>
        <p className="mt-1.5 text-[11px] text-slate-500">Otomatik yeniden başlatılıyor…</p>
      </div>
    </Shell>
  );
}

function PauseOverlay({ onResume }: Props) {
  return (
    <Shell tone="slate">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-600/30">
          <Pause className="h-7 w-7 text-slate-300" />
        </div>
        <h2 className="text-xl font-extrabold text-white">Duraklatıldı</h2>
        <p className="mt-1 text-xs text-slate-400">Devam etmek için P / ESC veya butona bas.</p>
        <Button onClick={onResume} size="lg" className="mt-5 w-full bg-emerald-500 text-white hover:bg-emerald-600">
          <Play className="mr-2 h-4 w-4" /> Devam Et
        </Button>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
