// ============ PHÁI ĐOÀN ============
// Chỗ dùng cho 60 đồng hành không bao giờ được ra sân.
//
// Cái giá phải trả là có thật: đồng hành đang đi Phái Đoàn bị **loại khỏi đội
// hình** cho tới khi về. Không có cái giá đó thì đây chỉ là một nút bấm cho
// tài nguyên miễn phí; có nó thì người chơi phải cân giữa lực chiến hôm nay
// và tài nguyên ngày mai — và đó mới là quyết định đáng để đưa ra.

export interface ExpeditionRoute {
  id: string;
  name: string;
  desc: string;
  /** Thời gian đi, tính bằng giờ. */
  hours: number;
  /** Số đồng hành phải cử đi. */
  slots: number;
  color: string;
  /**
   * Lực chiến khuyến nghị của cả nhóm cử đi, tính theo bội số của lực chiến
   * trung bình một đồng hành. Thiếu thì vẫn đi được nhưng phần thưởng bị cắt.
   */
  power: number;
}

export const EXPEDITION_ROUTES: ExpeditionRoute[] = [
  {
    id: 'ex_scout', name: 'Tuần Đêm', hours: 4, slots: 2, color: '#8cdcff', power: 1,
    desc: 'Một vòng quanh các tầng đã dọn. Ngắn, chắc ăn.',
  },
  {
    id: 'ex_dig', name: 'Khai Quật Hầm Cũ', hours: 8, slots: 3, color: '#ffb43c', power: 2.2,
    desc: 'Đào lại những tầng đổ nát — nơi mảnh vũ khí hay lẫn trong đá vụn.',
  },
  {
    id: 'ex_deep', name: 'Viễn Chinh Vực Sâu', hours: 24, slots: 4, color: '#b14bff', power: 5,
    desc: 'Đi xuống chỗ đoàn quân chính chưa tới. Lâu, nhưng đáng.',
  },
];
export const routeById = (id: string): ExpeditionRoute | undefined =>
  EXPEDITION_ROUTES.find((r) => r.id === id);

export type ExpeditionRewardKind = 'gem' | 'gold' | 'wshard' | 'exp' | 'cloth';

export interface ExpeditionRewardSpec {
  kind: ExpeditionRewardKind;
  /** Số lượng cơ bản, engine nhân thêm theo tiến trình người chơi. */
  amount: number;
}

/**
 * Bảng thưởng theo tuyến. `gold` tính bằng **số phút farm** chứ không phải số
 * vàng tuyệt đối — giống lịch điểm danh, để phần thưởng không lỗi thời ở tầng
 * sâu. `exp` là số cấp cộng cho chính những đồng hành vừa đi về: chuyến đi
 * nuôi lại đúng những con vừa bị rút khỏi đội hình.
 */
export const EXPEDITION_REWARDS: Record<string, ExpeditionRewardSpec[]> = {
  ex_scout: [
    { kind: 'gem', amount: 260 },
    { kind: 'gold', amount: 12 },
    { kind: 'exp', amount: 2 },
  ],
  ex_dig: [
    { kind: 'gem', amount: 700 },
    { kind: 'gold', amount: 26 },
    { kind: 'wshard', amount: 2 },
    { kind: 'exp', amount: 5 },
  ],
  ex_deep: [
    { kind: 'gem', amount: 2400 },
    { kind: 'gold', amount: 80 },
    { kind: 'wshard', amount: 5 },
    { kind: 'cloth', amount: 1 },
    { kind: 'exp', amount: 14 },
  ],
};

/**
 * Hệ số phần thưởng theo lực chiến nhóm cử đi.
 * Cử nhóm yếu vẫn nhận được, chỉ ít hơn — bắt buộc đủ lực sẽ khoá cứng tính
 * năng này ở đầu game, đúng lúc nó có ích nhất.
 */
export function expeditionQuality(groupPower: number, avgPower: number, route: ExpeditionRoute): number {
  if (avgPower <= 0) return 0.5;
  const need = avgPower * route.power * route.slots;
  if (need <= 0) return 1;
  const r = groupPower / need;
  return Math.max(0.4, Math.min(1.35, 0.4 + r * 0.6));
}

/** Số ô Phái Đoàn cơ bản khi chưa nâng Di Tích `caravan`. */
export const EXPEDITION_BASE_SLOTS = 2;
