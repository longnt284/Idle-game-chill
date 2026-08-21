// ============ NHIỆM VỤ & HUYẾT LỆNH ============
// Điểm Danh trả công cho việc *mở game*; hệ này trả công cho việc *chơi*.
//
// Hai lớp lồng nhau:
//   1. Nhiệm Vụ ngày (4 ô, đổi lúc nửa đêm) và tuần (3 ô, đổi thứ Hai) —
//      nhịp ngắn, luôn có việc để làm ngay khi vào.
//   2. Huyết Lệnh — đường mùa giải 40 bậc, ăn Ấn Điểm từ nhiệm vụ và từ
//      chiến đấu, reset cùng chu kỳ tháng với lịch điểm danh.
//
// Bất biến quan trọng: **tiến độ nhiệm vụ không lưu riêng một bộ đếm nào cả**.
// Mỗi ô ghi lại giá trị bộ đếm tích luỹ tại lúc sinh ra (`baseline`), tiến độ
// luôn là hiệu số hiện tại trừ baseline. Nhờ vậy không thể có chuyện bộ đếm
// nhiệm vụ lệch khỏi bộ đếm thành tựu, và bản lưu hỏng cũng không tạo ra
// tiến độ ma.

import { fmt } from './data';

/** Chỉ số nhiệm vụ bám theo — đều là bộ đếm tích luỹ có sẵn trong engine. */
export type QuestStat =
  | 'kills' | 'bossKills' | 'wavesCleared' | 'forges' | 'pulls'
  | 'crits' | 'ults' | 'upgrades' | 'goldEarned' | 'gemsEarned';

export interface QuestDef {
  id: string;
  stat: QuestStat;
  name: string;
  /** Mô tả sinh theo mục tiêu, ví dụ "Hạ 400 kẻ địch". */
  text: (n: number) => string;
  color: string;
  /** Mục tiêu cơ bản cho ô ngày; ô tuần nhân thêm `WEEKLY_SCALE`. */
  base: number;
  /** Ấn Điểm khi hoàn thành ô ngày. */
  points: number;
  /** Mục tiêu có tỉ lệ theo tiến trình người chơi (vàng/ngọc thì có). */
  scaleWithFloor?: boolean;
}

const QUESTS: QuestDef[] = [
  {
    id: 'q_kills', stat: 'kills', name: 'Đồ Sát', color: '#ff5a4a',
    text: (n) => `Hạ ${fmt(n)} kẻ địch`, base: 400, points: 30,
  },
  {
    id: 'q_boss', stat: 'bossKills', name: 'Trảm Vương', color: '#ff3b52',
    text: (n) => `Chém ngã ${n} boss`, base: 3, points: 40,
  },
  {
    id: 'q_waves', stat: 'wavesCleared', name: 'Càn Quét', color: '#8cdcff',
    text: (n) => `Dọn sạch ${n} đợt quái`, base: 40, points: 28,
  },
  {
    id: 'q_forge', stat: 'forges', name: 'Lò Rèn Đỏ Lửa', color: '#ff8a5a',
    text: (n) => `Rèn ${n} lượt vũ khí`, base: 10, points: 32,
  },
  {
    id: 'q_pull', stat: 'pulls', name: 'Đài Triệu Hồi', color: '#ff4fd8',
    text: (n) => `Triệu hồi ${n} lượt`, base: 10, points: 32,
  },
  {
    id: 'q_crit', stat: 'crits', name: 'Tử Huyệt', color: '#ffd23c',
    text: (n) => `Đánh trúng ${fmt(n)} đòn chí mạng`, base: 300, points: 26,
  },
  {
    id: 'q_ult', stat: 'ults', name: 'Nộ Khí Trào Dâng', color: '#a78bfa',
    text: (n) => `Tung ${n} lần tuyệt kỹ`, base: 8, points: 30,
  },
  {
    id: 'q_upgrade', stat: 'upgrades', name: 'Tôi Luyện', color: '#3fe0b0',
    text: (n) => `Nâng cấp ${n} lần`, base: 25, points: 26,
  },
  {
    id: 'q_gold', stat: 'goldEarned', name: 'Chất Vàng', color: '#ffd23c',
    text: (n) => `Thu về ${fmt(n)} Vàng`, base: 1, points: 28, scaleWithFloor: true,
  },
  {
    id: 'q_gem', stat: 'gemsEarned', name: 'Gom Ngọc', color: '#ff4fd8',
    text: (n) => `Thu về ${fmt(n)} Ngọc`, base: 1, points: 34, scaleWithFloor: true,
  },
];
export const questDefById = (id: string): QuestDef | undefined => QUESTS.find((q) => q.id === id);

export const DAILY_QUEST_SLOTS = 4;
export const WEEKLY_QUEST_SLOTS = 3;
/** Ô tuần nặng gấp bấy nhiêu lần ô ngày, cả mục tiêu lẫn phần thưởng. */
export const WEEKLY_SCALE = 6;

/**
 * Bốc `n` nhiệm vụ **khác nhau** từ một khoá chu kỳ.
 * Cùng một khoá luôn cho cùng một bộ, nên đóng tab mở lại không tráo bài —
 * và không cần lưu danh sách vào bản lưu.
 */
function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pickQuests(key: string, n: number): QuestDef[] {
  const pool = [...QUESTS];
  const out: QuestDef[] = [];
  let h = hashOf(key);
  for (let i = 0; i < n && pool.length > 0; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}
export const dailyQuestsOf = (dayKey: string): QuestDef[] => pickQuests(`d:${dayKey}`, DAILY_QUEST_SLOTS);
export const weeklyQuestsOf = (weekKey: string): QuestDef[] => pickQuests(`w:${weekKey}`, WEEKLY_QUEST_SLOTS);

/** Khoá tuần ISO đơn giản: năm + số tuần tính từ thứ Hai. */
export function weekKeyOf(d: Date = new Date()): string {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Đưa về thứ Năm cùng tuần rồi đếm từ đầu năm — cách chuẩn của ISO-8601,
  // tránh tuần giao năm bị đếm thành hai tuần khác nhau ở hai ngày liền kề.
  const dow = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - dow + 3);
  const firstThu = new Date(t.getFullYear(), 0, 4);
  const fdow = (firstThu.getDay() + 6) % 7;
  firstThu.setDate(firstThu.getDate() - fdow + 3);
  const week = 1 + Math.round((t.getTime() - firstThu.getTime()) / (7 * 86400000));
  return `${t.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ---------- Huyết Lệnh ----------
export const EDICT_MAX_LEVEL = 40;
/**
 * Ấn Điểm cần để lên bậc `lvl` → `lvl+1`.
 * Tổng cả 40 bậc ≈ 5.540 điểm. Một tuần chơi đều mang lại ~1.290 điểm (4 ô
 * ngày × 7 + 3 ô tuần), nên đi trọn đường mất khoảng một tháng — vừa khớp
 * với chu kỳ reset, và Hard/Evil là cách rút ngắn nó.
 */
export function edictCostAt(lvl: number): number {
  return 80 + Math.max(0, lvl) * 3;
}
export function edictTotalUpTo(lvl: number): number {
  let s = 0;
  for (let i = 0; i < lvl; i++) s += edictCostAt(i);
  return s;
}

export type EdictRewardKind = 'gem' | 'gold' | 'cloth' | 'wshard' | 'item';
export interface EdictReward {
  kind: EdictRewardKind;
  amount: number;
  /** Nhãn ngắn hiển thị trên đường mùa giải. */
  label: string;
  color: string;
  /** Bậc mốc — khung to hơn trên giao diện. */
  big?: boolean;
}

/**
 * Phần thưởng của bậc `lvl` (1-based).
 * Sinh từ công thức thay vì bảng tay: 40 dòng viết tay thì không ai soát nổi,
 * còn công thức thì đường cong luôn tăng đều và sửa một chỗ là xong.
 */
export function edictRewardAt(lvl: number): EdictReward {
  if (lvl % 10 === 0) {
    // Bốn mốc lớn: mảnh vũ khí bậc cao — thứ không mua được bằng Ngọc.
    const n = 2 + lvl / 10;
    return { kind: 'wshard', amount: n, label: `${n} Mảnh Vũ Khí bậc cao`, color: '#ff8a5a', big: true };
  }
  if (lvl % 5 === 0) return { kind: 'cloth', amount: 1, label: '1 Mảnh Trang Phục', color: '#8cdcff', big: true };
  if (lvl % 7 === 0) return { kind: 'item', amount: 1, label: '1 Vật Phẩm', color: '#7dff5a' };
  if (lvl % 3 === 0) {
    const minutes = 8 + lvl;
    return { kind: 'gold', amount: minutes, label: `${minutes} phút Vàng`, color: '#ffd23c' };
  }
  const gems = 120 + lvl * 45;
  return { kind: 'gem', amount: gems, label: `${fmt(gems)} Ngọc`, color: '#ff4fd8' };
}

/**
 * Ấn Điểm rơi ra từ chiến đấu — nhỏ giọt để người chơi cày dài vẫn tiến,
 * nhưng không thay được nhiệm vụ: một đợt quái cho 1 điểm, tức phải dọn ~5.500
 * đợt mới đi hết mùa nếu bỏ hẳn nhiệm vụ.
 */
export const EDICT_PER_WAVE = 1;
export const EDICT_PER_BOSS = 6;
