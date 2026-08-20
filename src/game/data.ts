// ============ DỮ LIỆU GAME ============
// Tách khỏi engine để mọi hằng số cân bằng nằm một chỗ, dễ soát lỗi số học.

import type { ChibiLook, HairStyle, WeaponKind, AccessoryKind } from './types';

export type { ChibiLook } from './types';

// ---------- định dạng số ----------
const UNITS: Array<[number, string]> = [
  [1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'],
  [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K'],
];
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return `-${fmt(-n)}`;
  for (const [v, s] of UNITS) {
    if (n >= v) {
      const x = n / v;
      return (x >= 100 ? Math.floor(x).toString() : x.toFixed(1)) + s;
    }
  }
  return Math.floor(n).toString();
}

// ---------- cấu trúc tầng ----------
export const TOTAL_FLOORS = 100;
export const WAVES_PER_FLOOR = 7;
export const MAX_PARTY = 50;
/** Số đồng hành đứng trực tiếp trên sân; số còn lại thành đội tiếp viện. */
export const MAX_FIELD = 12;

/** Tầng 1–30 mỗi tầng một boss; từ 31 trở đi cứ 10 tầng một boss. */
export function hasBossOnFloor(floorIdx: number): boolean {
  return floorIdx < 30 ? true : floorIdx % 10 === 9;
}
export function bossIndexForFloor(floorIdx: number): number {
  if (floorIdx < 30) return floorIdx;
  if (floorIdx < TOTAL_FLOORS) return 30 + Math.floor((floorIdx - 30) / 10);
  return 30 + ((floorIdx - 30) % 7);
}
export function floorNameOf(floorIdx: number): string {
  if (floorIdx < FLOOR_NAMES.length) return FLOOR_NAMES[floorIdx];
  return `Vực Vô Tận ${floorIdx - FLOOR_NAMES.length + 1}`;
}
/** Sau khi qua tầng (index) → mở chương truyện tương ứng. */
export const STORY_AFTER: Record<number, number> = { 9: 1, 19: 2, 28: 3, 39: 4, 69: 5, 89: 6 };

// ---------- độ hiếm ----------
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITY: Record<Rarity, { name: string; color: string; glow: string; stars: number }> = {
  common: { name: 'Thường', color: '#9db0c4', glow: '#4a5a6e', stars: 1 },
  rare: { name: 'Hiếm', color: '#3fb9ff', glow: '#1868a8', stars: 2 },
  epic: { name: 'Cực Hiếm', color: '#ffb43c', glow: '#a86414', stars: 3 },
  legendary: { name: 'Huyền Thoại', color: '#ff4fd8', glow: '#8a1e6e', stars: 4 },
  mythic: { name: 'Thần Thoại', color: '#7dff5a', glow: '#2a9e1e', stars: 5 },
};
export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];
export const rarityIdx = (r: Rarity): number => RARITY_ORDER.indexOf(r);

// ---------- kỹ năng ----------
export type SkillId =
  | 'skinwall' | 'double' | 'pierce' | 'splash' | 'stun' | 'heal'
  | 'crit' | 'lifesteal' | 'buff' | 'thorns'
  | 'meteor' | 'execute' | 'strongheal' | 'berserk' | 'freeze'
  | 'holysplash' | 'flurry' | 'annihilate'
  | 'greed' | 'prospect';

export interface CompanionSkill { id: SkillId; name: string; desc: string }

export type Pos = 'front' | 'mid' | 'back';

export interface CompanionDef {
  id: string; name: string; title: string;
  role: string; school: string; pos: Pos; rarity: Rarity;
  atkBase: number; hpBase: number; atkSpd: number; ranged: boolean;
  crit: number;
  skill: CompanionSkill;
  look: ChibiLook;
}

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(((n >> 16) & 255) * (1 + amt))}${to(((n >> 8) & 255) * (1 + amt))}${to((n & 255) * (1 + amt))}`;
}

export const COMPANIONS: CompanionDef[] = [
  // ---- THƯỜNG ----
  {
    id: 'bram', name: 'Bram', title: 'Bức Tường Thép', role: 'Đấu Sĩ', school: 'Cuồng Nộ', pos: 'front', rarity: 'common',
    atkBase: 7, hpBase: 130, atkSpd: 0.85, ranged: false, crit: 0.05,
    skill: { id: 'skinwall', name: 'Bì Thạch', desc: 'Mình đồng da sắt — nhận ít hơn 30% sát thương.' },
    look: { hair: '#7a5230', outfit: '#8a4a3a', outfit2: '#5e3226', skin: '#e8b48a', eyes: '#4a2e1a', hairStyle: 'short', weapon: 'shield', accessory: 'none', aura: '#9db0c4' },
  },
  {
    id: 'finn', name: 'Finn', title: 'Song Kiếm Gió', role: 'Kiếm Sĩ', school: 'Phong', pos: 'front', rarity: 'common',
    atkBase: 9, hpBase: 95, atkSpd: 1.1, ranged: false, crit: 0.08,
    skill: { id: 'double', name: 'Song Kiếm', desc: 'Mỗi đòn đánh chém thêm một nhát (70% sát thương).' },
    look: { hair: '#5aa0d0', outfit: '#3a6e5a', outfit2: '#274e40', skin: '#f0c49a', eyes: '#1e5a8a', hairStyle: 'spiky', weapon: 'daggers', accessory: 'headband', aura: '#9db0c4' },
  },
  {
    id: 'toto', name: 'Tô Tô', title: 'Mũi Tên Xuyên', role: 'Cung Thủ', school: 'Xuyên Tâm', pos: 'back', rarity: 'common',
    atkBase: 9, hpBase: 70, atkSpd: 1.15, ranged: true, crit: 0.1,
    skill: { id: 'pierce', name: 'Xuyên Phá', desc: 'Mũi tên xuyên qua, trúng thêm 1 mục tiêu phía sau.' },
    look: { hair: '#e8a04a', outfit: '#a86428', outfit2: '#6e4218', skin: '#f5d0a8', eyes: '#8a5a1e', hairStyle: 'twin', weapon: 'bow', accessory: 'ears', aura: '#9db0c4' },
  },
  {
    id: 'momo', name: 'Momo', title: 'Đóm Lửa Nhỏ', role: 'Pháp Sư', school: 'Viên Hỏa', pos: 'back', rarity: 'common',
    atkBase: 11, hpBase: 65, atkSpd: 0.9, ranged: true, crit: 0.05,
    skill: { id: 'splash', name: 'Bùng Cháy', desc: 'Phép nổ lan, gây 60% sát thương lên kẻ địch xung quanh.' },
    look: { hair: '#ff8a5a', outfit: '#c8452e', outfit2: '#7e2c1c', skin: '#ffe0c0', eyes: '#d0452a', hairStyle: 'bun', weapon: 'staff', accessory: 'none', aura: '#9db0c4' },
  },
  {
    id: 'gau', name: 'Gấu Nhỏ', title: 'Thiết Quyền', role: 'Đấu Sĩ', school: 'Thiết Quyền', pos: 'front', rarity: 'common',
    atkBase: 8, hpBase: 110, atkSpd: 0.9, ranged: false, crit: 0.05,
    skill: { id: 'stun', name: 'Choáng Váng', desc: '25% cơ hội đấm choáng kẻ địch 0.8 giây.' },
    look: { hair: '#6a4a2e', outfit: '#9a7a4a', outfit2: '#5e4a2a', skin: '#e0a878', eyes: '#3a2412', hairStyle: 'mohawk', weapon: 'none', accessory: 'ears', aura: '#9db0c4' },
  },
  {
    id: 'pip', name: 'Pip', title: 'Ngọn Đèn Nhỏ', role: 'Hỗ Trợ', school: 'Thánh Quang', pos: 'back', rarity: 'common',
    atkBase: 6, hpBase: 75, atkSpd: 1.0, ranged: true, crit: 0.03,
    skill: { id: 'heal', name: 'Hồi Máu', desc: 'Mỗi đòn đánh hồi máu cho đồng đội thấp máu nhất (40% sát thương).' },
    look: { hair: '#ffe9a8', outfit: '#e8e0c8', outfit2: '#a89e80', skin: '#ffe8d0', eyes: '#7a9a3a', hairStyle: 'bun', weapon: 'orb', accessory: 'halo', aura: '#9db0c4' },
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
    skill: { id: 'freeze', name: 'Đóng Băng', desc: '30% cơ hội đóng băng kẻ địch 0.8 giây.' },
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
    skill: { id: 'buff', name: 'Phúc Lành', desc: 'Tăng 12% Công cho TOÀN ĐỘI (cộng dồn, tối đa +150%).' },
    look: { hair: '#f0b8d8', outfit: '#e8d8f0', outfit2: '#a888c0', skin: '#ffe8e0', eyes: '#8a4ac0', hairStyle: 'long', weapon: 'orb', accessory: 'halo', aura: '#3fb9ff' },
  },
  {
    id: 'rocky', name: 'Rocky', title: 'Gai Nham Thạch', role: 'Đấu Sĩ', school: 'Nham Thạch', pos: 'front', rarity: 'rare',
    atkBase: 11, hpBase: 150, atkSpd: 0.75, ranged: false, crit: 0.04,
    skill: { id: 'thorns', name: 'Phản Đòn', desc: 'Kẻ đánh trúng Rocky nhận lại 60% sát thương.' },
    look: { hair: '#7a7a6a', outfit: '#8a7a5a', outfit2: '#5a5040', skin: '#c8a888', eyes: '#e8783a', hairStyle: 'mohawk', weapon: 'none', accessory: 'horns', aura: '#3fb9ff' },
  },
  {
    id: 'zilla', name: 'Zilla', title: 'Bàn Tay Vàng', role: 'Hỗ Trợ', school: 'Thương Hội', pos: 'mid', rarity: 'rare',
    atkBase: 13, hpBase: 92, atkSpd: 1.05, ranged: true, crit: 0.07,
    skill: { id: 'greed', name: 'Tham Lam', desc: 'Tăng 20% Vàng nhặt được cho cả đội (cộng dồn).' },
    look: { hair: '#ffd23c', outfit: '#8a6a1e', outfit2: '#4e3c10', skin: '#f0d8a8', eyes: '#c89a1e', hairStyle: 'short', weapon: 'orb', accessory: 'crown', aura: '#3fb9ff' },
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
    skill: { id: 'freeze', name: 'Trọng Lực', desc: '35% cơ hội đè bẹp — kẻ địch bất động 0.9 giây, nổ lan 50%.' },
    look: { hair: '#5a5a7a', outfit: '#3a3a5e', outfit2: '#22223a', skin: '#d8c8b8', eyes: '#a8a8e8', hairStyle: 'hood', weapon: 'orb', accessory: 'mask', aura: '#ffb43c' },
  },
  {
    id: 'nova', name: 'Nova', title: 'Người Dò Ngọc', role: 'Hiền Nhân', school: 'Tinh Vân', pos: 'mid', rarity: 'epic',
    atkBase: 22, hpBase: 108, atkSpd: 1.05, ranged: true, crit: 0.09,
    skill: { id: 'prospect', name: 'Dò Ngọc', desc: 'Tăng 25% tỉ lệ rơi Ngọc Huyết Nguyệt (cộng dồn).' },
    look: { hair: '#8cdcff', outfit: '#2a4a7a', outfit2: '#16294a', skin: '#f0dcc8', eyes: '#7de0ff', hairStyle: 'pony', weapon: 'staff', accessory: 'none', cape: '#16294a', aura: '#ffb43c' },
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

// ---------- sinh thêm 50 đồng hành ----------
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
  const SKILLSET: CompanionSkill[] = [
    { id: 'double', name: 'Song Trảm', desc: 'Mỗi đòn đánh chém thêm một nhát (70% sát thương).' },
    { id: 'pierce', name: 'Xuyên Thấu', desc: 'Đòn đánh xuyên thêm 1 mục tiêu.' },
    { id: 'splash', name: 'Bùng Nổ', desc: 'Gây 60% sát thương lan ra kẻ địch xung quanh.' },
    { id: 'stun', name: 'Đánh Choáng', desc: '25% cơ hội làm choáng kẻ địch 0.8 giây.' },
    { id: 'heal', name: 'Trị Liệu', desc: 'Hồi máu cho đồng đội thấp máu nhất (40% sát thương).' },
    { id: 'crit', name: 'Tử Huyệt', desc: '+18% chí mạng, chí mạng nhân 2.5 sát thương.' },
    { id: 'lifesteal', name: 'Hút Hồn', desc: 'Hồi máu bằng 30% sát thương gây ra.' },
    { id: 'buff', name: 'Cường Hóa', desc: 'Tăng 12% Công cho toàn đội (cộng dồn).' },
    { id: 'thorns', name: 'Gai Góc', desc: 'Kẻ đánh trúng nhận lại 60% sát thương.' },
    { id: 'meteor', name: 'Thiên Thạch', desc: 'Cứ 4 đòn gọi thiên thạch nổ diện rộng ×2.5.' },
    { id: 'execute', name: 'Kết Liễu', desc: 'Gấp đôi sát thương lên kẻ dưới 30% máu.' },
    { id: 'strongheal', name: 'Đại Trị Liệu', desc: 'Hồi 90% sát thương thành máu cho đồng đội.' },
    { id: 'berserk', name: 'Cuồng Chiến', desc: 'Dưới 50% máu tăng 60% sát thương.' },
    { id: 'freeze', name: 'Băng Phong', desc: '30% cơ hội đóng băng kẻ địch 0.8 giây.' },
    { id: 'flurry', name: 'Loạn Vũ', desc: 'Chém 2 nhát liên hoàn, +25% chí mạng, tốc đánh +20%.' },
    { id: 'annihilate', name: 'Tận Diệt', desc: 'Chém lan + Tử Hình kẻ dưới 30% máu + phản đòn 60%.' },
  ];
  const HAIRS = ['#2a2a33', '#ffd76e', '#a8d8f0', '#3a3a4a', '#9aa0b0', '#f0b8d8', '#b878e8', '#e85a7a', '#f5f5f0', '#ff8a3c', '#5ae8c8', '#c83a3a', '#e8e8f0', '#7a5ae8', '#3ae85a'];
  const OUTFITS = ['#3a3a46', '#4a7aa8', '#5a8ac8', '#2a2a3a', '#5a6070', '#c8b0e0', '#6a3aa8', '#8a1e3a', '#b8b8c8', '#a8542a', '#2a8a6a', '#8a2a2a', '#9a9ab0', '#5a3aa8', '#2a8a3a'];
  const STYLES: HairStyle[] = ['spiky', 'long', 'bun', 'hood', 'wild', 'pony', 'twin', 'short', 'mohawk'];
  const WEAPONS_L: WeaponKind[] = ['sword', 'bow', 'staff', 'daggers', 'orb', 'shield', 'spear'];
  const ACCESS: AccessoryKind[] = ['none', 'halo', 'horns', 'crown', 'mask', 'ears', 'headband'];
  const AURAS = ['#9db0c4', '#3fb9ff', '#ffb43c', '#ff4fd8', '#7dff5a'];
  const SKINS_TONE = ['#e8bd93', '#f0c49a', '#f5d0a8', '#ffe0c0', '#e0a878', '#d8b898', '#f5cfa8', '#ffe8d0'];
  const POSPOOL: Pos[] = ['front', 'mid', 'back'];

  for (let i = 0; i < NAMES.length; i++) {
    const n = NAMES[i];
    const tierRoll = i % 10;
    const rarity: Rarity = i >= 44 ? 'mythic' : tierRoll < 4 ? 'common' : tierRoll < 7 ? 'rare' : tierRoll < 9 ? 'epic' : 'legendary';
    const rIdx = rarityIdx(rarity);
    const skill = SKILLSET[i % SKILLSET.length];
    const pos = POSPOOL[i % 3];
    // Cận chiến ở hàng sau sẽ tự xông lên, nên mọi vị trí đều dùng được cả hai kiểu.
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
      skill: { ...skill },
      look: {
        hair, outfit, outfit2: shadeHex(outfit, -0.35), skin: SKINS_TONE[i % SKINS_TONE.length],
        eyes: AURAS[rIdx], hairStyle: STYLES[i % STYLES.length], weapon: WEAPONS_L[i % WEAPONS_L.length],
        accessory: ACCESS[i % ACCESS.length], aura: AURAS[rIdx],
        cape: rIdx >= 2 ? shadeHex(outfit, -0.5) : undefined,
      },
    });
  }
})();

// ---------- skin của Kael ----------
export interface SkinDef { id: string; name: string; desc: string; look: ChibiLook }
export const SKINS: SkinDef[] = [
  {
    id: 'default', name: 'Kiếm Sĩ Đen', desc: 'Bộ giáp ám đen nhuốm máu trận mạc.',
    look: { hair: '#2a2a33', outfit: '#3a3a46', outfit2: '#22222c', skin: '#e8bd93', eyes: '#4a3520', hairStyle: 'spiky', weapon: 'sword', accessory: 'none', cape: '#3a1520', aura: '#c2172f' },
  },
  {
    id: 'crimson', name: 'Huyết Nguyệt Cuồng Chiến', desc: 'Giáp đỏ rực như trăng máu đêm thực nhật.',
    look: { hair: '#f0f0f5', outfit: '#8a1626', outfit2: '#4e0c16', skin: '#e8bd93', eyes: '#e81e3a', hairStyle: 'spiky', weapon: 'sword', accessory: 'horns', cape: '#5a0a16', aura: '#ff3b52' },
  },
  {
    id: 'gold', name: 'Thánh Kỵ Sĩ', desc: 'Giáp vàng ánh kim của đoàn kỵ sĩ vương đô.',
    look: { hair: '#e8c25a', outfit: '#d8b848', outfit2: '#8a7428', skin: '#e8bd93', eyes: '#2a5a8a', hairStyle: 'short', weapon: 'sword', accessory: 'crown', cape: '#c83030', aura: '#ffd23c' },
  },
  {
    id: 'shadow', name: 'Ảnh Sát Giả', desc: 'Tan vào bóng tối — chỉ còn ánh mắt đỏ.',
    look: { hair: '#1a1a24', outfit: '#24243a', outfit2: '#12121e', skin: '#d8b898', eyes: '#e81e3a', hairStyle: 'hood', weapon: 'daggers', accessory: 'mask', cape: '#161628', aura: '#8a4ae8' },
  },
  {
    id: 'void', name: 'Khởi Nguồn Hư Không', desc: 'Kẻ đã nhìn thấy đáy vực và bước ra nguyên vẹn.',
    look: { hair: '#c9a8ff', outfit: '#241638', outfit2: '#140a20', skin: '#e0d0e8', eyes: '#a78bfa', hairStyle: 'wild', weapon: 'sword', accessory: 'horns', cape: '#1a0e2c', aura: '#a78bfa' },
  },
];
export const SKIN_COST: Record<string, number> = { crimson: 500, gold: 800, shadow: 800, void: 2500 };

// ---------- vật phẩm ----------
export interface ItemDef {
  id: string; name: string; desc: string;
  bonus: { hp?: number; atk?: number; crit?: number; aspd?: number };
}
/** Mọi giá trị là TỈ LỆ PHẦN TRĂM (0.12 = +12%), cộng dồn theo số bản sao. */
export const ITEMS: ItemDef[] = [
  { id: 'sword', name: 'Kiếm Huyết Nguyệt', desc: '+12% Công mỗi bản sao', bonus: { atk: 0.12 } },
  { id: 'fang', name: 'Nanh Quỷ', desc: '+3% Chí mạng mỗi bản sao', bonus: { crit: 0.03 } },
  { id: 'armor', name: 'Giáp Xương Rồng', desc: '+12% Máu mỗi bản sao', bonus: { hp: 0.12 } },
  { id: 'boots', name: 'Ủng Gió Đêm', desc: '+6% Tốc đánh mỗi bản sao', bonus: { aspd: 0.06 } },
  { id: 'ring', name: 'Nhẫn Dấu Ấn', desc: '+8% Công & +8% Máu mỗi bản sao', bonus: { atk: 0.08, hp: 0.08 } },
  { id: 'cloak', name: 'Áo Choàng Thực Nhật', desc: '+5% Chí mạng & +6% Máu mỗi bản sao', bonus: { crit: 0.05, hp: 0.06 } },
  { id: 'talisman', name: 'Bùa Hộ Mệnh', desc: '+15% Máu mỗi bản sao', bonus: { hp: 0.15 } },
  { id: 'orb', name: 'Ngọc Cuồng Nộ', desc: '+10% Công & +5% Tốc đánh mỗi bản sao', bonus: { atk: 0.1, aspd: 0.05 } },
  { id: 'crown', name: 'Vương Miện Sọ Người', desc: '+10% Công & +4% Chí mạng mỗi bản sao', bonus: { atk: 0.1, crit: 0.04 } },
];
export const MAX_ITEM_SLOTS = 3;

// ---------- chi phí triệu hồi ----------
export const GACHA_COST = 100;
export const GACHA_X10_COST = 900;
export const GACHA_X100_COST = 8500;
export const GACHA_X500_COST = 40000;
export const WGACHA_COST = 150;
export const WGACHA_X10_COST = 1350;

// ---------- 200 vũ khí ----------
export interface WeaponDef { id: string; name: string; tier: Rarity; baseAtk: number }
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
      const suffix = `${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''}`;
      out.push({
        id: `wp_${tier}_${i}`,
        name: `${ps[i % ps.length]} ${BASE[(i + idx) % BASE.length]} ${suffix}`,
        tier,
        baseAtk: Math.round(atk * (1 + (i % 10) * 0.08)),
      });
      idx++;
    }
  }
  return out;
})();

// ---------- tên tầng ----------
export const FLOOR_NAMES = [
  'Cổng Xương', 'Hầm Rêu', 'Điện Gãy', 'Hang Dơi', 'Hành Lang Tro', 'Giếng Sâu', 'Vườn Gai', 'Cầu Than Thở', 'Ngục Rỉ Sét', 'Điện Phản Thệ',
  'Bờ Máu', 'Nhà Thờ Đắm', 'Hầm Gai', 'Đầm Lầy Dạ Quang', 'Thư Viện Cháy', 'Phòng Gương', 'Chuông Vỡ', 'Lò Mổ Cũ', 'Vực Than Khóc', 'Điện Đói Khát',
  'Thềm Thực Nhật', 'Rừng Treo Ngược', 'Sa Mạc Xương', 'Biển Tĩnh Lặng', 'Thành Phố Chìm', 'Cổng Sao Rơi', 'Điện Gió Gào', 'Lối Đi Không Tên', 'Bậc Thang Cuối', 'Ngai Vĩnh Cửu',
  'Bãi Chiến Xưa', 'Hầm Cột Gãy', 'Đường Gai Mọc', 'Giếng Khô', 'Phòng Thờ Cũ', 'Cầu Sắt Rỉ', 'Hang Tro Nén', 'Vực Gió Lùa', 'Điện Đổ Nát', 'Cổng Vực Sâu',
  'Sông Máu Ngầm', 'Nhà Xác Trôi', 'Đầm Dạ Quang', 'Hầm Thịt', 'Thư Viện Mốc', 'Phòng Gương Vỡ', 'Chuông Đắm', 'Lò Luyện Tội', 'Vực Khóc Than', 'Điện Huyết Vương',
  'Thềm Sao Rơi', 'Rừng Ngược', 'Sa Mạc Tro', 'Biển Không Sóng', 'Thành Chìm', 'Cổng Thiên Thạch', 'Điện Gió', 'Hành Lang Vô Danh', 'Bậc Thang Xoắn', 'Ngai Sụp Đổ',
  'Hầm Băng Đen', 'Cột Sống Khổng Lồ', 'Động Pha Lê', 'Suối Quên Lãng', 'Cầu Vồng Gãy', 'Vườn Tượng Đá', 'Phòng Thời Gian', 'Hang Phản Chiếu', 'Lối Mòn Vô Tận', 'Cổng Trời Sụp',
  'Điện Lửa Tàn', 'Ruộng Xương Trắng', 'Tháp Nghiêng', 'Đầm Lầy Sôi', 'Hầm Mộ Vua', 'Cổng Sừng Quỷ', 'Phòng Giam Thần', 'Hành Lang Gai Nhọn', 'Vực Sấm Rền', 'Điện Phán Xét',
  'Bến Đò Âm', 'Rừng Mắt Mở', 'Đồi Than Hồng', 'Cầu Hồn Vượt', 'Thung Lũng Quên', 'Cổng Trăng Máu', 'Điện Sương Mù', 'Hang Đom Đóm Ma', 'Bậc Vĩnh Biệt', 'Ngai Hư Không',
  'Cổng Hỗn Mang', 'Hành Lang Lưỡi', 'Phòng Ký Ức', 'Vực Phản Bội', 'Cầu Định Mệnh', 'Điện Tro Tàn', 'Hang Thần Chết', 'Lối Cuối Cùng', 'Bậc Thăng Thiên', 'Ngai Chúa Tể',
];

export type BossKind = 'knight' | 'ogre' | 'lich' | 'demon' | 'queen';
export interface BossDef { name: string; kind: BossKind }
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
  { name: 'VEXAL — Chúa Tể Vực Sâu', kind: 'demon' },
  { name: 'CARMILLA — Huyết Nữ Hoàng', kind: 'queen' },
  { name: 'ZERATH — Kẻ Nuốt Sao', kind: 'lich' },
  { name: 'KORGATH — Thần Sấm Sụp Đổ', kind: 'ogre' },
  { name: 'ARCHON — Thẩm Phán Lửa', kind: 'knight' },
  { name: 'NYX — Hình Hài Vô Định', kind: 'demon' },
  { name: 'CHÚA TỂ HỖN MANG — Khởi Nguồn', kind: 'demon' },
];

// ============ HẰNG SỐ CÂN BẰNG ============
// Bất biến cốt lõi: sức mạnh người chơi mua bằng vàng tăng theo
//   growthPerWave = GOLD_RATE ^ (ln(LEVEL_POWER) / ln(LEVEL_COST))
// nên FOE_HP_RATE được chọn khớp con số đó, cộng thêm biên an toàn nhỏ mà
// các nguồn nhân khác (cấp từ boss, trang bị, vũ khí, Thăng Hoa) sẽ bù vào.
export const BAL = {
  /** Máu quái đợt 1 tầng 1. */
  FOE_HP0: 34,
  /** Sát thương quái đợt 1 tầng 1. */
  FOE_ATK0: 5.5,
  /** Máu quái nhân lên mỗi đợt (7 đợt = 1 tầng → ×1.29/tầng). */
  FOE_HP_RATE: 1.0375,
  /** Sát thương quái tăng chậm hơn máu → về sau đội hình bền hơn. */
  FOE_ATK_RATE: 1.0325,
  /** Vàng rơi mỗi đợt. */
  GOLD0: 9,
  GOLD_RATE: 1.055,
  /** Chi phí nâng cấp: C0 × COST_RATE^level. */
  UP_COST0: 48,
  UP_COST_RATE: 1.16,
  /** Sức mạnh nhận được mỗi cấp. */
  LEVEL_POWER: 1.1,
  /** Máu nhận được mỗi cấp (thấp hơn công một chút để boss vẫn nguy hiểm). */
  LEVEL_HP: 1.093,
  /** Hệ số khó thêm cho mỗi tầng vượt quá tầng 100 (Vực Vô Tận). */
  ENDLESS_RATE: 1.55,
  /** Ngọc rơi cơ bản. */
  GEM_CHANCE: 0.28,
  /** Thưởng ngoại tuyến = tỉ lệ này × tốc độ farm chủ động. */
  OFFLINE_RATE: 0.35,
  OFFLINE_CAP_H: 8,
  /** Thăng Hoa: mỗi Huyết Ấn cộng bấy nhiêu vào hệ số nhân toàn cục. */
  SEAL_BONUS: 0.18,
  /** Tầng tối thiểu để được Thăng Hoa. */
  SEAL_MIN_FLOOR: 25,
  /** Nộ khí đầy thì tung tuyệt kỹ. */
  RAGE_MAX: 100,
  /** Cửa sổ nối chuỗi Liên Trảm (giây). */
  COMBO_WINDOW: 3.2,
  COMBO_MAX: 50,
} as const;

/** Chi phí nâng 1 cấp từ `lvl` lên `lvl+1`. */
export function upgradeCostAt(lvl: number): number {
  return Math.ceil(BAL.UP_COST0 * Math.pow(BAL.UP_COST_RATE, Math.max(0, lvl - 1)));
}
/** Tổng chi phí nâng `n` cấp liên tiếp — dùng công thức cấp số nhân, không lặp. */
export function upgradeCostRange(lvl: number, n: number): number {
  if (n <= 0) return 0;
  const r = BAL.UP_COST_RATE;
  const first = BAL.UP_COST0 * Math.pow(r, Math.max(0, lvl - 1));
  return Math.ceil(first * (Math.pow(r, n) - 1) / (r - 1));
}
/** Số cấp mua được tối đa với `gold` — nghịch đảo của công thức trên. */
export function levelsAffordable(lvl: number, gold: number, cap: number): number {
  const r = BAL.UP_COST_RATE;
  const first = BAL.UP_COST0 * Math.pow(r, Math.max(0, lvl - 1));
  if (gold < first) return 0;
  const n = Math.floor(Math.log(1 + (gold * (r - 1)) / first) / Math.log(r));
  return Math.max(0, Math.min(cap, n));
}
