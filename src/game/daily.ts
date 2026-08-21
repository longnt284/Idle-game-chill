// ============ ĐIỂM DANH MỖI NGÀY ============
// Lịch 30 ô, reset vào đầu mỗi tháng dương lịch. Ô được mở theo THỨ TỰ lần
// điểm danh trong tháng chứ không theo ngày trong tháng: bỏ lỡ một ngày chỉ
// làm chậm lịch lại, không đốt mất phần thưởng. Nhờ vậy "đăng nhập đủ một
// tháng" luôn nhận trọn 30 ô, kể cả tháng 31 ngày.

import type { Rarity } from './data';
import { SKIN_SHARD_COST } from './data';

export type DailyRewardKind = 'gem' | 'gold' | 'wshard' | 'cloth' | 'item';

export interface DailyReward {
  kind: DailyRewardKind;
  /** Số lượng. Riêng `gold` là SỐ PHÚT farm quy đổi, không phải số vàng tuyệt đối. */
  amount: number;
  /** Bậc vũ khí nhận được, chỉ dùng cho `wshard`. */
  tier?: Rarity;
}

export interface DailyDay {
  day: number;
  rewards: DailyReward[];
  /** Ngày mốc — khung to hơn, hiệu ứng mạnh hơn trên giao diện. */
  big?: boolean;
}

const gem = (amount: number): DailyReward => ({ kind: 'gem', amount });
/** Vàng quy đổi theo phút farm: giá trị tuyệt đối được engine tính lúc nhận. */
const gold = (minutes: number): DailyReward => ({ kind: 'gold', amount: minutes });
const wshard = (amount: number, tier: Rarity): DailyReward => ({ kind: 'wshard', amount, tier });
const cloth = (amount: number): DailyReward => ({ kind: 'cloth', amount });
const item = (amount: number): DailyReward => ({ kind: 'item', amount });

/**
 * Lịch 30 ngày.
 *
 * Ba trục cân bằng:
 * - Mảnh Trang Phục rơi đúng 10 ô (ngày 3, 6, 9 … 30) → đi đủ một tháng ghép
 *   trọn một bộ, không sớm hơn một ngày nào.
 * - Ngọc cộng dồn 3.930 cho cả tháng, tương đương ~36 lượt quay đơn — hơn một
 *   lượt mỗi ngày, đủ để thấy đáng nhưng không thay được việc cày.
 * - Vàng luôn tính theo nhịp farm hiện tại nên không lỗi thời ở tầng sâu.
 */
export const DAILY_CALENDAR: DailyDay[] = [
  { day: 1, rewards: [gem(60)] },
  { day: 2, rewards: [gold(6)] },
  { day: 3, rewards: [cloth(1), gem(40)] },
  { day: 4, rewards: [gem(90)] },
  { day: 5, rewards: [wshard(1, 'rare')] },
  { day: 6, rewards: [cloth(1), gold(8)] },
  { day: 7, rewards: [gem(260), wshard(2, 'rare')], big: true },
  { day: 8, rewards: [gold(10)] },
  { day: 9, rewards: [cloth(1), gem(70)] },
  { day: 10, rewards: [wshard(2, 'rare')] },
  { day: 11, rewards: [gem(110)] },
  { day: 12, rewards: [cloth(1), gold(12)] },
  { day: 13, rewards: [wshard(1, 'epic')] },
  { day: 14, rewards: [gem(380), item(1)], big: true },
  { day: 15, rewards: [cloth(1), gem(90)] },
  { day: 16, rewards: [gold(16)] },
  { day: 17, rewards: [wshard(2, 'rare')] },
  { day: 18, rewards: [cloth(1), gem(130)] },
  { day: 19, rewards: [gem(150)] },
  { day: 20, rewards: [wshard(2, 'epic')] },
  { day: 21, rewards: [cloth(1), gem(460)], big: true },
  { day: 22, rewards: [gold(22)] },
  { day: 23, rewards: [gem(170)] },
  { day: 24, rewards: [cloth(1), wshard(2, 'epic')] },
  { day: 25, rewards: [gem(200)] },
  { day: 26, rewards: [gold(26)] },
  { day: 27, rewards: [cloth(1), gem(220)] },
  { day: 28, rewards: [gem(600), wshard(3, 'epic')], big: true },
  { day: 29, rewards: [gold(30), item(1)] },
  { day: 30, rewards: [cloth(1), gem(900), wshard(2, 'legendary')], big: true },
];

export const DAILY_CYCLE_DAYS = DAILY_CALENDAR.length;
/** Tổng Mảnh Trang Phục một tháng trọn vẹn mang lại — đúng bằng một bộ. */
export const DAILY_CLOTH_TOTAL = DAILY_CALENDAR.reduce(
  (n, d) => n + d.rewards.reduce((m, r) => m + (r.kind === 'cloth' ? r.amount : 0), 0),
  0,
);

// Bất biến của thiết kế: đi đủ một tháng thì ghép được đúng một bộ trang phục.
// Nếu ai đó chỉnh lịch mà quên trục này, dòng dưới sẽ hét lên ngay khi tải.
if (DAILY_CLOTH_TOTAL !== SKIN_SHARD_COST) {
  // eslint-disable-next-line no-console
  console.warn(
    `[daily] Lịch điểm danh cho ${DAILY_CLOTH_TOTAL} Mảnh Trang Phục nhưng một bộ cần ${SKIN_SHARD_COST}.`,
  );
}

export const REWARD_META: Record<DailyRewardKind, { name: string; color: string }> = {
  gem: { name: 'Ngọc Huyết Nguyệt', color: '#ff4fd8' },
  gold: { name: 'Vàng', color: '#ffd23c' },
  wshard: { name: 'Mảnh Vũ Khí', color: '#ff8a5a' },
  cloth: { name: 'Mảnh Trang Phục', color: '#8cdcff' },
  item: { name: 'Vật Phẩm', color: '#7dff5a' },
};

/** Khoá chu kỳ theo tháng dương lịch địa phương, ví dụ `2026-08`. */
export function cycleKeyOf(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
/** Khoá ngày địa phương, dùng để chặn điểm danh hai lần trong cùng một ngày. */
export function dayKeyOf(d: Date = new Date()): string {
  return `${cycleKeyOf(d)}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Khoá của ngày liền trước — dùng để biết chuỗi ngày liên tiếp có đứt không. */
export function prevDayKey(d: Date = new Date()): string {
  const p = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return dayKeyOf(p);
}
/** Số ngày còn lại của tháng, tính cả hôm nay. */
export function daysLeftInCycle(d: Date = new Date()): number {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return end - d.getDate() + 1;
}
