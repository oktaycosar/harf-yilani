// ============================================================================
// Harf Yılanı — Snake Engine (çekirdek oyun mantığı)
// ----------------------------------------------------------------------------
// Framework bağımsız saf TypeScript. Web (React) ve teorik olarak herhangi bir
// ortanda aynı mantık çalışır. Godot versiyonu (GDScript) bu mantığın birebir
// karşılığıdır.
//
// Önemli: Aynı harften birden fazla olan kelimelerde (örn. KAKA, ADAM) doğru
// sırayı garanti etmek için her harf objesine kendi orderIndex'i verilir.
// Çarpışma kontrolü orderIndex === currentLetterIndex karşılaştırması yapar.
// ============================================================================

import {
  GRID_COLS,
  GRID_ROWS,
  SNAKE_START_LENGTH,
  START_LIVES,
  SCORE_PER_LETTER,
  SCORE_WORD_BONUS,
  COMBO_BONUS,
} from "./constants";
import type { Direction, GameSnapshot, GameStatus, LetterEntity, Point } from "./types";

const DIR_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export type EngineEvent =
  | { kind: "ate_correct"; char: string; index: number; combo: number; gained: number }
  | { kind: "ate_wrong"; char: string; expected: string }
  | { kind: "word_complete"; word: string; bonus: number }
  | { kind: "self_collision" }
  | { kind: "wall_collision" };

export class SnakeEngine {
  readonly cols: number;
  readonly rows: number;
  private startLength: number;

  // --- Dinamik durum ---
  snake: Point[] = [];
  direction: Direction = "right";
  private pendingDirection: Direction = "right";
  letters: LetterEntity[] = [];
  targetWord = "";
  currentLetterIndex = 0;
  level = 1;
  lives = START_LIVES;
  score = 0;
  combo = 0;
  maxCombo = 0;
  status: GameStatus = "menu";
  tierName = "Başlangıç";
  stepMs = 200;
  lastEvent: GameSnapshot["lastEvent"] = { kind: "none" };

  // Son level kurulum parametreleri (retry için saklanır)
  private loadedWord = "ADAM";
  private loadedTricky = false;

  onEvent?: (e: EngineEvent) => void;

  constructor(opts?: { cols?: number; rows?: number; startLength?: number }) {
    this.cols = opts?.cols ?? GRID_COLS;
    this.rows = opts?.rows ?? GRID_ROWS;
    this.startLength = opts?.startLength ?? SNAKE_START_LENGTH;
  }

  // --------------------------------------------------------------------------
  // Bölüm yükleme
  // --------------------------------------------------------------------------
  loadLevel(level: number, word: string, tierName: string, stepMs: number, tricky: boolean) {
    this.level = level;
    this.targetWord = word.toUpperCase();
    this.currentLetterIndex = 0;
    this.letters = [];
    this.combo = 0;
    this.tierName = tierName;
    this.stepMs = stepMs;
    this.loadedWord = word;
    this.loadedTricky = tricky;
    this.lastEvent = { kind: "none" };

    // Yılanı başlat (ortada, sağa bakar)
    const cx = Math.floor(this.cols / 2) - Math.floor(this.startLength / 2);
    const cy = Math.floor(this.rows / 2);
    this.snake = [];
    for (let i = 0; i < this.startLength; i++) {
      this.snake.push({ x: cx - i, y: cy });
    }
    this.direction = "right";
    this.pendingDirection = "right";

    // Harfleri yerleştir
    this.placeLetters(tricky);
    this.status = "playing";
  }

  /** Hedef kelimenin her harfi için bir obje oluştur ve rastgele yerleştir. */
  private placeLetters(tricky: boolean) {
    const word = this.targetWord;
    const occupied = new Set<string>();
    for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);

    // Tüm boş hücreleri topla
    const free: Point[] = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    // Karıştır
    shuffleInPlace(free);

    // Harf objeleri
    const entities: LetterEntity[] = [];
    for (let i = 0; i < word.length; i++) {
      entities.push({
        id: i,
        x: 0,
        y: 0,
        char: word[i],
        orderIndex: i,
        eaten: false,
        phase: Math.random() * Math.PI * 2,
      });
    }

    if (tricky) {
      // Zor mod: ardışık harfleri olabildiğince uzağa yerleştir
      // (yılan uzun mesafe kat etmek zorunda kalır)
      this.placeTricky(entities, free);
    } else {
      // Basit yerleştirme: rastgele
      for (const e of entities) {
        const cell = free.pop();
        if (!cell) break;
        e.x = cell.x;
        e.y = cell.y;
      }
    }
    this.letters = entities;
  }

  private placeTricky(entities: LetterEntity[], free: Point[]) {
    // İlk harfi rastgele seç
    if (free.length === 0 || entities.length === 0) return;
    const firstIdx = Math.floor(Math.random() * free.length);
    const first = free.splice(firstIdx, 1)[0];
    entities[0].x = first.x;
    entities[0].y = first.y;

    // Sonraki her harfi, bir önceki harfe en uzak boş hücre olarak seç
    for (let i = 1; i < entities.length; i++) {
      const prev = entities[i - 1];
      let bestIdx = 0;
      let bestDist = -1;
      for (let j = 0; j < free.length; j++) {
        const c = free[j];
        const d = (c.x - prev.x) ** 2 + (c.y - prev.y) ** 2;
        // Biraz rastgelelik kat
        const score = d * (0.8 + Math.random() * 0.4);
        if (score > bestDist) {
          bestDist = score;
          bestIdx = j;
        }
      }
      const cell = free.splice(bestIdx, 1)[0];
      if (!cell) break;
      entities[i].x = cell.x;
      entities[i].y = cell.y;
    }
  }

  // --------------------------------------------------------------------------
  // Girdi
  // --------------------------------------------------------------------------
  setDirection(dir: Direction) {
    if (this.status !== "playing") return;
    // Ters yöne dönüşü engelle (anında ölümü önler)
    if (dir === OPPOSITE[this.direction]) return;
    this.pendingDirection = dir;
  }

  // --------------------------------------------------------------------------
  // Tick (tek adım)
  // --------------------------------------------------------------------------
  tick() {
    if (this.status !== "playing") return;

    // Yönü uygula
    this.direction = this.pendingDirection;
    const vec = DIR_VECTORS[this.direction];
    const head = this.snake[0];
    const newHead: Point = { x: head.x + vec.x, y: head.y + vec.y };

    // Duvar kontrolü
    if (newHead.x < 0 || newHead.y < 0 || newHead.x >= this.cols || newHead.y >= this.rows) {
      this.status = "wrong_letter"; // bölüm başarısız
      this.lives -= 1;
      this.lastEvent = { kind: "wall_collision" };
      this.onEvent?.({ kind: "wall_collision" });
      if (this.lives <= 0) this.status = "game_over";
      return;
    }

    // Kendine çarpma kontrolü (kuyruk hareket edeceği için, son segment hariç)
    const willGrow = this.headHitsLetter(newHead);
    const bodyToCheck = willGrow ? this.snake : this.snake.slice(0, -1);
    if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      this.status = "wrong_letter";
      this.lives -= 1;
      this.lastEvent = { kind: "self_collision" };
      this.onEvent?.({ kind: "self_collision" });
      if (this.lives <= 0) this.status = "game_over";
      return;
    }

    // Hareket
    this.snake.unshift(newHead);

    // Harf kontrolü
    const letter = this.findLetterAt(newHead.x, newHead.y);
    if (letter && !letter.eaten) {
      if (letter.orderIndex === this.currentLetterIndex) {
        // DOĞRU harf
        letter.eaten = true;
        this.currentLetterIndex += 1;
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const gained = SCORE_PER_LETTER + COMBO_BONUS * Math.max(0, this.combo - 1);
        this.score += gained;
        this.lastEvent = {
          kind: "ate_correct",
          char: letter.char,
          index: letter.orderIndex,
          combo: this.combo,
          gained,
        };
        this.onEvent?.({ kind: "ate_correct", char: letter.char, index: letter.orderIndex, combo: this.combo, gained });

        // Kelime tamamlandı mı?
        if (this.currentLetterIndex >= this.targetWord.length) {
          this.score += SCORE_WORD_BONUS;
          this.status = "level_complete";
          this.lastEvent = { kind: "word_complete", word: this.targetWord, bonus: SCORE_WORD_BONUS };
          this.onEvent?.({ kind: "word_complete", word: this.targetWord, bonus: SCORE_WORD_BONUS });
        }
        // büyüme: kuyruğu silme (yukarıda unshift ettik, pop yapmıyoruz)
      } else {
        // YANLIŞ harf
        this.combo = 0;
        this.lives -= 1;
        this.status = "wrong_letter";
        const expected = this.targetWord[this.currentLetterIndex] ?? "?";
        this.lastEvent = { kind: "ate_wrong", char: letter.char, expected };
        this.onEvent?.({ kind: "ate_wrong", char: letter.char, expected });
        if (this.lives <= 0) this.status = "game_over";
        // yanlış harfte yılan uzamaz -> kuyruğu sil
        this.snake.pop();
        return;
      }
    } else {
      // Normal hareket: kuyruğu sil
      this.snake.pop();
    }
  }

  private headHitsLetter(p: Point): boolean {
    return this.letters.some((l) => !l.eaten && l.x === p.x && l.y === p.y && l.orderIndex === this.currentLetterIndex);
  }

  private findLetterAt(x: number, y: number): LetterEntity | undefined {
    return this.letters.find((l) => !l.eaten && l.x === x && l.y === y);
  }

  // --------------------------------------------------------------------------
  // Bölüm yönetimi
  // --------------------------------------------------------------------------
  /** Durumu güncelle (React useState immutability kuralına uyum için metot) */
  setStatus(s: GameStatus) {
    this.status = s;
  }

  /** Bölüm numarasını artır */
  incrementLevel() {
    this.level += 1;
  }

  /** Yeni bir oyun koşusu başlat (can/skor/combo sıfırla, bölüm 1) */
  resetRun() {
    this.lives = START_LIVES;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.level = 1;
  }

  /** Aynı bölümü (kelime + yerleşim olmadan) tekrar yükle — yeniden deneme */
  retryLevel() {
    if (this.lives <= 0) return;
    this.loadLevel(this.level, this.loadedWord, this.tierName, this.stepMs, this.loadedTricky);
  }

  resetAll() {
    this.lives = START_LIVES;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.level = 1;
    this.status = "menu";
  }

  getSnapshot(): GameSnapshot {
    return {
      status: this.status,
      level: this.level,
      lives: this.lives,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      targetWord: this.targetWord,
      currentLetterIndex: this.currentLetterIndex,
      letters: this.letters.map((l) => ({ ...l })),
      tierName: this.tierName,
      stepMs: this.stepMs,
      snake: this.snake.map((s) => ({ ...s })),
      direction: this.direction,
      lastEvent: this.lastEvent,
    };
  }
}

// Yardımcı: in-place karıştırma
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
