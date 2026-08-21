// ============ LIÊN KẾT ĐỘI HÌNH ============
// Lý do tồn tại: trước đây đội hình tối ưu luôn là "xếp 12 con mạnh nhất",
// nên 72 đồng hành thực chất chỉ có khoảng 15 con được dùng. Liên Kết đổi câu
// hỏi từ "con nào mạnh nhất" thành "bộ nào ăn khớp nhất".
//
// Hai chốt giữ cho nó không vỡ:
//   1. Chỉ đếm những đồng hành **thật sự đứng trên sân** (12 chỗ đầu), không
//      đếm đội tiếp viện. Đếm cả 50 thì mọi liên kết đều bật sẵn và cơ chế
//      này thành một cục buff miễn phí.
//   2. Mỗi liên kết có trần bậc riêng, và tổng vẫn đi qua trần chung của
//      `partyAtkAura` / `partyGoldAura` / `partyGemAura` trong engine.

import type { CompanionDef } from './data';

export interface SynergyEffect {
  /** Nhân vào sát thương toàn đội. */
  atkMul?: number;
  /** Nhân vào máu toàn đội. */
  hpMul?: number;
  goldMul?: number;
  gemMul?: number;
  /** Cộng thẳng vào tỉ lệ chí mạng. */
  crit?: number;
  /** Cộng thẳng vào tốc đánh (dạng tỉ lệ). */
  aspd?: number;
  /** Cộng thẳng vào tỉ lệ hút máu của toàn đội. */
  lifesteal?: number;
  /** Nhân vào thời gian hồi sinh — nhỏ hơn 1 là hồi sinh nhanh hơn. */
  respawnMul?: number;
}

export interface SynergyTier {
  need: number;
  desc: string;
  effect: SynergyEffect;
}

export interface SynergyDef {
  id: string;
  name: string;
  /** Đếm theo môn phái hay theo vai trò. */
  kind: 'school' | 'role';
  /** Giá trị cần khớp trong `CompanionDef.school` hoặc `.role`. */
  key: string;
  color: string;
  tiers: SynergyTier[];
}

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'syn_bloodmoon', name: 'Huyết Nguyệt', kind: 'school', key: 'Huyết Nguyệt', color: '#ff3b52',
    tiers: [
      { need: 2, desc: 'Toàn đội hút 10% sát thương thành máu', effect: { lifesteal: 0.1 } },
      { need: 4, desc: 'Hút máu 18% · +12% sát thương', effect: { lifesteal: 0.18, atkMul: 1.12 } },
      { need: 6, desc: 'Hút máu 28% · +25% sát thương', effect: { lifesteal: 0.28, atkMul: 1.25 } },
    ],
  },
  {
    id: 'syn_thunder', name: 'Lôi Điện', kind: 'school', key: 'Lôi Điện', color: '#ffd23c',
    tiers: [
      { need: 2, desc: '+8% tốc đánh toàn đội', effect: { aspd: 0.08 } },
      { need: 4, desc: '+16% tốc đánh · +6% chí mạng', effect: { aspd: 0.16, crit: 0.06 } },
      { need: 6, desc: '+26% tốc đánh · +12% chí mạng', effect: { aspd: 0.26, crit: 0.12 } },
    ],
  },
  {
    id: 'syn_frost', name: 'Băng Giá', kind: 'school', key: 'Băng Giá', color: '#8cdcff',
    tiers: [
      { need: 2, desc: '+15% máu toàn đội', effect: { hpMul: 1.15 } },
      { need: 4, desc: '+32% máu · hồi sinh nhanh hơn 20%', effect: { hpMul: 1.32, respawnMul: 0.8 } },
      { need: 6, desc: '+55% máu · hồi sinh nhanh hơn 35%', effect: { hpMul: 1.55, respawnMul: 0.65 } },
    ],
  },
  {
    id: 'syn_flame', name: 'Viêm Vương', kind: 'school', key: 'Viêm Vương', color: '#ff7a3c',
    tiers: [
      { need: 2, desc: '+14% sát thương toàn đội', effect: { atkMul: 1.14 } },
      { need: 4, desc: '+30% sát thương', effect: { atkMul: 1.3 } },
      { need: 6, desc: '+52% sát thương · +6% chí mạng', effect: { atkMul: 1.52, crit: 0.06 } },
    ],
  },
  {
    id: 'syn_holy', name: 'Thánh Quang', kind: 'school', key: 'Thánh Quang', color: '#fff4c8',
    tiers: [
      { need: 2, desc: 'Hồi sinh nhanh hơn 25%', effect: { respawnMul: 0.75 } },
      { need: 4, desc: 'Hồi sinh nhanh hơn 40% · +18% máu', effect: { respawnMul: 0.6, hpMul: 1.18 } },
      { need: 6, desc: 'Hồi sinh nhanh hơn 55% · +35% máu · hút máu 12%', effect: { respawnMul: 0.45, hpMul: 1.35, lifesteal: 0.12 } },
    ],
  },
  {
    id: 'syn_shadow', name: 'Ảnh Sát', kind: 'school', key: 'Ảnh Sát', color: '#a78bfa',
    tiers: [
      { need: 2, desc: '+7% chí mạng', effect: { crit: 0.07 } },
      { need: 4, desc: '+15% chí mạng · +10% tốc đánh', effect: { crit: 0.15, aspd: 0.1 } },
      { need: 6, desc: '+25% chí mạng · +18% tốc đánh', effect: { crit: 0.25, aspd: 0.18 } },
    ],
  },
  {
    id: 'syn_stone', name: 'Nham Thạch', kind: 'school', key: 'Nham Thạch', color: '#c98a5a',
    tiers: [
      { need: 2, desc: '+20% máu toàn đội', effect: { hpMul: 1.2 } },
      { need: 4, desc: '+45% máu · +10% sát thương', effect: { hpMul: 1.45, atkMul: 1.1 } },
    ],
  },
  {
    id: 'syn_void', name: 'Hư Không', kind: 'school', key: 'Hư Không', color: '#b14bff',
    tiers: [
      { need: 2, desc: '+20% Ngọc rơi ra', effect: { gemMul: 1.2 } },
      { need: 4, desc: '+45% Ngọc · +12% sát thương', effect: { gemMul: 1.45, atkMul: 1.12 } },
    ],
  },
  // ---- theo vai trò ----
  {
    id: 'syn_support', name: 'Hậu Cần', kind: 'role', key: 'Hỗ Trợ', color: '#3fe0b0',
    tiers: [
      { need: 2, desc: 'Hồi sinh nhanh hơn 20% · +10% máu', effect: { respawnMul: 0.8, hpMul: 1.1 } },
      { need: 3, desc: 'Hồi sinh nhanh hơn 35% · +22% máu · hút máu 8%', effect: { respawnMul: 0.65, hpMul: 1.22, lifesteal: 0.08 } },
    ],
  },
  {
    id: 'syn_assassin', name: 'Ám Sát Đoàn', kind: 'role', key: 'Sát Thủ', color: '#ff4fd8',
    tiers: [
      { need: 2, desc: '+8% chí mạng · +8% tốc đánh', effect: { crit: 0.08, aspd: 0.08 } },
      { need: 3, desc: '+16% chí mạng · +16% tốc đánh · +12% sát thương', effect: { crit: 0.16, aspd: 0.16, atkMul: 1.12 } },
    ],
  },
  {
    id: 'syn_mage', name: 'Pháp Hội', kind: 'role', key: 'Pháp Sư', color: '#8cdcff',
    tiers: [
      { need: 2, desc: '+12% sát thương', effect: { atkMul: 1.12 } },
      { need: 3, desc: '+26% sát thương · +15% Ngọc', effect: { atkMul: 1.26, gemMul: 1.15 } },
    ],
  },
  {
    id: 'syn_fighter', name: 'Tiền Tuyến', kind: 'role', key: 'Đấu Sĩ', color: '#ff9a3c',
    tiers: [
      { need: 2, desc: '+15% máu · +8% sát thương', effect: { hpMul: 1.15, atkMul: 1.08 } },
      { need: 3, desc: '+32% máu · +18% sát thương', effect: { hpMul: 1.32, atkMul: 1.18 } },
    ],
  },
  {
    id: 'syn_merchant', name: 'Thương Hội', kind: 'school', key: 'Thương Hội', color: '#ffd23c',
    tiers: [
      { need: 1, desc: '+15% Vàng rơi ra', effect: { goldMul: 1.15 } },
      { need: 2, desc: '+40% Vàng · +15% Ngọc', effect: { goldMul: 1.4, gemMul: 1.15 } },
    ],
  },
];

export interface ActiveSynergy {
  id: string;
  name: string;
  color: string;
  count: number;
  /** Bậc đang bật, −1 khi chưa đủ người. */
  tier: number;
  desc: string;
  /** Số người còn thiếu để lên bậc kế tiếp; 0 khi đã kịch bậc. */
  toNext: number;
  nextNeed: number;
}

/** Cộng dồn hai bộ hiệu ứng — nhân với nhân, cộng với cộng. */
function merge(a: Required<SynergyEffect>, b: SynergyEffect): void {
  a.atkMul *= b.atkMul ?? 1;
  a.hpMul *= b.hpMul ?? 1;
  a.goldMul *= b.goldMul ?? 1;
  a.gemMul *= b.gemMul ?? 1;
  a.respawnMul *= b.respawnMul ?? 1;
  a.crit += b.crit ?? 0;
  a.aspd += b.aspd ?? 0;
  a.lifesteal += b.lifesteal ?? 0;
}

export function emptySynergy(): Required<SynergyEffect> {
  return {
    atkMul: 1, hpMul: 1, goldMul: 1, gemMul: 1, respawnMul: 1,
    crit: 0, aspd: 0, lifesteal: 0,
  };
}

/**
 * Giải liên kết cho một đội hình đang đứng trên sân.
 * Trả về cả hiệu ứng cộng dồn lẫn danh sách để hiển thị — giao diện và engine
 * dùng chung một phép tính, không có chỗ cho hai con số lệch nhau.
 */
export function resolveSynergies(fielded: CompanionDef[]): {
  effect: Required<SynergyEffect>;
  active: ActiveSynergy[];
} {
  const effect = emptySynergy();
  const active: ActiveSynergy[] = [];
  for (const s of SYNERGIES) {
    const count = fielded.filter((c) => (s.kind === 'school' ? c.school : c.role) === s.key).length;
    let tier = -1;
    for (let i = 0; i < s.tiers.length; i++) if (count >= s.tiers[i].need) tier = i;
    if (tier >= 0) merge(effect, s.tiers[tier].effect);
    const next = s.tiers[tier + 1];
    // Chỉ báo cáo những liên kết đã bật, hoặc sắp bật (thiếu tối đa 2 người):
    // liệt kê cả 13 dòng lúc nào cũng hiện thì bảng thành một bức tường chữ.
    if (tier >= 0 || (count > 0 && next && next.need - count <= 2)) {
      active.push({
        id: s.id, name: s.name, color: s.color, count, tier,
        desc: tier >= 0 ? s.tiers[tier].desc : `Cần ${s.tiers[0].need} người để mở`,
        toNext: next ? next.need - count : 0,
        nextNeed: next ? next.need : 0,
      });
    }
  }
  // Liên kết đã bật lên trước, rồi tới cái gần bật nhất.
  active.sort((a, b) => (b.tier - a.tier) || (a.toNext - b.toNext));
  return { effect, active };
}
