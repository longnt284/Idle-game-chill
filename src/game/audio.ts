let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let ambientStarted = false;
/** Hai bộ dao động nền — cao độ đổi theo vùng để mỗi 10 tầng nghe khác nhau. */
let droneA: OscillatorNode | null = null;
let droneB: OscillatorNode | null = null;
/** Tần số gốc cho từng vùng (Hz) — đi xuống dần rồi lên lại ở vùng Hỗn Mang. */
const ZONE_DRONE = [55, 49, 62, 58, 46, 65, 52, 69, 44, 41];

export function initAudio(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  const len = Math.floor(ctx.sampleRate * 1.2);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  startAmbient();
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
}
export function getMuted(): boolean {
  return muted;
}

interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  dur: number;
  vol?: number;
  delay?: number;
  lp?: number;
}
function tone(o: ToneOpts): void {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(Math.max(1, o.f0), t0);
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let node: AudioNode = osc;
  if (o.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  f0?: number;
  f1?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
}
function noise(o: NoiseOpts): void {
  if (!ctx || !master || !noiseBuf || muted) return;
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.f0 ?? 1000, t0);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t0);
  s.stop(t0 + o.dur + 0.05);
}

export const sfx = {
  slash(): void {
    noise({ dur: 0.12, vol: 0.22, f0: 2400, f1: 500, q: 0.8 });
    tone({ type: 'triangle', f0: 180, f1: 90, dur: 0.08, vol: 0.05 });
  },
  heavy(): void {
    noise({ dur: 0.22, vol: 0.28, f0: 1400, f1: 200, q: 0.7 });
    tone({ type: 'sawtooth', f0: 120, f1: 50, dur: 0.2, vol: 0.1, lp: 600 });
  },
  hit(): void {
    tone({ type: 'square', f0: 150, f1: 70, dur: 0.09, vol: 0.14, lp: 900 });
    noise({ dur: 0.06, vol: 0.16, f0: 900, f1: 300 });
  },
  crit(): void {
    tone({ type: 'square', f0: 230, f1: 60, dur: 0.16, vol: 0.2, lp: 1000 });
    noise({ dur: 0.12, vol: 0.24, f0: 1600, f1: 200 });
  },
  hurt(): void {
    tone({ type: 'sawtooth', f0: 320, f1: 70, dur: 0.24, vol: 0.18, lp: 800 });
  },
  dodge(): void {
    noise({ dur: 0.16, vol: 0.14, f0: 1200, f1: 3400, type: 'highpass' });
  },
  jump(): void {
    tone({ type: 'sine', f0: 210, f1: 430, dur: 0.11, vol: 0.08 });
  },
  land(): void {
    noise({ dur: 0.07, vol: 0.1, f0: 420, f1: 120, type: 'lowpass' });
  },
  pickup(): void {
    tone({ type: 'sine', f0: 660, dur: 0.07, vol: 0.1 });
    tone({ type: 'sine', f0: 990, dur: 0.1, vol: 0.1, delay: 0.07 });
  },
  potion(): void {
    tone({ type: 'sine', f0: 520, f1: 780, dur: 0.16, vol: 0.12 });
    tone({ type: 'triangle', f0: 1040, dur: 0.1, vol: 0.07, delay: 0.1 });
  },
  levelup(): void {
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.14, delay: i * 0.09 }));
  },
  roar(): void {
    tone({ type: 'sawtooth', f0: 90, f1: 38, dur: 0.8, vol: 0.26, lp: 400 });
    noise({ dur: 0.7, vol: 0.18, f0: 300, f1: 80, type: 'lowpass' });
  },
  bossdie(): void {
    tone({ type: 'sawtooth', f0: 200, f1: 24, dur: 1.4, vol: 0.26, lp: 500 });
    noise({ dur: 1.2, vol: 0.22, f0: 800, f1: 60, type: 'lowpass' });
  },
  shoot(): void {
    tone({ type: 'triangle', f0: 900, f1: 300, dur: 0.08, vol: 0.09 });
  },
  splat(): void {
    noise({ dur: 0.1, vol: 0.12, f0: 500, f1: 150, type: 'lowpass' });
  },
  berserk(): void {
    tone({ type: 'sawtooth', f0: 80, f1: 640, dur: 0.5, vol: 0.18, lp: 1200 });
    noise({ dur: 0.5, vol: 0.14, f0: 200, f1: 3000, type: 'highpass' });
  },
  warn(): void {
    tone({ type: 'square', f0: 440, dur: 0.14, vol: 0.08 });
    tone({ type: 'square', f0: 415, dur: 0.14, vol: 0.08, delay: 0.2 });
  },
  click(): void {
    tone({ type: 'sine', f0: 480, dur: 0.05, vol: 0.08 });
  },
  spike(): void {
    noise({ dur: 0.18, vol: 0.18, f0: 700, f1: 2500, q: 2 });
    tone({ type: 'square', f0: 90, dur: 0.1, vol: 0.1, lp: 500 });
  },
  teleport(): void {
    noise({ dur: 0.2, vol: 0.14, f0: 400, f1: 2400, q: 3 });
  },
  beam(): void {
    tone({ type: 'sawtooth', f0: 1200, f1: 300, dur: 0.5, vol: 0.1, lp: 2000 });
    noise({ dur: 0.5, vol: 0.09, f0: 2000, f1: 400, type: 'highpass' });
  },
  death(): void {
    tone({ type: 'sawtooth', f0: 220, f1: 30, dur: 1.0, vol: 0.22, lp: 600 });
  },
};

/** Đổi cao độ nền theo vùng đang chơi (0–9). Chuyển mượt trong ~1.5 giây. */
export function setZoneMood(zoneIdx: number): void {
  if (!ctx) return;
  const f = ZONE_DRONE[((zoneIdx % ZONE_DRONE.length) + ZONE_DRONE.length) % ZONE_DRONE.length];
  droneA?.frequency.setTargetAtTime(f, ctx.currentTime, 0.5);
  droneB?.frequency.setTargetAtTime(f * 1.0145, ctx.currentTime, 0.5);
}

function startAmbient(): void {
  if (!ctx || !master || ambientStarted) return;
  ambientStarted = true;
  const t0 = ctx.currentTime;
  const o1 = ctx.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = 55;
  const o2 = ctx.createOscillator();
  o2.type = 'sawtooth';
  o2.frequency.value = 55.8;
  droneA = o1;
  droneB = o2;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 150;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  o1.connect(f);
  o2.connect(f);
  f.connect(g);
  g.connect(master);
  o1.start(t0);
  o2.start(t0);
  if (noiseBuf) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 320;
    const wg = ctx.createGain();
    wg.gain.value = 0.016;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lg = ctx.createGain();
    lg.gain.value = 0.008;
    lfo.connect(lg);
    lg.connect(wg.gain);
    s.connect(wf);
    wf.connect(wg);
    wg.connect(master);
    s.start(t0);
    lfo.start(t0);
  }
}
