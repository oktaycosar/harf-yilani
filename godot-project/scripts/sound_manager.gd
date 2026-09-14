# ============================================================================
# SoundManager — Prosedürel ses efektleri (Godot 4 / GDScript 2.0)
# ----------------------------------------------------------------------------
# Hiçbir ses DOSYASI gerektirmez: tüm efektler çalışma anında 16-bit PCM
# olarak sentezlenir ve önbelleğe alınır. Böylece proje taşınabilir kalır.
#
# Autoload olarak kayıtlıdır (project.godot -> [autoload] SoundManager).
# Kullanım:  SoundManager.play("correct")
#
# Web sürümündeki sound.ts (Web Audio API) karşılığıdır.
# ============================================================================

extends Node

## Örnekleme frekansı (düşük tutuldu → üretim hızlı, dosya boyutu yok)
const SAMPLE_RATE: int = 22050
## Aynı anda çalınabilecek efekt sayısı
const POOL_SIZE: int = 6

## Ses açık mı? (GameManager kalıcı ayardan senkronize eder)
var enabled: bool = true
## Ana ses seviyesi (dB)
var volume_db: float = -6.0

var _players: Array[AudioStreamPlayer] = []
var _next: int = 0
var _cache: Dictionary = {}


func _ready() -> void:
                for i in range(POOL_SIZE):
                                var p: AudioStreamPlayer = AudioStreamPlayer.new()
                                p.bus = "Master"
                                p.process_mode = Node.PROCESS_MODE_ALWAYS
                                add_child(p)
                                _players.append(p)


## 0.0 - 1.0 arası seviye ayarla (web sürümüyle aynı arayüz).
func set_volume(linear: float) -> void:
                var v: float = clampf(linear, 0.0, 1.0)
                if v <= 0.001:
                                volume_db = -80.0
                else:
                                volume_db = linear_to_db(v)
                for p in _players:
                                p.volume_db = volume_db


func set_enabled(value: bool) -> void:
                enabled = value


## İsimle efekt çal (ilk çağrıda sentezlenir, sonra önbellekten gelir).
func play(name: String) -> void:
                if not enabled:
                                return
                if not _cache.has(name):
                                _cache[name] = _build(name)
                var stream = _cache[name]
                if stream == null:
                                return
                var p: AudioStreamPlayer = _players[_next]
                _next = (_next + 1) % _players.size()
                p.stream = stream
                p.volume_db = volume_db
                p.play()


# --------------------------------------------------------------------------
# Efekt tanımları — nota dizileri [{f: frekans, d: süre_sn}, ...]
# --------------------------------------------------------------------------
func _build(name: String) -> AudioStreamWAV:
                match name:
                                "correct":
                                                return _make_stream([{"f": 660.0, "d": 0.07}, {"f": 880.0, "d": 0.09}], "sine", 0.55)
                                "wrong":
                                                return _make_stream([{"f": 220.0, "d": 0.10}, {"f": 165.0, "d": 0.16}], "saw", 0.45)
                                "word_complete":
                                                return _make_stream([
                                                                {"f": 523.25, "d": 0.09}, {"f": 659.25, "d": 0.09},
                                                                {"f": 783.99, "d": 0.09}, {"f": 1046.50, "d": 0.22},
                                                ], "sine", 0.5)
                                "level_up":
                                                return _make_stream([{"f": 523.25, "d": 0.08}, {"f": 659.25, "d": 0.08}, {"f": 783.99, "d": 0.16}], "triangle", 0.5)
                                "game_over":
                                                return _make_stream([{"f": 392.0, "d": 0.14}, {"f": 311.13, "d": 0.14}, {"f": 246.94, "d": 0.30}], "triangle", 0.5)
                                "bonus":
                                                return _make_stream([{"f": 987.77, "d": 0.06}, {"f": 1318.51, "d": 0.06}, {"f": 1567.98, "d": 0.14}], "sine", 0.45)
                                "boost":
                                                # Yükselen süpürme — kısa artan notalarla taklit edilir
                                                return _make_stream([
                                                                {"f": 400.0, "d": 0.04}, {"f": 550.0, "d": 0.04},
                                                                {"f": 700.0, "d": 0.04}, {"f": 900.0, "d": 0.04},
                                                                {"f": 1150.0, "d": 0.10},
                                                ], "square", 0.35)
                                "ice":
                                                return _make_stream([{"f": 1567.98, "d": 0.06}, {"f": 2093.0, "d": 0.06}, {"f": 2637.02, "d": 0.12}], "sine", 0.35)
                                "menu_click":
                                                return _make_stream([{"f": 440.0, "d": 0.05}], "sine", 0.4)
                                "start":
                                                return _make_stream([{"f": 523.25, "d": 0.08}, {"f": 783.99, "d": 0.14}], "triangle", 0.5)
                                "time_warning":
                                                return _make_stream([{"f": 880.0, "d": 0.04}], "square", 0.3)
                return null


# --------------------------------------------------------------------------
# PCM sentezleme
# --------------------------------------------------------------------------
## notes: [{f, d}], wave: "sine" | "square" | "saw" | "triangle"
func _make_stream(notes: Array, wave: String, vol: float) -> AudioStreamWAV:
                var total: int = 0
                for n in notes:
                                total += int(float(n["d"]) * float(SAMPLE_RATE))
                if total <= 0:
                                return null

                var data: PackedByteArray = PackedByteArray()
                data.resize(total * 2)
                var idx: int = 0
                for n in notes:
                                var freq: float = float(n["f"])
                                var count: int = int(float(n["d"]) * float(SAMPLE_RATE))
                                var phase: float = 0.0
                                for i in range(count):
                                                var t: float = float(i) / float(maxi(1, count))
                                                # Basit zarf: hızlı atak + yumuşak sönüm (click önler)
                                                var env: float
                                                if t < 0.08:
                                                                env = t / 0.08
                                                else:
                                                                env = 1.0 - ((t - 0.08) / 0.92) * 0.85
                                                phase = fmod(phase + freq / float(SAMPLE_RATE), 1.0)
                                                var s: float = 0.0
                                                if wave == "square":
                                                                s = 1.0 if phase < 0.5 else -1.0
                                                elif wave == "saw":
                                                                s = 2.0 * phase - 1.0
                                                elif wave == "triangle":
                                                                s = 4.0 * absf(phase - 0.5) - 1.0
                                                else:
                                                                s = sin(phase * TAU)
                                                var v: int = int(clampf(s * env * vol, -1.0, 1.0) * 32767.0)
                                                data[idx] = v & 0xFF
                                                data[idx + 1] = (v >> 8) & 0xFF
                                                idx += 2

                var stream: AudioStreamWAV = AudioStreamWAV.new()
                stream.format = AudioStreamWAV.FORMAT_16_BITS
                stream.mix_rate = SAMPLE_RATE
                stream.stereo = false
                stream.data = data
                return stream
