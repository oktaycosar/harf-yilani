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
//
// Ek sistemler:
//  - Engeller (obstacles): yılan çarpınca can kaybı
//  - Bonus harfler (bonusLetters): sıra dışı, ekstra puan
//  - Süreli mod (timed): bölüm süresi dolunca can kaybı
// ============================================================================

import {
  GRID_COLS,
  GRID_ROWS,
  SNAKE_START_LENGTH,
  START_LIVES,
  SCORE_PER_LETTER,
  SCORE_WORD_BONUS,
  COMBO_BONUS,
  BONUS_LETTER_COUNT,
  BONUS_LETTER_VALUE,
  OBSTACLES_MAX,
  TURKISH_ALPHABET,
  TIME_BONUS_THRESHOLD,
  TIME_BONUS_POINTS,
  ICE_ZONE_COUNT,
  ICE_SLOW_FACTOR,
  ICE_ZONES_START_LEVEL,
  SPEED_BOOSTER_COUNT,
  SPEED_BOOST_FACTOR,
  SPEED_BOOST_DURATION_MS,
  SPEED_BOOST_POINTS,
  SPEED_BOOSTERS_START_LEVEL,
} from "./constants";
import type {
  BonusLetter,
  Direction,
  GameSnapshot,
  GameStatus,
  IceZone,
  LetterEntity,
  Obstacle,
  Point,
  SpeedBooster,
} from "./types";

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
  | { kind: "ate_bonus"; char: string; gained: number }
  | { kind: "word_complete"; word: string; bonus: number }
  | { kind: "self_collision" }
  | { kind: "wall_collision" }
  | { kind: "obstacle_collision" }
  | { kind: "time_up" }
  | { kind: "ice_entered" }
  | { kind: "boost_collected"; gained: number };

export interface LoadLevelOptions {
  level: number;
  word: string;
  tierName: string;
  stepMs: number;
  tricky: boolean;
  obstacleCount?: number;
  timed?: boolean;
  timeLimitMs?: number;
}

export class SnakeEngine {
  readonly cols: number;
  readonly rows: number;
  private startLength: number;

  // --- Dinamik durum ---
  snake: Point[] = [];
  direction: Direction = "right";
  private pendingDirection: Direction = "right";
  letters: LetterEntity[] = [];
  obstacles: Obstacle[] = [];
  bonusLetters: BonusLetter[] = [];
  iceZones: IceZone[] = [];
  speedBoosters: SpeedBooster[] = [];
  /** Aktif boost bitiş zamanı (performance.now(), 0 = boost yok) */
  boostEndTime = 0;
  /** Buz üzerinde mi? (bu tick) */
  onIce = false;
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
  timeLimitMs = 0;
  timeRemainingMs = 0;
  lastEvent: GameSnapshot["lastEvent"] = { kind: "none" };

  // Son level kurulum parametreleri (retry için saklanır)
  private loadedOpts: LoadLevelOptions | null = null;

  onEvent?: (e: EngineEvent) => void;

  constructor(opts?: { cols?: number; rows?: number; startLength?: number }) {
    this.cols = opts?.cols ?? GRID_COLS;
    this.rows = opts?.rows ?? GRID_ROWS;
    this.startLength = opts?.startLength ?? SNAKE_START_LENGTH;
  }

  // --------------------------------------------------------------------------
  // Bölüm yükleme
  // --------------------------------------------------------------------------
  loadLevel(opts: LoadLevelOptions) {
    const { level, word, tierName, stepMs, tricky } = opts;
    this.level = level;
    this.targetWord = word.toUpperCase();
    this.currentLetterIndex = 0;
    this.letters = [];
    this.obstacles = [];
    this.bonusLetters = [];
    this.combo = 0;
    this.tierName = tierName;
    this.stepMs = stepMs;
    this.loadedOpts = opts;
    this.lastEvent = { kind: "none" };

    // Süreli mod
    this.timeLimitMs = opts.timed ? opts.timeLimitMs ?? 0 : 0;
    this.timeRemainingMs = this.timeLimitMs;

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

    // Engelleri yerleştir
    const obstacleCount = Math.min(OBSTACLES_MAX, opts.obstacleCount ?? 0);
    if (obstacleCount > 0) {
      this.placeObstacles(obstacleCount);
    }

    // Bonus harfleri yerleştir
    if (BONUS_LETTER_COUNT > 0) {
      this.placeBonusLetters(BONUS_LETTER_COUNT);
    }

    // Buz alanlarını yerleştir (bölüm 10+)
    this.iceZones = [];
    if (level >= ICE_ZONES_START_LEVEL) {
      this.placeIceZones(ICE_ZONE_COUNT);
    }

    // Hız artırıcıları yerleştir (bölüm 12+)
    this.speedBoosters = [];
    if (level >= SPEED_BOOSTERS_START_LEVEL) {
      this.placeSpeedBoosters(SPEED_BOOSTER_COUNT);
    }

    this.boostEndTime = 0;
    this.onIce = false;
    this.status = "playing";
  }

  /** Hedef kelimenin her harfi için bir obje oluştur ve rastgele yerleştir. */
  private placeLetters(tricky: boolean) {
    const word = this.targetWord;
    const occupied = new Set<string>();
    for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);
    // Yılanın önündeki 3 hücreyi de boş bırak (ilk hareket için güvenli alan)
    const head = this.snake[0];
    for (let i = 1; i <= 3; i++) {
      occupied.add(`${head.x + i},${head.y}`);
    }

    const free: Point[] = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    shuffleInPlace(free);

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
      this.placeTricky(entities, free);
    } else {
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
    if (free.length === 0 || entities.length === 0) return;
    const firstIdx = Math.floor(Math.random() * free.length);
    const first = free.splice(firstIdx, 1)[0];
    entities[0].x = first.x;
    entities[0].y = first.y;

    for (let i = 1; i < entities.length; i++) {
      const prev = entities[i - 1];
      let bestIdx = 0;
      let bestDist = -1;
      for (let j = 0; j < free.length; j++) {
        const c = free[j];
        const d = (c.x - prev.x) ** 2 + (c.y - prev.y) ** 2;
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

  /** Engelleri rastgele yerleştir (yılan başlangıcı + harflerden uzak) */
  private placeObstacles(count: number) {
    const occupied = new Set<string>();
    for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);
    // Yılanın önündeki güvenli koridor
    const head = this.snake[0];
    for (let i = 0; i <= 5; i++) {
      occupied.add(`${head.x + i},${head.y}`);
      occupied.add(`${head.x + i},${head.y - 1}`);
      occupied.add(`${head.x + i},${head.y + 1}`);
    }
    for (const l of this.letters) occupied.add(`${l.x},${l.y}`);

    const free: Point[] = [];
    for (let y = 2; y < this.rows - 2; y++) {
      for (let x = 2; x < this.cols - 2; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    shuffleInPlace(free);

    const obstacles: Obstacle[] = [];
    for (let i = 0; i < count && free.length > 0; i++) {
      const cell = free.pop()!;
      obstacles.push({
        id: i,
        x: cell.x,
        y: cell.y,
        shape: Math.random() > 0.5 ? "block" : "spike",
      });
      // Engel etrafındaki hücreleri de engelle (cluster önleme — çok sıkışmasın)
      occupied.add(`${cell.x},${cell.y}`);
    }
    this.obstacles = obstacles;
  }

  /** Bonus harfleri rastgele yerleştir */
  private placeBonusLetters(count: number) {
    const occupied = new Set<string>();
    for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);
    for (const l of this.letters) occupied.add(`${l.x},${l.y}`);
    for (const o of this.obstacles) occupied.add(`${o.x},${o.y}`);

    const free: Point[] = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    shuffleInPlace(free);

    const bonuses: BonusLetter[] = [];
    const alpha = TURKISH_ALPHABET;
    for (let i = 0; i < count && free.length > 0; i++) {
      const cell = free.pop()!;
      const ch = alpha[Math.floor(Math.random() * alpha.length)];
      bonuses.push({
        id: i,
        x: cell.x,
        y: cell.y,
        char: ch,
        value: BONUS_LETTER_VALUE,
        eaten: false,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.bonusLetters = bonuses;
  }

  /** Buz alanlarını rastgele yerleştir (yılan koridoru hariç) */
  private placeIceZones(count: number) {
    const occupied = new Set<string>();
    for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);
    for (const l of this.letters) occupied.add(`${l.x},${l.y}`);
    for (const o of this.obstacles) occupied.add(`${o.x},${o.y}`);
    for (const b of this.bonusLetters) occupied.add(`${b.x},${b.y}`);
    // Yılanın ön koridorunu boş bırak
    const head = this.snake[0];
    for (let i = 0; i <= 4; i++) {
      occupied.add(`${head.x + i},${head.y}`);
    }

    const free: Point[] = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    shuffleInPlace(free);

    const zones: IceZone[] = [];
    for (let i = 0; i < count && free.length > 0; i++) {
      const cell = free.pop()!;
      zones.push({ id: i, x: cell.x, y: cell.y, slowFactor: ICE_SLOW_FACTOR });
    }
    this.iceZones = zones;
  }

  /** Hız artırıcıları rastgele yerleştir */
  private placeSpeedBoosters(count: number) {
    const occupied = new Set<string>();
    for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);
    for (const l of this.letters) occupied.add(`${l.x},${l.y}`);
    for (const o of this.obstacles) occupied.add(`${o.x},${o.y}`);
    for (const b of this.bonusLetters) occupied.add(`${b.x},${b.y}`);
    for (const iz of this.iceZones) occupied.add(`${iz.x},${iz.y}`);
    const head = this.snake[0];
    for (let i = 0; i <= 4; i++) {
      occupied.add(`${head.x + i},${head.y}`);
    }

    const free: Point[] = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    shuffleInPlace(free);

    const boosters: SpeedBooster[] = [];
    for (let i = 0; i < count && free.length > 0; i++) {
      const cell = free.pop()!;
      boosters.push({
        id: i,
        x: cell.x,
        y: cell.y,
        boostFactor: SPEED_BOOST_FACTOR,
        eaten: false,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.speedBoosters = boosters;
  }

  /** Aktif hız çarpanını hesapla (boost + ice etkisi) */
  getActiveSpeedMultiplier(): number {
    let mult = 1;
    if (this.boostEndTime > 0 && performance.now() < this.boostEndTime) {
      mult *= SPEED_BOOST_FACTOR;
    }
    if (this.onIce) {
      mult *= ICE_SLOW_FACTOR;
    }
    return mult;
  }

  /** Boost bitiş zamanını güncelle (rAF döngüsünden) */
  updateBoost() {
    if (this.boostEndTime > 0 && performance.now() >= this.boostEndTime) {
      this.boostEndTime = 0;
    }
  }

  // --------------------------------------------------------------------------
  // Girdi
  // --------------------------------------------------------------------------
  setDirection(dir: Direction) {
    if (this.status !== "playing") return;
    if (dir === OPPOSITE[this.direction]) return;
    this.pendingDirection = dir;
  }

  // --------------------------------------------------------------------------
  // Süre güncelleme (rAF döngüsünden dt ile çağrılır)
  // --------------------------------------------------------------------------
  updateTime(dtMs: number) {
    if (this.status !== "playing" || this.timeLimitMs <= 0) return;
    // Zaten süre dolduysa tekrar tetikleme
    if (this.timeRemainingMs <= 0) return;
    this.timeRemainingMs = Math.max(0, this.timeRemainingMs - dtMs);
    if (this.timeRemainingMs <= 0) {
      this.combo = 0;
      this.lives -= 1;
      this.status = "time_up";
      this.lastEvent = { kind: "time_up" };
      this.onEvent?.({ kind: "time_up" });
      if (this.lives <= 0) this.status = "game_over";
    }
  }

  // --------------------------------------------------------------------------
  // Tick (tek adım)
  // --------------------------------------------------------------------------
  tick() {
    if (this.status !== "playing") return;

    this.direction = this.pendingDirection;
    const vec = DIR_VECTORS[this.direction];
    const head = this.snake[0];
    const newHead: Point = { x: head.x + vec.x, y: head.y + vec.y };

    // Duvar kontrolü
    if (newHead.x < 0 || newHead.y < 0 || newHead.x >= this.cols || newHead.y >= this.rows) {
      this.failWith("wall_collision");
      return;
    }

    // Engel kontrolü
    if (this.obstacles.some((o) => o.x === newHead.x && o.y === newHead.y)) {
      this.failWith("obstacle_collision");
      return;
    }

    // Bonus harf kontrolü (önce — çünkü bonus yendiğinde büyür ama sıra etkilenmez)
    const bonus = this.bonusLetters.find((b) => !b.eaten && b.x === newHead.x && b.y === newHead.y);
    const booster = this.speedBoosters.find((b) => !b.eaten && b.x === newHead.x && b.y === newHead.y);
    const letter = this.findLetterAt(newHead.x, newHead.y);

    // Büyüme kontrolü: doğru harf VEYA bonus/booster yenecekse kuyruk kalkmaz
    const willGrow =
      (!!letter && !letter.eaten && letter.orderIndex === this.currentLetterIndex) ||
      !!bonus ||
      !!booster;

    // Kendine çarpma kontrolü
    const bodyToCheck = willGrow ? this.snake : this.snake.slice(0, -1);
    if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      this.failWith("self_collision");
      return;
    }

    // Hareket
    this.snake.unshift(newHead);

    // Buz alanı kontrolü (yeni baş pozisyonunda)
    const wasOnIce = this.onIce;
    this.onIce = this.iceZones.some((iz) => iz.x === newHead.x && iz.y === newHead.y);
    if (this.onIce && !wasOnIce) {
      // Buz alanına ilk girişte olay
      this.lastEvent = { kind: "ice_entered" };
      this.onEvent?.({ kind: "ice_entered" });
    }

    // Hız artırıcı toplama
    if (booster && !booster.eaten) {
      booster.eaten = true;
      this.boostEndTime = performance.now() + SPEED_BOOST_DURATION_MS;
      this.score += SPEED_BOOST_POINTS;
      this.lastEvent = { kind: "boost_collected", gained: SPEED_BOOST_POINTS };
      this.onEvent?.({ kind: "boost_collected", gained: SPEED_BOOST_POINTS });
    }

    // Bonus harf yeme
    if (bonus && !bonus.eaten) {
      bonus.eaten = true;
      this.score += bonus.value;
      this.lastEvent = { kind: "ate_bonus", char: bonus.char, gained: bonus.value };
      this.onEvent?.({ kind: "ate_bonus", char: bonus.char, gained: bonus.value });
    }

    // Hedef harf kontrolü
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

        if (this.currentLetterIndex >= this.targetWord.length) {
          // Süre bonusu
          let timeBonus = 0;
          if (this.timeLimitMs > 0 && this.timeRemainingMs / this.timeLimitMs > TIME_BONUS_THRESHOLD) {
            timeBonus = TIME_BONUS_POINTS;
            this.score += timeBonus;
          }
          this.score += SCORE_WORD_BONUS;
          this.status = "level_complete";
          this.lastEvent = {
            kind: "word_complete",
            word: this.targetWord,
            bonus: SCORE_WORD_BONUS + timeBonus,
          };
          this.onEvent?.({ kind: "word_complete", word: this.targetWord, bonus: SCORE_WORD_BONUS + timeBonus });
        }
        // büyüme: kuyruk silme
      } else {
        // YANLIŞ harf
        this.combo = 0;
        this.lives -= 1;
        this.status = "wrong_letter";
        const expected = this.targetWord[this.currentLetterIndex] ?? "?";
        this.lastEvent = { kind: "ate_wrong", char: letter.char, expected };
        this.onEvent?.({ kind: "ate_wrong", char: letter.char, expected });
        if (this.lives <= 0) this.status = "game_over";
        this.snake.pop();
        return;
      }
    } else if (!bonus) {
      // Normal hareket: kuyruğu sil
      this.snake.pop();
    }
  }

  private failWith(kind: "wall_collision" | "self_collision" | "obstacle_collision") {
    this.combo = 0;
    this.lives -= 1;
    this.status = "wrong_letter";
    this.lastEvent = { kind };
    this.onEvent?.({ kind });
    if (this.lives <= 0) this.status = "game_over";
  }

  private findLetterAt(x: number, y: number): LetterEntity | undefined {
    return this.letters.find((l) => !l.eaten && l.x === x && l.y === y);
  }

  // --------------------------------------------------------------------------
  // Bölüm yönetimi
  // --------------------------------------------------------------------------
  setStatus(s: GameStatus) {
    this.status = s;
  }

  /** Can sayısını ayarla (kolay mod için) */
  setLives(lives: number) {
    this.lives = lives;
  }

  incrementLevel() {
    this.level += 1;
  }

  resetRun() {
    this.lives = START_LIVES;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.level = 1;
  }

  retryLevel() {
    if (this.lives <= 0) return;
    if (this.loadedOpts) {
      this.loadLevel(this.loadedOpts);
    }
  }

  resetAll() {
    this.lives = START_LIVES;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.level = 1;
    this.status = "menu";
    this.obstacles = [];
    this.bonusLetters = [];
    this.iceZones = [];
    this.speedBoosters = [];
    this.boostEndTime = 0;
    this.onIce = false;
    this.timeLimitMs = 0;
    this.timeRemainingMs = 0;
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
      obstacles: this.obstacles.map((o) => ({ ...o })),
      bonusLetters: this.bonusLetters.map((b) => ({ ...b })),
      iceZones: this.iceZones.map((iz) => ({ ...iz })),
      speedBoosters: this.speedBoosters.map((b) => ({ ...b })),
      activeSpeedMultiplier: this.getActiveSpeedMultiplier(),
      boostRemainingMs: this.boostEndTime > 0 ? Math.max(0, this.boostEndTime - performance.now()) : 0,
      tierName: this.tierName,
      stepMs: this.stepMs,
      timeLimitMs: this.timeLimitMs,
      timeRemainingMs: this.timeRemainingMs,
      snake: this.snake.map((s) => ({ ...s })),
      direction: this.direction,
      lastEvent: this.lastEvent,
    };
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
