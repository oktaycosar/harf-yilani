// ============================================================================
// Harf Yılanı — Kelime Veritabanı (WordManager) + Kategoriler
// ----------------------------------------------------------------------------
// Kelimeler uzunluk VE kategoriye göre organize edilir.
// Yeni kelime eklemek için ilgili kategoriye kelime eklemeniz yeterli.
//
// Kurallar:
//  - Tüm harfler BÜYÜK ve Türkçe alfabesinden olmalı.
//  - Kelimeler gerçek ve doğru yazılmış olmalı.
//  - Her kelimenin uzunluğu belirtilen sayıya tam eşit olmalı.
// ============================================================================

export type Category = "karisik" | "hayvanlar" | "yiyecekler" | "esya" | "doga";

export const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "karisik", label: "Karışık", icon: "🎲" },
  { id: "hayvanlar", label: "Hayvanlar", icon: "🐱" },
  { id: "yiyecekler", label: "Yiyecekler", icon: "🍎" },
  { id: "esya", label: "Eşyalar", icon: "📦" },
  { id: "doga", label: "Doğa", icon: "🌳" },
];

// Kategori → { uzunluk → [kelimeler] }
type CategorizedDB = Record<Category, Record<number, string[]>>;

export const WORD_DATABASE: CategorizedDB = {
  karisik: {
    3: ["ADA", "ANA", "ARI", "BAL", "DAL", "GÜL", "KOL", "ÇAY", "AŞK", "SÜT", "YAĞ", "KÖY", "GÖL", "YIL", "SAÇ", "SUÇ", "BEŞ", "DİŞ", "GÜÇ", "SÖZ", "YÜZ", "ÇOK", "ÖZÜ", "EKİ", "İŞİ"],
    4: ["ADAM", "MASA", "ELMA", "KAPI", "BABA", "KALE", "EVİM", "ÇİLE", "BORU", "BALO", "EKİM", "KÜPE", "YAZI", "BORA", "DURU", "SABA", "TUĞL", "DİŞİ", "SUCU", "YÜZÜ", "GÖLÜ", "GÖCE", "KEÇİ", "EŞEK", "TAVU"],
    5: ["KİTAP", "KALEM", "ÇİÇEK", "BULUT", "DENİZ", "YILAN", "BALIK", "KÖPRÜ", "SİNEK", "GÜNEŞ", "MAKAS", "DEFNE", "KAĞIT", "ÇANTA", "BİLGİ", "SULAR", "BİLGE", "MÜZİK", "SEBZE", "ARMUT", "TAVUK", "GÖMLE", "CAMLI", "EKMEK", "ARPA"],
    6: ["BİLİM", "BAHÇE", "KAHVE", "GÖMLEK", "BÖLÜM", "YILDIZ", "KUŞLAR", "ŞARKIL", "KAĞIDI", "SEPETİ", "TRENLER", "SOKAKL", "YATAKL", "ÇOCUKL", "KAPILA", "TORBASI", "TARÇIN", "TAVŞAN"],
  },
  hayvanlar: {
    3: ["ARI", "BAL", "DAL"],
    4: ["KEÇİ", "EŞEK", "TAVU", "BALI", "KOYU", "KUŞU", "ARIK"],
    5: ["BALIK", "SİNEK", "TAVUK"],
    6: ["TAVŞAN", "YILDIZ"],
  },
  yiyecekler: {
    3: ["BAL", "SÜT", "ÇAY", "YAĞ", "EKİ"],
    4: ["ELMA", "BALO", "ARPA", "EKİM", "DİŞİ", "SUCU", "YÜZÜ"],
    5: ["ARMUT", "SEBZE", "ÇİLEK", "KARPU", "EKMEK", "BALIK"],
    6: ["KAHVE", "TARÇIN", "BAKLIM"],
  },
  esya: {
    3: ["KOL", "KÖY", "GÖL"],
    4: ["MASA", "KAPI", "KALE", "BORU", "KÜPE", "YAZI", "BALO", "DURU", "SABA", "TUĞL", "KEÇİ", "EŞEK"],
    5: ["KİTAP", "KALEM", "MAKAS", "KAĞIT", "ÇANTA", "GÖMLE", "KÖPRÜ", "DEFNE", "CAMLI"],
    6: ["GÖMLEK", "SEPETİ", "TORBASI", "KAĞIDI", "BÖLÜM"],
  },
  doga: {
    3: ["ADA", "DAL", "GÜL", "GÖL", "ÇAY", "YAĞ", "YIL", "KÖY"],
    4: ["EVİM", "BORU", "BALO", "BORA", "DURU", "SABA", "TUĞL", "GÖCE", "GÖLÜ"],
    5: ["BULUT", "DENİZ", "GÜNEŞ", "ÇİÇEK", "DEFNE", "SULAR", "CAMLI", "GÖMLE"],
    6: ["BAHÇE", "YILDIZ", "YATAKL", "SOKAKL", "ÇOCUKL", "KAPILA"],
  },
};

/**
 * Verilen uzunluk ve kategori için kelime listesi döndürür.
 * "karisik" kategorisi tüm kategorileri birleştirir.
 */
export function getWordsByLength(length: number, category: Category = "karisik"): string[] {
  if (category === "karisik") {
    const all = new Set<string>();
    for (const cat of Object.keys(WORD_DATABASE) as Category[]) {
      for (const w of WORD_DATABASE[cat][length] ?? []) {
        if (w.length === length) all.add(w);
      }
    }
    return Array.from(all);
  }
  return (WORD_DATABASE[category][length] ?? []).filter((w) => w.length === length);
}

/**
 * Verilen uzunlukta ve kategoride rastgele bir kelime döndürür.
 */
export function getRandomWord(
  length: number,
  category: Category = "karisik",
  rng: () => number = Math.random
): string {
  let pool = getWordsByLength(length, category);
  if (pool.length === 0) {
    pool = getWordsByLength(length, "karisik");
  }
  if (pool.length === 0) {
    const lengths = [6, 5, 4, 3];
    for (const l of lengths) {
      if (l <= length) {
        const fallback = getWordsByLength(l, category);
        if (fallback.length > 0) {
          pool = fallback;
          break;
        }
      }
    }
  }
  if (pool.length === 0) return "ADAM";
  return pool[Math.floor(rng() * pool.length)];
}
