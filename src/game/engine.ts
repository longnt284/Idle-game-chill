import { sfx, initAudio, setMuted as setAudioMuted, getMuted } from './audio';
import { IMG } from '../story';

/* ============================================================
   HUYẾT KIẾM CA — IDLE ENGINE (anime auto-battle)
   ============================================================ */

const W = 1320;
const H = 640;
const GROUND = 540;
const TAU = Math.PI * 2;
const SAVE_KEY = 'huyet-kiem-idle-v1';
const WAVES_PER_FLOOR = 9; // wave 9 = boss
const TOTAL_FLOORS = 3;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const irand = (a: number, b: number) => Math.floor(rand(a, b + 1));

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Thường', rare: 'Hiếm', epic: 'Cực Hiếm', legendary: 'Huyền Thoại',
};
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa3b2', rare: '#3fa9ff', epic: '#c05cff', legendary: '#ffb020',
};

/* ---------------- hero visual config ---------------- */
export interface HeroCfg {
  hair: string; outfit: string; outfitDark: string; accent: string;
  skinTone: string; eye: string;
  hairStyle: 'spiky' | 'long' | 'bun' | 'short' | 'wild' | 'angel';
  weapon: 'great' | 'sword' | 'bow' | 'staff' | 'dagger' | 'spear';
  cape?: string; aura?: string; scale: number;
}

/* ---------------- definitions ---------------- */
export interface CompanionDef {
  id: string; name: string; cls: string; role: 'melee' | 'ranged' | 'healer' | 'tank';
  rarity: Rarity; desc: string; hp: number; atk: number; spd: number; cfg: HeroCfg;
}
export interface SkinDef { id: string; name: string; rarity: Rarity; desc: string; cfg: HeroCfg; }
export interface ItemDef {
  id: string; name: string; slot: 'weapon' | 'armor' | 'charm'; rarity: Rarity;
  desc: string; atk: number; hp: number; crit: number; goldBonus: number;
}

export const KAEL_BASE: HeroCfg = {
  hair: '#1d1a24', outfit: '#2c2733', outfitDark: '#1a1622', accent: '#c2172f',
  skinTone: '#f2d5b8', eye: '#e11d2e', hairStyle: 'spiky', weapon: 'great',
  cape: '#3d1220', scale: 1.06,
};

export const SKINS: SkinDef[] = [
  { id: 'default', name: 'Hắc Kiếm Sĩ', rarity: 'common', desc: 'Bộ giáp đen ám khói của Đoàn Kiếm Ưng.', cfg: KAEL_BASE },
  {
    id: 'silver', name: 'Bạch Ngân Hiệp', rarity: 'rare', desc: 'Giáp bạc trăng non, nhẹ như lời hứa.',
    cfg: { ...KAEL_BASE, hair: '#e9e6f2', outfit: '#c9d2e4', outfitDark: '#8b96b0', accent: '#5f8fd9', eye: '#3f6fd1', cape: '#aab8d6' },
  },
  {
    id: 'crimson', name: 'Huyết Nguyệt', rarity: 'epic', desc: 'Giáp nhuộm máu nguyệt thực, sát khí ngút trời.',
    cfg: { ...KAEL_BASE, hair: '#4a0d18', outfit: '#7a1225', outfitDark: '#43091a', accent: '#ff3b52', eye: '#ff2233', cape: '#5c0e1e', aura: 'rgba(255,59,82,0.5)' },
  },
  {
    id: 'dragon', name: 'Hắc Long Vương', rarity: 'legendary', desc: 'Vảy hắc long dát vàng — vương giả của vực sâu.',
    cfg: { ...KAEL_BASE, hair: '#101018', outfit: '#191521', outfitDark: '#0c0a12', accent: '#ffb020', eye: '#ffcf4d', cape: '#241a33', aura: 'rgba(255,176,32,0.55)' },
  },
];

export const COMPANIONS: CompanionDef[] = [
  {
    id: 'lyra', name: 'Lyra', cls: 'Cung Thủ', role: 'ranged', rarity: 'common',
    desc: 'Thợ săn làng cháy, bắn trăm phát trăm trúng.',
    hp: 85, atk: 10, spd: 1.0,
    cfg: { hair: '#e8c66a', outfit: '#3f7d4e', outfitDark: '#2a5636', accent: '#a8e06a', skinTone: '#f6dcc0', eye: '#2f9e5f', hairStyle: 'long', weapon: 'bow', scale: 0.96 },
  },
  {
    id: 'bram', name: 'Bram', cls: 'Kiếm Sĩ', role: 'tank', rarity: 'rare',
    desc: 'Lính đánh thuê khổng lồ, lấy thân mình che đồng đội.',
    hp: 230, atk: 9, spd: 0.8,
    cfg: { hair: '#8a4a2a', outfit: '#7a5230', outfitDark: '#4e341d', accent: '#d9a03f', skinTone: '#e8bf9a', eye: '#a05a20', hairStyle: 'wild', weapon: 'sword', scale: 1.14 },
  },
  {
    id: 'yuki', name: 'Yuki', cls: 'Hỗ Trợ', role: 'healer', rarity: 'rare',
    desc: 'Vu nữ cuối cùng của đền trăng, chữa lành mọi vết thương.',
    hp: 95, atk: 10, spd: 0.7,
    cfg: { hair: '#f4f2fa', outfit: '#e8ecf6', outfitDark: '#b9c2da', accent: '#7fd4ff', skinTone: '#fbe8d8', eye: '#4aa8e0', hairStyle: 'bun', weapon: 'staff', scale: 0.92 },
  },
  {
    id: 'mira', name: 'Mira', cls: 'Pháp Sư', role: 'ranged', rarity: 'epic',
    desc: 'Phù thủy lưu vong, niệm chú bằng ngọn lửa tím.',
    hp: 105, atk: 21, spd: 0.9,
    cfg: { hair: '#9a4ae0', outfit: '#4a2a7a', outfitDark: '#2f1a52', accent: '#d05cff', skinTone: '#f2d8c4', eye: '#b44ae0', hairStyle: 'long', weapon: 'staff', aura: 'rgba(192,92,255,0.4)', scale: 0.98 },
  },
  {
    id: 'kuro', name: 'Kuro', cls: 'Sát Thủ', role: 'melee', rarity: 'epic',
    desc: 'Bóng đen không tên, ra đòn nhanh hơn cả ánh trăng.',
    hp: 115, atk: 25, spd: 1.6,
    cfg: { hair: '#2a2438', outfit: '#232030', outfitDark: '#141220', accent: '#c05cff', skinTone: '#ead2bc', eye: '#c05cff', hairStyle: 'spiky', weapon: 'dagger', cape: '#1a1526', aura: 'rgba(192,92,255,0.35)', scale: 0.98 },
  },
  {
    id: 'seraph', name: 'Seraphina', cls: 'Thiên Sứ', role: 'ranged', rarity: 'legendary',
    desc: 'Thiên sứ sa ngã, ánh sáng của nàng thiêu rụi bóng tối.',
    hp: 160, atk: 32, spd: 1.1,
    cfg: { hair: '#ffe9a8', outfit: '#f6f0dc', outfitDark: '#d4c8a4', accent: '#ffb020', skinTone: '#fbe9d2', eye: '#e8a020', hairStyle: 'angel', weapon: 'spear', aura: 'rgba(255,210,90,0.5)', scale: 1.02 },
  },
];

export const ITEMS: ItemDef[] = [
  { id: 'w1', name: 'Kiếm Sắt Gai', slot: 'weapon', rarity: 'rare', desc: '+9 Công kích', atk: 9, hp: 0, crit: 0, goldBonus: 0 },
  { id: 'w2', name: 'Lưỡi Quỷ Huyết', slot: 'weapon', rarity: 'epic', desc: '+19 Công kích', atk: 19, hp: 0, crit: 0, goldBonus: 0 },
  { id: 'w3', name: 'Trảm Long Chân Giải', slot: 'weapon', rarity: 'legendary', desc: '+36 Công, +10% Chí mạng', atk: 36, hp: 0, crit: 10, goldBonus: 0 },
  { id: 'a1', name: 'Giáp Da Sói', slot: 'armor', rarity: 'rare', desc: '+90 Máu', atk: 0, hp: 90, crit: 0, goldBonus: 0 },
  { id: 'a2', name: 'Giáp Xương Rồng', slot: 'armor', rarity: 'epic', desc: '+190 Máu', atk: 0, hp: 190, crit: 0, goldBonus: 0 },
  { id: 'a3', name: 'Vảy Hắc Long', slot: 'armor', rarity: 'legendary', desc: '+360 Máu', atk: 0, hp: 360, crit: 0, goldBonus: 0 },
  { id: 'c1', name: 'Bùa Máu', slot: 'charm', rarity: 'rare', desc: '+8% Chí mạng', atk: 0, hp: 0, crit: 8, goldBonus: 0 },
  { id: 'c2', name: 'Nhẫn Hút Hồn', slot: 'charm', rarity: 'epic', desc: '+25% Vàng nhận được', atk: 0, hp: 0, crit: 0, goldBonus: 25 },
  { id: 'c3', name: 'Mắt Quỷ', slot: 'charm', rarity: 'legendary', desc: '+12 Công, +15% Chí mạng', atk: 12, hp: 0, crit: 15, goldBonus: 0 },
];

interface PoolEntry { kind: 'companion' | 'skin' | 'item'; id: string; rarity: Rarity; weight: number; }
const POOL: PoolEntry[] = [
  { kind: 'companion', id: 'lyra', rarity: 'common', weight: 17 },
  { kind: 'companion', id: 'bram', rarity: 'rare', weight: 12 },
  { kind: 'companion', id: 'yuki', rarity: 'rare', weight: 10 },
  { kind: 'companion', id: 'mira', rarity: 'epic', weight: 8 },
  { kind: 'companion', id: 'kuro', rarity: 'epic', weight: 7 },
  { kind: 'companion', id: 'seraph', rarity: 'legendary', weight: 3 },
  { kind: 'skin', id: 'silver', rarity: 'rare', weight: 8 },
  { kind: 'skin', id: 'crimson', rarity: 'epic', weight: 6 },
  { kind: 'skin', id: 'dragon', rarity: 'legendary', weight: 2.5 },
  { kind: 'item', id: 'w1', rarity: 'rare', weight: 6 },
  { kind: 'item', id: 'a1', rarity: 'rare', weight: 6 },
  { kind: 'item', id: 'c1', rarity: 'rare', weight: 6 },
  { kind: 'item', id: 'w2', rarity: 'epic', weight: 4.5 },
  { kind: 'item', id: 'a2', rarity: 'epic', weight: 4.5 },
  { kind: 'item', id: 'c2', rarity: 'epic', weight: 4.5 },
  { kind: 'item', id: 'w3', rarity: 'legendary', weight: 1.6 },
  { kind: 'item', id: 'a3', rarity: 'legendary', weight: 1.6 },
  { kind: 'item', id: 'c3', rarity: 'legendary', weight: 1.6 },
];
export const GACHA_COST = 100;
export const GACHA_COST_10 = 900;
export const GACHA_ODDS: { rarity: Rarity; pct: string }[] = (() => {
  const total = POOL.reduce((s, p) => s + p.weight, 0);
  const by: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
  POOL.forEach((p) => { by[p.rarity] += p.weight; });
  return (['common', 'rare', 'epic', 'legendary'] as Rarity[]).map((r) => ({
    rarity: r, pct: ((by[r] / total) * 100).toFixed(1) + '%',
  }));
})();

/* ---------------- enemies ---------------- */
type FoeType = 'slime' | 'bat' | 'skeleton' | 'imp' | 'wisp' | 'brute';
const FOE_STATS: Record<FoeType, { hp: number; atk: number; spd: number; speed: number; gold: number; name: string }> = {
  slime: { hp: 1, atk: 0.8, spd: 0.8, speed: 95, gold: 1, name: 'Slime' },
  bat: { hp: 0.7, atk: 0.7, spd: 1.2, speed: 165, gold: 0.9, name: 'Dơi Máu' },
  skeleton: { hp: 1.4, atk: 1.1, spd: 0.9, speed: 72, gold: 1.3, name: 'Cốt Binh' },
  imp: { hp: 1.1, atk: 1.3, spd: 1.05, speed: 112, gold: 1.4, name: 'Tiểu Quỷ' },
  wisp: { hp: 0.8, atk: 1.2, spd: 1.3, speed: 135, gold: 1.2, name: 'Ma Trơi' },
  brute: { hp: 2.6, atk: 1.6, spd: 0.6, speed: 56, gold: 2.2, name: 'Quỷ Khổng Lồ' },
};
const FLOOR_FOES: FoeType[][] = [
  ['slime', 'bat', 'skeleton'],
  ['skeleton', 'imp', 'slime', 'bat'],
  ['imp', 'wisp', 'brute'],
];
export const FLOOR_META = [
  { name: 'Cổng Xương', img: IMG.floor1, boss: 'morgrim', bossName: 'MORGRIM — Kị Sĩ Phản Thệ' },
  { name: 'Hầm Máu', img: IMG.floor2, boss: 'ishvara', bossName: 'ISHVARA — Sứ Đồ Đói Khát' },
  { name: 'Điện Thực Nhật', img: IMG.floor3, boss: 'vodien', bossName: 'VÔ DIỆN THẦN — Bàn Tay Trái' },
];
const BOSS_STATS = {
  morgrim: { hpMul: 14, atkMul: 2.0, spd: 0.6, scale: 2.1 },
  ishvara: { hpMul: 16, atkMul: 2.3, spd: 0.55, scale: 2.3 },
  vodien: { hpMul: 18, atkMul: 2.6, spd: 0.6, scale: 2.2 },
};

/* ---------------- runtime types ---------------- */
interface Fighter {
  uid: string; defId: string; name: string; cls: string; role: string;
  rarity: Rarity; level: number; isKael: boolean; cfg: HeroCfg;
  maxHp: number; hp: number; atk: number; spd: number; crit: number;
  x: number; homeX: number; state: 'idle' | 'dash' | 'strike' | 'return' | 'cast' | 'dead';
  stateT: number; cd: number; target: number; reviveT: number; flashT: number;
  attackAnim: number; animT: number;
}
interface Foe {
  uid: number; type: FoeType | 'boss'; bossKind?: 'morgrim' | 'ishvara' | 'vodien';
  name: string; hp: number; maxHp: number; atk: number; spd: number; speed: number;
  gold: number; x: number; scale: number; state: 'walk' | 'fight' | 'tele' | 'die';
  t: number; cd: number; flashT: number; animT: number;
  specialT: number; specialPhase: number; returnX: number;
}
interface Proj { x: number; y: number; target: number | string; speed: number; dmg: number; kind: 'arrow' | 'magic' | 'light' | 'acid' | 'bolt'; t: number; splash: number; crit: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; grav: number; kind: 'spark' | 'blood' | 'soul' | 'coin' | 'star' | 'poof' | 'ring'; }
interface FloatText { x: number; y: number; text: string; color: string; life: number; maxLife: number; size: number; vy: number; }

export interface PartyView {
  id: string; name: string; cls: string; role: string; rarity: Rarity; level: number;
  hpPct: number; atk: number; maxHp: number; active: boolean; isKael: boolean;
  upgradeCost: number; skinId?: string;
}
export interface HudSnapshot {
  gold: number; gems: number; floor: number; floorName: string; wave: number;
  wavesPerFloor: number; inBoss: boolean; bossName: string; bossHpPct: number;
  kills: number; speed: number; muted: boolean; party: PartyView[]; pity: number;
  totalDmg: number;
}
export interface GachaResult { kind: 'companion' | 'skin' | 'item'; id: string; name: string; rarity: Rarity; isNew: boolean; note: string; }
export interface EndStats { time: number; kills: number; totalDmg: number; floor: number; }

export type GameEvent =
  | { type: 'story'; chapter: number }
  | { type: 'victory'; stats: EndStats }
  | { type: 'toast'; text: string; rarity: Rarity }
  | { type: 'wipe' };

export interface EngineCallbacks {
  onHud: (s: HudSnapshot) => void;
  onEvent: (e: GameEvent) => void;
}

/* ============================================================
   ENGINE
   ============================================================ */
export class IdleEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private raf = 0;
  private last = 0;
  private destroyed = false;

  state: 'idle' | 'playing' | 'story' | 'victory' = 'idle';
  paused = false;

  private gold = 120;
  private gems = 220;
  private floor = 0;
  private wave = 0;
  private kills = 0;
  private totalDmg = 0;
  private playTime = 0;
  private speed = 1;

  private ownedCompanions: Record<string, number> = {}; // defId -> level
  private ownedSkins: string[] = ['default'];
  private equippedSkin = 'default';
  private ownedItems: string[] = [];
  private equippedItems: Record<'weapon' | 'armor' | 'charm', string | null> = { weapon: null, armor: null, charm: null };
  private pity = 0;

  private fighters: Fighter[] = [];
  private foes: Foe[] = [];
  private projs: Proj[] = [];
  private parts: Particle[] = [];
  private texts: FloatText[] = [];
  private pending: { t: number; type: FoeType }[] = [];

  private globalT = 0;
  private waveDelay = 1.2;
  private waveActive = false;
  private bossActive = false;
  private banner: { main: string; sub: string; t: number; life: number; color: string } | null = null;
  private shake = 0;
  private flash = 0;
  private flashColor = '#ffffff';
  private slowmo = 0;
  private hudT = 0;
  private saveT = 0;
  private uidSeq = 1;

  private bgImgs: (HTMLImageElement | null)[] = [null, null, null, null];
  private bgLoaded: boolean[] = [false, false, false, false];

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.cv = canvas;
    this.cb = cb;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('no 2d context');
    this.ctx = c;
    this.fit();
    this.loadBg();
    this.load();
    this.rebuildParty();
    this.last = performance.now();
    const loop = (t: number) => {
      if (this.destroyed) return;
      const dt = clamp((t - this.last) / 1000, 0, 0.05);
      this.last = t;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this.fit);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.fit);
    this.save();
  }

  private fit = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = W * dpr;
    this.cv.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private loadBg(): void {
    const urls = [IMG.title, IMG.floor1, IMG.floor2, IMG.floor3];
    urls.forEach((u, i) => {
      const im = new Image();
      im.onload = () => { this.bgLoaded[i] = true; };
      im.src = u;
      this.bgImgs[i] = im;
    });
  }

  /* ---------------- persistence ---------------- */
  private save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, gold: this.gold, gems: this.gems, floor: this.floor, wave: this.wave,
        kills: this.kills, totalDmg: this.totalDmg, playTime: this.playTime, kaelLevel: this.kaelLevel,
        ownedCompanions: this.ownedCompanions, ownedSkins: this.ownedSkins,
        equippedSkin: this.equippedSkin, ownedItems: this.ownedItems,
        equippedItems: this.equippedItems, pity: this.pity,
      }));
    } catch { /* ignore */ }
  }
  private load(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.gold === 'number') this.gold = d.gold;
      if (typeof d.gems === 'number') this.gems = d.gems;
      if (typeof d.floor === 'number') this.floor = clamp(d.floor as number, 0, TOTAL_FLOORS - 1);
      if (typeof d.wave === 'number') this.wave = clamp(d.wave as number, 0, WAVES_PER_FLOOR - 1);
      if (typeof d.kills === 'number') this.kills = d.kills;
      if (typeof d.totalDmg === 'number') this.totalDmg = d.totalDmg;
      if (typeof d.playTime === 'number') this.playTime = d.playTime;
      if (typeof d.kaelLevel === 'number') this.kaelLevel = Math.max(1, d.kaelLevel);
      if (d.ownedCompanions && typeof d.ownedCompanions === 'object') this.ownedCompanions = d.ownedCompanions as Record<string, number>;
      if (Array.isArray(d.ownedSkins)) this.ownedSkins = d.ownedSkins as string[];
      if (typeof d.equippedSkin === 'string' && this.ownedSkins.includes(d.equippedSkin)) this.equippedSkin = d.equippedSkin;
      if (Array.isArray(d.ownedItems)) this.ownedItems = d.ownedItems as string[];
      if (d.equippedItems && typeof d.equippedItems === 'object') {
        const e = d.equippedItems as Record<string, string | null>;
        this.equippedItems = { weapon: e.weapon ?? null, armor: e.armor ?? null, charm: e.charm ?? null };
      }
      if (typeof d.pity === 'number') this.pity = d.pity;
    } catch { /* ignore */ }
  }
  hardReset(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    location.reload();
  }

  /* ---------------- party / stats ---------------- */
  private kaelSkinCfg(): HeroCfg {
    const s = SKINS.find((k) => k.id === this.equippedSkin);
    return s ? s.cfg : KAEL_BASE;
  }
  private itemBonus(): { atk: number; hp: number; crit: number; goldBonus: number } {
    const b = { atk: 0, hp: 0, crit: 0, goldBonus: 0 };
    (['weapon', 'armor', 'charm'] as const).forEach((slot) => {
      const id = this.equippedItems[slot];
      if (!id) return;
      const def = ITEMS.find((i) => i.id === id);
      if (def) { b.atk += def.atk; b.hp += def.hp; b.crit += def.crit; b.goldBonus += def.goldBonus; }
    });
    return b;
  }
  private growth(level: number): number { return 1 + 0.13 * (level - 1); }
  upgradeCost(level: number): number { return Math.round(20 * Math.pow(level, 1.55)); }

  private activePartyDefs(): { defId: string; isKael: boolean; level: number }[] {
    const list: { defId: string; isKael: boolean; level: number; rarity: Rarity }[] = [];
    Object.keys(this.ownedCompanions).forEach((id) => {
      const def = COMPANIONS.find((c) => c.id === id);
      if (def) list.push({ defId: id, isKael: false, level: this.ownedCompanions[id], rarity: def.rarity });
    });
    const order: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
    list.sort((a, b) => (b.level - a.level) || (order[a.rarity] - order[b.rarity]));
    const picked = list.slice(0, 3).map((p) => ({ defId: p.defId, isKael: false, level: p.level }));
    // tank first, then kael, then rest
    const tanks = picked.filter((p) => COMPANIONS.find((c) => c.id === p.defId)?.role === 'tank');
    const rest = picked.filter((p) => COMPANIONS.find((c) => c.id === p.defId)?.role !== 'tank');
    return [...tanks, { defId: 'kael', isKael: true, level: this.kaelLevel }, ...rest];
  }

  private kaelLevel = 1;
  getKaelLevel(): number { return this.kaelLevel; }
  getMeta(): { ownedSkins: string[]; equippedSkin: string; ownedItems: string[]; equipped: Record<'weapon' | 'armor' | 'charm', string | null> } {
    return {
      ownedSkins: [...this.ownedSkins], equippedSkin: this.equippedSkin,
      ownedItems: [...this.ownedItems], equipped: { ...this.equippedItems },
    };
  }
  upgradeKael(): boolean {
    const cost = this.upgradeCost(this.kaelLevel);
    if (this.gold < cost) return false;
    this.gold -= cost; this.kaelLevel += 1;
    this.rebuildParty(); this.burstAt(470, GROUND - 70, '#ffd23c', 18, 'star');
    sfx.levelup(); this.pushHud(); this.save();
    return true;
  }

  private rebuildParty(): void {
    const homes = [470, 385, 300, 220];
    const defs = this.activePartyDefs();
    const bonus = this.itemBonus();
    const oldHp: Record<string, number> = {};
    this.fighters.forEach((f) => { oldHp[f.uid] = f.hp / f.maxHp; });
    this.fighters = defs.map((d, i) => {
      const isKael = d.isKael;
      const def = isKael ? null : COMPANIONS.find((c) => c.id === d.defId);
      const level = isKael ? this.kaelLevel : d.level;
      const g = this.growth(level);
      let maxHp: number, atk: number, spd: number, crit = 8;
      let cfg: HeroCfg; let name: string; let cls: string; let role: string; let rarity: Rarity;
      if (isKael) {
        maxHp = 150 * g + bonus.hp; atk = 15 * g + bonus.atk; spd = Math.min(1.7, 1.1 + level * 0.01);
        crit += bonus.crit; cfg = this.kaelSkinCfg(); name = 'Kael'; cls = 'Hắc Kiếm Sĩ'; role = 'melee'; rarity = 'legendary';
      } else if (def) {
        maxHp = def.hp * g; atk = def.atk * g; spd = Math.min(2.2, def.spd + level * 0.01);
        cfg = def.cfg; name = def.name; cls = def.cls; role = def.role; rarity = def.rarity;
      } else { maxHp = 10; atk = 1; spd = 1; cfg = KAEL_BASE; name = '?'; cls = '?'; role = 'melee'; rarity = 'common'; }
      const uid = isKael ? 'kael' : (d.defId as string);
      const prev = oldHp[uid];
      return {
        uid, defId: d.defId, name, cls, role, rarity, level, isKael, cfg,
        maxHp: Math.round(maxHp), hp: Math.round(maxHp * (prev ?? 1)), atk, spd, crit,
        x: homes[i], homeX: homes[i], state: 'idle' as const, stateT: 0, cd: rand(0.1, 0.5),
        target: -1, reviveT: 0, flashT: 0, attackAnim: -1, animT: rand(0, 10),
      };
    });
  }

  /* ---------------- public API ---------------- */
  startGame(): void {
    initAudio();
    // battle begins only after the intro story closes (see continueFromStory)
    this.pushHud();
  }
  continueFromStory(): void {
    initAudio();
    this.state = 'playing';
    this.startFloor(this.floor);
    this.pushHud();
  }
  setSpeed(s: number): void { this.speed = s; this.pushHud(); }
  togglePause(): void { this.paused = !this.paused; this.pushHud(); }
  toggleMute(): void { setAudioMuted(!getMuted()); this.pushHud(); }

  startFloor(idx: number, first = false): void {
    this.floor = idx;
    this.wave = 0;
    this.foes = []; this.projs = []; this.pending = [];
    this.bossActive = false; this.waveActive = false;
    this.waveDelay = first ? 1.0 : 1.6;
    this.fighters.forEach((f) => { f.hp = f.maxHp; f.state = 'idle'; f.x = f.homeX; });
    const meta = FLOOR_META[idx];
    this.banner = { main: `TẦNG ${['I', 'II', 'III'][idx]} — ${meta.name.toUpperCase()}`, sub: 'Đợt 1 đang tiến vào...', t: 0, life: 2.4, color: '#ff9a3c' };
    sfx.roar();
  }

  /* ---------------- gacha ---------------- */
  canPull(n: number): boolean { return this.gems >= (n === 10 ? GACHA_COST_10 : GACHA_COST); }
  pullGacha(n: number): GachaResult[] {
    const cost = n === 10 ? GACHA_COST_10 : GACHA_COST;
    if (this.gems < cost) return [];
    this.gems -= cost;
    const results: GachaResult[] = [];
    for (let i = 0; i < n; i++) results.push(this.rollOne());
    sfx.levelup();
    this.pushHud(); this.save();
    return results;
  }
  private rollOne(): GachaResult {
    this.pity += 1;
    let pool = POOL;
    if (this.pity >= 10) {
      pool = POOL.filter((p) => p.rarity === 'epic' || p.rarity === 'legendary');
      this.pity = 0;
    }
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    let entry = pool[0];
    for (const p of pool) { r -= p.weight; if (r <= 0) { entry = p; break; } }
    if (entry.rarity === 'epic' || entry.rarity === 'legendary') this.pity = 0;
    return this.grant(entry);
  }
  private grant(e: PoolEntry): GachaResult {
    if (e.kind === 'companion') {
      if (this.ownedCompanions[e.id] === undefined) {
        this.ownedCompanions[e.id] = 1;
        this.rebuildParty();
        const def = COMPANIONS.find((c) => c.id === e.id);
        return { kind: 'companion', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: true, note: 'Đồng hành mới gia nhập!' };
      }
      this.ownedCompanions[e.id] += 2;
      this.rebuildParty();
      const def = COMPANIONS.find((c) => c.id === e.id);
      return { kind: 'companion', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: false, note: 'Trùng lặp → +2 cấp' };
    }
    if (e.kind === 'skin') {
      if (!this.ownedSkins.includes(e.id)) {
        this.ownedSkins.push(e.id);
        const def = SKINS.find((s) => s.id === e.id);
        return { kind: 'skin', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: true, note: 'Skin mới cho Kael!' };
      }
      this.gems += 120;
      return { kind: 'skin', id: e.id, name: SKINS.find((s) => s.id === e.id)?.name ?? e.id, rarity: e.rarity, isNew: false, note: 'Trùng lặp → +120 Ngọc' };
    }
    if (!this.ownedItems.includes(e.id)) {
      this.ownedItems.push(e.id);
      const def = ITEMS.find((i) => i.id === e.id);
      if (def && !this.equippedItems[def.slot]) this.equippedItems[def.slot] = e.id;
      return { kind: 'item', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: true, note: this.equippedItems[ITEMS.find((i) => i.id === e.id)?.slot ?? 'charm'] === e.id ? 'Đã tự trang bị' : 'Vật phẩm mới!' };
    }
    this.gems += 100;
    return { kind: 'item', id: e.id, name: ITEMS.find((i) => i.id === e.id)?.name ?? e.id, rarity: e.rarity, isNew: false, note: 'Trùng lặp → +100 Ngọc' };
  }

  equipSkin(id: string): void {
    if (!this.ownedSkins.includes(id)) return;
    this.equippedSkin = id;
    this.rebuildParty(); sfx.click(); this.pushHud(); this.save();
  }
  equipItem(id: string): void {
    if (!this.ownedItems.includes(id)) return;
    const def = ITEMS.find((i) => i.id === id);
    if (!def) return;
    this.equippedItems[def.slot] = this.equippedItems[def.slot] === id ? null : id;
    this.rebuildParty(); sfx.click(); this.pushHud(); this.save();
  }
  upgradeCompanion(defId: string): boolean {
    const lv = this.ownedCompanions[defId];
    if (lv === undefined) return false;
    const cost = this.upgradeCost(lv);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.ownedCompanions[defId] = lv + 1;
    this.rebuildParty(); sfx.levelup(); this.pushHud(); this.save();
    return true;
  }

  getPartyView(): PartyView[] {
    const activeIds = new Set(this.fighters.map((f) => f.uid));
    const out: PartyView[] = [];
    out.push({
      id: 'kael', name: 'Kael', cls: 'Hắc Kiếm Sĩ', role: 'melee', rarity: 'legendary',
      level: this.kaelLevel, hpPct: 1, atk: Math.round(15 * this.growth(this.kaelLevel) + this.itemBonus().atk),
      maxHp: Math.round(150 * this.growth(this.kaelLevel) + this.itemBonus().hp),
      active: activeIds.has('kael'), isKael: true, upgradeCost: this.upgradeCost(this.kaelLevel),
      skinId: this.equippedSkin,
    });
    COMPANIONS.forEach((def) => {
      const lv = this.ownedCompanions[def.id];
      if (lv === undefined) return;
      const f = this.fighters.find((x) => x.uid === def.id);
      out.push({
        id: def.id, name: def.name, cls: def.cls, role: def.role, rarity: def.rarity, level: lv,
        hpPct: f ? f.hp / f.maxHp : 1, atk: Math.round(def.atk * this.growth(lv)),
        maxHp: Math.round(def.hp * this.growth(lv)), active: activeIds.has(def.id), isKael: false,
        upgradeCost: this.upgradeCost(lv),
      });
    });
    return out;
  }

  private pushHud(): void {
    const boss = this.foes.find((f) => f.bossKind);
    this.cb.onHud({
      gold: Math.floor(this.gold), gems: Math.floor(this.gems),
      floor: this.floor, floorName: FLOOR_META[this.floor].name,
      wave: this.wave, wavesPerFloor: WAVES_PER_FLOOR,
      inBoss: this.bossActive, bossName: boss ? boss.name : '', bossHpPct: boss ? clamp(boss.hp / boss.maxHp, 0, 1) : 0,
      kills: this.kills, speed: this.speed, muted: getMuted(),
      party: this.getPartyView(), pity: this.pity, totalDmg: Math.round(this.totalDmg),
    });
  }

  /* ---------------- waves ---------------- */
  private globalWave(): number { return this.floor * WAVES_PER_FLOOR + this.wave; }
  private spawnWave(): void {
    this.wave += 1;
    this.waveActive = true;
    if (this.wave >= WAVES_PER_FLOOR) {
      this.spawnBoss();
      return;
    }
    const gw = this.globalWave();
    const count = clamp(3 + this.floor + Math.floor(this.wave / 3), 3, 7);
    const types = FLOOR_FOES[this.floor];
    for (let i = 0; i < count; i++) {
      const type = types[irand(0, types.length - 1)];
      this.pending.push({ t: i * 0.55, type });
    }
    this.banner = { main: `ĐỢT ${this.wave}/${WAVES_PER_FLOOR}`, sub: '', t: 0, life: 1.3, color: '#e8dfc8' };
  }
  private foeHpBase(): number { return 16 * Math.pow(1.25, this.globalWave() - 1); }
  private foeAtkBase(): number { return 5 * Math.pow(1.12, this.globalWave() - 1); }

  private spawnFoe(type: FoeType): void {
    const st = FOE_STATS[type];
    const hp = Math.round(this.foeHpBase() * st.hp);
    this.foes.push({
      uid: this.uidSeq++, type, name: st.name, hp, maxHp: hp,
      atk: this.foeAtkBase() * st.atk, spd: st.spd, speed: st.speed,
      gold: Math.round((4 + this.globalWave() * 1.6 + this.floor * 8) * st.gold),
      x: W + rand(40, 130), scale: type === 'brute' ? 1.35 : 1,
      state: 'walk', t: 0, cd: rand(0.3, 0.9), flashT: 0, animT: rand(0, 10),
      specialT: 0, specialPhase: 0, returnX: 0,
    });
  }
  private spawnBoss(): void {
    const meta = FLOOR_META[this.floor];
    const kind = meta.boss as 'morgrim' | 'ishvara' | 'vodien';
    const bs = BOSS_STATS[kind];
    const hp = Math.round(this.foeHpBase() * bs.hpMul);
    this.bossActive = true;
    this.banner = { main: meta.bossName, sub: '— BOSS —', t: 0, life: 2.6, color: '#ff3b52' };
    sfx.roar();
    this.shake = 12;
    this.foes.push({
      uid: this.uidSeq++, type: 'boss', bossKind: kind, name: meta.bossName.split('—')[0].trim(),
      hp, maxHp: hp, atk: this.foeAtkBase() * bs.atkMul, spd: bs.spd, speed: 70,
      gold: Math.round(40 + this.floor * 60), x: W + 120, scale: bs.scale,
      state: 'walk', t: 0, cd: 1, flashT: 0, animT: 0, specialT: 5, specialPhase: 0, returnX: 0,
    });
  }

  /* ---------------- combat helpers ---------------- */
  private aliveFoes(): Foe[] { return this.foes.filter((f) => f.state !== 'die'); }
  private frontFighter(): Fighter | null {
    let best: Fighter | null = null;
    this.fighters.forEach((f) => { if (f.state !== 'dead' && (!best || f.x > best.x)) best = f; });
    return best;
  }
  private nearestFoe(x: number): Foe | null {
    let best: Foe | null = null; let bd = 1e9;
    this.aliveFoes().forEach((f) => { const d = Math.abs(f.x - x); if (d < bd) { bd = d; best = f; } });
    return best;
  }

  private dealToFoe(f: Foe, dmg: number, crit: boolean, sx: number, sy: number): void {
    if (f.state === 'die') return;
    f.hp -= dmg;
    f.flashT = 0.12;
    this.totalDmg += dmg;
    this.texts.push({ x: sx + rand(-14, 14), y: sy, text: Math.round(dmg).toString(), color: crit ? '#ffd23c' : '#ffffff', life: 0.8, maxLife: 0.8, size: crit ? 26 : 17, vy: -70 });
    if (crit) this.texts.push({ x: sx, y: sy - 26, text: 'CHÍ MẠNG!', color: '#ffd23c', life: 0.7, maxLife: 0.7, size: 13, vy: -50 });
    this.burstAt(sx, sy, crit ? '#ffd23c' : '#ff5a6a', crit ? 10 : 5, 'spark');
    if (crit) { sfx.crit(); this.shake = Math.max(this.shake, 5); } else sfx.hit();
    if (f.hp <= 0) this.killFoe(f);
  }

  private killFoe(f: Foe): void {
    f.state = 'die'; f.t = 0;
    this.kills += 1;
    const bonus = 1 + this.itemBonus().goldBonus / 100;
    const gold = Math.round(f.gold * bonus);
    this.gold += gold;
    const gy = GROUND - 40 * f.scale;
    this.burstAt(f.x, gy, '#ff5a6a', f.bossKind ? 46 : 14, 'blood');
    this.burstAt(f.x, gy, '#ffffff', 8, 'poof');
    this.coinFly(f.x, gy, gold);
    sfx.splat();
    if (f.bossKind) {
      this.onBossDown(f);
    }
  }

  private coinFly(x: number, y: number, gold: number): void {
    for (let i = 0; i < Math.min(8, 2 + Math.floor(gold / 20)); i++) {
      this.parts.push({ x: x + rand(-10, 10), y, vx: rand(-40, 40), vy: rand(-160, -90), life: 0.7, maxLife: 0.7, size: 5, color: '#ffd23c', grav: 320, kind: 'coin' });
    }
    this.texts.push({ x, y: y - 30, text: `+${gold}`, color: '#ffd23c', life: 1, maxLife: 1, size: 15, vy: -46 });
  }

  private onBossDown(f: Foe): void {
    this.bossActive = false;
    this.slowmo = 1.1;
    this.shake = 20;
    this.flash = 0.7; this.flashColor = '#ffd8a0';
    sfx.bossdie();
    const gemReward = 60 + this.floor * 50;
    this.gems += gemReward;
    this.texts.push({ x: f.x, y: GROUND - 160, text: `+${gemReward} NGỌC`, color: '#ff8fd0', life: 1.6, maxLife: 1.6, size: 24, vy: -30 });
    this.banner = { main: `${f.name} ĐÃ GỤC NGÃ`, sub: `+${gemReward} Ngọc`, t: 0, life: 2.4, color: '#ffd23c' };
    // wipe remaining minions
    this.aliveFoes().forEach((m) => { if (!m.bossKind) { m.hp = 0; this.killFoe(m); } });
    this.pending = [];
    this.save();
    setTimeout(() => {
      if (this.destroyed) return;
      if (this.floor >= TOTAL_FLOORS - 1) {
        this.state = 'victory';
        this.cb.onEvent({ type: 'victory', stats: { time: this.playTime, kills: this.kills, totalDmg: Math.round(this.totalDmg), floor: this.floor + 1 } });
      } else {
        this.floor += 1;
        this.state = 'story';
        this.cb.onEvent({ type: 'story', chapter: this.floor });
      }
      this.pushHud(); this.save();
    }, 2200);
  }

  private damageFighter(f: Fighter, dmg: number, fromX: number): void {
    if (f.state === 'dead') return;
    f.hp -= dmg;
    f.flashT = 0.15;
    this.burstAt(f.x, GROUND - 60, '#ff5a6a', 6, 'spark');
    this.texts.push({ x: f.x + rand(-10, 10), y: GROUND - 100, text: Math.round(dmg).toString(), color: '#ff7a7a', life: 0.7, maxLife: 0.7, size: 14, vy: -55 });
    if (f.hp <= 0) {
      f.hp = 0; f.state = 'dead'; f.reviveT = 6; f.attackAnim = -1;
      this.burstAt(f.x, GROUND - 40, '#ff5a6a', 20, 'blood');
      sfx.hurt();
      void fromX;
    }
  }

  private burstAt(x: number, y: number, color: string, n: number, kind: Particle['kind']): void {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU); const sp = kind === 'poof' ? rand(20, 70) : rand(60, 260);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'soul' ? 60 : 40),
        life: rand(0.3, kind === 'soul' ? 1.1 : 0.65), maxLife: 0.8, size: kind === 'poof' ? rand(6, 14) : rand(2, 5),
        color, grav: kind === 'soul' ? -30 : kind === 'coin' ? 320 : 200, kind,
      });
    }
    if (kind === 'star' || kind === 'spark') {
      this.parts.push({ x, y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, size: 8, color, grav: 0, kind: 'ring' });
    }
  }

  /* ---------------- main update ---------------- */
  private tick(dt: number): void {
    this.globalT += dt;
    if (!this.paused && (this.state === 'playing')) {
      const sdt = dt * this.speed * (this.slowmo > 0 ? 0.35 : 1);
      if (this.slowmo > 0) this.slowmo -= dt;
      this.update(sdt);
      this.playTime += sdt;
    } else if (!this.paused) {
      this.updateFx(dt);
    }
    this.draw();
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.12; if (this.state === 'playing') this.pushHud(); }
    this.saveT -= dt;
    if (this.saveT <= 0) { this.saveT = 5; this.save(); }
  }

  private update(dt: number): void {
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.flash > 0) this.flash -= dt * 1.4;

    // pending spawns
    for (const p of this.pending) p.t -= dt;
    const due = this.pending.filter((p) => p.t <= 0);
    if (due.length) { due.forEach((p) => this.spawnFoe(p.type)); this.pending = this.pending.filter((p) => p.t > 0); }

    // wave flow
    if (this.state === 'playing' && !this.bossActive && this.pending.length === 0 && this.aliveFoes().length === 0) {
      if (this.wave >= WAVES_PER_FLOOR) {
        // floor cleared handled by boss down; guard
      } else {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          this.spawnWave();
          this.waveDelay = 1.3;
          if (this.wave % 3 === 0) { this.gems += 8; this.texts.push({ x: W / 2, y: 120, text: '+8 Ngọc (thưởng đợt)', color: '#ff8fd0', life: 1.2, maxLife: 1.2, size: 15, vy: -20 }); }
        }
      }
    }

    this.updateFighters(dt);
    this.updateFoes(dt);
    this.updateProjs(dt);
    this.updateFx(dt);
  }

  private updateFx(dt: number): void {
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const f of this.fighters) { f.animT += dt; if (f.flashT > 0) f.flashT -= dt; }
    for (const e of this.foes) { e.animT += dt; if (e.flashT > 0) e.flashT -= dt; }
    this.foes = this.foes.filter((f) => !(f.state === 'die' && f.t > 0.5));
    for (const f of this.foes) if (f.state === 'die') f.t += dt;
  }

  private updateFighters(dt: number): void {
    for (const f of this.fighters) {
      if (f.state === 'dead') {
        f.reviveT -= dt;
        if (f.reviveT <= 0) {
          f.hp = Math.round(f.maxHp * 0.6); f.state = 'idle'; f.x = f.homeX; f.cd = 0.4;
          this.burstAt(f.x, GROUND - 60, '#7fd4ff', 14, 'star');
          this.texts.push({ x: f.x, y: GROUND - 110, text: 'HỒI SINH', color: '#7fd4ff', life: 0.9, maxLife: 0.9, size: 13, vy: -40 });
          sfx.potion();
        }
        continue;
      }
      f.cd -= dt;
      if (f.state === 'idle') {
        if (f.cd > 0) continue;
        if (f.role === 'healer') { this.doHeal(f); continue; }
        const target = this.nearestFoe(f.x);
        if (!target) { f.cd = 0.3; continue; }
        f.target = target.uid;
        if (f.role === 'ranged') { this.doRanged(f, target); f.cd = 1 / f.spd; }
        else { f.state = 'dash'; f.stateT = 0; }
      } else if (f.state === 'dash') {
        const t = this.foes.find((e) => e.uid === f.target && e.state !== 'die');
        if (!t) { f.state = 'return'; }
        else {
          const dest = t.x - 55 * t.scale;
          f.x += clamp(dest - f.x, -620 * dt, 620 * dt);
          if (Math.abs(f.x - dest) < 14) { f.state = 'strike'; f.stateT = 0; f.attackAnim = 0; sfx.slash(); }
        }
      } else if (f.state === 'strike') {
        f.stateT += dt;
        f.attackAnim = Math.min(1, f.stateT / 0.3);
        if (f.stateT >= 0.13 && f.stateT - dt < 0.13) {
          const t = this.foes.find((e) => e.uid === f.target && e.state !== 'die');
          if (t) {
            const crit = Math.random() * 100 < f.crit;
            this.dealToFoe(t, f.atk * (crit ? 1.8 : 1) * rand(0.9, 1.1), crit, t.x, GROUND - 70 * t.scale);
            this.slashFx(t.x - 10, GROUND - 70 * t.scale, f.cfg.accent);
          }
        }
        if (f.stateT >= 0.34) { f.state = 'return'; f.attackAnim = -1; }
      } else if (f.state === 'return') {
        f.x += clamp(f.homeX - f.x, -520 * dt, 520 * dt);
        if (Math.abs(f.x - f.homeX) < 8) { f.x = f.homeX; f.state = 'idle'; f.cd = 1 / f.spd; }
      } else if (f.state === 'cast') {
        f.stateT += dt;
        if (f.stateT > 0.4) { f.state = 'idle'; f.cd = 1 / f.spd; }
      }
    }
  }

  private doRanged(f: Fighter, t: Foe): void {
    f.state = 'cast'; f.stateT = 0;
    const kind: Proj['kind'] = f.cfg.weapon === 'bow' ? 'arrow' : f.cfg.weapon === 'spear' ? 'light' : 'magic';
    const splash = f.defId === 'seraph' ? 0.3 : 0;
    this.projs.push({
      x: f.x + 20, y: GROUND - 78 * f.cfg.scale, target: t.uid,
      speed: kind === 'arrow' ? 950 : kind === 'light' ? 1050 : 640,
      dmg: f.atk * rand(0.92, 1.08), kind, t: 0, splash, crit: f.crit,
    });
    if (kind === 'arrow') sfx.shoot(); else sfx.teleport();
  }
  private doHeal(f: Fighter): void {
    const wounded = this.fighters.filter((x) => x.state !== 'dead' && x.hp < x.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!wounded) { f.cd = 0.5; return; }
    f.state = 'cast'; f.stateT = 0;
    const amount = f.atk * 2.6;
    wounded.hp = Math.min(wounded.maxHp, wounded.hp + amount);
    this.burstAt(wounded.x, GROUND - 70, '#7fe08a', 12, 'star');
    this.texts.push({ x: wounded.x, y: GROUND - 105, text: `+${Math.round(amount)}`, color: '#7fe08a', life: 0.8, maxLife: 0.8, size: 15, vy: -50 });
    sfx.potion();
    f.cd = 1 / f.spd;
  }

  private slashFx(x: number, y: number, color: string): void {
    this.burstAt(x, y, color, 6, 'spark');
    this.burstAt(x, y, '#ffffff', 3, 'spark');
  }

  private updateFoes(dt: number): void {
    for (const e of this.foes) {
      if (e.state === 'die') continue;
      if (e.bossKind) { this.updateBoss(e, dt); continue; }
      const frontline = 660;
      if (e.x > frontline) { e.x -= e.speed * dt; e.state = 'walk'; }
      else {
        e.state = 'fight';
        e.cd -= dt;
        if (e.cd <= 0) {
          const target = this.frontFighter();
          if (target) {
            this.damageFighter(target, e.atk * rand(0.85, 1.15), e.x);
            this.slashFx(target.x + 10, GROUND - 70, '#ff5a6a');
            if (e.type === 'imp' || e.type === 'wisp') sfx.shoot(); else sfx.slash();
          }
          e.cd = 1 / e.spd;
        }
      }
    }
  }

  private updateBoss(e: Foe, dt: number): void {
    const frontline = e.bossKind === 'vodien' ? 700 : 720;
    e.specialT -= dt;
    if (e.state === 'walk') {
      e.x -= e.speed * dt;
      if (e.x <= frontline) { e.state = 'fight'; e.cd = 0.8; e.specialT = 5; }
      return;
    }
    if (e.state === 'tele') {
      e.t += dt;
      // vodien teleport special
      if (e.t > 0.5 && e.specialPhase === 1) {
        e.specialPhase = 2;
        e.x = 160; sfx.teleport();
        this.burstAt(e.x, GROUND - 90, '#c9b8ff', 18, 'spark');
      }
      if (e.t > 0.7 && e.specialPhase === 2) {
        e.specialPhase = 3;
        const target = this.frontFighter() ?? this.fighters.find((f) => f.state !== 'dead');
        if (target) {
          this.damageFighter(target, e.atk * 1.4, e.x);
          this.shake = Math.max(this.shake, 9);
          this.burstAt(target.x, GROUND - 60, '#c9b8ff', 16, 'spark');
          sfx.beam();
        }
      }
      if (e.t > 1.3) { e.state = 'fight'; e.x = frontline; e.cd = 0.8; e.specialT = rand(5, 7); e.specialPhase = 0; }
      return;
    }
    // fight state
    e.cd -= dt;
    if (e.cd <= 0) {
      const target = this.frontFighter();
      if (target) {
        this.damageFighter(target, e.atk * rand(0.9, 1.1), e.x);
        this.slashFx(target.x + 14, GROUND - 70, '#ff5a6a');
        sfx.heavy();
        this.shake = Math.max(this.shake, 4);
      }
      e.cd = 1 / e.spd;
    }
    if (e.specialT <= 0) {
      if (e.bossKind === 'morgrim') {
        // shockwave hits whole party
        sfx.spike();
        this.shake = Math.max(this.shake, 12);
        this.flash = 0.3; this.flashColor = '#ff9a3c';
        this.fighters.forEach((f) => { if (f.state !== 'dead') this.damageFighter(f, e.atk * 0.7, e.x); });
        for (let i = 0; i < 22; i++) this.parts.push({ x: e.x - rand(0, 300), y: GROUND, vx: rand(-60, 60), vy: rand(-260, -120), life: 0.7, maxLife: 0.7, size: rand(3, 7), color: '#ff9a3c', grav: 420, kind: 'spark' });
        this.texts.push({ x: e.x - 140, y: GROUND - 140, text: 'SÓNG CHẤN ĐỘNG!', color: '#ff9a3c', life: 1, maxLife: 1, size: 16, vy: -30 });
        e.specialT = rand(5.5, 7.5);
      } else if (e.bossKind === 'ishvara') {
        sfx.shoot();
        const targets = this.fighters.filter((f) => f.state !== 'dead');
        for (let i = 0; i < 3; i++) {
          const tgt = targets[i % Math.max(1, targets.length)];
          if (tgt) this.projs.push({ x: e.x - 30, y: GROUND - 150 - i * 20, target: tgt.uid, speed: 480, dmg: e.atk * 0.65, kind: 'acid', t: i * 0.15, splash: 0, crit: 0 });
        }
        if (this.aliveFoes().length < 5 && Math.random() < 0.6) { this.spawnFoe('slime'); this.spawnFoe('slime'); }
        this.texts.push({ x: e.x - 60, y: GROUND - 200, text: 'MƯA AXIT!', color: '#8dff9a', life: 1, maxLife: 1, size: 16, vy: -30 });
        e.specialT = rand(5, 7);
      } else {
        // vodien teleports behind party
        e.state = 'tele'; e.t = 0; e.specialPhase = 1;
        this.burstAt(e.x, GROUND - 90, '#c9b8ff', 18, 'spark');
        // plus bolt fan
        const targets = this.fighters.filter((f) => f.state !== 'dead');
        targets.slice(0, 3).forEach((tgt) => this.projs.push({ x: e.x - 40, y: GROUND - 180, target: tgt.uid, speed: 520, dmg: e.atk * 0.5, kind: 'bolt', t: 0, splash: 0, crit: 0 }));
        sfx.beam();
        e.specialT = rand(5.5, 8);
      }
    }
  }

  private updateProjs(dt: number): void {
    const keep: Proj[] = [];
    for (const pr of this.projs) {
      pr.t -= dt;
      if (pr.t > 0) { keep.push(pr); continue; }
      const isEnemy = pr.kind === 'acid' || pr.kind === 'bolt';
      if (isEnemy) {
        const tgt = this.fighters.find((f) => f.uid === pr.target && f.state !== 'dead') ?? this.frontFighter();
        if (!tgt) continue;
        const ty = GROUND - 70;
        const dx = tgt.x - pr.x; const dy = ty - pr.y;
        const d = Math.hypot(dx, dy);
        if (d < 26) {
          this.damageFighter(tgt, pr.dmg, pr.x);
          this.burstAt(pr.x, ty, pr.kind === 'acid' ? '#8dff9a' : '#c9b8ff', 8, 'spark');
          continue;
        }
        pr.x += (dx / d) * pr.speed * dt; pr.y += (dy / d) * pr.speed * dt;
        keep.push(pr);
      } else {
        const tgt = this.foes.find((f) => f.uid === pr.target && f.state !== 'die');
        if (!tgt) continue;
        const ty = GROUND - 70 * tgt.scale;
        const dx = tgt.x - pr.x; const dy = ty - pr.y;
        const d = Math.hypot(dx, dy);
        if (d < 30 * tgt.scale) {
          const crit = Math.random() * 100 < pr.crit;
          this.dealToFoe(tgt, pr.dmg * (crit ? 1.8 : 1), crit, tgt.x, ty);
          if (pr.splash > 0) {
            this.aliveFoes().filter((o) => o.uid !== tgt.uid).slice(0, 2).forEach((o) => this.dealToFoe(o, pr.dmg * pr.splash, false, o.x, GROUND - 60 * o.scale));
          }
          continue;
        }
        pr.x += (dx / d) * pr.speed * dt; pr.y += (dy / d) * pr.speed * dt;
        if (Math.random() < 0.5) {
          this.parts.push({ x: pr.x, y: pr.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.25, maxLife: 0.25, size: 3, color: pr.kind === 'arrow' ? '#c9e8ff' : pr.kind === 'light' ? '#ffd23c' : '#d05cff', grav: 0, kind: 'spark' });
        }
        keep.push(pr);
      }
    }
    this.projs = keep;
  }

  /* ============================================================
     DRAW
     ============================================================ */
  private draw(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake) * 0.6, rand(-this.shake, this.shake) * 0.6);

    this.drawBg(ctx);
    this.drawGround(ctx);

    // sort entities by x for layering
    const drawables: { x: number; fn: () => void }[] = [];
    for (const f of this.fighters) drawables.push({ x: f.x, fn: () => this.drawFighter(ctx, f) });
    for (const e of this.foes) drawables.push({ x: e.x, fn: () => this.drawFoe(ctx, e) });
    drawables.sort((a, b) => a.x - b.x).forEach((d) => d.fn());

    this.drawProjs(ctx);
    this.drawParts(ctx);
    this.drawTexts(ctx);
    this.drawBanner(ctx);
    this.drawBossBar(ctx);
    this.drawWavePips(ctx);

    ctx.restore();

    if (this.flash > 0) {
      ctx.globalAlpha = clamp(this.flash, 0, 1) * 0.5;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(4,3,8,0.55)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawBg(ctx: CanvasRenderingContext2D): void {
    const idx = this.state === 'playing' || this.state === 'story' || this.state === 'victory' ? this.floor + 1 : 0;
    const im = this.bgImgs[clamp(idx, 0, 3)];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#141021'); grad.addColorStop(1, '#0a0812');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    if (im && this.bgLoaded[clamp(idx, 0, 3)]) {
      const pan = Math.sin(this.globalT * 0.05) * 14;
      const sc = Math.max(W / im.width, H / im.height) * 1.06;
      const iw = im.width * sc; const ih = im.height * sc;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(im, (W - iw) / 2 + pan, (H - ih) / 2 - 20, iw, ih);
      ctx.globalAlpha = 1;
    }
    // darken bottom for gameplay readability
    const g2 = ctx.createLinearGradient(0, GROUND - 160, 0, H);
    g2.addColorStop(0, 'rgba(8,6,14,0)');
    g2.addColorStop(1, 'rgba(8,6,14,0.88)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, GROUND - 160, W, H - GROUND + 160);
    // ambient embers
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const seed = i * 137.5;
      const px = ((seed + this.globalT * (14 + (i % 5) * 6)) % (W + 60)) - 30;
      const py = H - ((seed * 1.7 + this.globalT * (24 + (i % 4) * 10)) % (H + 40));
      const a = 0.14 + 0.1 * Math.sin(this.globalT * 2 + i);
      ctx.globalAlpha = clamp(a, 0, 0.3);
      ctx.fillStyle = i % 3 === 0 ? '#ff9a3c' : '#ff5a6a';
      ctx.beginPath(); ctx.arc(px, py, i % 4 === 0 ? 2.4 : 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(10,8,16,0.65)';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = 'rgba(255,154,60,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
    // cracks
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const sx = (i * 173) % W;
      ctx.beginPath(); ctx.moveTo(sx, GROUND + 8 + (i % 3) * 18);
      ctx.lineTo(sx + 40 + (i % 4) * 20, GROUND + 14 + (i % 3) * 18);
      ctx.stroke();
    }
  }

  /* ---------- hero drawing (anime chibi-proportion) ---------- */
  private drawFighter(ctx: CanvasRenderingContext2D, f: Fighter): void {
    const gy = GROUND;
    const s = f.cfg.scale;
    const bob = f.state === 'dead' ? 0 : Math.sin(f.animT * 3.2) * 2.2;
    ctx.save();
    ctx.translate(f.x, gy);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, 30 * s, 8 * s, 0, 0, TAU); ctx.fill();

    if (f.state === 'dead') {
      this.drawHeroDown(ctx, f);
      ctx.restore();
      return;
    }

    // aura
    if (f.cfg.aura) {
      const ag = ctx.createRadialGradient(0, -60 * s, 6, 0, -60 * s, 70 * s);
      ag.addColorStop(0, f.cfg.aura); ag.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(0, -60 * s, 70 * s, 0, TAU); ctx.fill();
      // sparkles
      for (let i = 0; i < 3; i++) {
        const a = f.animT * 1.4 + i * 2.1;
        const px = Math.cos(a) * 34 * s; const py = -60 * s + Math.sin(a * 1.3) * 40 * s;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(f.animT * 4 + i);
        this.star(ctx, px, py, 4, f.cfg.accent);
        ctx.globalAlpha = 1;
      }
    }

    ctx.translate(0, bob);
    if (f.flashT > 0) { ctx.filter = 'brightness(2.2)'; }

    const swing = f.attackAnim >= 0 ? f.attackAnim : -1;
    this.drawHeroBody(ctx, f.cfg, s, swing, f.state === 'cast' ? f.stateT : -1, f.animT);

    ctx.filter = 'none';
    ctx.restore();

    // hp bar above head
    const hpPct = clamp(f.hp / f.maxHp, 0, 1);
    const bw = 56;
    const bx = f.x - bw / 2; const by = gy - 128 * s;
    ctx.fillStyle = 'rgba(8,6,12,0.8)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = hpPct > 0.5 ? '#52e07a' : hpPct > 0.25 ? '#ffd23c' : '#ff3b52';
    ctx.fillRect(bx, by, bw * hpPct, 5);
    // name + level
    ctx.font = '700 11px "Eczar", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = f.isKael ? '#ffd8a1' : '#e8dfc8';
    ctx.fillText(`${f.name} Lv${f.level}`, f.x, by - 5);
  }

  private drawHeroDown(ctx: CanvasRenderingContext2D, f: Fighter): void {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.rotate(-Math.PI / 2);
    ctx.translate(30, 8);
    ctx.scale(0.9, 0.9);
    this.drawHeroBody(ctx, f.cfg, f.cfg.scale, -1, -1, 0);
    ctx.restore();
    // soul wisp
    const sy = -70 - Math.sin(f.animT * 2) * 6;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath(); ctx.arc(0, sy, 7, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = '700 10px "Eczar", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fd8ff';
    ctx.fillText(`${Math.ceil(f.reviveT)}s`, 0, -96);
  }

  private drawHeroBody(ctx: CanvasRenderingContext2D, cfg: HeroCfg, s: number, swing: number, castT: number, animT: number): void {
    // feet at (0,0), facing right
    const c = cfg;
    ctx.save();
    ctx.scale(s, s);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#17121f';
    ctx.lineJoin = 'round';

    // cape
    if (c.cape) {
      ctx.fillStyle = c.cape;
      ctx.beginPath();
      ctx.moveTo(-8, -58);
      ctx.quadraticCurveTo(-26, -34 + Math.sin(animT * 3) * 3, -20, -4);
      ctx.lineTo(-6, -22);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // legs
    ctx.fillStyle = c.outfitDark;
    rr(ctx, -13, -26, 11, 26, 4); ctx.fill(); ctx.stroke();
    rr(ctx, 3, -26, 11, 26, 4); ctx.fill(); ctx.stroke();
    // boots
    ctx.fillStyle = '#241d2e';
    rr(ctx, -14, -7, 13, 7, 3); ctx.fill(); ctx.stroke();
    rr(ctx, 2, -7, 13, 7, 3); ctx.fill(); ctx.stroke();
    // torso
    ctx.fillStyle = c.outfit;
    ctx.beginPath();
    ctx.moveTo(-15, -58); ctx.lineTo(15, -58); ctx.lineTo(13, -24); ctx.lineTo(-13, -24);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // belt
    ctx.fillStyle = c.accent;
    ctx.fillRect(-13, -32, 26, 5);
    // chest accent
    ctx.fillStyle = c.outfitDark;
    ctx.beginPath(); ctx.moveTo(-15, -58); ctx.lineTo(0, -52); ctx.lineTo(15, -58); ctx.lineTo(15, -50); ctx.lineTo(-15, -50); ctx.closePath(); ctx.fill();

    // back arm
    ctx.fillStyle = c.outfit;
    rr(ctx, -20, -56, 8, 24, 4); ctx.fill(); ctx.stroke();

    // head
    const hy = -76;
    ctx.fillStyle = c.skinTone;
    ctx.beginPath(); ctx.arc(2, hy, 16, 0, TAU); ctx.fill(); ctx.stroke();
    // ears
    ctx.beginPath(); ctx.arc(-12, hy + 2, 3.4, 0, TAU); ctx.fill(); ctx.stroke();

    // hair back layer
    ctx.fillStyle = c.hair;
    this.drawHairBack(ctx, c, hy);

    // eyes (anime)
    this.drawAnimeEyes(ctx, c, hy);
    // mouth
    ctx.strokeStyle = '#8a5a4a';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(6, hy + 8); ctx.quadraticCurveTo(9, hy + 10, 12, hy + 8); ctx.stroke();
    ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;

    // hair front layer
    this.drawHairFront(ctx, c, hy);

    // weapon arm + weapon
    const casting = castT >= 0;
    const shoulderX = 10; const shoulderY = -54;
    let armAngle: number;
    if (swing >= 0) armAngle = lerp(-2.4, 0.9, easeOut(swing));
    else if (casting) armAngle = -1.9 + Math.sin(castT * 20) * 0.1;
    else armAngle = -0.5 + Math.sin(animT * 3.2) * 0.06;

    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(armAngle);
    ctx.fillStyle = c.outfit;
    rr(ctx, -4, 0, 9, 26, 4); ctx.fill(); ctx.stroke();
    // hand
    ctx.fillStyle = c.skinTone;
    ctx.beginPath(); ctx.arc(0.5, 27, 4.6, 0, TAU); ctx.fill(); ctx.stroke();
    // weapon
    this.drawWeapon(ctx, c, swing, castT);
    ctx.restore();

    ctx.restore();
  }

  private drawAnimeEyes(ctx: CanvasRenderingContext2D, c: HeroCfg, hy: number): void {
    const eyes = [ { x: 3, big: true }, { x: 12, big: false } ];
    for (const e of eyes) {
      const w = e.big ? 5.2 : 4.2; const h = e.big ? 6.4 : 5.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(e.x, hy - 1, w, h, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = c.eye;
      ctx.beginPath(); ctx.ellipse(e.x + 1, hy - 0.5, w * 0.62, h * 0.66, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#10101a';
      ctx.beginPath(); ctx.arc(e.x + 1.4, hy - 0.2, w * 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e.x - 0.4, hy - 2.6, 1.5, 0, TAU); ctx.fill();
    }
    ctx.lineWidth = 2.4;
  }

  private drawHairBack(ctx: CanvasRenderingContext2D, c: HeroCfg, hy: number): void {
    ctx.beginPath();
    switch (c.hairStyle) {
      case 'long':
        ctx.moveTo(-14, hy - 6);
        ctx.quadraticCurveTo(-26, hy + 16, -20, hy + 40);
        ctx.lineTo(-8, hy + 34);
        ctx.quadraticCurveTo(-16, hy + 10, -6, hy - 4);
        break;
      case 'angel':
        ctx.moveTo(-14, hy - 6);
        ctx.quadraticCurveTo(-28, hy + 20, -18, hy + 44);
        ctx.lineTo(-6, hy + 36);
        ctx.quadraticCurveTo(-18, hy + 8, -6, hy - 4);
        break;
      default:
        ctx.moveTo(-15, hy - 2);
        ctx.quadraticCurveTo(-22, hy + 8, -16, hy + 14);
        ctx.lineTo(-8, hy + 6);
        break;
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (c.hairStyle === 'angel') {
      // halo
      ctx.save();
      ctx.strokeStyle = '#ffd23c';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.ellipse(2, hy - 24, 15, 5, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;
    }
  }

  private drawHairFront(ctx: CanvasRenderingContext2D, c: HeroCfg, hy: number): void {
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    switch (c.hairStyle) {
      case 'spiky':
        ctx.moveTo(-16, hy - 2);
        ctx.lineTo(-20, hy - 16); ctx.lineTo(-9, hy - 10);
        ctx.lineTo(-8, hy - 24); ctx.lineTo(0, hy - 13);
        ctx.lineTo(6, hy - 26); ctx.lineTo(10, hy - 12);
        ctx.lineTo(19, hy - 18); ctx.lineTo(17, hy - 4);
        ctx.quadraticCurveTo(18, hy - 14, 2, hy - 15);
        ctx.quadraticCurveTo(-12, hy - 15, -16, hy - 2);
        break;
      case 'wild':
        ctx.moveTo(-16, hy);
        ctx.quadraticCurveTo(-22, hy - 18, -6, hy - 20);
        ctx.quadraticCurveTo(0, hy - 26, 8, hy - 19);
        ctx.quadraticCurveTo(20, hy - 18, 17, hy - 2);
        ctx.quadraticCurveTo(14, hy - 13, 2, hy - 14);
        ctx.quadraticCurveTo(-10, hy - 14, -16, hy);
        break;
      case 'bun':
        ctx.arc(2, hy - 6, 16.5, Math.PI * 0.95, Math.PI * 2.02);
        ctx.quadraticCurveTo(16, hy - 8, 15, hy - 2);
        ctx.quadraticCurveTo(8, hy - 14, -2, hy - 13);
        ctx.quadraticCurveTo(-13, hy - 12, -14, hy - 1);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(-8, hy - 22, 7.5, 0, TAU);
        break;
      case 'long':
      case 'angel':
        ctx.moveTo(-16, hy);
        ctx.quadraticCurveTo(-18, hy - 20, 2, hy - 20);
        ctx.quadraticCurveTo(19, hy - 19, 17, hy - 1);
        ctx.lineTo(13, hy - 8);
        ctx.quadraticCurveTo(10, hy - 2, 12, hy + 4);
        ctx.quadraticCurveTo(4, hy - 12, -4, hy - 12);
        ctx.quadraticCurveTo(-12, hy - 10, -16, hy);
        break;
      default:
        ctx.moveTo(-16, hy - 1);
        ctx.quadraticCurveTo(-16, hy - 19, 2, hy - 19);
        ctx.quadraticCurveTo(18, hy - 18, 17, hy - 2);
        ctx.quadraticCurveTo(10, hy - 13, -2, hy - 13);
        ctx.quadraticCurveTo(-12, hy - 12, -16, hy - 1);
        break;
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  private drawWeapon(ctx: CanvasRenderingContext2D, c: HeroCfg, swing: number, castT: number): void {
    // drawn pointing "down" from hand at (0,27); rotate to taste
    ctx.save();
    ctx.translate(0.5, 27);
    switch (c.weapon) {
      case 'great': {
        ctx.rotate(-0.25);
        ctx.fillStyle = '#3a3542';
        rr(ctx, -3.4, 2, 7, 16, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.accent;
        rr(ctx, -9, 16, 18, 5, 2); ctx.fill(); ctx.stroke();
        const glint = swing >= 0 ? 0.5 + 0.5 * Math.sin(swing * Math.PI) : 0.35;
        const bg = ctx.createLinearGradient(0, 20, 0, 96);
        bg.addColorStop(0, '#c8cdd8'); bg.addColorStop(1, '#5a5f6e');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-8, 20); ctx.lineTo(9, 20); ctx.lineTo(11, 88); ctx.lineTo(0, 100); ctx.lineTo(-10, 84);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = glint;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(8, 24); ctx.lineTo(8, 80); ctx.lineTo(3, 74); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'sword': {
        ctx.fillStyle = '#5a4630';
        rr(ctx, -3, 2, 6, 12, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.accent;
        rr(ctx, -8, 13, 16, 4, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, 16, 0, 70);
        bg.addColorStop(0, '#d6dae2'); bg.addColorStop(1, '#7c8290');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-5, 16); ctx.lineTo(5, 16); ctx.lineTo(6, 60); ctx.lineTo(0, 70); ctx.lineTo(-6, 58); ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      }
      case 'dagger': {
        ctx.fillStyle = '#2c2733';
        rr(ctx, -2.6, 2, 5, 9, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, 10, 0, 44);
        bg.addColorStop(0, '#b8bcd0'); bg.addColorStop(1, '#565a70');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(4, 10); ctx.lineTo(4.5, 38); ctx.lineTo(0, 46); ctx.lineTo(-4.5, 36); ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      }
      case 'bow': {
        ctx.rotate(0.2);
        ctx.strokeStyle = '#7a5230';
        ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.arc(0, 26, 26, -1.15, 1.15); ctx.stroke();
        ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(26 * Math.cos(-1.15), 26 + 26 * Math.sin(-1.15));
        ctx.lineTo(26 * Math.cos(1.15), 26 + 26 * Math.sin(1.15));
        ctx.stroke();
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;
        break;
      }
      case 'staff': {
        ctx.fillStyle = '#6a4a30';
        rr(ctx, -2.2, 0, 4.4, 62, 2); ctx.fill(); ctx.stroke();
        const glow = castT >= 0 ? 0.9 : 0.5 + 0.2 * Math.sin(castT >= 0 ? 0 : 0);
        ctx.globalAlpha = glow;
        const og = ctx.createRadialGradient(0, 64, 1, 0, 64, 13);
        og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, c.accent); og.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(0, 64, 13, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(0, 64, 5.5, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      case 'spear': {
        ctx.rotate(-0.3);
        ctx.fillStyle = '#d8d2c0';
        rr(ctx, -2, 4, 4, 66, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, -18, 0, 6);
        bg.addColorStop(0, '#fff2c0'); bg.addColorStop(1, '#ffb020');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /* ---------- foes ---------- */
  private drawFoe(ctx: CanvasRenderingContext2D, e: Foe): void {
    const gy = GROUND;
    ctx.save();
    ctx.translate(e.x, gy);
    if (e.state === 'die') {
      ctx.globalAlpha = clamp(1 - e.t / 0.5, 0, 1);
      ctx.scale(1 + e.t, Math.max(0.05, 1 - e.t * 1.6));
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, 26 * e.scale, 7 * e.scale, 0, 0, TAU); ctx.fill();
    if (e.flashT > 0) ctx.filter = 'brightness(2.4)';
    // facing left
    ctx.scale(-e.scale, e.scale);
    if (e.bossKind) this.drawBossBody(ctx, e);
    else this.drawMonster(ctx, e);
    ctx.filter = 'none';
    ctx.restore();

    if (e.state !== 'die' && !e.bossKind) {
      const pct = clamp(e.hp / e.maxHp, 0, 1);
      const bw = 44 * e.scale;
      ctx.fillStyle = 'rgba(8,6,12,0.8)';
      ctx.fillRect(e.x - bw / 2 - 1, gy - 96 * e.scale - 1, bw + 2, 6);
      ctx.fillStyle = '#ff3b52';
      ctx.fillRect(e.x - bw / 2, gy - 96 * e.scale, bw * pct, 4);
    }
  }

  private monsterEyes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pupil = '#1a1020'): void {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = pupil;
    ctx.beginPath(); ctx.arc(x - r * 0.25, y, r * 0.45, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.3, r * 0.18, 0, TAU); ctx.fill();
  }

  private drawMonster(ctx: CanvasRenderingContext2D, e: Foe): void {
    const t = e.animT;
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#17121f';
    switch (e.type) {
      case 'slime': {
        const sq = 1 + Math.sin(t * 6) * 0.08;
        ctx.fillStyle = '#5ad16a';
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.quadraticCurveTo(-26, -34 * sq, 0, -38 * sq);
        ctx.quadraticCurveTo(26, -34 * sq, 22, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(-8, -26, 6, 9, -0.4, 0, TAU); ctx.fill();
        this.monsterEyes(ctx, -6, -18, 5);
        this.monsterEyes(ctx, 9, -18, 5);
        ctx.strokeStyle = '#1a4020'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(2, -10, 5, 0.2, Math.PI - 0.2); ctx.stroke();
        break;
      }
      case 'bat': {
        const flap = Math.sin(t * 14) * 0.7;
        const y = -52 + Math.sin(t * 5) * 6;
        ctx.save(); ctx.translate(0, y);
        ctx.fillStyle = '#7a4a9a';
        // wings
        for (const dir of [-1, 1]) {
          ctx.save(); ctx.scale(dir, 1); ctx.rotate(flap * dir);
          ctx.beginPath();
          ctx.moveTo(6, -4);
          ctx.quadraticCurveTo(28, -18, 34, -2);
          ctx.quadraticCurveTo(26, 0, 22, 6);
          ctx.quadraticCurveTo(16, 2, 6, 6);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = '#9a5ac0';
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // ears
        ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-12, -20); ctx.lineTo(-3, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(12, -20); ctx.lineTo(3, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
        this.monsterEyes(ctx, -4, -3, 3.6, '#ff3b52');
        this.monsterEyes(ctx, 5, -3, 3.6, '#ff3b52');
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(-1.5, 10); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, 6); ctx.lineTo(1.5, 10); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'skeleton': {
        const step = Math.sin(t * 7) * 3;
        ctx.fillStyle = '#d8d2c4';
        // legs
        rr(ctx, -12, -22 + step * 0.4, 7, 22, 3); ctx.fill(); ctx.stroke();
        rr(ctx, 5, -22 - step * 0.4, 7, 22, 3); ctx.fill(); ctx.stroke();
        // ribs
        ctx.fillStyle = '#c9c2b2';
        rr(ctx, -13, -52, 26, 32, 6); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#8f887a'; ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10, -44 + i * 8); ctx.lineTo(10, -44 + i * 8); ctx.stroke(); }
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.2;
        // skull
        ctx.fillStyle = '#e8e2d4';
        ctx.beginPath(); ctx.arc(0, -64, 13, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1a1020';
        ctx.beginPath(); ctx.ellipse(-5, -66, 3.6, 4.4, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -66, 3.6, 4.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff3b52';
        ctx.beginPath(); ctx.arc(-5, -66, 1.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -66, 1.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-4, -57); ctx.lineTo(4, -57); ctx.stroke();
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.2;
        // rusty sword
        ctx.save(); ctx.translate(16, -40); ctx.rotate(0.5 + Math.sin(t * 7) * 0.15);
        ctx.fillStyle = '#8f887a';
        ctx.beginPath(); ctx.moveTo(-2.6, 0); ctx.lineTo(2.6, 0); ctx.lineTo(2, -34); ctx.lineTo(-2, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'imp': {
        const hop = Math.abs(Math.sin(t * 6)) * 5;
        ctx.save(); ctx.translate(0, -hop);
        ctx.fillStyle = '#c04a5a';
        // tail
        ctx.strokeStyle = '#c04a5a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-12, -14); ctx.quadraticCurveTo(-30, -18, -28, -34); ctx.stroke();
        ctx.fillStyle = '#8a2a3a';
        ctx.beginPath(); ctx.moveTo(-28, -34); ctx.lineTo(-34, -40); ctx.lineTo(-24, -40); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.2;
        // body
        ctx.fillStyle = '#c04a5a';
        ctx.beginPath(); ctx.ellipse(0, -22, 16, 20, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // legs
        rr(ctx, -12, -10, 8, 12, 3); ctx.fill(); ctx.stroke();
        rr(ctx, 4, -10, 8, 12, 3); ctx.fill(); ctx.stroke();
        // horns
        ctx.fillStyle = '#3a2a2a';
        ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(-14, -52); ctx.lineTo(-4, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -40); ctx.lineTo(14, -52); ctx.lineTo(4, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
        this.monsterEyes(ctx, -5, -28, 4.4, '#ffd23c');
        this.monsterEyes(ctx, 6, -28, 4.4, '#ffd23c');
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-4, -17); ctx.quadraticCurveTo(1, -13, 6, -17); ctx.stroke();
        // fangs
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-2, -12); ctx.lineTo(-1, -16); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, -16); ctx.lineTo(2, -12); ctx.lineTo(1, -16); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'wisp': {
        const y = -46 + Math.sin(t * 4) * 10;
        const g = ctx.createRadialGradient(0, y, 2, 0, y, 26);
        g.addColorStop(0, '#eaffff'); g.addColorStop(0.5, '#7fd4ff'); g.addColorStop(1, 'rgba(127,212,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, y, 26, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(220,250,255,0.9)';
        ctx.beginPath(); ctx.arc(0, y, 12, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2a6a8a'; ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#123a5a';
        ctx.beginPath(); ctx.ellipse(-4, y - 2, 2.4, 3.4, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, y - 2, 2.4, 3.4, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, y + 4, 2, 3, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'brute': {
        const step = Math.sin(t * 4) * 3;
        ctx.fillStyle = '#6a7a4a';
        rr(ctx, -20, -26 + step * 0.4, 14, 26, 5); ctx.fill(); ctx.stroke();
        rr(ctx, 6, -26 - step * 0.4, 14, 26, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7a8a56';
        ctx.beginPath(); ctx.ellipse(0, -48, 26, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // arms
        rr(ctx, -34, -60, 12, 34, 5); ctx.fill(); ctx.stroke();
        rr(ctx, 22, -60, 12, 34, 5); ctx.fill(); ctx.stroke();
        // club
        ctx.save(); ctx.translate(28, -28); ctx.rotate(-0.6 + Math.sin(t * 4) * 0.12);
        ctx.fillStyle = '#5a4630';
        rr(ctx, -4, -40, 8, 42, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4a3a26';
        ctx.beginPath(); ctx.ellipse(0, -46, 12, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
        // head
        ctx.fillStyle = '#8a9a62';
        ctx.beginPath(); ctx.arc(0, -80, 15, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8e2d4';
        ctx.beginPath(); ctx.moveTo(-12, -76); ctx.lineTo(-18, -68); ctx.lineTo(-9, -72); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, -76); ctx.lineTo(18, -68); ctx.lineTo(9, -72); ctx.closePath(); ctx.fill(); ctx.stroke();
        this.monsterEyes(ctx, -5, -83, 4, '#ff3b52');
        this.monsterEyes(ctx, 6, -83, 4, '#ff3b52');
        break;
      }
      default: break;
    }
    ctx.lineWidth = 2.2;
  }

  private drawBossBody(ctx: CanvasRenderingContext2D, e: Foe): void {
    const t = e.animT;
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#17121f';
    if (e.bossKind === 'morgrim') {
      const step = Math.sin(t * 3) * 2;
      // cape
      ctx.fillStyle = '#5c0e1e';
      ctx.beginPath(); ctx.moveTo(-20, -110); ctx.quadraticCurveTo(-52, -60, -36, -6); ctx.lineTo(-12, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
      // legs
      ctx.fillStyle = '#3a3f4a';
      rr(ctx, -22, -40 + step, 16, 40, 5); ctx.fill(); ctx.stroke();
      rr(ctx, 6, -40 - step, 16, 40, 5); ctx.fill(); ctx.stroke();
      // torso armor
      const bg = ctx.createLinearGradient(0, -120, 0, -36);
      bg.addColorStop(0, '#5a6272'); bg.addColorStop(1, '#333844');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(-26, -112); ctx.lineTo(26, -112); ctx.lineTo(22, -36); ctx.lineTo(-22, -36); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c2172f';
      ctx.fillRect(-22, -60, 44, 6);
      // pauldrons
      ctx.fillStyle = '#4a5262';
      ctx.beginPath(); ctx.ellipse(-28, -108, 14, 10, -0.3, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(28, -108, 14, 10, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
      // horned helm
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath(); ctx.arc(0, -132, 17, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a2e38';
      ctx.fillRect(-17, -136, 34, 8);
      // glowing visor
      ctx.fillStyle = '#ff5a20';
      ctx.shadowColor = '#ff5a20'; ctx.shadowBlur = 14;
      ctx.fillRect(-12, -134, 24, 5);
      ctx.shadowBlur = 0;
      // horns
      ctx.fillStyle = '#c9c2b2';
      ctx.beginPath(); ctx.moveTo(-14, -142); ctx.quadraticCurveTo(-26, -158, -18, -168); ctx.quadraticCurveTo(-14, -154, -8, -146); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, -142); ctx.quadraticCurveTo(26, -158, 18, -168); ctx.quadraticCurveTo(14, -154, 8, -146); ctx.closePath(); ctx.fill(); ctx.stroke();
      // great sword
      ctx.save(); ctx.translate(34, -92); ctx.rotate(-0.35 + Math.sin(t * 3) * 0.06);
      ctx.fillStyle = '#4a3a26';
      rr(ctx, -4, 0, 8, 20, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c2172f';
      rr(ctx, -12, -6, 24, 6, 2); ctx.fill(); ctx.stroke();
      const sg = ctx.createLinearGradient(0, -8, 0, -110);
      sg.addColorStop(0, '#8f96a4'); sg.addColorStop(1, '#4a4f5c');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.lineTo(12, -96); ctx.lineTo(0, -112); ctx.lineTo(-12, -92); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (e.bossKind === 'ishvara') {
      const sway = Math.sin(t * 2.2);
      // tentacle mound
      ctx.fillStyle = '#5a1a2a';
      for (let i = 0; i < 7; i++) {
        const tx = -42 + i * 14;
        const th = 30 + ((i * 37) % 26);
        const ph = Math.sin(t * 3 + i) * 6;
        ctx.beginPath();
        ctx.moveTo(tx - 8, 0);
        ctx.quadraticCurveTo(tx - 10 + ph, -th * 0.6, tx + ph * 0.5, -th);
        ctx.quadraticCurveTo(tx + 10 + ph, -th * 0.6, tx + 8, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#7a2438';
      ctx.beginPath(); ctx.ellipse(0, -16, 48, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // torso
      ctx.fillStyle = '#e8d8d0';
      ctx.beginPath(); ctx.moveTo(-20, -30); ctx.quadraticCurveTo(-26, -80, 0, -92); ctx.quadraticCurveTo(26, -80, 20, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
      // many eyes on torso
      for (let i = 0; i < 4; i++) {
        this.monsterEyes(ctx, -12 + i * 8, -52 - (i % 2) * 10, 3.4, '#c2172f');
      }
      // head
      ctx.fillStyle = '#f0e2da';
      ctx.beginPath(); ctx.arc(0, -108 + sway * 3, 20, 0, TAU); ctx.fill(); ctx.stroke();
      // hair strands
      ctx.fillStyle = '#3a1a2a';
      ctx.beginPath(); ctx.moveTo(-20, -112); ctx.quadraticCurveTo(-30, -88, -22, -70); ctx.lineTo(-14, -92); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, -112); ctx.quadraticCurveTo(30, -88, 22, -70); ctx.lineTo(14, -92); ctx.closePath(); ctx.fill(); ctx.stroke();
      // eyes
      this.monsterEyes(ctx, -7, -112 + sway * 3, 5.4, '#c2172f');
      this.monsterEyes(ctx, 8, -112 + sway * 3, 5.4, '#c2172f');
      // huge mouth
      ctx.fillStyle = '#3a0510';
      ctx.beginPath(); ctx.ellipse(0, -96 + sway * 3, 10, 7 + Math.sin(t * 5) * 2.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(-8 + i * 4, -101 + sway * 3); ctx.lineTo(-6.5 + i * 4, -97 + sway * 3); ctx.lineTo(-5 + i * 4, -101 + sway * 3); ctx.closePath(); ctx.fill();
      }
      // dripping acid
      ctx.fillStyle = '#8dff9a';
      const dy = (t * 60) % 46;
      ctx.beginPath(); ctx.ellipse(-4, -88 + dy * 0.8, 2.4, 4, 0, 0, TAU); ctx.fill();
    } else {
      // vodien — faceless robe figure
      const float = Math.sin(t * 2) * 5;
      ctx.save(); ctx.translate(0, float);
      // floating shards
      for (let i = 0; i < 4; i++) {
        const a = t * 1.2 + i * 1.57;
        const px = Math.cos(a) * 52; const py = -90 + Math.sin(a * 1.4) * 30;
        ctx.fillStyle = '#2a2438';
        ctx.save(); ctx.translate(px, py); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(0, 9); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // robe
      const rg = ctx.createLinearGradient(0, -150, 0, 0);
      rg.addColorStop(0, '#f0ecf6'); rg.addColorStop(1, '#8a84a0');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.moveTo(-16, -128); ctx.quadraticCurveTo(-40, -60, -34, 0); ctx.lineTo(34, 0); ctx.quadraticCurveTo(40, -60, 16, -128); ctx.closePath(); ctx.fill(); ctx.stroke();
      // robe inner dark
      ctx.fillStyle = '#1a1626';
      ctx.beginPath(); ctx.moveTo(-10, -118); ctx.quadraticCurveTo(-20, -60, -16, 0); ctx.lineTo(16, 0); ctx.quadraticCurveTo(20, -60, 10, -118); ctx.closePath(); ctx.fill();
      // head — blank mask
      ctx.fillStyle = '#f6f2fa';
      ctx.beginPath(); ctx.arc(0, -146, 18, 0, TAU); ctx.fill(); ctx.stroke();
      // single vertical slit
      ctx.fillStyle = '#1a1020';
      ctx.fillRect(-1.6, -156, 3.2, 18);
      ctx.fillStyle = '#c2172f';
      ctx.shadowColor = '#c2172f'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, -147, 2.4, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      // black halo
      ctx.strokeStyle = '#10101a';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, -172, 22, 7, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#c2172f'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, -172, 26, 9, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.6;
      // floating hands
      for (const dir of [-1, 1]) {
        ctx.save(); ctx.translate(dir * 44, -100 + Math.sin(t * 2.6 + dir) * 8);
        ctx.fillStyle = '#f0e2da';
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 11, dir * 0.4, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  /* ---------- projectiles / fx ---------- */
  private drawProjs(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projs) {
      if (p.t > 0) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'arrow') {
        ctx.fillStyle = '#e8e4d8';
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (p.kind === 'acid') {
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
        g.addColorStop(0, '#eaffe0'); g.addColorStop(0.5, '#8dff9a'); g.addColorStop(1, 'rgba(141,255,154,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
      } else if (p.kind === 'bolt') {
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 11);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#c9b8ff'); g.addColorStop(1, 'rgba(201,184,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      } else if (p.kind === 'light') {
        ctx.fillStyle = '#ffd23c';
        this.star(ctx, 0, 0, 8, '#fff2c0');
      } else {
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 13);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#d05cff'); g.addColorStop(1, 'rgba(208,92,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawParts(ctx: CanvasRenderingContext2D): void {
    for (const p of this.parts) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'ring') {
        const r = (1 - a) * 46 + 6;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * a;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
      } else if (p.kind === 'star') {
        this.star(ctx, p.x, p.y, p.size * (0.5 + a), p.color);
      } else if (p.kind === 'poof') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a * 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, TAU); ctx.fill();
      } else if (p.kind === 'coin') {
        ctx.fillStyle = '#ffd23c';
        ctx.strokeStyle = '#8a6a10';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 0.6, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
    ctx.fill();
  }

  private drawTexts(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `800 ${t.size}px "Eczar", serif`;
      ctx.strokeStyle = 'rgba(10,6,14,0.9)';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawBanner(ctx: CanvasRenderingContext2D): void {
    if (!this.banner) return;
    const b = this.banner;
    const inT = clamp(b.t / 0.25, 0, 1);
    const outT = clamp((b.life - b.t) / 0.4, 0, 1);
    const a = Math.min(inT, outT);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,5,12,0.6)';
    ctx.fillRect(0, H * 0.3 - 46, W, 118);
    ctx.fillStyle = b.color;
    ctx.fillRect(0, H * 0.3 - 46, W, 3);
    ctx.fillRect(0, H * 0.3 + 69, W, 3);
    ctx.textAlign = 'center';
    ctx.font = '800 42px "Eczar", serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 6;
    ctx.strokeText(b.main, W / 2, H * 0.3 + 12);
    ctx.fillStyle = b.color;
    ctx.fillText(b.main, W / 2, H * 0.3 + 12);
    if (b.sub) {
      ctx.font = '700 17px "Eczar", serif';
      ctx.fillStyle = '#e8dfc8';
      ctx.fillText(b.sub, W / 2, H * 0.3 + 44);
    }
    ctx.restore();
  }

  private drawBossBar(ctx: CanvasRenderingContext2D): void {
    const boss = this.foes.find((f) => f.bossKind && f.state !== 'die');
    if (!boss) return;
    const bw = 640; const bx = W / 2 - bw / 2; const by = 26;
    ctx.fillStyle = 'rgba(8,6,12,0.85)';
    ctx.fillRect(bx - 8, by - 8, bw + 16, 34);
    ctx.strokeStyle = 'rgba(255,59,82,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx - 8, by - 8, bw + 16, 34);
    ctx.fillStyle = '#2a0d14';
    ctx.fillRect(bx, by + 12, bw, 10);
    const pct = clamp(boss.hp / boss.maxHp, 0, 1);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#ff3b52'); g.addColorStop(1, '#c2172f');
    ctx.fillStyle = g;
    ctx.fillRect(bx, by + 12, bw * pct, 10);
    ctx.font = '800 14px "Eczar", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8fa0';
    ctx.fillText(boss.name, W / 2, by + 6);
  }

  private drawWavePips(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'playing') return;
    const n = WAVES_PER_FLOOR;
    const pw = 16; const gap = 6;
    const total = n * pw + (n - 1) * gap;
    const x0 = W / 2 - total / 2; const y = 74;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (pw + gap);
      const done = i < this.wave - (this.waveActive ? 1 : 0);
      const cur = i === this.wave - 1 && this.waveActive;
      const isBoss = i === n - 1;
      ctx.save();
      if (isBoss) {
        ctx.translate(x + pw / 2, y + 4);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = done ? '#ff3b52' : cur ? '#ff9a3c' : 'rgba(255,59,82,0.25)';
        ctx.fillRect(-5, -5, 10, 10);
        if (cur) { ctx.strokeStyle = '#ffd8a1'; ctx.lineWidth = 1.5; ctx.strokeRect(-5, -5, 10, 10); }
      } else {
        ctx.fillStyle = done ? '#ffd23c' : cur ? '#ff9a3c' : 'rgba(232,223,200,0.18)';
        ctx.fillRect(x, y, pw, 7);
        if (cur) { ctx.strokeStyle = '#ffd8a1'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, pw, 7); }
      }
      ctx.restore();
    }
  }
}

/* ============================================================
   helpers shared with UI (portraits)
   ============================================================ */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr2 = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr2, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr2);
  ctx.arcTo(x + w, y + h, x, y + h, rr2);
  ctx.arcTo(x, y + h, x, y, rr2);
  ctx.arcTo(x, y, x + w, y, rr2);
  ctx.closePath();
}
function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }

export function heroCfgFor(kind: 'companion' | 'skin', id: string): HeroCfg {
  if (kind === 'companion') {
    const d = COMPANIONS.find((c) => c.id === id);
    return d ? d.cfg : KAEL_BASE;
  }
  const d = SKINS.find((s) => s.id === id);
  return d ? d.cfg : KAEL_BASE;
}

/** Draw a hero bust portrait into a small canvas (used by gacha / party UI). */
export function renderPortrait(canvas: HTMLCanvasElement, cfg: HeroCfg, size: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // background
  const g = ctx.createRadialGradient(size / 2, size * 0.42, 4, size / 2, size * 0.42, size * 0.75);
  g.addColorStop(0, '#2b2338'); g.addColorStop(1, '#120e1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  if (cfg.aura) {
    const ag = ctx.createRadialGradient(size / 2, size * 0.45, 4, size / 2, size * 0.45, size * 0.55);
    ag.addColorStop(0, cfg.aura); ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.fillRect(0, 0, size, size);
  }
  const s = size / 150;
  ctx.save();
  ctx.translate(size / 2, size * 0.98);
  ctx.scale(s * 1.32, s * 1.32);
  // reuse body drawing via a temporary engine-less call
  drawPortraitBody(ctx, cfg);
  ctx.restore();
}

function drawPortraitBody(ctx: CanvasRenderingContext2D, c: HeroCfg): void {
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#17121f';
  ctx.lineJoin = 'round';
  if (c.cape) {
    ctx.fillStyle = c.cape;
    ctx.beginPath();
    ctx.moveTo(-8, -58);
    ctx.quadraticCurveTo(-28, -30, -22, 0);
    ctx.lineTo(-6, -20);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = c.outfitDark;
  rr(ctx, -13, -26, 11, 26, 4); ctx.fill(); ctx.stroke();
  rr(ctx, 3, -26, 11, 26, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.outfit;
  ctx.beginPath();
  ctx.moveTo(-15, -58); ctx.lineTo(15, -58); ctx.lineTo(13, -24); ctx.lineTo(-13, -24);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.fillRect(-13, -32, 26, 5);
  ctx.fillStyle = c.outfit;
  rr(ctx, -20, -56, 8, 24, 4); ctx.fill(); ctx.stroke();
  rr(ctx, 12, -56, 8, 24, 4); ctx.fill(); ctx.stroke();
  const hy = -76;
  ctx.fillStyle = c.skinTone;
  ctx.beginPath(); ctx.arc(2, hy, 16, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.moveTo(-15, hy - 2);
  ctx.quadraticCurveTo(-22, hy + 8, -16, hy + 14);
  ctx.lineTo(-8, hy + 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // eyes
  const eyes = [{ x: 3, w: 5.2, h: 6.4 }, { x: 12, w: 4.2, h: 5.4 }];
  for (const e of eyes) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(e.x, hy - 1, e.w, e.h, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.ellipse(e.x + 1, hy - 0.5, e.w * 0.62, e.h * 0.66, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10101a';
    ctx.beginPath(); ctx.arc(e.x + 1.4, hy - 0.2, e.w * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(e.x - 0.4, hy - 2.6, 1.5, 0, TAU); ctx.fill();
  }
  ctx.lineWidth = 2.4;
  // front hair by style
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  switch (c.hairStyle) {
    case 'spiky':
      ctx.moveTo(-16, hy - 2);
      ctx.lineTo(-20, hy - 16); ctx.lineTo(-9, hy - 10);
      ctx.lineTo(-8, hy - 24); ctx.lineTo(0, hy - 13);
      ctx.lineTo(6, hy - 26); ctx.lineTo(10, hy - 12);
      ctx.lineTo(19, hy - 18); ctx.lineTo(17, hy - 4);
      ctx.quadraticCurveTo(18, hy - 14, 2, hy - 15);
      ctx.quadraticCurveTo(-12, hy - 15, -16, hy - 2);
      break;
    case 'bun':
      ctx.arc(2, hy - 6, 16.5, Math.PI * 0.95, Math.PI * 2.02);
      ctx.quadraticCurveTo(16, hy - 8, 15, hy - 2);
      ctx.quadraticCurveTo(8, hy - 14, -2, hy - 13);
      ctx.quadraticCurveTo(-13, hy - 12, -14, hy - 1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-8, hy - 22, 7.5, 0, TAU);
      break;
    default:
      ctx.moveTo(-16, hy - 1);
      ctx.quadraticCurveTo(-17, hy - 20, 2, hy - 20);
      ctx.quadraticCurveTo(18, hy - 19, 17, hy - 2);
      ctx.quadraticCurveTo(12, hy - 13, 0, hy - 13);
      ctx.quadraticCurveTo(-11, hy - 12, -16, hy - 1);
      break;
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (c.hairStyle === 'angel') {
    ctx.strokeStyle = '#ffd23c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(2, hy - 26, 15, 5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;
  }
}

/** Draw an item icon into a small canvas. */
export function renderItemIcon(canvas: HTMLCanvasElement, slot: 'weapon' | 'armor' | 'charm', accent: string, size: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, '#2b2338'); g.addColorStop(1, '#120e1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.strokeStyle = '#17121f';
  ctx.lineWidth = 2;
  if (slot === 'weapon') {
    ctx.rotate(-0.7);
    const bg = ctx.createLinearGradient(0, -size * 0.34, 0, size * 0.2);
    bg.addColorStop(0, '#d6dae2'); bg.addColorStop(1, '#6a7080');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-size * 0.07, -size * 0.34); ctx.lineTo(size * 0.07, -size * 0.34);
    ctx.lineTo(size * 0.09, size * 0.16); ctx.lineTo(0, size * 0.3); ctx.lineTo(-size * 0.09, size * 0.14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = accent;
    rr(ctx, -size * 0.16, size * 0.14, size * 0.32, size * 0.08, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a4630';
    rr(ctx, -size * 0.05, size * 0.22, size * 0.1, size * 0.14, 2); ctx.fill(); ctx.stroke();
  } else if (slot === 'armor') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(size * 0.26, -size * 0.18);
    ctx.lineTo(size * 0.22, size * 0.14);
    ctx.quadraticCurveTo(0, size * 0.36, -size * 0.22, size * 0.14);
    ctx.lineTo(-size * 0.26, -size * 0.18);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.24); ctx.lineTo(size * 0.16, -size * 0.15); ctx.lineTo(0, -size * 0.02); ctx.lineTo(-size * 0.16, -size * 0.15);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(size * 0.24, -size * 0.08);
    ctx.lineTo(size * 0.14, size * 0.26);
    ctx.lineTo(-size * 0.14, size * 0.26);
    ctx.lineTo(-size * 0.24, -size * 0.08);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(-size * 0.06, -size * 0.08, size * 0.06, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
