"use client";

// ============================================================================
// Overlays — Başlangıç, Oyun bitti, Bölüm tamamlandı, Yanlış harf, Duraklat
// panelleri. GameCanvas'ı saydam bir perdeyle örter.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, RotateCcw, Play, ChevronRight, HeartCrack, CheckCircle2, AlertTriangle, Pause, Trophy, Timer, Zap, Snowflake, CalendarClock, Baby, Volume2 } from "lucide-react";
import type { GameSnapshot } from "@/lib/game/types";
import type { GameStats } from "@/lib/game/storage";
import { CATEGORIES, type Category } from "@/lib/game/wordDatabase";
import { getTranslation, getDailyWord, isDailyCompleted } from "@/lib/game/translations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  snapshot: GameSnapshot;
  nextTargetChar: string | null;
  stats?: GameStats;
  isNewBest?: boolean;
  category: Category;
  onSetCategory: (c: Category) => void;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  easyMode: boolean;
  onToggleEasyMode: () => void;
  onStartDaily: () => void;
  onStart: () => void;
  onRetry: () => void;
  onContinue: () => void;
  onBackToMenu: () => void;
  onResume: () => void;
  ttsEnabled: boolean;
  onToggleTTS: () => void;
  onSpeakWord: (word: string) => void;
}

export function Overlays(props: Props) {
  const { snapshot } = props;
  const status = snapshot.status;
  return (
    <AnimatePresence>
      {status === "menu" && <MenuOverlay key="menu" {...props} />}
      {status === "game_over" && <GameOverOverlay key="go" {...props} />}
      {status === "level_complete" && <LevelCompleteOverlay key="lc" {...props} />}
      {(status === "wrong_letter" || status === "time_up") && snapshot.lives > 0 && (
        <WrongLetterOverlay key="wl" {...props} />
      )}
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

function MenuOverlay({ onStart, onStartDaily, stats, category, onSetCategory, showTranslation, onToggleTranslation, easyMode, onToggleEasyMode }: Props) {
  const dailyDone = isDailyCompleted();
  const dailyWord = getDailyWord();
  return (
    <Shell>
      <div className="max-h-[88vh] overflow-y-auto pr-1">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg shadow-emerald-500/40"
        >
          <Gamepad2 className="h-8 w-8 text-white" />
        </motion.div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Harf <span className="text-emerald-400">Yılanı</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Yılanı harflere ulaştır, hedef kelimeyi <span className="font-semibold text-amber-300">doğru sırayla</span> tamamla.
          Türkçe alfabe desteklidir.
        </p>

        {/* En iyi skor rozeti */}
        {stats && stats.bestScore > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
            <Trophy className="h-3.5 w-3.5" />
            En İyi Skor: {stats.bestScore} • Bölüm {stats.bestLevel}
          </div>
        )}

        {/* Günlük challenge kartı */}
        <button
          type="button"
          onClick={onStartDaily}
          disabled={dailyDone}
          className={cn(
            "mt-4 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
            dailyDone
              ? "border-slate-700/40 bg-slate-800/30 opacity-60"
              : "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-[1.01]"
          )}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <CalendarClock className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Günlük Kelime</div>
            <div className="text-[11px] text-slate-400">
              {dailyDone ? "Bugün tamamlandı! ✅" : "Bugünün özel kelimesi — +50 bonus"}
            </div>
          </div>
          {!dailyDone && <ChevronRight className="h-4 w-4 text-emerald-300" />}
        </button>

        {/* Kategori seçimi */}
        <div className="mt-4 text-left">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Kelime Kategorisi</p>
          <div className="grid grid-cols-5 gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSetCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
                  category === cat.id
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:bg-slate-700/40"
                )}
              >
                <span className="text-lg leading-none">{cat.icon}</span>
                <span className="text-[9px] font-semibold leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mod seçenekleri */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleTranslation}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
              showTranslation
                ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
                : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:bg-slate-700/40"
            )}
          >
            <span className="text-lg">🌐</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold">TR → EN</div>
              <div className="text-[9px] opacity-70">Çeviri göster</div>
            </div>
            <div className={cn("h-4 w-7 rounded-full transition-colors", showTranslation ? "bg-sky-500" : "bg-slate-600")}>
              <div className={cn("h-3.5 w-3.5 rounded-full bg-white transition-transform", showTranslation ? "translate-x-3" : "translate-x-0.5")} />
            </div>
          </button>
          <button
            type="button"
            onClick={onToggleEasyMode}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
              easyMode
                ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:bg-slate-700/40"
            )}
          >
            <Baby className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold">Kolay Mod</div>
              <div className="text-[9px] opacity-70">+2 can, engel yok</div>
            </div>
            <div className={cn("h-4 w-7 rounded-full transition-colors", easyMode ? "bg-amber-500" : "bg-slate-600")}>
              <div className={cn("h-3.5 w-3.5 rounded-full bg-white transition-transform", easyMode ? "translate-x-3" : "translate-x-0.5")} />
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 text-left text-xs text-slate-300">
          <p className="mb-1.5 font-semibold text-slate-200">Nasıl Oynanır?</p>
          <ul className="space-y-1">
            <li>• <b className="text-amber-300">Ok/WASD</b> ile yılanı yönlendir, <b className="text-amber-300">sıradaki harfi</b> ye.</li>
            <li>• <b className="text-purple-300">Mor yıldız</b> bonus (+25), <b className="text-amber-300">şimşek</b> hız boost (+15).</li>
            <li>• <b className="text-sky-300">Buz alanları</b> yavaşlatır, <b className="text-rose-300">engeller</b> öldürür.</li>
            <li>• Bölüm 16+ <b className="text-amber-300">süreli</b>. Combo ile ekstra puan!</li>
          </ul>
        </div>

        <Button onClick={onStart} size="lg" className="mt-4 w-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]">
          <Play className="mr-2 h-5 w-5" /> Oyna
        </Button>
        <p className="mt-2 text-[11px] text-slate-500">Enter / Space ile de başlat</p>
      </div>
    </Shell>
  );
}

function GameOverOverlay({ snapshot, onBackToMenu, stats, isNewBest }: Props) {
  return (
    <Shell tone="rose">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: 30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20"
        >
          <HeartCrack className="h-9 w-9 text-rose-400" />
        </motion.div>
        <h2 className="text-2xl font-extrabold text-white">Oyun Bitti</h2>
        <p className="mt-1 text-sm text-slate-400">Canların tükendi. Bölüm {snapshot.level} başarısız.</p>

        {isNewBest && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/50"
          >
            <Trophy className="h-3.5 w-3.5" /> YENİ REKOR!
          </motion.div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <Stat label="Skor" value={snapshot.score} highlight={isNewBest} />
          <Stat label="Bölüm" value={snapshot.level} />
          <Stat label="En Yüksek Combo" value={`×${snapshot.maxCombo}`} />
          <Stat label="En İyi Skor" value={stats?.bestScore ?? snapshot.score} />
        </div>

        <Button onClick={onBackToMenu} size="lg" className="mt-5 w-full bg-rose-500 text-white transition-transform hover:bg-rose-600 hover:scale-[1.02] active:scale-[0.98]">
          <RotateCcw className="mr-2 h-4 w-4" /> Menüye Dön
        </Button>
      </div>
    </Shell>
  );
}

function LevelCompleteOverlay({ snapshot, onContinue, showTranslation, ttsEnabled, onSpeakWord }: Props) {
  const translation = showTranslation ? getTranslation(snapshot.targetWord) : null;
  const word = snapshot.targetWord;
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
        {/* Harf-by-harf animasyonlu kelime gösterimi */}
        <div className="mt-2 flex justify-center gap-1">
          {word.split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0, y: 20, rotateY: 180 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateY: 0 }}
              transition={{
                delay: 0.15 + i * 0.12,
                type: "spring",
                stiffness: 260,
                damping: 16,
              }}
              className="flex h-12 w-10 items-center justify-center rounded-lg border-2 border-emerald-500/50 bg-emerald-500/20 text-2xl font-extrabold text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
            >
              {ch}
            </motion.span>
          ))}
        </div>
        {translation && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + word.length * 0.12 + 0.1 }}
            className="mt-2 text-sm text-slate-400"
          >
            <span className="text-slate-500">İngilizce: </span>
            <span className="font-semibold text-sky-300">{translation}</span>
          </motion.p>
        )}
        <p className="mt-1 text-xs text-slate-400">+50 bonus • Bölüm {snapshot.level} bitti</p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + word.length * 0.12 + 0.3 }}
          className="mt-5 flex gap-2"
        >
          {ttsEnabled && (
            <Button
              onClick={() => onSpeakWord(snapshot.targetWord)}
              size="lg"
              variant="outline"
              className="flex-1 border-sky-500/40 text-sky-300 hover:bg-sky-500/10"
            >
              <Volume2 className="mr-2 h-4 w-4" /> Tekrar Dinle
            </Button>
          )}
          <Button onClick={onContinue} size="lg" variant="outline" className={cn("border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10", ttsEnabled ? "flex-1" : "w-full")}>
            <ChevronRight className="mr-2 h-4 w-4" /> Sonraki Bölüm
          </Button>
        </motion.div>
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
  const isObstacle = ev.kind === "obstacle_collision";
  const isTimeUp = ev.kind === "time_up" || snapshot.status === "time_up";
  const title = isTimeUp ? "Süre Doldu!" : isObstacle ? "Engene Çarptın!" : isWall ? "Duvara Çarptın!" : isSelf ? "Kendine Çarptın!" : "Yanlış Harf!";
  const Icon = isTimeUp ? Timer : AlertTriangle;
  return (
    <Shell tone="amber">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
          <Icon className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white">{title}</h2>
        {!isWall && !isSelf && !isObstacle && !isTimeUp && (
          <p className="mt-1 text-sm text-slate-300">
            <span className="font-bold text-rose-400">{got}</span> yerine{" "}
            <span className="font-bold text-emerald-400">{expected}</span> harfi gerekliydi.
          </p>
        )}
        {isTimeUp && (
          <p className="mt-1 text-sm text-slate-300">
            Süre dolmadan kelimeyi tamamlayamadın.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">Bir can kaybettin. Kalan can: {snapshot.lives}</p>
        <Button onClick={onRetry} size="lg" className="mt-5 w-full bg-amber-500 text-white transition-transform hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98]">
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

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors",
      highlight
        ? "border-amber-500/50 bg-amber-500/15 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
        : "border-slate-700/50 bg-slate-800/40"
    )}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("mt-0.5 text-lg font-bold", highlight ? "text-amber-300" : "text-white")}>{value}</div>
    </div>
  );
}
