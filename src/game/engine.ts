import { sfx, initAudio, setMuted as setAudioMuted, getMuted } from './audio';
import { IMG } from '../story';

/* ============================================================
   HUYẾT KIẾM CA — IDLE ENGINE v2 (anime chibi auto-battle)
   30 boss · 20 đồng hành · gacha · lực chiến · tốc độ ×6
   ============================================================ */

const W = 1320;
const H = 640;
const GROUND = 540;
const TAU = Math.PI * 2;
const SAVE_KEY = 'huyet-kiem-idle-v2';
export const WAVES_PER_FLOOR = 8; // 7 đợt lính + đợt 8 = BOSS
export const REGULAR_WAVES = WAVES_PER_FLOOR - 1;
export const TOTAL_FLOORS = 30;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const irand = (a: number, b: number) => Math.floor(rand(a, b + 1));

const BIG = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return String(Math.floor(n));
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier - 1 >= BIG.length) return n.toExponential(2).replace('e+', 'e');
  const v = n / Math.pow(10, tier * 3);
  return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + BIG[tier - 1];
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Thường', rare: 'Hiếm', epic: 'Cực Hiếm', legendary: 'Huyền Thoại',
};
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa3b2', rare: '#3fa9ff', epic: '#c05cff', legendary: '#ffb020',
};

/* ---------------- schools & positions ---------------- */
export type SchoolId = 'kiem' | 'huyet' | 'phong' | 'hoa' | 'bang' | 'loi' | 'am' | 'quang' | 'son' | 'thiet';
export type PosId = 'front' | 'mid' | 'back' | 'far';
export const SCHOOL_INFO: Record<SchoolId, { label: string; color: string; skill: string }> = {
  kiem: { label: 'Kiếm', color: '#e8dfc8', skill: '+12% chí mạng' },
  huyet: { label: 'Huyết', color: '#ff3b52', skill: 'Hút 25% sát thương thành máu' },
  phong: { label: 'Phong', color: '#7fd4a0', skill: '25% tung đòn kép' },
  hoa: { label: 'Hỏa', color: '#ff9a3c', skill: 'Nổ lan 35% sát thương' },
  bang: { label: 'Băng', color: '#7fd4ff', skill: 'Làm chậm địch 1.5s' },
  loi: { label: 'Lôi', color: '#ffe14d', skill: 'Sét chain sang 2 mục tiêu' },
  am: { label: 'Ám', color: '#c05cff', skill: 'Gây chảy máu + hút máu nhẹ' },
  quang: { label: 'Quang', color: '#ffd23c', skill: 'Hồi máu đồng đội thấp máu nhất' },
  son: { label: 'Sơn', color: '#d9a03f', skill: '18% làm choáng 0.9s' },
  thiet: { label: 'Thiết', color: '#9aa3b2', skill: 'Phản 35% sát thương khi bị đánh' },
};
export const POS_INFO: Record<PosId, { label: string; short: string }> = {
  front: { label: 'Tiền Phong', short: 'Trước' },
  mid: { label: 'Trung Quân', short: 'Giữa' },
  back: { label: 'Hậu Quân', short: 'Sau' },
  far: { label: 'Chi Viện', short: 'Viện' },
};

/* ---------------- hero visual config ---------------- */
export interface HeroCfg {
  hair: string; outfit: string; outfitDark: string; accent: string;
  skinTone: string; eye: string;
  hairStyle: 'spiky' | 'long' | 'bun' | 'short' | 'wild' | 'angel' | 'twin';
  weapon: 'great' | 'sword' | 'bow' | 'staff' | 'dagger' | 'spear' | 'axe' | 'hammer' | 'orb' | 'scythe';
  cape?: string; aura?: string; scale: number;
}

/* ---------------- definitions ---------------- */
export interface CompanionDef {
  id: string; name: string; cls: string;
  role: 'melee' | 'ranged' | 'healer' | 'tank';
  pos: PosId; school: SchoolId;
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

/* ---------------- 19 đồng hành (+ Kael = 20) ---------------- */
export const COMPANIONS: CompanionDef[] = [
  // ----- THƯỜNG -----
  {
    id: 'lyra', name: 'Lyra', cls: 'Cung Thủ', role: 'ranged', pos: 'back', school: 'phong', rarity: 'common',
    desc: 'Thợ săn làng cháy, bắn trăm phát trăm trúng.', hp: 85, atk: 10, spd: 1.0,
    cfg: { hair: '#e8c66a', outfit: '#3f7d4e', outfitDark: '#2a5636', accent: '#a8e06a', skinTone: '#f6dcc0', eye: '#2f9e5f', hairStyle: 'long', weapon: 'bow', scale: 0.96 },
  },
  {
    id: 'finn', name: 'Finn', cls: 'Kiếm Sĩ Tập Sự', role: 'melee', pos: 'mid', school: 'kiem', rarity: 'common',
    desc: 'Cậu nhóc ôm mộng anh hùng, chém chưa trúng nhưng rất nhiệt tình.', hp: 110, atk: 9, spd: 1.0,
    cfg: { hair: '#7a5a3a', outfit: '#5a7a9a', outfitDark: '#3d566e', accent: '#ffd23c', skinTone: '#f2d5b8', eye: '#5a8ad9', hairStyle: 'short', weapon: 'sword', scale: 0.9 },
  },
  {
    id: 'mila', name: 'Mila', cls: 'Pháp Sư Học Việc', role: 'ranged', pos: 'back', school: 'hoa', rarity: 'common',
    desc: 'Ném cầu lửa to hơn cả người mình.', hp: 80, atk: 11, spd: 0.9,
    cfg: { hair: '#e07050', outfit: '#a04a2a', outfitDark: '#6e3018', accent: '#ff9a3c', skinTone: '#f6dcc0', eye: '#e07050', hairStyle: 'twin', weapon: 'staff', scale: 0.9 },
  },
  {
    id: 'bo', name: 'Bo', cls: 'Vệ Binh Mũm Mĩm', role: 'tank', pos: 'front', school: 'thiet', rarity: 'common',
    desc: 'Bụng bự đỡ đòn cực tốt, cười hiền như đất.', hp: 240, atk: 7, spd: 0.75,
    cfg: { hair: '#3a3a44', outfit: '#7a8a56', outfitDark: '#525e38', accent: '#d9a03f', skinTone: '#e8bf9a', eye: '#5a6a3a', hairStyle: 'short', weapon: 'hammer', scale: 1.12 },
  },
  {
    id: 'nia', name: 'Nia', cls: 'Tiểu Vu Nữ', role: 'healer', pos: 'far', school: 'quang', rarity: 'common',
    desc: 'Cô bé chữa lành bằng ánh trăng non.', hp: 90, atk: 9, spd: 0.7,
    cfg: { hair: '#d8e8f6', outfit: '#e8ecf6', outfitDark: '#b9c2da', accent: '#7fd4ff', skinTone: '#fbe8d8', eye: '#4aa8e0', hairStyle: 'bun', weapon: 'staff', scale: 0.88 },
  },
  // ----- HIẾM -----
  {
    id: 'bram', name: 'Bram', cls: 'Đại Kiếm Sĩ', role: 'tank', pos: 'front', school: 'son', rarity: 'rare',
    desc: 'Lính đánh thuê khổng lồ, lấy thân mình che đồng đội.', hp: 300, atk: 12, spd: 0.8,
    cfg: { hair: '#8a4a2a', outfit: '#7a5230', outfitDark: '#4e341d', accent: '#d9a03f', skinTone: '#e8bf9a', eye: '#a05a20', hairStyle: 'wild', weapon: 'great', scale: 1.16 },
  },
  {
    id: 'yuki', name: 'Yuki', cls: 'Vu Nữ Trăng', role: 'healer', pos: 'far', school: 'quang', rarity: 'rare',
    desc: 'Vu nữ cuối cùng của đền trăng, chữa lành mọi vết thương.', hp: 105, atk: 12, spd: 0.75,
    cfg: { hair: '#f4f2fa', outfit: '#e8ecf6', outfitDark: '#b9c2da', accent: '#7fd4ff', skinTone: '#fbe8d8', eye: '#4aa8e0', hairStyle: 'bun', weapon: 'staff', scale: 0.94 },
  },
  {
    id: 'rex', name: 'Rex', cls: 'Song Kiếm', role: 'melee', pos: 'mid', school: 'phong', rarity: 'rare',
    desc: 'Hai thanh đoản kiếm, một cơn lốc.', hp: 125, atk: 14, spd: 1.35,
    cfg: { hair: '#2a4a6a', outfit: '#3a5a7a', outfitDark: '#243a52', accent: '#7fd4a0', skinTone: '#f2d5b8', eye: '#3fa9ff', hairStyle: 'spiky', weapon: 'dagger', scale: 0.98 },
  },
  {
    id: 'tara', name: 'Tara', cls: 'Cung Băng', role: 'ranged', pos: 'back', school: 'bang', rarity: 'rare',
    desc: 'Mũi tên băng xuyên qua cả cơn gió.', hp: 95, atk: 14, spd: 1.0,
    cfg: { hair: '#a8d8f0', outfit: '#4a7a9a', outfitDark: '#315268', accent: '#7fd4ff', skinTone: '#fbe8d8', eye: '#4aa8e0', hairStyle: 'long', weapon: 'bow', scale: 0.96 },
  },
  {
    id: 'orin', name: 'Orin', cls: 'Lôi Đồng', role: 'ranged', pos: 'back', school: 'loi', rarity: 'rare',
    desc: 'Thằng nhóc bị sét đánh... ba lần mà vẫn sống.', hp: 92, atk: 15, spd: 1.05,
    cfg: { hair: '#f0e05a', outfit: '#5a5a2a', outfitDark: '#3c3c1a', accent: '#ffe14d', skinTone: '#f2d5b8', eye: '#d9b400', hairStyle: 'spiky', weapon: 'orb', scale: 0.9 },
  },
  {
    id: 'hex', name: 'Hex', cls: 'Quỷ Đồng Ám', role: 'melee', pos: 'mid', school: 'am', rarity: 'rare',
    desc: 'Nửa người nửa bóng tối, cắn trộm cực đau.', hp: 115, atk: 16, spd: 1.3,
    cfg: { hair: '#4a2a5a', outfit: '#3a2448', outfitDark: '#241630', accent: '#c05cff', skinTone: '#e8d0e0', eye: '#c05cff', hairStyle: 'wild', weapon: 'scythe', scale: 0.92 },
  },
  // ----- CỰC HIẾM -----
  {
    id: 'mira', name: 'Mira', cls: 'Phù Thủy Lửa', role: 'ranged', pos: 'back', school: 'hoa', rarity: 'epic',
    desc: 'Phù thủy lưu vong, niệm chú bằng ngọn lửa tím.', hp: 115, atk: 24, spd: 0.95,
    cfg: { hair: '#9a4ae0', outfit: '#4a2a7a', outfitDark: '#2f1a52', accent: '#d05cff', skinTone: '#f2d8c4', eye: '#b44ae0', hairStyle: 'long', weapon: 'staff', aura: 'rgba(192,92,255,0.4)', scale: 0.98 },
  },
  {
    id: 'kuro', name: 'Kuro', cls: 'Sát Thủ Bóng Đêm', role: 'melee', pos: 'mid', school: 'am', rarity: 'epic',
    desc: 'Bóng đen không tên, ra đòn nhanh hơn cả ánh trăng.', hp: 125, atk: 28, spd: 1.6,
    cfg: { hair: '#2a2438', outfit: '#232030', outfitDark: '#141220', accent: '#c05cff', skinTone: '#ead2bc', eye: '#c05cff', hairStyle: 'spiky', weapon: 'dagger', cape: '#1a1526', aura: 'rgba(192,92,255,0.35)', scale: 0.98 },
  },
  {
    id: 'goro', name: 'Goro', cls: 'Thiết Chùy', role: 'tank', pos: 'front', school: 'son', rarity: 'epic',
    desc: 'Núi biết đi. Búa của hắn nện vỡ cả cổng thành.', hp: 380, atk: 18, spd: 0.7,
    cfg: { hair: '#5a5a64', outfit: '#565e6e', outfitDark: '#383e4c', accent: '#d9a03f', skinTone: '#e8bf9a', eye: '#8a6a30', hairStyle: 'wild', weapon: 'hammer', scale: 1.2 },
  },
  {
    id: 'sable', name: 'Sable', cls: 'Huyết Pháp Sư', role: 'ranged', pos: 'back', school: 'am', rarity: 'epic',
    desc: 'Đọc cấm chú bằng chính máu của kẻ địch.', hp: 110, atk: 26, spd: 1.0,
    cfg: { hair: '#3a1020', outfit: '#4a1228', outfitDark: '#2c0a18', accent: '#ff3b52', skinTone: '#e8d0c4', eye: '#e11d2e', hairStyle: 'long', weapon: 'orb', cape: '#2c0a18', aura: 'rgba(255,59,82,0.35)', scale: 0.98 },
  },
  {
    id: 'wren', name: 'Wren', cls: 'Lôi Pháp Sư', role: 'ranged', pos: 'back', school: 'loi', rarity: 'epic',
    desc: 'Cả bầu trời sấm sét nằm gọn trong lòng bàn tay.', hp: 112, atk: 25, spd: 1.05,
    cfg: { hair: '#e8e050', outfit: '#4a4a20', outfitDark: '#303014', accent: '#ffe14d', skinTone: '#f2d5b8', eye: '#d9b400', hairStyle: 'short', weapon: 'staff', aura: 'rgba(255,225,77,0.35)', scale: 0.98 },
  },
  // ----- HUYỀN THOẠI -----
  {
    id: 'seraph', name: 'Seraphina', cls: 'Thiên Sứ', role: 'ranged', pos: 'back', school: 'quang', rarity: 'legendary',
    desc: 'Thiên sứ sa ngã, ánh sáng của nàng thiêu rụi bóng tối.', hp: 180, atk: 36, spd: 1.15,
    cfg: { hair: '#ffe9a8', outfit: '#f6f0dc', outfitDark: '#d4c8a4', accent: '#ffb020', skinTone: '#fbe9d2', eye: '#e8a020', hairStyle: 'angel', weapon: 'spear', aura: 'rgba(255,210,90,0.5)', scale: 1.02 },
  },
  {
    id: 'varg', name: 'Varg', cls: 'Cuồng Chiến Huyết', role: 'melee', pos: 'mid', school: 'huyet', rarity: 'legendary',
    desc: 'Càng chảy máu càng mạnh — chiến thần của bộ tộc sói.', hp: 220, atk: 38, spd: 1.4,
    cfg: { hair: '#c9c2b2', outfit: '#5c0e1e', outfitDark: '#3a0812', accent: '#ff3b52', skinTone: '#e8bf9a', eye: '#ff2233', hairStyle: 'wild', weapon: 'axe', cape: '#3a0812', aura: 'rgba(255,59,82,0.45)', scale: 1.1 },
  },
  {
    id: 'zephyr', name: 'Zephyr', cls: 'Phong Thần Xạ', role: 'ranged', pos: 'back', school: 'phong', rarity: 'legendary',
    desc: 'Bắn ba mũi tên trước khi gió kịp tới.', hp: 165, atk: 34, spd: 1.3,
    cfg: { hair: '#a8f0d0', outfit: '#2a6a52', outfitDark: '#1a4636', accent: '#7fd4a0', skinTone: '#f6dcc0', eye: '#2f9e5f', hairStyle: 'long', weapon: 'bow', aura: 'rgba(127,212,160,0.4)', scale: 1.0 },
  },
];

export const ITEMS: ItemDef[] = [
  { id: 'w1', name: 'Kiếm Sắt Gai', slot: 'weapon', rarity: 'rare', desc: '+90 Công kích', atk: 90, hp: 0, crit: 0, goldBonus: 0 },
  { id: 'w2', name: 'Lưỡi Quỷ Huyết', slot: 'weapon', rarity: 'epic', desc: '+190 Công kích', atk: 190, hp: 0, crit: 0, goldBonus: 0 },
  { id: 'w3', name: 'Trảm Long Chân Giải', slot: 'weapon', rarity: 'legendary', desc: '+360 Công, +10% Chí mạng', atk: 360, hp: 0, crit: 10, goldBonus: 0 },
  { id: 'a1', name: 'Giáp Da Sói', slot: 'armor', rarity: 'rare', desc: '+900 Máu', atk: 0, hp: 900, crit: 0, goldBonus: 0 },
  { id: 'a2', name: 'Giáp Xương Rồng', slot: 'armor', rarity: 'epic', desc: '+1900 Máu', atk: 0, hp: 1900, crit: 0, goldBonus: 0 },
  { id: 'a3', name: 'Vảy Hắc Long', slot: 'armor', rarity: 'legendary', desc: '+3600 Máu', atk: 0, hp: 3600, crit: 0, goldBonus: 0 },
  { id: 'c1', name: 'Bùa Máu', slot: 'charm', rarity: 'rare', desc: '+8% Chí mạng', atk: 0, hp: 0, crit: 8, goldBonus: 0 },
  { id: 'c2', name: 'Nhẫn Hút Hồn', slot: 'charm', rarity: 'epic', desc: '+25% Vàng nhận được', atk: 0, hp: 0, crit: 0, goldBonus: 25 },
  { id: 'c3', name: 'Mắt Quỷ', slot: 'charm', rarity: 'legendary', desc: '+120 Công, +15% Chí mạng', atk: 120, hp: 0, crit: 15, goldBonus: 0 },
];

interface PoolEntry { kind: 'companion' | 'skin' | 'item'; id: string; rarity: Rarity; weight: number; }
const COMP_W: Record<Rarity, number> = { common: 13, rare: 9, epic: 5.5, legendary: 2.4 };
const POOL: PoolEntry[] = [
  ...COMPANIONS.map((c) => ({ kind: 'companion' as const, id: c.id, rarity: c.rarity, weight: COMP_W[c.rarity] })),
  { kind: 'skin', id: 'silver', rarity: 'rare', weight: 7 },
  { kind: 'skin', id: 'crimson', rarity: 'epic', weight: 5 },
  { kind: 'skin', id: 'dragon', rarity: 'legendary', weight: 2.2 },
  { kind: 'item', id: 'w1', rarity: 'rare', weight: 5 },
  { kind: 'item', id: 'a1', rarity: 'rare', weight: 5 },
  { kind: 'item', id: 'c1', rarity: 'rare', weight: 5 },
  { kind: 'item', id: 'w2', rarity: 'epic', weight: 3.6 },
  { kind: 'item', id: 'a2', rarity: 'epic', weight: 3.6 },
  { kind: 'item', id: 'c2', rarity: 'epic', weight: 3.6 },
  { kind: 'item', id: 'w3', rarity: 'legendary', weight: 1.5 },
  { kind: 'item', id: 'a3', rarity: 'legendary', weight: 1.5 },
  { kind: 'item', id: 'c3', rarity: 'legendary', weight: 1.5 },
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
  slime: { hp: 1, atk: 0.8, spd: 0.8, speed: 155, gold: 1, name: 'Slime' },
  bat: { hp: 0.7, atk: 0.7, spd: 1.2, speed: 265, gold: 0.9, name: 'Dơi Máu' },
  skeleton: { hp: 1.4, atk: 1.1, spd: 0.9, speed: 120, gold: 1.3, name: 'Cốt Binh' },
  imp: { hp: 1.1, atk: 1.3, spd: 1.05, speed: 185, gold: 1.4, name: 'Tiểu Quỷ' },
  wisp: { hp: 0.8, atk: 1.2, spd: 1.3, speed: 220, gold: 1.2, name: 'Ma Trơi' },
  brute: { hp: 2.6, atk: 1.6, spd: 0.6, speed: 95, gold: 2.2, name: 'Quỷ Khổng Lồ' },
};
const FLOOR_FOES: FoeType[][] = [
  ['slime', 'bat', 'skeleton'],
  ['skeleton', 'imp', 'slime', 'bat'],
  ['imp', 'wisp', 'brute'],
];

export const FLOOR_NAMES = [
  'Cổng Xương', 'Hầm Máu', 'Điện Thực Nhật', 'Rừng Gai Đen', 'Sông Than Thở',
  'Hang Nhện Chúa', 'Điện Gương Vỡ', 'Lò Rèn Tội Lỗi', 'Vườn Máu Trắng', 'Thư Viện Câm',
  'Mộ Gió', 'Hành Lang Răng', 'Giếng Sâu', 'Thành Ngầm Chìm', 'Đền Quên Lãng',
  'Chợ Quỷ', 'Hầm Rượu Máu', 'Cầu Xương Sống', 'Ngục Băng Đen', 'Tháp Ngược',
  'Biển Tro', 'Ruột Thú', 'Đền Nhật Thực', 'Cửa Bạch Cốt', 'Rãnh Sét',
  'Phòng Gương Mù', 'Điện Đồng Hồ Chết', 'Thang Vô Tận', 'Cổng Cuối', 'Ngai Huyết Nhật',
];
const FLOOR_IMGS = [IMG.floor1, IMG.floor2, IMG.floor3];
export function floorImg(idx: number): string { return FLOOR_IMGS[idx % 3]; }

/* ---------------- 30 boss ---------------- */
export type BossArch = 'charger' | 'spitter' | 'trickster' | 'warlock' | 'titan';
export interface BossDef {
  name: string; title: string; arch: BossArch;
  hpMul: number; atkMul: number; spd: number; scale: number;
  armor: string; armorDark: string; accent: string; eye: string;
  cape?: string; wings?: boolean; mask?: boolean;
}
const B = (name: string, title: string, arch: BossArch, i: number, armor: string, armorDark: string, accent: string, eye: string, extra?: Partial<BossDef>): BossDef => ({
  name, title, arch,
  hpMul: 12 + i * 0.5, atkMul: 1.9 + i * 0.05, spd: arch === 'titan' ? 0.5 : 0.62,
  scale: 2.0 + (i % 5) * 0.12 + (i === 29 ? 0.7 : 0),
  armor, armorDark, accent, eye, ...extra,
});
export const BOSSES: BossDef[] = [
  B('MORGRIM', 'Kị Sĩ Phản Thệ', 'charger', 0, '#5a6272', '#333844', '#c2172f', '#ff5a20', { cape: '#5c0e1e' }),
  B('ISHVARA', 'Sứ Đồ Đói Khát', 'spitter', 1, '#7a2438', '#4a1220', '#8dff9a', '#c2172f', { cape: '#3a1a2a' }),
  B('VÔ DIỆN THẦN', 'Bàn Tay Trái', 'trickster', 2, '#f0ecf6', '#8a84a0', '#c2172f', '#c2172f', { mask: true }),
  B('HUYẾT HẦU TƯỚC', 'Bá Tước Đêm', 'warlock', 3, '#4a1228', '#2c0a18', '#ff3b52', '#ff3b52', { cape: '#2c0a18', wings: true }),
  B('CỐT ĐẾ', 'Vua Xương', 'titan', 4, '#c9c2b2', '#8f887a', '#d9a03f', '#ff3b52'),
  B('ĐỘC NHA', 'Xà Chúa Ngàn Nanh', 'spitter', 5, '#2a6a3a', '#183f22', '#8dff9a', '#ffe14d'),
  B('ẢNH CHỦ', 'Chúa Tể Bóng Ma', 'trickster', 6, '#3a3550', '#221f33', '#c9b8ff', '#c9b8ff', { mask: true, cape: '#221f33' }),
  B('LÔI NGỤC', 'Tướng Quân Sét Đỏ', 'charger', 7, '#6a5a20', '#453b12', '#ffe14d', '#ffe14d'),
  B('THỰC MỘNG', 'Kẻ Ăn Giấc Mơ', 'warlock', 8, '#4a2a6a', '#2d1a42', '#d05cff', '#d05cff', { wings: true }),
  B('ĐOẠN ĐẦU ĐÀI', 'Đao Phủ Không Đầu', 'charger', 9, '#4a4f5c', '#2c303a', '#ff9a3c', '#ff9a3c', { cape: '#3a0812' }),
  B('GIÁP TRÙNG', 'Pháo Đài Sống', 'titan', 10, '#56604a', '#363e2e', '#a8e06a', '#ff5a20'),
  B('DẠ XOA', 'Nữ Hoàng Đêm Trắng', 'trickster', 11, '#e8ecf6', '#9aa4c0', '#7fd4ff', '#4aa8e0', { mask: true }),
  B('VIÊM MA', 'Trái Tim Lò Luyện', 'spitter', 12, '#6a2a12', '#421a0a', '#ff9a3c', '#ff5a20'),
  B('KHÔ CỐT VƯƠNG', 'Chúa Sa Mạc Chết', 'warlock', 13, '#b0a080', '#7a6e52', '#d9a03f', '#ffe14d'),
  B('BĂNG QUAN', 'Lãnh Chúa Tuyết Đen', 'spitter', 14, '#6a8aa0', '#42596b', '#7fd4ff', '#7fd4ff', { cape: '#223544' }),
  B('THIẾT TRƯ', 'Heo Rừng Sắt Nung', 'charger', 15, '#6e5646', '#453629', '#d9a03f', '#ff3b52'),
  B('U MINH NGƯ', 'Cá Vực Thẳm', 'titan', 16, '#2a4a5a', '#182e3a', '#7fd4ff', '#8dff9a'),
  B('HUYẾT NGUYỆT', 'Sói Chúa Trăng Máu', 'charger', 17, '#5c0e1e', '#3a0812', '#ff3b52', '#ffd23c', { cape: '#3a0812' }),
  B('CỔ ĐỘC MẪU', 'Mẹ Trăm Độc', 'spitter', 18, '#4a2a5a', '#2d1a38', '#c05cff', '#8dff9a'),
  B('VONG LINH ĐẾ', 'Hoàng Đế Tro Tàn', 'warlock', 19, '#5a5a64', '#38383f', '#c9b8ff', '#c2172f', { cape: '#22222a', wings: true }),
  B('SONG DIỆN', 'Kẻ Hai Mặt', 'trickster', 20, '#d8d2c4', '#8f887a', '#c2172f', '#c2172f', { mask: true }),
  B('PHÁ THÀNH CHÙY', 'Cỗ Máy Thịt', 'titan', 21, '#7a5230', '#4e341d', '#d9a03f', '#ff5a20'),
  B('TẬT PHONG QUỶ', 'Cơn Gió Cắt', 'charger', 22, '#3a6a5a', '#22423a', '#7fd4a0', '#7fd4a0'),
  B('HỎA NGỤC TRƯỞNG', 'Cai Ngục Lửa', 'spitter', 23, '#7a2412', '#4a1508', '#ff9a3c', '#ffe14d'),
  B('BẠCH CỐT TIÊN', 'Tiên Xương', 'warlock', 24, '#e8e2d4', '#a89f8c', '#7fd4ff', '#4aa8e0', { wings: true }),
  B('HẮC NHẬT', 'Mặt Trời Đen', 'titan', 25, '#22202c', '#121019', '#ffb020', '#ffb020', { wings: true }),
  B('SÁT LỤC HẦU', 'Hầu Tước Chiến Tranh', 'charger', 26, '#7a1225', '#4b0a16', '#ff3b52', '#ff5a20', { cape: '#43091a' }),
  B('ÁM ẢNH', 'Nỗi Sợ Vô Hình', 'trickster', 27, '#2a2438', '#171325', '#c05cff', '#c05cff', { mask: true }),
  B('THẨM PHÁN', 'Quan Tòa Địa Ngục', 'warlock', 28, '#333844', '#1f232c', '#ffd23c', '#ff3b52', { cape: '#1f232c' }),
  B('HUYẾT NHẬT ĐẾ', 'Chúa Tể Hầm Ngục', 'titan', 29, '#4a0d18', '#2a060e', '#ff3b52', '#ffd23c', { cape: '#2a060e', wings: true }),
];

/* ---------------- runtime types ---------------- */
interface Fighter {
  uid: string; defId: string; name: string; cls: string; role: string;
  pos: PosId; school: SchoolId;
  rarity: Rarity; level: number; isKael: boolean; cfg: HeroCfg;
  maxHp: number; hp: number; atk: number; spd: number; crit: number;
  x: number; homeX: number; state: 'idle' | 'dash' | 'strike' | 'return' | 'cast' | 'dead';
  stateT: number; cd: number; target: number; reviveT: number; flashT: number;
  attackAnim: number; animT: number; buffT: number;
}
interface Foe {
  uid: number; type: FoeType | 'boss'; bossIdx?: number;
  name: string; hp: number; maxHp: number; atk: number; spd: number; speed: number;
  gold: number; x: number; scale: number; state: 'walk' | 'fight' | 'tele' | 'die';
  t: number; cd: number; flashT: number; animT: number;
  specialT: number; specialPhase: number; returnX: number;
  slowT: number; stunT: number; bleedDps: number; bleedT: number;
}
interface Proj { x: number; y: number; target: number | string; speed: number; dmg: number; kind: 'arrow' | 'magic' | 'light' | 'acid' | 'bolt' | 'ice' | 'blood'; t: number; splash: number; crit: number; school?: SchoolId; from?: string; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; grav: number; kind: 'spark' | 'blood' | 'soul' | 'coin' | 'star' | 'poof' | 'ring'; }
interface FloatText { x: number; y: number; text: string; color: string; life: number; maxLife: number; size: number; vy: number; }
interface Zap { x1: number; y1: number; x2: number; y2: number; t: number; color: string; }

export interface PartyView {
  id: string; name: string; cls: string; role: string; pos: PosId; school: SchoolId;
  rarity: Rarity; level: number; hpPct: number; atk: number; maxHp: number;
  active: boolean; isKael: boolean; upgradeCost: number; skinId?: string; power: number;
}
export interface HudSnapshot {
  gold: number; gems: number; floor: number; floorName: string; wave: number;
  wavesPerFloor: number; inBoss: boolean; bossName: string; bossHpPct: number;
  kills: number; speed: number; muted: boolean; party: PartyView[]; pity: number;
  totalDmg: number; power: number; bossIdx: number;
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

  private gold = 1200;
  private gems = 1500;
  private floor = 0;
  private wave = 0;
  private kills = 0;
  private totalDmg = 0;
  private playTime = 0;
  private speed = 1;
  private kaelLevel = 1;

  private ownedCompanions: Record<string, number> = {};
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
  private zaps: Zap[] = [];
  private pending: { t: number; type: FoeType }[] = [];

  private globalT = 0;
  private scrollX = 0;
  private waveDelay = 0.8;
  private bossActive = false;
  private banner: { main: string; sub: string; t: number; life: number; color: string } | null = null;
  private shake = 0;
  private flash = 0;
  private flashColor = '#ffffff';
  private slowmo = 0;
  private hudT = 0;
  private saveT = 0;
  private uidSeq = 1;

  private bgImgs: Record<string, HTMLImageElement> = {};
  private bgLoaded: Record<string, boolean> = {};

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
    [IMG.title, IMG.floor1, IMG.floor2, IMG.floor3].forEach((u) => {
      const im = new Image();
      im.onload = () => { this.bgLoaded[u] = true; };
      im.src = u;
      this.bgImgs[u] = im;
    });
  }

  /* ---------------- persistence ---------------- */
  private save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 2, gold: this.gold, gems: this.gems, floor: this.floor, wave: this.wave,
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
  hasSave(): boolean {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
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
  upgradeCost(level: number): number { return Math.round(200 * Math.pow(level, 1.55)); }

  private estPower(defId: string, isKael: boolean, level: number): number {
    const g = this.growth(level);
    if (isKael) return Math.round((15 * g + this.itemBonus().atk) * 10 + 150 * g + this.itemBonus().hp);
    const def = COMPANIONS.find((c) => c.id === defId);
    if (!def) return 0;
    return Math.round(def.atk * g * 10 + def.hp * g);
  }

  /** Chọn 5 đồng đội mạnh nhất theo đội hình: 2 trước / 1 giữa / 1 sau / 1 viện. */
  private activePartyDefs(): { defId: string; isKael: boolean; level: number; pos: PosId; school: SchoolId }[] {
    type Cand = { defId: string; isKael: boolean; level: number; pos: PosId; school: SchoolId; power: number };
    const cands: Cand[] = [{
      defId: 'kael', isKael: true, level: this.kaelLevel, pos: 'front', school: 'kiem',
      power: this.estPower('kael', true, this.kaelLevel) * 1.001,
    }];
    Object.keys(this.ownedCompanions).forEach((id) => {
      const def = COMPANIONS.find((c) => c.id === id);
      if (!def) return;
      cands.push({ defId: id, isKael: false, level: this.ownedCompanions[id], pos: def.pos, school: def.school, power: this.estPower(id, false, this.ownedCompanions[id]) });
    });
    cands.sort((a, b) => b.power - a.power);
    const quota: Record<PosId, number> = { front: 2, mid: 1, back: 1, far: 1 };
    const picked: Cand[] = [];
    for (const c of cands) {
      if (picked.length >= 5) break;
      if (quota[c.pos] > 0) { quota[c.pos] -= 1; picked.push(c); }
    }
    for (const c of cands) {
      if (picked.length >= 5) break;
      if (!picked.includes(c)) picked.push(c);
    }
    // sắp xếp: trước → viện
    const order: PosId[] = ['front', 'mid', 'back', 'far'];
    picked.sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos));
    return picked;
  }

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

  private homeForPos(pos: PosId, idxInPos: number): number {
    const base: Record<PosId, number> = { front: 470, mid: 360, back: 295, far: 235 };
    return base[pos] - idxInPos * 58;
  }

  private rebuildParty(): void {
    const defs = this.activePartyDefs();
    const bonus = this.itemBonus();
    const oldHp: Record<string, number> = {};
    this.fighters.forEach((f) => { oldHp[f.uid] = f.hp / f.maxHp; });
    const posCount: Record<PosId, number> = { front: 0, mid: 0, back: 0, far: 0 };
    this.fighters = defs.map((d) => {
      const isKael = d.isKael;
      const def = isKael ? null : COMPANIONS.find((c) => c.id === d.defId);
      const level = isKael ? this.kaelLevel : d.level;
      const g = this.growth(level);
      let maxHp: number, atk: number, spd: number, crit = 8;
      let cfg: HeroCfg; let name: string; let cls: string; let role: string; let rarity: Rarity;
      if (isKael) {
        maxHp = 150 * g + bonus.hp; atk = 15 * g + bonus.atk; spd = Math.min(1.7, 1.1 + level * 0.01);
        crit += 12 + bonus.crit; cfg = this.kaelSkinCfg(); name = 'Kael'; cls = 'Hắc Kiếm Sĩ'; role = 'melee'; rarity = 'legendary';
      } else if (def) {
        maxHp = def.hp * g; atk = def.atk * g; spd = Math.min(2.2, def.spd + level * 0.01);
        if (def.school === 'kiem') crit += 12;
        cfg = def.cfg; name = def.name; cls = def.cls; role = def.role; rarity = def.rarity;
      } else { maxHp = 10; atk = 1; spd = 1; cfg = KAEL_BASE; name = '?'; cls = '?'; role = 'melee'; rarity = 'common'; }
      const uid = isKael ? 'kael' : d.defId;
      const prev = oldHp[uid];
      const homeX = this.homeForPos(d.pos, posCount[d.pos]);
      posCount[d.pos] += 1;
      return {
        uid, defId: d.defId, name, cls, role, pos: d.pos, school: d.school, rarity, level, isKael, cfg,
        maxHp: Math.round(maxHp), hp: Math.round(maxHp * (prev ?? 1)), atk, spd, crit,
        x: homeX, homeX, state: 'idle' as const, stateT: 0, cd: rand(0.05, 0.4),
        target: -1, reviveT: 0, flashT: 0, attackAnim: -1, animT: rand(0, 10), buffT: 0,
      };
    });
  }

  teamPower(): number {
    return this.fighters.reduce((s, f) => s + Math.round(f.atk * 10 + f.maxHp), 0);
  }

  /* ---------------- public API ---------------- */
  startGame(): void {
    initAudio();
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
    this.foes = []; this.projs = []; this.pending = []; this.zaps = [];
    this.bossActive = false;
    this.waveDelay = first ? 0.8 : 1.1;
    this.fighters.forEach((f) => { f.hp = f.maxHp; f.state = 'idle'; f.x = f.homeX; });
    const name = FLOOR_NAMES[idx];
    const boss = BOSSES[idx];
    this.banner = {
      main: `TẦNG ${idx + 1}/30 — ${name.toUpperCase()}`,
      sub: `Boss canh giữ: ${boss.name}`, t: 0, life: 2.4, color: '#ff9a3c',
    };
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
      const def = COMPANIONS.find((c) => c.id === e.id);
      if (this.ownedCompanions[e.id] === undefined) {
        this.ownedCompanions[e.id] = 1;
        this.rebuildParty();
        return { kind: 'companion', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: true, note: 'Đồng hành mới gia nhập!' };
      }
      this.ownedCompanions[e.id] += 2;
      this.rebuildParty();
      return { kind: 'companion', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: false, note: 'Trùng lặp → +2 cấp' };
    }
    if (e.kind === 'skin') {
      if (!this.ownedSkins.includes(e.id)) {
        this.ownedSkins.push(e.id);
        const def = SKINS.find((s) => s.id === e.id);
        return { kind: 'skin', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: true, note: 'Skin mới cho Kael!' };
      }
      this.gems += 200;
      return { kind: 'skin', id: e.id, name: SKINS.find((s) => s.id === e.id)?.name ?? e.id, rarity: e.rarity, isNew: false, note: 'Trùng lặp → +200 Ngọc' };
    }
    if (!this.ownedItems.includes(e.id)) {
      this.ownedItems.push(e.id);
      const def = ITEMS.find((i) => i.id === e.id);
      if (def && !this.equippedItems[def.slot]) this.equippedItems[def.slot] = e.id;
      return { kind: 'item', id: e.id, name: def?.name ?? e.id, rarity: e.rarity, isNew: true, note: 'Vật phẩm mới!' };
    }
    this.gems += 150;
    return { kind: 'item', id: e.id, name: ITEMS.find((i) => i.id === e.id)?.name ?? e.id, rarity: e.rarity, isNew: false, note: 'Trùng lặp → +150 Ngọc' };
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
      id: 'kael', name: 'Kael', cls: 'Hắc Kiếm Sĩ', role: 'melee', pos: 'front', school: 'kiem', rarity: 'legendary',
      level: this.kaelLevel, hpPct: 1, atk: Math.round(15 * this.growth(this.kaelLevel) + this.itemBonus().atk),
      maxHp: Math.round(150 * this.growth(this.kaelLevel) + this.itemBonus().hp),
      active: activeIds.has('kael'), isKael: true, upgradeCost: this.upgradeCost(this.kaelLevel),
      skinId: this.equippedSkin, power: this.estPower('kael', true, this.kaelLevel),
    });
    COMPANIONS.forEach((def) => {
      const lv = this.ownedCompanions[def.id];
      if (lv === undefined) return;
      const f = this.fighters.find((x) => x.uid === def.id);
      out.push({
        id: def.id, name: def.name, cls: def.cls, role: def.role, pos: def.pos, school: def.school,
        rarity: def.rarity, level: lv,
        hpPct: f ? f.hp / f.maxHp : 1, atk: Math.round(def.atk * this.growth(lv)),
        maxHp: Math.round(def.hp * this.growth(lv)), active: activeIds.has(def.id), isKael: false,
        upgradeCost: this.upgradeCost(lv), power: this.estPower(def.id, false, lv),
      });
    });
    return out;
  }

  private pushHud(): void {
    const boss = this.foes.find((f) => f.bossIdx !== undefined);
    this.cb.onHud({
      gold: Math.floor(this.gold), gems: Math.floor(this.gems),
      floor: this.floor, floorName: FLOOR_NAMES[this.floor],
      wave: Math.min(this.wave, REGULAR_WAVES), wavesPerFloor: REGULAR_WAVES,
      inBoss: this.bossActive, bossName: boss ? `${BOSSES[boss.bossIdx ?? 0].name} — ${BOSSES[boss.bossIdx ?? 0].title}` : '',
      bossHpPct: boss ? clamp(boss.hp / boss.maxHp, 0, 1) : 0,
      kills: this.kills, speed: this.speed, muted: getMuted(),
      party: this.getPartyView(), pity: this.pity, totalDmg: Math.round(this.totalDmg),
      power: this.teamPower(), bossIdx: this.floor,
    });
  }

  /* ---------------- waves ---------------- */
  private globalWave(): number { return this.floor * WAVES_PER_FLOOR + this.wave; }
  private combatBusy(): boolean { return this.foes.some((f) => f.state !== 'die') || this.pending.length > 0; }

  private spawnWave(): void {
    this.wave += 1;
    if (this.wave >= WAVES_PER_FLOOR) {
      this.spawnBoss();
      return;
    }
    const count = clamp(3 + Math.floor(this.floor / 6) + Math.floor(this.wave / 3), 3, 7);
    const types = FLOOR_FOES[this.floor % 3];
    for (let i = 0; i < count; i++) {
      const type = types[irand(0, types.length - 1)];
      this.pending.push({ t: i * 0.28, type });
    }
    this.banner = { main: `ĐỢT ${this.wave}/${REGULAR_WAVES}`, sub: '', t: 0, life: 1.1, color: '#e8dfc8' };
  }
  private foeHpBase(): number { return 160 * Math.pow(1.115, this.globalWave() - 1); }
  private foeAtkBase(): number { return 50 * Math.pow(1.095, this.globalWave() - 1); }

  private spawnFoe(type: FoeType): void {
    const st = FOE_STATS[type];
    const hp = Math.round(this.foeHpBase() * st.hp);
    this.foes.push({
      uid: this.uidSeq++, type, name: st.name, hp, maxHp: hp,
      atk: this.foeAtkBase() * st.atk, spd: st.spd, speed: st.speed,
      gold: Math.round((40 + this.globalWave() * 16 + this.floor * 80) * st.gold),
      x: W + rand(20, 90), scale: type === 'brute' ? 1.35 : 1,
      state: 'walk', t: 0, cd: rand(0.3, 0.9), flashT: 0, animT: rand(0, 10),
      specialT: 0, specialPhase: 0, returnX: 0,
      slowT: 0, stunT: 0, bleedDps: 0, bleedT: 0,
    });
  }
  private spawnBoss(): void {
    const def = BOSSES[this.floor];
    const hp = Math.round(this.foeHpBase() * def.hpMul);
    this.bossActive = true;
    this.banner = { main: `${def.name} — ${def.title}`, sub: `BOSS TẦNG ${this.floor + 1}`, t: 0, life: 2.6, color: '#ff3b52' };
    sfx.roar();
    this.shake = 12;
    this.foes.push({
      uid: this.uidSeq++, type: 'boss', bossIdx: this.floor, name: def.name,
      hp, maxHp: hp, atk: this.foeAtkBase() * def.atkMul, spd: def.spd, speed: 110,
      gold: Math.round(400 + this.floor * 120), x: W + 120, scale: def.scale,
      state: 'walk', t: 0, cd: 1, flashT: 0, animT: 0, specialT: 4.5, specialPhase: 0, returnX: 0,
      slowT: 0, stunT: 0, bleedDps: 0, bleedT: 0,
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
    this.texts.push({ x: sx + rand(-14, 14), y: sy, text: fmt(dmg), color: crit ? '#ffd23c' : '#ffffff', life: 0.8, maxLife: 0.8, size: crit ? 26 : 16, vy: -70 });
    if (crit) this.texts.push({ x: sx, y: sy - 26, text: 'CHÍ MẠNG!', color: '#ffd23c', life: 0.7, maxLife: 0.7, size: 12, vy: -50 });
    this.burstAt(sx, sy, crit ? '#ffd23c' : '#ff5a6a', crit ? 10 : 5, 'spark');
    if (crit) { sfx.crit(); this.shake = Math.max(this.shake, 5); } else sfx.hit();
    if (f.hp <= 0) this.killFoe(f);
  }

  private applySchool(f: Fighter, t: Foe, dmg: number, sx: number, sy: number): void {
    switch (f.school) {
      case 'hoa': {
        const others = this.aliveFoes().filter((o) => o.uid !== t.uid).sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x)).slice(0, 2);
        others.forEach((o) => { this.dealToFoe(o, dmg * 0.35, false, o.x, GROUND - 60 * o.scale); });
        this.burstAt(sx, sy, '#ff9a3c', 10, 'spark');
        break;
      }
      case 'bang':
        if (t.state !== 'die') { t.slowT = 1.5; this.burstAt(sx, sy, '#7fd4ff', 7, 'spark'); }
        break;
      case 'loi': {
        const others = this.aliveFoes().filter((o) => o.uid !== t.uid && Math.abs(o.x - t.x) < 340).slice(0, 2);
        others.forEach((o) => {
          this.zaps.push({ x1: sx, y1: sy, x2: o.x, y2: GROUND - 60 * o.scale, t: 0.22, color: '#ffe14d' });
          this.dealToFoe(o, dmg * 0.5, false, o.x, GROUND - 60 * o.scale);
        });
        break;
      }
      case 'am':
        if (t.state !== 'die') { t.bleedDps = f.atk * 0.45; t.bleedT = 3; }
        f.hp = Math.min(f.maxHp, f.hp + dmg * 0.12);
        break;
      case 'son':
        if (Math.random() < 0.18 && t.state !== 'die') {
          t.stunT = 0.9;
          this.texts.push({ x: sx, y: sy - 34, text: 'CHOÁNG!', color: '#d9a03f', life: 0.7, maxLife: 0.7, size: 12, vy: -40 });
        }
        break;
      case 'phong':
        if (Math.random() < 0.25 && t.state !== 'die') this.dealToFoe(t, dmg * 0.6, false, sx + 12, sy - 14);
        break;
      case 'huyet':
        f.hp = Math.min(f.maxHp, f.hp + dmg * 0.25);
        break;
      case 'quang': {
        if (f.role === 'ranged') {
          const wounded = this.fighters.filter((x) => x.state !== 'dead' && x.hp < x.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (wounded) {
            wounded.hp = Math.min(wounded.maxHp, wounded.hp + dmg * 0.3);
            this.burstAt(wounded.x, GROUND - 70, '#7fe08a', 6, 'star');
          }
        }
        break;
      }
      default: break;
    }
  }

  private killFoe(f: Foe): void {
    if (f.state === 'die') return;
    f.state = 'die'; f.t = 0;
    this.kills += 1;
    const bonus = 1 + this.itemBonus().goldBonus / 100;
    const gold = Math.round(f.gold * bonus);
    this.gold += gold;
    const gy = GROUND - 40 * f.scale;
    this.burstAt(f.x, gy, '#ff5a6a', f.bossIdx !== undefined ? 46 : 14, 'blood');
    this.burstAt(f.x, gy, '#ffffff', 8, 'poof');
    this.coinFly(f.x, gy, gold);
    sfx.splat();
    if (f.bossIdx !== undefined) this.onBossDown(f);
  }

  private coinFly(x: number, y: number, gold: number): void {
    for (let i = 0; i < Math.min(8, 2 + Math.floor(gold / 2000)); i++) {
      this.parts.push({ x: x + rand(-10, 10), y, vx: rand(-40, 40), vy: rand(-160, -90), life: 0.7, maxLife: 0.7, size: 5, color: '#ffd23c', grav: 320, kind: 'coin' });
    }
    this.texts.push({ x, y: y - 30, text: `+${fmt(gold)}`, color: '#ffd23c', life: 1, maxLife: 1, size: 14, vy: -46 });
  }

  private onBossDown(f: Foe): void {
    this.bossActive = false;
    this.slowmo = 1.1;
    this.shake = 20;
    this.flash = 0.7; this.flashColor = '#ffd8a0';
    sfx.bossdie();
    const gemReward = 300 + this.floor * 150;
    this.gems += gemReward;
    this.texts.push({ x: f.x, y: GROUND - 160, text: `+${fmt(gemReward)} NGỌC`, color: '#ff8fd0', life: 1.6, maxLife: 1.6, size: 24, vy: -30 });
    this.banner = { main: `${f.name} ĐÃ GỤC NGÃ`, sub: `+${fmt(gemReward)} Ngọc`, t: 0, life: 2.4, color: '#ffd23c' };
    this.aliveFoes().forEach((m) => { if (m.bossIdx === undefined) { m.hp = 0; this.killFoe(m); } });
    this.pending = [];
    this.save();
    setTimeout(() => {
      if (this.destroyed) return;
      if (this.floor >= TOTAL_FLOORS - 1) {
        this.state = 'victory';
        this.cb.onEvent({ type: 'victory', stats: { time: this.playTime, kills: this.kills, totalDmg: Math.round(this.totalDmg), floor: this.floor + 1 } });
      } else {
        this.floor += 1;
        if (this.floor === 3) { this.state = 'story'; this.cb.onEvent({ type: 'story', chapter: 1 }); }
        else if (this.floor === 10) { this.state = 'story'; this.cb.onEvent({ type: 'story', chapter: 2 }); }
        else this.continueFromStory();
      }
      this.pushHud(); this.save();
    }, 2200);
  }

  private damageFighter(f: Fighter, dmg: number, foe?: Foe): void {
    if (f.state === 'dead') return;
    f.hp -= dmg;
    f.flashT = 0.15;
    this.burstAt(f.x, GROUND - 60, '#ff5a6a', 6, 'spark');
    this.texts.push({ x: f.x + rand(-10, 10), y: GROUND - 100, text: fmt(dmg), color: '#ff7a7a', life: 0.7, maxLife: 0.7, size: 13, vy: -55 });
    // Thiết phái: phản đòn
    if (f.school === 'thiet' && foe && foe.state !== 'die') {
      this.dealToFoe(foe, f.atk * 0.35, false, foe.x, GROUND - 50 * foe.scale);
      this.zaps.push({ x1: f.x, y1: GROUND - 60, x2: foe.x, y2: GROUND - 50 * foe.scale, t: 0.18, color: '#9aa3b2' });
    }
    if (f.hp <= 0) {
      f.hp = 0; f.state = 'dead'; f.reviveT = 6; f.attackAnim = -1;
      this.burstAt(f.x, GROUND - 40, '#ff5a6a', 20, 'blood');
      sfx.hurt();
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
    if (!this.paused && this.state === 'playing') {
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
    // tiến về phía trước: cảnh luôn cuộn
    this.scrollX += dt * (this.combatBusy() ? 46 : 105);

    for (const p of this.pending) p.t -= dt;
    const due = this.pending.filter((p) => p.t <= 0);
    if (due.length) { due.forEach((p) => this.spawnFoe(p.type)); this.pending = this.pending.filter((p) => p.t > 0); }

    if (!this.bossActive && this.pending.length === 0 && this.aliveFoes().length === 0 && this.wave < WAVES_PER_FLOOR) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        this.spawnWave();
        this.waveDelay = 0.5;
        if (this.wave % 4 === 0 && this.wave > 0 && this.wave < WAVES_PER_FLOOR) {
          this.gems += 40;
          this.texts.push({ x: W / 2, y: 130, text: '+40 Ngọc (thưởng đợt)', color: '#ff8fd0', life: 1.2, maxLife: 1.2, size: 15, vy: -20 });
        }
      }
    }

    this.updateFighters(dt);
    this.updateFoes(dt);
    this.updateProjs(dt);
    this.updateFx(dt);
    for (const z of this.zaps) z.t -= dt;
    this.zaps = this.zaps.filter((z) => z.t > 0);
  }

  private updateFx(dt: number): void {
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const f of this.fighters) { f.animT += dt; if (f.flashT > 0) f.flashT -= dt; if (f.buffT > 0) f.buffT -= dt; }
    for (const e of this.foes) { e.animT += dt; if (e.flashT > 0) e.flashT -= dt; }
    this.foes = this.foes.filter((f) => !(f.state === 'die' && f.t > 0.5));
    for (const f of this.foes) if (f.state === 'die') f.t += dt;
  }

  private updateFighters(dt: number): void {
    const busy = this.combatBusy();
    for (const f of this.fighters) {
      if (f.state === 'dead') {
        f.reviveT -= dt;
        if (f.reviveT <= 0) {
          f.hp = Math.round(f.maxHp * 0.6); f.state = 'idle'; f.x = f.homeX; f.cd = 0.3;
          this.burstAt(f.x, GROUND - 60, '#7fd4ff', 14, 'star');
          this.texts.push({ x: f.x, y: GROUND - 110, text: 'HỒI SINH', color: '#7fd4ff', life: 0.9, maxLife: 0.9, size: 12, vy: -40 });
          sfx.potion();
        }
        continue;
      }
      f.cd -= dt;

      // hành quân: không có địch thì cả đội chạy tiến lên
      if (f.state === 'idle') {
        if (!busy && f.x < f.homeX + 150) { f.x += 70 * dt; continue; }
        if (busy && f.x > f.homeX + 10) { f.x -= 420 * dt; if (f.x < f.homeX) f.x = f.homeX; continue; }
        if (f.cd > 0) continue;
        if (f.role === 'healer') { this.doHeal(f); continue; }
        const target = this.nearestFoe(f.x);
        if (!target) { f.cd = 0.25; continue; }
        f.target = target.uid;
        if (f.role === 'ranged') { this.doRanged(f, target); f.cd = 1 / f.spd; }
        else { f.state = 'dash'; f.stateT = 0; }
      } else if (f.state === 'dash') {
        const t = this.foes.find((e) => e.uid === f.target && e.state !== 'die');
        if (!t) { f.state = 'return'; }
        else {
          const dest = t.x - 46 * t.scale;
          f.x += clamp(dest - f.x, -950 * dt, 950 * dt);
          if (Math.abs(f.x - dest) < 14) { f.state = 'strike'; f.stateT = 0; f.attackAnim = 0; sfx.slash(); }
        }
      } else if (f.state === 'strike') {
        f.stateT += dt;
        f.attackAnim = Math.min(1, f.stateT / 0.22);
        if (f.stateT >= 0.1 && f.stateT - dt < 0.1) {
          const t = this.foes.find((e) => e.uid === f.target && e.state !== 'die');
          if (t) {
            const crit = Math.random() * 100 < f.crit;
            const dmg = f.atk * (f.buffT > 0 ? 1.15 : 1) * (crit ? 1.8 : 1) * rand(0.9, 1.1);
            this.dealToFoe(t, dmg, crit, t.x, GROUND - 70 * t.scale);
            this.applySchool(f, t, dmg, t.x, GROUND - 70 * t.scale);
            this.slashFx(t.x - 10, GROUND - 70 * t.scale, f.cfg.accent);
          }
        }
        if (f.stateT >= 0.24) { f.state = 'return'; f.attackAnim = -1; }
      } else if (f.state === 'return') {
        f.x += clamp(f.homeX - f.x, -950 * dt, 950 * dt);
        if (Math.abs(f.x - f.homeX) < 8) { f.x = f.homeX; f.state = 'idle'; f.cd = 1 / f.spd; }
      } else if (f.state === 'cast') {
        f.stateT += dt;
        if (f.stateT > 0.32) { f.state = 'idle'; f.cd = 1 / f.spd; }
      }
    }
  }

  private doRanged(f: Fighter, t: Foe): void {
    f.state = 'cast'; f.stateT = 0;
    let kind: Proj['kind'] = f.cfg.weapon === 'bow' ? 'arrow' : f.cfg.weapon === 'spear' ? 'light' : 'magic';
    if (f.school === 'bang') kind = 'ice';
    if (f.school === 'am') kind = 'blood';
    const splash = f.defId === 'seraph' ? 0.3 : f.school === 'hoa' ? 0.35 : 0;
    this.projs.push({
      x: f.x + 20, y: GROUND - 78 * f.cfg.scale, target: t.uid,
      speed: kind === 'arrow' ? 1050 : kind === 'light' ? 1150 : 720,
      dmg: f.atk * (f.buffT > 0 ? 1.15 : 1) * rand(0.92, 1.08), kind, t: 0, splash,
      crit: f.crit, school: f.school, from: f.uid,
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
    this.texts.push({ x: wounded.x, y: GROUND - 105, text: `+${fmt(amount)}`, color: '#7fe08a', life: 0.8, maxLife: 0.8, size: 14, vy: -50 });
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
      // hiệu ứng trạng thái
      if (e.slowT > 0) e.slowT -= dt;
      if (e.bleedT > 0) {
        e.bleedT -= dt;
        e.hp -= e.bleedDps * dt;
        if (Math.random() < dt * 4) this.burstAt(e.x + rand(-12, 12), GROUND - 50 * e.scale, '#c05cff', 2, 'blood');
        if (e.hp <= 0) { this.killFoe(e); continue; }
      }
      if (e.stunT > 0) { e.stunT -= dt; continue; }

      if (e.bossIdx !== undefined) { this.updateBoss(e, dt); continue; }
      const frontline = 560;
      const spd = e.speed * (e.slowT > 0 ? 0.5 : 1);
      if (e.x > frontline) { e.x -= spd * dt; e.state = 'walk'; }
      else {
        e.state = 'fight';
        e.cd -= dt;
        if (e.cd <= 0) {
          const target = this.frontFighter();
          if (target) {
            this.damageFighter(target, e.atk * rand(0.85, 1.15), e);
            this.slashFx(target.x + 10, GROUND - 70, '#ff5a6a');
            if (e.type === 'imp' || e.type === 'wisp') sfx.shoot(); else sfx.slash();
          }
          e.cd = 1 / e.spd;
        }
      }
    }
  }

  private updateBoss(e: Foe, dt: number): void {
    const def = BOSSES[e.bossIdx ?? 0];
    const frontline = 620;
    e.specialT -= dt;
    const spd = e.speed * (e.slowT > 0 ? 0.5 : 1);
    if (e.state === 'walk') {
      e.x -= spd * dt;
      if (e.x <= frontline) { e.state = 'fight'; e.cd = 0.7; e.specialT = 4; }
      return;
    }
    if (e.state === 'tele') {
      e.t += dt;
      if (e.t > 0.5 && e.specialPhase === 1) {
        e.specialPhase = 2;
        e.x = 170; sfx.teleport();
        this.burstAt(e.x, GROUND - 90, def.accent, 18, 'spark');
      }
      if (e.t > 0.7 && e.specialPhase === 2) {
        e.specialPhase = 3;
        const target = this.frontFighter() ?? this.fighters.find((f) => f.state !== 'dead');
        if (target) {
          this.damageFighter(target, e.atk * 1.4, e);
          this.shake = Math.max(this.shake, 9);
          this.burstAt(target.x, GROUND - 60, def.accent, 16, 'spark');
          sfx.beam();
        }
      }
      if (e.t > 1.2) { e.state = 'fight'; e.x = frontline; e.cd = 0.7; e.specialT = rand(5, 7); e.specialPhase = 0; }
      return;
    }
    e.cd -= dt;
    if (e.cd <= 0) {
      const target = this.frontFighter();
      if (target) {
        this.damageFighter(target, e.atk * rand(0.9, 1.1), e);
        this.slashFx(target.x + 14, GROUND - 70, '#ff5a6a');
        sfx.heavy();
        this.shake = Math.max(this.shake, 4);
      }
      e.cd = 1 / e.spd;
    }
    if (e.specialT > 0) return;
    switch (def.arch) {
      case 'charger': {
        sfx.spike();
        this.shake = Math.max(this.shake, 12);
        this.flash = 0.3; this.flashColor = '#ff9a3c';
        this.fighters.forEach((f) => { if (f.state !== 'dead') this.damageFighter(f, e.atk * 0.7, e); });
        for (let i = 0; i < 22; i++) this.parts.push({ x: e.x - rand(0, 300), y: GROUND, vx: rand(-60, 60), vy: rand(-260, -120), life: 0.7, maxLife: 0.7, size: rand(3, 7), color: def.accent, grav: 420, kind: 'spark' });
        this.texts.push({ x: e.x - 140, y: GROUND - 140, text: 'SÓNG CHẤN ĐỘNG!', color: def.accent, life: 1, maxLife: 1, size: 16, vy: -30 });
        e.specialT = rand(5.5, 7.5);
        break;
      }
      case 'spitter': {
        sfx.shoot();
        const targets = this.fighters.filter((f) => f.state !== 'dead');
        for (let i = 0; i < 3; i++) {
          const tgt = targets[i % Math.max(1, targets.length)];
          if (tgt) this.projs.push({ x: e.x - 30, y: GROUND - 150 - i * 20, target: tgt.uid, speed: 520, dmg: e.atk * 0.65, kind: 'acid', t: i * 0.12, splash: 0, crit: 0 });
        }
        if (this.aliveFoes().length < 5 && Math.random() < 0.6) { this.spawnFoe('slime'); this.spawnFoe('slime'); }
        this.texts.push({ x: e.x - 60, y: GROUND - 200, text: 'MƯA AXIT!', color: '#8dff9a', life: 1, maxLife: 1, size: 16, vy: -30 });
        e.specialT = rand(5, 7);
        break;
      }
      case 'trickster': {
        e.state = 'tele'; e.t = 0; e.specialPhase = 1;
        this.burstAt(e.x, GROUND - 90, def.accent, 18, 'spark');
        const targets = this.fighters.filter((f) => f.state !== 'dead');
        targets.slice(0, 3).forEach((tgt) => this.projs.push({ x: e.x - 40, y: GROUND - 180, target: tgt.uid, speed: 560, dmg: e.atk * 0.5, kind: 'bolt', t: 0, splash: 0, crit: 0 }));
        sfx.beam();
        e.specialT = rand(5.5, 8);
        break;
      }
      case 'warlock': {
        sfx.beam();
        const targets = this.fighters.filter((f) => f.state !== 'dead');
        targets.slice(0, 4).forEach((tgt) => this.projs.push({ x: e.x - 40, y: GROUND - 190, target: tgt.uid, speed: 500, dmg: e.atk * 0.55, kind: 'bolt', t: 0, splash: 0, crit: 0 }));
        if (this.aliveFoes().length < 6) { this.spawnFoe('skeleton'); this.spawnFoe('skeleton'); }
        this.texts.push({ x: e.x - 80, y: GROUND - 210, text: 'TRIỆU HỒN!', color: def.accent, life: 1, maxLife: 1, size: 16, vy: -30 });
        e.specialT = rand(5.5, 7.5);
        break;
      }
      case 'titan': {
        sfx.spike(); sfx.heavy();
        this.shake = Math.max(this.shake, 17);
        this.flash = 0.4; this.flashColor = def.accent;
        this.fighters.forEach((f) => { if (f.state !== 'dead') this.damageFighter(f, e.atk * 0.95, e); });
        for (let i = 0; i < 30; i++) this.parts.push({ x: e.x - rand(0, 420), y: GROUND, vx: rand(-90, 90), vy: rand(-340, -140), life: 0.9, maxLife: 0.9, size: rand(4, 10), color: i % 2 ? def.accent : '#8f887a', grav: 460, kind: 'spark' });
        this.texts.push({ x: e.x - 160, y: GROUND - 150, text: 'ĐẠI ĐỊA CHẤN!', color: def.accent, life: 1.1, maxLife: 1.1, size: 18, vy: -30 });
        e.specialT = rand(6.5, 8.5);
        break;
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
          this.damageFighter(tgt, pr.dmg);
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
          const dmg = pr.dmg * (crit ? 1.8 : 1);
          this.dealToFoe(tgt, dmg, crit, tgt.x, ty);
          const shooter = pr.from ? this.fighters.find((f) => f.uid === pr.from) : undefined;
          if (shooter) this.applySchool(shooter, tgt, dmg, tgt.x, ty);
          else if (pr.splash > 0) {
            this.aliveFoes().filter((o) => o.uid !== tgt.uid).slice(0, 2).forEach((o) => this.dealToFoe(o, pr.dmg * pr.splash, false, o.x, GROUND - 60 * o.scale));
          }
          continue;
        }
        pr.x += (dx / d) * pr.speed * dt; pr.y += (dy / d) * pr.speed * dt;
        if (Math.random() < 0.5) {
          const col = pr.kind === 'arrow' ? '#c9e8ff' : pr.kind === 'light' ? '#ffd23c' : pr.kind === 'ice' ? '#7fd4ff' : pr.kind === 'blood' ? '#ff3b52' : '#d05cff';
          this.parts.push({ x: pr.x, y: pr.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.25, maxLife: 0.25, size: 3, color: col, grav: 0, kind: 'spark' });
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

    const drawables: { x: number; fn: () => void }[] = [];
    for (const f of this.fighters) drawables.push({ x: f.x, fn: () => this.drawFighter(ctx, f) });
    for (const e of this.foes) drawables.push({ x: e.x, fn: () => this.drawFoe(ctx, e) });
    drawables.sort((a, b) => a.x - b.x).forEach((d) => d.fn());

    this.drawZaps(ctx);
    this.drawProjs(ctx);
    this.drawParts(ctx);
    this.drawTexts(ctx);
    this.drawBanner(ctx);
    this.drawBossBar(ctx);
    this.drawWavePips(ctx);
    this.drawSpeedLines(ctx);

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

  private drawSpeedLines(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'playing') return;
    const n = this.speed >= 3 ? 8 : 4;
    ctx.save();
    ctx.strokeStyle = 'rgba(232,223,200,0.07)';
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const y = ((i * 173 + this.globalT * 400) % (H - 160)) + 60;
      const x = W - ((i * 331 + this.globalT * (900 + i * 120)) % (W + 300));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90 + i * 14, y); ctx.stroke();
    }
    ctx.restore();
  }

  private drawBg(ctx: CanvasRenderingContext2D): void {
    const inGame = this.state === 'playing' || this.state === 'story' || this.state === 'victory';
    const url = inGame ? floorImg(this.floor) : IMG.title;
    const im = this.bgImgs[url];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#141021'); grad.addColorStop(1, '#0a0812');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    if (im && this.bgLoaded[url]) {
      const sc = Math.max(W / im.width, H / im.height) * 1.12;
      const iw = im.width * sc; const ih = im.height * sc;
      // cuộn parallax liên tục — đội luôn tiến về phía trước
      const off = -((this.scrollX * 0.35) % iw);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(im, off, (H - ih) / 2 - 20, iw, ih);
      ctx.drawImage(im, off + iw, (H - ih) / 2 - 20, iw, ih);
      ctx.globalAlpha = 1;
    }
    const g2 = ctx.createLinearGradient(0, GROUND - 160, 0, H);
    g2.addColorStop(0, 'rgba(8,6,14,0)');
    g2.addColorStop(1, 'rgba(8,6,14,0.88)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, GROUND - 160, W, H - GROUND + 160);
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
    // vết nứt cuộn theo bước chạy
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const off = this.scrollX % 160;
    for (let i = -1; i < 10; i++) {
      const sx = i * 160 - off;
      ctx.beginPath(); ctx.moveTo(sx, GROUND + 10 + (i % 3) * 16);
      ctx.lineTo(sx + 60, GROUND + 16 + (i % 3) * 16);
      ctx.stroke();
    }
  }

  /* ---------- hero drawing (CHIBI) ---------- */
  private drawFighter(ctx: CanvasRenderingContext2D, f: Fighter): void {
    const gy = GROUND;
    const s = f.cfg.scale;
    const bob = f.state === 'dead' ? 0 : Math.abs(Math.sin(f.animT * 7)) * 3;
    ctx.save();
    ctx.translate(f.x, gy);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, 30 * s, 8 * s, 0, 0, TAU); ctx.fill();

    if (f.state === 'dead') {
      this.drawHeroDown(ctx, f);
      ctx.restore();
      return;
    }

    if (f.cfg.aura) {
      const ag = ctx.createRadialGradient(0, -56 * s, 6, 0, -56 * s, 70 * s);
      ag.addColorStop(0, f.cfg.aura); ag.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(0, -56 * s, 70 * s, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = f.animT * 1.4 + i * 2.1;
        const px = Math.cos(a) * 34 * s; const py = -56 * s + Math.sin(a * 1.3) * 40 * s;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(f.animT * 4 + i);
        this.star(ctx, px, py, 4, f.cfg.accent);
        ctx.globalAlpha = 1;
      }
    }

    ctx.translate(0, -bob);
    if (f.flashT > 0) ctx.filter = 'brightness(2.2)';
    const swing = f.attackAnim >= 0 ? f.attackAnim : -1;
    this.drawHeroBody(ctx, f.cfg, s, swing, f.state === 'cast' ? f.stateT : -1, f.animT);
    ctx.filter = 'none';
    ctx.restore();

    const hpPct = clamp(f.hp / f.maxHp, 0, 1);
    const bw = 56;
    const bx = f.x - bw / 2; const by = gy - 122 * s;
    ctx.fillStyle = 'rgba(8,6,12,0.8)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = hpPct > 0.5 ? '#52e07a' : hpPct > 0.25 ? '#ffd23c' : '#ff3b52';
    ctx.fillRect(bx, by, bw * hpPct, 5);
    ctx.font = '700 11px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = f.isKael ? '#ffd8a1' : '#e8dfc8';
    ctx.fillText(`${f.name} Lv${f.level}`, f.x, by - 5);
  }

  private drawHeroDown(ctx: CanvasRenderingContext2D, f: Fighter): void {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.rotate(-Math.PI / 2);
    ctx.translate(26, 8);
    ctx.scale(0.9, 0.9);
    this.drawHeroBody(ctx, f.cfg, f.cfg.scale, -1, -1, 0);
    ctx.restore();
    const sy = -64 - Math.sin(f.animT * 2) * 6;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath(); ctx.arc(0, sy, 7, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = '700 10px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fd8ff';
    ctx.fillText(`${Math.ceil(f.reviveT)}s`, 0, -92);
  }

  /* Tỷ lệ chibi: đầu to ~45% thân, chân tay ngắn mũm mĩm */
  private drawHeroBody(ctx: CanvasRenderingContext2D, cfg: HeroCfg, s: number, swing: number, castT: number, animT: number): void {
    const c = cfg;
    ctx.save();
    ctx.scale(s, s);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#17121f';
    ctx.lineJoin = 'round';
    const run = Math.sin(animT * 9);

    if (c.cape) {
      ctx.fillStyle = c.cape;
      ctx.beginPath();
      ctx.moveTo(-8, -50);
      ctx.quadraticCurveTo(-28, -30 + Math.sin(animT * 3) * 3, -22, -2);
      ctx.lineTo(-6, -18);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // chân ngắn chạy luân phiên
    ctx.fillStyle = c.outfitDark;
    rr(ctx, -12, -20 + Math.max(0, run) * 4, 10, 20, 4); ctx.fill(); ctx.stroke();
    rr(ctx, 3, -20 + Math.max(0, -run) * 4, 10, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#241d2e';
    rr(ctx, -13, -6, 12, 6, 3); ctx.fill(); ctx.stroke();
    rr(ctx, 2, -6, 12, 6, 3); ctx.fill(); ctx.stroke();
    // thân nhỏ
    ctx.fillStyle = c.outfit;
    ctx.beginPath();
    ctx.moveTo(-14, -50); ctx.lineTo(14, -50); ctx.lineTo(12, -18); ctx.lineTo(-12, -18);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.accent;
    ctx.fillRect(-12, -26, 24, 4);
    // tay sau
    ctx.fillStyle = c.outfit;
    rr(ctx, -18, -48, 7, 18, 4); ctx.fill(); ctx.stroke();

    // ĐẦU TO
    const hy = -70;
    ctx.fillStyle = c.skinTone;
    ctx.beginPath(); ctx.arc(1, hy, 21, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-17, hy + 4, 4, 0, TAU); ctx.fill(); ctx.stroke();
    // má hồng
    ctx.fillStyle = 'rgba(255,120,130,0.35)';
    ctx.beginPath(); ctx.ellipse(-6, hy + 8, 3.6, 2.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13, hy + 8, 3.6, 2.2, 0, 0, TAU); ctx.fill();

    ctx.fillStyle = c.hair;
    this.drawHairBack(ctx, c, hy);
    this.drawAnimeEyes(ctx, c, hy);
    ctx.strokeStyle = '#8a5a4a';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(5, hy + 11); ctx.quadraticCurveTo(8, hy + 13, 11, hy + 11); ctx.stroke();
    ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;
    this.drawHairFront(ctx, c, hy);

    // tay cầm vũ khí
    const casting = castT >= 0;
    const shoulderX = 9; const shoulderY = -46;
    let armAngle: number;
    if (swing >= 0) armAngle = lerp(-2.4, 0.9, easeOut(swing));
    else if (casting) armAngle = -1.9 + Math.sin(castT * 20) * 0.1;
    else armAngle = -0.5 + Math.sin(animT * 3.2) * 0.06;

    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(armAngle);
    ctx.fillStyle = c.outfit;
    rr(ctx, -4, 0, 8, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.skinTone;
    ctx.beginPath(); ctx.arc(0.5, 21, 4.6, 0, TAU); ctx.fill(); ctx.stroke();
    this.drawWeapon(ctx, c, swing, castT);
    ctx.restore();

    ctx.restore();
  }

  private drawAnimeEyes(ctx: CanvasRenderingContext2D, c: HeroCfg, hy: number): void {
    const eyes = [{ x: 2, w: 6.4, h: 8 }, { x: 12, w: 5.2, h: 6.8 }];
    for (const e of eyes) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(e.x, hy - 1, e.w, e.h, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.7; ctx.stroke();
      ctx.fillStyle = c.eye;
      ctx.beginPath(); ctx.ellipse(e.x + 1, hy - 0.5, e.w * 0.64, e.h * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#10101a';
      ctx.beginPath(); ctx.arc(e.x + 1.4, hy + 0.2, e.w * 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e.x - 0.8, hy - 3.4, 2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + 2.4, hy + 2, 1, 0, TAU); ctx.fill();
    }
    ctx.lineWidth = 2.4;
  }

  private drawHairBack(ctx: CanvasRenderingContext2D, c: HeroCfg, hy: number): void {
    ctx.beginPath();
    switch (c.hairStyle) {
      case 'long':
      case 'angel':
        ctx.moveTo(-18, hy - 6);
        ctx.quadraticCurveTo(-32, hy + 18, -24, hy + 44);
        ctx.lineTo(-10, hy + 36);
        ctx.quadraticCurveTo(-20, hy + 10, -8, hy - 4);
        break;
      case 'twin':
        ctx.moveTo(-16, hy - 4);
        ctx.quadraticCurveTo(-30, hy + 10, -26, hy + 34);
        ctx.lineTo(-16, hy + 30);
        ctx.quadraticCurveTo(-20, hy + 8, -8, hy - 2);
        ctx.moveTo(16, hy - 6);
        ctx.quadraticCurveTo(28, hy + 8, 24, hy + 32);
        ctx.lineTo(15, hy + 28);
        ctx.quadraticCurveTo(19, hy + 6, 8, hy - 4);
        break;
      default:
        ctx.moveTo(-19, hy - 2);
        ctx.quadraticCurveTo(-26, hy + 8, -20, hy + 15);
        ctx.lineTo(-10, hy + 6);
        break;
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (c.hairStyle === 'angel') {
      ctx.save();
      ctx.strokeStyle = '#ffd23c';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.ellipse(1, hy - 30, 17, 5.5, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;
    }
  }

  private drawHairFront(ctx: CanvasRenderingContext2D, c: HeroCfg, hy: number): void {
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    switch (c.hairStyle) {
      case 'spiky':
        ctx.moveTo(-20, hy - 2);
        ctx.lineTo(-25, hy - 20); ctx.lineTo(-12, hy - 13);
        ctx.lineTo(-10, hy - 30); ctx.lineTo(-1, hy - 16);
        ctx.lineTo(7, hy - 32); ctx.lineTo(12, hy - 15);
        ctx.lineTo(23, hy - 22); ctx.lineTo(20, hy - 4);
        ctx.quadraticCurveTo(20, hy - 18, 1, hy - 19);
        ctx.quadraticCurveTo(-16, hy - 18, -20, hy - 2);
        break;
      case 'wild':
        ctx.moveTo(-20, hy);
        ctx.quadraticCurveTo(-27, hy - 22, -7, hy - 25);
        ctx.quadraticCurveTo(0, hy - 32, 9, hy - 24);
        ctx.quadraticCurveTo(24, hy - 22, 20, hy - 2);
        ctx.quadraticCurveTo(15, hy - 16, 1, hy - 17);
        ctx.quadraticCurveTo(-13, hy - 16, -20, hy);
        break;
      case 'bun':
        ctx.arc(1, hy - 7, 21.5, Math.PI * 0.95, Math.PI * 2.02);
        ctx.quadraticCurveTo(20, hy - 9, 19, hy - 2);
        ctx.quadraticCurveTo(9, hy - 17, -3, hy - 16);
        ctx.quadraticCurveTo(-17, hy - 15, -18, hy - 1);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(-10, hy - 28, 9, 0, TAU);
        break;
      case 'twin':
        ctx.moveTo(-20, hy);
        ctx.quadraticCurveTo(-22, hy - 24, 1, hy - 24);
        ctx.quadraticCurveTo(22, hy - 23, 20, hy - 1);
        ctx.lineTo(14, hy - 10);
        ctx.quadraticCurveTo(10, hy - 3, 13, hy + 3);
        ctx.quadraticCurveTo(4, hy - 14, -5, hy - 14);
        ctx.quadraticCurveTo(-14, hy - 12, -20, hy);
        break;
      case 'long':
      case 'angel':
        ctx.moveTo(-20, hy);
        ctx.quadraticCurveTo(-22, hy - 25, 1, hy - 25);
        ctx.quadraticCurveTo(23, hy - 24, 20, hy - 1);
        ctx.lineTo(15, hy - 10);
        ctx.quadraticCurveTo(12, hy - 2, 14, hy + 5);
        ctx.quadraticCurveTo(5, hy - 15, -5, hy - 15);
        ctx.quadraticCurveTo(-15, hy - 12, -20, hy);
        break;
      default:
        ctx.moveTo(-20, hy - 1);
        ctx.quadraticCurveTo(-20, hy - 24, 1, hy - 24);
        ctx.quadraticCurveTo(22, hy - 23, 21, hy - 2);
        ctx.quadraticCurveTo(12, hy - 16, -3, hy - 16);
        ctx.quadraticCurveTo(-15, hy - 15, -20, hy - 1);
        break;
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  private drawWeapon(ctx: CanvasRenderingContext2D, c: HeroCfg, swing: number, castT: number): void {
    ctx.save();
    ctx.translate(0.5, 21);
    switch (c.weapon) {
      case 'great': {
        ctx.rotate(-0.25);
        ctx.fillStyle = '#3a3542';
        rr(ctx, -3.4, 2, 7, 14, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.accent;
        rr(ctx, -9, 14, 18, 5, 2); ctx.fill(); ctx.stroke();
        const glint = swing >= 0 ? 0.5 + 0.5 * Math.sin(swing * Math.PI) : 0.35;
        const bg = ctx.createLinearGradient(0, 18, 0, 88);
        bg.addColorStop(0, '#c8cdd8'); bg.addColorStop(1, '#5a5f6e');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-8, 18); ctx.lineTo(9, 18); ctx.lineTo(11, 80); ctx.lineTo(0, 92); ctx.lineTo(-10, 76);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = glint;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(4, 22); ctx.lineTo(8, 22); ctx.lineTo(8, 72); ctx.lineTo(3, 66); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'sword': {
        ctx.fillStyle = '#5a4630';
        rr(ctx, -3, 2, 6, 11, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.accent;
        rr(ctx, -8, 12, 16, 4, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, 15, 0, 62);
        bg.addColorStop(0, '#d6dae2'); bg.addColorStop(1, '#7c8290');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-5, 15); ctx.lineTo(5, 15); ctx.lineTo(6, 54); ctx.lineTo(0, 62); ctx.lineTo(-6, 52); ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      }
      case 'dagger': {
        ctx.fillStyle = '#2c2733';
        rr(ctx, -2.6, 2, 5, 8, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, 9, 0, 40);
        bg.addColorStop(0, '#b8bcd0'); bg.addColorStop(1, '#565a70');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(4, 9); ctx.lineTo(4.5, 34); ctx.lineTo(0, 42); ctx.lineTo(-4.5, 32); ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      }
      case 'bow': {
        ctx.rotate(0.2);
        ctx.strokeStyle = '#7a5230';
        ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.arc(0, 22, 24, -1.15, 1.15); ctx.stroke();
        ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(24 * Math.cos(-1.15), 22 + 24 * Math.sin(-1.15));
        ctx.lineTo(24 * Math.cos(1.15), 22 + 24 * Math.sin(1.15));
        ctx.stroke();
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;
        break;
      }
      case 'staff': {
        ctx.fillStyle = '#6a4a30';
        rr(ctx, -2.2, 0, 4.4, 56, 2); ctx.fill(); ctx.stroke();
        const glow = castT >= 0 ? 0.95 : 0.6;
        ctx.globalAlpha = glow;
        const og = ctx.createRadialGradient(0, 58, 1, 0, 58, 13);
        og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, c.accent); og.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(0, 58, 13, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(0, 58, 5.5, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      case 'spear': {
        ctx.rotate(-0.3);
        ctx.fillStyle = '#d8d2c0';
        rr(ctx, -2, 4, 4, 60, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, -16, 0, 6);
        bg.addColorStop(0, '#fff2c0'); bg.addColorStop(1, '#ffb020');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'axe': {
        ctx.fillStyle = '#5a4630';
        rr(ctx, -2.4, 0, 5, 52, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, -8, 26, 22);
        bg.addColorStop(0, '#d6dae2'); bg.addColorStop(1, '#7c8290');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.quadraticCurveTo(26, -8, 24, 16);
        ctx.quadraticCurveTo(14, 8, 0, 12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'hammer': {
        ctx.fillStyle = '#5a4630';
        rr(ctx, -2.4, 0, 5, 46, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#565e6e';
        rr(ctx, -14, 40, 28, 20, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.accent;
        ctx.fillRect(-14, 47, 28, 4);
        break;
      }
      case 'orb': {
        const fl = Math.sin((castT >= 0 ? castT : 0) * 10) * 2;
        ctx.globalAlpha = 0.85;
        const og = ctx.createRadialGradient(2, 34 + fl, 1, 2, 34 + fl, 14);
        og.addColorStop(0, '#ffffff'); og.addColorStop(0.45, c.accent); og.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(2, 34 + fl, 14, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(2, 34 + fl, 6, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      case 'scythe': {
        ctx.rotate(-0.2);
        ctx.fillStyle = '#3a3542';
        rr(ctx, -2, 0, 4, 58, 2); ctx.fill(); ctx.stroke();
        const bg = ctx.createLinearGradient(0, -14, 30, 6);
        bg.addColorStop(0, '#d6dae2'); bg.addColorStop(1, '#7c8290');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(30, -16, 30, 4);
        ctx.quadraticCurveTo(20, -4, 0, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /* ---------- foes (CHIBI) ---------- */
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
    ctx.scale(-e.scale, e.scale);
    if (e.bossIdx !== undefined) this.drawBossBody(ctx, e);
    else this.drawMonster(ctx, e);
    ctx.filter = 'none';
    ctx.restore();

    if (e.state !== 'die' && e.bossIdx === undefined) {
      const pct = clamp(e.hp / e.maxHp, 0, 1);
      const bw = 44 * e.scale;
      ctx.fillStyle = 'rgba(8,6,12,0.8)';
      ctx.fillRect(e.x - bw / 2 - 1, gy - 92 * e.scale - 1, bw + 2, 6);
      ctx.fillStyle = '#ff3b52';
      ctx.fillRect(e.x - bw / 2, gy - 92 * e.scale, bw * pct, 4);
    }
    if (e.stunT > 0 && e.state !== 'die') {
      ctx.save();
      ctx.translate(e.x, gy - 100 * e.scale);
      for (let i = 0; i < 3; i++) {
        const a = this.globalT * 6 + i * 2.1;
        this.star(ctx, Math.cos(a) * 14, Math.sin(a) * 5 - 8, 4, '#ffe14d');
      }
      ctx.restore();
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
        this.monsterEyes(ctx, -6, -18, 5.4);
        this.monsterEyes(ctx, 9, -18, 5.4);
        ctx.strokeStyle = '#1a4020'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(2, -9, 5, 0.2, Math.PI - 0.2); ctx.stroke();
        break;
      }
      case 'bat': {
        const flap = Math.sin(t * 14) * 0.7;
        const y = -52 + Math.sin(t * 5) * 6;
        ctx.save(); ctx.translate(0, y);
        ctx.fillStyle = '#7a4a9a';
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
        ctx.beginPath(); ctx.ellipse(0, 0, 13, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(-13, -22); ctx.lineTo(-3, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -11); ctx.lineTo(13, -22); ctx.lineTo(3, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
        this.monsterEyes(ctx, -4, -3, 4, '#ff3b52');
        this.monsterEyes(ctx, 5, -3, 4, '#ff3b52');
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-3, 7); ctx.lineTo(-1.5, 11); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, 7); ctx.lineTo(1.5, 11); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'skeleton': {
        const step = Math.sin(t * 8) * 3.4;
        ctx.fillStyle = '#d8d2c4';
        rr(ctx, -12, -20 + step * 0.4, 8, 20, 3); ctx.fill(); ctx.stroke();
        rr(ctx, 5, -20 - step * 0.4, 8, 20, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c9c2b2';
        rr(ctx, -13, -48, 26, 30, 7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#8f887a'; ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-9, -41 + i * 8); ctx.lineTo(9, -41 + i * 8); ctx.stroke(); }
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.2;
        // sọ to
        ctx.fillStyle = '#e8e2d4';
        ctx.beginPath(); ctx.arc(0, -62, 15, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1a1020';
        ctx.beginPath(); ctx.ellipse(-5.5, -64, 4, 5, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5.5, -64, 4, 5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff3b52';
        ctx.beginPath(); ctx.arc(-5.5, -64, 1.6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(5.5, -64, 1.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-4, -54); ctx.lineTo(4, -54); ctx.stroke();
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.2;
        ctx.save(); ctx.translate(16, -36); ctx.rotate(0.5 + Math.sin(t * 8) * 0.15);
        ctx.fillStyle = '#8f887a';
        ctx.beginPath(); ctx.moveTo(-2.6, 0); ctx.lineTo(2.6, 0); ctx.lineTo(2, -30); ctx.lineTo(-2, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'imp': {
        const hop = Math.abs(Math.sin(t * 7)) * 5;
        ctx.save(); ctx.translate(0, -hop);
        ctx.strokeStyle = '#c04a5a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-12, -14); ctx.quadraticCurveTo(-30, -18, -28, -34); ctx.stroke();
        ctx.fillStyle = '#8a2a3a';
        ctx.beginPath(); ctx.moveTo(-28, -34); ctx.lineTo(-34, -40); ctx.lineTo(-24, -40); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.2;
        ctx.fillStyle = '#c04a5a';
        ctx.beginPath(); ctx.ellipse(0, -22, 17, 21, 0, 0, TAU); ctx.fill(); ctx.stroke();
        rr(ctx, -12, -8, 9, 12, 4); ctx.fill(); ctx.stroke();
        rr(ctx, 4, -8, 9, 12, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a2a2a';
        ctx.beginPath(); ctx.moveTo(-8, -41); ctx.lineTo(-14, -54); ctx.lineTo(-4, -45); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -41); ctx.lineTo(14, -54); ctx.lineTo(4, -45); ctx.closePath(); ctx.fill(); ctx.stroke();
        this.monsterEyes(ctx, -5.5, -28, 5, '#ffd23c');
        this.monsterEyes(ctx, 6, -28, 5, '#ffd23c');
        ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-4, -16); ctx.quadraticCurveTo(1, -12, 6, -16); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-3, -15); ctx.lineTo(-2, -11); ctx.lineTo(-1, -15); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, -15); ctx.lineTo(2, -11); ctx.lineTo(1, -15); ctx.closePath(); ctx.fill();
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
        ctx.beginPath(); ctx.arc(0, y, 13, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2a6a8a'; ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#123a5a';
        ctx.beginPath(); ctx.ellipse(-4.5, y - 2, 2.6, 3.8, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4.5, y - 2, 2.6, 3.8, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, y + 5, 2.2, 3.2, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'brute': {
        const step = Math.sin(t * 4.5) * 3;
        ctx.fillStyle = '#6a7a4a';
        rr(ctx, -20, -24 + step * 0.4, 15, 24, 6); ctx.fill(); ctx.stroke();
        rr(ctx, 6, -24 - step * 0.4, 15, 24, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7a8a56';
        ctx.beginPath(); ctx.ellipse(0, -46, 27, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
        rr(ctx, -35, -58, 13, 34, 6); ctx.fill(); ctx.stroke();
        rr(ctx, 22, -58, 13, 34, 6); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(28, -26); ctx.rotate(-0.6 + Math.sin(t * 4.5) * 0.12);
        ctx.fillStyle = '#5a4630';
        rr(ctx, -4, -38, 8, 40, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4a3a26';
        ctx.beginPath(); ctx.ellipse(0, -44, 13, 16, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
        // đầu chibi nhỏ hơn thân
        ctx.fillStyle = '#8a9a62';
        ctx.beginPath(); ctx.arc(0, -78, 16, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8e2d4';
        ctx.beginPath(); ctx.moveTo(-12, -74); ctx.lineTo(-19, -66); ctx.lineTo(-9, -70); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, -74); ctx.lineTo(19, -66); ctx.lineTo(9, -70); ctx.closePath(); ctx.fill(); ctx.stroke();
        this.monsterEyes(ctx, -5.5, -81, 4.4, '#ff3b52');
        this.monsterEyes(ctx, 6, -81, 4.4, '#ff3b52');
        break;
      }
      default: break;
    }
    ctx.lineWidth = 2.2;
  }

  /* Boss chibi tổng quát theo bảng màu + phụ kiện */
  private drawBossBody(ctx: CanvasRenderingContext2D, e: Foe): void {
    const def = BOSSES[e.bossIdx ?? 0];
    const t = e.animT;
    const step = Math.sin(t * 3.4) * 2.4;
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#17121f';

    if (def.arch === 'spitter') {
      // chân váy xúc tu
      ctx.fillStyle = def.armorDark;
      for (let i = 0; i < 7; i++) {
        const tx = -42 + i * 14;
        const th = 26 + ((i * 37) % 22);
        const ph = Math.sin(t * 3 + i) * 6;
        ctx.beginPath();
        ctx.moveTo(tx - 8, 0);
        ctx.quadraticCurveTo(tx - 10 + ph, -th * 0.6, tx + ph * 0.5, -th);
        ctx.quadraticCurveTo(tx + 10 + ph, -th * 0.6, tx + 8, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    if (def.cape) {
      ctx.fillStyle = def.cape;
      ctx.beginPath();
      ctx.moveTo(-16, -92);
      ctx.quadraticCurveTo(-50, -52, -36, -4);
      ctx.lineTo(-10, -26);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (def.wings) {
      const flap = Math.sin(t * 2.6) * 0.16;
      for (const dir of [-1, 1]) {
        ctx.save(); ctx.translate(dir * 18, -86); ctx.scale(dir, 1); ctx.rotate(-0.3 + flap * dir);
        ctx.fillStyle = def.armorDark;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(40, -34, 58, -10);
        ctx.quadraticCurveTo(44, -8, 38, 2);
        ctx.quadraticCurveTo(28, -2, 22, 8);
        ctx.quadraticCurveTo(14, 2, 0, 12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    // chân ngắn
    ctx.fillStyle = def.armorDark;
    rr(ctx, -20, -34 + step, 15, 34, 6); ctx.fill(); ctx.stroke();
    rr(ctx, 5, -34 - step, 15, 34, 6); ctx.fill(); ctx.stroke();
    // thân giáp nhỏ
    const bg = ctx.createLinearGradient(0, -100, 0, -30);
    bg.addColorStop(0, def.armor); bg.addColorStop(1, def.armorDark);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-24, -96); ctx.lineTo(24, -96); ctx.lineTo(20, -30); ctx.lineTo(-20, -30);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = def.accent;
    ctx.fillRect(-20, -52, 40, 6);
    // cầu vai
    ctx.fillStyle = def.armor;
    ctx.beginPath(); ctx.ellipse(-26, -92, 14, 10, -0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(26, -92, 14, 10, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    // tay
    rr(ctx, -34, -88, 11, 30, 5); ctx.fill(); ctx.stroke();
    rr(ctx, 23, -88, 11, 30, 5); ctx.fill(); ctx.stroke();

    // ĐẦU KHỔNG LỒ
    const hy = -122;
    ctx.fillStyle = def.armor;
    ctx.beginPath(); ctx.arc(0, hy, 27, 0, TAU); ctx.fill(); ctx.stroke();
    // sừng
    ctx.fillStyle = '#c9c2b2';
    ctx.beginPath(); ctx.moveTo(-16, hy - 18); ctx.quadraticCurveTo(-30, -160, -20, hy - 44); ctx.quadraticCurveTo(-14, hy - 28, -8, hy - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, hy - 18); ctx.quadraticCurveTo(30, -160, 20, hy - 44); ctx.quadraticCurveTo(14, hy - 28, 8, hy - 22); ctx.closePath(); ctx.fill(); ctx.stroke();

    if (def.mask) {
      // mặt nạ trắng + khe dọc
      ctx.fillStyle = '#f6f2fa';
      ctx.beginPath(); ctx.arc(0, hy, 22, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1020';
      ctx.fillRect(-2, hy - 12, 4, 22);
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, hy - 1, 3, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // mắt rực sáng
      ctx.fillStyle = def.eye;
      ctx.shadowColor = def.eye; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(-9, hy - 2, 6, 7, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, hy - 2, 6, 7, 0, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#10101a';
      ctx.beginPath(); ctx.arc(-9, hy - 1, 2.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(9, hy - 1, 2.6, 0, TAU); ctx.fill();
      // miệng răng
      ctx.fillStyle = '#10101a';
      ctx.beginPath(); ctx.ellipse(0, hy + 12, 9, 5 + Math.sin(t * 4) * 1.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-6 + i * 4, hy + 8);
        ctx.lineTo(-4.6 + i * 4, hy + 12);
        ctx.lineTo(-3.2 + i * 4, hy + 8);
        ctx.closePath(); ctx.fill();
      }
    }

    // vũ khí theo hệ
    ctx.save();
    ctx.translate(32, -80);
    ctx.rotate(-0.35 + Math.sin(t * 3) * 0.06);
    if (def.arch === 'warlock') {
      ctx.fillStyle = '#3a3542';
      rr(ctx, -3, 0, 6, 60, 2); ctx.fill(); ctx.stroke();
      const og = ctx.createRadialGradient(0, 64, 2, 0, 64, 16);
      og.addColorStop(0, '#ffffff'); og.addColorStop(0.45, def.accent); og.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(0, 64, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath(); ctx.arc(0, 64, 7, 0, TAU); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = '#4a3a26';
      rr(ctx, -4, 0, 8, 18, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = def.accent;
      rr(ctx, -12, -6, 24, 6, 2); ctx.fill(); ctx.stroke();
      const sg = ctx.createLinearGradient(0, -8, 0, -96);
      sg.addColorStop(0, def.armor); sg.addColorStop(1, def.armorDark);
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.lineTo(12, -84); ctx.lineTo(0, -100); ctx.lineTo(-12, -80);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  private drawZaps(ctx: CanvasRenderingContext2D): void {
    for (const z of this.zaps) {
      const a = clamp(z.t / 0.22, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = z.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(z.x1, z.y1);
      const segs = 4;
      for (let i = 1; i < segs; i++) {
        const px = lerp(z.x1, z.x2, i / segs) + rand(-10, 10);
        const py = lerp(z.y1, z.y2, i / segs) + rand(-10, 10);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(z.x2, z.y2);
      ctx.stroke();
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
      } else if (p.kind === 'ice') {
        ctx.fillStyle = '#dff4ff';
        ctx.strokeStyle = '#7fd4ff'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(0, -6); ctx.lineTo(-8, 0); ctx.lineTo(0, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (p.kind === 'blood') {
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
        g.addColorStop(0, '#ffd0d8'); g.addColorStop(0.5, '#ff3b52'); g.addColorStop(1, 'rgba(255,59,82,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
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
      ctx.font = `900 ${t.size}px "Anton", "Be Vietnam Pro", sans-serif`;
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
    ctx.font = '400 40px "Anton", "Be Vietnam Pro", sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 6;
    ctx.strokeText(b.main, W / 2, H * 0.3 + 14);
    ctx.fillStyle = b.color;
    ctx.fillText(b.main, W / 2, H * 0.3 + 14);
    if (b.sub) {
      ctx.font = '600 16px "Be Vietnam Pro", sans-serif';
      ctx.fillStyle = '#e8dfc8';
      ctx.fillText(b.sub, W / 2, H * 0.3 + 46);
    }
    ctx.restore();
  }

  private drawBossBar(ctx: CanvasRenderingContext2D): void {
    const boss = this.foes.find((f) => f.bossIdx !== undefined && f.state !== 'die');
    if (!boss) return;
    const def = BOSSES[boss.bossIdx ?? 0];
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
    ctx.font = '400 14px "Anton", "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8fa0';
    ctx.fillText(`${def.name} — ${def.title}`, W / 2, by + 6);
  }

  private drawWavePips(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'playing') return;
    const pw = 15; const gap = 6;
    const total = WAVES_PER_FLOOR * pw + (WAVES_PER_FLOOR - 1) * gap;
    const x0 = W / 2 - total / 2; const y = 74;
    for (let i = 0; i < WAVES_PER_FLOOR; i++) {
      const x = x0 + i * (pw + gap);
      const done = i < this.wave - (this.bossActive ? 0 : 1);
      const cur = (this.bossActive && i === WAVES_PER_FLOOR - 1) || (!this.bossActive && i === this.wave - 1);
      const isBoss = i === WAVES_PER_FLOOR - 1;
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

/** Vẽ chân dung chibi vào canvas nhỏ (gacha / đội hình). */
export function renderPortrait(canvas: HTMLCanvasElement, cfg: HeroCfg, size: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  ctx.scale(s * 1.42, s * 1.42);
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
    ctx.moveTo(-8, -50);
    ctx.quadraticCurveTo(-30, -26, -24, 0);
    ctx.lineTo(-6, -16);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = c.outfitDark;
  rr(ctx, -12, -20, 10, 20, 4); ctx.fill(); ctx.stroke();
  rr(ctx, 3, -20, 10, 20, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.outfit;
  ctx.beginPath();
  ctx.moveTo(-14, -50); ctx.lineTo(14, -50); ctx.lineTo(12, -18); ctx.lineTo(-12, -18);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.fillRect(-12, -26, 24, 4);
  ctx.fillStyle = c.outfit;
  rr(ctx, -18, -48, 7, 18, 4); ctx.fill(); ctx.stroke();
  rr(ctx, 11, -48, 7, 18, 4); ctx.fill(); ctx.stroke();
  const hy = -70;
  ctx.fillStyle = c.skinTone;
  ctx.beginPath(); ctx.arc(1, hy, 21, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,130,0.35)';
  ctx.beginPath(); ctx.ellipse(-6, hy + 8, 3.6, 2.2, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, hy + 8, 3.6, 2.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.moveTo(-19, hy - 2);
  ctx.quadraticCurveTo(-26, hy + 8, -20, hy + 15);
  ctx.lineTo(-10, hy + 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // mắt to
  const eyes = [{ x: 2, w: 6.4, h: 8 }, { x: 12, w: 5.2, h: 6.8 }];
  for (const e of eyes) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(e.x, hy - 1, e.w, e.h, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#17121f'; ctx.lineWidth = 1.7; ctx.stroke();
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.ellipse(e.x + 1, hy - 0.5, e.w * 0.64, e.h * 0.7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10101a';
    ctx.beginPath(); ctx.arc(e.x + 1.4, hy + 0.2, e.w * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(e.x - 0.8, hy - 3.4, 2, 0, TAU); ctx.fill();
  }
  ctx.lineWidth = 2.4;
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  switch (c.hairStyle) {
    case 'spiky':
      ctx.moveTo(-20, hy - 2);
      ctx.lineTo(-25, hy - 20); ctx.lineTo(-12, hy - 13);
      ctx.lineTo(-10, hy - 30); ctx.lineTo(-1, hy - 16);
      ctx.lineTo(7, hy - 32); ctx.lineTo(12, hy - 15);
      ctx.lineTo(23, hy - 22); ctx.lineTo(20, hy - 4);
      ctx.quadraticCurveTo(20, hy - 18, 1, hy - 19);
      ctx.quadraticCurveTo(-16, hy - 18, -20, hy - 2);
      break;
    case 'bun':
      ctx.arc(1, hy - 7, 21.5, Math.PI * 0.95, Math.PI * 2.02);
      ctx.quadraticCurveTo(20, hy - 9, 19, hy - 2);
      ctx.quadraticCurveTo(9, hy - 17, -3, hy - 16);
      ctx.quadraticCurveTo(-17, hy - 15, -18, hy - 1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-10, hy - 28, 9, 0, TAU);
      break;
    case 'twin':
      ctx.moveTo(-20, hy);
      ctx.quadraticCurveTo(-22, hy - 24, 1, hy - 24);
      ctx.quadraticCurveTo(22, hy - 23, 20, hy - 1);
      ctx.lineTo(14, hy - 10);
      ctx.quadraticCurveTo(10, hy - 3, 13, hy + 3);
      ctx.quadraticCurveTo(4, hy - 14, -5, hy - 14);
      ctx.quadraticCurveTo(-14, hy - 12, -20, hy);
      break;
    default:
      ctx.moveTo(-20, hy - 1);
      ctx.quadraticCurveTo(-21, hy - 25, 1, hy - 25);
      ctx.quadraticCurveTo(22, hy - 24, 21, hy - 2);
      ctx.quadraticCurveTo(13, hy - 16, -1, hy - 16);
      ctx.quadraticCurveTo(-14, hy - 15, -20, hy - 1);
      break;
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (c.hairStyle === 'angel') {
    ctx.strokeStyle = '#ffd23c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(1, hy - 31, 17, 5.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#17121f'; ctx.lineWidth = 2.4;
  }
}

/** Vẽ icon vật phẩm. */
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
