// ============================================================================
// SoundManager — Web Audio API ile生成 ses efektleri (asset dosyası yok)
// ----------------------------------------------------------------------------
// Tarayıcıda anlık sentezlenen kısa tonlar. Dışarıdan ses dosyası gerektirmez,
// çevrimdışı çalışır, <1KB内存. Tüm oyun seslerini tek bir AudioContext'ten
// üretir. Kullanıcı etkileşimiyle (ilk tıklama) resume edilir (autoplay policy).
// ============================================================================

export type SfxName =
  | "correct"
  | "wrong"
  | "word_complete"
  | "game_over"
  | "level_up"
  | "menu_click"
  | "start"
  | "bonus"
  | "time_warning"
  | "boost"
  | "ice";

class SoundManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  volume = 0.35;

  /** İlk kullanıcı etkileşiminde çağrılmalı (autoplay policy) */
  ensureContext() {
    if (typeof window === "undefined") return;
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(name: SfxName) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    switch (name) {
      case "correct":
        this.tone(now, 660, 0.08, "sine", 0.5);
        this.tone(now + 0.06, 880, 0.1, "sine", 0.4);
        break;
      case "wrong":
        this.tone(now, 220, 0.12, "sawtooth", 0.4);
        this.tone(now + 0.08, 165, 0.18, "square", 0.3);
        break;
      case "word_complete":
        // kısa zafer akoru: C-E-G-C
        this.tone(now, 523.25, 0.12, "triangle", 0.5);
        this.tone(now + 0.1, 659.25, 0.12, "triangle", 0.5);
        this.tone(now + 0.2, 783.99, 0.12, "triangle", 0.5);
        this.tone(now + 0.3, 1046.5, 0.22, "triangle", 0.55);
        break;
      case "level_up":
        this.tone(now, 440, 0.1, "square", 0.35);
        this.tone(now + 0.1, 554, 0.1, "square", 0.35);
        this.tone(now + 0.2, 659, 0.16, "square", 0.4);
        break;
      case "game_over":
        this.tone(now, 392, 0.18, "sawtooth", 0.4);
        this.tone(now + 0.18, 311, 0.2, "sawtooth", 0.4);
        this.tone(now + 0.38, 247, 0.35, "sawtooth", 0.45);
        break;
      case "menu_click":
        this.tone(now, 880, 0.04, "sine", 0.3);
        break;
      case "start":
        this.tone(now, 523, 0.08, "triangle", 0.4);
        this.tone(now + 0.08, 784, 0.14, "triangle", 0.45);
        break;
      case "bonus":
        // Parlak yükselen ikili ton (bonus yakalandı)
        this.tone(now, 988, 0.06, "sine", 0.4);
        this.tone(now + 0.05, 1319, 0.1, "sine", 0.45);
        this.tone(now + 0.13, 1568, 0.12, "sine", 0.4);
        break;
      case "time_warning":
        // Kısa tik-tak uyarısı (son 5 saniye)
        this.tone(now, 880, 0.04, "square", 0.25);
        this.tone(now + 0.12, 880, 0.04, "square", 0.25);
        break;
      case "boost":
        // Hız artırıcı: yükselen süpürme (whoosh benzeri)
        this.tone(now, 400, 0.06, "sawtooth", 0.3);
        this.tone(now + 0.05, 600, 0.06, "sawtooth", 0.35);
        this.tone(now + 0.1, 900, 0.08, "sawtooth", 0.4);
        this.tone(now + 0.18, 1200, 0.1, "sine", 0.35);
        break;
      case "ice":
        // Buz: soğuk kristal ton (yüksek frekans, kısa)
        this.tone(now, 1568, 0.08, "sine", 0.25);
        this.tone(now + 0.06, 2093, 0.1, "sine", 0.2);
        this.tone(now + 0.14, 2637, 0.08, "triangle", 0.15);
        break;
    }
  }

  private tone(
    when: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number
  ) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // ADSR-benzeri kısa envelope (click önleme)
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}

// Tekil örnek
export const SoundManager = new SoundManagerImpl();
