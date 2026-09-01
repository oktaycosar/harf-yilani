"use client";

// ============================================================================
// SettingsDialog — Ses aç/kapa, istatistikler, verileri sıfırla.
// shadcn/ui Dialog + Switch + Button kullanır.
// ============================================================================

import { Settings, RotateCcw, Volume2, VolumeX, Trophy, Gamepad2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GameStats } from "@/lib/game/storage";
import { useState } from "react";

interface Props {
  stats: GameStats;
  soundEnabled: boolean;
  onToggleSound: (v: boolean) => void;
  onReset: () => void;
}

export function SettingsDialog({ stats, soundEnabled, onToggleSound, onReset }: Props) {
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
      <DialogContent className="border-slate-700 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-400" />
            Ayarlar & İstatistikler
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Ses tercihleri ve oyun ilerlemeniz.
          </DialogDescription>
        </DialogHeader>

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
