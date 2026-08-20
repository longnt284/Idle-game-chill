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
   * Bậc vũ khí đang cầm (0 = Thường … 4 = Thần Thoại). Quyết định chất liệu,
   * quầng sáng và vệt chém — bậc càng cao trông càng dữ.
   */
  weaponTier?: number;
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
