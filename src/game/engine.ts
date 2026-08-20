import { sfx, initAudio, setMuted as setAudioMuted, getMuted } from './audio';
import { IMG } from '../story';
import { drawPixelHero, drawPixelMonster, renderPixelPortrait } from './pixel';

export const VIEW_W = 960;
export const VIEW_H = 540;
const GROUND = 476;
export const TOTAL_FLOORS = 100;
export const WAVES_PER_FLOOR = 7; // đợt 7 = boss (tầng có boss) hoặc đợt tinh nhuệ
// Tầng 1-30: boss mỗi tầng. Tầng 31-100: boss mỗi 10 tầng (40,50,...,100) → thêm 7 boss.
export function hasBossOnFloor(floorIdx: number): boolean {
  return floorIdx < 30 ? true : floorIdx % 10 === 9;
}
export function bossIndexForFloor(floorIdx: number): number {
  if (floorIdx < 30) return floorIdx;
  if (floorIdx < TOTAL_FLOORS) return 30 + Math.floor((floorIdx - 30) / 10);
  // endless: xoay vòng 37 boss
  return floorIdx % 37;
}
export function floorNameOf(floorIdx: number): string {
  if (floorIdx < FLOOR_NAMES.length) return FLOOR_NAMES[floorIdx];
  return `Vực Vô Tận ${floorIdx - FLOOR_NAMES.length + 1}`;
}
// Sau khi qua tầng X (index) → mở chương truyện tương ứng
export const STORY_AFTER: Record<number, number> = { 9: 1, 19: 2, 28: 3, 39: 4, 69: 5, 89: 6 };
export const SPEEDS = [1, 2, 3, 4, 6];
const SAVE_KEY = 'huyet-kiem-ca-idle-v2';
const CLASH_X = 640;

// ============ utils ============
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function fmt(n: number): string {
  const u: Array<[number, string]> = [
    [1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'],
    [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K'],
  ];
  for (const [v, s] of u) {
    if (n >= v) {
      const x = n / v;
      return (x >= 100 ? Math.floor(x).toString() : x.toFixed(1)) + s;
    }
  }
  return Math.floor(n).toString();
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ============ rarity / skills ============
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITY: Record<Rarity, { name: string; color: string; glow: string; stars: number }> = {
  common: { name: 'Thường', color: '#8fa3b8', glow: '#4a5a6e', stars: 1 },
  rare: { name: 'Hiếm', color: '#3fb9ff', glow: '#1868a8', stars: 2 },
  epic: { name: 'Cực Hiếm', color: '#ffb43c', glow: '#a86414', stars: 3 },
  legendary: { name: 'Huyền Thoại', color: '#ff4fd8', glow: '#8a1e6e', stars: 4 },
  mythic: { name: 'Thần Thoại', color: '#7dff5a', glow: '#2a9e1e', stars: 5 },
};
export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export type SkillId =
  | 'skinwall' | 'double' | 'pierce' | 'splash' | 'stun' | 'heal'
  | 'crit' | 'lifesteal' | 'buff' | 'thorns'
  | 'meteor' | 'execute' | 'strongheal' | 'berserk' | 'freeze'
  | 'holysplash' | 'flurry' | 'annihilate';

export interface CompanionSkill { id: SkillId; name: string; desc: string; }

// ============ chibi look ============
export interface ChibiLook {
  hair: string; outfit: string; outfit2: string; skin: string; eyes: string;
  hairStyle: 'spiky' | 'long' | 'bun' | 'hood' | 'wild' | 'pony' | 'twin' | 'short' | 'mohawk' | 'none';
  weapon: 'sword' | 'bow' | 'staff' | 'daggers' | 'orb' | 'shield' | 'spear' | 'none';
  accessory: 'none' | 'halo' | 'horns' | 'crown' | 'mask' | 'ears' | 'headband';
  cape?: string;
  aura: string;
}

export type Pos = 'front' | 'mid' | 'back';
export const MAX_PARTY = 50; // tối đa đồng hành được chọn ra trận

// ============ companions (20) ============
export interface CompanionDef {
  id: string; name: string; title: string;
  role: string; school: string; pos: Pos; rarity: Rarity;
  atkBase: number; hpBase: number; atkSpd: number; ranged: boolean;
  crit: number;
  skill: CompanionSkill;
  look: ChibiLook;
}

export const COMPANIONS: CompanionDef[] = [
  // ---- THƯỜNG ----
  {
    id: 'bram', name: 'Bram', title: 'Bức Tường Thép', role: 'Đấu Sĩ', school: 'Cuồng Nộ', pos: 'front', rarity: 'common',
    atkBase: 7, hpBase: 130, atkSpd: 0.85, ranged: false, crit: 0.05,
    skill: { id: 'skinwall', name: 'Bì Thạch', desc: 'Mình đồng da sắt — nhận ít hơn 30% sát thương.' },
    look: { hair: '#7a5230', outfit: '#8a4a3a', outfit2: '#5e3226', skin: '#e8b48a', eyes: '#4a2e1a', hairStyle: 'short', weapon: 'shield', accessory: 'none', aura: '#8fa3b8' },
  },
  {
    id: 'finn', name: 'Finn', title: 'Song Kiếm Gió', role: 'Kiếm Sĩ', school: 'Phong', pos: 'front', rarity: 'common',
    atkBase: 9, hpBase: 95, atkSpd: 1.1, ranged: false, crit: 0.08,
    skill: { id: 'double', name: 'Song Kiếm', desc: 'Mỗi đòn đánh chém thêm một nhát (70% sát thương).' },
    look: { hair: '#5aa0d0', outfit: '#3a6e5a', outfit2: '#274e40', skin: '#f0c49a', eyes: '#1e5a8a', hairStyle: 'spiky', weapon: 'daggers', accessory: 'headband', aura: '#8fa3b8' },
  },
  {
    id: 'toto', name: 'Tô Tô', title: 'Mũi Tên Xuyên', role: 'Cung Thủ', school: 'Xuyên Tâm', pos: 'back', rarity: 'common',
    atkBase: 9, hpBase: 70, atkSpd: 1.15, ranged: true, crit: 0.1,
    skill: { id: 'pierce', name: 'Xuyên Phá', desc: 'Mũi tên xuyên qua, trúng thêm 1 mục tiêu phía sau.' },
    look: { hair: '#e8a04a', outfit: '#a86428', outfit2: '#6e4218', skin: '#f5d0a8', eyes: '#8a5a1e', hairStyle: 'twin', weapon: 'bow', accessory: 'ears', aura: '#8fa3b8' },
  },
  {
    id: 'momo', name: 'Momo', title: 'Đóm Lửa Nhỏ', role: 'Pháp Sư', school: 'Viên Hỏa', pos: 'back', rarity: 'common',
    atkBase: 11, hpBase: 65, atkSpd: 0.9, ranged: true, crit: 0.05,
    skill: { id: 'splash', name: 'Bùng Cháy', desc: 'Phép nổ lan, gây 60% sát thương lên kẻ địch xung quanh.' },
    look: { hair: '#ff8a5a', outfit: '#c8452e', outfit2: '#7e2c1c', skin: '#ffe0c0', eyes: '#d0452a', hairStyle: 'bun', weapon: 'staff', accessory: 'none', aura: '#8fa3b8' },
  },
  {
    id: 'gau', name: 'Gấu Nhỏ', title: 'Thiết Quyền', role: 'Đấu Sĩ', school: 'Thiết Quyền', pos: 'front', rarity: 'common',
    atkBase: 8, hpBase: 110, atkSpd: 0.9, ranged: false, crit: 0.05,
    skill: { id: 'stun', name: 'Choáng Váng', desc: '25% cơ hội đấm choáng kẻ địch 0.8s.' },
    look: { hair: '#6a4a2e', outfit: '#9a7a4a', outfit2: '#5e4a2a', skin: '#e0a878', eyes: '#3a2412', hairStyle: 'mohawk', weapon: 'none', accessory: 'ears', aura: '#8fa3b8' },
  },
  {
    id: 'pip', name: 'Pip', title: 'Ngọn Đèn Nhỏ', role: 'Hỗ Trợ', school: 'Thánh Quang', pos: 'back', rarity: 'common',
    atkBase: 6, hpBase: 75, atkSpd: 1.0, ranged: true, crit: 0.03,
    skill: { id: 'heal', name: 'Hồi Máu', desc: 'Mỗi đòn đánh hồi máu cho đồng đội thấp máu nhất (40% sát thương).' },
    look: { hair: '#ffe9a8', outfit: '#e8e0c8', outfit2: '#a89e80', skin: '#ffe8d0', eyes: '#7a9a3a', hairStyle: 'bun', weapon: 'orb', accessory: 'halo', aura: '#8fa3b8' },
  },
  // ---- HIẾM ----
  {
    id: 'lyra', name: 'Lyra', title: 'Cung Thủ Lôi Điện', role: 'Cung Thủ', school: 'Lôi Điện', pos: 'back', rarity: 'rare',
    atkBase: 15, hpBase: 95, atkSpd: 1.2, ranged: true, crit: 0.12,
    skill: { id: 'crit', name: 'Lôi Tiễn', desc: '+15% chí mạng, mũi tên xuyên thêm 1 mục tiêu.' },
    look: { hair: '#ffd76e', outfit: '#4a7aa8', outfit2: '#2e4e70', skin: '#f5cfa8', eyes: '#2a7ad0', hairStyle: 'pony', weapon: 'bow', accessory: 'none', cape: '#2e4e70', aura: '#3fb9ff' },
  },
  {
    id: 'rhea', name: 'Rhea', title: 'Nữ Hoàng Băng', role: 'Pháp Sư', school: 'Băng Giá', pos: 'back', rarity: 'rare',
    atkBase: 15, hpBase: 85, atkSpd: 0.95, ranged: true, crit: 0.06,
    skill: { id: 'freeze', name: 'Đóng Băng', desc: '30% cơ hội đóng băng kẻ địch 0.8s.' },
    look: { hair: '#a8d8f0', outfit: '#5a8ac8', outfit2: '#38588a', skin: '#f0e0e8', eyes: '#3a8ad0', hairStyle: 'long', weapon: 'staff', accessory: 'crown', aura: '#3fb9ff' },
  },
  {
    id: 'kuro', name: 'Kuro', title: 'Bóng Đêm Cười', role: 'Sát Thủ', school: 'Ảnh Sát', pos: 'mid', rarity: 'rare',
    atkBase: 18, hpBase: 80, atkSpd: 1.4, ranged: false, crit: 0.15,
    skill: { id: 'crit', name: 'Điểm Yếu', desc: '+18% chí mạng, đòn chí mạng nhân 2.5 sát thương.' },
    look: { hair: '#3a3a4a', outfit: '#2a2a3a', outfit2: '#181824', skin: '#e8c8a8', eyes: '#d0303a', hairStyle: 'wild', weapon: 'daggers', accessory: 'mask', aura: '#3fb9ff' },
  },
  {
    id: 'fenrir', name: 'Fenrir', title: 'Sói Xám', role: 'Đấu Sĩ', school: 'Huyết Nguyệt', pos: 'front', rarity: 'rare',
    atkBase: 14, hpBase: 120, atkSpd: 1.0, ranged: false, crit: 0.1,
    skill: { id: 'lifesteal', name: 'Hút Máu', desc: 'Hồi máu bằng 30% sát thương gây ra.' },
    look: { hair: '#9aa0b0', outfit: '#5a6070', outfit2: '#3a3e4a', skin: '#d8b898', eyes: '#e8c83a', hairStyle: 'wild', weapon: 'spear', accessory: 'ears', cape: '#3a3e4a', aura: '#3fb9ff' },
  },
  {
    id: 'aria', name: 'Aria', title: 'Tiếng Hát Chiến Trường', role: 'Hỗ Trợ', school: 'Thánh Quang', pos: 'back', rarity: 'rare',
    atkBase: 12, hpBase: 90, atkSpd: 1.0, ranged: true, crit: 0.05,
    skill: { id: 'buff', name: 'Phúc Lành', desc: 'Tăng 12% Công cho TOÀN ĐỘI (cộng dồn).' },
    look: { hair: '#f0b8d8', outfit: '#e8d8f0', outfit2: '#a888c0', skin: '#ffe8e0', eyes: '#8a4ac0', hairStyle: 'long', weapon: 'orb', accessory: 'halo', aura: '#3fb9ff' },
  },
  {
    id: 'rocky', name: 'Rocky', title: 'Gai Nham Thạch', role: 'Đấu Sĩ', school: 'Nham Thạch', pos: 'front', rarity: 'rare',
    atkBase: 11, hpBase: 150, atkSpd: 0.75, ranged: false, crit: 0.04,
    skill: { id: 'thorns', name: 'Phản Đòn', desc: 'Kẻ đánh trúng Rocky nhận lại 60% sát thương.' },
    look: { hair: '#7a7a6a', outfit: '#8a7a5a', outfit2: '#5a5040', skin: '#c8a888', eyes: '#e8783a', hairStyle: 'mohawk', weapon: 'none', accessory: 'horns', aura: '#3fb9ff' },
  },
  // ---- CỰC HIẾM ----
  {
    id: 'mira', name: 'Mira', title: 'Pháp Sư Thiên Thạch', role: 'Pháp Sư', school: 'Lôi Điện', pos: 'back', rarity: 'epic',
    atkBase: 26, hpBase: 110, atkSpd: 1.0, ranged: true, crit: 0.1,
    skill: { id: 'meteor', name: 'Thiên Thạch', desc: 'Cứ 4 đòn gọi thiên thạch nổ diện rộng ×2.5 sát thương.' },
    look: { hair: '#b878e8', outfit: '#6a3aa8', outfit2: '#42246e', skin: '#f0d8c0', eyes: '#c84ae8', hairStyle: 'long', weapon: 'staff', accessory: 'crown', cape: '#42246e', aura: '#ffb43c' },
  },
  {
    id: 'hana', name: 'Hana', title: 'Lưỡi Hái Trăng Máu', role: 'Sát Thủ', school: 'Huyết Nguyệt', pos: 'mid', rarity: 'epic',
    atkBase: 30, hpBase: 100, atkSpd: 1.35, ranged: false, crit: 0.18,
    skill: { id: 'execute', name: 'Tử Hình', desc: 'Gấp đôi sát thương lên kẻ địch dưới 30% máu.' },
    look: { hair: '#e85a7a', outfit: '#8a1e3a', outfit2: '#4e1222', skin: '#f5d8c8', eyes: '#e81e4a', hairStyle: 'pony', weapon: 'daggers', accessory: 'none', cape: '#4e1222', aura: '#ffb43c' },
  },
  {
    id: 'yuki', name: 'Yuki', title: 'Hiền Nhân Tuyết', role: 'Hiền Nhân', school: 'Băng Tuyết', pos: 'back', rarity: 'epic',
    atkBase: 18, hpBase: 120, atkSpd: 0.95, ranged: true, crit: 0.05,
    skill: { id: 'strongheal', name: 'Cứu Thương', desc: 'Mỗi đòn đánh hồi 90% sát thương thành máu cho đồng đội.' },
    look: { hair: '#f0f4ff', outfit: '#a8c8e8', outfit2: '#6a8ab0', skin: '#fff0e8', eyes: '#4a9ad8', hairStyle: 'bun', weapon: 'staff', accessory: 'halo', aura: '#ffb43c' },
  },
  {
    id: 'orin', name: 'Orin', title: 'Kiếm Cuồng Nộ', role: 'Kiếm Sĩ', school: 'Cuồng Nộ', pos: 'front', rarity: 'epic',
    atkBase: 28, hpBase: 130, atkSpd: 1.1, ranged: false, crit: 0.12,
    skill: { id: 'berserk', name: 'Cuồng Chiến', desc: 'Dưới 50% máu: sát thương ×1.6.' },
    look: { hair: '#d05a2a', outfit: '#a83a1e', outfit2: '#642212', skin: '#e8b090', eyes: '#e8a01e', hairStyle: 'spiky', weapon: 'sword', accessory: 'horns', aura: '#ffb43c' },
  },
  {
    id: 'vex', name: 'Vex', title: 'Ấn Phong Ấn', role: 'Pháp Sư', school: 'Phong Ấn', pos: 'back', rarity: 'epic',
    atkBase: 24, hpBase: 105, atkSpd: 1.0, ranged: true, crit: 0.08,
    skill: { id: 'freeze', name: 'Trọng Lực', desc: '35% cơ hội đè bẹp — kẻ địch bất động 0.9s, nổ lan 50%.' },
    look: { hair: '#5a5a7a', outfit: '#3a3a5e', outfit2: '#22223a', skin: '#d8c8b8', eyes: '#a8a8e8', hairStyle: 'hood', weapon: 'orb', accessory: 'mask', aura: '#ffb43c' },
  },
  // ---- HUYỀN THOẠI ----
  {
    id: 'seraphina', name: 'Seraphina', title: 'Thiên Sứ Giáng Lâm', role: 'Thiên Sứ', school: 'Thần Phạt', pos: 'back', rarity: 'legendary',
    atkBase: 42, hpBase: 150, atkSpd: 1.15, ranged: true, crit: 0.15,
    skill: { id: 'holysplash', name: 'Thánh Vực', desc: 'Nổ thánh quang diện rộng + tăng 12% Công đội + hồi máu đồng đội.' },
    look: { hair: '#fff4c8', outfit: '#fffaf0', outfit2: '#d8c888', skin: '#fff0e0', eyes: '#e8b83a', hairStyle: 'long', weapon: 'orb', accessory: 'halo', cape: '#f0e8c8', aura: '#ff4fd8' },
  },
  {
    id: 'kagerou', name: 'Kagerou', title: 'Vô Ảnh Sát Thủ', role: 'Sát Thủ', school: 'Vô Ảnh', pos: 'mid', rarity: 'legendary',
    atkBase: 48, hpBase: 120, atkSpd: 1.7, ranged: false, crit: 0.25,
    skill: { id: 'flurry', name: 'Loạn Trảm', desc: 'Chém 2 nhát liên hoàn, +25% chí mạng, tốc đánh +20%.' },
    look: { hair: '#2a2e3a', outfit: '#3a4258', outfit2: '#1e2230', skin: '#e8d0b8', eyes: '#3ae8c8', hairStyle: 'wild', weapon: 'daggers', accessory: 'mask', cape: '#1e2230', aura: '#ff4fd8' },
  },
  {
    id: 'vulcan', name: 'Vulcan', title: 'Chiến Thần Viêm Vương', role: 'Chiến Thần', school: 'Viêm Vương', pos: 'front', rarity: 'legendary',
    atkBase: 44, hpBase: 200, atkSpd: 1.0, ranged: false, crit: 0.15,
    skill: { id: 'annihilate', name: 'Diệt Thế', desc: 'Chém lan diện rộng + Tử Hình kẻ dưới 30% máu + phản đòn 60%.' },
    look: { hair: '#ff5a1e', outfit: '#8a2a12', outfit2: '#4a160a', skin: '#e0a878', eyes: '#ffd23a', hairStyle: 'spiky', weapon: 'sword', accessory: 'horns', cape: '#4a160a', aura: '#ff4fd8' },
  },
];

// ============ generator: +50 đồng hành (tới bậc Mythic) ============
(function genCompanions(): void {
  const NAMES = [
    'Aizen', 'Bella', 'Cyrus', 'Dahlia', 'Ezra', 'Freya', 'Gideon', 'Hazel', 'Iris', 'Jasper',
    'Kira', 'Lorelei', 'Magnus', 'Nadia', 'Orion', 'Petra', 'Quinn', 'Rowan', 'Selene', 'Thorne',
    'Ursa', 'Vesper', 'Wren', 'Xander', 'Yara', 'Zephyrine', 'Alaric', 'Brynhild', 'Cassius', 'Delphine',
    'Elias', 'Faye', 'Gawain', 'Hestia', 'Isolde', 'Jareth', 'Kaia', 'Lucian', 'Maeve', 'Nyx',
    'Oberon', 'Persephone', 'Ragnar', 'Sable', 'Titan', 'Undine', 'Valka', 'Wyatt', 'Xenos', 'Ysolde',
  ];
  const ROLES = ['Kiếm Sĩ', 'Pháp Sư', 'Cung Thủ', 'Đấu Sĩ', 'Sát Thủ', 'Hỗ Trợ', 'Hiền Nhân', 'Kỵ Sĩ'];
  const SCHOOLS = ['Huyết Nguyệt', 'Lôi Điện', 'Băng Giá', 'Viêm Vương', 'Thánh Quang', 'Ảnh Sát', 'Nham Thạch', 'Phong Bạo', 'Hư Không', 'Thiết Quyền'];
  const SKILLSET: Array<{ id: SkillId; name: string; desc: string }> = [
    { id: 'double', name: 'Song Trảm', desc: 'Mỗi đòn đánh chém thêm một nhát (70% sát thương).' },
    { id: 'pierce', name: 'Xuyên Thấu', desc: 'Đòn đánh xuyên thêm 1 mục tiêu.' },
    { id: 'splash', name: 'Bùng Nổ', desc: 'Gây 60% sát thương lan ra kẻ địch xung quanh.' },
    { id: 'stun', name: 'Đánh Choáng', desc: '25% cơ hội làm choáng kẻ địch 0.8s.' },
    { id: 'heal', name: 'Trị Liệu', desc: 'Hồi máu cho đồng đội thấp máu nhất.' },
    { id: 'crit', name: 'Tử Huyệt', desc: '+18% chí mạng, chí mạng nhân 2.5 sát thương.' },
    { id: 'lifesteal', name: 'Hút Hồn', desc: 'Hồi máu bằng 30% sát thương gây ra.' },
    { id: 'buff', name: 'Cường Hóa', desc: 'Tăng 12% Công cho toàn đội (cộng dồn).' },
    { id: 'thorns', name: 'Gai Góc', desc: 'Kẻ đánh trúng nhận lại 60% sát thương.' },
    { id: 'meteor', name: 'Thiên Thạch', desc: 'Cứ 4 đòn gọi thiên thạch nổ diện rộng ×2.5.' },
    { id: 'execute', name: 'Kết Liễu', desc: 'Gấp đôi sát thương lên kẻ dưới 30% máu.' },
    { id: 'strongheal', name: 'Đại Trị Liệu', desc: 'Hồi máu mạnh cho đồng đội thấp máu nhất.' },
    { id: 'berserk', name: 'Cuồng Chiến', desc: 'Dưới 50% máu tăng 60% sát thương.' },
    { id: 'freeze', name: 'Băng Phong', desc: '30% cơ hội đóng băng kẻ địch 0.8s.' },
    { id: 'flurry', name: 'Loạn Vũ', desc: 'Chém 2 nhát liên hoàn, +25% chí mạng.' },
    { id: 'annihilate', name: 'Tận Diệt', desc: 'Chém lan + Tử Hình kẻ dưới 30% máu.' },
  ];
  const HAIRS = ['#2a2a33', '#ffd76e', '#a8d8f0', '#3a3a4a', '#9aa0b0', '#f0b8d8', '#b878e8', '#e85a7a', '#f5f5f0', '#ff8a3c', '#5ae8c8', '#c83a3a', '#e8e8f0', '#7a5ae8', '#3ae85a'];
  const OUTFITS = ['#3a3a46', '#4a7aa8', '#5a8ac8', '#2a2a3a', '#5a6070', '#e8d8f0', '#6a3aa8', '#8a1e3a', '#d8d8e0', '#a8542a', '#2a8a6a', '#8a2a2a', '#c0c0d0', '#5a3aa8', '#2a8a3a'];
  const STYLES: ChibiLook['hairStyle'][] = ['spiky', 'long', 'bun', 'hood', 'wild', 'pony', 'twin', 'short', 'mohawk'];
  const WEAPONS: ChibiLook['weapon'][] = ['sword', 'bow', 'staff', 'daggers', 'orb', 'shield', 'spear'];
  const ACCESS: ChibiLook['accessory'][] = ['none', 'halo', 'horns', 'crown', 'mask', 'ears', 'headband'];
  const AURAS = ['#8fa3b8', '#3fb9ff', '#ffb43c', '#ff4fd8', '#7dff5a'];
  const SKINS_TONE = ['#e8bd93', '#f0c49a', '#f5d0a8', '#ffe0c0', '#e0a878', '#d8b898', '#f5cfa8', '#ffe8d0'];
  const POSPOOL: Pos[] = ['front', 'mid', 'back'];

  for (let i = 0; i < NAMES.length; i++) {
    const n = NAMES[i];
    const tierRoll = i % 10;
    const rarity: Rarity = i >= 44 ? 'mythic' : tierRoll < 4 ? 'common' : tierRoll < 7 ? 'rare' : tierRoll < 9 ? 'epic' : 'legendary';
    const rIdx = RARITY_ORDER.indexOf(rarity);
    const skill = SKILLSET[i % SKILLSET.length];
    const pos = POSPOOL[i % 3];
    const ranged = pos === 'back' || (pos === 'mid' && i % 2 === 1);
    const hair = HAIRS[i % HAIRS.length];
    const outfit = OUTFITS[i % OUTFITS.length];
    const mul = 1 + rIdx * 0.55;
    COMPANIONS.push({
      id: `gen_${n.toLowerCase()}`,
      name: n,
      title: `Chiến Binh ${SCHOOLS[i % SCHOOLS.length]}`,
      role: ROLES[i % ROLES.length],
      school: SCHOOLS[i % SCHOOLS.length],
      pos, rarity,
      atkBase: Math.round((8 + (i % 7) * 2) * mul),
      hpBase: Math.round((80 + (i % 5) * 25) * mul),
      atkSpd: 0.85 + (i % 4) * 0.12,
      ranged,
      crit: 0.05 + rIdx * 0.03,
      skill: { id: skill.id, name: skill.name, desc: skill.desc },
      look: {
        hair, outfit, outfit2: shadeHex(outfit, -0.35), skin: SKINS_TONE[i % SKINS_TONE.length],
        eyes: AURAS[rIdx], hairStyle: STYLES[i % STYLES.length], weapon: WEAPONS[i % WEAPONS.length],
        accessory: ACCESS[i % ACCESS.length], aura: AURAS[rIdx],
        cape: rIdx >= 2 ? shadeHex(outfit, -0.5) : undefined,
      },
    });
  }
})();
function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255; let g = (n >> 8) & 255; let b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + amt))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + amt))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
  const to = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// ============ Kael skins ============
export interface SkinDef { id: string; name: string; desc: string; look: ChibiLook; }
export const SKINS: SkinDef[] = [
  {
    id: 'default', name: 'Kiếm Sĩ Đen', desc: 'Bộ giáp ám đen nhuốm máu trận mạc.',
    look: { hair: '#2a2a33', outfit: '#3a3a46', outfit2: '#22222c', skin: '#e8bd93', eyes: '#4a3520', hairStyle: 'spiky', weapon: 'sword', accessory: 'none', cape: '#2a1520', aura: '#c2172f' },
  },
  {
    id: 'crimson', name: 'Huyết Nguyệt Cuồng Chiến', desc: 'Giáp đỏ rực như trăng máu đêm thực nhật.',
    look: { hair: '#f0f0f5', outfit: '#8a1626', outfit2: '#4e0c16', skin: '#e8bd93', eyes: '#e81e3a', hairStyle: 'spiky', weapon: 'sword', accessory: 'horns', cape: '#3a0a12', aura: '#ff3b52' },
  },
  {
    id: 'gold', name: 'Thánh Kỵ Sĩ', desc: 'Giáp vàng ánh kim của đoàn kỵ sĩ vương đô.',
    look: { hair: '#e8c25a', outfit: '#d8b848', outfit2: '#8a7428', skin: '#e8bd93', eyes: '#2a5a8a', hairStyle: 'short', weapon: 'sword', accessory: 'crown', cape: '#c83030', aura: '#ffd23c' },
  },
  {
    id: 'shadow', name: 'Ảnh Sát Giả', desc: 'Tan vào bóng tối — chỉ còn ánh mắt đỏ.',
    look: { hair: '#1a1a24', outfit: '#24243a', outfit2: '#12121e', skin: '#d8b898', eyes: '#e81e3a', hairStyle: 'hood', weapon: 'daggers', accessory: 'mask', aura: '#8a4ae8' },
  },
];
export const SKIN_COST: Record<string, number> = { crimson: 500, gold: 800, shadow: 800 };

// ============ items ============
export interface ItemDef { id: string; name: string; desc: string; bonus: { hp?: number; atk?: number; crit?: number; aspd?: number }; }
export const ITEMS: ItemDef[] = [
  { id: 'sword', name: 'Kiếm Huyết Nguyệt', desc: '+12% Công mỗi bản sao', bonus: { atk: 0.12 } },
  { id: 'fang', name: 'Nanh Quỷ', desc: '+3% Chí mạng mỗi bản sao', bonus: { crit: 0.03 } },
  { id: 'armor', name: 'Giáp Xương Rồng', desc: '+12% Máu mỗi bản sao', bonus: { hp: 0.12 } },
  { id: 'boots', name: 'Ủng Gió Đêm', desc: '+6% Tốc đánh mỗi bản sao', bonus: { aspd: 0.06 } },
  { id: 'ring', name: 'Nhẫn Dấu Ấn', desc: '+8% Công & Máu', bonus: { atk: 0.08, hp: 0.08 } },
  { id: 'cloak', name: 'Áo Choàng Thực Nhật', desc: '+5% Chí mạng & 6% Máu', bonus: { crit: 0.05, hp: 0.06 } },
  { id: 'talisman', name: 'Bùa Hộ Mệnh', desc: '+15% Máu mỗi bản sao', bonus: { hp: 0.15 } },
  { id: 'orb', name: 'Ngọc Cuồng Nộ', desc: '+10% Công & 5% Tốc đánh', bonus: { atk: 0.1, aspd: 0.05 } },
  { id: 'crown', name: 'Vương Miện Sọ Người', desc: '+10% Công & 4% Chí mạng', bonus: { atk: 0.1, crit: 0.04 } },
];
export const GACHA_COST = 100;
export const GACHA_X10_COST = 900;
export const GACHA_X100_COST = 8500;
export const GACHA_X500_COST = 40000;
export const GACHA_X1000_COST = 80000;
export const WGACHA_COST = 150;

// ============ 200 vũ khí ============
export interface WeaponDef { id: string; name: string; tier: Rarity; baseAtk: number; }
export const WEAPONS: WeaponDef[] = (() => {
  const PREFIX: Record<Rarity, string[]> = {
    common: ['Sắt', 'Gỗ', 'Đồng', 'Thép Cùn'],
    rare: ['Bạc', 'Lam Ngọc', 'Gai', 'Sói'],
    epic: ['Huyết', 'Lôi', 'Băng', 'Hỏa'],
    legendary: ['Hắc Nguyệt', 'Long Cốt', 'Thánh Quang', 'Vực Sâu'],
    mythic: ['Khởi Nguồn', 'Hỗn Mang', 'Vĩnh Cửu', 'Thần Phạt'],
  };
  const BASE = ['Kiếm', 'Đại Đao', 'Thương', 'Cung', 'Trượng', 'Song Kiếm', 'Búa', 'Lưỡi Hái'];
  const COUNT: Array<[Rarity, number, number]> = [
    ['common', 60, 6], ['rare', 50, 18], ['epic', 40, 45], ['legendary', 35, 110], ['mythic', 15, 260],
  ];
  const out: WeaponDef[] = [];
  let idx = 0;
  for (const [tier, n, atk] of COUNT) {
    const ps = PREFIX[tier];
    for (let i = 0; i < n; i++) {
      const name = `${ps[i % ps.length]} ${BASE[(i + idx) % BASE.length]} ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''}`;
      out.push({ id: `wp_${tier}_${i}`, name, tier, baseAtk: Math.round(atk * (1 + (i % 10) * 0.08)) });
      idx++;
    }
  }
  return out;
})();

// ============ 30 tầng & boss ============
export const FLOOR_NAMES = [
  'Cổng Xương', 'Hầm Rêu', 'Điện Gãy', 'Hang Dơi', 'Hành Lang Tro', 'Giếng Sâu', 'Vườn Gai', 'Cầu Than Thở', 'Ngục Rỉ Sét', 'Điện Phản Thệ',
  'Bờ Máu', 'Nhà Thờ Đắm', 'Hầm Gai', 'Đầm Lầy Dạ Quang', 'Thư Viện Cháy', 'Phòng Gương', 'Chuông Vỡ', 'Lò Mổ Cũ', 'Vực Than Khóc', 'Điện Đói Khát',
  'Thềm Thực Nhật', 'Rừng Treo Ngược', 'Sa Mạc Xương', 'Biển Tĩnh Lặng', 'Thành Phố Chìm', 'Cổng Sao Rơi', 'Điện Gió Gào', 'Lối Đi Không Tên', 'Bậc Thang Cuối', 'Ngai Vĩnh Cửu',
  // --- Vực Sâu (tầng 31-40) ---
  'Bãi Chiến Xưa', 'Hầm Cột Gãy', 'Đường Gai Mọc', 'Giếng Khô', 'Phòng Thờ Cũ', 'Cầu Sắt Rỉ', 'Hang Tro Nén', 'Vực Gió Lùa', 'Điện Đổ Nát', 'Cổng Vực Sâu',
  // --- Hầm Máu (tầng 41-50) ---
  'Sông Máu Ngầm', 'Nhà Xác Trôi', 'Đầm Dạ Quang', 'Hầm Thịt', 'Thư Viện Mốc', 'Phòng Gương Vỡ', 'Chuông Đắm', 'Lò Luyện Tội', 'Vực Khóc Than', 'Điện Huyết Vương',
  // --- Vực Trời (tầng 51-60) ---
  'Thềm Sao Rơi', 'Rừng Ngược', 'Sa Mạc Tro', 'Biển Không Sóng', 'Thành Chìm', 'Cổng Thiên Thạch', 'Điện Gió', 'Hành Lang Vô Danh', 'Bậc Thang Xoắn', 'Ngai Sụp Đổ',
  // --- Băng Đen (tầng 61-70) ---
  'Hầm Băng Đen', 'Cột Sống Khổng Lồ', 'Động Pha Lê', 'Suối Quên Lãng', 'Cầu Vồng Gãy', 'Vườn Tượng Đá', 'Phòng Thời Gian', 'Hang Phản Chiếu', 'Lối Mòn Vô Tận', 'Cổng Trời Sụp',
  // --- Lửa Tàn (tầng 71-80) ---
  'Điện Lửa Tàn', 'Ruộng Xương Trắng', 'Tháp Nghiêng', 'Đầm Lầy Sôi', 'Hầm Mộ Vua', 'Cổng Sừng Quỷ', 'Phòng Giam Thần', 'Hành Lang Gai Nhọn', 'Vực Sấm Rền', 'Điện Phán Xét',
  // --- Trăng Máu (tầng 81-90) ---
  'Bến Đò Âm', 'Rừng Mắt Mở', 'Đồi Than Hồng', 'Cầu Hồn Vượt', 'Thung Lũng Quên', 'Cổng Trăng Máu', 'Điện Sương Mù', 'Hang Đom Đóm Ma', 'Bậc Vĩnh Biệt', 'Ngai Hư Không',
  // --- Hỗn Mang (tầng 91-100) ---
  'Cổng Hỗn Mang', 'Hành Lang Lưỡi', 'Phòng Ký Ức', 'Vực Phản Bội', 'Cầu Định Mệnh', 'Điện Tro Tàn', 'Hang Thần Chết', 'Lối Cuối Cùng', 'Bậc Thăng Thiên', 'Ngai Chúa Tể',
];
const BOSS_KINDS = ['knight', 'ogre', 'lich', 'demon', 'queen'] as const;
export interface BossDef { name: string; kind: (typeof BOSS_KINDS)[number]; }
export const BOSSES: BossDef[] = [
  { name: 'Zogma Kẻ Nghiền Xương', kind: 'ogre' }, { name: 'Nyx Dơi Chúa', kind: 'demon' }, { name: 'Marrow Cốt Tướng', kind: 'knight' },
  { name: 'Umbra Hầu Bóng', kind: 'lich' }, { name: 'Grimm Thợ Gặt Nhí', kind: 'knight' }, { name: 'Slaug Chúa Tể Gai', kind: 'ogre' },
  { name: 'Vexxa Góa Phụ Đen', kind: 'queen' }, { name: 'Drowner Quỷ Đầm Lầy', kind: 'demon' }, { name: 'Karzeth Hiệp Sĩ Tro', kind: 'knight' },
  { name: 'MORGRIM — Kị Sĩ Phản Thệ', kind: 'knight' },
  { name: 'Huyết Hầu Tước Varnek', kind: 'demon' }, { name: 'Ozzie Hàm Thép', kind: 'ogre' }, { name: 'Crypta Nữ Tu Máu', kind: 'queen' },
  { name: 'Fenwick Kẻ Đói', kind: 'ogre' }, { name: 'Skraal Chúa Đàn Dơi', kind: 'demon' }, { name: 'Lillith Búp Bê Gương', kind: 'queen' },
  { name: 'Thane Chuông Tử', kind: 'lich' }, { name: 'Bolgath Đao Phủ', kind: 'ogre' }, { name: 'Morgatha Mụ Phù Thủy', kind: 'lich' },
  { name: 'ISHVARA — Sứ Đồ Đói Khát', kind: 'queen' },
  { name: 'Azkel Thiên Sứ Sa Ngã', kind: 'demon' }, { name: 'Root Vua Rừng Treo', kind: 'ogre' }, { name: 'Xol Chúa Tể Sa Mạc', kind: 'lich' },
  { name: 'Thủy Quái Leviar', kind: 'queen' }, { name: 'Dusk Bóng Đèn Tắt', kind: 'lich' }, { name: 'Astraeus Kẻ Ăn Sao', kind: 'demon' },
  { name: 'Zephyr Linh Hồn Gió', kind: 'lich' }, { name: 'Null Kẻ Vô Danh', kind: 'knight' }, { name: 'Omega Hộ Vệ Ngai', kind: 'knight' },
  { name: 'VÔ DIỆN THẦN — Bàn Tay Trái', kind: 'demon' },
  // --- 7 Chúa Tể Vực Sâu (tầng 40 → 100) ---
  { name: 'VEXAL — Chúa Tể Vực Sâu', kind: 'demon' },
  { name: 'CARMILLA — Huyết Nữ Hoàng', kind: 'queen' },
  { name: 'ZERATH — Kẻ Nuốt Sao', kind: 'lich' },
  { name: 'KORGATH — Thần Sấm Sụp Đổ', kind: 'ogre' },
  { name: 'ARCHON — Thẩm Phán Lửa', kind: 'knight' },
  { name: 'NYX — Hình Hài Vô Định', kind: 'demon' },
  { name: 'CHÚA TỂ HỖN MANG — Khởi Nguồn', kind: 'demon' },
];

// ============ types ============
export interface HeroUnit {
  uid: string; isKael: boolean; defId: string; level: number;
  atk: number; maxHp: number; hp: number; aspd: number; crit: number;
  ranged: boolean; pos: Pos;
  x: number; slotY: number; atkCd: number; swing: number; hurtT: number; frozenT: number; hitCount: number; dead: boolean;
  look: ChibiLook; skill: SkillId; def: CompanionDef | null;
}
export interface Enemy {
  uid: number; kind: string; boss: boolean; bossIdx: number;
  hp: number; maxHp: number; atk: number; atkCd: number; swing: number;
  x: number; hover: number; stunT: number; hurtT: number; scale: number; walk: number;
  skillCd: number; telegraph: number; dead: boolean; tint: string; eye: string;
}
interface Proj { x: number; y: number; tx: number; ty: number; target: string; speed: number; dmg: number; kind: 'arrow' | 'magic' | 'light' | 'acid' | 'bolt' | 'meteor'; t: number; splash: number; crit: number; ally: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; g: number; life: number; maxLife: number; size: number; color: string; shape: 'spark' | 'ember' | 'slash' | 'smoke' | 'ice'; rot: number; vr: number; }
interface FloatText { x: number; y: number; text: string; color: string; life: number; size: number; }
interface Toast { text: string; color: string; life: number; }
interface Pickup { x: number; y: number; vy: number; vx: number; kind: 'gold' | 'gem' | 'scroll'; val: number; life: number; }
interface SpawnReq { kind: string; delay: number; }

export interface EndStats { kills: number; gold: number; playTime: number; }
export interface CompanionSlot { id: string; name: string; rarity: Rarity; level: number; power: number; pos: Pos; }
export interface OwnedItem { id: string; name: string; count: number; }
export interface HudState {
  floor: number; wave: number; inBoss: boolean; bossName: string; bossHpPct: number;
  gold: number; gems: number; kaelLevel: number; asc: number; power: number; floorName: string;
}
export interface MetaInfo {
  gold: number; gems: number; kaelLevel: number; kaelXp: number; kaelXpNext: number; asc: number;
  floor: number; wave: number; kills: number; playTime: number; speed: number; muted: boolean; paused: boolean;
  ownedCompanions: Record<string, number>; party: CompanionSlot[];
  ownedSkins: string[]; equippedSkin: string; ownedItems: OwnedItem[]; equippedItems: string[];
  deployedIds: string[] | null; legionCount: number;
  hud: HudState;
}
export type EngineEvent =
  | { type: 'story'; chapter: number }
  | { type: 'victory'; stats: EndStats }
  | { type: 'toast'; text: string; color?: string }
  | { type: 'meta' };

export interface GachaResult { kind: 'companion' | 'skin' | 'item'; id: string; name: string; rarity: Rarity; isNew: boolean; dupeText: string; }

// ============ chibi draw ============
function chibiLegs(ctx: CanvasRenderingContext2D, outfit2: string, walk: number, airborne: number): void {
  ctx.strokeStyle = 'rgba(20,10,25,0.9)';
  ctx.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    const sw = Math.sin(walk + (side > 0 ? 0 : Math.PI)) * (1 - airborne);
    ctx.save();
    ctx.translate(side * 8, -32);
    ctx.rotate(sw * 0.55);
    ctx.fillStyle = outfit2;
    rr(ctx, -6, 0, 12, 24, 6);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2c2028';
    rr(ctx, -7, 18, 14, 9, 4);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function chibiHead(ctx: CanvasRenderingContext2D, look: ChibiLook, mouthOpen: number, t: number): void {
  const hy = -92 + Math.sin(t * 2) * 1.2;
  ctx.strokeStyle = 'rgba(20,10,25,0.95)';
  ctx.lineWidth = 3;
  // hair back
  ctx.fillStyle = look.hair;
  if (look.hairStyle === 'long' || look.hairStyle === 'pony') {
    ctx.beginPath();
    ctx.ellipse(-4, hy + 8, 26, 34, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  if (look.hairStyle === 'twin') {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 24, hy + 12, 9, 20, s * 0.2, 0, Math.PI * 2); ctx.fill(); }
  }
  if (look.hairStyle === 'pony') {
    ctx.beginPath(); ctx.ellipse(-26, hy + 14, 8, 22, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  // head
  ctx.fillStyle = look.skin;
  ctx.beginPath(); ctx.arc(0, hy, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hair front by style
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  if (look.hairStyle === 'spiky' || look.hairStyle === 'wild' || look.hairStyle === 'mohawk') {
    ctx.moveTo(-25, hy - 4);
    const spikes = look.hairStyle === 'mohawk' ? 4 : 7;
    for (let i = 0; i <= spikes; i++) {
      const px = -25 + (50 / spikes) * i;
      const up = look.hairStyle === 'mohawk' ? (i > 0 && i < spikes ? 20 : 4) : (i % 2 === 0 ? 16 : 10) + Math.sin(i * 7) * 3;
      ctx.lineTo(px, hy - 12 - up);
      ctx.lineTo(px + 50 / spikes / 2, hy - 14);
    }
    ctx.lineTo(25, hy - 2);
    ctx.quadraticCurveTo(0, hy - 22, -25, hy - 4);
  } else if (look.hairStyle === 'hood') {
    ctx.arc(0, hy - 2, 27, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(26, hy + 6); ctx.lineTo(-26, hy + 6);
  } else if (look.hairStyle === 'bun') {
    ctx.arc(0, hy - 6, 25, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(2, hy - 30, 10, 0, Math.PI * 2);
  } else if (look.hairStyle === 'long' || look.hairStyle === 'pony') {
    ctx.arc(0, hy - 4, 25, Math.PI * 1.0, Math.PI * 2.0);
    ctx.quadraticCurveTo(26, hy + 2, 20, hy + 10);
    ctx.lineTo(-24, hy + 4);
  } else if (look.hairStyle === 'short') {
    ctx.arc(0, hy - 4, 25, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(14, hy - 10, -25, hy - 2);
  } else if (look.hairStyle === 'twin') {
    ctx.arc(0, hy - 4, 25, Math.PI * 1.0, Math.PI * 2.0);
    ctx.quadraticCurveTo(20, hy - 4, 24, hy + 4);
    ctx.lineTo(-24, hy + 4);
  } else {
    ctx.arc(0, hy - 6, 25, Math.PI, Math.PI * 2);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (look.hairStyle === 'bun') { ctx.beginPath(); ctx.arc(2, hy - 30, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // eyes
  for (const ex of [7, 17]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ex, hy - 1, 5.4, 7.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,25,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = look.eyes;
    ctx.beginPath(); ctx.ellipse(ex + 1.2, hy, 3.4, 4.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#151018';
    ctx.beginPath(); ctx.ellipse(ex + 1.6, hy + 1, 1.8, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex + 2.6, hy - 2.4, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  // mouth
  ctx.strokeStyle = '#5e2a30'; ctx.lineWidth = 2;
  ctx.beginPath();
  if (mouthOpen > 0.4) { ctx.fillStyle = '#7e3242'; ctx.ellipse(12, hy + 11, 4, 4.5 * mouthOpen, 0, 0, Math.PI * 2); ctx.fill(); }
  else ctx.arc(12, hy + 9, 4, 0.15, Math.PI - 0.5);
  ctx.stroke();
  // accessory
  if (look.accessory === 'halo') {
    ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(0, hy - 34 + Math.sin(t * 3) * 2, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (look.accessory === 'horns') {
    ctx.fillStyle = '#e8e0d0'; ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 14, hy - 20); ctx.lineTo(s * 22, hy - 34); ctx.lineTo(s * 8, hy - 24); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (look.accessory === 'crown') {
    ctx.fillStyle = '#ffd23c'; ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, hy - 22); ctx.lineTo(-14, hy - 32); ctx.lineTo(-6, hy - 24); ctx.lineTo(0, hy - 35); ctx.lineTo(6, hy - 24); ctx.lineTo(14, hy - 32); ctx.lineTo(14, hy - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (look.accessory === 'mask') {
    ctx.fillStyle = 'rgba(20,16,28,0.92)';
    rr(ctx, -6, hy + 4, 28, 12, 5); ctx.fill();
  }
  if (look.accessory === 'ears') {
    ctx.fillStyle = look.hair; ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 12, hy - 18); ctx.lineTo(s * 22, hy - 36); ctx.lineTo(s * 2, hy - 24); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  if (look.accessory === 'headband') {
    ctx.fillStyle = '#c83030';
    rr(ctx, -24, hy - 16, 48, 7, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,25,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
  }
}

export function drawChibiHero(ctx: CanvasRenderingContext2D, look: ChibiLook, t: number, walk: number, lunge: number, scale: number, facing: number, frozen: number): void {
  ctx.save();
  ctx.scale(scale * facing, scale);
  if (frozen > 0) { ctx.globalAlpha = 0.75; }
  const mouth = lunge;
  // aura
  ctx.globalAlpha *= 0.5 + 0.2 * Math.sin(t * 4);
  ctx.fillStyle = look.aura;
  ctx.beginPath(); ctx.ellipse(0, 2, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = frozen > 0 ? 0.75 : 1;
  // cape
  if (look.cape) {
    ctx.fillStyle = look.cape;
    ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, -66);
    ctx.quadraticCurveTo(-34 - Math.sin(t * 6) * 5, -40, -26 - Math.sin(t * 5) * 6, -8);
    ctx.lineTo(-8, -34);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  chibiLegs(ctx, look.outfit2, walk, 0);
  // body
  ctx.strokeStyle = 'rgba(20,10,25,0.95)'; ctx.lineWidth = 3;
  ctx.fillStyle = look.outfit;
  rr(ctx, -17, -68, 34, 38, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = look.outfit2;
  rr(ctx, -17, -42, 34, 9, 4); ctx.fill(); ctx.stroke();
  // back arm
  ctx.fillStyle = look.outfit;
  ctx.save(); ctx.translate(-12, -60); ctx.rotate(0.5 + Math.sin(walk) * 0.2);
  rr(ctx, -5, 0, 10, 22, 5); ctx.fill(); ctx.stroke(); ctx.restore();
  // head
  chibiHead(ctx, look, mouth, t);
  // front arm + weapon
  ctx.save();
  ctx.translate(12, -60);
  const swingAng = lunge > 0 ? lerp(-2.5, 0.75, lunge) : -0.55 + Math.sin(walk) * 0.12;
  ctx.rotate(swingAng);
  ctx.fillStyle = look.outfit;
  rr(ctx, -5, 0, 10, 24, 5); ctx.fill(); ctx.stroke();
  drawWeapon(ctx, look.weapon, lunge, look.aura);
  ctx.restore();
  if (frozen > 0) {
    ctx.fillStyle = 'rgba(120,200,255,0.45)';
    ctx.beginPath(); ctx.ellipse(0, -55, 30, 58, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a8e0ff'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Vẽ chân dung chibi vào canvas (dùng cho UI: gacha, đội hình, HUD, skin). */
export function renderChibiPortrait(canvas: HTMLCanvasElement, look: ChibiLook, t: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  // vầng hào quang sau lưng
  const g = ctx.createRadialGradient(w / 2, h * 0.52, 2, w / 2, h * 0.52, h * 0.56);
  g.addColorStop(0, withAlpha(look.aura, 0.42 + 0.12 * Math.sin(t * 3)));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // bóng đất
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.93, w * 0.3, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  const s = h / 64;
  ctx.translate(w / 2, h * 0.93 - Math.abs(Math.sin(t * 2.3)) * h * 0.022);
  drawPixelHero(ctx, look, t, 0, 0, s, 1, 0);
  ctx.restore();
}

function drawWeapon(ctx: CanvasRenderingContext2D, w: ChibiLook['weapon'], lunge: number, aura: string): void {
  ctx.strokeStyle = 'rgba(20,10,25,0.95)';
  ctx.lineWidth = 2.5;
  if (w === 'sword') {
    ctx.save(); ctx.translate(0, 22); ctx.rotate(-0.25);
    ctx.fillStyle = '#3a2e28'; rr(ctx, -4, 0, 8, 14, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23c'; rr(ctx, -10, -5, 20, 7, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8dce8';
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-5, -78); ctx.lineTo(0, -88); ctx.lineTo(5, -78); ctx.lineTo(8, -5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (lunge > 0.3) { ctx.fillStyle = aura; ctx.globalAlpha = lunge * 0.6; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  } else if (w === 'daggers') {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 6, 20); ctx.rotate(s * 0.35);
      ctx.fillStyle = '#d8dce8';
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, -34); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a2e28'; rr(ctx, -3, 0, 6, 8, 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  } else if (w === 'bow') {
    ctx.save(); ctx.translate(2, 16);
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 26, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(26 * Math.cos(-1.2), 26 * Math.sin(-1.2)); ctx.lineTo(26 * Math.cos(1.2), 26 * Math.sin(1.2)); ctx.stroke();
    if (lunge > 0.2) { ctx.strokeStyle = aura; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(16 * lunge, 0); ctx.lineTo(0, 20); ctx.stroke(); }
    ctx.restore();
  } else if (w === 'staff') {
    ctx.save(); ctx.translate(2, 18); ctx.rotate(-0.3);
    ctx.strokeStyle = 'rgba(20,10,25,0.95)'; ctx.lineWidth = 2.5;
    ctx.fillStyle = '#6a4a30'; rr(ctx, -3, -52, 6, 70, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -58, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-3, -61, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (w === 'orb') {
    ctx.save(); ctx.translate(8, 14);
    ctx.fillStyle = aura; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(0, -6 + Math.sin(lunge * 9) * 2, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(20,10,25,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-3, -9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (w === 'spear') {
    ctx.save(); ctx.translate(0, 20); ctx.rotate(-0.4);
    ctx.fillStyle = '#6a4a30'; rr(ctx, -2.5, -64, 5, 84, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8dce8';
    ctx.beginPath(); ctx.moveTo(-6, -62); ctx.lineTo(0, -84); ctx.lineTo(6, -62); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (w === 'shield') {
    ctx.save(); ctx.translate(-4, 16);
    ctx.fillStyle = '#8a8a98';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c83030'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ============ monster chibi ============
function drawMonsterChibi(ctx: CanvasRenderingContext2D, kind: string, tint: string, eye: string, t: number, walk: number, swing: number, scale: number, stun: number, boss: boolean): void {
  ctx.save();
  ctx.scale(-scale, scale); // face left
  ctx.strokeStyle = 'rgba(20,10,25,0.95)';
  ctx.lineWidth = boss ? 4 : 2.8;
  const dark = shade(tint.startsWith('#') ? tint : '#888888', -46);
  const bobY = Math.sin(t * (kind === 'bat' || kind === 'wraith' ? 6 : 9)) * 3;
  if (kind === 'slime') {
    const sq = 1 + Math.sin(t * 9) * 0.12;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.ellipse(0, -24 + bobY * 0.4, 26 * sq, 26 / sq, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(-8, -12, 8, 5, 0.4, 0, Math.PI * 2); ctx.fill();
    slimeFace(ctx, eye, -24 + bobY * 0.4, swing);
  } else if (kind === 'bat') {
    const flap = Math.sin(t * 18) * 0.9;
    ctx.fillStyle = dark;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 14, -46); ctx.rotate(s * flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 26, -10); ctx.lineTo(s * 18, 4); ctx.lineTo(s * 8, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.ellipse(0, -46 + bobY, 16, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -58); ctx.lineTo(-14, -70); ctx.lineTo(-2, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -58); ctx.lineTo(14, -70); ctx.lineTo(2, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
    batFace(ctx, eye, -46 + bobY, swing);
  } else if (kind === 'skeleton') {
    chibiLegs(ctx, '#b8b0a0', walk, 0);
    ctx.fillStyle = '#d8d0c0';
    rr(ctx, -13, -62 + bobY * 0.4, 26, 32, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-9, -54 + i * 9 + bobY * 0.4); ctx.lineTo(9, -54 + i * 9 + bobY * 0.4); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(20,10,25,0.95)'; ctx.lineWidth = boss ? 4 : 2.8;
    // skull
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath(); ctx.arc(0, -84 + bobY * 0.4, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    rr(ctx, -9, -72 + bobY * 0.4, 18, 10, 4); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#181018';
      ctx.beginPath(); ctx.ellipse(s * 8, -86 + bobY * 0.4, 5.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.arc(s * 8 + 1, -86 + bobY * 0.4, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#181018'; ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -70 + bobY * 0.4); ctx.lineTo(i * 5, -64 + bobY * 0.4); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(20,10,25,0.95)'; ctx.lineWidth = boss ? 4 : 2.8;
    // sword arm
    ctx.save(); ctx.translate(12, -54); ctx.rotate(swing > 0 ? lerp(-2.2, 0.6, swing) : -0.4);
    ctx.fillStyle = '#b8b0a0';
    ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(0, -30); ctx.lineTo(3, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (kind === 'imp') {
    chibiLegs(ctx, dark, walk, 0);
    ctx.fillStyle = tint;
    rr(ctx, -15, -66 + bobY * 0.4, 30, 36, 10); ctx.fill(); ctx.stroke();
    // wings
    ctx.fillStyle = dark;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 14, -56); ctx.rotate(s * (0.5 + Math.sin(t * 10) * 0.25));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 20, -14); ctx.lineTo(s * 14, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.arc(0, -86 + bobY * 0.4, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e0d0';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 10, -100 + bobY * 0.4); ctx.lineTo(s * 16, -112 + bobY * 0.4); ctx.lineTo(s * 4, -102 + bobY * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath(); ctx.ellipse(s * 7, -88 + bobY * 0.4, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.arc(s * 7 - 1, -87 + bobY * 0.4, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#3a1018'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -78 + bobY * 0.4, 6, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath(); ctx.moveTo(-4, -74 + bobY * 0.4); ctx.lineTo(-2, -69 + bobY * 0.4); ctx.lineTo(0, -74 + bobY * 0.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -74 + bobY * 0.4); ctx.lineTo(2, -69 + bobY * 0.4); ctx.lineTo(0, -74 + bobY * 0.4); ctx.closePath(); ctx.fill();
  } else if (kind === 'wraith') {
    const fy = -50 + bobY;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.moveTo(-20, fy - 20);
    ctx.quadraticCurveTo(-24, fy + 20, -14 + Math.sin(t * 5) * 4, fy + 42);
    ctx.quadraticCurveTo(-4, fy + 30, 0, fy + 44);
    ctx.quadraticCurveTo(6, fy + 30, 14 + Math.sin(t * 5 + 2) * 4, fy + 40);
    ctx.quadraticCurveTo(24, fy + 18, 20, fy - 20);
    ctx.quadraticCurveTo(0, fy - 44, -20, fy - 20);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(0, fy - 16, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.ellipse(s * 6, fy - 18, 3.4, 5, s * 0.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'ogre') {
    chibiLegs(ctx, dark, walk, 0);
    ctx.fillStyle = tint;
    rr(ctx, -24, -74 + bobY * 0.4, 48, 46, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark;
    rr(ctx, -24, -44, 48, 12, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.arc(0, -92 + bobY * 0.4, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e0d0';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 9, -104 + bobY * 0.4); ctx.lineTo(s * 13, -114 + bobY * 0.4); ctx.lineTo(s * 4, -105 + bobY * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath(); ctx.ellipse(s * 6, -94 + bobY * 0.4, 4.4, 5.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.arc(s * 6 - 1, -93 + bobY * 0.4, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#3a1018'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, -84 + bobY * 0.4, 6, 0.4, Math.PI - 0.4); ctx.stroke();
    // club
    ctx.save(); ctx.translate(22, -58); ctx.rotate(swing > 0 ? lerp(-2.0, 0.8, swing) : -0.3);
    ctx.fillStyle = '#7a5230';
    rr(ctx, -4, -46, 8, 52, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(0, -52, 13, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else {
    // knight (boss mặc định)
    chibiLegs(ctx, dark, walk, 0);
    ctx.fillStyle = tint;
    rr(ctx, -20, -72 + bobY * 0.4, 40, 42, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark;
    rr(ctx, -20, -44, 40, 11, 4); ctx.fill(); ctx.stroke();
    // pauldrons
    ctx.fillStyle = dark;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 20, -64 + bobY * 0.4, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // horned helm
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.arc(0, -90 + bobY * 0.4, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#181018';
    rr(ctx, -12, -94 + bobY * 0.4, 24, 8, 3); ctx.fill();
    ctx.fillStyle = eye;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 6, -90 + bobY * 0.4, 3, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e8e0d0';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 12, -102 + bobY * 0.4); ctx.lineTo(s * 20, -118 + bobY * 0.4); ctx.lineTo(s * 6, -104 + bobY * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // big sword
    ctx.save(); ctx.translate(20, -56); ctx.rotate(swing > 0 ? lerp(-2.4, 0.7, swing) : -0.5);
    ctx.fillStyle = '#3a2e28'; rr(ctx, -4, 0, 8, 12, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; rr(ctx, -11, -6, 22, 7, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8ccd8';
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-5, -70); ctx.lineTo(0, -80); ctx.lineTo(5, -70); ctx.lineTo(8, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (stun > 0) {
    ctx.fillStyle = 'rgba(140,220,255,0.5)';
    ctx.beginPath(); ctx.ellipse(0, -45, 30, 52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a8e0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-12, -70); ctx.lineTo(-4, -56); ctx.lineTo(-12, -56); ctx.lineTo(-2, -38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -66); ctx.lineTo(16, -52); ctx.lineTo(8, -50); ctx.lineTo(14, -36); ctx.stroke();
  }
  ctx.restore();
}
function slimeFace(ctx: CanvasRenderingContext2D, eye: string, cy: number, swing: number): void {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(s * 8, cy - 4, 5.4, 6.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = eye;
    ctx.beginPath(); ctx.arc(s * 8 - 1, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#2a1020'; ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (swing > 0.2) { ctx.ellipse(0, cy + 8, 6, 5, 0, 0, Math.PI * 2); }
  else ctx.arc(0, cy + 6, 7, 0.3, Math.PI - 0.3);
  ctx.stroke();
}
function batFace(ctx: CanvasRenderingContext2D, eye: string, cy: number, swing: number): void {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath(); ctx.ellipse(s * 6, cy - 2, 4.6, 5.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = eye;
    ctx.beginPath(); ctx.arc(s * 6 - 1, cy - 1, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff8e0';
  if (swing > 0.2) {
    ctx.beginPath(); ctx.moveTo(-4, cy + 6); ctx.lineTo(-2, cy + 11); ctx.lineTo(0, cy + 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, cy + 6); ctx.lineTo(2, cy + 11); ctx.lineTo(0, cy + 6); ctx.closePath(); ctx.fill();
  }
}

// ============ zone palettes ============
const ZONES = [
  { bg: IMG.floor1, sky: ['#0c0a12', '#1e1420'], tint: '#6a6a78', accent: '#ff9a3c', eye: '#ffd23c', pillar: '#241f2e' },
  { bg: IMG.floor2, sky: ['#100810', '#2a0e18'], tint: '#7a4a58', accent: '#8dff9a', eye: '#ff3b52', pillar: '#2a1420' },
  { bg: IMG.floor3, sky: ['#160a14', '#3a1020'], tint: '#5a4a7a', accent: '#c9b8ff', eye: '#ff3b52', pillar: '#241228' },
];
const MONSTER_KINDS = [
  ['slime', 'bat', 'skeleton'],
  ['imp', 'skeleton', 'wraith'],
  ['wraith', 'imp', 'ogre'],
];

// ============ engine ============
export class GameIdle {
  private ctx: CanvasRenderingContext2D;
  private onEvent: (e: EngineEvent) => void;
  private raf = 0;
  private last = 0;
  private globalT = 0;
  private speedIdx = 0;
  private state: 'title' | 'playing' | 'story' | 'victory' = 'title';
  private paused = false;

  private gold = 0;
  private gems = 0;
  private kaelLevel = 1;
  private kaelXp = 0;
  private kaelAsc(): number { return Math.pow(1.3, Math.floor(this.kaelLevel / 10)); }

  private floor = 0;
  private wave = 0;
  private kills = 0;
  private playTime = 0;
  private waveDelay = 1;
  private spawnQueue: SpawnReq[] = [];
  private scrollX = 0;

  private heroes: HeroUnit[] = [];
  private enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private parts: Particle[] = [];
  private texts: FloatText[] = [];
  private toasts: Toast[] = [];
  private pickups: Pickup[] = [];

  private ownedCompanions: Record<string, number> = {};
  private ownedSkins: string[] = ['default'];
  private equippedSkin = 'default';
  private ownedItems: Record<string, number> = {};
  private equippedItems: string[] = [];
  private pullsSinceEpic = 0;

  // vũ khí
  private ownedWeapons: Record<string, number> = {};
  private equippedWeapon: string | null = null;
  // endless
  private endlessUnlocked = false;
  private endless = false;
  // đội dự bị (legion)
  private legionAtk = 0;
  private legionCount = 0;
  private legionCd = 0;
  // lựa chọn đồng hành ra trận (null = tự động triển khai tất cả)
  private deployedIds: string[] | null = null;

  private shake = 0;
  private flash = 0;
  private flashColor = '#ff3b52';
  private slowmo = 0;
  private freeze = 0;
  private banner: { main: string; sub: string; t: number; life: number; color: string } | null = null;
  private bossActive = false;
  private uid = 1;
  private lastMetaPush = 0;
  private pendingStart = false;
  private bgImgs: Record<string, HTMLImageElement> = {};

  private partyAtkAura = 1;
  private partyGoldAura = 1;
  private partyGemAura = 1;
  private hudCache: HudState = { floor: 0, wave: 0, inBoss: false, bossName: '', bossHpPct: 0, gold: 0, gems: 0, kaelLevel: 1, asc: 1, power: 0, floorName: FLOOR_NAMES[0] };

  constructor(canvas: HTMLCanvasElement, onEvent: (e: EngineEvent) => void) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.onEvent = onEvent;
    if (document.fonts) {
      void document.fonts.load('20px "Bangers"');
      void document.fonts.load('700 12px "Chakra Petch"');
      void document.fonts.load('600 12px "Be Vietnam Pro"');
    }
    for (const key of Object.keys(IMG)) {
      const img = new Image();
      img.src = (IMG as Record<string, string>)[key];
      this.bgImgs[key] = img;
    }
    this.recomputeParty();
    this.last = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.globalT += dt;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('beforeunload', this.save);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('beforeunload', this.save);
    this.save();
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.state === 'playing') this.setPaused(!this.paused);
    }
    if (e.code === 'KeyM') {
      setAudioMuted(!getMuted());
      this.pushMeta();
    }
  };

  // ---------- economy ----------
  private gw(): number { return this.floor * WAVES_PER_FLOOR + this.wave + 1; }
  private zone(): number { return Math.floor(this.floor / 10) % 3; }
  private bossDef(): BossDef { return BOSSES[bossIndexForFloor(this.floor)]; }
  // hệ số khó tăng mạnh sau tầng 100 (endless)
  private hardMul(): number {
    if (this.floor < TOTAL_FLOORS) return 1;
    return Math.pow(1.55, this.floor - TOTAL_FLOORS + 1);
  }
  private foeHpBase(): number { return 5 * Math.pow(this.gw(), 2.62) * this.hardMul(); }
  private foeAtkBase(): number { return 3.2 * Math.pow(this.gw(), 2.28) * Math.pow(this.hardMul(), 0.8); }
  private goldPerKill(): number { return Math.round((5 + this.gw() * 1.5) * Math.pow(this.gw(), 1.15) * 10 * this.partyGoldAura); }
  private itemBonus(): { atk: number; hp: number; crit: number; aspd: number } {
    const b = { atk: 0, hp: 0, crit: 0, aspd: 0 };
    for (const id of this.equippedItems) {
      const def = ITEMS.find((i) => i.id === id);
      if (!def) continue;
      const c = this.ownedItems[id] ?? 1;
      b.atk += (def.bonus.atk ?? 0) * c;
      b.hp += (def.bonus.hp ?? 0) * c;
      b.crit += (def.bonus.crit ?? 0) * c;
      b.aspd += (def.bonus.aspd ?? 0) * c;
    }
    return b;
  }
  private power(): number {
    let p = 0;
    for (const h of this.heroes) p += h.atk * 2 + h.maxHp * 0.25;
    return Math.round(p);
  }

  // ---------- party ----------
  private kaelLook(): ChibiLook {
    const s = SKINS.find((k) => k.id === this.equippedSkin) ?? SKINS[0];
    return s.look;
  }
  private recomputeParty(): void {
    const prevHp: Record<string, number> = {};
    for (const h of this.heroes) prevHp[h.uid] = h.hp / h.maxHp;
    const bonus = this.itemBonus();
    const wpn = this.weaponAtk();
    let cands = COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0);
    // lọc theo lựa chọn của người chơi (tối đa MAX_PARTY)
    if (this.deployedIds !== null) {
      const set = new Set(this.deployedIds);
      cands = cands.filter((c) => set.has(c.id));
    }
    cands = cands.sort((a, b) => this.compPower(b) - this.compPower(a)).slice(0, MAX_PARTY);
    // aura
    this.partyAtkAura = 1; this.partyGoldAura = 1; this.partyGemAura = 1;
    for (const c of cands) {
      if (c.skill.id === 'buff' || c.skill.id === 'holysplash') this.partyAtkAura *= 1.12;
    }
    // triển khai TẤT CẢ đồng hành sở hữu (xếp hạng mạnh trước)
    const ranked = [...cands].sort((a, b) => this.compPower(b) - this.compPower(a));
    const MAX_FIELD = 12;
    const slots: Record<Pos, number[]> = {
      front: [505, 468, 432, 500, 464],
      mid: [400, 366, 332, 396, 362],
      back: [296, 264, 232, 292, 260, 228],
    };
    const used: Record<Pos, number> = { front: 0, mid: 0, back: 0 };
    const newHeroes: HeroUnit[] = [];
    // Kael always front-most
    const kL = this.kaelLevel;
    const kAtk = (15 * Math.pow(1.1, kL - 1) + bonus.atk + wpn) * this.kaelAsc();
    const kHp = 150 * Math.pow(1.085, kL - 1) + bonus.hp;
    newHeroes.push({
      uid: 'kael', isKael: true, defId: 'kael', level: kL,
      atk: kAtk, maxHp: kHp, hp: kHp, aspd: Math.min(1.7, 1.1 + kL * 0.004), crit: 0.08 + bonus.crit,
      ranged: false, pos: 'front', x: 560, slotY: 0, atkCd: 0.4, swing: 0, hurtT: 0, frozenT: 0, hitCount: 0, dead: false,
      look: this.kaelLook(), skill: 'double', def: null,
    });
    this.legionAtk = 0; this.legionCount = 0;
    ranked.forEach((c, i) => {
      const lvl = this.ownedCompanions[c.id] ?? 1;
      const g = Math.pow(1.11, lvl - 1);
      const rarMul = 1 + RARITY_ORDER.indexOf(c.rarity) * 0.15;
      const atk = (c.atkBase * g * rarMul + bonus.atk * 0.4 + wpn * 0.5) * this.partyAtkAura;
      const hp = (c.hpBase * g * rarMul + bonus.hp * 0.4) * (1 + RARITY_ORDER.indexOf(c.rarity) * 0.1);
      const aspd = c.atkSpd * (1 + bonus.aspd) * (c.skill.id === 'flurry' ? 1.2 : 1);
      if (i < MAX_FIELD) {
        const slot = slots[c.pos][used[c.pos] % slots[c.pos].length];
        used[c.pos] += 1;
        newHeroes.push({
          uid: c.id, isKael: false, defId: c.id, level: lvl,
          atk, maxHp: hp, hp, aspd, crit: c.crit + bonus.crit * 0.5,
          ranged: c.ranged, pos: c.pos, x: slot, slotY: 0,
          atkCd: rand(0.2, 0.6), swing: 0, hurtT: 0, frozenT: 0, hitCount: 0, dead: false,
          look: c.look, skill: c.skill.id, def: c,
        });
      } else {
        this.legionAtk += atk * 0.5; this.legionCount += 1;
      }
    });
    // preserve hp pct
    for (const h of newHeroes) {
      const r = prevHp[h.uid];
      if (r !== undefined && r > 0 && !h.dead) h.hp = h.maxHp * clamp(r, 0.2, 1);
    }
    this.heroes = newHeroes;
  }
  private compPower(c: CompanionDef): number {
    const lvl = this.ownedCompanions[c.id] ?? 1;
    const g = Math.pow(1.11, lvl - 1);
    const rar = ({ common: 0, rare: 60, epic: 200, legendary: 500, mythic: 1200 } as Record<Rarity, number>)[c.rarity];
    return c.atkBase * g * 2 + c.hpBase * g * 0.25 + rar;
  }
  upgradeCompanion(id: string): boolean {
    const lvl = this.ownedCompanions[id] ?? 0;
    if (lvl <= 0) return false;
    const cost = this.upgradeCost(lvl);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.ownedCompanions[id] = lvl + 1;
    this.recomputeParty();
    this.toast(`${COMPANIONS.find((c) => c.id === id)?.name ?? id} đạt cấp ${lvl + 1}!`, '#3fe0b0');
    sfx.levelup();
    this.save();
    this.pushMeta();
    return true;
  }
  private upgradeCost(lvl: number): number { return Math.round(60 + 45 * Math.pow(lvl, 2.05)); }
  upgradeCostOf(lvl: number): number { return this.upgradeCost(Math.max(1, lvl)); }
  /** Tổng vàng cần để nâng n cấp từ lvl hiện tại */
  upgradeBulkCost(id: string, n: number): number {
    const lvl = this.ownedCompanions[id] ?? 1;
    let total = 0;
    for (let i = 0; i < n; i++) total += this.upgradeCost(lvl + i);
    return total;
  }
  /** Nâng cấp hàng loạt (×10 / ×100) — dừng khi hết vàng hoặc đủ số lần */
  upgradeCompanionTimes(id: string, n: number): number {
    let lvl = this.ownedCompanions[id] ?? 0;
    if (lvl <= 0) return 0;
    let done = 0;
    while (done < n) {
      const cost = this.upgradeCost(lvl);
      if (this.gold < cost) break;
      this.gold -= cost;
      lvl += 1; done += 1;
    }
    if (done > 0) {
      this.ownedCompanions[id] = lvl;
      const def = COMPANIONS.find((c) => c.id === id);
      this.recomputeParty();
      this.toast(`${def?.name ?? id} +${done} cấp → Lv ${lvl}!`, '#3fe0b0');
      sfx.levelup();
      this.save();
      this.pushMeta();
    } else {
      this.toast('Không đủ Vàng để nâng cấp!', '#ff3b52');
      sfx.warn();
    }
    return done;
  }

  // ---------- chọn đồng hành ra trận ----------
  toggleDeploy(id: string): void {
    if (!(id in this.ownedCompanions)) return;
    const cur = this.deployedIds ?? COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0).map((c) => c.id);
    if (cur.includes(id)) {
      this.deployedIds = cur.filter((x) => x !== id);
    } else {
      if (cur.length >= MAX_PARTY) { this.toast(`Tối đa ${MAX_PARTY} đồng hành ra trận!`, '#ff3b52'); sfx.warn(); return; }
      this.deployedIds = [...cur, id];
    }
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  deployAll(): void {
    this.deployedIds = COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0)
      .sort((a, b) => this.compPower(b) - this.compPower(a))
      .slice(0, MAX_PARTY)
      .map((c) => c.id);
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  clearDeploy(): void {
    this.deployedIds = [];
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  deployedCount(): number {
    if (this.deployedIds === null) return COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0).length;
    return this.deployedIds.length;
  }

  // ---------- vũ khí ----------
  private weaponAtk(): number {
    if (!this.equippedWeapon) return 0;
    const def = WEAPONS.find((w) => w.id === this.equippedWeapon);
    if (!def) return 0;
    const lvl = this.ownedWeapons[def.id] ?? 1;
    return def.baseAtk * (1 + 0.3 * (lvl - 1));
  }
  equippedWeaponDef(): { def: WeaponDef; level: number; atk: number } | null {
    if (!this.equippedWeapon) return null;
    const def = WEAPONS.find((w) => w.id === this.equippedWeapon);
    if (!def) return null;
    const lvl = this.ownedWeapons[def.id] ?? 1;
    return { def, level: lvl, atk: Math.round(def.baseAtk * (1 + 0.3 * (lvl - 1))) };
  }
  private bestWeaponId(): string | null {
    let best: string | null = null; let bestAtk = -1;
    for (const id of Object.keys(this.ownedWeapons)) {
      const def = WEAPONS.find((w) => w.id === id);
      if (!def) continue;
      const atk = def.baseAtk * (1 + 0.3 * ((this.ownedWeapons[id] ?? 1) - 1));
      if (atk > bestAtk) { bestAtk = atk; best = id; }
    }
    return best;
  }
  private addWeapon(id: string): boolean {
    const isNew = !(id in this.ownedWeapons);
    this.ownedWeapons[id] = (this.ownedWeapons[id] ?? 0) + 1;
    // tự động trang bị vũ khí mạnh nhất
    const best = this.bestWeaponId();
    if (best && best !== this.equippedWeapon) {
      this.equippedWeapon = best;
      const d = WEAPONS.find((w) => w.id === best);
      if (d) this.toast(`Đã trang bị ${d.name}!`, '#ffb43c');
    }
    this.recomputeParty();
    this.save(); this.pushMeta();
    return isNew;
  }
  weaponGacha(): { def: WeaponDef; isNew: boolean } | null {
    if (this.gems < WGACHA_COST) return null;
    this.gems -= WGACHA_COST;
    const r = Math.random();
    const tier: Rarity = r < 0.03 ? 'mythic' : r < 0.12 ? 'legendary' : r < 0.35 ? 'epic' : r < 0.7 ? 'rare' : 'common';
    const pool = WEAPONS.filter((w) => w.tier === tier);
    const def = pool[Math.floor(Math.random() * pool.length)];
    const isNew = this.addWeapon(def.id);
    sfx.pickup();
    return { def, isNew };
  }
  getWeapons(): Array<{ def: WeaponDef; level: number }> {
    return Object.keys(this.ownedWeapons)
      .map((id) => ({ def: WEAPONS.find((w) => w.id === id)!, level: this.ownedWeapons[id] ?? 1 }))
      .filter((w) => w.def)
      .sort((a, b) => b.def.baseAtk * (1 + 0.3 * (b.level - 1)) - a.def.baseAtk * (1 + 0.3 * (a.level - 1)));
  }

  // ---------- flow ----------
  startGame(): void {
    initAudio();
    const hasSave = this.load();
    if (!hasSave) {
      this.gold = 600; this.gems = 1000;
    } else {
      this.toast('Chào mừng trở lại, Đại Ca!', '#ffd23c');
    }
    this.recomputeParty();
    this.state = 'playing';
    if (hasSave) {
      this.startFloor(this.floor);
    } else {
      this.pendingStart = true; // chờ hết truyện mở đầu mới khai chiến
    }
    this.pushMeta();
  }
  hasSaveData(): boolean {
    try { return localStorage.getItem(SAVE_KEY) !== null; } catch { return false; }
  }
  continueFromStory(): void {
    this.state = 'playing';
    if (this.pendingStart) {
      this.pendingStart = false;
      this.startFloor(this.floor);
    } else if (this.enemies.length === 0 && this.spawnQueue.length === 0) {
      this.startFloor(this.floor);
    }
    this.pushMeta();
  }
  toTitle(): void {
    this.save();
    this.state = 'title';
    this.enemies = []; this.projs = []; this.pickups = []; this.parts = []; this.texts = [];
    this.bossActive = false; this.banner = null;
    this.pushMeta();
  }
  restart(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    this.gold = 600; this.gems = 1000; this.kaelLevel = 1; this.kaelXp = 0;
    this.floor = 0; this.wave = 0; this.kills = 0; this.playTime = 0;
    this.ownedCompanions = {}; this.ownedSkins = ['default']; this.equippedSkin = 'default';
    this.ownedItems = {}; this.equippedItems = []; this.pullsSinceEpic = 0;
    this.recomputeParty();
    this.state = 'playing';
    this.startFloor(0);
    this.pushMeta();
  }
  private startFloor(f: number): void {
    this.floor = clamp(f, 0, TOTAL_FLOORS - 1);
    this.wave = 0;
    this.waveDelay = 0.6;
    this.spawnQueue = [];
    this.enemies = [];
    this.projs = [];
    this.bossActive = false;
    for (const h of this.heroes) { h.hp = h.maxHp; h.dead = false; }
    this.showBanner(
      this.floor >= TOTAL_FLOORS ? `VỰC VÔ TẬN ${this.floor - TOTAL_FLOORS + 1}` : `TẦNG ${this.floor + 1}/${TOTAL_FLOORS}`,
      floorNameOf(this.floor), ZONES[this.zone()].accent, 2.4,
    );
    sfx.warn();
    this.startWave();
  }
  private startWave(): void {
    const isLast = this.wave === WAVES_PER_FLOOR - 1;
    const isBoss = isLast && hasBossOnFloor(this.floor);
    if (isBoss) {
      this.bossActive = true;
      const boss = this.bossDef();
      this.showBanner('BOSS XUẤT HIỆN', boss.name, '#ff3b52', 2.6);
      sfx.roar();
      this.shake = Math.max(this.shake, 9);
      this.spawnQueue = [{ kind: 'boss', delay: 0.9 }];
    } else {
      let count = 2 + Math.min(4, Math.floor(this.floor / 8)) + (this.wave >= 3 ? 1 : 0);
      if (isLast) count += 2; // tầng không boss: đợt 7 là đợt tinh nhuệ đông hơn
      this.spawnQueue = [];
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({ kind: pick(MONSTER_KINDS[this.zone()]), delay: 0.15 + i * 0.3 });
      }
      if (this.floor >= 5 && this.wave >= 4 && Math.random() < 0.5) this.spawnQueue.push({ kind: 'ogre', delay: 0.5 + count * 0.3 });
    }
    this.waveDelay = 0.7;
  }
  private spawnEnemy(kind: string): void {
    const zone = this.zone();
    const z = ZONES[zone];
    const boss = kind === 'boss';
    const hpMul = ({ slime: 0.8, bat: 0.6, skeleton: 1, imp: 0.9, wraith: 1.1, ogre: 1.7, knight: 1, demon: 1, queen: 1, lich: 1 } as Record<string, number>)[kind] ?? 1;
    const atkMul = ({ ogre: 1.35, knight: 1.1 } as Record<string, number>)[kind] ?? 1;
    const hp = this.foeHpBase() * hpMul * (boss ? 1.8 : 1);
    const tints: Record<string, string> = {
      slime: zone === 1 ? '#5a8a4a' : '#4a7a8a', bat: '#5a4a6a', skeleton: '#c8c0b0', imp: '#b04a5a', wraith: '#6a5a9a', ogre: '#8a6a4a',
      knight: '#7a7a8a', demon: '#8a2a3a', queen: '#9a3a6a', lich: '#5a6a8a',
    };
    const k = boss ? this.bossDef().kind : kind;
    this.enemies.push({
      uid: this.uid++, kind: k, boss, bossIdx: this.floor,
      hp, maxHp: hp, atk: this.foeAtkBase() * atkMul * (boss ? 1.35 : 1), atkCd: rand(0.8, 1.4), swing: 0,
      x: VIEW_W + rand(80, 160) + (boss ? 200 : 0), hover: k === 'bat' || k === 'wraith' ? 1 : 0,
      stunT: 0, hurtT: 0, scale: (0.92 + Math.random() * 0.16) * (1 + this.floor * 0.006) * (boss ? 2.1 : 1),
      walk: rand(0, 6), skillCd: 5, telegraph: 0, dead: false,
      tint: tints[k] ?? z.tint, eye: boss ? '#ff3b52' : z.eye,
    });
  }

  private showBanner(main: string, sub: string, color: string, life: number): void {
    this.banner = { main, sub, t: 0, life, color };
  }
  private toast(text: string, color: string): void {
    this.toasts.push({ text, color, life: 3.2 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  // ---------- combat ----------
  private dealHeroDamage(h: HeroUnit, e: Enemy, mult: number, opts?: { splash?: number; meteor?: boolean }): void {
    if (e.dead) return;
    let crit = Math.random() < h.crit;
    let dmg = h.atk * mult * rand(0.92, 1.08) * (crit ? 2 : 1);
    // skills
    if (h.skill === 'berserk' && h.hp < h.maxHp * 0.5) dmg *= 1.6;
    if ((h.skill === 'execute' || h.skill === 'annihilate') && e.hp < e.maxHp * 0.3) dmg *= 2;
    h.hitCount += 1;
    e.hp -= dmg;
    e.hurtT = 0.18;
    this.texts.push({ x: e.x + rand(-14, 14), y: GROUND - 130 * e.scale + rand(-10, 10), text: fmt(dmg), color: crit ? '#ffd23c' : (h.isKael ? '#ff8a5a' : '#f0e8d8'), life: 0.9, size: crit ? 24 : 15 });
    this.burst(e.x, GROUND - 70 * e.scale, crit ? 10 : 5, crit ? '#ffd23c' : '#ff5a4a', 'spark');
    if (crit) sfx.crit(); else sfx.hit();
    if (crit) this.freeze = Math.max(this.freeze, 0.04);
    // splash
    const splashR = opts?.splash ?? (h.skill === 'splash' ? 110 : h.skill === 'holysplash' ? 130 : h.skill === 'annihilate' || h.skill === 'meteor' ? 130 : 0);
    if (splashR > 0 && !opts?.meteor) {
      for (const o of this.enemies) {
        if (o !== e && !o.dead && Math.abs(o.x - e.x) < splashR) {
          o.hp -= dmg * 0.55; o.hurtT = 0.18;
          this.burst(o.x, GROUND - 60 * o.scale, 4, '#ffb43c', 'spark');
        }
      }
    }
    // stun / freeze
    const stunChance = h.skill === 'stun' ? 0.25 : h.skill === 'freeze' ? (h.defId === 'vex' ? 0.35 : 0.3) : 0;
    if (stunChance > 0 && Math.random() < stunChance && !e.dead) {
      e.stunT = h.defId === 'vex' ? 0.9 : 0.8;
      this.burst(e.x, GROUND - 80 * e.scale, 8, '#8cdcff', 'ice');
      sfx.splat();
    }
    // heal skills
    if (h.skill === 'heal' || h.skill === 'strongheal' || h.skill === 'holysplash') {
      const factor = h.skill === 'strongheal' ? 0.9 : 0.4;
      const hurt = [...this.heroes].filter((a) => !a.dead && a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        hurt.hp = Math.min(hurt.maxHp, hurt.hp + dmg * factor);
        this.texts.push({ x: hurt.x, y: GROUND - 120, text: `+${fmt(dmg * factor)}`, color: '#3fe0b0', life: 0.8, size: 13 });
        this.burst(hurt.x, GROUND - 70, 4, '#3fe0b0', 'spark');
      }
    }
    if (h.skill === 'lifesteal' && !h.dead) {
      h.hp = Math.min(h.maxHp, h.hp + dmg * 0.3);
    }
    // meteor every 4 hits
    if (h.skill === 'meteor' && h.hitCount % 4 === 0) {
      this.projs.push({ x: e.x + rand(-30, 30), y: -60, tx: e.x, ty: GROUND - 30, target: '', speed: 640, dmg: h.atk * 2.5, kind: 'meteor', t: 0, splash: 130, crit: h.crit, ally: true });
      sfx.beam();
    }
    if (e.hp <= 0 && !e.dead) this.killEnemy(e, h);
  }
  private killEnemy(e: Enemy, killer: HeroUnit): void {
    e.dead = true;
    this.kills += 1;
    const gold = this.goldPerKill() * (e.boss ? 4 : 1);
    this.gold += gold;
    this.burst(e.x, GROUND - 60 * e.scale, e.boss ? 40 : 14, '#ffd23c', 'spark');
    this.burst(e.x, GROUND - 60 * e.scale, e.boss ? 24 : 10, '#ff5a4a', 'ember');
    this.pickups.push({ x: e.x, y: GROUND - 80 * e.scale, vy: -rand(120, 200), vx: rand(-40, 40), kind: 'gold', val: gold, life: 4 });
    const gemChance = (0.3 + (killer.skill === 'holysplash' ? 0.1 : 0)) * this.partyGemAura * (e.boss ? 3 : 1);
    if (Math.random() < gemChance) {
      const amt = Math.round((2 + this.gw() * 0.5) * 8 * (e.boss ? 1 : 1));
      this.gems += amt;
      this.pickups.push({ x: e.x + 20, y: GROUND - 100 * e.scale, vy: -rand(140, 220), vx: rand(-60, 20), kind: 'gem', val: amt, life: 4 });
      this.texts.push({ x: e.x + 20, y: GROUND - 150, text: `+${fmt(amt)} Ngọc`, color: '#ff4fd8', life: 1.1, size: 14 });
    }
    if (e.boss) {
      const bonus = Math.round((4 + this.floor) * 10);
      this.gems += bonus;
      this.texts.push({ x: e.x, y: GROUND - 190, text: `BOSS +${fmt(bonus)} Ngọc`, color: '#ff4fd8', life: 1.6, size: 20 });
      this.toast(`Boss ${this.bossDef().name} đã gục ngã!`, '#ff3b52');
    }
    this.texts.push({ x: e.x, y: GROUND - 120 * e.scale, text: `+${fmt(gold)} vàng`, color: '#ffd23c', life: 1, size: 13 });
    this.gainXp(12 + this.floor);
    sfx.pickup();
    if (e.boss) {
      sfx.bossdie();
      this.shake = Math.max(this.shake, 16);
      this.flash = 0.9; this.flashColor = '#ff3b52';
      this.slowmo = 0.5;
      this.gainXp(60 + this.floor * 4);
      this.kaelLevel += 1;
      // owned companions +1 cấp (tự cường)
      for (const id of Object.keys(this.ownedCompanions)) this.ownedCompanions[id] += 1;
      this.recomputeParty();
      this.floorCleared();
    }
  }
  private gainXp(x: number): void {
    this.kaelXp += x;
    while (this.kaelXp >= this.kaelXpNeed()) {
      this.kaelXp -= this.kaelXpNeed();
      this.kaelLevel += 1;
      this.toast(`KAEL THĂNG CẤP ${this.kaelLevel}!`, '#ffd23c');
      this.burst(560, GROUND - 90, 22, '#ffd23c', 'spark');
      sfx.levelup();
      this.recomputeParty();
      for (const h of this.heroes) h.hp = h.maxHp;
    }
  }
  private kaelXpNeed(): number { return Math.floor(this.kaelLevel * (this.kaelLevel + 1) / 2 + 10); }
  private floorCleared(): void {
    this.bossActive = false;
    this.enemies = this.enemies.filter((e) => !e.dead);
    const cleared = this.floor;
    if (cleared === TOTAL_FLOORS - 1 && !this.endlessUnlocked) {
      this.endlessUnlocked = true;
      this.state = 'victory';
      this.save();
      this.onEvent({ type: 'victory', stats: { kills: this.kills, gold: this.gold, playTime: this.playTime } });
      return;
    }
    this.save();
    this.pushMeta();
    const ch = STORY_AFTER[cleared];
    if (ch !== undefined) {
      this.floor = cleared + 1;
      this.wave = 0;
      this.enemies = [];
      this.projs = [];
      this.spawnQueue = [];
      this.state = 'story';
      this.onEvent({ type: 'story', chapter: ch });
      return;
    }
    this.startFloor(cleared + 1);
  }

  // ---------- gacha ----------
  private rollOne(): GachaResult {
    const r = Math.random();
    let rarity: Rarity = r < 0.015 ? 'mythic' : r < 0.055 ? 'legendary' : r < 0.175 ? 'epic' : r < 0.5 ? 'rare' : 'common';
    this.pullsSinceEpic += 1;
    if (this.pullsSinceEpic >= 10 && (rarity === 'common' || rarity === 'rare')) {
      rarity = Math.random() < 0.15 ? 'legendary' : 'epic';
    }
    if (rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic') this.pullsSinceEpic = 0;
    const poolR = Math.random();
    if (poolR < 0.55) {
      const pool = COMPANIONS.filter((c) => c.rarity === rarity);
      const c = pick(pool);
      const owned = this.ownedCompanions[c.id] ?? 0;
      if (owned === 0) {
        this.ownedCompanions[c.id] = 1;
        this.recomputeParty();
        return { kind: 'companion', id: c.id, name: c.name, rarity, isNew: true, dupeText: 'Đồng hành mới gia nhập!' };
      }
      this.ownedCompanions[c.id] = owned + 2;
      this.recomputeParty();
      return { kind: 'companion', id: c.id, name: c.name, rarity, isNew: false, dupeText: `Đã sở hữu → +2 cấp (Lv ${owned + 2})` };
    }
    if (poolR < 0.75) {
      const skinPool = SKINS.filter((s) => s.id !== 'default' && !this.ownedSkins.includes(s.id));
      if (skinPool.length > 0) {
        const s = pick(skinPool);
        this.ownedSkins.push(s.id);
        return { kind: 'skin', id: s.id, name: s.name, rarity, isNew: true, dupeText: 'Skin mới cho Kael!' };
      }
      const refund = rarity === 'legendary' ? 400 : rarity === 'epic' ? 250 : 120;
      this.gems += refund;
      return { kind: 'skin', id: 'refund', name: 'Hoàn Ngọc', rarity, isNew: false, dupeText: `Đã đủ skin → +${refund} ngọc` };
    }
    const item = pick(ITEMS);
    this.ownedItems[item.id] = (this.ownedItems[item.id] ?? 0) + 1;
    if (!this.equippedItems.includes(item.id) && this.equippedItems.length < 3) this.equippedItems.push(item.id);
    this.recomputeParty();
    return { kind: 'item', id: item.id, name: item.name, rarity, isNew: (this.ownedItems[item.id] ?? 0) === 1, dupeText: `Bản sao ×${this.ownedItems[item.id] ?? 1} — cộng dồn chỉ số` };
  }
  gacha(times: 1 | 10 | 100 | 500 | 1000): GachaResult[] | null {
    const cost = times === 1 ? GACHA_COST : times === 10 ? GACHA_X10_COST : times === 100 ? GACHA_X100_COST : times === 500 ? GACHA_X500_COST : GACHA_X1000_COST;
    if (this.gems < cost) {
      this.toast('Không đủ Ngọc Huyết Nguyệt!', '#ff3b52');
      sfx.warn();
      return null;
    }
    this.gems -= cost;
    const results: GachaResult[] = [];
    for (let i = 0; i < times; i++) results.push(this.rollOne());
    // bảo hiểm: mỗi nhóm 10 có ít nhất 1 Cực Hiếm+
    for (let g0 = 0; g0 < times; g0 += 10) {
      const slice = results.slice(g0, g0 + 10);
      if (!slice.some((r) => r.rarity === 'epic' || r.rarity === 'legendary' || r.rarity === 'mythic')) {
        const pool = COMPANIONS.filter((c) => c.rarity === 'epic');
        const c = pick(pool);
        const owned = this.ownedCompanions[c.id] ?? 0;
        this.ownedCompanions[c.id] = owned === 0 ? 1 : owned + 2;
        this.recomputeParty();
        results[g0 + 9] = { kind: 'companion', id: c.id, name: c.name, rarity: 'epic', isNew: owned === 0, dupeText: owned === 0 ? 'Đồng hành mới gia nhập!' : `Đã sở hữu → +2 cấp (Lv ${owned + 2})` };
      }
    }
    sfx.levelup();
    this.save();
    this.pushMeta();
    return results;
  }
  equipSkin(id: string): void {
    if (!this.ownedSkins.includes(id)) return;
    this.equippedSkin = id;
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  buySkin(id: string): boolean {
    const cost = SKIN_COST[id] ?? 500;
    if (this.ownedSkins.includes(id) || this.gems < cost) { this.toast('Không đủ Ngọc!', '#ff3b52'); return false; }
    this.gems -= cost;
    this.ownedSkins.push(id);
    this.equippedSkin = id;
    this.recomputeParty();
    sfx.levelup();
    this.save();
    this.pushMeta();
    return true;
  }
  equipItem(id: string): void {
    if ((this.ownedItems[id] ?? 0) <= 0) return;
    if (this.equippedItems.includes(id)) this.equippedItems = this.equippedItems.filter((x) => x !== id);
    else if (this.equippedItems.length < 3) this.equippedItems.push(id);
    else { this.toast('Chỉ trang bị tối đa 3 vật phẩm!', '#ff9a3c'); return; }
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  cycleSpeed(): void {
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    sfx.click();
    this.pushMeta();
  }
  togglePause(): void { this.setPaused(!this.paused); }
  private setPaused(p: boolean): void {
    this.paused = p;
    if (!p) this.last = performance.now();
    this.pushMeta();
  }
  toggleMute(): void {
    setAudioMuted(!getMuted());
    this.pushMeta();
  }

  // ---------- save ----------
  save = (): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 2, gold: this.gold, gems: this.gems, kaelLevel: this.kaelLevel, kaelXp: this.kaelXp,
        floor: this.floor, wave: this.wave, kills: this.kills, playTime: this.playTime,
        ownedCompanions: this.ownedCompanions, ownedSkins: this.ownedSkins, equippedSkin: this.equippedSkin,
        ownedItems: this.ownedItems, equippedItems: this.equippedItems, pullsSinceEpic: this.pullsSinceEpic,
        ownedWeapons: this.ownedWeapons, equippedWeapon: this.equippedWeapon,
        endlessUnlocked: this.endlessUnlocked, endless: this.endless,
        deployedIds: this.deployedIds,
        savedAt: Date.now(),
      }));
    } catch { /* ignore */ }
  };
  private load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.gold === 'number') this.gold = d.gold;
      if (typeof d.gems === 'number') this.gems = d.gems;
      if (typeof d.kaelLevel === 'number') this.kaelLevel = Math.max(1, d.kaelLevel);
      if (typeof d.kaelXp === 'number') this.kaelXp = d.kaelXp;
      if (typeof d.floor === 'number') this.floor = clamp(d.floor, 0, TOTAL_FLOORS - 1);
      if (typeof d.wave === 'number') this.wave = clamp(d.wave, 0, WAVES_PER_FLOOR - 1);
      if (typeof d.kills === 'number') this.kills = d.kills;
      if (typeof d.playTime === 'number') this.playTime = d.playTime;
      if (d.ownedCompanions && typeof d.ownedCompanions === 'object') this.ownedCompanions = d.ownedCompanions as Record<string, number>;
      if (Array.isArray(d.ownedSkins)) this.ownedSkins = d.ownedSkins as string[];
      if (typeof d.equippedSkin === 'string') this.equippedSkin = d.equippedSkin;
      if (d.ownedItems && typeof d.ownedItems === 'object') this.ownedItems = d.ownedItems as Record<string, number>;
      if (Array.isArray(d.equippedItems)) this.equippedItems = d.equippedItems as string[];
      if (typeof d.pullsSinceEpic === 'number') this.pullsSinceEpic = d.pullsSinceEpic;
      if (d.ownedWeapons && typeof d.ownedWeapons === 'object') this.ownedWeapons = d.ownedWeapons as Record<string, number>;
      if (typeof d.equippedWeapon === 'string' || d.equippedWeapon === null) this.equippedWeapon = d.equippedWeapon as string | null;
      if (typeof d.endlessUnlocked === 'boolean') this.endlessUnlocked = d.endlessUnlocked;
      if (typeof d.endless === 'boolean') this.endless = d.endless;
      if (d.deployedIds === null || Array.isArray(d.deployedIds)) this.deployedIds = (d.deployedIds as string[] | null);
      // offline reward
      if (typeof d.savedAt === 'number') {
        const sec = clamp((Date.now() - d.savedAt) / 1000, 0, 8 * 3600);
        if (sec > 90) {
          const g = Math.round(this.goldPerKill() * 1.5 * sec);
          const m = Math.round((1 + this.floor * 0.25) * sec);
          this.gold += g; this.gems += m;
          this.onEvent({ type: 'toast', text: `Thưởng ngoại tuyến: +${fmt(g)} Vàng, +${fmt(m)} Ngọc`, color: '#ffd23c' });
        }
      }
      return true;
    } catch { return false; }
  }
  newGamePlus(): void {
    this.floor = 0; this.wave = 0;
    for (const h of this.heroes) { h.hp = h.maxHp; h.dead = false; }
    this.state = 'playing';
    this.startFloor(0);
    this.toast('Hành trình mới bắt đầu — New Game+!', '#ff4fd8');
    this.pushMeta();
  }

  // ---------- events / meta ----------
  private pushMeta(): void {
    this.onEvent({ type: 'meta' });
  }
  getMeta(): MetaInfo {
    return {
      gold: this.gold, gems: this.gems, kaelLevel: this.kaelLevel, kaelXp: this.kaelXp, kaelXpNext: this.kaelXpNeed(),
      asc: Math.floor(this.kaelLevel / 10),
      floor: this.floor, wave: this.wave, kills: this.kills, playTime: this.playTime,
      speed: SPEEDS[this.speedIdx], muted: getMuted(), paused: this.paused,
      ownedCompanions: { ...this.ownedCompanions },
      party: this.heroes.filter((h) => !h.isKael).map((h) => ({
        id: h.defId, name: h.def?.name ?? '?', rarity: h.def?.rarity ?? 'common', level: h.level,
        power: Math.round(h.atk * 2 + h.maxHp * 0.25), pos: h.pos,
      })),
      ownedSkins: [...this.ownedSkins], equippedSkin: this.equippedSkin,
      ownedItems: Object.keys(this.ownedItems).map((id) => ({ id, name: ITEMS.find((i) => i.id === id)?.name ?? id, count: this.ownedItems[id] ?? 0 })),
      equippedItems: [...this.equippedItems],
      deployedIds: this.deployedIds ? [...this.deployedIds] : null,
      legionCount: this.legionCount,
      hud: { ...this.hudCache },
    };
  }

  // ---------- particles ----------
  private burst(x: number, y: number, n: number, color: string, shape: Particle['shape']): void {
    if (this.parts.length > 420) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, shape === 'ember' ? 260 : 180);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (shape === 'ember' ? 80 : 40),
        g: shape === 'smoke' ? -30 : 300, life: rand(0.3, shape === 'ember' ? 0.9 : 0.6), maxLife: 0.9,
        size: rand(2, shape === 'ember' ? 6 : 4.5), color, shape, rot: rand(0, 6), vr: rand(-6, 6),
      });
    }
  }

  // ---------- update ----------
  private tick(dt: number): void {
    if (this.paused) { this.draw(); return; }
    if (this.freeze > 0) { this.freeze -= dt; this.draw(); return; }
    const ts = this.slowmo > 0 ? 0.35 : 1;
    if (this.slowmo > 0) this.slowmo -= dt;
    const wdt = dt * ts * SPEEDS[this.speedIdx];
    this.draw();
    if (this.state !== 'playing') {
      this.updateParticles(dt);
      return;
    }
    this.updateWorld(wdt, dt);
  }
  private updateParticles(dt: number): void {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }
  private updateWorld(dt: number, realDt: number): void {
    if (this.pendingStart) {
      // đoàn quân hành quân chờ lệnh — chỉ cuộn cảnh và粒子
      this.scrollX += 58 * dt;
      this.updateParticles(dt);
      return;
    }
    this.playTime += dt;
    this.scrollX += 58 * dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 30);
    if (this.flash > 0) this.flash -= realDt * 1.5;
    if (this.banner) { this.banner.t += realDt; if (this.banner.t > this.banner.life) this.banner = null; }
    for (const t of this.toasts) t.life -= realDt;
    this.toasts = this.toasts.filter((t) => t.life > 0);
    this.updateParticles(dt);
    // texts & pickups
    for (const t of this.texts) { t.life -= dt; t.y -= 42 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const pk of this.pickups) {
      pk.life -= dt; pk.vy += 500 * dt; pk.y += pk.vy * dt; pk.x += pk.vx * dt;
      if (pk.y > GROUND - 8) { pk.y = GROUND - 8; pk.vy *= -0.4; }
    }
    this.pickups = this.pickups.filter((p) => p.life > 0);

    // ---------- spawn queue ----------
    if (this.spawnQueue.length > 0 && this.enemies.filter((e) => !e.dead).length < 7) {
      for (const s of this.spawnQueue) s.delay -= dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= 0) {
        const s = this.spawnQueue.shift();
        if (s) this.spawnEnemy(s.kind);
      }
    }

    // ---------- enemies ----------
    const alive = this.enemies.filter((e) => !e.dead).sort((a, b) => a.x - b.x);
    alive.forEach((e, i) => {
      e.walk += dt * 8;
      if (e.hurtT > 0) e.hurtT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; return; }
      if (e.swing > 0) e.swing -= dt * 3.4;
      // march to clash line
      const stop = i === 0 ? (e.boss ? CLASH_X + 40 : CLASH_X) : alive[i - 1].x + (alive[i - 1].boss ? 170 : 96);
      const spd = e.boss ? 130 : ({ slime: 120, bat: 210, skeleton: 150, imp: 185, wraith: 165, ogre: 112, knight: 140, demon: 170, queen: 130, lich: 150 } as Record<string, number>)[e.kind] ?? 150;
      if (e.x > stop) e.x -= spd * dt;
      // attack
      const inRange = e.x < CLASH_X + 90;
      if (inRange) {
        e.atkCd -= dt * (e.boss ? 1 : 1);
        if (e.atkCd <= 0) {
          e.atkCd = e.boss ? 1.7 : 1.5;
          e.swing = 1;
          const targets = this.heroes.filter((h) => !h.dead);
          if (targets.length > 0) {
            const front = targets.filter((h) => h.pos === 'front');
            const tgt = front.length > 0 && Math.random() < 0.7 ? pick(front) : pick(targets);
            let dmg = e.atk * rand(0.9, 1.1) * (e.boss ? 1.15 : 1);
            if (tgt.skill === 'skinwall') dmg *= 0.7;
            tgt.hp -= dmg;
            tgt.hurtT = 0.25;
            this.texts.push({ x: tgt.x, y: GROUND - 130, text: `-${fmt(dmg)}`, color: '#ff5a6a', life: 0.7, size: 13 });
            this.burst(tgt.x, GROUND - 70, 4, '#ff5a4a', 'spark');
            if (tgt.skill === 'thorns' || tgt.skill === 'annihilate') {
              e.hp -= dmg * 0.6; e.hurtT = 0.18;
              this.texts.push({ x: e.x, y: GROUND - 120 * e.scale, text: fmt(dmg * 0.6), color: '#8cdcff', life: 0.7, size: 12 });
              if (e.hp <= 0 && !e.dead) this.killEnemy(e, tgt);
            }
            if (tgt.hp <= 0 && !tgt.dead) this.heroDown(tgt);
          }
        }
        // boss skill
        if (e.boss) {
          e.skillCd -= dt;
          if (e.skillCd <= 0) {
            e.skillCd = rand(6, 8);
            this.bossSkill(e);
          }
        }
      }
    });
    this.enemies = this.enemies.filter((e) => !e.dead);

    // ---------- heroes ----------
    for (const h of this.heroes) {
      if (h.dead) {
        h.atkCd -= dt;
        if (h.atkCd <= 0) {
          h.dead = false;
          h.hp = h.maxHp * 0.6;
          this.burst(h.x, GROUND - 60, 12, '#3fe0b0', 'spark');
          this.texts.push({ x: h.x, y: GROUND - 120, text: 'Hồi sinh!', color: '#3fe0b0', life: 1, size: 13 });
          sfx.potion();
        }
        continue;
      }
      if (h.hurtT > 0) h.hurtT -= dt;
      if (h.swing > 0) h.swing -= dt * 3.2;
      if (h.frozenT > 0) { h.frozenT -= dt; continue; }
      // regen
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.012 * dt);
      const target = this.enemies.filter((e) => !e.dead).sort((a, b) => a.x - b.x)[0];
      if (!target) continue;
      h.atkCd -= dt;
      const canHit = h.ranged ? target.x < VIEW_W + 60 : target.x - h.x < 230;
      if (canHit && h.atkCd <= 0) {
        h.atkCd = 1 / h.aspd;
        h.swing = 1;
        const ty = GROUND - (target.hover ? 105 : 62) * target.scale;
        if (h.ranged) {
          const kind: Proj['kind'] = h.look.weapon === 'bow' ? 'arrow' : h.skill === 'holysplash' || h.look.weapon === 'orb' ? 'light' : 'magic';
          this.projs.push({ x: h.x + 20, y: GROUND - 78, tx: target.x, ty, target: String(target.uid), speed: kind === 'arrow' ? 760 : 520, dmg: h.atk, kind, t: 0, splash: h.skill === 'pierce' || h.skill === 'crit' && h.defId === 'lyra' ? 2 : 0, crit: h.crit, ally: true });
          if (kind === 'arrow') sfx.shoot();
        } else {
          this.dealHeroDamage(h, target, 1);
          if (h.skill === 'double' || h.skill === 'flurry') {
            this.dealHeroDamage(h, target, 0.7);
          }
        }
      }
    }

    // ---------- projectiles ----------
    for (const pr of this.projs) {
      pr.t += dt;
      const tgt = this.enemies.find((e) => String(e.uid) === pr.target && !e.dead);
      const tx = tgt ? tgt.x : pr.tx;
      const ty = tgt ? GROUND - (tgt.hover ? 105 : 62) * tgt.scale : pr.ty;
      const dx = tx - pr.x;
      const dy = ty - pr.y;
      const d = Math.hypot(dx, dy);
      const step = pr.speed * dt;
      if (d < step + 14) {
        if (pr.kind === 'meteor') {
          this.burst(pr.x, GROUND - 20, 26, '#ff9a3c', 'ember');
          this.burst(pr.x, GROUND - 20, 14, '#ffd23c', 'spark');
          this.shake = Math.max(this.shake, 8);
          sfx.crit();
          for (const e of this.enemies) {
            if (!e.dead && Math.abs(e.x - pr.x) < pr.splash) {
              const crit = Math.random() < pr.crit;
              const dmg = pr.dmg * (crit ? 2 : 1);
              e.hp -= dmg; e.hurtT = 0.2;
              this.texts.push({ x: e.x, y: GROUND - 130 * e.scale, text: fmt(dmg), color: '#ff9a3c', life: 0.9, size: 18 });
              if (e.hp <= 0 && !e.dead) {
                const killer = this.heroes.find((h) => h.skill === 'meteor' && !h.dead) ?? this.heroes[0];
                if (killer) this.killEnemy(e, killer);
              }
            }
          }
        } else if (pr.ally && tgt) {
          const crit = Math.random() < pr.crit;
          let dmg = pr.dmg * (crit ? 2 : 1) * rand(0.92, 1.08);
          tgt.hp -= dmg; tgt.hurtT = 0.18;
          this.texts.push({ x: tgt.x + rand(-12, 12), y: ty - 30, text: fmt(dmg), color: crit ? '#ffd23c' : '#c8e8ff', life: 0.85, size: crit ? 21 : 14 });
          this.burst(tgt.x, ty, crit ? 8 : 4, pr.kind === 'light' ? '#fff4c8' : pr.kind === 'magic' ? '#b878e8' : '#8cdcff', 'spark');
          if (crit) sfx.crit();
          if (tgt.hp <= 0 && !tgt.dead) {
            const killer = this.heroes.find((h) => !h.dead && !h.isKael) ?? this.heroes[0];
            if (killer) this.killEnemy(tgt, killer);
          }
          // pierce
          if (pr.splash > 0) {
            const others = this.enemies.filter((e) => !e.dead && e.uid !== tgt.uid).sort((a, b) => Math.abs(a.x - tgt.x) - Math.abs(b.x - tgt.x));
            for (let i = 0; i < Math.min(pr.splash, others.length); i++) {
              others[i].hp -= dmg * 0.6; others[i].hurtT = 0.18;
              this.texts.push({ x: others[i].x, y: GROUND - 120 * others[i].scale, text: fmt(dmg * 0.6), color: '#8cdcff', life: 0.7, size: 12 });
              if (others[i].hp <= 0 && !others[i].dead) {
                const killer = this.heroes.find((h) => !h.dead) ?? this.heroes[0];
                if (killer) this.killEnemy(others[i], killer);
              }
            }
          }
        } else if (!pr.ally) {
          // enemy projectile lands: hurt nearest hero to impact point
          const victims = this.heroes.filter((h) => !h.dead);
          if (victims.length > 0) {
            const tgtHero = [...victims].sort((a, b) => Math.abs(a.x - pr.tx) - Math.abs(b.x - pr.tx))[0];
            let dmg = pr.dmg * rand(0.9, 1.1);
            if (tgtHero.skill === 'skinwall') dmg *= 0.7;
            tgtHero.hp -= dmg;
            tgtHero.hurtT = 0.28;
            this.texts.push({ x: tgtHero.x, y: GROUND - 130, text: `-${fmt(dmg)}`, color: pr.kind === 'acid' ? '#8dff5a' : '#b878e8', life: 0.8, size: 14 });
            this.burst(tgtHero.x, GROUND - 70, 6, pr.kind === 'acid' ? '#8dff5a' : '#b878e8', 'spark');
            sfx.splat();
            if (tgtHero.hp <= 0 && !tgtHero.dead) this.heroDown(tgtHero);
          }
        }
        pr.t = 99;
      } else {
        pr.x += (dx / d) * step;
        pr.y += (dy / d) * step;
      }
    }
    this.projs = this.projs.filter((p) => p.t < 90);

    // ---------- legion strike (đội dự bị) ----------
    if (this.legionCount > 0 && this.legionAtk > 0) {
      this.legionCd -= dt;
      if (this.legionCd <= 0) {
        this.legionCd = 1.1;
        const lead = this.enemies.find((e) => !e.dead);
        if (lead) {
          const dmg = this.legionAtk * rand(0.9, 1.15);
          lead.hp -= dmg; lead.hurtT = 0.15;
          this.texts.push({ x: lead.x + rand(-20, 20), y: GROUND - 120 * lead.scale, text: `⚔${fmt(dmg)}`, color: '#b8a0ff', life: 0.8, size: 13 });
          this.burst(lead.x, GROUND - 70 * lead.scale, 4, '#b8a0ff', 'spark');
          if (lead.hp <= 0 && !lead.dead) {
            const killer = this.heroes[0];
            if (killer) this.killEnemy(lead, killer);
          }
        }
      }
    }

    // ---------- wave flow ----------
    if (this.spawnQueue.length === 0 && this.enemies.filter((e) => !e.dead).length === 0 && !this.bossActive) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        // Tầng không có boss: diệt xong đợt tinh nhuệ cuối là qua tầng
        if (this.wave === WAVES_PER_FLOOR - 1 && !hasBossOnFloor(this.floor)) {
          this.floorCleared();
          return;
        }
        this.wave += 1;
        if (this.wave >= WAVES_PER_FLOOR) this.wave = WAVES_PER_FLOOR - 1;
        this.gainXp(45 + this.floor * 2);
        this.startWave();
      }
    }

    // HUD cache
    const boss = this.enemies.find((e) => e.boss && !e.dead);
    this.hudCache = {
      floor: this.floor, wave: this.wave + 1, inBoss: this.bossActive,
      bossName: hasBossOnFloor(this.floor) ? this.bossDef().name : '', bossHpPct: boss ? clamp(boss.hp / boss.maxHp, 0, 1) : 0,
      gold: this.gold, gems: this.gems, kaelLevel: this.kaelLevel, asc: this.kaelAsc(), power: this.power(),
      floorName: floorNameOf(this.floor),
    };
    if (this.globalT - this.lastMetaPush > 0.35) {
      this.lastMetaPush = this.globalT;
      this.pushMeta();
    }
  }
  private heroDown(h: HeroUnit): void {
    h.dead = true;
    h.hp = 0;
    h.atkCd = 6;
    this.burst(h.x, GROUND - 60, 14, '#ff5a4a', 'spark');
    this.burst(h.x, GROUND - 60, 8, '#888898', 'smoke');
    sfx.hurt();
    this.shake = Math.max(this.shake, 6);
    if (this.heroes.every((x) => x.dead)) {
      this.toast('Cả đội gục ngã... nhưng sẽ đứng dậy!', '#ff3b52');
      for (const x of this.heroes) x.atkCd = Math.min(x.atkCd, 4);
    }
  }
  private bossSkill(e: Enemy): void {
    const targets = this.heroes.filter((h) => !h.dead);
    if (targets.length === 0) return;
    sfx.warn();
    if (e.kind === 'queen') {
      for (let i = 0; i < 3; i++) {
        const tgt = pick(targets);
        this.projs.push({ x: e.x - 40, y: GROUND - 150 * e.scale, tx: tgt.x, ty: GROUND - 60, target: '', speed: 420, dmg: e.atk * 0.7, kind: 'acid', t: -i * 0.22, splash: 0, crit: 0, ally: false });
      }
      sfx.shoot();
    } else if (e.kind === 'lich') {
      for (let i = 0; i < 3; i++) {
        const tgt = pick(targets);
        this.projs.push({ x: e.x - 40, y: GROUND - 140 * e.scale, tx: tgt.x, ty: GROUND - 60, target: '', speed: 500, dmg: e.atk * 0.55, kind: 'bolt', t: -i * 0.18, splash: 0, crit: 0, ally: false });
      }
      const freezeTgt = pick(targets);
      freezeTgt.frozenT = 0.9;
      this.burst(freezeTgt.x, GROUND - 70, 10, '#8cdcff', 'ice');
      sfx.shoot();
    } else if (e.kind === 'demon') {
      for (const t of targets) {
        t.hp -= e.atk * 0.4;
        t.hurtT = 0.3;
        this.burst(t.x, GROUND - 70, 8, '#ff5a4a', 'ember');
        if (t.hp <= 0 && !t.dead) this.heroDown(t);
      }
      this.shake = Math.max(this.shake, 10);
      this.flash = 0.35; this.flashColor = '#ff3b52';
      sfx.beam();
    } else {
      // knight / ogre: smash front
      const front = targets.filter((h) => h.pos === 'front');
      const tgt = front.length > 0 ? front : targets;
      for (const t of tgt) {
        let dmg = e.atk * 1.5;
        if (t.skill === 'skinwall') dmg *= 0.7;
        t.hp -= dmg;
        t.hurtT = 0.35;
        this.texts.push({ x: t.x, y: GROUND - 130, text: `-${fmt(dmg)}`, color: '#ff5a6a', life: 0.8, size: 16 });
        if (t.hp <= 0 && !t.dead) this.heroDown(t);
      }
      this.shake = Math.max(this.shake, 12);
      this.burst(e.x - 80, GROUND - 20, 16, '#c8c0b0', 'smoke');
      sfx.spike();
    }
    e.swing = 1;
  }

  // ============ DRAW ============
  private draw(): void {
    const ctx = this.ctx;
    const zone = ZONES[this.zone()];
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake) * 0.6, rand(-this.shake, this.shake) * 0.6);
    this.drawBg(zone);
    if (this.state === 'title') {
      this.drawTitleScene();
    } else {
      this.drawWorld(zone);
    }
    this.drawParticles();
    this.drawHud(zone);
    ctx.restore();
    // flash
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.45;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(5,4,10,0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
  private drawBg(zone: (typeof ZONES)[number]): void {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, zone.sky[0]);
    sky.addColorStop(1, zone.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // far image parallax
    const imgKey = this.zone() === 0 ? 'floor1' : this.zone() === 1 ? 'floor2' : 'floor3';
    const img = this.bgImgs[imgKey];
    if (img && img.complete && img.naturalWidth > 0) {
      const off = (this.scrollX * 0.12) % VIEW_W;
      ctx.globalAlpha = 0.5;
      const h = VIEW_H;
      const w = VIEW_W * 1.2;
      ctx.drawImage(img, -off, 0, w, h);
      ctx.drawImage(img, -off + w, 0, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(8,6,14,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // mid silhouettes: pillars
    const pOff = (this.scrollX * 0.35) % 240;
    ctx.fillStyle = zone.pillar;
    for (let x = -pOff; x < VIEW_W + 240; x += 240) {
      ctx.fillRect(x + 60, 60, 44, GROUND - 60);
      ctx.fillRect(x + 40, 48, 84, 20);
      ctx.fillRect(x + 40, GROUND - 26, 84, 26);
    }
    // torches
    const tOff = (this.scrollX * 0.6) % 320;
    for (let x = -tOff; x < VIEW_W + 320; x += 320) {
      const fx = x + 180;
      const fy = 170 + Math.sin(this.globalT * 3 + fx) * 3;
      ctx.fillStyle = '#3a2e28';
      ctx.fillRect(fx - 4, fy, 8, 26);
      const g = ctx.createRadialGradient(fx, fy - 8, 2, fx, fy - 8, 34);
      g.addColorStop(0, 'rgba(255,170,60,0.85)');
      g.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy - 8, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23c';
      ctx.beginPath(); ctx.ellipse(fx, fy - 8, 5, 9 + Math.sin(this.globalT * 11 + fx) * 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    // floor
    ctx.fillStyle = '#171320';
    ctx.fillRect(0, GROUND, VIEW_W, VIEW_H - GROUND);
    const fOff = this.scrollX % 96;
    ctx.strokeStyle = 'rgba(90,78,110,0.35)';
    ctx.lineWidth = 2;
    for (let x = -fOff; x < VIEW_W + 96; x += 96) {
      ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x, VIEW_H); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, GROUND + 20); ctx.lineTo(VIEW_W, GROUND + 20); ctx.stroke();
    ctx.strokeStyle = zone.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(VIEW_W, GROUND); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  private drawTitleScene(): void {
    const ctx = this.ctx;
    // ambient embers
    if (Math.random() < 0.3) {
      this.parts.push({ x: rand(0, VIEW_W), y: VIEW_H + 10, vx: rand(-10, 10), vy: -rand(30, 80), g: -8, life: rand(2, 4), maxLife: 4, size: rand(2, 4), color: Math.random() < 0.5 ? '#ff9a3c' : '#ff3b52', shape: 'ember', rot: 0, vr: 0 });
    }
    const t = this.globalT;
    const look = this.kaelLook();
    ctx.save();
    ctx.translate(VIEW_W / 2, GROUND);
    drawPixelHero(ctx, look, t, t * 2.2, 0, 2.3, 1, 0);
    ctx.restore();
    // companions preview bobbing behind
    const previews = COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0).slice(0, 4);
    previews.forEach((c, i) => {
      ctx.save();
      ctx.translate(VIEW_W / 2 - 190 + i * 126, GROUND + 6);
      ctx.globalAlpha = 0.9;
      drawPixelHero(ctx, c.look, t + i, t * 2.2 + i, 0, 1.5, i % 2 === 0 ? 1 : -1, 0);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  private drawWorld(zone: (typeof ZONES)[number]): void {
    const ctx = this.ctx;
    const t = this.globalT;
    // pickups
    for (const pk of this.pickups) {
      ctx.save();
      ctx.translate(pk.x, pk.y);
      const glow = pk.kind === 'gem' ? '#ff4fd8' : '#ffd23c';
      ctx.globalAlpha = clamp(pk.life, 0, 1);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
      g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = clamp(pk.life, 0, 1);
      if (pk.kind === 'gem') {
        ctx.fillStyle = '#ff4fd8';
        ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, -2); ctx.lineTo(0, 9); ctx.lineTo(-7, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-2, -3, 1.6, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#ffd23c';
        ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a8741e';
        ctx.font = '700 9px "Chakra Petch", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.5);
      }
      ctx.restore();
    }
    // enemies (draw further ones first)
    const sorted = [...this.enemies].filter((e) => !e.dead).sort((a, b) => b.x - a.x);
    for (const e of sorted) {
      const ey = e.hover ? GROUND - 60 : GROUND;
      ctx.save();
      ctx.translate(e.x, ey);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, e.hover ? 60 : 2, 34 * e.scale, 8 * e.scale, 0, 0, Math.PI * 2); ctx.fill();
      if (e.boss) {
        ctx.globalAlpha = 0.5 + 0.25 * Math.sin(t * 5);
        ctx.fillStyle = '#ff3b52';
        ctx.beginPath(); ctx.ellipse(0, 4, 60 * e.scale, 14 * e.scale, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (e.hurtT > 0) { ctx.filter = 'brightness(2.2) saturate(0.6)'; }
      const swing = e.swing > 0 ? clamp(Math.sin(clamp(e.swing, 0, 1) * Math.PI), 0, 1) : 0;
      drawPixelMonster(ctx, e.kind, e.tint, e.eye, t + e.uid, e.walk, swing, e.scale, e.stunT, e.boss);
      ctx.filter = 'none';
      // hp bar
      if (!e.boss && e.hp < e.maxHp) {
        const w = 46 * e.scale;
        const top = -52 * e.scale - 8;
        ctx.fillStyle = 'rgba(10,8,14,0.8)';
        rr(ctx, -w / 2, top, w, 6, 3); ctx.fill();
        ctx.fillStyle = '#ff3b52';
        rr(ctx, -w / 2 + 1, top + 1, (w - 2) * clamp(e.hp / e.maxHp, 0, 1), 4, 2); ctx.fill();
      }
      ctx.restore();
    }
    // heroes
    for (const h of this.heroes) {
      if (h.dead) continue;
      ctx.save();
      ctx.translate(h.x, GROUND);
      if (h.hurtT > 0) ctx.filter = 'brightness(2) saturate(0.5)';
      const lunge = h.swing > 0 ? clamp(Math.sin(clamp(h.swing, 0, 1) * Math.PI), 0, 1) : 0;
      const scale = h.isKael ? 1.4 : 1.05;
      drawPixelHero(ctx, h.look, t + h.x * 0.01, t * 7, lunge, scale, 1, h.frozenT);
      ctx.filter = 'none';
      // slash arc
      if (lunge > 0.25 && !h.ranged) {
        ctx.strokeStyle = h.look.aura;
        ctx.globalAlpha = lunge * 0.8;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(26, -40, 40 * scale, -1.6 + lunge * 1.4, -0.2 + lunge * 1.4);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // mini hp
      const w = 40;
      const top = -64 * scale - 12;
      ctx.fillStyle = 'rgba(10,8,14,0.8)';
      rr(ctx, -w / 2, top, w, 6, 3); ctx.fill();
      ctx.fillStyle = h.hp / h.maxHp > 0.35 ? '#3fe0b0' : '#ff3b52';
      rr(ctx, -w / 2 + 1, top + 1, (w - 2) * clamp(h.hp / h.maxHp, 0, 1), 4, 2); ctx.fill();
      ctx.restore();
    }
    // projectiles
    for (const pr of this.projs) {
      if (pr.t < 0) continue;
      ctx.save();
      ctx.translate(pr.x, pr.y);
      if (pr.kind === 'arrow') {
        ctx.rotate(Math.atan2(pr.ty - pr.y, pr.tx - pr.x));
        ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#8cdcff';
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
      } else if (pr.kind === 'meteor') {
        ctx.fillStyle = '#8a5a3a';
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#ff9a3c';
        ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(0, -34); ctx.lineTo(8, -10); ctx.closePath(); ctx.fill();
      } else {
        const color = pr.kind === 'light' ? '#fff4c8' : pr.kind === 'magic' ? '#b878e8' : pr.kind === 'acid' ? '#8dff5a' : '#8cdcff';
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // float texts
    for (const ft of this.texts) {
      ctx.globalAlpha = clamp(ft.life * 2, 0, 1);
      ctx.font = `${ft.size}px "Bangers", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(10,5,12,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    }
    // toasts
    this.toasts.forEach((to, i) => {
      const a = clamp(to.life, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = '700 15px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = 108 + i * 26;
      ctx.strokeStyle = 'rgba(10,5,12,0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText(to.text, VIEW_W / 2, y);
      ctx.fillStyle = to.color;
      ctx.fillText(to.text, VIEW_W / 2, y);
      ctx.globalAlpha = 1;
    });
  }
  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.parts) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'smoke') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === 'slash' || p.shape === 'ice') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -1, p.size * 2, 2);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  private drawHud(zone: (typeof ZONES)[number]): void {
    if (this.state === 'title') return;
    const ctx = this.ctx;
    const hud = this.hudCache;
    // ===== top-left: stage panel =====
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,16,0.82)';
    ctx.strokeStyle = 'rgba(255,59,82,0.45)';
    ctx.lineWidth = 1.5;
    rr(ctx, 14, 12, 268, 82, 8); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '21px "Bangers", cursive';
    ctx.fillStyle = hud.inBoss ? '#ff3b52' : '#f0e8d8';
    ctx.fillText(`TẦNG ${hud.floor + 1}/${TOTAL_FLOORS}`, 26, 38);
    ctx.font = '600 11px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = zone.accent;
    ctx.fillText(hud.floorName.toUpperCase(), 120, 37);
    // wave pips
    const bossFloor = hasBossOnFloor(hud.floor);
    for (let i = 0; i < WAVES_PER_FLOOR; i++) {
      const px = 28 + i * 26;
      const py = 54;
      ctx.beginPath();
      ctx.moveTo(px, py - 7); ctx.lineTo(px + 7, py); ctx.lineTo(px, py + 7); ctx.lineTo(px - 7, py); ctx.closePath();
      const done = hud.wave > i + 1 || (hud.wave === i + 1 && hud.inBoss);
      let fill = done ? zone.accent : '#2c2738';
      if (i === WAVES_PER_FLOOR - 1) {
        if (bossFloor) fill = hud.inBoss ? '#ff3b52' : '#5a2030';
        else if (!done) fill = '#6a5a2a';
      }
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.font = '700 12px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#9a917f';
    ctx.fillText(hud.inBoss ? 'BOSS CHIẾN!' : `ĐỢT ${hud.wave}/${WAVES_PER_FLOOR}`, 28, 84);
    // power
    ctx.font = '700 15px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#ffd23c';
    ctx.textAlign = 'right';
    ctx.fillText(`⚡ ${fmt(hud.power)}`, 270, 84);
    ctx.font = '600 9px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#9a917f';
    ctx.fillText('LỰC CHIẾN', 270, 68);
    ctx.restore();
    // ===== boss bar =====
    if (hud.inBoss) {
      const bw = 480;
      const bx = (VIEW_W - bw) / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(10,8,16,0.85)';
      ctx.strokeStyle = 'rgba(255,59,82,0.7)';
      ctx.lineWidth = 2;
      rr(ctx, bx - 8, 12, bw + 16, 46, 8); ctx.fill(); ctx.stroke();
      ctx.font = '17px "Bangers", cursive';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3b52';
      ctx.fillText(hud.bossName, VIEW_W / 2, 30);
      ctx.fillStyle = '#241018';
      rr(ctx, bx, 36, bw, 14, 7); ctx.fill();
      const pct = hud.bossHpPct;
      if (pct > 0) {
        const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        g.addColorStop(0, '#ff3b52'); g.addColorStop(1, '#8a1020');
        ctx.fillStyle = g;
        rr(ctx, bx + 1, 37, (bw - 2) * pct, 12, 6); ctx.fill();
      }
      ctx.restore();
    }
    // ===== top-right resources =====
    ctx.save();
    ctx.textAlign = 'right';
    const chips: Array<[string, string, string]> = [
      [fmt(hud.gold), '#ffd23c', 'VÀNG'],
      [fmt(hud.gems), '#ff4fd8', 'NGỌC'],
    ];
    chips.forEach((c, i) => {
      const y = 16 + i * 34;
      ctx.fillStyle = 'rgba(10,8,16,0.82)';
      ctx.strokeStyle = 'rgba(122,104,140,0.35)';
      ctx.lineWidth = 1.2;
      rr(ctx, VIEW_W - 178, y, 164, 28, 6); ctx.fill(); ctx.stroke();
      ctx.font = '700 16px "Chakra Petch", sans-serif';
      ctx.fillStyle = c[1];
      ctx.fillText(c[0], VIEW_W - 62, y + 20);
      ctx.font = '600 9px "Be Vietnam Pro", sans-serif';
      ctx.fillStyle = '#9a917f';
      ctx.fillText(c[2], VIEW_W - 22, y + 19);
      // icon
      ctx.beginPath();
      if (i === 0) { ctx.fillStyle = '#ffd23c'; ctx.arc(VIEW_W - 162, y + 14, 7, 0, Math.PI * 2); }
      else { ctx.fillStyle = '#ff4fd8'; ctx.moveTo(VIEW_W - 162, y + 6); ctx.lineTo(VIEW_W - 155, y + 13); ctx.lineTo(VIEW_W - 162, y + 22); ctx.lineTo(VIEW_W - 169, y + 13); ctx.closePath(); }
      ctx.fill();
    });
    ctx.restore();
    // ===== banner =====
    if (this.banner) {
      const b = this.banner;
      const p = b.t / b.life;
      const aIn = clamp(p * 6, 0, 1);
      const aOut = clamp((1 - p) * 4, 0, 1);
      const a = Math.min(aIn, aOut);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '58px "Bangers", cursive';
      ctx.strokeStyle = 'rgba(10,5,12,0.9)';
      ctx.lineWidth = 10;
      ctx.strokeText(b.main, VIEW_W / 2, 210);
      ctx.fillStyle = b.color;
      ctx.fillText(b.main, VIEW_W / 2, 210);
      ctx.font = '700 17px "Be Vietnam Pro", sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeText(b.sub, VIEW_W / 2, 252);
      ctx.fillStyle = '#f0e8d8';
      ctx.fillText(b.sub, VIEW_W / 2, 252);
      ctx.restore();
    }
  }
}
