// ============ THÁP THỬ THÁCH ============
// Chế độ tách rời khỏi mạch tầng: một chuỗi boss liên tiếp, có đồng hồ đếm
// ngược và **không hồi sinh**. Đây là chỗ duy nhất trong game mà người chơi
// có thể thua hẳn — mạch tầng chính cố tình không có thất bại, nên nếu thiếu
// chế độ này thì con số "lực chiến" chẳng bao giờ bị đem ra thử.
//
// Mỗi tầng tháp bật một luật riêng. Luật không phải để làm khó cho vui: mỗi
// luật vô hiệu hoá một cách chơi quen thuộc (hồi máu, đội đông, rùa thủ), nên
// muốn qua thì phải đổi đội hình chứ không phải cày thêm chỉ số.

export type TrialRule =
  | 'regen' | 'fewParty' | 'noHeal' | 'swift' | 'frenzy' | 'glass' | 'horde' | 'noRage';

export interface TrialRuleDef {
  id: TrialRule;
  name: string;
  desc: string;
  color: string;
}
export const TRIAL_RULES: Record<TrialRule, TrialRuleDef> = {
  regen: { id: 'regen', name: 'Tái Sinh', desc: 'Quái hồi 5% máu mỗi giây — sát thương thấp là không bao giờ hạ nổi.', color: '#3fe0b0' },
  fewParty: { id: 'fewParty', name: 'Cô Quân', desc: 'Chỉ 3 đồng hành được ra sân.', color: '#8cdcff' },
  noHeal: { id: 'noHeal', name: 'Tuyệt Dược', desc: 'Mọi nguồn hồi máu bị chặn, kể cả hút máu.', color: '#ff5a6a' },
  swift: { id: 'swift', name: 'Thần Tốc', desc: 'Quái đánh nhanh gấp rưỡi.', color: '#ffd23c' },
  frenzy: { id: 'frenzy', name: 'Cuồng Bạo', desc: 'Quái gây gấp đôi sát thương.', color: '#ff3b52' },
  glass: { id: 'glass', name: 'Thân Thuỷ Tinh', desc: 'Máu toàn đội còn một nửa.', color: '#a78bfa' },
  horde: { id: 'horde', name: 'Bầy Đàn', desc: 'Mỗi đợt có thêm hai boss phụ.', color: '#ff9a3c' },
  noRage: { id: 'noRage', name: 'Tĩnh Tâm', desc: 'Nộ Khí không tích — không có tuyệt kỹ.', color: '#b14bff' },
};

export interface TrialDef {
  id: number;
  name: string;
  /** Số đợt boss phải dọn. */
  waves: number;
  /** Giới hạn thời gian (giây). */
  time: number;
  /** Hệ số nhân máu/công của boss so với tầng tham chiếu. */
  power: number;
  /** Tầng dùng làm mốc quy đổi chỉ số quái. */
  refFloor: number;
  rules: TrialRule[];
  /** Huy Hiệu nhận được lần đầu vượt qua. */
  badges: number;
}

/**
 * Mười hai tầng tháp.
 * `refFloor` bám sát mốc mà người chơi *nên* đạt được trước khi thử, còn
 * `power` mới là phần làm khó — tách hai trục nên chỉnh độ khó không kéo theo
 * việc phải viết lại toàn bộ bảng.
 */
export const TRIALS: TrialDef[] = [
  { id: 1, name: 'Cổng Thử', waves: 3, time: 90, power: 1.0, refFloor: 30, rules: ['swift'], badges: 3 },
  { id: 2, name: 'Phòng Tái Sinh', waves: 3, time: 100, power: 1.2, refFloor: 40, rules: ['regen'], badges: 4 },
  { id: 3, name: 'Sảnh Cô Quân', waves: 4, time: 110, power: 1.3, refFloor: 48, rules: ['fewParty'], badges: 5 },
  { id: 4, name: 'Giếng Tuyệt Dược', waves: 4, time: 110, power: 1.5, refFloor: 56, rules: ['noHeal'], badges: 6 },
  { id: 5, name: 'Lò Cuồng Bạo', waves: 4, time: 120, power: 1.7, refFloor: 64, rules: ['frenzy', 'swift'], badges: 8 },
  { id: 6, name: 'Điện Thuỷ Tinh', waves: 5, time: 120, power: 1.9, refFloor: 72, rules: ['glass'], badges: 10 },
  { id: 7, name: 'Hang Bầy Đàn', waves: 5, time: 130, power: 2.1, refFloor: 80, rules: ['horde'], badges: 12 },
  { id: 8, name: 'Thiền Đường Tĩnh Tâm', waves: 5, time: 130, power: 2.4, refFloor: 88, rules: ['noRage', 'regen'], badges: 15 },
  { id: 9, name: 'Vực Cô Độc', waves: 6, time: 140, power: 2.8, refFloor: 96, rules: ['fewParty', 'noHeal'], badges: 18 },
  { id: 10, name: 'Ngai Cuồng Loạn', waves: 6, time: 150, power: 3.3, refFloor: 104, rules: ['frenzy', 'horde'], badges: 22 },
  { id: 11, name: 'Tận Cùng Thuỷ Tinh', waves: 7, time: 160, power: 4.0, refFloor: 112, rules: ['glass', 'swift', 'regen'], badges: 28 },
  { id: 12, name: 'Đỉnh Tháp Vô Danh', waves: 8, time: 180, power: 5.0, refFloor: 120, rules: ['noHeal', 'noRage', 'fewParty', 'frenzy'], badges: 40 },
];
export const trialById = (id: number): TrialDef | undefined => TRIALS.find((t) => t.id === id);

/** Tầng tháp mở khi đã dọn tới tầng này của mạch chính. */
export function trialUnlockFloor(t: TrialDef): number {
  return Math.max(20, t.refFloor - 12);
}

// ---------- đổi Huy Hiệu ----------
/**
 * Huy Hiệu **không mua được bằng Vàng hay Ngọc**, và ngược lại Vàng/Ngọc
 * không mua được những món dưới đây. Một loại tiền chỉ có nghĩa khi nó là
 * đường duy nhất tới một thứ gì đó.
 */
export interface BadgeOffer {
  id: string;
  name: string;
  desc: string;
  badges: number;
  /** `skin` mở một bộ trang phục; `wskin` mở một skin vũ khí; `res` là tài nguyên. */
  kind: 'skin' | 'wskin' | 'res';
  /** Mã trang phục / skin vũ khí, hoặc mã tài nguyên. */
  ref: string;
  amount?: number;
  color: string;
}
export const BADGE_OFFERS: BadgeOffer[] = [
  { id: 'bo_gem', name: 'Túi Ngọc Thử Thách', desc: '4.000 Ngọc Huyết Nguyệt.', badges: 6, kind: 'res', ref: 'gem', amount: 4000, color: '#ff4fd8' },
  { id: 'bo_cloth', name: 'Mảnh Trang Phục', desc: '2 Mảnh Trang Phục — rút ngắn một tháng điểm danh.', badges: 12, kind: 'res', ref: 'cloth', amount: 2, color: '#8cdcff' },
  { id: 'bo_wshard', name: 'Rương Mảnh Thần Khí', desc: '3 mảnh vũ khí bậc Thần Khí.', badges: 20, kind: 'res', ref: 'wshard', amount: 3, color: '#ffe066' },
  { id: 'bo_soul', name: 'Mảnh Linh Hồn', desc: '4 Mảnh Linh Hồn cho Cây Di Tích.', badges: 26, kind: 'res', ref: 'soul', amount: 4, color: '#a78bfa' },
  { id: 'bo_wskin', name: 'Vô Danh Chi Nhận', desc: 'Skin vũ khí chỉ có ở Tháp — lưỡi trong suốt, vệt chém trắng gãy vỡ.', badges: 60, kind: 'wskin', ref: 'ws_trial', color: '#e8f4ff' },
  { id: 'bo_skin', name: 'Vô Danh Tháp Chủ', desc: 'Trang phục chỉ có ở Tháp — bậc hiệu ứng cao nhất trong game.', badges: 120, kind: 'skin', ref: 'trialmaster', color: '#fff2fb' },
];
export const badgeOfferById = (id: string): BadgeOffer | undefined =>
  BADGE_OFFERS.find((b) => b.id === id);
