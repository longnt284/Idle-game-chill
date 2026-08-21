// ============ SHARED VISUAL TYPES ============
// Tách riêng khỏi engine để renderer không phụ thuộc ngược vào logic game.

export type HairStyle =
  | 'spiky' | 'long' | 'bun' | 'hood' | 'wild' | 'pony' | 'twin' | 'short' | 'mohawk' | 'none';
export type WeaponKind =
  | 'sword' | 'bow' | 'staff' | 'daggers' | 'orb' | 'shield' | 'spear'
  | 'greatsword' | 'scythe' | 'twinblade' | 'hammer' | 'none';
export type AccessoryKind =
  | 'none' | 'halo' | 'horns' | 'crown' | 'mask' | 'ears' | 'headband';

export interface ChibiLook {
  hair: string; outfit: string; outfit2: string; skin: string; eyes: string;
  hairStyle: HairStyle;
  weapon: WeaponKind;
  accessory: AccessoryKind;
  cape?: string;
  aura: string;
  /**
   * Bậc Tiến Hoá của Kael (0–7). Renderer dùng nó để chồng thêm các lớp
   * hiệu ứng — ấn ký bay quanh, cánh linh hồn, vòng hào quang — nên hình
   * hài đổi rõ rệt mà vẫn dùng chung một bộ xương.
   */
  evoTier?: number;
  /**
   * Bậc vũ khí đang cầm (0 = Thường … 9 = Siêu Thoát). Quyết định chất liệu,
   * quầng sáng và vệt chém — bậc càng cao trông càng dữ.
   */
  weaponTier?: number;
  /**
   * Skin vũ khí mua ở Cửa Hàng (`ws_*`). Là **lớp phủ**: đổi bảng màu lưỡi và
   * kiểu hạt bay quanh, không đổi hình dáng, nên dùng chung cho mọi loại và
   * mọi bậc vũ khí.
   */
  weaponSkin?: string;
  /** Bậc hiệu ứng của skin vũ khí (0 = không có, 1–4 theo giá tiền). */
  weaponFx?: number;
  /**
   * Bậc hiệu ứng của trang phục mua ở Cửa Hàng (0–4). Càng cao renderer càng
   * chồng thêm lớp: trận đồ dưới chân, hạt xoay quanh thân, lưu ảnh khi chém.
   */
  skinFx?: number;
}

/** Trạng thái hoạt ảnh mà renderer cần để dựng tư thế nhân vật. */
export type ActionKind = 'idle' | 'walk' | 'attack' | 'cast' | 'hurt' | 'dead' | 'spawn';

export interface AnimState {
  /** Thời gian toàn cục (giây) — dùng cho thở, đung đưa tóc, hào quang. */
  t: number;
  /** Pha chu kỳ bước chân 0..1, tiến theo tốc độ di chuyển. */
  gait: number;
  action: ActionKind;
  /** Tiến độ của hành động hiện tại, 0..1. */
  actionT: number;
  /** 1 = nhìn phải, -1 = nhìn trái. */
  facing: 1 | -1;
  scale: number;
  /** 0..1 — cường độ nháy trắng khi trúng đòn. */
  hurt: number;
  /** > 0 khi bị đóng băng / choáng. */
  frozen: number;
  /** Vận tốc ngang (px/s) — điều khiển độ ngả người & trễ tóc/áo choàng. */
  vx: number;
  /** Hạt giống ngẫu nhiên ổn định theo từng đơn vị để chúng không đồng bộ cứng nhắc. */
  seed: number;
}

export function makeAnim(seed = 0): AnimState {
  return {
    t: 0, gait: 0, action: 'idle', actionT: 0, facing: 1,
    scale: 1, hurt: 0, frozen: 0, vx: 0, seed,
  };
}
