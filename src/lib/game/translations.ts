// ============================================================================
// Harf Yılanı — TR→EN Kelime Çevirileri + Günlük Kelime Sistemi
// ----------------------------------------------------------------------------
// Türkçe kelimelerin İngilizce karşılıkları. Kelime tamamlandığında çeviriyi
// gösterir ve (opsiyonel) sesli okuma yapar. Günlük challenge için tarih
// bazlı kelime seçimi.
// ============================================================================

export const TR_EN_DICT: Record<string, string> = {
  // 3 harf
  ADA: "island", ANA: "mother", ARI: "bee", BAL: "honey", DAL: "branch",
  GÜL: "rose", KOL: "arm", ÇAY: "tea", AŞK: "love", SÜT: "milk",
  YAĞ: "oil", KÖY: "village", GÖL: "lake", YIL: "year", SAÇ: "hair",
  SUÇ: "crime", BEŞ: "five", DİŞ: "tooth", GÜÇ: "power", SÖZ: "word",
  YÜZ: "face", ÇOK: "much", ÖZÜ: "essence", EKİ: "affix", İŞİ: "his work",
  // 4 harf
  ADAM: "man", MASA: "table", ELMA: "apple", KAPI: "door", BABA: "father",
  KALE: "castle", EVİM: "my house", ÇİLE: "suffering", BORU: "pipe",
  BALO: "ball", EKİM: "October", KÜPE: "earring", YAZI: "text",
  BORA: "bora", DURU: "clear", SABA: "saba", TUĞL: "brick",
  DİŞİ: "female", SUCU: "water seller", YÜZÜ: "his face", GÖLÜ: "his lake",
  GÖCE: "migration", KEÇİ: "goat", EŞEK: "donkey", TAVU: "rooster",
  BALI: "honey (acc)", KOYU: "dark", KUŞU: "his bird", ARIK: "lean",
  // 5 harf
  KİTAP: "book", KALEM: "pencil", ÇİÇEK: "flower", BULUT: "cloud",
  DENİZ: "sea", YILAN: "snake", BALIK: "fish", KÖPRÜ: "bridge",
  SİNEK: "fly", GÜNEŞ: "sun", MAKAS: "scissors", DEFNE: "laurel",
  KAĞIT: "paper", ÇANTA: "bag", BİLGİ: "knowledge", SULAR: "waters",
  BİLGE: "wise", MÜZİK: "music", SEBZE: "vegetable", ARMUT: "pear",
  TAVUK: "chicken", GÖMLE: "shirt", CAMLI: "glassy", EKMEK: "bread",
  ARPA: "barley", ÇİLEK: "strawberry", KARPU: "watermelon",
  // 6 harf
  BİLİM: "science", BAHÇE: "garden", KAHVE: "coffee", GÖMLEK: "shirt",
  BÖLÜM: "section", YILDIZ: "star", KUŞLAR: "birds", ŞARKIL: "song",
  KAĞIDI: "his paper", SEPETİ: "his basket", TRENLER: "trains",
  SOKAKL: "street", YATAKL: "bed", ÇOCUKL: "child", KAPILA: "gates",
  TORBASI: "his bag", TARÇIN: "cinnamon", TAVŞAN: "rabbit",
};

/**
 * Türkçe kelimenin İngilizce çevirisini döndürür. Yoksa null.
 */
export function getTranslation(trWord: string): string | null {
  return TR_EN_DICT[trWord.toUpperCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Günlük kelime challenge'i
// ---------------------------------------------------------------------------

/** YYYY-MM-DD formatında bugünün tarih anahtarı */
export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date'ten seed üret (günlük deterministik kelime için) */
function dateSeed(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Günlük challenge kelimesini döndürür (tarihe göre deterministik) */
export function getDailyWord(): string {
  const allWords: string[] = [];
  // 4-5 harfli kelimeleri topla (orta zorluk)
  for (const w of [
    "ADAM", "MASA", "ELMA", "KAPI", "BABA", "KALEM", "ÇİÇEK", "BALIK",
    "DENİZ", "YILAN", "KÖPRÜ", "GÜNEŞ", "KİTAP", "ÇANTA", "BULUT",
  ]) {
    allWords.push(w);
  }
  const seed = dateSeed(getTodayKey());
  return allWords[seed % allWords.length];
}

/** Günlük challenge tamamlanmış mı? (localStorage kontrolü) */
export function isDailyCompleted(): boolean {
  if (typeof window === "undefined") return false;
  const key = "harf-yilani-daily-" + getTodayKey();
  return window.localStorage.getItem(key) === "1";
}

/** Günlük challenge'ı tamamlandı olarak işaretle */
export function markDailyCompleted(): void {
  if (typeof window === "undefined") return;
  const key = "harf-yilani-daily-" + getTodayKey();
  window.localStorage.setItem(key, "1");
}
