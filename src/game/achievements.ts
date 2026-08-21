// ============ THÀNH TỰU ============
// 500 mốc, sinh ra từ 26 chỉ số × các bậc ngưỡng. Viết tay 500 dòng thì không
// ai soát nổi số học; sinh từ bảng ngưỡng thì đường cong phần thưởng luôn nhất
// quán và chỉ cần sửa một chỗ khi cân bằng lại.

import { fmt } from './data';

export type AchStatId =
  | 'kills' | 'bossKills' | 'bestFloor' | 'kaelLevel' | 'goldEarned' | 'gemsEarned'
  | 'pulls' | 'forges' | 'companionsOwned' | 'companionLevels' | 'maxCombo' | 'playTime'
  | 'runeLevels' | 'seals' | 'skinsOwned' | 'checkinTotal' | 'checkinStreak' | 'itemsOwned'
  | 'wavesCleared' | 'crits' | 'ults' | 'weaponsOwned' | 'clothEarned' | 'prestiges'
  | 'downs' | 'upgrades';

/** Năm hạng, mỗi hạng bốn bậc — dùng để nhóm và tô màu trên giao diện. */
export const ACH_RANKS = [
  { name: 'ĐỒNG', color: '#c98a5a' },
  { name: 'BẠC', color: '#c4cede' },
  { name: 'VÀNG', color: '#ffd23c' },
  { name: 'NGỌC', color: '#3fe0b0' },
  { name: 'THẦN', color: '#ff4fd8' },
] as const;
export const rankOfTier = (tier: number): number =>
  Math.max(0, Math.min(ACH_RANKS.length - 1, Math.floor(tier / 4)));

/**
 * Ngọc thưởng theo bậc. Đường cong cố ý dốc ở cuối: những bậc chót (25 triệu
 * mạng, tầng 300) là mồi nhử cho người chơi đường dài, còn 10 bậc đầu của mỗi
 * chỉ số mới là phần thu nhập thực tế mà đa số chạm tới.
 */
const ACH_GEM = [
  15, 22, 32, 46, 66, 95, 135, 190, 260, 350,
  480, 640, 850, 1100, 1500, 1950, 2500, 3300, 4200, 5400,
];
const gemForTier = (tier: number): number => ACH_GEM[Math.min(ACH_GEM.length - 1, tier)];

const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];

const hoursOf = (sec: number): string => {
  if (sec < 3600) return `${Math.round(sec / 60)} phút`;
  const h = sec / 3600;
  return h < 24 ? `${h % 1 === 0 ? h : h.toFixed(1)} giờ` : `${Math.round(h / 24)} ngày`;
};

interface AchCatDef {
  id: AchStatId;
  /** Tên nhóm, cũng là gốc tên của từng mốc. */
  name: string;
  /** Câu mô tả: `${verb} ${giá trị} ${unit}`. */
  verb: string;
  unit: string;
  color: string;
  thresholds: number[];
  /** Cách hiển thị ngưỡng; mặc định dùng `fmt`. */
  show?: (n: number) => string;
}

const CATS: AchCatDef[] = [
  {
    id: 'kills', name: 'Đồ Sát', verb: 'Hạ gục', unit: 'kẻ địch', color: '#ff5a4a',
    thresholds: [10, 25, 50, 120, 300, 700, 1500, 3000, 6000, 12000,
      25000, 50000, 1e5, 2.2e5, 4.5e5, 9e5, 1.8e6, 3.6e6, 7.5e6, 1.5e7],
  },
  {
    id: 'bossKills', name: 'Trảm Vương', verb: 'Chém ngã', unit: 'boss', color: '#ff3b52',
    thresholds: [1, 2, 3, 5, 8, 12, 18, 26, 36, 50, 70, 95, 130, 180, 250, 350, 500, 720, 1050, 1500],
  },
  {
    id: 'bestFloor', name: 'Độ Sâu', verb: 'Chạm tới', unit: 'tầng', color: '#a78bfa',
    thresholds: [2, 3, 5, 8, 12, 16, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200, 300],
    show: (n) => String(n),
  },
  {
    id: 'kaelLevel', name: 'Huyết Mạch', verb: 'Đưa Kael lên cấp', unit: '', color: '#ffd23c',
    thresholds: [5, 10, 20, 35, 55, 80, 110, 150, 200, 275, 360, 460, 580, 720, 900, 1100, 1400, 1800, 2400, 3000],
    show: (n) => String(n),
  },
  {
    id: 'goldEarned', name: 'Kho Vàng', verb: 'Thu về tổng cộng', unit: 'vàng', color: '#ffd23c',
    thresholds: [500, 2500, 1e4, 5e4, 2e5, 1e6, 5e6, 2e7, 1e8, 5e8,
      2e9, 1e10, 5e10, 2e11, 1e12, 5e12, 2e13, 1e14, 5e14, 2e15],
  },
  {
    id: 'gemsEarned', name: 'Kho Ngọc', verb: 'Thu về tổng cộng', unit: 'Ngọc', color: '#ff4fd8',
    thresholds: [100, 400, 1500, 5000, 15000, 40000, 1e5, 2.5e5, 6e5, 1.5e6,
      3e6, 6e6, 1.2e7, 2.5e7, 5e7, 1e8, 2e8, 4e8, 8e8, 1.5e9],
  },
  {
    id: 'pulls', name: 'Triệu Hồi', verb: 'Quay', unit: 'lượt', color: '#ff4fd8',
    thresholds: [1, 5, 15, 40, 80, 150, 300, 550, 900, 1500,
      2400, 3800, 6000, 9000, 14000, 21000, 32000, 48000, 72000, 1e5],
  },
  {
    id: 'forges', name: 'Lò Rèn', verb: 'Rèn', unit: 'lượt vũ khí', color: '#ff8a5a',
    thresholds: [1, 5, 15, 40, 80, 150, 280, 500, 850, 1400,
      2200, 3400, 5200, 8000, 12000, 18000, 27000, 40000, 60000, 90000],
  },
  {
    id: 'companionsOwned', name: 'Chiêu Mộ', verb: 'Sở hữu', unit: 'đồng hành khác nhau', color: '#3fb9ff',
    thresholds: [1, 2, 3, 5, 7, 10, 13, 17, 21, 26, 31, 36, 42, 48, 54, 60, 64, 68, 70, 72],
    show: (n) => String(n),
  },
  {
    id: 'companionLevels', name: 'Rèn Quân', verb: 'Cộng dồn', unit: 'cấp đồng hành', color: '#3fb9ff',
    thresholds: [10, 50, 150, 400, 1000, 2500, 6000, 14000, 30000, 60000,
      120000, 240000, 450000, 850000, 1.5e6, 2.8e6, 5e6, 9e6, 1.6e7, 3e7],
  },
  {
    id: 'maxCombo', name: 'Liên Trảm', verb: 'Nối chuỗi', unit: 'nhát liên tiếp', color: '#ff9a3c',
    thresholds: [3, 5, 8, 10, 12, 15, 18, 20, 23, 26, 29, 32, 35, 38, 41, 44, 46, 48, 49, 50],
    show: (n) => String(n),
  },
  {
    id: 'playTime', name: 'Trường Chinh', verb: 'Trụ lại vực sâu', unit: '', color: '#8cdcff',
    thresholds: [300, 900, 1800, 3600, 7200, 14400, 28800, 57600, 86400, 150000,
      260000, 450000, 750000, 1.2e6, 2e6, 3.2e6, 5e6, 8e6, 1.4e7, 2.5e7],
    show: hoursOf,
  },
  {
    id: 'runeLevels', name: 'Khảm Ngọc', verb: 'Nâng tổng cộng', unit: 'cấp Ngọc Huyết', color: '#ff5a4a',
    thresholds: [1, 5, 15, 30, 55, 90, 135, 190, 260, 340,
      430, 530, 640, 760, 880, 960, 1020, 1060, 1080, 1090],
    show: (n) => String(n),
  },
  {
    id: 'seals', name: 'Huyết Ấn', verb: 'Tích luỹ', unit: 'Huyết Ấn', color: '#a78bfa',
    thresholds: [1, 3, 6, 10, 16, 24, 35, 50, 70, 95, 130, 175, 230, 300, 400, 520, 680, 880, 1150, 1500],
    show: (n) => String(n),
  },
  {
    id: 'skinsOwned', name: 'Tủ Đồ', verb: 'Sở hữu', unit: 'bộ trang phục', color: '#c2172f',
    thresholds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    show: (n) => String(n),
  },
  {
    id: 'checkinTotal', name: 'Điểm Danh', verb: 'Điểm danh', unit: 'ngày', color: '#7dff5a',
    thresholds: [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 150, 200, 250, 300, 365, 450, 550, 650, 800, 1000],
    show: (n) => String(n),
  },
  {
    id: 'checkinStreak', name: 'Kiên Trì', verb: 'Điểm danh liên tiếp', unit: 'ngày', color: '#7dff5a',
    thresholds: [2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365],
    show: (n) => String(n),
  },
  {
    id: 'itemsOwned', name: 'Bảo Khố', verb: 'Gom', unit: 'bản sao vật phẩm', color: '#ffb43c',
    thresholds: [1, 3, 6, 12, 25, 50, 90, 150, 250, 400,
      650, 1000, 1600, 2500, 4000, 6000, 9000, 14000, 20000, 30000],
  },
  {
    id: 'wavesCleared', name: 'Vượt Đợt', verb: 'Dọn sạch', unit: 'đợt quái', color: '#ece4d2',
    thresholds: [7, 25, 70, 175, 350, 700, 1400, 2800, 5600, 11000,
      22000, 44000, 88000, 175000, 350000, 700000, 1.4e6, 2.8e6, 5.6e6, 1.1e7],
  },
  {
    id: 'crits', name: 'Tử Huyệt', verb: 'Ra', unit: 'đòn chí mạng', color: '#ffd23c',
    thresholds: [10, 50, 200, 800, 3000, 10000, 30000, 90000, 250000, 700000,
      1.8e6, 4.5e6, 1.1e7, 2.6e7, 6e7, 1.4e8, 3e8, 7e8, 1.5e9, 3e9],
  },
  {
    id: 'ults', name: 'Hợp Kích', verb: 'Tung', unit: 'lần Huyết Nguyệt Trảm', color: '#ff3b52',
    thresholds: [1, 5, 20, 60, 150, 400, 1000, 2500, 6000, 14000,
      32000, 70000, 150000, 320000, 650000, 1.3e6, 2.6e6, 5e6, 1e7, 2e7],
  },
  {
    id: 'weaponsOwned', name: 'Binh Khí Phổ', verb: 'Ghi danh', unit: 'món vũ khí', color: '#ff8a5a',
    thresholds: [1, 2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 26, 27, 28, 29, 30],
    show: (n) => String(n),
  },
  {
    id: 'clothEarned', name: 'Vân Cẩm', verb: 'Nhặt', unit: 'Mảnh Trang Phục', color: '#8cdcff',
    thresholds: [1, 3, 5, 8, 10, 14, 20, 26, 32, 40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160],
    show: (n) => String(n),
  },
  {
    id: 'prestiges', name: 'Thăng Hoa', verb: 'Thăng Hoa', unit: 'lần', color: '#ff4fd8',
    thresholds: [1, 2, 3, 5, 8, 12, 17, 24, 33, 45, 60, 80, 105, 135, 175, 225, 290, 370, 470, 600],
    show: (n) => String(n),
  },
  {
    id: 'downs', name: 'Bất Khuất', verb: 'Gục ngã rồi đứng dậy', unit: 'lần', color: '#6f6780',
    thresholds: [1, 5, 20, 60, 150, 350, 800, 1800, 4000, 9000,
      20000, 45000, 95000, 200000, 420000, 880000, 1.8e6, 3.6e6, 7.2e6, 1.4e7],
  },
  {
    id: 'upgrades', name: 'Tôi Luyện', verb: 'Bấm nâng cấp', unit: 'cấp', color: '#3fe0b0',
    thresholds: [1, 10, 50, 200, 800, 3000, 10000, 35000, 120000, 400000, 1.2e6, 3.5e6, 1e7, 3e7],
  },
];

export interface Achievement {
  id: string;
  stat: AchStatId;
  /** Nhóm hiển thị. */
  group: string;
  name: string;
  desc: string;
  need: number;
  gems: number;
  tier: number;
  color: string;
}

export const ACHIEVEMENTS: Achievement[] = CATS.flatMap((c) =>
  c.thresholds.map((need, tier) => {
    const shown = (c.show ?? fmt)(need);
    return {
      id: `${c.id}_${tier}`,
      stat: c.id,
      group: c.name,
      name: `${c.name} ${ROMAN[tier] ?? tier + 1}`,
      desc: c.unit ? `${c.verb} ${shown} ${c.unit}` : `${c.verb} ${shown}`,
      need,
      gems: gemForTier(tier),
      tier,
      color: c.color,
    };
  }),
);

export const ACH_TOTAL = ACHIEVEMENTS.length;
/** Nhóm theo chỉ số, giữ nguyên thứ tự khai báo — giao diện duyệt theo bảng này. */
export const ACH_GROUPS: Array<{ stat: AchStatId; name: string; color: string; list: Achievement[] }> =
  CATS.map((c) => ({
    stat: c.id,
    name: c.name,
    color: c.color,
    list: ACHIEVEMENTS.filter((a) => a.stat === c.id),
  }));

export const achById = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);
