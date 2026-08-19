import { sfx } from './audio';
import { IMG } from '../story';

export const VIEW_W = 1280;
export const VIEW_H = 720;
const GROUND = 632;
const ARENA_W = 2240;
const GRAV = 2150;

export interface RunStats {
  level: number;
  kills: number;
  score: number;
  time: number;
  floor: number;
  bestCombo: number;
}

export type EngineEvent =
  | { type: 'playing' }
  | { type: 'pause' }
  | { type: 'dead'; stats: RunStats }
  | { type: 'victory'; stats: RunStats }
  | { type: 'story'; chapter: number };

type EnemyKind = 'walker' | 'archer' | 'imp' | 'morgrim' | 'ishvara' | 'vodien';
type PKind = 'potion' | 'soul' | 'rage' | 'blade' | 'shield';

interface Plat { x: number; y: number; w: number }

interface Enemy {
  kind: EnemyKind; x: number; y: number; vx: number; vy: number; w: number; h: number;
  hp: number; maxHp: number; atk: number; spd: number; facing: number;
  state: string; t: number; cd: number; animT: number; hitT: number;
  usedSummon: boolean; flying: boolean; boss: boolean;
  beamState: number; beamAngle: number; seed: number;
  dead: boolean; deathT: number; didHit: boolean;
}

interface Proj { x: number; y: number; vx: number; vy: number; r: number; dmg: number; kind: 'arrow' | 'acid' | 'orb'; life: number; grav: number }
interface Spike { x: number; t: number; phase: 0 | 1 }
interface Pickup { kind: PKind; x: number; y: number; vy: number; t: number }
interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  size: number; color: string; grav: number; add: boolean; ring: boolean;
}
interface FloatTxt { x: number; y: number; txt: string; t: number; life: number; color: string; size: number }
interface Decal { x: number; y: number; w: number; a: number }
interface Toast { txt: string; t: number; color: string }
interface Banner { main: string; sub: string; t: number; life: number; color: string }
interface TrailPt { x: number; y: number; t: number; r: boolean }
interface Ghost { x: number; y: number; f: number; t: number }

interface Player {
  x: number; y: number; vx: number; vy: number; facing: number; onGround: boolean;
  hp: number; maxHp: number; atk: number; def: number; spd: number;
  level: number; xp: number; xpNext: number; rage: number; berserk: number;
  state: string; t: number; dur: number; comboStep: number; hitSet: Set<Enemy>;
  cd: number; dodgeCd: number; invuln: number; animT: number; hitT: number;
  bladeT: number; shield: number; dead: boolean; deathT: number; coyote: number;
  ghosts: Ghost[];
}

interface FloorCfg {
  name: string; numeral: string; img: string; tint: string; torchColor: string;
  torches: number[]; pillars: number[]; platforms: Plat[]; waves: EnemyKind[][];
  boss: EnemyKind; bossName: string; bossHp: number; groundTop: string;
}

const FLOORS: FloorCfg[] = [
  {
    name: 'CỔNG XƯƠNG', numeral: 'I', img: IMG.floor1, tint: 'rgba(16,22,38,0.42)', torchColor: '#ff9a3c',
    torches: [240, 660, 1080, 1500, 1920], pillars: [120, 520, 920, 1320, 1720, 2120],
    platforms: [{ x: 430, y: 502, w: 240 }, { x: 1150, y: 470, w: 260 }, { x: 1740, y: 516, w: 230 }],
    waves: [
      ['walker', 'walker'],
      ['walker', 'walker', 'archer'],
      ['walker', 'archer', 'imp'],
      ['archer', 'imp', 'imp', 'walker'],
    ],
    boss: 'morgrim', bossName: 'MORGRIM — KỊ SĨ PHẢN THỆ', bossHp: 850, groundTop: '#3a3a46',
  },
  {
    name: 'HẦM MÁU', numeral: 'II', img: IMG.floor2, tint: 'rgba(40,10,16,0.4)', torchColor: '#8dff9a',
    torches: [320, 760, 1200, 1640, 2040], pillars: [220, 640, 1060, 1480, 1900],
    platforms: [{ x: 360, y: 492, w: 230 }, { x: 1000, y: 452, w: 280 }, { x: 1640, y: 506, w: 240 }],
    waves: [
      ['archer', 'walker', 'imp'],
      ['walker', 'walker', 'archer', 'imp'],
      ['imp', 'imp', 'archer', 'walker'],
      ['walker', 'archer', 'imp', 'archer'],
    ],
    boss: 'ishvara', bossName: 'ISHVARA — SỨ ĐỒ ĐÓI KHÁT', bossHp: 1250, groundTop: '#46303a',
  },
  {
    name: 'ĐIỆN THỰC NHẬT', numeral: 'III', img: IMG.floor3, tint: 'rgba(24,12,40,0.38)', torchColor: '#c9b8ff',
    torches: [280, 720, 1160, 1600, 2020], pillars: [160, 580, 1000, 1420, 1840, 2180],
    platforms: [{ x: 470, y: 486, w: 250 }, { x: 1100, y: 440, w: 260 }, { x: 1700, y: 498, w: 250 }],
    waves: [
      ['imp', 'archer', 'walker', 'walker'],
      ['archer', 'imp', 'imp', 'archer'],
      ['walker', 'walker', 'imp', 'archer', 'imp'],
      ['imp', 'archer', 'walker', 'imp', 'walker'],
    ],
    boss: 'vodien', bossName: 'VÔ DIỆN THẦN — BÀN TAY TRÁI', bossHp: 1700, groundTop: '#3c3450',
  },
];

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp(t, 0, 1);
const easeOut = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const sign = (v: number): number => (v < 0 ? -1 : 1);

function chamfer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number): void {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onEvent: (e: EngineEvent) => void;
  private raf = 0;
  private last = 0;
  private scale = 1;

  private state: 'title' | 'playing' | 'story' | 'dead' | 'victory' = 'title';
  private paused = false;

  private floor = 0;
  private cfg: FloorCfg = FLOORS[0];

  private player: Player;
  private enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private spikes: Spike[] = [];
  private pickups: Pickup[] = [];
  private parts: Particle[] = [];
  private texts: FloatTxt[] = [];
  private decals: Decal[] = [];
  private toasts: Toast[] = [];
  private trail: TrailPt[] = [];
  private ghosts: Ghost[] = [];

  private camX = 0;
  private shake = 0;
  private flash = 0;
  private flashColor = '#ffffff';
  private freeze = 0;
  private slowmo = 0;
  private cinema = 0;
  private time = 0;
  private globalT = 0;

  private kills = 0;
  private score = 0;
  private combo = 0;
  private comboT = 0;
  private comboPop = 0;
  private bestCombo = 0;

  private waveIdx = 0;
  private waveDelay = 0;
  private bossActive = false;
  private bossWarn = 0;
  private floorDone = false;
  private doneT = 0;
  private banner: Banner | null = null;
  private hintsT = 0;
  private hpShow = 120;
  private ragePulse = 0;

  private keys = new Set<string>();
  private bufAtk = -9; private bufHeavy = -9; private bufJump = -9; private bufDodge = -9;
  private rng = mulberry(1234);

  private imgs: Record<string, HTMLImageElement> = {};
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouse: (e: MouseEvent) => void;
  private onCtx: (e: Event) => void;
  private onBlur: () => void;

  constructor(canvas: HTMLCanvasElement, onEvent: (e: EngineEvent) => void) {
    this.canvas = canvas;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('no 2d context');
    this.ctx = c;
    this.onEvent = onEvent;
    this.player = this.freshPlayer();

    for (const key of Object.values(IMG)) {
      const im = new Image();
      im.src = key;
      this.imgs[key] = im;
    }

    this.onKeyDown = (e) => this.keyDown(e);
    this.onKeyUp = (e) => { this.keys.delete(e.key.toLowerCase()); };
    this.onMouse = (e) => {
      if (this.state !== 'playing' || this.paused) return;
      if (e.button === 0) this.bufAtk = this.globalT;
      if (e.button === 2) this.bufHeavy = this.globalT;
    };
    this.onCtx = (e) => e.preventDefault();
    this.onBlur = () => {
      if (this.state === 'playing' && !this.paused) this.setPaused(true);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousedown', this.onMouse);
    canvas.addEventListener('contextmenu', this.onCtx);
    window.addEventListener('blur', this.onBlur);

    this.last = performance.now();
    const loop = (t: number): void => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (t - this.last) / 1000);
      this.last = t;
      this.globalT += dt;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousedown', this.onMouse);
    this.canvas.removeEventListener('contextmenu', this.onCtx);
    window.removeEventListener('blur', this.onBlur);
  }

  setView(cssW: number, cssH: number): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.scale = (cssW / VIEW_W) * dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
  }

  private keyDown(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    this.keys.add(k);
    if (e.repeat) return;
    if (k === 'p' || k === 'escape') {
      if (this.state === 'playing') this.setPaused(!this.paused);
      return;
    }
    if (this.state !== 'playing' || this.paused) return;
    if (k === 'j') this.bufAtk = this.globalT;
    if (k === 'k') this.bufHeavy = this.globalT;
    if (k === ' ' || k === 'w' || k === 'arrowup') this.bufJump = this.globalT;
    if (k === 'shift') this.bufDodge = this.globalT;
    if (k === 'q') this.tryBerserk();
  }

  setPaused(p: boolean): void {
    if (this.state !== 'playing') return;
    this.paused = p;
    this.onEvent({ type: p ? 'pause' : 'playing' });
  }

  getStats(): RunStats {
    return {
      level: this.player.level, kills: this.kills, score: this.score,
      time: this.time, floor: this.floor, bestCombo: this.bestCombo,
    };
  }

  private freshPlayer(): Player {
    return {
      x: 200, y: GROUND, vx: 0, vy: 0, facing: 1, onGround: true,
      hp: 120, maxHp: 120, atk: 14, def: 2, spd: 345,
      level: 1, xp: 0, xpNext: 90, rage: 0, berserk: 0,
      state: 'idle', t: 0, dur: 0.3, comboStep: 0, hitSet: new Set(),
      cd: 0, dodgeCd: 0, invuln: 0, animT: 0, hitT: 0,
      bladeT: 0, shield: 0, dead: false, deathT: 0, coyote: 0, ghosts: [],
    };
  }

  resetRun(): void {
    this.player = this.freshPlayer();
    this.enemies = []; this.projs = []; this.spikes = []; this.pickups = [];
    this.parts = []; this.texts = []; this.toasts = []; this.trail = [];
    this.decals = []; this.ghosts = [];
    this.kills = 0; this.score = 0; this.combo = 0; this.bestCombo = 0; this.time = 0;
    this.floor = 0; this.paused = false; this.bossActive = false; this.floorDone = false;
    this.banner = null; this.slowmo = 0; this.cinema = 0; this.bossWarn = 0;
    this.shake = 0; this.flash = 0; this.freeze = 0;
    this.state = 'title';
  }

  beginFloor(i: number): void {
    this.floor = i;
    this.cfg = FLOORS[i];
    this.rng = mulberry(777 + i * 91);
    this.enemies = []; this.projs = []; this.spikes = []; this.pickups = [];
    this.parts = []; this.texts = []; this.trail = []; this.decals = []; this.toasts = [];
    this.waveIdx = 0; this.waveDelay = 1.4; this.bossActive = false; this.floorDone = false;
    this.bossWarn = 0; this.banner = null; this.slowmo = 0; this.cinema = 0; this.paused = false;
    this.hintsT = i === 0 ? 10 : 5;
    const p = this.player;
    p.x = 190; p.y = GROUND; p.vx = 0; p.vy = 0; p.facing = 1;
    p.state = 'idle'; p.cd = 0; p.dodgeCd = 0; p.invuln = 0.5; p.bladeT = 0; p.shield = 0;
    p.dead = false; p.deathT = 0;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4));
    this.hpShow = p.hp;
    this.camX = 0;
    this.state = 'playing';
    this.showBanner(`TẦNG ${this.cfg.numeral} — ${this.cfg.name}`, 'tiêu diệt mọi kẻ địch để mở lối xuống sâu', '#e8dfc8', 2.6);
    this.onEvent({ type: 'playing' });
  }

  retryFloor(): void {
    const p = this.player;
    p.hp = Math.max(Math.round(p.maxHp * 0.6), 1);
    p.level = p.level;
    this.beginFloor(this.floor);
  }

  private showBanner(main: string, sub: string, color: string, life: number): void {
    this.banner = { main, sub, t: 0, life, color };
  }

  private toast(txt: string, color: string): void {
    this.toasts.push({ txt, t: 0, color });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  // ================= SPAWNING =================
  private makeEnemy(kind: EnemyKind, x: number): Enemy {
    const f = this.floor;
    const hpMul = 1 + f * 0.38;
    const base: Record<string, Partial<Enemy>> = {
      walker: { w: 46, h: 90, hp: 46, atk: 12, spd: 118 },
      archer: { w: 42, h: 86, hp: 34, atk: 10, spd: 100 },
      imp: { w: 42, h: 42, hp: 30, atk: 12, spd: 175, flying: true },
      morgrim: { w: 96, h: 176, hp: this.cfg.bossHp, atk: 24, spd: 250, boss: true },
      ishvara: { w: 180, h: 150, hp: this.cfg.bossHp, atk: 22, spd: 60, boss: true },
      vodien: { w: 76, h: 150, hp: this.cfg.bossHp, atk: 26, spd: 150, flying: true, boss: true },
    };
    const b = base[kind];
    const hp = Math.round((b.hp ?? 40) * (b.boss ? 1 : hpMul));
    return {
      kind, x, y: GROUND, vx: 0, vy: 0, w: b.w ?? 46, h: b.h ?? 90,
      hp, maxHp: hp, atk: (b.atk ?? 10) + (b.boss ? 0 : f * 3), spd: b.spd ?? 100,
      facing: -1, state: kind === 'imp' ? 'hover' : kind === 'vodien' ? 'idle' : 'walk',
      t: 0, cd: 1 + this.rng(), animT: this.rng() * 10, hitT: 0,
      usedSummon: false, flying: !!b.flying, boss: !!b.boss,
      beamState: 0, beamAngle: 0, seed: this.rng() * 100,
      dead: false, deathT: 0, didHit: false,
    };
  }

  private spawnWave(i: number): void {
    const wave = this.cfg.waves[i];
    const p = this.player;
    wave.forEach((kind, idx) => {
      const side = idx % 2 === 0 ? 1 : -1;
      const dist = 520 + this.rng() * 500 + idx * 60;
      const x = clamp(p.x + side * dist, 120, ARENA_W - 120);
      this.enemies.push(this.makeEnemy(kind, x));
      this.burst(x, GROUND - 40, 10, '#8a6cff', true);
    });
    this.showBanner(`ĐỢT ${i + 1} / ${this.cfg.waves.length}`, '', '#ff9a3c', 1.6);
    sfx.warn();
  }

  private spawnBoss(): void {
    const e = this.makeEnemy(this.cfg.boss, clamp(this.player.x + 620, 500, ARENA_W - 260));
    e.facing = sign(this.player.x - e.x);
    this.enemies.push(e);
    this.bossActive = true;
    this.showBanner(this.cfg.bossName, 'hãy giữ cái đầu của ngươi', '#ff3b52', 3);
    this.cinema = 1.6;
    this.shake = Math.max(this.shake, 14);
    sfx.roar();
    this.burst(e.x, e.y - 80, 40, '#ff3b52', true);
  }

  // ================= PARTICLES / FX =================
  private burst(x: number, y: number, n: number, color: string, add: boolean, spd = 260): void {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 420) this.parts.shift();
      const a = this.rng() * Math.PI * 2;
      const v = (0.25 + this.rng() * 0.75) * spd;
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
        life: 0.4 + this.rng() * 0.5, max: 0.9, size: 2 + this.rng() * 4,
        color, grav: 700, add, ring: false,
      });
    }
  }
  private ring(x: number, y: number, color: string, size: number): void {
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size, color, grav: 0, add: true, ring: true });
  }
  private soul(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (this.rng() - 0.5) * 30, y: y + (this.rng() - 0.5) * 30,
        vx: (this.rng() - 0.5) * 40, vy: -60 - this.rng() * 80,
        life: 0.8 + this.rng() * 0.5, max: 1.3, size: 2 + this.rng() * 3,
        color: '#3fe0b0', grav: -60, add: true, ring: false,
      });
    }
  }
  private blood(x: number, y: number, n: number, dir = 0): void {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 420) this.parts.shift();
      this.parts.push({
        x, y, vx: dir * (40 + this.rng() * 240) + (this.rng() - 0.5) * 160,
        vy: -80 - this.rng() * 200, life: 0.5 + this.rng() * 0.5, max: 1,
        size: 2 + this.rng() * 4, color: this.rng() > 0.4 ? '#a3122a' : '#5e0a18', grav: 900, add: false, ring: false,
      });
    }
  }
  private addText(x: number, y: number, txt: string, color: string, size = 20): void {
    if (this.texts.length > 46) this.texts.shift();
    this.texts.push({ x, y, txt, t: 0, life: 0.9, color, size });
  }

  // ================= COMBAT =================
  private swordAngle(p: Player): number {
    if (p.state === 'attack' || p.state === 'heavy') {
      const P = p.t / p.dur;
      const heavy = p.state === 'heavy';
      const windEnd = heavy ? 0.3 : 0.2;
      const sweepEnd = heavy ? 0.62 : 0.58;
      const startA = heavy ? -2.9 : -2.35;
      const endA = heavy ? 1.15 : 0.92;
      const idleA = 2.6;
      if (P < windEnd) return lerp(idleA, startA, P / windEnd);
      if (P < sweepEnd) return lerp(startA, endA, easeOut((P - windEnd) / (sweepEnd - windEnd)));
      return lerp(endA, idleA, easeOut((P - sweepEnd) / (1 - sweepEnd)));
    }
    if (p.state === 'dodge') return 2.1;
    const moving = Math.abs(p.vx) > 40;
    return 2.6 + Math.sin(p.animT * (moving ? 12 : 2.2)) * 0.08;
  }

  private tryAttack(heavy: boolean): void {
    const p = this.player;
    if (p.dead || p.state === 'dodge' || p.state === 'hurt') return;
    if (p.state === 'attack' || p.state === 'heavy') return; // chain only after the swing lands
    if (heavy) {
      if (p.cd > 0) return;
      p.state = 'heavy'; p.t = 0; p.dur = 0.52; p.hitSet = new Set(); p.cd = 0.62;
      p.vx += p.facing * 160;
      sfx.heavy();
      return;
    }
    if (p.cd > 0) return;
    const step = p.comboStep;
    p.state = 'attack'; p.t = 0;
    p.dur = step === 2 ? 0.4 : 0.3;
    p.hitSet = new Set();
    p.cd = step === 2 ? 0.34 : 0.1;
    p.comboStep = (step + 1) % 3;
    p.vx += p.facing * 120;
    sfx.slash();
  }

  private tryDodge(): void {
    const p = this.player;
    if (p.dead || p.dodgeCd > 0 || p.state === 'hurt') return;
    p.state = 'dodge'; p.t = 0; p.dur = 0.34;
    p.dodgeCd = 0.85;
    const dir = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0) + (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0);
    p.facing = dir !== 0 ? dir : p.facing;
    p.vx = p.facing * 760;
    p.vy = Math.min(p.vy, -60);
    sfx.dodge();
  }

  private tryBerserk(): void {
    const p = this.player;
    if (p.dead || p.rage < 100 || p.berserk > 0) return;
    p.berserk = 8;
    p.rage = 100;
    p.invuln = Math.max(p.invuln, 0.5);
    this.flash = 0.5; this.flashColor = '#ff2233';
    this.shake = Math.max(this.shake, 16);
    this.ring(p.x, p.y - 50, '#ff3b52', 190);
    this.burst(p.x, p.y - 50, 46, '#ff3b52', true, 380);
    this.showBanner('CUỒNG NỘ BÙNG CHÁY', 'sức mạnh của dấu ấn — 8 giây', '#ff3b52', 1.8);
    sfx.berserk();
  }

  private playerDamage(): number {
    const p = this.player;
    let d = p.atk * (p.berserk > 0 ? 1.8 : 1) * (p.bladeT > 0 ? 1.4 : 1);
    return d;
  }

  private hitEnemy(e: Enemy, raw: number, dir: number, heavy: boolean): void {
    if (e.dead) return;
    const crit = this.rng() < 0.12;
    let dmg = Math.max(1, Math.round(raw * (heavy ? 2.3 : 1) * (crit ? 1.7 : 1)));
    e.hp -= dmg;
    e.hitT = 0.14;
    if (!e.boss) e.vx += dir * (heavy ? 340 : 170);
    if (heavy && !e.boss) { e.vy = -420; e.y -= 2; }
    this.freeze = Math.max(this.freeze, heavy ? 0.085 : 0.05);
    this.shake = Math.max(this.shake, heavy ? 9 : 4);
    this.combo += 1;
    this.comboT = 2.6;
    this.comboPop = 0.22;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += Math.round(dmg * (1 + this.combo * 0.06));
    const p = this.player;
    p.rage = clamp(p.rage + (heavy ? 9 : 6), 0, 100);
    if (p.berserk > 0) p.hp = Math.min(p.maxHp, p.hp + Math.round(dmg * 0.25));
    this.blood(e.x, e.y - e.h * 0.55, heavy ? 16 : 8, dir);
    this.burst(e.x - dir * 10, e.y - e.h * 0.55, 6, '#ffd23c', true, 220);
    this.addText(e.x + (this.rng() - 0.5) * 30, e.y - e.h - 8, String(dmg), crit ? '#ffd23c' : '#ffe9e0', crit ? 30 : 20);
    if (crit) { this.addText(e.x, e.y - e.h - 40, 'CHÍ MẠNG!', '#ffd23c', 15); sfx.crit(); } else sfx.hit();
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    e.dead = true;
    e.deathT = 0;
    this.kills += 1;
    const bonus = e.boss ? 500 + this.floor * 400 : 30 + this.floor * 15;
    this.score += bonus;
    this.blood(e.x, e.y - e.h * 0.5, e.boss ? 60 : 18);
    this.soul(e.x, e.y - e.h * 0.6, e.boss ? 30 : 8);
    this.ring(e.x, e.y - e.h * 0.5, e.boss ? '#ff3b52' : '#3fe0b0', e.boss ? 260 : 90);
    this.decals.push({ x: e.x + (this.rng() - 0.5) * 20, y: e.y + 4, w: e.boss ? 130 : 34 + this.rng() * 30, a: 0.55 });
    if (this.decals.length > 60) this.decals.shift();
    this.gainXp(e.boss ? 130 + this.floor * 70 : e.kind === 'archer' ? 18 : e.kind === 'imp' ? 16 : 14);
    if (e.boss) {
      this.slowmo = 1.3;
      this.cinema = 2.2;
      this.shake = Math.max(this.shake, 22);
      this.flash = 0.6; this.flashColor = '#ffffff';
      sfx.bossdie();
      // khi thủ lĩnh gục ngã, tàn binh cũng tan biến theo
      for (const other of this.enemies) {
        if (other !== e && !other.dead) {
          other.hp = 0;
          this.killEnemy(other);
        }
      }
      for (let i = 0; i < 3; i++) this.dropPickup(e.x + (i - 1) * 70, e.y - 120, true);
      this.bossActive = false;
      this.floorDone = true;
      this.doneT = 2.6;
      this.showBanner('THỦ LĨNH ĐÃ GỤC NGÃ', 'lối xuống tầng sâu đã mở', '#3fe0b0', 2.4);
    } else {
      sfx.splat();
      if (this.rng() < 0.34) this.dropPickup(e.x, e.y - 60, false);
    }
  }

  private dropPickup(x: number, y: number, guaranteed: boolean): void {
    let kind: PKind;
    const r = this.rng();
    if (r < 0.34) kind = 'potion';
    else if (r < 0.62) kind = 'soul';
    else if (r < 0.78) kind = 'rage';
    else if (r < 0.9) kind = 'blade';
    else kind = 'shield';
    if (guaranteed && this.rng() < 0.5) kind = 'potion';
    this.pickups.push({ kind, x: clamp(x + (this.rng() - 0.5) * 60, 60, ARENA_W - 60), y, vy: -260 - this.rng() * 120, t: 0 });
  }

  private applyPickup(pk: Pickup): void {
    const p = this.player;
    switch (pk.kind) {
      case 'potion': {
        const heal = Math.round(p.maxHp * 0.35);
        p.hp = Math.min(p.maxHp, p.hp + heal);
        this.addText(p.x, p.y - 120, `+${heal} HP`, '#7dff8a', 20);
        this.toast('DƯỢC THỦY ĐỎ — hồi 35% sinh lực', '#7dff8a');
        sfx.potion();
        break;
      }
      case 'soul':
        this.gainXp(30);
        this.toast('MẢNH LINH HỒN — +30 kinh nghiệm', '#3fe0b0');
        sfx.pickup();
        break;
      case 'rage':
        p.rage = clamp(p.rage + 45, 0, 100);
        this.toast('BÙA CUỒNG NỘ — thanh nộ dâng trào', '#ff9a3c');
        sfx.pickup();
        break;
      case 'blade':
        p.bladeT = 12;
        this.toast('LƯỠI QUỶ — +40% sát thương (12s)', '#ffd23c');
        sfx.pickup();
        break;
      case 'shield':
        p.shield = Math.min(80, p.shield + 45);
        this.toast('GIÁP MÁU — hấp thụ 45 sát thương', '#8ab8ff');
        sfx.pickup();
        break;
    }
    this.ring(pk.x, pk.y - 20, '#e8dfc8', 60);
  }

  private gainXp(n: number): void {
    const p = this.player;
    p.xp += n;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = Math.round(p.xpNext * 1.35);
      p.maxHp += 18; p.atk += 3; p.def += 1; p.spd += 5;
      p.hp = p.maxHp;
      p.rage = clamp(p.rage + 25, 0, 100);
      this.addText(p.x, p.y - 150, 'THĂNG CẤP!', '#ffd23c', 26);
      this.ring(p.x, p.y - 60, '#ffd23c', 160);
      this.burst(p.x, p.y - 60, 26, '#ffd23c', true, 320);
      this.flash = 0.25; this.flashColor = '#ffd23c';
      sfx.levelup();
    }
  }

  private damagePlayer(raw: number, srcX: number): void {
    const p = this.player;
    if (p.dead || p.invuln > 0 || p.state === 'dodge' || this.state !== 'playing') return;
    let dmg = Math.max(1, Math.round(raw - p.def));
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
      dmg -= absorbed;
      this.addText(p.x, p.y - 130, 'CHẶN!', '#8ab8ff', 16);
    }
    if (dmg > 0) {
      p.hp -= dmg;
      p.hitT = 0.22;
      this.blood(p.x, p.y - 60, 12, sign(p.x - srcX));
      this.addText(p.x, p.y - 120, `-${dmg}`, '#ff5566', 20);
    }
    p.rage = clamp(p.rage + 14, 0, 100);
    p.invuln = 0.9;
    p.state = 'hurt'; p.t = 0;
    p.vx = sign(p.x - srcX) * 300;
    p.vy = -180;
    this.combo = 0;
    this.shake = Math.max(this.shake, 9);
    this.flash = 0.3; this.flashColor = '#a3122a';
    sfx.hurt();
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      p.deathT = 0;
      p.state = 'dead';
      this.blood(p.x, p.y - 50, 40);
      this.flash = 0.8; this.flashColor = '#3a0510';
      sfx.death();
    }
  }

  // ================= UPDATE =================
  private tick(dt: number): void {
    if (this.paused) { this.draw(); return; }
    if (this.freeze > 0) { this.freeze -= dt; this.draw(); return; }
    const ts = this.slowmo > 0 ? 0.32 : 1;
    if (this.slowmo > 0) this.slowmo -= dt;
    if (this.cinema > 0) this.cinema -= dt;
    const wdt = dt * ts;

    if (this.state === 'playing') this.updateWorld(wdt, dt);
    else this.updateAmbient(wdt);

    this.draw();
  }

  private updateAmbient(dt: number): void {
    this.updateParticles(dt);
    this.globalT += 0;
  }

  private updateWorld(dt: number, realDt: number): void {
    const p = this.player;
    if (!p.dead) this.time += dt;
    if (this.hintsT > 0) this.hintsT -= realDt;
    if (this.banner) {
      this.banner.t += realDt;
      if (this.banner.t > this.banner.life) this.banner = null;
    }
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.comboPop > 0) this.comboPop -= realDt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 34);
    if (this.flash > 0) this.flash -= realDt * 1.6;
    this.hpShow = lerp(this.hpShow, p.hp, realDt * 9);
    this.ragePulse += realDt;

    // ---------- wave / boss flow ----------
    if (!this.floorDone && !this.bossActive && this.bossWarn <= 0) {
      if (this.enemies.every((e) => e.dead)) {
        if (this.waveDelay > 0) this.waveDelay -= dt;
        else {
          if (this.waveIdx < this.cfg.waves.length) {
            this.spawnWave(this.waveIdx);
            this.waveIdx += 1;
            this.waveDelay = 0.8;
          } else if (this.enemies.length > 0 || this.waveIdx >= this.cfg.waves.length) {
            if (this.waveIdx >= this.cfg.waves.length && this.enemies.filter((e) => !e.dead).length === 0) {
              this.bossWarn = 2.2;
              this.showBanner('SÁT KHÍ BÙNG LÊN...', this.cfg.bossName, '#ff3b52', 2.1);
              sfx.roar();
              this.shake = Math.max(this.shake, 10);
            }
          }
        }
      }
    }
    if (this.bossWarn > 0) {
      this.bossWarn -= dt;
      if (this.bossWarn <= 0) this.spawnBoss();
    }
    if (this.floorDone) {
      this.doneT -= dt;
      if (this.doneT <= 0) {
        this.floorDone = false;
        if (this.floor >= FLOORS.length - 1) {
          this.state = 'victory';
          this.onEvent({ type: 'victory', stats: this.getStats() });
          return;
        }
        this.state = 'story';
        this.onEvent({ type: 'story', chapter: this.floor + 1 });
        return;
      }
    }

    if (!p.dead) this.updatePlayer(dt);
    else {
      p.deathT += dt;
      if (p.deathT > 1.5) {
        this.state = 'dead';
        this.onEvent({ type: 'dead', stats: this.getStats() });
        return;
      }
    }

    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.enemies = this.enemies.filter((e) => !e.dead || e.deathT < 0.55);
    for (const e of this.enemies) if (e.dead) e.deathT += dt;

    this.updateProjectiles(dt);
    this.updateSpikes(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);

    // trail decay
    this.trail = this.trail.filter((t) => this.globalT - t.t < 0.22);
    this.ghosts = this.ghosts.filter((g) => this.globalT - g.t < 0.28);

    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < t.life);
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < 3.2);

    // ambient embers
    if (this.parts.length < 380 && Math.random() < 0.5) {
      this.parts.push({
        x: this.camX + Math.random() * VIEW_W, y: GROUND + 10,
        vx: (Math.random() - 0.5) * 24, vy: -24 - Math.random() * 46,
        life: 2 + Math.random() * 2, max: 4, size: 1.2 + Math.random() * 2,
        color: this.cfg.torchColor, grav: -8, add: true, ring: false,
      });
    }

    // camera
    const target = clamp(p.x + p.facing * 60 - VIEW_W / 2, 0, ARENA_W - VIEW_W);
    this.camX = lerp(this.camX, target, Math.min(1, dt * 6.5));
  }

  private updateParticles(dt: number): void {
    for (const pt of this.parts) {
      pt.life -= dt;
      pt.vy += pt.grav * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    this.parts = this.parts.filter((pt) => pt.life > 0);
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    p.animT += dt * (Math.abs(p.vx) > 40 ? 1.25 : 1);
    if (p.cd > 0) p.cd -= dt;
    if (p.dodgeCd > 0) p.dodgeCd -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hitT > 0) p.hitT -= dt;
    if (p.bladeT > 0) p.bladeT -= dt;
    if (p.berserk > 0) {
      p.berserk -= dt;
      p.hp = Math.min(p.maxHp, p.hp + dt * 2.2);
      if (Math.random() < 0.6) {
        this.parts.push({
          x: p.x + (Math.random() - 0.5) * 40, y: p.y - Math.random() * 90,
          vx: (Math.random() - 0.5) * 30, vy: -120 - Math.random() * 80,
          life: 0.35, max: 0.35, size: 2 + Math.random() * 4,
          color: '#ff3b52', grav: 0, add: true, ring: false,
        });
      }
      if (p.berserk <= 0) { p.rage = 0; this.toast('Cuồng nộ lắng xuống...', '#9a917f'); }
    }
    if (p.coyote > 0) p.coyote -= dt;

    const left = this.keys.has('a') || this.keys.has('arrowleft');
    const right = this.keys.has('d') || this.keys.has('arrowright');
    const dir = (right ? 1 : 0) - (left ? 1 : 0);

    const locked = p.state === 'attack' || p.state === 'heavy' || p.state === 'dodge' || p.state === 'hurt';

    // state machine timing
    if (p.state === 'attack' || p.state === 'heavy' || p.state === 'dodge' || p.state === 'hurt') {
      p.t += dt;
      if (p.state === 'attack') this.attackSweep(p, false);
      if (p.state === 'heavy') this.attackSweep(p, true);
      if (p.t >= p.dur) {
        const wasDodge = p.state === 'dodge';
        p.state = p.onGround ? 'idle' : 'fall';
        if (wasDodge) p.t = -0.25; // brief lockout so the run state re-triggers next frame
      }
    }

    // movement
    if (!locked && !p.dead) {
      if (dir !== 0) {
        p.facing = dir;
        p.vx = lerp(p.vx, dir * p.spd * (p.berserk > 0 ? 1.3 : 1), Math.min(1, dt * (p.onGround ? 14 : 8)));
        if (p.onGround && p.state !== 'jump') p.state = 'run';
      } else {
        p.vx = lerp(p.vx, 0, Math.min(1, dt * (p.onGround ? 16 : 4)));
        if (p.onGround && p.state !== 'jump') p.state = 'idle';
      }
    } else if (p.state === 'attack' || p.state === 'heavy') {
      p.vx = lerp(p.vx, 0, Math.min(1, dt * (p.onGround ? 10 : 2.5)));
    }

    // buffered actions
    const now = this.globalT;
    if (now - this.bufJump < 0.14) {
      if (p.onGround || p.coyote > 0) {
        p.vy = -780 * (p.berserk > 0 ? 1.06 : 1);
        p.onGround = false;
        p.coyote = 0;
        p.state = 'jump';
        this.bufJump = -9;
        this.burst(p.x, p.y, 6, '#6a6478', false, 120);
        sfx.jump();
      }
    }
    if (now - this.bufDodge < 0.16) { this.tryDodge(); this.bufDodge = -9; }
    if (now - this.bufAtk < 0.3) { this.tryAttack(false); this.bufAtk = -9; }
    if (now - this.bufHeavy < 0.3) { this.tryAttack(true); this.bufHeavy = -9; }

    // physics
    const prevY = p.y;
    p.vy += GRAV * dt * (p.state === 'dodge' ? 0.35 : 1);
    p.x = clamp(p.x + p.vx * dt, 40, ARENA_W - 40);
    p.y += p.vy * dt;
    p.onGround = false;
    if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; p.coyote = 0.09; }
    for (const pl of this.cfg.platforms) {
      if (p.vy >= 0 && prevY <= pl.y + 2 && p.y >= pl.y && p.x > pl.x - 6 && p.x < pl.x + pl.w + 6) {
        p.y = pl.y; p.vy = 0; p.onGround = true; p.coyote = 0.09;
      }
    }
    if (!p.onGround && p.vy > 40 && p.state === 'jump') p.state = 'fall';

    if (p.state === 'dodge') {
      this.ghosts.push({ x: p.x, y: p.y, f: p.facing, t: this.globalT });
    }

    // sword trail
    if (p.state === 'attack' || p.state === 'heavy') {
      const a = this.swordAngle(p);
      const hx = p.x + p.facing * (6 + Math.cos(a) * 24);
      const hy = p.y - 74 + Math.sin(a) * 24;
      const tx = hx + p.facing * Math.cos(a) * 116;
      const ty = hy + Math.sin(a) * 116;
      this.trail.push({ x: tx, y: ty, t: this.globalT, r: p.berserk > 0 });
      if (this.trail.length > 26) this.trail.shift();
    }
  }

  private attackSweep(p: Player, heavy: boolean): void {
    const P = p.t / p.dur;
    const activeFrom = heavy ? 0.3 : 0.2;
    const activeTo = heavy ? 0.62 : 0.58;
    if (P < activeFrom || P > activeTo) return;
    const reach = heavy ? 165 : p.comboStep === 0 ? 128 : 140;
    const boxX0 = p.x + p.facing * 14;
    const boxX1 = p.x + p.facing * reach;
    const x0 = Math.min(boxX0, boxX1);
    const x1 = Math.max(boxX0, boxX1);
    const y0 = p.y - (heavy ? 130 : 100);
    const y1 = p.y + 8;
    for (const e of this.enemies) {
      if (e.dead || p.hitSet.has(e)) continue;
      const ex0 = e.x - e.w / 2, ex1 = e.x + e.w / 2, ey0 = e.y - e.h, ey1 = e.y;
      if (x1 > ex0 && x0 < ex1 && y1 > ey0 && y0 < ey1) {
        p.hitSet.add(e);
        this.hitEnemy(e, this.playerDamage(), p.facing, heavy);
      }
    }
  }

  // ================= ENEMY AI =================
  private updateEnemy(e: Enemy, dt: number): void {
    if (e.dead) return;
    e.animT += dt;
    if (e.hitT > 0) e.hitT -= dt;
    const p = this.player;
    if (!e.flying) {
      const prevY = e.y;
      e.vy += GRAV * dt;
      e.y += e.vy * dt;
      if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; }
      for (const pl of this.cfg.platforms) {
        if (e.vy >= 0 && prevY <= pl.y + 2 && e.y >= pl.y && e.x > pl.x && e.x < pl.x + pl.w) { e.y = pl.y; e.vy = 0; }
      }
    } else {
      e.y += e.vy * dt;
    }
    e.x = clamp(e.x + e.vx * dt, 70, ARENA_W - 70);
    if (!(e.kind === 'imp' && (e.state === 'dive' || e.state === 'rise'))) {
      e.vx = lerp(e.vx, 0, Math.min(1, dt * 6));
    }

    const dist = p.x - e.x;
    const adist = Math.abs(dist);

    switch (e.kind) {
      case 'walker': this.aiWalker(e, dt, dist, adist); break;
      case 'archer': this.aiArcher(e, dt, dist, adist); break;
      case 'imp': this.aiImp(e, dt); break;
      case 'morgrim': this.aiMorgrim(e, dt, dist, adist); break;
      case 'ishvara': this.aiIshvara(e, dt, dist, adist); break;
      case 'vodien': this.aiVodien(e, dt, adist); break;
    }

    // contact damage (non-walker, walker handled in attack)
    if ((e.kind === 'morgrim' || e.kind === 'ishvara' || e.kind === 'vodien') && !p.dead) {
      const ex0 = e.x - e.w / 2, ex1 = e.x + e.w / 2;
      if (p.x > ex0 - 14 && p.x < ex1 + 14 && p.y > e.y - e.h && p.y - 96 < e.y) {
        if (e.kind === 'morgrim' && e.state === 'charge') this.damagePlayer(e.atk + 4, e.x);
        else if (e.kind !== 'morgrim') this.damagePlayer(10, e.x);
      }
    }
  }

  private aiWalker(e: Enemy, dt: number, dist: number, adist: number): void {
    if (!e.dead) e.facing = sign(dist);
    switch (e.state) {
      case 'walk':
        e.vx = lerp(e.vx, e.facing * e.spd, Math.min(1, dt * 8));
        if (adist < 74 && Math.abs(this.player.y - e.y) < 60) { e.state = 'windup'; e.t = 0; e.vx = 0; }
        break;
      case 'windup':
        e.t += dt;
        if (e.t > 0.42) { e.state = 'attack'; e.t = 0; e.didHit = false; }
        break;
      case 'attack':
        e.t += dt;
        if (!e.didHit && e.t > 0.04 && e.t < 0.18) {
          if (adist < 92 && Math.abs(this.player.y - e.y) < 70) {
            e.didHit = true;
            this.damagePlayer(e.atk, e.x);
          }
        }
        if (e.t > 0.32) { e.state = 'recover'; e.t = 0; }
        break;
      case 'recover':
        e.t += dt;
        if (e.t > 0.55) { e.state = 'walk'; }
        break;
    }
  }

  private aiArcher(e: Enemy, dt: number, dist: number, adist: number): void {
    e.facing = sign(dist);
    if (e.state === 'roam' || e.state === 'walk') {
      e.state = 'roam';
      const want = adist > 400 ? e.facing * e.spd : adist < 250 ? -e.facing * e.spd : 0;
      e.vx = lerp(e.vx, want, Math.min(1, dt * 6));
      e.cd -= dt;
      if (e.cd <= 0 && adist < 760) { e.state = 'aim'; e.t = 0; e.vx = 0; }
    } else if (e.state === 'aim') {
      e.t += dt;
      if (e.t > 0.6) {
        const px = this.player.x, py = this.player.y - 55;
        const dx = px - e.x, dy = py - (e.y - 60);
        const d = Math.hypot(dx, dy) || 1;
        const sp = 560;
        this.projs.push({ x: e.x + e.facing * 16, y: e.y - 60, vx: (dx / d) * sp, vy: (dy / d) * sp, r: 7, dmg: e.atk, kind: 'arrow', life: 2.4, grav: 340 });
        sfx.shoot();
        e.state = 'roam';
        e.cd = 1.9 + this.rng() * 0.9;
      }
    }
  }

  private aiImp(e: Enemy, dt: number): void {
    const p = this.player;
    if (e.state === 'hover') {
      e.facing = sign(p.x - e.x);
      const tx = p.x + Math.sin(e.animT * 1.9 + e.seed) * 90;
      const ty = p.y - 170 + Math.sin(e.animT * 3.1 + e.seed) * 34;
      e.x = lerp(e.x, tx, Math.min(1, dt * 2.2));
      e.y = lerp(e.y, ty, Math.min(1, dt * 2.6));
      e.cd -= dt;
      if (e.cd <= 0) {
        e.state = 'dive'; e.t = 0;
        const dx = p.x - e.x, dy = p.y - 55 - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.vx = (dx / d) * 620;
        e.vy = (dy / d) * 620;
      }
    } else if (e.state === 'dive') {
      e.t += dt;
      e.x += 0; // velocity applied in outer x integration
      if (!e.didHit && Math.hypot(p.x - e.x, p.y - 55 - e.y) < 46) {
        e.didHit = true;
        this.damagePlayer(e.atk, e.x);
      }
      if (e.t > 0.55 || e.y > GROUND - 16) {
        e.state = 'rise'; e.t = 0; e.vy = -460; e.vx = 0;
      }
    } else if (e.state === 'rise') {
      e.t += dt;
      e.vy = lerp(e.vy, 0, dt * 2);
      if (e.t > 0.6) { e.state = 'hover'; e.cd = 2.1 + this.rng(); e.didHit = false; }
    }
  }

  private aiMorgrim(e: Enemy, dt: number, dist: number, adist: number): void {
    e.facing = sign(dist);
    const enr = e.hp < e.maxHp * 0.45;
    if (!e.usedSummon && e.hp < e.maxHp * 0.55) {
      e.usedSummon = true;
      for (let i = 0; i < 2; i++) {
        const s = this.makeEnemy('walker', clamp(e.x + (i === 0 ? -160 : 160), 120, ARENA_W - 120));
        this.enemies.push(s);
        this.burst(s.x, GROUND - 50, 14, '#8a6cff', true);
      }
      this.showBanner('MORGRIM GỌI TÀN BINH', '', '#8a6cff', 1.6);
      sfx.roar();
    }
    switch (e.state) {
      case 'walk':
      case 'idle':
        e.state = 'idle';
        e.vx = lerp(e.vx, e.facing * e.spd * 0.5, Math.min(1, dt * 5));
        e.cd -= dt;
        if (e.cd <= 0) {
          if (adist > 360) { e.state = 'chargeT'; e.t = 0; }
          else {
            const r = this.rng();
            if (r < 0.42) { e.state = 'slamT'; e.t = 0; e.vy = -980; }
            else if (r < 0.75) { e.state = 'chargeT'; e.t = 0; }
            else { e.state = 'swipeT'; e.t = 0; }
          }
        }
        break;
      case 'chargeT':
        e.t += dt;
        e.vx = 0;
        if (e.t > (enr ? 0.5 : 0.72)) {
          e.state = 'charge'; e.t = 0;
          e.vx = e.facing * (enr ? 1020 : 860);
          sfx.heavy();
        }
        break;
      case 'charge':
        e.t += dt;
        e.vx = e.facing * (enr ? 1020 : 860);
        if (Math.random() < 0.5) this.parts.push({ x: e.x - e.facing * 40, y: e.y - 60, vx: -e.facing * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, size: 3, color: '#8a8498', grav: 0, add: false, ring: false });
        if (e.t > 1.05 || e.x <= 90 || e.x >= ARENA_W - 90) {
          e.state = 'idle'; e.cd = enr ? 1.3 : 2.1; e.vx = 0;
          this.shake = Math.max(this.shake, 7);
        }
        break;
      case 'slamT':
        e.t += dt;
        e.vx = lerp(e.vx, e.facing * 240, Math.min(1, dt * 3));
        if (e.y >= GROUND && e.t > 0.25) {
          e.state = 'slam'; e.t = 0;
          this.shake = Math.max(this.shake, 14);
          this.ring(e.x, GROUND, '#ff9a3c', 200);
          this.burst(e.x, GROUND - 10, 26, '#6a6478', false, 320);
          sfx.heavy();
          const pl = this.player;
          if (Math.abs(pl.x - e.x) < 190 && pl.onGround) this.damagePlayer(e.atk, e.x);
          else if (Math.abs(pl.x - e.x) < 190) this.damagePlayer(Math.round(e.atk * 0.6), e.x);
        }
        break;
      case 'slam':
        e.t += dt;
        if (e.t > 0.5) { e.state = 'idle'; e.cd = enr ? 1.2 : 1.9; }
        break;
      case 'swipeT':
        e.t += dt;
        if (e.t > 0.38) { e.state = 'swipe'; e.t = 0; e.didHit = false; }
        break;
      case 'swipe':
        e.t += dt;
        if (!e.didHit && e.t > 0.02 && e.t < 0.2) {
          e.didHit = true;
          if (adist < 180 && Math.abs(this.player.y - e.y) < 120) this.damagePlayer(e.atk - 4, e.x);
        }
        if (e.t > 0.4) { e.state = 'idle'; e.cd = enr ? 1.1 : 1.7; }
        break;
    }
  }

  private aiIshvara(e: Enemy, dt: number, dist: number, adist: number): void {
    e.facing = sign(dist);
    const enr = e.hp < e.maxHp * 0.4;
    e.x = lerp(e.x, clamp(this.player.x + (this.player.x < ARENA_W / 2 ? 380 : -380), 380, ARENA_W - 380), Math.min(1, dt * 0.5));
    switch (e.state) {
      case 'idle':
      case 'walk':
        e.state = 'idle';
        e.cd -= dt;
        if (e.cd <= 0) {
          const r = this.rng();
          if (adist < 280 && r < 0.5) { e.state = 'sweepT'; e.t = 0; }
          else if (e.hp < e.maxHp * 0.6 && r < 0.75) {
            e.state = 'spikeT'; e.t = 0;
          } else { e.state = 'spitT'; e.t = 0; }
        }
        break;
      case 'sweepT':
        e.t += dt;
        if (e.t > 0.5) { e.state = 'sweep'; e.t = 0; e.didHit = false; sfx.heavy(); }
        break;
      case 'sweep':
        e.t += dt;
        if (!e.didHit) {
          e.didHit = true;
          if (adist < 250 && Math.abs(this.player.y - e.y) < 140) {
            this.damagePlayer(e.atk + 2, e.x);
          }
          this.ring(e.x, e.y - 60, '#c9b8ff', 240);
        }
        if (e.t > 0.42) { e.state = 'idle'; e.cd = enr ? 1.2 : 2.0; }
        break;
      case 'spitT':
        e.t += dt;
        if (e.t > 0.55) {
          e.state = 'spit'; e.t = 0;
          const px = this.player.x, py = this.player.y - 50;
          for (let i = -1; i <= 1; i++) {
            const dx = px - e.x + i * 90, dy = py - (e.y - 90);
            const d = Math.hypot(dx, dy) || 1;
            const sp = 430;
            this.projs.push({ x: e.x + e.facing * 40, y: e.y - 90, vx: (dx / d) * sp, vy: (dy / d) * sp - 160, r: 11, dmg: e.atk - 6, kind: 'acid', life: 3, grav: 760 });
          }
          sfx.splat();
        }
        break;
      case 'spit':
        e.t += dt;
        if (e.t > 0.3) { e.state = 'idle'; e.cd = enr ? 1.4 : 2.3; }
        break;
      case 'spikeT':
        e.t += dt;
        if (e.t > 0.4) {
          e.state = 'idle'; e.cd = enr ? 1.6 : 2.4;
          const px = this.player.x;
          for (let i = 0; i < 3; i++) {
            this.spikes.push({ x: clamp(px + (i - 1) * 110, 100, ARENA_W - 100), t: i * 0.22, phase: 0 });
          }
          sfx.warn();
        }
        break;
    }
  }

  private aiVodien(e: Enemy, dt: number, adist: number): void {
    const p = this.player;
    const enr = e.hp < e.maxHp * 0.3;
    e.facing = sign(p.x - e.x);
    const hoverY = GROUND - 190 + Math.sin(e.animT * 2.2) * 26;
    if (!e.usedSummon && e.hp < e.maxHp * 0.6) {
      e.usedSummon = true;
      for (let i = 0; i < 2; i++) {
        const s = this.makeEnemy('imp', clamp(p.x + (i === 0 ? -300 : 300), 120, ARENA_W - 120));
        s.y = GROUND - 260;
        this.enemies.push(s);
        this.burst(s.x, s.y, 14, '#8a6cff', true);
      }
      this.showBanner('VÔ DIỆN THẦN THẢ QUỶ ĐÓI', '', '#8a6cff', 1.6);
      sfx.roar();
    }
    switch (e.state) {
      case 'idle':
        e.x = lerp(e.x, p.x + (p.x > ARENA_W / 2 ? -320 : 320), Math.min(1, dt * 1.4));
        e.y = lerp(e.y, hoverY, Math.min(1, dt * 3));
        e.cd -= dt;
        if (e.cd <= 0) {
          const r = this.rng();
          if (r < 0.3) { e.state = 'blink'; e.t = 0; }
          else if (r < 0.58) { e.state = 'ringT'; e.t = 0; }
          else if (r < 0.84) { e.state = 'beamT'; e.t = 0; }
          else { e.state = 'blink'; e.t = 0; }
        }
        break;
      case 'blink':
        e.t += dt;
        if (e.t > 0.28 && e.t - dt <= 0.28) {
          this.burst(e.x, e.y - 70, 16, '#c9b8ff', true);
          e.x = clamp(p.x - p.facing * 170, 90, ARENA_W - 90);
          e.y = Math.min(hoverY, GROUND - 130);
          sfx.teleport();
          this.burst(e.x, e.y - 70, 16, '#c9b8ff', true);
        }
        if (e.t > 0.5) { e.state = 'slashT'; e.t = 0; }
        break;
      case 'slashT':
        e.t += dt;
        e.y = lerp(e.y, p.y - 120, Math.min(1, dt * 8));
        if (e.t > 0.24) { e.state = 'slash'; e.t = 0; e.didHit = false; sfx.slash(); }
        break;
      case 'slash':
        e.t += dt;
        if (!e.didHit && e.t > 0.02 && e.t < 0.18) {
          e.didHit = true;
          if (adist < 190 && Math.abs(p.y - 60 - (e.y - 60)) < 130) this.damagePlayer(e.atk - 4, e.x);
        }
        if (e.t > 0.36) { e.state = 'idle'; e.cd = enr ? 0.9 : 1.5; }
        break;
      case 'ringT':
        e.t += dt;
        e.y = lerp(e.y, hoverY, Math.min(1, dt * 3));
        if (e.t > 0.5) {
          e.state = 'idle'; e.cd = enr ? 1.0 : 1.7;
          const n = 12;
          const cx = e.x, cy = e.y - 70;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const sp = enr ? 320 : 260;
            this.projs.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, dmg: 12, kind: 'orb', life: 3.4, grav: 0 });
          }
          this.ring(cx, cy, '#ff3b52', 120);
          sfx.shoot();
        }
        break;
      case 'beamT':
        e.t += dt;
        e.y = lerp(e.y, hoverY - 30, Math.min(1, dt * 3));
        e.beamAngle = Math.atan2(p.y - 55 - (e.y - 70), p.x - e.x);
        if (e.t > 0.85) {
          e.state = 'beam'; e.t = 0;
          sfx.beam();
        }
        break;
      case 'beam':
        e.t += dt;
        e.beamAngle += (enr ? 1.1 : 0.75) * dt * (e.seed > 50 ? 1 : -1);
        {
          const bx = e.x, by = e.y - 70;
          const ex = bx + Math.cos(e.beamAngle) * 900;
          const ey = by + Math.sin(e.beamAngle) * 900;
          const px = p.x, py = p.y - 55;
          const dx = ex - bx, dy = ey - by;
          const L2 = dx * dx + dy * dy;
          let t = ((px - bx) * dx + (py - by) * dy) / L2;
          t = clamp(t, 0, 1);
          const cx = bx + dx * t, cy = by + dy * t;
          if (Math.hypot(px - cx, py - cy) < 30) this.damagePlayer(e.atk, e.x);
        }
        if (e.t > 1.15) { e.state = 'idle'; e.cd = enr ? 1.1 : 1.9; }
        break;
    }
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (const pr of this.projs) {
      pr.life -= dt;
      pr.vy += pr.grav * dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.kind === 'acid' && Math.random() < 0.3) {
        this.parts.push({ x: pr.x, y: pr.y, vx: 0, vy: 30, life: 0.3, max: 0.3, size: 3, color: '#8dff9a', grav: 300, add: true, ring: false });
      }
      if (pr.y > GROUND - 4) {
        pr.life = 0;
        this.burst(pr.x, GROUND - 8, 6, pr.kind === 'acid' ? '#8dff9a' : '#8a8498', pr.kind === 'acid', 140);
        if (pr.kind === 'acid') sfx.splat();
      }
      if (!p.dead && Math.hypot(p.x - pr.x, p.y - 55 - pr.y) < pr.r + 26) {
        pr.life = 0;
        this.damagePlayer(pr.dmg, pr.x - pr.vx);
      }
    }
    this.projs = this.projs.filter((pr) => pr.life > 0 && pr.x > -60 && pr.x < ARENA_W + 60);
  }

  private updateSpikes(dt: number): void {
    const p = this.player;
    for (const s of this.spikes) {
      s.t += dt;
      if (s.phase === 0 && s.t > 0.8) {
        s.phase = 1;
        s.t = 0;
        this.ring(s.x, GROUND, '#e8dfc8', 90);
        this.burst(s.x, GROUND - 30, 14, '#cfc4a8', false, 260);
        sfx.spike();
        this.shake = Math.max(this.shake, 5);
      }
      if (s.phase === 1 && s.t < 0.4) {
        if (!p.dead && Math.abs(p.x - s.x) < 40 && p.y > GROUND - 110) this.damagePlayer(18, s.x);
      }
    }
    this.spikes = this.spikes.filter((s) => !(s.phase === 1 && s.t > 0.42));
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (const pk of this.pickups) {
      pk.t += dt;
      pk.vy += GRAV * 0.55 * dt;
      pk.y += pk.vy * dt;
      if (pk.y > GROUND - 14) { pk.y = GROUND - 14; pk.vy = -pk.vy * 0.4; if (Math.abs(pk.vy) < 40) pk.vy = 0; }
      const d = Math.hypot(p.x - pk.x, p.y - 40 - pk.y);
      if (d < 110 && !p.dead) {
        pk.x = lerp(pk.x, p.x, Math.min(1, dt * 12));
        pk.y = lerp(pk.y, p.y - 40, Math.min(1, dt * 12));
      }
      if (d < 40 && !p.dead) {
        this.applyPickup(pk);
        pk.t = 999;
      }
    }
    this.pickups = this.pickups.filter((pk) => pk.t < 20);
  }

  // ================= DRAW =================
  private draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    // background base
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0c0a12');
    g.addColorStop(1, '#16121c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (this.state === 'title') return;

    const shX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;

    this.drawBackground(ctx);

    ctx.save();
    ctx.translate(-this.camX + shX, shY);

    this.drawPlatforms(ctx);
    this.drawDecals(ctx);
    this.drawSpikes(ctx);
    this.drawPickups(ctx);
    this.drawGhosts(ctx);
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    this.drawTrail(ctx);
    this.drawPlayer(ctx);
    this.drawProjectiles(ctx);
    this.drawParticles(ctx);
    this.drawTexts(ctx);
    ctx.restore();

    this.drawHUD(ctx);
    this.drawOverlays(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const cfg = this.cfg;
    const img = this.imgs[cfg.img];
    const factor = 0.16;
    const bgW = VIEW_W + (ARENA_W - VIEW_W) * factor;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -this.camX * factor - 60, -40, bgW + 120, VIEW_H + 80);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, '#12101a');
      g.addColorStop(0.7, '#1d1622');
      g.addColorStop(1, '#0d0a10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // tint
    ctx.fillStyle = cfg.tint;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // mid parallax pillars
    const mp = 0.5;
    ctx.fillStyle = 'rgba(8,7,12,0.66)';
    for (const px of cfg.pillars) {
      const x = px - this.camX * mp;
      if (x < -90 || x > VIEW_W + 90) continue;
      ctx.fillRect(x - 26, 40, 52, GROUND - 40);
      ctx.fillRect(x - 40, 26, 80, 26);
      ctx.fillRect(x - 40, GROUND - 26, 80, 26);
    }
    // torches
    for (const tx of cfg.torches) {
      const x = tx - this.camX * mp;
      if (x < -160 || x > VIEW_W + 160) continue;
      const flick = Math.sin(this.globalT * 11 + tx) * 3 + Math.sin(this.globalT * 23 + tx * 2) * 2;
      const ty = 250 + flick * 0.4;
      ctx.fillStyle = '#241f2b';
      ctx.fillRect(x - 5, ty + 16, 10, 34);
      const glow = ctx.createRadialGradient(x, ty, 2, x, ty, 150);
      glow.addColorStop(0, 'rgba(255,154,60,0.30)');
      glow.addColorStop(1, 'rgba(255,154,60,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 150, ty - 150, 300, 300);
      ctx.fillStyle = cfg.torchColor;
      ctx.beginPath();
      ctx.ellipse(x, ty - 4, 7 + flick * 0.4, 16 + flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe2a1';
      ctx.beginPath();
      ctx.ellipse(x, ty + 4, 3.4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // drifting fog
    for (let i = 0; i < 3; i++) {
      const fx = ((this.globalT * (14 + i * 6) + i * 640) % (VIEW_W + 700)) - 350;
      const fg = ctx.createRadialGradient(fx, GROUND - 40, 10, fx, GROUND - 40, 320);
      fg.addColorStop(0, 'rgba(140,140,165,0.07)');
      fg.addColorStop(1, 'rgba(140,140,165,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx - 320, GROUND - 360, 640, 360);
    }

    // ground
    const gg = ctx.createLinearGradient(0, GROUND, 0, VIEW_H);
    gg.addColorStop(0, '#191521');
    gg.addColorStop(1, '#0a080e');
    ctx.fillStyle = gg;
    ctx.fillRect(0, GROUND, VIEW_W, VIEW_H - GROUND);
    ctx.fillStyle = cfg.groundTop;
    ctx.fillRect(0, GROUND, VIEW_W, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, GROUND + 4, VIEW_W, 2);
    // ground cracks (deterministic)
    const rnd = mulberry(this.floor * 99 + 7);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * (VIEW_W + ARENA_W * 0.2) - ((this.camX * 1) % 90);
      const cy = GROUND + 10 + rnd() * 60;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 20 + rnd() * 40, cy + rnd() * 12);
      ctx.stroke();
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D): void {
    for (const pl of this.cfg.platforms) {
      ctx.fillStyle = '#141019';
      ctx.fillRect(pl.x, pl.y, pl.w, 16);
      ctx.fillStyle = this.cfg.groundTop;
      ctx.fillRect(pl.x, pl.y, pl.w, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.moveTo(pl.x, pl.y + 16);
      ctx.lineTo(pl.x + 14, pl.y + 34);
      ctx.lineTo(pl.x + pl.w - 14, pl.y + 34);
      ctx.lineTo(pl.x + pl.w, pl.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(122,104,140,0.25)';
      ctx.strokeRect(pl.x, pl.y, pl.w, 16);
    }
  }

  private drawDecals(ctx: CanvasRenderingContext2D): void {
    for (const d of this.decals) {
      ctx.fillStyle = `rgba(94,10,24,${d.a})`;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.w, d.w * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSpikes(ctx: CanvasRenderingContext2D): void {
    for (const s of this.spikes) {
      if (s.phase === 0) {
        const blink = Math.sin(this.globalT * 16) > 0 ? 0.7 : 0.3;
        ctx.strokeStyle = `rgba(255,59,82,${blink})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.ellipse(s.x, GROUND, 40, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const h = 110 * easeOut(Math.min(1, s.t / 0.12));
        ctx.fillStyle = '#cfc4a8';
        for (let i = -1; i <= 1; i++) {
          const sx = s.x + i * 22;
          const hh = h * (1 - Math.abs(i) * 0.25);
          ctx.beginPath();
          ctx.moveTo(sx - 11, GROUND + 4);
          ctx.lineTo(sx, GROUND - hh);
          ctx.lineTo(sx + 11, GROUND + 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(s.x - 3, GROUND - h + 20);
        ctx.lineTo(s.x, GROUND - h);
        ctx.lineTo(s.x + 3, GROUND - h + 20);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D): void {
    for (const pk of this.pickups) {
      const bob = Math.sin(pk.t * 4 + pk.x) * 5;
      const y = pk.y + bob;
      const glowCol: Record<PKind, string> = {
        potion: '#7dff8a', soul: '#3fe0b0', rage: '#ff9a3c', blade: '#ffd23c', shield: '#8ab8ff',
      };
      const g = ctx.createRadialGradient(pk.x, y, 2, pk.x, y, 34);
      g.addColorStop(0, glowCol[pk.kind] + '55');
      g.addColorStop(1, glowCol[pk.kind] + '00');
      ctx.fillStyle = g;
      ctx.fillRect(pk.x - 34, y - 34, 68, 68);
      ctx.save();
      ctx.translate(pk.x, y);
      switch (pk.kind) {
        case 'potion':
          ctx.fillStyle = '#5e0a18';
          ctx.beginPath(); ctx.arc(0, 4, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#a3122a';
          ctx.beginPath(); ctx.arc(-2, 2, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#cfc4a8';
          ctx.fillRect(-3, -12, 6, 8);
          ctx.fillStyle = '#8a7a58';
          ctx.fillRect(-5, -14, 10, 4);
          break;
        case 'soul':
          ctx.fillStyle = '#3fe0b0';
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.quadraticCurveTo(10, -2, 0, 12);
          ctx.quadraticCurveTo(-10, -2, 0, -12);
          ctx.fill();
          ctx.fillStyle = '#d8fff2';
          ctx.beginPath(); ctx.arc(-2, -3, 2.4, 0, Math.PI * 2); ctx.fill();
          break;
        case 'rage':
          ctx.fillStyle = '#ff9a3c';
          ctx.beginPath();
          ctx.moveTo(0, -13);
          ctx.quadraticCurveTo(9, -4, 5, 4);
          ctx.quadraticCurveTo(8, 2, 9, 8);
          ctx.quadraticCurveTo(2, 14, -4, 9);
          ctx.quadraticCurveTo(-10, 3, -6, -5);
          ctx.quadraticCurveTo(-4, 0, -2, -2);
          ctx.quadraticCurveTo(-5, -8, 0, -13);
          ctx.fill();
          break;
        case 'blade':
          ctx.rotate(-0.6);
          ctx.fillStyle = '#8b93a5';
          ctx.fillRect(-3, -14, 6, 22);
          ctx.fillStyle = '#d8e0ee';
          ctx.fillRect(-3, -14, 2, 22);
          ctx.fillStyle = '#4b4257';
          ctx.fillRect(-7, 6, 14, 4);
          break;
        case 'shield':
          ctx.fillStyle = '#3c4a66';
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(10, -7);
          ctx.lineTo(10, 3);
          ctx.quadraticCurveTo(10, 10, 0, 14);
          ctx.quadraticCurveTo(-10, 10, -10, 3);
          ctx.lineTo(-10, -7);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#8ab8ff';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
      }
      ctx.restore();
    }
  }

  private drawGhosts(ctx: CanvasRenderingContext2D): void {
    for (const gh of this.ghosts) {
      const a = 1 - (this.globalT - gh.t) / 0.28;
      if (a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a * 0.3;
      ctx.translate(gh.x, gh.y - 50);
      ctx.scale(gh.f, 1);
      ctx.fillStyle = '#ff3b52';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;
    for (let i = 1; i < this.trail.length; i++) {
      const t0 = this.trail[i - 1];
      const t1 = this.trail[i];
      const age = (this.globalT - t1.t) / 0.22;
      const a = clamp(1 - age, 0, 1);
      if (a <= 0) continue;
      ctx.strokeStyle = t1.r ? `rgba(255,59,82,${a * 0.8})` : `rgba(232,223,200,${a * 0.55})`;
      ctx.lineWidth = 3 + a * 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.stroke();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    if (p.dead && p.deathT > 1.2) return;
    const blink = p.invuln > 0 && Math.sin(this.globalT * 34) > 0.2 && !p.dead;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.5;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(p.x, Math.min(p.y, GROUND) + 6, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // berserk aura
    if (p.berserk > 0) {
      const g = ctx.createRadialGradient(p.x, p.y - 50, 6, p.x, p.y - 50, 90);
      g.addColorStop(0, 'rgba(255,59,82,0.30)');
      g.addColorStop(1, 'rgba(255,59,82,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 90, p.y - 140, 180, 180);
    }
    if (p.bladeT > 0) {
      const g = ctx.createRadialGradient(p.x, p.y - 60, 4, p.x, p.y - 60, 60);
      g.addColorStop(0, 'rgba(255,210,60,0.16)');
      g.addColorStop(1, 'rgba(255,210,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 60, p.y - 120, 120, 120);
    }

    ctx.translate(p.x, p.y);
    if (p.dead) {
      ctx.rotate(Math.min(1, p.deathT * 2.4) * Math.PI * 0.5 * -p.facing * p.facing);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p.deathT - 0.9) * 3);
    }
    ctx.scale(p.facing, 1);
    const walk = p.state === 'run' ? Math.sin(p.animT * 11) : 0;
    const bob = p.state === 'run' ? Math.abs(Math.sin(p.animT * 11)) * -3 : Math.sin(p.animT * 2.2) * 1.2;
    if (p.state === 'dodge') ctx.rotate((p.t / p.dur) * Math.PI * 2);
    ctx.translate(0, bob);

    const armor = '#2c2836';
    const armorHi = '#453e52';
    const dark = '#1a1722';
    const eye = p.berserk > 0 ? '#ff2233' : '#ff5566';

    // cape
    const sw = Math.sin(p.animT * 7) * 4 - p.vx * 0.02 * p.facing;
    ctx.fillStyle = p.berserk > 0 ? '#2a0a12' : '#221524';
    ctx.beginPath();
    ctx.moveTo(-4, -86);
    ctx.quadraticCurveTo(-26 - sw, -56, -20 - sw * 1.4, -12);
    ctx.lineTo(-8 - sw * 0.6, -18);
    ctx.quadraticCurveTo(-10, -50, -2, -80);
    ctx.closePath();
    ctx.fill();

    // back leg
    ctx.strokeStyle = dark;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -50);
    ctx.lineTo(-9 - walk * 14, -4 + Math.max(0, walk) * -9);
    ctx.stroke();
    // back arm
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-2, -76);
    ctx.lineTo(-11 + walk * 8, -52);
    ctx.stroke();

    // torso
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.roundRect(-14, -92, 28, 44, 6);
    ctx.fill();
    ctx.fillStyle = armorHi;
    ctx.fillRect(-14, -92, 28, 5);
    ctx.fillRect(-14, -76, 28, 3);
    ctx.fillStyle = dark;
    ctx.fillRect(-14, -52, 28, 7);
    ctx.fillStyle = '#8a7a58';
    ctx.fillRect(-4, -51, 8, 5);

    // front leg
    ctx.strokeStyle = armorHi;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(4, -50);
    ctx.lineTo(10 + walk * 14, -4 + Math.max(0, -walk) * -9);
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.roundRect(4 + walk * 14 - 5, -8 + Math.max(0, -walk) * -9, 15, 7, 3);
    ctx.fill();

    // head
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.roundRect(-10, -118, 23, 27, 7);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(-10, -104, 23, 3);
    // glowing eye slit
    ctx.save();
    ctx.shadowColor = eye;
    ctx.shadowBlur = p.berserk > 0 ? 16 : 9;
    ctx.fillStyle = eye;
    ctx.fillRect(3, -110, 9, 4);
    ctx.restore();

    // brand on neck
    if (p.berserk > 0 || Math.sin(this.globalT * 3) > 0.4) {
      ctx.save();
      ctx.shadowColor = '#ff2233';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#c2172f';
      ctx.fillRect(-9, -95, 5, 5);
      ctx.restore();
    }

    // sword + front arm
    const a = this.swordAngle(p);
    const shX2 = 6, shY2 = -76;
    const hx = shX2 + Math.cos(a) * 24;
    const hy = shY2 + Math.sin(a) * 24;
    ctx.strokeStyle = armorHi;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(shX2, shY2);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a);
    const bladeCol = p.bladeT > 0 ? '#c8a54e' : '#7c8496';
    const bladeEdge = p.berserk > 0 ? '#ff3b52' : '#d8e0ee';
    if (p.berserk > 0) { ctx.shadowColor = '#ff3b52'; ctx.shadowBlur = 14; }
    ctx.fillStyle = bladeCol;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(108, -10);
    ctx.lineTo(122, -2);
    ctx.lineTo(108, 10);
    ctx.lineTo(8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = bladeEdge;
    ctx.fillRect(8, -10, 104, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(8, 2, 108, 4);
    ctx.fillStyle = '#3a3542';
    ctx.fillRect(0, -13, 9, 26);
    ctx.fillStyle = '#241f2b';
    ctx.fillRect(-14, -4, 15, 8);
    ctx.restore();

    // hit flash
    if (p.hitT > 0) {
      ctx.globalAlpha = p.hitT * 3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-16, -120, 34, 120, 8);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
    const alpha = e.dead ? clamp(1 - e.deathT / 0.55, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (e.dead) ctx.translate(0, e.deathT * 40);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(e.x, Math.min(e.y, GROUND) + 6, e.w * 0.55, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (e.kind) {
      case 'walker': this.drawWalker(ctx, e); break;
      case 'archer': this.drawArcher(ctx, e); break;
      case 'imp': this.drawImp(ctx, e); break;
      case 'morgrim': this.drawMorgrim(ctx, e); break;
      case 'ishvara': this.drawIshvara(ctx, e); break;
      case 'vodien': this.drawVodien(ctx, e); break;
    }

    if (e.hitT > 0) {
      ctx.globalAlpha = alpha * e.hitT * 5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.x - e.w / 2, e.y - e.h, e.w, e.h);
      ctx.globalAlpha = alpha;
    }
    // hp bar
    if (!e.boss && e.hp < e.maxHp && !e.dead) {
      const w = 48;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(e.x - w / 2, e.y - e.h - 14, w, 5);
      ctx.fillStyle = '#c2172f';
      ctx.fillRect(e.x - w / 2, e.y - e.h - 14, w * clamp(e.hp / e.maxHp, 0, 1), 5);
    }
    ctx.restore();
  }

  private drawWalker(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(e.facing, 1);
    const walk = Math.sin(e.animT * 9) * (e.state === 'walk' ? 1 : 0);
    const bone = '#b9ad8e';
    const cloth = '#4a3038';
    // legs
    ctx.strokeStyle = '#6e6552';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -46); ctx.lineTo(-8 - walk * 11, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -46); ctx.lineTo(8 + walk * 11, -2); ctx.stroke();
    // ragged cloth
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(-12, -78);
    ctx.lineTo(12, -78);
    ctx.lineTo(14, -34);
    ctx.lineTo(6, -40);
    ctx.lineTo(0, -30);
    ctx.lineTo(-7, -40);
    ctx.lineTo(-14, -32);
    ctx.closePath();
    ctx.fill();
    // ribs
    ctx.strokeStyle = bone;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, -68 + i * 8, 9 - i, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    // skull
    ctx.fillStyle = bone;
    ctx.beginPath(); ctx.arc(2, -88, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#17131c';
    ctx.beginPath(); ctx.arc(7, -90, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.shadowColor = '#8dff9a';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#8dff9a';
    ctx.beginPath(); ctx.arc(7, -90, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#17131c';
    ctx.fillRect(3, -83, 8, 2);
    // rusty sword arm
    let armA = 0.6 + walk * 0.15;
    if (e.state === 'windup') armA = lerp(0.6, -2.2, easeOut(e.t / 0.42));
    if (e.state === 'attack') armA = lerp(-2.2, 0.9, easeOut(e.t / 0.2));
    ctx.save();
    ctx.translate(6, -70);
    ctx.rotate(armA);
    ctx.strokeStyle = bone;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, 0); ctx.stroke();
    ctx.fillStyle = '#6b5a3a';
    ctx.fillRect(14, -3, 46, 6);
    ctx.fillStyle = '#8a7448';
    ctx.fillRect(14, -3, 46, 2);
    if (e.state === 'attack') {
      ctx.fillStyle = 'rgba(232,223,200,0.5)';
      ctx.beginPath();
      ctx.moveTo(14, -6);
      ctx.lineTo(66, -2);
      ctx.lineTo(14, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  private drawArcher(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(e.facing, 1);
    const sway = Math.sin(e.animT * 3) * 2;
    ctx.fillStyle = '#221c2e';
    ctx.beginPath();
    ctx.moveTo(0, -88);
    ctx.quadraticCurveTo(16, -60, 18, -8);
    ctx.lineTo(10, -14);
    ctx.lineTo(4, -4);
    ctx.lineTo(-4, -14);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-18, -12);
    ctx.quadraticCurveTo(-16, -60, 0, -88);
    ctx.closePath();
    ctx.fill();
    // hood
    ctx.fillStyle = '#2c2440';
    ctx.beginPath(); ctx.arc(2 + sway * 0.3, -82, 13, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
    ctx.fillStyle = '#0d0a14';
    ctx.beginPath(); ctx.arc(4 + sway * 0.3, -80, 8, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.shadowColor = '#ff9a3c';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(7 + sway * 0.3, -81, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // bow
    const draw = e.state === 'aim' ? easeOut(e.t / 0.6) : 0;
    ctx.strokeStyle = '#6b5a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(14, -56, 26, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.strokeStyle = '#cfc4a8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14 + 26 * Math.cos(-Math.PI * 0.42), -56 + 26 * Math.sin(-Math.PI * 0.42));
    ctx.lineTo(14 - draw * 16, -56);
    ctx.lineTo(14 + 26 * Math.cos(Math.PI * 0.42), -56 + 26 * Math.sin(Math.PI * 0.42));
    ctx.stroke();
    if (draw > 0.1) {
      ctx.save();
      ctx.shadowColor = '#8dff9a';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#8dff9a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(14 - draw * 16, -56);
      ctx.lineTo(14 + draw * 20, -56);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawImp(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.save();
    ctx.translate(e.x, e.y);
    const flap = Math.sin(e.animT * 16) * 0.7;
    const stretch = e.state === 'dive' ? 1.3 : 1;
    ctx.scale(e.facing, 1);
    ctx.scale(1, stretch);
    // wings
    ctx.fillStyle = 'rgba(70,50,90,0.85)';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s, 1);
      ctx.rotate(flap * 0.5 * s * s);
      ctx.beginPath();
      ctx.moveTo(6, -6);
      ctx.quadraticCurveTo(30, -26 - flap * 8, 34, -4);
      ctx.quadraticCurveTo(22, 4, 6, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // body
    ctx.fillStyle = '#40304e';
    ctx.beginPath(); ctx.ellipse(0, -8, 14, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#322440';
    ctx.beginPath(); ctx.ellipse(0, 2, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    // horns + tail
    ctx.strokeStyle = '#2a1f36';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-12, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(12, -30); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, 8);
    ctx.quadraticCurveTo(-16, 20, -10, 30);
    ctx.stroke();
    // eyes
    ctx.save();
    ctx.shadowColor = '#ffd23c';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath(); ctx.arc(5, -12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -10, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // mouth
    ctx.fillStyle = '#c2172f';
    ctx.beginPath(); ctx.arc(8, -2, 3.4, 0, Math.PI); ctx.fill();
    ctx.restore();
  }

  private drawMorgrim(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.save();
    ctx.translate(e.x, e.y);
    const enr = e.hp < e.maxHp * 0.45;
    // rage aura
    if (enr) {
      const g = ctx.createRadialGradient(0, -90, 10, 0, -90, 130);
      g.addColorStop(0, 'rgba(255,59,82,0.18)');
      g.addColorStop(1, 'rgba(255,59,82,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-130, -220, 260, 240);
    }
    const lean = e.state === 'charge' ? 0.22 : e.state === 'chargeT' ? -0.08 : 0;
    ctx.rotate(lean * e.facing);
    ctx.scale(e.facing, 1);
    const walk = Math.sin(e.animT * 7) * 0.8;
    const armor = '#3a3644';
    const armorHi = '#545064';
    const dark = '#211d2b';
    // cape
    ctx.fillStyle = '#33313c';
    ctx.beginPath();
    ctx.moveTo(-10, -150);
    ctx.quadraticCurveTo(-52 - walk * 6, -100, -40 - walk * 8, -14);
    ctx.lineTo(-14, -26);
    ctx.quadraticCurveTo(-18, -90, -4, -144);
    ctx.closePath();
    ctx.fill();
    // legs
    ctx.strokeStyle = dark;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -80); ctx.lineTo(-18 - walk * 16, -4); ctx.stroke();
    ctx.strokeStyle = armor;
    ctx.beginPath(); ctx.moveTo(10, -80); ctx.lineTo(18 + walk * 16, -4); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.roundRect(8 + walk * 16 - 8, -12, 28, 12, 4); ctx.fill();
    // torso
    ctx.fillStyle = armor;
    ctx.beginPath(); ctx.roundRect(-30, -156, 60, 82, 10); ctx.fill();
    ctx.fillStyle = armorHi;
    ctx.fillRect(-30, -156, 60, 8);
    ctx.fillRect(-30, -128, 60, 5);
    ctx.fillStyle = 'rgba(110,58,36,0.55)';
    ctx.beginPath(); ctx.arc(-12, -104, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, -136, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(-30, -84, 60, 10);
    // pauldrons
    ctx.fillStyle = armorHi;
    ctx.beginPath(); ctx.arc(-28, -148, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(28, -148, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(36, -160); ctx.lineTo(52, -172); ctx.lineTo(44, -148); ctx.closePath(); ctx.fill();
    // head + horned helm
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.roundRect(-16, -196, 34, 40, 8); ctx.fill();
    ctx.fillStyle = armor;
    ctx.beginPath(); ctx.roundRect(-16, -196, 34, 14, 6); ctx.fill();
    // horns
    ctx.fillStyle = '#2c2834';
    ctx.beginPath(); ctx.moveTo(-14, -192); ctx.quadraticCurveTo(-34, -206, -30, -232); ctx.quadraticCurveTo(-20, -212, -8, -198); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, -192); ctx.quadraticCurveTo(36, -206, 32, -232); ctx.quadraticCurveTo(22, -212, 10, -198); ctx.closePath(); ctx.fill();
    // visor
    ctx.save();
    ctx.shadowColor = '#7dff8a';
    ctx.shadowBlur = 12;
    ctx.fillStyle = enr ? '#ff3b52' : '#7dff8a';
    ctx.fillRect(0, -182, 16, 5);
    ctx.restore();
    // axe
    let axeA = 0.5 + walk * 0.05;
    if (e.state === 'chargeT') axeA = lerp(0.5, -1.9, easeOut(e.t / 0.72));
    if (e.state === 'charge') axeA = -0.5;
    if (e.state === 'slamT') axeA = -2.5;
    if (e.state === 'slam') axeA = 1.0;
    if (e.state === 'swipeT') axeA = lerp(0.5, -1.4, easeOut(e.t / 0.38));
    if (e.state === 'swipe') axeA = lerp(-1.4, 0.8, easeOut(e.t / 0.2));
    ctx.save();
    ctx.translate(20, -132);
    ctx.rotate(axeA);
    ctx.strokeStyle = '#54402e';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(96, 0); ctx.stroke();
    ctx.fillStyle = '#8b93a5';
    ctx.beginPath();
    ctx.moveTo(78, -8);
    ctx.quadraticCurveTo(116, -34, 108, -46);
    ctx.lineTo(88, -16);
    ctx.lineTo(88, 16);
    ctx.lineTo(108, 46);
    ctx.quadraticCurveTo(116, 34, 78, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8e0ee';
    ctx.fillRect(78, -8, 12, 16);
    ctx.restore();
    ctx.restore();
  }

  private drawIshvara(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.save();
    ctx.translate(e.x, e.y);
    const pulse = 1 + Math.sin(e.animT * 3.4) * 0.05;
    // tentacles
    ctx.strokeStyle = '#241230';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const idx = i % 3;
      const sway = Math.sin(e.animT * 2.2 + i * 1.7) * 30;
      ctx.lineWidth = 16 - idx * 3;
      ctx.beginPath();
      ctx.moveTo(side * (40 + idx * 22), -30);
      ctx.quadraticCurveTo(
        side * (110 + idx * 26), -20 + sway,
        side * (150 + idx * 20), 40 + sway * 0.5 + idx * 6
      );
      ctx.stroke();
    }
    // body
    const bg = ctx.createRadialGradient(0, -80, 10, 0, -70, 130);
    bg.addColorStop(0, '#3c1f46');
    bg.addColorStop(0.7, '#241230');
    bg.addColorStop(1, '#120a18');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, -72, 92 * pulse, 74 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    // warts
    ctx.fillStyle = '#4a2a56';
    const rnd = mulberry(42);
    for (let i = 0; i < 9; i++) {
      const wx = (rnd() - 0.5) * 150, wy = -40 - rnd() * 90;
      ctx.beginPath(); ctx.arc(wx, wy, 4 + rnd() * 5, 0, Math.PI * 2); ctx.fill();
    }
    // eyes
    for (let i = 0; i < 6; i++) {
      const ex = -50 + i * 18 + (i % 2) * 8;
      const ey = -120 + (i % 3) * 16;
      const blink = Math.sin(e.animT * 2 + i * 2) > -0.85 ? 1 : 0.1;
      ctx.save();
      ctx.shadowColor = '#ffd23c';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffd23c';
      ctx.beginPath(); ctx.ellipse(ex, ey, 5, 5 * blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0d0610';
      if (blink > 0.5) { ctx.beginPath(); ctx.ellipse(ex + 1, ey, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // maw
    const open = e.state === 'spitT' || e.state === 'spit' ? 1.5 : 1 + Math.sin(e.animT * 4) * 0.12;
    const mx = e.facing * 34;
    ctx.save();
    ctx.translate(mx, -62);
    ctx.scale(open, open);
    ctx.fillStyle = '#0d0610';
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6e1f38';
    ctx.beginPath(); ctx.arc(0, 4, 24, 0, Math.PI * 2); ctx.fill();
    // teeth
    ctx.fillStyle = '#d8cdb8';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + e.animT * 0.4;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(30, 0);
      ctx.beginPath();
      ctx.moveTo(-5, -6); ctx.lineTo(6, 0); ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // sweep telegraph
    if (e.state === 'sweepT' || e.state === 'sweep') {
      const a = e.state === 'sweep' ? 0.5 : 0.2 + Math.sin(this.globalT * 20) * 0.1;
      ctx.strokeStyle = `rgba(201,184,255,${a})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, -60, 250 * easeOut(e.state === 'sweep' ? e.t / 0.2 : 0.6), 90, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawVodien(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.save();
    const blinkAlpha = e.state === 'blink' && e.t < 0.28 ? 0.25 : 1;
    ctx.globalAlpha *= blinkAlpha;
    ctx.translate(e.x, e.y);
    // eclipse halo
    ctx.save();
    ctx.translate(0, -110);
    ctx.rotate(e.animT * 0.3);
    ctx.fillStyle = 'rgba(232,223,200,0.10)';
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(52, -4);
      ctx.lineTo(86, 0);
      ctx.lineTo(52, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    const halo = ctx.createRadialGradient(0, -110, 20, 0, -110, 66);
    halo.addColorStop(0, 'rgba(255,255,255,0)');
    halo.addColorStop(0.75, 'rgba(255,240,220,0.28)');
    halo.addColorStop(0.85, 'rgba(255,59,82,0.22)');
    halo.addColorStop(1, 'rgba(255,59,82,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, -110, 66, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b0910';
    ctx.beginPath(); ctx.arc(0, -110, 40, 0, Math.PI * 2); ctx.fill();

    // robe
    const hem = Math.sin(e.animT * 5) * 6;
    const rg = ctx.createLinearGradient(0, -160, 0, 0);
    rg.addColorStop(0, '#1d1730');
    rg.addColorStop(1, '#0a0710');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(0, -168);
    ctx.quadraticCurveTo(34, -140, 42, -60);
    ctx.quadraticCurveTo(50, -10, 34, 0 + hem);
    ctx.lineTo(16, -10);
    ctx.lineTo(0, 2);
    ctx.lineTo(-16, -10);
    ctx.lineTo(-34, 0 - hem);
    ctx.quadraticCurveTo(-50, -10, -42, -60);
    ctx.quadraticCurveTo(-34, -140, 0, -168);
    ctx.closePath();
    ctx.fill();
    // hood void + eyes
    ctx.fillStyle = '#050308';
    ctx.beginPath(); ctx.ellipse(0, -136, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-7, -138, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -138, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // pale hands
    ctx.fillStyle = '#cfc4b8';
    const handGlow = e.state === 'ringT' || e.state === 'beamT' ? 0.5 + Math.sin(this.globalT * 18) * 0.3 : 0;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 38, -84 + Math.sin(e.animT * 3 + s) * 5, 8, 0, Math.PI * 2);
      ctx.fill();
      if (handGlow > 0) {
        const g2 = ctx.createRadialGradient(s * 38, -84, 2, s * 38, -84, 30);
        g2.addColorStop(0, `rgba(255,59,82,${handGlow})`);
        g2.addColorStop(1, 'rgba(255,59,82,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(s * 38 - 30, -114, 60, 60);
        ctx.fillStyle = '#cfc4b8';
      }
    }
    // beam
    if (e.state === 'beamT' || e.state === 'beam') {
      const fire = e.state === 'beam';
      ctx.save();
      ctx.translate(0, -110);
      ctx.rotate(e.beamAngle);
      if (fire) {
        const bgd = ctx.createLinearGradient(0, 0, 900, 0);
        bgd.addColorStop(0, 'rgba(255,240,220,0.95)');
        bgd.addColorStop(0.4, 'rgba(255,59,82,0.75)');
        bgd.addColorStop(1, 'rgba(255,59,82,0)');
        ctx.fillStyle = bgd;
        ctx.fillRect(0, -16, 900, 32);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(0, -5, 900, 10);
      } else {
        ctx.strokeStyle = `rgba(255,59,82,${0.3 + Math.sin(this.globalT * 22) * 0.2})`;
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, 0); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const pr of this.projs) {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      if (pr.kind === 'arrow') {
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.strokeStyle = '#cfc4a8';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(10, 0); ctx.stroke();
        ctx.fillStyle = '#8dff9a';
        ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(18, 0); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a3038';
        ctx.beginPath(); ctx.moveTo(-16, -4); ctx.lineTo(-10, 0); ctx.lineTo(-16, 4); ctx.closePath(); ctx.fill();
      } else if (pr.kind === 'acid') {
        ctx.shadowColor = '#8dff9a';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#57c46a';
        ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c9ffd4';
        ctx.beginPath(); ctx.arc(-3, -3, pr.r * 0.35, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.shadowColor = '#ff3b52';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#170d14';
        ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff3b52';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#ff3b52';
        ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const pt of this.parts) {
      const a = clamp(pt.life / pt.max, 0, 1);
      if (pt.ring) {
        const r = pt.size * (1 - a) + 8;
        ctx.strokeStyle = pt.color;
        ctx.globalAlpha = a * 0.8;
        ctx.lineWidth = 3 + a * 4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = a;
      if (pt.add) {
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  private drawTexts(ctx: CanvasRenderingContext2D): void {
    for (const t of this.texts) {
      const a = clamp(1 - t.t / t.life, 0, 1);
      const rise = easeOut(t.t / t.life) * 46;
      ctx.globalAlpha = a;
      ctx.font = `700 ${t.size}px Eczar, serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0a0810';
      ctx.fillText(t.txt, t.x + 2, t.y - rise + 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y - rise);
    }
    ctx.globalAlpha = 1;
  }

  // ================= HUD =================
  private drawHUD(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    ctx.textAlign = 'left';

    // ----- left cluster -----
    const bx = 24, by = 22;
    ctx.font = '700 13px Eczar, serif';
    ctx.fillStyle = '#9a917f';
    ctx.fillText('K A E L — K Ẻ  M A N G  D Ấ U  Ấ N', bx, by + 10);

    // level badge
    ctx.font = '800 15px Eczar, serif';
    chamfer(ctx, bx, by + 20, 82, 26, 7);
    ctx.fillStyle = 'rgba(194,23,47,0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,59,82,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ff8095';
    ctx.fillText(`CẤP ${p.level}`, bx + 12, by + 38);

    // HP bar
    const hx = bx + 96, hw = 250, hh = 20;
    chamfer(ctx, hx, by + 20, hw, hh, 6);
    ctx.fillStyle = 'rgba(10,8,14,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(122,104,140,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const ghost = clamp(this.hpShow / p.maxHp, 0, 1);
    const frac = clamp(p.hp / p.maxHp, 0, 1);
    if (ghost > frac) {
      ctx.fillStyle = 'rgba(232,223,200,0.4)';
      ctx.fillRect(hx + 2, by + 22, (hw - 4) * ghost, hh - 4);
    }
    const hg = ctx.createLinearGradient(hx, 0, hx + hw, 0);
    hg.addColorStop(0, '#7a0f22');
    hg.addColorStop(1, frac < 0.3 ? '#ff3b52' : '#d92742');
    ctx.fillStyle = hg;
    ctx.fillRect(hx + 2, by + 22, (hw - 4) * frac, hh - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(hx + 2, by + 22, (hw - 4) * frac, 4);
    ctx.font = '700 13px Eczar, serif';
    ctx.fillStyle = '#ffe9e0';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, hx + hw + 12, by + 36);
    if (p.shield > 0) {
      ctx.fillStyle = '#8ab8ff';
      ctx.fillText(`GIÁP ${Math.ceil(p.shield)}`, hx + hw + 12 + 86, by + 36);
    }

    // rage bar
    const ry = by + 46;
    chamfer(ctx, hx, ry, hw, 10, 4);
    ctx.fillStyle = 'rgba(10,8,14,0.85)';
    ctx.fill();
    const rageFull = p.rage >= 100 && p.berserk <= 0;
    const rgd = ctx.createLinearGradient(hx, 0, hx + hw, 0);
    rgd.addColorStop(0, '#b3541a');
    rgd.addColorStop(1, '#ffd23c');
    ctx.fillStyle = rgd;
    const rw = (hw - 4) * clamp(p.berserk > 0 ? p.berserk / 8 : p.rage / 100, 0, 1);
    ctx.fillRect(hx + 2, ry + 2, rw, 6);
    if (rageFull && Math.sin(this.globalT * 8) > -0.3) {
      ctx.save();
      ctx.shadowColor = '#ffd23c';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffd23c';
      ctx.font = '700 12px Eczar, serif';
      ctx.fillText('Q — CUỒNG NỘ SẴN SÀNG', hx + hw + 12, ry + 9);
      ctx.restore();
    } else if (p.berserk > 0) {
      ctx.fillStyle = '#ff3b52';
      ctx.font = '700 12px Eczar, serif';
      ctx.fillText(`CUỒNG NỘ ${p.berserk.toFixed(1)}s`, hx + hw + 12, ry + 9);
    }
    // xp bar
    const xy = ry + 16;
    ctx.fillStyle = 'rgba(10,8,14,0.85)';
    ctx.fillRect(hx, xy, hw, 5);
    ctx.fillStyle = '#3fe0b0';
    ctx.fillRect(hx, xy, hw * clamp(p.xp / p.xpNext, 0, 1), 5);
    ctx.fillStyle = '#6f9c8c';
    ctx.font = '600 11px Eczar, serif';
    ctx.fillText(`KINH NGHIỆM ${p.xp}/${p.xpNext}`, hx, xy + 18);

    // buff icons
    let bix = hx;
    if (p.bladeT > 0) {
      ctx.fillStyle = 'rgba(255,210,60,0.15)';
      ctx.fillRect(bix, xy + 24, 90, 16);
      ctx.fillStyle = '#ffd23c';
      ctx.font = '700 11px Eczar, serif';
      ctx.fillText(`LƯỠI QUỶ ${Math.ceil(p.bladeT)}s`, bix + 5, xy + 36);
      bix += 100;
    }

    // ----- right cluster -----
    ctx.textAlign = 'right';
    ctx.font = '800 21px Eczar, serif';
    ctx.fillStyle = '#e8dfc8';
    ctx.fillText(`TẦNG ${this.cfg.numeral} — ${this.cfg.name}`, VIEW_W - 26, 40);
    ctx.font = '600 13px Eczar, serif';
    ctx.fillStyle = '#9a917f';
    const mm = Math.floor(this.time / 60);
    const ss = Math.floor(this.time % 60).toString().padStart(2, '0');
    ctx.fillText(`THỜI GIAN ${mm}:${ss}   •   KẾT LIỄU ${this.kills}`, VIEW_W - 26, 60);
    ctx.font = '800 17px Eczar, serif';
    ctx.fillStyle = '#ffd23c';
    ctx.fillText(`ĐIỂM ${this.score.toString().padStart(6, '0')}`, VIEW_W - 26, 82);

    // combo
    if (this.combo >= 2) {
      const pop = 1 + this.comboPop * 1.6;
      ctx.save();
      ctx.translate(VIEW_W - 120, 200);
      ctx.rotate(-0.06);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.font = '800 52px Eczar, serif';
      ctx.fillStyle = '#0a0810';
      ctx.fillText(`×${this.combo}`, 3, 3);
      ctx.fillStyle = this.combo >= 15 ? '#ff3b52' : this.combo >= 8 ? '#ff9a3c' : '#e8dfc8';
      ctx.fillText(`×${this.combo}`, 0, 0);
      ctx.font = '700 13px Eczar, serif';
      ctx.fillStyle = '#9a917f';
      ctx.fillText('L I Ê N  K Í C H', 0, 22);
      ctx.restore();
    }

    // boss bar
    const boss = this.enemies.find((e) => e.boss && !e.dead);
    if (boss || this.bossWarn > 0) {
      const bw = 620, bh = 14;
      const bx2 = (VIEW_W - bw) / 2, by2 = 30;
      ctx.textAlign = 'center';
      ctx.font = '700 15px Eczar, serif';
      ctx.fillStyle = this.bossWarn > 0 && Math.sin(this.globalT * 10) > 0 ? '#ff3b52' : '#e8dfc8';
      ctx.fillText(this.cfg.bossName, VIEW_W / 2, by2 - 6);
      chamfer(ctx, bx2, by2, bw, bh, 5);
      ctx.fillStyle = 'rgba(10,8,14,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,59,82,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (boss) {
        const f = clamp(boss.hp / boss.maxHp, 0, 1);
        const bgd = ctx.createLinearGradient(bx2, 0, bx2 + bw, 0);
        bgd.addColorStop(0, '#5e0a18');
        bgd.addColorStop(1, '#ff3b52');
        ctx.fillStyle = bgd;
        ctx.fillRect(bx2 + 2, by2 + 2, (bw - 4) * f, bh - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(bx2 + 2, by2 + 2, (bw - 4) * f, 3);
      }
      ctx.fillStyle = 'rgba(255,59,82,0.55)';
      ctx.fillRect(bx2 + bw / 2 - 1, by2, 2, bh);
    }

    // hints
    if (this.hintsT > 0) {
      const a = clamp(this.hintsT / 2, 0, 1);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '600 13px Eczar, serif';
      ctx.fillStyle = '#c9c0ac';
      ctx.fillText('A/D di chuyển  •  SPACE nhảy  •  J chém  •  K trọng kích  •  SHIFT né  •  Q cuồng nộ', VIEW_W / 2, VIEW_H - 26);
      ctx.globalAlpha = 1;
    }

    // toasts
    ctx.textAlign = 'left';
    ctx.font = '700 13px Eczar, serif';
    this.toasts.forEach((t, i) => {
      const a = clamp(Math.min(t.t * 4, (3.2 - t.t) * 2), 0, 1);
      ctx.globalAlpha = a;
      const ty = VIEW_H - 60 - i * 24;
      ctx.fillStyle = 'rgba(10,8,14,0.75)';
      ctx.fillRect(24, ty - 15, ctx.measureText(t.txt).width + 20, 21);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, 34, ty);
    });
    ctx.globalAlpha = 1;
  }

  private drawOverlays(ctx: CanvasRenderingContext2D): void {
    // banner
    if (this.banner) {
      const b = this.banner;
      const inA = easeOut(Math.min(1, b.t / 0.3));
      const outA = clamp((b.life - b.t) / 0.4, 0, 1);
      const a = Math.min(inA, outA);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.translate(VIEW_W / 2, 250);
      const sc = 0.8 + inA * 0.2;
      ctx.scale(sc, sc);
      ctx.font = '800 52px Eczar, serif';
      ctx.fillStyle = '#0a0810';
      ctx.fillText(b.main, 3, 3);
      ctx.fillStyle = b.color;
      ctx.fillText(b.main, 0, 0);
      if (b.sub) {
        ctx.font = '600 17px Spectral, serif';
        ctx.fillStyle = '#c9c0ac';
        ctx.fillText(b.sub, 0, 34);
      }
      ctx.restore();
    }

    // boss warn red edge
    if (this.bossWarn > 0) {
      const a = 0.2 + Math.sin(this.globalT * 12) * 0.12;
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, `rgba(163,18,42,${a})`);
      g.addColorStop(0.25, 'rgba(163,18,42,0)');
      g.addColorStop(0.75, 'rgba(163,18,42,0)');
      g.addColorStop(1, `rgba(163,18,42,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // berserk vignette
    const p = this.player;
    if (p.berserk > 0) {
      const beat = 0.14 + Math.sin(this.globalT * 9) * 0.06;
      const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.32, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.72);
      g.addColorStop(0, 'rgba(163,18,42,0)');
      g.addColorStop(1, `rgba(163,18,42,${beat})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // low hp vignette
    if (!p.dead && p.hp < p.maxHp * 0.3) {
      const beat = 0.16 + Math.sin(this.globalT * 6) * 0.1;
      const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
      g.addColorStop(0, 'rgba(94,10,24,0)');
      g.addColorStop(1, `rgba(94,10,24,${beat})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // death fade
    if (p.dead) {
      ctx.fillStyle = `rgba(10,4,8,${clamp(p.deathT / 1.5, 0, 1) * 0.8})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // flash
    if (this.flash > 0) {
      ctx.globalAlpha = clamp(this.flash, 0, 0.85);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }

    // cinematic bars
    if (this.cinema > 0) {
      const t = clamp(Math.min(this.cinema, 2.2 - this.cinema) * 3, 0, 1);
      const h = 56 * easeOut(t);
      ctx.fillStyle = '#050408';
      ctx.fillRect(0, 0, VIEW_W, h);
      ctx.fillRect(0, VIEW_H - h, VIEW_W, h);
    }

    // vignette
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // pause dim
    if (this.paused) {
      ctx.fillStyle = 'rgba(5,4,8,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
