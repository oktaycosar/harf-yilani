// ============================================================================
// TTSManager — Kelime tamamlandığında Türkçe sesli okuma (Web Speech API)
// ----------------------------------------------------------------------------
// Tarayıcının SpeechSynthesis API'sini kullanır. Harici bağımlılık yok.
// Türkçe ("tr-TR") dil tercih edilir, yoksa varsayılan dil kullanılır.
// ============================================================================

class TTSManagerImpl {
  private available: boolean = false;
  enabled: boolean = true;
  private volume: number = 0.9;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    this.available = true;
    // Sesler asenkron yüklenir
    this.refreshVoices();
    window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
  }

  private refreshVoices() {
    if (!this.available) return;
    try {
      this.voices = window.speechSynthesis.getVoices();
    } catch {
      this.voices = [];
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  /** Verilen kelimeyi Türkçe seslendir. */
  speak(text: string, opts?: { rate?: number; pitch?: number }) {
    if (!this.enabled || !this.available) return;
    if (!text) return;
    try {
      // Önceki konuşmayı iptal et
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "tr-TR";
      utterance.rate = opts?.rate ?? 0.9;
      utterance.pitch = opts?.pitch ?? 1.0;
      utterance.volume = this.volume;
      // Türkçe ses bul (varsa)
      const trVoice = this.voices.find((v) => v.lang === "tr-TR");
      if (trVoice) {
        utterance.voice = trVoice;
      } else {
        // tr içeren herhangi bir ses
        const trLike = this.voices.find((v) => v.lang.startsWith("tr"));
        if (trLike) utterance.voice = trLike;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // sessizce yoksay
    }
  }

  /** Konuşmayı durdur. */
  stop() {
    if (!this.available) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // yoksay
    }
  }

  isAvailable(): boolean {
    return this.available;
  }
}

export const TTSManager = new TTSManagerImpl();
