"use client";

// ============================================================================
// SettingsDialog — Ses aç/kapa, ses seviyesi, istatistikler, liderlik tablosu,
// achievement'lar, kategori ilerlemesi, sıfırla.
// ============================================================================

import { Settings, RotateCcw, Volume2, VolumeX, Trophy, Gamepad2, CheckCircle2, Medal, ListOrdered, Award, BarChart3, CalendarClock, X, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import type { GameStats, LeaderboardEntry, Achievement, CategoryProgress, WeeklyStatEntry } from "@/lib/game/storage";
import { CATEGORIES } from "@/lib/game/wordDatabase";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  stats: GameStats;
  soundEnabled: boolean;
  leaderboard: LeaderboardEntry[];
  achievements: Achievement[];
  categoryProgress: CategoryProgress;
  weeklyStats: WeeklyStatEntry[];
  soundVolume: number;
  ttsVolume: number;
  onToggleSound: (v: boolean) => void;
  onSoundVolume: (v: number) => void;
  onTtsVolume: (v: number) => void;
  onReset: () => void;
}

export function SettingsDialog({ stats, soundEnabled, leaderboard, achievements, categoryProgress, weeklyStats, soundVolume, ttsVolume, onToggleSound, onSoundVolume, onTtsVolume, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // ESC ile detail modalını kapat (dialog açıkken)
  useEffect(() => {
    if (!selectedAchievement) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAchievement(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedAchievement]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalAchievements = achievements.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmReset(false); }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Ayarlar"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-slate-700 bg-slate-900 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-400" />
            Ayarlar & İstatistikler
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Ses, başarımlar, liderlik ve ilerlemen.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/60">
            <TabsTrigger value="stats" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-[10px]">
              <Trophy className="mr-1 h-3 w-3" /> İstatistik
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-[10px]">
              <Award className="mr-1 h-3 w-3" /> Başarım
              <span className="ml-0.5 rounded bg-slate-600/50 px-1 text-[9px]">{unlockedCount}/{totalAchievements}</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-[10px]">
              <ListOrdered className="mr-1 h-3 w-3" /> Liderlik
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-[10px]">
              <BarChart3 className="mr-1 h-3 w-3" /> Kategori
            </TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-[10px]">
              <CalendarClock className="mr-1 h-3 w-3" /> Haftalık
            </TabsTrigger>
          </TabsList>

          {/* İstatistik sekmesi */}
          <TabsContent value="stats" className="space-y-3">
            {/* Ses */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-500" />
                )}
                <Label htmlFor="sound-switch" className="cursor-pointer text-sm font-medium">
                  Ses Efektleri
                </Label>
              </div>
              <Switch
                id="sound-switch"
                checked={soundEnabled}
                onCheckedChange={onToggleSound}
              />
            </div>

            {/* Ses seviyesi slider'ları */}
            {soundEnabled && (
              <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-300">🎵 Ses Efekt Seviyesi</Label>
                  <span className="text-[10px] tabular-nums text-slate-400">{Math.round(soundVolume * 100)}%</span>
                </div>
                <Slider
                  value={[soundVolume]}
                  onValueChange={(v) => onSoundVolume(v[0])}
                  min={0}
                  max={1}
                  step={0.05}
                  className="py-1"
                />
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-300">💬 Sesli Okuma Seviyesi</Label>
                  <span className="text-[10px] tabular-nums text-slate-400">{Math.round(ttsVolume * 100)}%</span>
                </div>
                <Slider
                  value={[ttsVolume]}
                  onValueChange={(v) => onTtsVolume(v[0])}
                  min={0}
                  max={1}
                  step={0.05}
                  className="py-1"
                />
              </div>
            )}

            {/* İstatistikler */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={<Trophy className="h-4 w-4 text-amber-400" />} label="En İyi Skor" value={stats.bestScore} />
              <StatCard icon={<Gamepad2 className="h-4 w-4 text-emerald-400" />} label="En İleri Bölüm" value={stats.bestLevel} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4 text-sky-400" />} label="Tamamlanan Kelime" value={stats.totalWordsCompleted} />
              <StatCard icon={<RotateCcw className="h-4 w-4 text-rose-400" />} label="Toplam Oyun" value={stats.totalGames} />
            </div>

            {/* Sıfırla */}
            <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-3">
              {!confirmReset ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-rose-300 hover:bg-rose-900/30 hover:text-rose-200"
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Tüm Verileri Sıfırla
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-rose-300">Emin misin? Bu işlem geri alınamaz.</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onReset();
                      setConfirmReset(false);
                    }}
                  >
                    Evet, sıfırla
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                    Vazgeç
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Achievement sekmesi */}
          <TabsContent value="achievements">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {achievements.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAchievement(a)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all hover:scale-[1.01]",
                    a.unlocked
                      ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
                      : "border-slate-700/50 bg-slate-800/30 opacity-80 hover:bg-slate-800/50"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-lg",
                    a.unlocked ? "bg-amber-500/20" : "bg-slate-700/40 grayscale"
                  )}>
                    {a.unlocked ? a.icon : "🔒"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("truncate text-xs font-bold", a.unlocked ? "text-amber-200" : "text-slate-400")}>
                      {a.title}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {a.description}
                    </div>
                  </div>
                  {a.unlocked && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />}
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Liderlik sekmesi */}
          <TabsContent value="leaderboard">
            {leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Medal className="mb-2 h-10 w-10 text-slate-600" />
                <p className="text-sm text-slate-400">Henüz skor yok.</p>
                <p className="text-xs text-slate-500">Oyna ve ilk skoru sen kaydet!</p>
              </div>
            ) : (
              <ScrollArea className="h-[320px] rounded-lg border border-slate-700/60 bg-slate-800/30">
                <div className="p-2">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={`${entry.date}-${i}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-slate-700/40",
                        i === 0 && "bg-amber-500/10",
                        i === 1 && "bg-slate-400/5",
                        i === 2 && "bg-orange-700/5"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          i === 0
                            ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50"
                            : i === 1
                              ? "bg-slate-400/20 text-slate-300"
                              : i === 2
                                ? "bg-orange-700/20 text-orange-400"
                                : "bg-slate-700/40 text-slate-400"
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold text-amber-300">{entry.score}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(entry.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>Bölüm {entry.level}</span>
                          <span>•</span>
                          <span className="truncate">{entry.word}</span>
                        </div>
                      </div>
                      {i === 0 && <Trophy className="h-4 w-4 text-amber-400" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Kategori ilerleme sekmesi */}
          <TabsContent value="categories">
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const completed = categoryProgress[cat.id] ?? 0;
                const target = 10; // hedef kelime sayısı
                const percent = Math.min(100, (completed / target) * 100);
                return (
                  <div key={cat.id} className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-sm font-semibold text-slate-200">{cat.label}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-300">
                        {completed} / {target}
                        {completed >= target && " ✅"}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Haftalık istatistik sekmesi */}
          <TabsContent value="weekly">
            <WeeklyTab weeklyStats={weeklyStats} />
          </TabsContent>
        </Tabs>

        {/* Achievement detay modalı */}
        {selectedAchievement && (
          <AchievementDetailModal
            achievement={selectedAchievement}
            onClose={() => setSelectedAchievement(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// WeeklyTab — Son 7 günün skorlarını basit bar chart ile gösterir
// ----------------------------------------------------------------------------
function WeeklyTab({ weeklyStats }: { weeklyStats: WeeklyStatEntry[] }) {
  const maxScore = Math.max(1, ...weeklyStats.map((d) => d.score));
  const totalGames = weeklyStats.reduce((sum, d) => sum + d.gamesPlayed, 0);
  const totalScore = weeklyStats.reduce((sum, d) => sum + d.score, 0);
  const bestDay = weeklyStats.reduce(
    (best, d) => (d.score > best.score ? d : best),
    weeklyStats[0] ?? { date: "", gamesPlayed: 0, score: 0 }
  );

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][d.getDay()];
  };
  const dayNum = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return String(d.getDate());
  };
  const isToday = (dateStr: string) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return dateStr === `${y}-${m}-${day}`;
  };

  return (
    <div className="space-y-3">
      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Toplam Oyun</div>
          <div className="mt-0.5 text-lg font-bold text-emerald-300">{totalGames}</div>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">En İyi Gün</div>
          <div className="mt-0.5 text-lg font-bold text-amber-300">{bestDay.score}</div>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Hafta Skoru</div>
          <div className="mt-0.5 text-lg font-bold text-sky-300">{totalScore}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <CalendarClock className="h-3.5 w-3.5 text-emerald-400" /> Son 7 Gün
          </span>
          <span className="text-[10px] text-slate-500">En iyi skor (gün başına)</span>
        </div>
        <div className="flex h-40 items-end justify-between gap-2">
          {weeklyStats.map((d) => {
            const heightPct = d.score === 0 ? 4 : Math.max(8, (d.score / maxScore) * 100);
            const today = isToday(d.date);
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-bold tabular-nums text-slate-300">
                  {d.score > 0 ? d.score : ""}
                </span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-[28px] rounded-t-md transition-all duration-500",
                      today
                        ? "bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                        : "bg-gradient-to-t from-emerald-700 to-emerald-400"
                    )}
                    style={{ height: `${heightPct}%` }}
                    title={`${dayLabel(d.date)} ${dayNum(d.date)}: ${d.score} puan, ${d.gamesPlayed} oyun`}
                  />
                </div>
                <div className="flex flex-col items-center leading-tight">
                  <span className={cn("text-[10px] font-bold", today ? "text-amber-300" : "text-slate-400")}>
                    {dayLabel(d.date)}
                  </span>
                  <span className="text-[9px] text-slate-500">{dayNum(d.date)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {totalGames === 0 && (
          <p className="mt-2 text-center text-[11px] text-slate-500">
            Bu hafta henüz oyun oynamadın. Başla ve grafiği doldur! 🎮
          </p>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// AchievementDetailModal — Tıklanan achievement için detay popup
// ----------------------------------------------------------------------------
function AchievementDetailModal({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const a = achievement;
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${a.title} detayı`}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border p-5 shadow-2xl",
          a.unlocked
            ? "border-amber-500/40 bg-gradient-to-br from-amber-950/60 to-slate-900"
            : "border-slate-700/60 bg-slate-900"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl text-4xl",
              a.unlocked ? "bg-amber-500/20" : "bg-slate-700/40 grayscale"
            )}
          >
            {a.unlocked ? a.icon : <Lock className="h-7 w-7 text-slate-500" />}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className={cn("mt-3 text-xl font-extrabold", a.unlocked ? "text-amber-200" : "text-slate-300")}>
          {a.title}
        </h3>
        <p className="mt-1 text-sm text-slate-400">{a.description}</p>

        {a.unlocked ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300">Açıldı</div>
              <div className="text-xs font-semibold text-emerald-200">
                {a.unlockedAt
                  ? new Date(a.unlockedAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Bilinmiyor"}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
            <Lock className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Kilitli</div>
              <div className="text-xs font-semibold text-slate-400">Henüz açılmadı</div>
            </div>
          </div>
        )}

        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          className={cn(
            "mt-4 w-full",
            a.unlocked
              ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              : "border-slate-600 text-slate-300 hover:bg-slate-800"
          )}
        >
          Kapat
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
    </div>
  );
}
