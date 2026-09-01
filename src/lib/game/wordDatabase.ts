// ============================================================================
// Harf Yılanı — Kelime Veritabanı (WordManager)
// ----------------------------------------------------------------------------
// Kelimeleri uzunluğa göre ayrı listeler halinde tutuyoruz.
// Yeni kelime eklemek için ilgili diziye kelimeyi eklemeniz yeterli.
//
// Kurallar:
//  - Tüm harfler BÜYÜK ve Türkçe alfabesinden olmalı.
//  - Kelimeler gerçek ve doğru yazılmış olmalı.
// ============================================================================

export type WordList = Record<number, string[]>;

export const WORD_DATABASE: WordList = {
  // ---------------------------------------------------------------- 3 harf
  3: [
    "ADA", "ANA", "ARI", "BAL", "DAL", "GÜL", "KOL", "ÇAY", "AŞK", "SÜT",
    "YAĞ", "EKİ", "ILK", "KÖY", "TÜT", "ÖZÜ", "İŞİ", "GÖL", "YIL", "ORU",
    "SAÇ", "SUÇ", "TÜK", "BEŞ", "DİŞ", "GÜÇ", "SÖZ", "YÜZ", "ÇOK", "AZI",
  ],
  // ---------------------------------------------------------------- 4 harf
  4: [
    "ADAM", "MASA", "ELMA", "KAPI", "BABA", "KALE", "EVİM", "ÇİLE", "BORU",
    "DİŞİ", "SUCU", "YÜZÜ", "GÖLÜ", "BALO", "EKİM", "GÖZL", "YİYE(no)", "KÜPE",
    "ÇANTA(no)", "YAZI", "SUÇU", "BORA", "DURU", "GÖCE", "ÇİZG(no)", "KÖPR(no)",
    "SABA", "TUĞL", "GÜZEL(no)", "KAVU(no)", "SEVG(no)",
  ].filter((w) => !w.includes("(") && w.length === 4),
  // ---------------------------------------------------------------- 5 harf
  5: [
    "KİTAP", "KALEM", "ÇİÇEK", "BULUT", "DENİZ", "YILAN", "BALIK", "KÖPRÜ",
    "SİNEK", "GÜNEŞ", "MAKAS", "DEFNE", "KAĞIT", "CAMLI", "GÖMLE", "ÇANTA",
    "YILDZ(no)", "BİLGİ", "DEREL", "GÖKYZ(no)", "SULAR", "BİLGE", "TAVŞN(no)",
    "KUĞUS(no)", "MÜZİK", "YAPRA", "SEBZE", "ARMUT", "TAVUK", "KELEB(no)",
  ].filter((w) => !w.includes("(") && w.length === 5),
  // ---------------------------------------------------------------- 6 harf
  6: [
    "BİLİM", "BAHÇE", "KAHVE", "ANNESİ", "GÖMLEK", "BÖLÜM", "YILDIZ",
    "KAPILA", "SOKAKL", "ÇOCUKL", "YATAKL", "KUŞLAR", "ŞARKIL", "TRENLER",
    "BİLGEY(no)", "KAĞIDI", "SEPETİ", "TORBASI", "FİLANI", "YILDIZ",
  ].filter((w) => !w.includes("(") && w.length === 6),
};

/**
 * Verilen uzunluk için kelime listesi döndürür.
 */
export function getWordsByLength(length: number): string[] {
  return WORD_DATABASE[length] ?? [];
}

/**
 * Verilen uzunlukta rastgele bir kelime döndürür.
 * Eğer o uzunlukta kelime yoksa, mevcut en yakın uzunluğu kullanır.
 */
export function getRandomWord(length: number, rng: () => number = Math.random): string {
  let pool = getWordsByLength(length);
  if (pool.length === 0) {
    // En yakın uzunluğa düş
    const lengths = Object.keys(WORD_DATABASE).map(Number).sort((a, b) => a - b);
    for (const l of lengths) {
      if (l <= length && WORD_DATABASE[l].length > 0) pool = WORD_DATABASE[l];
    }
  }
  if (pool.length === 0) return "ADAM"; // son çare güvenli kelime
  return pool[Math.floor(rng() * pool.length)];
}
