// ============ CÂY DI TÍCH ============
// Lớp tiến trình meta thứ hai, nằm trên Thăng Hoa.
//
// Thăng Hoa cũ chỉ trả về một hệ số nhân — mỗi lần Thăng Hoa giống hệt lần
// trước, và người chơi tầng 100+ không còn quyết định nào phải ra. Cây Di Tích
// biến mỗi lần Thăng Hoa thành một lượt tiêu Mảnh Linh Hồn, và vì tổng số mảnh
// luôn ít hơn tổng chi phí cây, người chơi buộc phải chọn nhánh.
//
// Bất biến: mọi hiệu ứng ở đây là **cộng thêm vào công thức có sẵn**, không
// nút nào được phép thay đổi đường cong gốc trong `BAL`. Nếu một nút cần sửa
// `BAL` thì nó đã sai chỗ.

export type RelicId =
  | 'seed' | 'greed' | 'prospect' | 'might' | 'vigor' | 'wrath'
  | 'revive' | 'restT' | 'headstart' | 'autoclaim' | 'caravan' | 'salvage';

export interface RelicDef {
  id: RelicId;
  name: string;
  desc: string;
  color: string;
  /** Số cấp tối đa. */
  max: number;
  /** Chi phí Mảnh Linh Hồn cho cấp đầu; mỗi cấp sau cộng thêm `step`. */
  cost: number;
  step: number;
  /** Toạ độ trong lưới hiển thị (cột, hàng) — cây vẽ theo lưới cố định. */
  col: number;
  row: number;
  /** Nút cha; phải có ít nhất 1 cấp thì nút này mới mở. */
  need?: RelicId;
  /** Câu mô tả mức cộng mỗi cấp. */
  per: (lvl: number) => string;
}

export const RELICS: RelicDef[] = [
  {
    id: 'seed', name: 'Hạt Giống Vàng', color: '#ffd23c', col: 1, row: 0,
    desc: 'Vàng khởi đầu sau mỗi lần Thăng Hoa.',
    max: 6, cost: 1, step: 1,
    per: (l) => `×${(1 + l * 0.6).toFixed(1)} vàng khởi đầu`,
  },
  {
    id: 'greed', name: 'Lòng Tham Không Đáy', color: '#ffd23c', col: 0, row: 1, need: 'seed',
    desc: 'Vàng rơi ra từ mọi nguồn.',
    max: 8, cost: 2, step: 1,
    per: (l) => `+${l * 7}% Vàng`,
  },
  {
    id: 'prospect', name: 'Mắt Dò Ngọc', color: '#ff4fd8', col: 2, row: 1, need: 'seed',
    desc: 'Tỉ lệ rơi Ngọc Huyết Nguyệt.',
    max: 8, cost: 2, step: 1,
    per: (l) => `+${l * 7}% tỉ lệ rơi Ngọc`,
  },
  {
    id: 'might', name: 'Cốt Tuỷ Chiến Thần', color: '#ff3b52', col: 1, row: 1, need: 'seed',
    desc: 'Sát thương của toàn đội.',
    max: 10, cost: 3, step: 2,
    per: (l) => `+${l * 8}% sát thương`,
  },
  {
    id: 'vigor', name: 'Huyết Mạch Bất Hoại', color: '#3fe0b0', col: 0, row: 2, need: 'greed',
    desc: 'Máu tối đa của toàn đội.',
    max: 10, cost: 3, step: 2,
    per: (l) => `+${l * 8}% máu`,
  },
  {
    id: 'wrath', name: 'Cuồng Nộ Trường Tồn', color: '#a78bfa', col: 1, row: 2, need: 'might',
    desc: 'Tốc độ tích Nộ Khí.',
    max: 6, cost: 3, step: 2,
    per: (l) => `+${l * 10}% tốc tích Nộ`,
  },
  {
    id: 'revive', name: 'Lời Thề Không Chết', color: '#8cdcff', col: 2, row: 2, need: 'prospect',
    desc: 'Thời gian hồi sinh của đồng đội.',
    max: 6, cost: 3, step: 2,
    per: (l) => `−${Math.round((1 - Math.pow(0.88, l)) * 100)}% thời gian hồi sinh`,
  },
  {
    id: 'restT', name: 'Đồng Hồ Cát Vĩnh Cửu', color: '#ffb43c', col: 0, row: 3, need: 'vigor',
    desc: 'Trần thưởng khi ngoại tuyến.',
    max: 8, cost: 4, step: 3,
    per: (l) => `trần ngoại tuyến ${8 + l * 2} giờ`,
  },
  {
    id: 'headstart', name: 'Ký Ức Vực Sâu', color: '#b14bff', col: 1, row: 3, need: 'wrath',
    desc: 'Sau Thăng Hoa, bắt đầu thẳng ở tầng sâu hơn.',
    max: 8, cost: 4, step: 3,
    per: (l) => `bắt đầu ở tầng ${1 + l * 3}`,
  },
  {
    id: 'caravan', name: 'Thương Đoàn Mở Rộng', color: '#3fb9ff', col: 2, row: 3, need: 'revive',
    desc: 'Số ô Phái Đoàn chạy song song.',
    max: 3, cost: 5, step: 4,
    per: (l) => `${2 + l} ô Phái Đoàn`,
  },
  {
    id: 'autoclaim', name: 'Sổ Công Tự Ghi', color: '#7dff5a', col: 0, row: 4, need: 'restT',
    desc: 'Tự động nhận Ngọc của mọi thành tựu vừa đạt — không phải mở bảng nữa.',
    max: 1, cost: 8, step: 0,
    per: () => 'tự nhận thưởng thành tựu',
  },
  {
    id: 'salvage', name: 'Lò Nung Tự Hành', color: '#ff8a5a', col: 2, row: 4, need: 'caravan',
    desc: 'Mỗi lượt rèn có cơ hội nhả thêm một mảnh vũ khí cùng bậc.',
    max: 5, cost: 6, step: 4,
    per: (l) => `${l * 8}% cơ hội rèn ra mảnh đôi`,
  },
];

export const relicById = (id: RelicId): RelicDef | undefined => RELICS.find((r) => r.id === id);

/** Chi phí Mảnh Linh Hồn để nâng một Di Tích từ cấp `lvl` lên `lvl+1`. */
export function relicCostAt(def: RelicDef, lvl: number): number {
  return def.cost + def.step * Math.max(0, lvl);
}

/**
 * Mảnh Linh Hồn nhận được khi Thăng Hoa.
 * Buộc phải tỉ lệ với **số Huyết Ấn vừa nhận**, không phải số lần Thăng Hoa:
 * nếu trả theo số lần thì cách chơi tối ưu là Thăng Hoa liên tục ở tầng 25,
 * và toàn bộ động lực đi sâu biến mất.
 */
export function soulShardsFor(sealsGained: number): number {
  return Math.max(1, Math.round(sealsGained * 0.75));
}
