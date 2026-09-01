"use client";

// ============================================================================
// SettingsDialog — Ses aç/kapa, istatistikler, liderlik tablosu, sıfırla.
// shadcn/ui Dialog + Switch + Button + Tabs kullanır.
// ============================================================================

import { Settings, RotateCcw, Volume2, VolumeX, Trophy, Gamepad2, CheckCircle2, Medal, ListOrdered } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GameStats, LeaderboardEntry } from "@/lib/game/storage";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  stats: GameStats;
  soundEnabled: boolean;
  leaderboard: LeaderboardEntry[];
  onToggleSound: (v: boolean) => void;
  onReset: () => void;
}

export function SettingsDialog({ stats, soundEnabled, leaderboard, onToggleSound, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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
            Ses tercihleri, ilerlemen ve liderlik tablon.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/60">
            <TabsTrigger value="stats" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
              <Trophy className="mr-1.5 h-3.5 w-3.5" /> İstatistik
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
              <ListOrdered className="mr-1.5 h-3.5 w-3.5" /> Liderlik
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
                  <RotateCcw className="mr-2 h-4 w-4" /> İstatistikleri Sıfırla
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
        </Tabs>
      </DialogContent>
    </Dialog>
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
