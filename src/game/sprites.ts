// ============ SPRITE RENDERER 2.5D ============
// Nhân vật được dựng bằng "xương" (khớp hông/gối/vai/khuỷu) rồi tô bằng
// khối trụ có gradient — cho cảm giác có chiều sâu và chuyển động mượt,
// thay cho ô pixel phẳng. Mọi tư thế đều là hàm thuần của AnimState nên
// hoạt ảnh luôn tất định và có thể lấy mẫu ngược thời gian (dùng vẽ vệt kiếm).

import type { AnimState, ChibiLook, WeaponKind } from './types';
import { alpha, darken, INK, lighten, luma, mix } from './color';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ---------- easing ----------
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeInQuad = (t: number): number => t * t;
/** Lấy đà ngược trước khi bật tới — tạo cảm giác có trọng lượng. */
const easeBackIn = (t: number): number => t * t * (2.6 * t - 1.6);

// ---------- tỉ lệ cơ thể (chiều cao chuẩn ~104px ở scale 1) ----------
const HIP_Y = -46, HIP_X = 5.2;
const THIGH = 23, SHIN = 23;
const SHO_Y = -76, SHO_X = 10.5;
const UPPER = 16, FORE = 16;
const NECK_Y = -80;
const HEAD_Y = -94, HEAD_R = 13;

interface Joint { x: number; y: number }
/** Chuyển góc (0 = chỉ thẳng xuống, dương = xoay về phía trước) thành vector. */
const dir = (a: number, len: number): Joint => ({ x: Math.sin(a) * len, y: Math.cos(a) * len });

export interface Pose {
  ox: number; oy: number;
  lean: number; spine: number; head: number;
  /** [sau, trước] × [hông, gối] */
  legs: [[number, number], [number, number]];
  /** [sau, trước] × [vai, khuỷu] */
  arms: [[number, number], [number, number]];
  wrist: number;
  squash: number;
  fade: number;
  /** 0..1 — cường độ phát sáng ở tay khi niệm phép. */
  charge: number;
}

const IDLE_ARM = 0.14, IDLE_ELBOW = 0.26;

function basePose(): Pose {
  return {
    ox: 0, oy: 0, lean: 0, spine: 0, head: 0,
    legs: [[0, 0.06], [0, 0.06]],
    arms: [[IDLE_ARM, IDLE_ELBOW], [IDLE_ARM, IDLE_ELBOW]],
    wrist: 0, squash: 1, fade: 1, charge: 0,
  };
}

// ---------- bộ giải tư thế ----------
/**
 * Khung khoá của một hành động.
 * Góc tay là giá trị TUYỆT ĐỐI (hành động chiếm quyền điều khiển tay), còn
 * các kênh khác là độ lệch cộng thêm vào tư thế nền (thở / bước chân).
 */
interface ActKey {
  ox: number; oy: number; lean: number; spine: number; head: number;
  sF: number; eF: number;
  sB: number;
  wrist: number; squash: number; charge: number;
  hB: number; kB: number; hF: number; kF: number;
}

const K = (o: Partial<ActKey>): ActKey => ({
  ox: 0, oy: 0, lean: 0, spine: 0, head: 0,
  sF: IDLE_ARM, eF: IDLE_ELBOW, sB: IDLE_ARM,
  wrist: 0, squash: 1, charge: 0,
  hB: 0, kB: 0, hF: 0, kF: 0,
  ...o,
});

type Track = { keys: Array<[number, ActKey]>; eases: Array<(t: number) => number> };

/**
 * Chém: nghỉ → lấy đà → bung → theo đà → nghỉ.
 * Khung đầu và khung cuối đều là tư thế nghỉ nên nối vào/ra hoạt ảnh không
 * bị nhảy. Khung "theo đà" giữ cho đòn đánh có quán tính thay vì bật ngược
 * lại ngay khi vừa chạm — đây là chỗ trước kia trông gãy khúc nhất.
 */
const MELEE_TRACK: Track = {
  keys: [
    [0.00, K({})],
    // dồn lực: bắt đầu chậm rồi mới xiết lại — nhịp "hít vào" trước khi bung
    [0.14, K({ ox: -3, lean: -0.07, spine: -0.09, head: -0.05, sF: -0.9, eF: 0.7, sB: 0.28, wrist: -0.22, squash: 0.985, kB: 0.12 })],
    [0.30, K({ ox: -10, lean: -0.22, spine: -0.26, head: -0.13, sF: -2.62, eF: 1.25, sB: 0.75, wrist: -0.65, squash: 0.945, kB: 0.36, hF: -0.32 })],
    // chạm: đúng nhịp engine ghi nhận sát thương (actionT 0.42)
    [0.44, K({ ox: 27, lean: 0.36, spine: 0.42, head: 0.17, sF: 1.02, eF: 0.08, sB: -0.9, wrist: 0.46, squash: 1.07, hB: -0.52, hF: 0.58, kF: 0.4 })],
    [0.60, K({ ox: 16, lean: 0.16, spine: 0.2, head: 0.05, sF: 1.34, eF: 0.34, sB: -0.32, wrist: 0.6, squash: 1.0, hB: -0.24, hF: 0.3, kF: 0.2 })],
    // lắc ngược nhẹ trước khi về nghỉ: chỗ trước kia là một đoạn nội suy dài
    // 0.36 giây nên trông trôi tuột, giờ có nhịp thu tay rõ ràng
    [0.80, K({ ox: 4, lean: -0.05, spine: -0.06, head: -0.03, sF: 0.28, eF: 0.34, sB: 0.06, wrist: 0.12, squash: 0.99, hF: 0.06 })],
    [1.00, K({})],
  ],
  eases: [easeInQuad, easeInOutCubic, easeOutQuint, easeOutCubic, easeInOutCubic, easeInOutCubic],
};

/** Niệm phép: nâng tay tụ lực → phóng ra → thu về. */
const CAST_TRACK: Track = {
  keys: [
    [0.00, K({})],
    [0.42, K({ ox: -4, lean: -0.09, spine: -0.14, head: -0.16, sF: -1.95, eF: 0.92, sB: 0.44, squash: 0.98, kB: 0.16, charge: 1 })],
    [0.58, K({ ox: 6, lean: -0.02, spine: 0.06, head: -0.04, sF: -1.05, eF: 0.1, sB: 0.2, squash: 1.03, charge: 0.25 })],
    [0.74, K({ ox: 2, lean: 0, spine: 0.02, head: 0, sF: -0.75, eF: 0.16, sB: 0.18, squash: 1 })],
    [1.00, K({})],
  ],
  eases: [easeOutCubic, easeOutQuint, easeOutCubic, easeInOutCubic],
};

/** Lấy mẫu chuỗi khung khoá tại thời điểm q — liên tục trên toàn miền [0,1]. */
function sampleTrack(tr: Track, q: number): ActKey {
  const { keys, eases } = tr;
  let i = 0;
  while (i < keys.length - 2 && q >= keys[i + 1][0]) i++;
  const [t0, a] = keys[i];
  const [t1, b] = keys[i + 1];
  const raw = t1 > t0 ? (q - t0) / (t1 - t0) : 1;
  const k = eases[i](clamp(raw, 0, 1));
  const L = (x: number, y: number): number => x + (y - x) * k;
  return {
    ox: L(a.ox, b.ox), oy: L(a.oy, b.oy), lean: L(a.lean, b.lean),
    spine: L(a.spine, b.spine), head: L(a.head, b.head),
    sF: L(a.sF, b.sF), eF: L(a.eF, b.eF), sB: L(a.sB, b.sB),
    wrist: L(a.wrist, b.wrist), squash: L(a.squash, b.squash), charge: L(a.charge, b.charge),
    hB: L(a.hB, b.hB), kB: L(a.kB, b.kB), hF: L(a.hF, b.hF), kF: L(a.kF, b.kF),
  };
}

function applyKey(p: Pose, k: ActKey): void {
  p.ox += k.ox;
  p.oy += k.oy;
  p.lean += k.lean;
  p.spine += k.spine;
  p.head += k.head;
  p.arms[1] = [k.sF, k.eF];
  p.arms[0] = [k.sB, p.arms[0][1]];
  p.wrist += k.wrist;
  p.squash *= k.squash;
  p.charge = k.charge;
  p.legs[0][0] += k.hB;
  p.legs[0][1] += k.kB;
  p.legs[1][0] += k.hF;
  p.legs[1][1] += k.kF;
}

export function solvePose(a: AnimState): Pose {
  const p = basePose();
  const t = a.t + a.seed * 1.7;

  // nền: thở + dồn trọng tâm
  const breathe = Math.sin(t * 1.55);
  p.oy = breathe * 0.7;
  p.ox = Math.sin(t * 0.72) * 0.6;
  p.spine = breathe * 0.022;
  p.head = Math.sin(t * 1.55 + 0.6) * 0.035;
  p.arms[0] = [IDLE_ARM + breathe * 0.05, IDLE_ELBOW];
  p.arms[1] = [IDLE_ARM + Math.sin(t * 1.55 + 0.9) * 0.05, IDLE_ELBOW];

  // ---- di chuyển: chu kỳ bước chân ----
  const speed = Math.abs(a.vx);
  if (speed > 4 || a.action === 'walk') {
    const amp = clamp(speed / 150, 0.35, 1.15);
    const th = a.gait * TAU;
    const hipB = 0.62 * amp * Math.sin(th);
    const hipF = 0.62 * amp * Math.sin(th + Math.PI);
    const kneeOf = (ph: number): number => 0.06 + 0.72 * amp * Math.max(0, Math.sin(ph - 1.15));
    p.legs = [[hipB, kneeOf(th)], [hipF, kneeOf(th + Math.PI)]];
    // thân nhún 2 nhịp mỗi chu kỳ + ngả theo hướng chạy
    p.oy = -(1 - Math.abs(Math.cos(th))) * 2.6 * amp;
    p.lean = clamp(a.vx * 0.0013, -0.16, 0.16);
    p.spine += p.lean * 0.4;
    // tay vung ngược chân cùng bên
    p.arms[0] = [IDLE_ARM - hipB * 0.85, IDLE_ELBOW + 0.18 * amp];
    p.arms[1] = [IDLE_ARM - hipF * 0.85, IDLE_ELBOW + 0.18 * amp];
  }

  const q = clamp(a.actionT, 0, 1);
  if (a.action === 'attack') {
    applyKey(p, sampleTrack(MELEE_TRACK, q));
  } else if (a.action === 'cast') {
    applyKey(p, sampleTrack(CAST_TRACK, q));
  } else if (a.action === 'hurt') {
    const k = 1 - easeOutCubic(q);
    p.ox -= 9 * k;
    p.lean -= 0.24 * k;
    p.head -= 0.3 * k;
    p.spine -= 0.16 * k;
    p.arms[1][0] += 0.5 * k;
    p.legs[1][1] += 0.3 * k;
    p.squash = 1 - 0.06 * k;
  } else if (a.action === 'dead') {
    const k = easeOutCubic(q);
    p.lean = -1.42 * k;
    p.oy = -2 * Math.sin(q * Math.PI) * 6;
    p.ox = -14 * k;
    p.head = 0.4 * k;
    p.arms[0] = [-0.9 * k, 0.2];
    p.arms[1] = [1.0 * k, 0.2];
    p.legs = [[-0.5 * k, 0.5 * k], [0.4 * k, 0.3 * k]];
    p.fade = 1 - k * 0.62;
  } else if (a.action === 'spawn') {
    const k = easeOutCubic(q);
    p.squash = lerp(1.45, 1, k);
    p.oy -= (1 - k) * 26;
    p.fade = Math.min(1, q * 2.4);
  }

  return p;
}

// ---------- nguyên thủy vẽ ----------

/** Khối trụ có ánh sáng bên: viền tối, thân gradient, sọc sáng cạnh trước. */
function seg(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  w: number, base: string, rim?: string,
): void {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // pháp tuyến
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 2.4;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = base;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  // bóng đổ phía sau
  const o = w * 0.27;
  ctx.strokeStyle = darken(base, 0.34);
  ctx.lineWidth = w * 0.42;
  ctx.beginPath(); ctx.moveTo(ax - nx * o, ay - ny * o); ctx.lineTo(bx - nx * o, by - ny * o); ctx.stroke();
  // cạnh đón sáng
  ctx.strokeStyle = lighten(base, 0.3);
  ctx.lineWidth = w * 0.24;
  ctx.beginPath(); ctx.moveTo(ax + nx * o, ay + ny * o); ctx.lineTo(bx + nx * o, by + ny * o); ctx.stroke();
  if (rim) {
    ctx.strokeStyle = rim;
    ctx.lineWidth = w * 0.16;
    ctx.beginPath();
    ctx.moveTo(ax - nx * w * 0.44, ay - ny * w * 0.44);
    ctx.lineTo(bx - nx * w * 0.44, by - ny * w * 0.44);
    ctx.stroke();
  }
}

/** Chuỗi 2 đốt (đùi–cẳng, cánh tay–cẳng tay) trả về vị trí đầu mút. */
function chain(
  ctx: CanvasRenderingContext2D, root: Joint,
  a0: number, l0: number, a1: number, l1: number,
  w0: number, w1: number, base: string, rim?: string,
): { mid: Joint; end: Joint } {
  const d0 = dir(a0, l0);
  const mid = { x: root.x + d0.x, y: root.y + d0.y };
  const d1 = dir(a0 + a1, l1);
  const end = { x: mid.x + d1.x, y: mid.y + d1.y };
  seg(ctx, root.x, root.y, mid.x, mid.y, w0, base, rim);
  seg(ctx, mid.x, mid.y, end.x, end.y, w1, base, rim);
  return { mid, end };
}

function ellipse(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, rot: number, fill: string | CanvasGradient, stroke?: string, lw = 2,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

/**
 * Quầng sáng thay cho `ctx.shadowBlur`.
 * shadowBlur phải dựng lại bộ đệm mờ cho từng lần vẽ; ở đây có tới hàng trăm
 * chi tiết phát sáng mỗi khung hình nên hai vòng tròn alpha thấp vừa đủ đẹp
 * mà rẻ hơn nhiều bậc.
 */
function glow(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, strength = 1,
): void {
  const a = ctx.globalAlpha;
  ctx.fillStyle = alpha(color, 0.16 * strength);
  ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, TAU); ctx.fill();
  ctx.fillStyle = alpha(color, 0.26 * strength);
  ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.fill();
  ctx.globalAlpha = a;
}

// ============ ANH HÙNG ============

/** Toạ độ bàn tay cầm vũ khí ứng với một tư thế — dùng cả cho vệt kiếm. */
function handOf(p: Pose): Joint {
  const sho = { x: SHO_X + p.spine * 6, y: SHO_Y };
  const d0 = dir(p.arms[1][0], UPPER);
  const el = { x: sho.x + d0.x, y: sho.y + d0.y };
  const d1 = dir(p.arms[1][0] + p.arms[1][1], FORE);
  return { x: el.x + d1.x, y: el.y + d1.y };
}

const WEAPON_LEN: Record<WeaponKind, number> = {
  sword: 44, spear: 60, daggers: 20, staff: 50, bow: 0, orb: 0, shield: 0,
  greatsword: 58, scythe: 54, twinblade: 34, hammer: 46, none: 0,
};
/** Các loại cầm hai tay hoặc lưỡi dài thì khi nghỉ phải chúc xuống nhiều hơn. */
const WEAPON_REST: Record<WeaponKind, number> = {
  sword: 2.3, spear: 2.3, greatsword: 2.45, scythe: 2.5, hammer: 2.4,
  twinblade: 0.9, daggers: 0.7, staff: 0, bow: 0, orb: 0, shield: 0, none: 0,
};
/** Vũ khí nào có vệt chém khi bổ xuống. */
const WEAPON_TRAIL = new Set<WeaponKind>(['sword', 'spear', 'daggers', 'greatsword', 'scythe', 'twinblade', 'hammer']);

/**
 * Bảng chất liệu theo bậc vũ khí (0 Thường … 9 Siêu Thoát).
 *
 * Mỗi bậc bật thêm đúng MỘT lớp mới thay vì đổi hẳn cách vẽ, nên nhìn hai bậc
 * liền nhau là thấy ngay cái gì vừa được thêm vào — đó mới là thứ khiến việc
 * lột xác lên bậc đáng nhớ. Thứ tự bật: quầng → ấn văn → tia lửa → dải năng
 * lượng chạy dọc lưỡi → vành khắc quanh chuôi → lõi nứt phát sáng.
 */
interface WeaponSkin {
  edge: string; core: string;
  glowR: number;
  runes: boolean;
  sparks: boolean;
  /** Dải sáng chạy dọc thân lưỡi (bậc 5 trở lên). */
  ribbon: boolean;
  /** Vành ấn quay quanh chuôi (bậc 7 trở lên). */
  halo: boolean;
  /** Lõi nứt ra ánh sáng, đổi màu theo thời gian (bậc 9). */
  fracture: boolean;
}
const WEAPON_TIER_LOOK: WeaponSkin[] = [
  { edge: '#8b93a5', core: '#d5dbe7', glowR: 0, runes: false, sparks: false, ribbon: false, halo: false, fracture: false },
  { edge: '#7fb6d8', core: '#e8f4ff', glowR: 5, runes: false, sparks: false, ribbon: false, halo: false, fracture: false },
  { edge: '#e0a24a', core: '#fff0cf', glowR: 8, runes: false, sparks: false, ribbon: false, halo: false, fracture: false },
  { edge: '#e05ac0', core: '#ffdcf6', glowR: 12, runes: true, sparks: false, ribbon: false, halo: false, fracture: false },
  { edge: '#7de05a', core: '#e6ffdc', glowR: 17, runes: true, sparks: true, ribbon: false, halo: false, fracture: false },
  { edge: '#ffd24a', core: '#fff6d0', glowR: 21, runes: true, sparks: true, ribbon: true, halo: false, fracture: false },
  { edge: '#58f5ff', core: '#e6feff', glowR: 25, runes: true, sparks: true, ribbon: true, halo: false, fracture: false },
  { edge: '#b14bff', core: '#f2e2ff', glowR: 30, runes: true, sparks: true, ribbon: true, halo: true, fracture: false },
  { edge: '#ff6a2a', core: '#ffe4cf', glowR: 35, runes: true, sparks: true, ribbon: true, halo: true, fracture: false },
  { edge: '#fff2fb', core: '#ffffff', glowR: 42, runes: true, sparks: true, ribbon: true, halo: true, fracture: true },
];

/** Bảng màu của skin vũ khí mua ở Cửa Hàng — chỉ phủ màu, không đổi lớp nào. */
const WSKIN_PALETTE: Record<string, { edge: string; core: string; element: string }> = {
  ws_ember: { edge: '#ff7a3c', core: '#ffe6c0', element: 'ember' },
  ws_frost: { edge: '#5ac8ff', core: '#e8faff', element: 'frost' },
  ws_storm: { edge: '#b9a8ff', core: '#fbf4ff', element: 'storm' },
  ws_chaos: { edge: '#ff4fd8', core: '#fff0fb', element: 'chaos' },
  ws_trial: { edge: '#dfeaff', core: '#ffffff', element: 'chaos' },
};

/**
 * Chất liệu lưỡi cuối cùng = bậc rèn (quyết định CÓ những lớp nào) phủ lên
 * bảng màu của skin (quyết định những lớp đó MÀU GÌ).
 * Tách hai trục như vậy nên một bộ skin mua một lần là dùng được với mọi bậc,
 * và bậc cao vẫn nhìn ra là bậc cao dù đang khoác skin nào.
 */
function skinOf(look: ChibiLook, a?: AnimState): WeaponSkin {
  const base = WEAPON_TIER_LOOK[clamp(look.weaponTier ?? 0, 0, WEAPON_TIER_LOOK.length - 1)];
  const pal = look.weaponSkin ? WSKIN_PALETTE[look.weaponSkin] : undefined;
  // Bậc Siêu Thoát không có màu cố định: lưỡi trôi giữa hai cực suốt thời gian.
  const live = base.fracture && a
    ? { ...base, edge: mix('#ff4fd8', '#58f5ff', (Math.sin(a.t * 0.9) + 1) / 2) }
    : base;
  if (!pal) return live;
  const fx = look.weaponFx ?? 0;
  return {
    ...live,
    edge: pal.edge,
    core: pal.core,
    // Skin đắt tiền tự nó đã dày hiệu ứng, nên nâng cả những lớp mà bậc rèn
    // chưa mở — người bỏ tiền thấy khác ngay ở bậc thấp.
    glowR: Math.max(base.glowR, 6 + fx * 6),
    runes: base.runes || fx >= 2,
    sparks: base.sparks || fx >= 2,
    ribbon: base.ribbon || fx >= 3,
    halo: base.halo || fx >= 4,
  };
}
/** Nguyên tố của skin vũ khí — quyết định kiểu hạt bay quanh lưỡi. */
const elementOf = (look: ChibiLook): string =>
  (look.weaponSkin ? WSKIN_PALETTE[look.weaponSkin]?.element : undefined) ?? 'none';

/** Gradient kim loại lấy màu theo bậc vũ khí. */
function bladeGrad(
  ctx: CanvasRenderingContext2D, sk: WeaponSkin, halfWidth: number, edge = sk.edge,
): CanvasGradient {
  const g = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
  g.addColorStop(0, darken(edge, 0.45));
  g.addColorStop(0.32, edge);
  g.addColorStop(0.55, sk.core);
  g.addColorStop(0.78, edge);
  g.addColorStop(1, darken(edge, 0.5));
  return g;
}

/**
 * Quầng sáng, ấn văn và hạt nguyên tố phủ lên lưỡi.
 * Vẽ TRƯỚC thân lưỡi (nên gọi ở đầu mỗi nhánh vũ khí) để phần kim loại luôn
 * nằm trên và giữ được nét, còn ánh sáng thì loang ra sau.
 */
function bladeAura(
  ctx: CanvasRenderingContext2D, sk: WeaponSkin, a: AnimState, len: number, halfWidth: number,
  element = 'none',
): void {
  if (sk.glowR <= 0) return;
  const edge = sk.edge;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Hai lớp quầng lồng nhau: lớp ngoài rộng và mờ, lớp trong bó sát lưỡi.
  // Bề ngang cố ý tăng chậm hơn nhiều so với `glowR` — để quầng nở tự do thì
  // ở bậc cao nó thành một đĩa sáng lơ lửng và mất hẳn hình lưỡi kiếm; cái
  // phải lớn lên theo bậc là ĐỘ SÁNG, không phải bán kính.
  ctx.globalAlpha = 0.13 + 0.05 * Math.sin(a.t * 4 + a.seed);
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.ellipse(0, -len * 0.5, halfWidth + 3 + sk.glowR * 0.34, len * 0.68, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.16 + 0.05 * Math.sin(a.t * 4 + a.seed) + sk.glowR * 0.004;
  ctx.fillStyle = sk.core;
  ctx.beginPath();
  ctx.ellipse(0, -len * 0.5, halfWidth + 1 + sk.glowR * 0.15, len * 0.58, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  if (sk.runes) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(a.t * 5 + a.seed * 2);
    ctx.strokeStyle = sk.core;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = -len * (i / 4);
      ctx.beginPath();
      ctx.moveTo(-halfWidth * 0.45, y);
      ctx.lineTo(halfWidth * 0.45, y - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Dải năng lượng chạy dọc lưỡi: một vệt sáng trượt từ chuôi ra mũi rồi lặp.
  // Đây là chi tiết khiến vũ khí bậc cao "sống" ngay cả lúc đứng yên.
  if (sk.ribbon) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ph = (a.t * 0.7 + a.seed * 0.3) % 1;
    const y = -len * ph;
    const h = len * 0.22;
    const g = ctx.createLinearGradient(0, y + h, 0, y - h);
    g.addColorStop(0, alpha(sk.core, 0));
    g.addColorStop(0.5, alpha(sk.core, 0.75));
    g.addColorStop(1, alpha(sk.core, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-halfWidth * 0.7, y - h, halfWidth * 1.4, h * 2);
    ctx.restore();
  }

  if (sk.sparks) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = sk.fracture ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const ph = (a.t * 0.9 + i / n) % 1;
      ctx.globalAlpha = 0.6 * (1 - ph);
      ctx.fillStyle = sk.core;
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.3 + a.t) * halfWidth, -len * ph, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // Vành ấn quay quanh chuôi — chỉ bậc rất cao mới có, nên nó là dấu hiệu
  // đọc được từ xa rằng người này đang cầm hàng thật.
  if (sk.halo) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 + 0.14 * Math.sin(a.t * 3);
    ctx.strokeStyle = sk.core;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -len * 0.12, halfWidth + 7, (halfWidth + 7) * 0.34, a.t * 1.4, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -len * 0.12, halfWidth + 11, (halfWidth + 11) * 0.26, -a.t * 1.1, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Lõi nứt: hai đường gãy khúc chạy dọc lưỡi, đổi màu liên tục.
  if (sk.fracture) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.4;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.08);
      for (let i = 1; i <= 4; i++) {
        const k = i / 4;
        ctx.lineTo(sd * Math.sin(k * 7 + a.t * 3) * halfWidth * 0.4, -len * (0.08 + k * 0.84));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBladeElement(ctx, sk, a, len, halfWidth, element);
  ctx.globalAlpha = 1;
}

/**
 * Hạt nguyên tố của skin vũ khí.
 * Bốn kiểu chuyển động khác hẳn nhau — tro bay LÊN, băng rơi XUỐNG, sét nháy
 * tại chỗ, hỗn mang xoáy quanh — nên phân biệt được bốn bộ skin chỉ bằng
 * chuyển động, không cần đọc màu.
 */
function drawBladeElement(
  ctx: CanvasRenderingContext2D, sk: WeaponSkin, a: AnimState,
  len: number, halfWidth: number, element: string,
): void {
  if (element === 'none') return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (element === 'ember') {
    for (let i = 0; i < 5; i++) {
      const ph = (a.t * 0.85 + i * 0.2 + a.seed * 0.1) % 1;
      ctx.globalAlpha = 0.75 * (1 - ph);
      ctx.fillStyle = mix(sk.core, '#ff5a1e', ph);
      const x = Math.sin(i * 2.7 + a.t * 2.2) * (halfWidth + 3);
      ctx.beginPath();
      ctx.arc(x, -len * (0.15 + ph * 0.95), 1.4 + (1 - ph) * 1.3, 0, TAU);
      ctx.fill();
    }
  } else if (element === 'frost') {
    for (let i = 0; i < 5; i++) {
      const ph = (a.t * 0.5 + i * 0.2) % 1;
      ctx.globalAlpha = 0.7 * Math.sin(ph * Math.PI);
      ctx.strokeStyle = sk.core;
      ctx.lineWidth = 1;
      const x = Math.cos(i * 1.9) * (halfWidth + 4);
      const y = -len * (0.95 - ph * 0.85);
      const r = 2.4;
      for (let k = 0; k < 3; k++) {
        const ang = (k * Math.PI) / 3 + a.t * 0.6;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * r, y - Math.sin(ang) * r);
        ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        ctx.stroke();
      }
    }
  } else if (element === 'storm') {
    const flick = Math.sin(a.t * 17 + a.seed) > 0.35 ? 1 : 0.25;
    ctx.globalAlpha = 0.8 * flick;
    ctx.strokeStyle = sk.core;
    ctx.lineWidth = 1.2;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * halfWidth * 0.5, -len * 0.1);
      for (let i = 1; i <= 5; i++) {
        const k = i / 5;
        const jitter = Math.sin(i * 9.7 + Math.floor(a.t * 14)) * halfWidth * 0.9;
        ctx.lineTo(sd * halfWidth * 0.5 + jitter, -len * (0.1 + k * 0.85));
      }
      ctx.stroke();
    }
  } else {
    // chaos: hạt xoáy quanh trục lưỡi theo hai chiều ngược nhau
    for (let i = 0; i < 7; i++) {
      const ph = (a.t * 0.6 + i / 7) % 1;
      const sd = i % 2 === 0 ? 1 : -1;
      ctx.globalAlpha = 0.65 * Math.sin(ph * Math.PI);
      ctx.fillStyle = i % 3 === 0 ? '#58f5ff' : sk.core;
      const ang = ph * TAU * sd + i;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * (halfWidth + 5), -len * ph, 1.5, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawHero(ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState): void {
  const p = solvePose(a);
  const s = a.scale;
  const grounded = a.action !== 'dead';
  /** Bậc hiệu ứng trang phục Cửa Hàng — 0 nghĩa là không vẽ lớp nào thêm. */
  const sfx = clamp(look.skinFx ?? 0, 0, 5);

  ctx.save();
  // ---- bóng tiếp đất: co lại khi nhân vật nhấc lên ----
  const lift = clamp(-p.oy / 8, 0, 1);
  ctx.globalAlpha = (0.42 - lift * 0.16) * p.fade;
  ellipse(ctx, 0, 1 * s, 30 * s * (1 - lift * 0.18), 7.5 * s * (1 - lift * 0.3), 0, '#000000');
  ctx.globalAlpha = 1;

  // ---- trận đồ dưới chân (trang phục Cửa Hàng) ----
  // Vẽ ngay trên bóng và dưới mọi thứ khác: nó phải nằm "trên mặt đất" chứ
  // không lơ lửng quanh người, nếu không sẽ đè mất hình nhân vật.
  if (sfx >= 1) drawGroundSigil(ctx, look, a, sfx, p.fade);

  // ---- lưu ảnh khi ra đòn (trang phục bậc 3+) ----
  // Đặt trước phần thân để bóng lưu ảnh luôn nằm sau nhân vật thật.
  if (sfx >= 3 && (a.action === 'attack' || a.action === 'cast')) {
    drawAfterimage(ctx, look, a, sfx);
  }

  // ---- hào quang nền ----
  const pulse = 0.32 + 0.14 * Math.sin(a.t * 3.4 + a.seed);
  const gAura = ctx.createRadialGradient(0, -46 * s, 4, 0, -46 * s, 56 * s);
  gAura.addColorStop(0, alpha(look.aura, pulse * 0.5 * p.fade));
  gAura.addColorStop(0.55, alpha(look.aura, pulse * 0.16 * p.fade));
  gAura.addColorStop(1, alpha(look.aura, 0));
  ctx.fillStyle = gAura;
  ctx.beginPath(); ctx.arc(0, -46 * s, 56 * s, 0, TAU); ctx.fill();

  // Trúng đòn: loé sáng PHÍA SAU nhân vật. Nếu phủ lên trên, khối màu sẽ
  // che mất hình và người chơi không đọc được chuyện gì đang xảy ra.
  if (a.hurt > 0) {
    const gh = ctx.createRadialGradient(0, -52 * s, 4, 0, -52 * s, 48 * s);
    gh.addColorStop(0, alpha('#ff8494', 0.62 * a.hurt));
    gh.addColorStop(0.6, alpha('#ff8494', 0.2 * a.hurt));
    gh.addColorStop(1, alpha('#ff8494', 0));
    ctx.fillStyle = gh;
    ctx.beginPath(); ctx.arc(0, -52 * s, 48 * s, 0, TAU); ctx.fill();
  }

  ctx.scale(s * a.facing, s);
  ctx.globalAlpha = p.fade;

  // gốc: lệch + nghiêng + squash
  ctx.translate(p.ox, p.oy);
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.lean);
  ctx.scale(1 / p.squash, p.squash);
  ctx.translate(0, -HIP_Y);

  const rim = alpha(look.aura, 0.55);
  const skinD = darken(look.skin, 0.22);

  // ---- lớp Tiến Hoá phía sau (cánh linh hồn) ----
  const evo = look.evoTier ?? 0;
  if (evo >= 4) drawEvoWings(ctx, look.aura, a, evo);

  // ---- áo choàng (sau lưng) ----
  if (look.cape) drawCape(ctx, look.cape, a, p);

  // Dáng người suy ra từ vũ khí: pháp sư mặc áo choàng dài, thuẫn thủ vai
  // to nặng nề, cung thủ đeo ống tên. Cùng một bộ xương nhưng bóng dáng
  // khác hẳn nhau nên nhìn vào là đoán được vai trò.
  const build: BuildKind = look.weapon === 'staff' || look.weapon === 'orb' ? 'robe'
    : look.weapon === 'shield' ? 'heavy'
      : look.weapon === 'bow' ? 'ranger' : 'light';

  // ---- ống tên (sau lưng) ----
  if (build === 'ranger') drawQuiver(ctx, look);

  // ---- chân sau, tay sau ----
  drawLeg(ctx, -1, p.legs[0], look.outfit2, rim);
  const backHand = drawArm(ctx, -1, p.arms[0], look.outfit, look.skin, rim);
  if (look.weapon === 'shield') drawShield(ctx, backHand, look, p);
  if (look.weapon === 'daggers') drawDagger(ctx, backHand, p.wrist * 0.6, look.aura, 0.85);

  // ---- chân trước ----
  drawLeg(ctx, 1, p.legs[1], look.outfit2, rim);

  // ---- áo choàng dài trùm chân ----
  if (build === 'robe') drawRobe(ctx, look, a, p);

  // ---- thân ----
  drawTorso(ctx, look, p, rim, build);

  // ---- đầu ----
  ctx.save();
  ctx.translate(0, NECK_Y);
  ctx.rotate(p.spine * 0.5 + p.head);
  ctx.translate(0, -NECK_Y);
  seg(ctx, 0, NECK_Y + 3, 0, NECK_Y - 4, 9, skinD);
  drawHead(ctx, look, a, p);
  ctx.restore();

  // ---- tay trước + vũ khí ----
  const hand = drawArm(ctx, 1, p.arms[1], look.outfit, look.skin, rim);
  drawWeapon(ctx, look, a, p, hand);

  // ---- lớp Tiến Hoá phía trước (ấn ký bay quanh, vòng hào quang) ----
  if (evo >= 2) drawEvoRunes(ctx, look.aura, a, evo);
  if (evo >= 6) drawEvoHalo(ctx, look.aura, a, evo);

  // ---- hạt của trang phục Cửa Hàng ----
  if (sfx >= 1) drawSkinMotes(ctx, look, a, sfx);

  // ---- lớp phủ băng / choáng ----
  if (a.frozen > 0) {
    ctx.fillStyle = 'rgba(150,215,255,0.28)';
    ctx.beginPath(); ctx.ellipse(0, -52, 24, 56, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,0.85)'; ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
  if (grounded && a.action === 'spawn') {
    ctx.save();
    ctx.globalAlpha = (1 - a.actionT) * 0.8;
    const gb = ctx.createLinearGradient(0, -140 * s, 0, 0);
    gb.addColorStop(0, alpha(look.aura, 0));
    gb.addColorStop(1, alpha(look.aura, 0.7));
    ctx.fillStyle = gb;
    ctx.fillRect(-16 * s, -140 * s, 32 * s, 140 * s);
    ctx.restore();
  }
}

/**
 * Trận đồ dưới chân — lớp hiệu ứng đầu tiên mà trang phục Cửa Hàng mở ra.
 *
 * Vẽ trong hệ toạ độ chưa lật mặt (trước `ctx.scale(s * facing, s)`) nên nó
 * không lật theo hướng nhìn — một vòng tròn quay ngược chiều thì lật hay
 * không lật đều đúng, nhưng giữ nguyên giúp nó bám mặt đất thay vì "nhảy"
 * mỗi lần nhân vật quay người.
 */
function drawGroundSigil(
  ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState, fx: number, fade: number,
): void {
  const s = a.scale;
  const rings = Math.min(4, fx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(0, 1 * s);
  ctx.scale(1, 0.34); // ép dẹt thành hình elip nằm trên mặt đất
  for (let r = 0; r < rings; r++) {
    const rad = (26 + r * 9) * s;
    const spin = a.t * (r % 2 === 0 ? 0.55 : -0.4) + r;
    ctx.globalAlpha = (0.3 - r * 0.06) * fade;
    ctx.strokeStyle = look.aura;
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, TAU);
    ctx.stroke();
    // vạch khắc chạy quanh vành — số vạch tăng theo bậc nên vòng ngoài dày hơn
    const ticks = 6 + r * 4 + fx * 2;
    ctx.globalAlpha = (0.42 - r * 0.08) * fade;
    ctx.lineWidth = 2.2 * s;
    for (let i = 0; i < ticks; i++) {
      const ang = spin + (i * TAU) / ticks;
      const c = Math.cos(ang), sn = Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(c * rad * 0.9, sn * rad * 0.9);
      ctx.lineTo(c * rad * 1.06, sn * rad * 1.06);
      ctx.stroke();
    }
  }
  // Bậc cao nhất thêm một vòng xung nhịp giãn ra rồi tắt — nhịp thở của trận đồ.
  if (fx >= 4) {
    const ph = (a.t * 0.55) % 1;
    ctx.globalAlpha = 0.4 * (1 - ph) * fade;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(0, 0, (24 + ph * 44) * s, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Hạt xoay quanh thân. Bậc càng cao càng nhiều hạt và quỹ đạo càng cao,
 * nên nhìn từ xa cũng đoán được người kia đang mặc bộ bao nhiêu tiền.
 */
function drawSkinMotes(
  ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState, fx: number,
): void {
  const n = 3 + fx * 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = a.t * (0.8 + (i % 3) * 0.22) + (i * TAU) / n;
    const rad = 20 + (i % 4) * 5;
    const x = Math.cos(ang) * rad;
    // hạt trôi lên chậm rồi lặp lại từ dưới chân
    const rise = ((a.t * 0.35 + i / n) % 1);
    const y = -8 - rise * (78 + fx * 8);
    const depth = 0.4 + 0.6 * ((Math.sin(ang) + 1) / 2);
    ctx.globalAlpha = 0.5 * depth * Math.sin(rise * Math.PI);
    ctx.fillStyle = i % 4 === 0 ? '#ffffff' : look.aura;
    ctx.beginPath();
    ctx.arc(x, y, (1.1 + depth * 1.5) * (0.8 + fx * 0.12), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Lưu ảnh khi ra đòn — hai đến ba bóng của tư thế ở các thời điểm trước.
 *
 * Cố ý KHÔNG vẽ lại toàn bộ nhân vật cho từng bóng: mỗi bóng chỉ là bộ xương
 * tô bằng nét dày trong suốt. Rẻ hơn nhiều lần mà mắt vẫn đọc ra đúng chuyển
 * động, và vì lấy mẫu cùng một hàm tư thế nên bóng luôn khớp tuyệt đối với
 * thân thật thay vì trôi lệch.
 */
function drawAfterimage(
  ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState, fx: number,
): void {
  const s = a.scale;
  const n = fx >= 5 ? 4 : fx >= 4 ? 3 : 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.scale(s * a.facing, s);
  ctx.lineCap = 'round';
  for (let i = 1; i <= n; i++) {
    const tt = a.actionT - i * 0.055;
    if (tt < 0) break;
    const pp = solvePose({ ...a, actionT: tt });
    ctx.save();
    ctx.globalAlpha = (0.3 - i * 0.07) * pp.fade;
    ctx.strokeStyle = look.aura;
    ctx.translate(pp.ox, pp.oy);
    ctx.translate(0, HIP_Y);
    ctx.rotate(pp.lean);
    ctx.translate(0, -HIP_Y);
    // thân
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(0, HIP_Y);
    ctx.lineTo(pp.spine * 6, SHO_Y);
    ctx.stroke();
    ctx.lineWidth = 9;
    for (const side of [0, 1] as const) {
      const sd = side === 0 ? -1 : 1;
      const [h, k] = pp.legs[side];
      const root = { x: HIP_X * sd * 0.85, y: HIP_Y };
      const d0 = dir(h, THIGH);
      const mid = { x: root.x + d0.x, y: root.y + d0.y };
      const d1 = dir(h + k, SHIN);
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(mid.x + d1.x, mid.y + d1.y);
      ctx.stroke();
      const [sh, el] = pp.arms[side];
      const sho = { x: SHO_X * sd + pp.spine * 6, y: SHO_Y };
      const a0 = dir(sh, UPPER);
      const elb = { x: sho.x + a0.x, y: sho.y + a0.y };
      const a1 = dir(sh + el, FORE);
      ctx.beginPath();
      ctx.moveTo(sho.x, sho.y);
      ctx.lineTo(elb.x, elb.y);
      ctx.lineTo(elb.x + a1.x, elb.y + a1.y);
      ctx.stroke();
    }
    // đầu
    ctx.beginPath();
    ctx.arc(0, HEAD_Y, HEAD_R * 0.9, 0, TAU);
    ctx.fillStyle = look.aura;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Cánh linh hồn — mở từ bậc Tiến Hoá 4.
 * Vẽ trước thân nên trông như mọc ra từ sau lưng; sải cánh và số lông rộng
 * dần theo bậc để mỗi lần tiến hoá đều nhìn thấy được sự khác biệt.
 */
function drawEvoWings(ctx: CanvasRenderingContext2D, aura: string, a: AnimState, tier: number): void {
  const beat = Math.sin(a.t * 2.1 + a.seed) * 0.16;
  const span = 26 + (tier - 4) * 7;
  const feathers = 3 + (tier - 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * 8, SHO_Y + 2);
    ctx.rotate(sd * (0.5 + beat));
    for (let i = 0; i < feathers; i++) {
      const k = i / Math.max(1, feathers - 1);
      const len = span * (1 - k * 0.34);
      ctx.globalAlpha = 0.3 - k * 0.06;
      ctx.strokeStyle = aura;
      ctx.lineWidth = 5 - k * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(sd * len * 0.6, -len * 0.5 + k * len * 0.7, sd * len, -len * 0.15 + k * len * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Ấn ký quay quanh thân — mở từ bậc 2, càng cao càng nhiều. */
function drawEvoRunes(ctx: CanvasRenderingContext2D, aura: string, a: AnimState, tier: number): void {
  const n = Math.min(6, tier);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = a.t * 1.1 + (i * TAU) / n;
    const x = Math.cos(ang) * 24;
    const y = -52 + Math.sin(ang * 1.3) * 13;
    const depth = 0.45 + 0.55 * ((Math.sin(ang) + 1) / 2);
    ctx.globalAlpha = 0.35 * depth;
    ctx.fillStyle = aura;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang * 1.6);
    ctx.fillRect(-2.2 * depth, -2.2 * depth, 4.4 * depth, 4.4 * depth);
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Vòng hào quang sau đầu — chỉ bậc cao nhất mới có. */
function drawEvoHalo(ctx: CanvasRenderingContext2D, aura: string, a: AnimState, tier: number): void {
  const r = 19 + (tier - 6) * 4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.28 + 0.08 * Math.sin(a.t * 2.4);
  ctx.strokeStyle = aura;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, HEAD_Y - 2, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha *= 0.5;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawLeg(
  ctx: CanvasRenderingContext2D, side: number,
  ang: [number, number], color: string, rim: string,
): void {
  const c = side < 0 ? darken(color, 0.24) : color;
  const root = { x: HIP_X * side * 0.85, y: HIP_Y };
  const { end } = chain(ctx, root, ang[0], THIGH, ang[1], SHIN, 11, 9, c, side > 0 ? rim : undefined);
  // giày
  ctx.save();
  ctx.translate(end.x, end.y);
  ctx.rotate(ang[0] + ang[1]);
  const boot = darken(color, 0.45);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.roundRect(-5.6, -2.4, 13.4, 7.4, 3); ctx.fill();
  ctx.fillStyle = boot;
  ctx.beginPath(); ctx.roundRect(-5, -2, 12.4, 6.6, 3); ctx.fill();
  ctx.fillStyle = lighten(boot, 0.22);
  ctx.beginPath(); ctx.roundRect(-4.4, -1.6, 11, 2, 1); ctx.fill();
  ctx.restore();
}

function drawArm(
  ctx: CanvasRenderingContext2D, side: number,
  ang: [number, number], sleeve: string, skin: string, rim: string,
): Joint {
  const c = side < 0 ? darken(sleeve, 0.3) : sleeve;
  const root = { x: SHO_X * side, y: SHO_Y };
  const d0 = dir(ang[0], UPPER);
  const el = { x: root.x + d0.x, y: root.y + d0.y };
  const d1 = dir(ang[0] + ang[1], FORE);
  const hand = { x: el.x + d1.x, y: el.y + d1.y };
  seg(ctx, root.x, root.y, el.x, el.y, 9.5, c, side > 0 ? rim : undefined);
  seg(ctx, el.x, el.y, hand.x, hand.y, 8, side < 0 ? darken(skin, 0.3) : skin);
  // bao tay
  ellipse(ctx, hand.x, hand.y, 4.4, 4.4, 0, side < 0 ? darken(sleeve, 0.42) : darken(sleeve, 0.2), INK, 1.8);
  return hand;
}

type BuildKind = 'robe' | 'heavy' | 'ranger' | 'light';

/** Ống tên đeo chéo lưng — dấu hiệu nhận biết cung thủ từ xa. */
function drawQuiver(ctx: CanvasRenderingContext2D, look: ChibiLook): void {
  ctx.save();
  ctx.translate(-11, SHO_Y + 4);
  ctx.rotate(-0.42);
  const body = darken(look.outfit2, 0.2);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect(-5, -4, 10, 26, 3); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = lighten(body, 0.25);
  ctx.beginPath(); ctx.roundRect(-5, 6, 10, 3, 1); ctx.fill();
  // đuôi tên nhô ra
  for (let i = -1; i <= 1; i++) {
    ctx.strokeStyle = '#c9b596'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(i * 2.6, -3); ctx.lineTo(i * 2.6 - 1, -12); ctx.stroke();
    ctx.fillStyle = look.aura;
    ctx.beginPath();
    ctx.moveTo(i * 2.6 - 1, -12); ctx.lineTo(i * 2.6 - 4, -9); ctx.lineTo(i * 2.6 + 1, -9);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Áo choàng dài của pháp sư — bay theo bước chân, trùm gần hết chân. */
function drawRobe(ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState, p: Pose): void {
  const sway = Math.sin(a.t * 2.4 + a.seed) * 1.6 - a.vx * 0.02;
  const hem = -6;
  ctx.beginPath();
  ctx.moveTo(-11, HIP_Y - 4);
  ctx.quadraticCurveTo(-19 + sway, HIP_Y + 20, -16 + sway * 1.5, hem);
  ctx.quadraticCurveTo(-6, hem + 5, 0, hem - 1);
  ctx.quadraticCurveTo(7, hem + 5, 17 + sway, hem);
  ctx.quadraticCurveTo(20 + sway * 0.6, HIP_Y + 20, 11, HIP_Y - 4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, HIP_Y - 4, 0, hem);
  g.addColorStop(0, look.outfit);
  g.addColorStop(1, darken(look.outfit, 0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.3; ctx.stroke();
  // nẹp phát sáng dưới gấu áo
  ctx.strokeStyle = alpha(look.aura, 0.55); ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-15 + sway * 1.4, hem - 3);
  ctx.quadraticCurveTo(0, hem + 2, 16 + sway * 0.9, hem - 3);
  ctx.stroke();
  void p;
}

function drawTorso(
  ctx: CanvasRenderingContext2D, look: ChibiLook, p: Pose, rim: string, build: BuildKind = 'light',
): void {
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.spine);
  ctx.translate(0, -HIP_Y);

  const heavy = build === 'heavy';
  const top = SHO_Y - 3, bot = HIP_Y + 3;
  const wTop = heavy ? 16 : build === 'robe' ? 12 : 13.5;
  const wBot = heavy ? 12 : 10;
  ctx.beginPath();
  ctx.moveTo(-wTop, top);
  ctx.quadraticCurveTo(-wTop - 1.6, (top + bot) / 2, -wBot, bot);
  ctx.quadraticCurveTo(0, bot + 4.5, wBot, bot);
  ctx.quadraticCurveTo(wTop + 1.6, (top + bot) / 2, wTop, top);
  ctx.quadraticCurveTo(0, top - 6, -wTop, top);
  ctx.closePath();

  const g = ctx.createLinearGradient(-wTop, 0, wTop, 0);
  g.addColorStop(0, darken(look.outfit, 0.36));
  g.addColorStop(0.42, look.outfit);
  g.addColorStop(1, lighten(look.outfit, 0.2));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();

  // giáp ngực
  ctx.beginPath();
  ctx.moveTo(-wTop + 2, top + 4);
  ctx.lineTo(0, top + 15);
  ctx.lineTo(wTop - 2, top + 4);
  ctx.strokeStyle = darken(look.outfit, 0.45);
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // thắt lưng
  ctx.fillStyle = darken(look.outfit2, 0.15);
  ctx.beginPath(); ctx.roundRect(-wBot - 1.4, bot - 7, (wBot + 1.4) * 2, 7, 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = mix(look.aura, '#ffd23c', 0.4);
  ctx.beginPath(); ctx.roundRect(-3, bot - 6.2, 6, 5.4, 1.6); ctx.fill();

  // đệm vai — thuẫn thủ mang giáp vai to và có gai
  const pw = heavy ? 10.5 : 7.4;
  const ph = heavy ? 8.5 : 6;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * (SHO_X + (heavy ? 2.5 : 1)), SHO_Y - 1, pw, ph, sd * 0.3, 0, TAU);
    ctx.fillStyle = sd < 0 ? darken(look.outfit2, 0.3) : look.outfit2;
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    if (heavy) {
      ctx.beginPath();
      ctx.moveTo(sd * (SHO_X + 2), SHO_Y - 8);
      ctx.lineTo(sd * (SHO_X + 5), SHO_Y - 17);
      ctx.lineTo(sd * (SHO_X - 3), SHO_Y - 8);
      ctx.closePath();
      ctx.fillStyle = '#ded5c4'; ctx.fill(); ctx.stroke();
    }
    if (sd > 0) {
      ctx.beginPath();
      ctx.ellipse(sd * (SHO_X + (heavy ? 2.5 : 1)), SHO_Y - 3.4, pw * 0.7, 2.4, sd * 0.3, 0, TAU);
      ctx.fillStyle = lighten(look.outfit2, 0.34);
      ctx.fill();
    }
  }
  // viền sáng lưng
  ctx.strokeStyle = rim; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-wTop + 0.6, top + 2);
  ctx.quadraticCurveTo(-wTop - 0.4, (top + bot) / 2, -wBot + 0.6, bot - 1);
  ctx.stroke();
  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState, p: Pose): void {
  const cy = HEAD_Y;
  // tóc lớp sau
  drawHairBack(ctx, look, a);

  // hộp sọ
  const g = ctx.createRadialGradient(-4, cy - 4, 2, 0, cy, HEAD_R * 1.5);
  g.addColorStop(0, lighten(look.skin, 0.24));
  g.addColorStop(0.6, look.skin);
  g.addColorStop(1, darken(look.skin, 0.3));
  ctx.beginPath();
  ctx.ellipse(0, cy, HEAD_R, HEAD_R * 1.06, 0, 0, TAU);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();

  // tai
  ellipse(ctx, HEAD_R - 1.5, cy + 2, 2.6, 3.4, 0, darken(look.skin, 0.12), INK, 1.6);

  // mắt (chớp theo chu kỳ riêng của từng nhân vật)
  const cyc = (a.t * 0.72 + a.seed * 0.61) % 1;
  const blink = cyc > 0.965 ? 1 : cyc > 0.94 ? (cyc - 0.94) / 0.025 : 0;
  const openY = 3.6 * (1 - blink);
  const angry = a.action === 'attack' ? 1 : 0;
  for (const ex of [3.4, 8.6]) {
    if (openY > 0.6) {
      ellipse(ctx, ex, cy - 0.6, 2.9, openY, 0, '#f6f3ee');
      ellipse(ctx, ex + 0.7, cy - 0.3, 1.9, openY * 0.86, 0, look.eyes);
      ellipse(ctx, ex + 0.9, cy - 0.1, 0.95, openY * 0.6, 0, '#120d18');
      ellipse(ctx, ex + 1.5, cy - 1.6, 0.85, 0.85, 0, '#ffffff');
    }
    // mí / lông mày
    ctx.strokeStyle = darken(look.hair, 0.25);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(ex - 2.6, cy - 4.4 - angry * 0.2);
    ctx.lineTo(ex + 2.6, cy - 5.2 + angry * 1.6);
    ctx.stroke();
  }

  // miệng
  ctx.strokeStyle = darken(look.skin, 0.55);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const mouth = a.action === 'attack' ? clamp(Math.sin(p.wrist + 1) * 2.6, 0, 2.6) : 0;
  if (mouth > 0.8) {
    ctx.ellipse(6.4, cy + 6.6, 2.4, mouth, 0, 0, TAU);
    ctx.fillStyle = '#6d2634'; ctx.fill();
  } else {
    ctx.arc(6.2, cy + 4.6, 2.6, 0.25, Math.PI - 0.55);
  }
  ctx.stroke();

  // tóc lớp trước + phụ kiện
  drawHairFront(ctx, look, a);
  drawAccessory(ctx, look, a);
}

function hairSway(a: AnimState, k = 1): number {
  return (Math.sin(a.t * 2.6 + a.seed) * 1.2 - a.vx * 0.012) * k;
}

function drawHairBack(ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState): void {
  const cy = HEAD_Y;
  const sw = hairSway(a);
  const dark = darken(look.hair, 0.34);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  if (look.hairStyle === 'long') {
    ctx.beginPath();
    ctx.moveTo(-11, cy - 6);
    ctx.quadraticCurveTo(-17 - sw, cy + 12, -12 - sw * 1.6, cy + 30);
    ctx.lineTo(7 - sw, cy + 28);
    ctx.quadraticCurveTo(13, cy + 6, 11, cy - 6);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill(); ctx.stroke();
  } else if (look.hairStyle === 'pony') {
    ctx.beginPath();
    ctx.moveTo(-9, cy - 8);
    ctx.quadraticCurveTo(-22 - sw * 2, cy - 2, -17 - sw * 3, cy + 20);
    ctx.quadraticCurveTo(-11 - sw, cy + 6, -6, cy);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill(); ctx.stroke();
  } else if (look.hairStyle === 'twin') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * 13, cy + 7 + sw * 0.4, 4.6, 11, sd * 0.24, 0, TAU);
      ctx.fillStyle = dark; ctx.fill(); ctx.stroke();
    }
  } else if (look.hairStyle === 'wild') {
    ctx.beginPath();
    ctx.moveTo(-10, cy - 8);
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(-16 - i * 1.6 - sw, cy - 6 + i * 5);
      ctx.lineTo(-9 - i * 0.6, cy - 2 + i * 5);
    }
    ctx.lineTo(-4, cy + 8);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill(); ctx.stroke();
  }
}

function drawHairFront(ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState): void {
  const cy = HEAD_Y;
  const sw = hairSway(a, 0.5);
  if (look.hairStyle === 'none') return;
  const g = ctx.createLinearGradient(0, cy - HEAD_R, 0, cy + 4);
  g.addColorStop(0, lighten(look.hair, 0.28));
  g.addColorStop(1, darken(look.hair, 0.12));
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();

  if (look.hairStyle === 'spiky' || look.hairStyle === 'wild') {
    ctx.moveTo(-13, cy + 1);
    const n = look.hairStyle === 'wild' ? 6 : 5;
    for (let i = 0; i <= n; i++) {
      const x = -13 + (26 / n) * i;
      const up = (i % 2 === 0 ? 11 : 6.5) + Math.sin(i * 2.3 + a.seed) * 2;
      ctx.lineTo(x + sw * 0.4, cy - 8 - up);
      ctx.lineTo(x + 26 / n / 2, cy - 8);
    }
    ctx.lineTo(13, cy + 1);
    ctx.quadraticCurveTo(0, cy - 15, -13, cy + 1);
  } else if (look.hairStyle === 'mohawk') {
    ctx.moveTo(-11, cy - 2);
    ctx.quadraticCurveTo(-9, cy - 12, -4, cy - 13);
    ctx.lineTo(-3, cy - 24 - sw);
    ctx.lineTo(2, cy - 13);
    ctx.lineTo(4, cy - 26 - sw);
    ctx.lineTo(7, cy - 12);
    ctx.quadraticCurveTo(11, cy - 10, 11, cy - 2);
    ctx.quadraticCurveTo(0, cy - 9, -11, cy - 2);
  } else if (look.hairStyle === 'hood') {
    ctx.moveTo(-14.5, cy + 5);
    ctx.quadraticCurveTo(-16, cy - 17, 0, cy - 16.5);
    ctx.quadraticCurveTo(14, cy - 16, 12, cy + 6);
    ctx.lineTo(8, cy + 3);
    ctx.quadraticCurveTo(2, cy - 8, -10, cy - 4);
    ctx.closePath();
  } else if (look.hairStyle === 'bun') {
    ctx.moveTo(-13, cy + 1);
    ctx.quadraticCurveTo(-13, cy - 14, 0, cy - 14);
    ctx.quadraticCurveTo(13, cy - 14, 13, cy + 1);
    ctx.quadraticCurveTo(4, cy - 7, -13, cy + 1);
  } else if (look.hairStyle === 'short') {
    ctx.moveTo(-13, cy + 2);
    ctx.quadraticCurveTo(-14, cy - 14, 0, cy - 14);
    ctx.quadraticCurveTo(14, cy - 14, 13, cy + 2);
    ctx.lineTo(9, cy - 1);
    ctx.quadraticCurveTo(0, cy - 9, -9, cy - 3);
  } else {
    // long / pony / twin dùng chung mái trước
    ctx.moveTo(-13.5, cy + 3);
    ctx.quadraticCurveTo(-14, cy - 15, 0, cy - 15);
    ctx.quadraticCurveTo(14, cy - 15, 13.5, cy + 3);
    ctx.lineTo(10, cy - 1);
    ctx.quadraticCurveTo(3, cy - 10, -4, cy - 5);
    ctx.quadraticCurveTo(-8, cy - 2, -10, cy + 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (look.hairStyle === 'bun') {
    ellipse(ctx, 1, cy - 18 + sw * 0.3, 6.6, 6, 0, look.hair, INK, 2);
    ellipse(ctx, -1, cy - 20, 2.6, 2, 0, lighten(look.hair, 0.32));
  }
  // đốm sáng trên tóc
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = lighten(look.hair, 0.55);
  ctx.beginPath(); ctx.ellipse(-3, cy - 10, 5.4, 1.9, -0.24, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawAccessory(ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState): void {
  const cy = HEAD_Y;
  if (look.accessory === 'halo') {
    const y = cy - 22 + Math.sin(a.t * 2.2 + a.seed) * 1.6;
    glow(ctx, 0, y, 6, '#ffe98a', 0.9);
    ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(0, y, 9.5, 3, 0, 0, TAU); ctx.stroke();
  } else if (look.accessory === 'horns') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 7, cy - 10);
      ctx.quadraticCurveTo(sd * 15, cy - 17, sd * 12.5, cy - 25);
      ctx.quadraticCurveTo(sd * 10, cy - 17, sd * 3.5, cy - 12);
      ctx.closePath();
      ctx.fillStyle = sd > 0 ? '#e6ded0' : '#bdb5a8';
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    }
  } else if (look.accessory === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-9, cy - 11); ctx.lineTo(-9, cy - 18); ctx.lineTo(-4.5, cy - 14);
    ctx.lineTo(0, cy - 21); ctx.lineTo(4.5, cy - 14); ctx.lineTo(9, cy - 18);
    ctx.lineTo(9, cy - 11);
    ctx.closePath();
    const g = ctx.createLinearGradient(-9, cy - 21, 9, cy - 11);
    g.addColorStop(0, '#ffe98a'); g.addColorStop(0.5, '#ffd23c'); g.addColorStop(1, '#a8741e');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    ellipse(ctx, 0, cy - 13.5, 1.7, 1.7, 0, '#ff4fd8');
  } else if (look.accessory === 'mask') {
    ctx.fillStyle = 'rgba(16,12,24,0.94)';
    ctx.beginPath(); ctx.roundRect(-2, cy + 2, 15, 8, 3); ctx.fill();
    ctx.strokeStyle = alpha(look.aura, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
  } else if (look.accessory === 'ears') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 6, cy - 9);
      ctx.lineTo(sd * 11.5, cy - 22);
      ctx.lineTo(sd * 1.5, cy - 12);
      ctx.closePath();
      ctx.fillStyle = sd > 0 ? look.hair : darken(look.hair, 0.28);
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sd * 6, cy - 11); ctx.lineTo(sd * 9.5, cy - 19); ctx.lineTo(sd * 4, cy - 13);
      ctx.closePath();
      ctx.fillStyle = alpha('#ff9aa8', 0.6); ctx.fill();
    }
  } else if (look.accessory === 'headband') {
    ctx.fillStyle = '#c83030';
    ctx.beginPath(); ctx.roundRect(-13, cy - 6.5, 26, 4.4, 1.6); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    const sw = hairSway(a, 1.6);
    ctx.beginPath();
    ctx.moveTo(-12, cy - 5);
    ctx.quadraticCurveTo(-20 - sw, cy + 2, -17 - sw * 1.6, cy + 12);
    ctx.lineTo(-13, cy + 10);
    ctx.quadraticCurveTo(-14, cy + 1, -9, cy - 4);
    ctx.closePath();
    ctx.fillStyle = '#a82424'; ctx.fill(); ctx.stroke();
  }
}

function drawCape(ctx: CanvasRenderingContext2D, cape: string, a: AnimState, p: Pose): void {
  const sw = Math.sin(a.t * 3.1 + a.seed) * 3 - a.vx * 0.035 - p.ox * 0.35;
  const g = ctx.createLinearGradient(0, SHO_Y, 0, HIP_Y + 34);
  g.addColorStop(0, lighten(cape, 0.16));
  g.addColorStop(1, darken(cape, 0.4));
  ctx.beginPath();
  ctx.moveTo(-9, SHO_Y - 3);
  ctx.quadraticCurveTo(-20 - sw, SHO_Y + 24, -15 - sw * 1.7, HIP_Y + 32);
  ctx.quadraticCurveTo(-6 - sw * 0.8, HIP_Y + 22, -1 - sw * 0.4, HIP_Y + 34);
  ctx.quadraticCurveTo(4, HIP_Y + 20, 8, HIP_Y + 26);
  ctx.quadraticCurveTo(12, SHO_Y + 22, 9, SHO_Y - 3);
  ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
  // nếp gấp
  ctx.strokeStyle = darken(cape, 0.55); ctx.lineWidth = 1.4;
  for (const k of [-0.45, 0.15]) {
    ctx.beginPath();
    ctx.moveTo(k * 12, SHO_Y + 2);
    ctx.quadraticCurveTo(k * 18 - sw, HIP_Y + 6, k * 14 - sw, HIP_Y + 28);
    ctx.stroke();
  }
}

// ---------- vũ khí ----------
function metalGrad(ctx: CanvasRenderingContext2D, len: number, tint: string): CanvasGradient {
  const g = ctx.createLinearGradient(-3, 0, 3, 0);
  g.addColorStop(0, '#5d6579');
  g.addColorStop(0.35, '#d9dfeb');
  g.addColorStop(0.55, '#f4f7ff');
  g.addColorStop(0.75, mix('#aab2c4', tint, 0.25));
  g.addColorStop(1, '#3d4353');
  void len;
  return g;
}

function drawWeapon(
  ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState, p: Pose, hand: Joint,
): void {
  const w = look.weapon;
  if (w === 'none' || w === 'shield') return;
  // Khi đứng nghỉ, lưỡi kiếm/giáo chúc xuống sau lưng; vào đòn mới dựng lên.
  // Hệ số `engaged` chuyển mượt hai chiều nên không bị giật khung.
  let engaged = 0;
  if (a.action === 'attack') {
    engaged = clamp(a.actionT / 0.18, 0, 1) * clamp((1 - a.actionT) / 0.28, 0, 1);
  } else if (a.action === 'cast' || a.action === 'dead') {
    engaged = 1;
  }
  const restAng = WEAPON_REST[w] * (1 - engaged);
  const ang = p.arms[1][0] + p.arms[1][1] + p.wrist + restAng;

  // vệt chém: lấy mẫu tư thế ở các thời điểm trước đó
  if (WEAPON_TRAIL.has(w) && a.action === 'attack' && a.actionT > 0.3 && a.actionT < 0.66) {
    drawSlashTrail(ctx, look, a);
  }
  const sk = skinOf(look, a);
  const el = elementOf(look);

  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(ang);
  if (w === 'sword') {
    bladeAura(ctx, sk, a, 44, 5, el);
    ctx.fillStyle = '#3a2a24';
    ctx.beginPath(); ctx.roundRect(-2.6, -2, 5.2, 11, 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#e8b642';
    ctx.beginPath(); ctx.roundRect(-8, -5.5, 16, 4.4, 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4.4, -5); ctx.lineTo(-3, -40); ctx.lineTo(0, -47); ctx.lineTo(3, -40);
    ctx.lineTo(4.4, -5); ctx.closePath();
    ctx.fillStyle = bladeGrad(ctx, sk, 4.4); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.stroke();
    ctx.strokeStyle = alpha('#ffffff', 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0.5, -8); ctx.lineTo(0.5, -40); ctx.stroke();
  } else if (w === 'greatsword') {
    // Đại đao: lưỡi bản rộng, chuôi dài hai tay.
    bladeAura(ctx, sk, a, 58, 8, el);
    ctx.fillStyle = '#2f241d';
    ctx.beginPath(); ctx.roundRect(-3, -2, 6, 17, 2.4); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = darken(sk.edge, 0.3);
    ctx.beginPath(); ctx.roundRect(-11, -7, 22, 5.4, 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7.5, -6); ctx.lineTo(-6.5, -46); ctx.lineTo(-3, -60); ctx.lineTo(3.5, -58);
    ctx.lineTo(7.5, -44); ctx.lineTo(7.5, -6); ctx.closePath();
    ctx.fillStyle = bladeGrad(ctx, sk, 7.5); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = alpha(sk.core, 0.6); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -50); ctx.stroke();
  } else if (w === 'scythe') {
    // Lưỡi hái: cán dài, lưỡi cong vắt ngang đầu cán.
    bladeAura(ctx, sk, a, 40, 5, el);
    ctx.fillStyle = '#4a3428';
    ctx.beginPath(); ctx.roundRect(-2.2, -50, 4.4, 64, 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.quadraticCurveTo(-26, -58, -34, -38);
    ctx.quadraticCurveTo(-22, -48, -2, -44);
    ctx.closePath();
    ctx.fillStyle = bladeGrad(ctx, sk, 16); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.stroke();
    ctx.strokeStyle = alpha(sk.core, 0.75); ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -49); ctx.quadraticCurveTo(-24, -56, -32, -39);
    ctx.stroke();
    ellipse(ctx, 0, -47, 3.4, 3.4, 0, sk.core, INK, 1.4);
  } else if (w === 'hammer') {
    // Chuỳ: đầu khối vuông nặng, cán ngắn.
    bladeAura(ctx, sk, a, 34, 10, el);
    ctx.fillStyle = '#4a3428';
    ctx.beginPath(); ctx.roundRect(-2.6, -32, 5.2, 46, 2.4); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, -34); ctx.lineTo(-14, -48); ctx.lineTo(14, -48);
    ctx.lineTo(12, -34); ctx.closePath();
    ctx.fillStyle = bladeGrad(ctx, sk, 13); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.9; ctx.stroke();
    ctx.fillStyle = alpha(sk.core, 0.55);
    ctx.beginPath(); ctx.roundRect(-9, -46, 18, 3.4, 1.4); ctx.fill();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = darken(sk.edge, 0.2);
      ctx.beginPath();
      ctx.moveTo(sd * 13, -46); ctx.lineTo(sd * 19, -41); ctx.lineTo(sd * 12.5, -36);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    }
  } else if (w === 'twinblade') {
    // Song kiếm: hai lưỡi ngắn tréo nhau, lưỡi sau mờ hơn cho có chiều sâu.
    bladeAura(ctx, sk, a, 30, 4, el);
    for (const [sd, sc, al] of [[-1, 0.86, 0.7], [1, 1, 1]] as Array<[number, number, number]>) {
      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(sd * 4.5, 1);
      ctx.rotate(sd * 0.3);
      ctx.scale(sc, sc);
      ctx.fillStyle = '#2f2620';
      ctx.beginPath(); ctx.roundRect(-2.4, -1, 4.8, 10, 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = darken(sk.edge, 0.25);
      ctx.beginPath(); ctx.roundRect(-6, -4, 12, 3.4, 1.6); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3.4, -3.6); ctx.lineTo(-2, -26); ctx.lineTo(0, -32); ctx.lineTo(2, -26);
      ctx.lineTo(3.4, -3.6); ctx.closePath();
      ctx.fillStyle = bladeGrad(ctx, sk, 3.4); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  } else if (w === 'spear') {
    bladeAura(ctx, sk, a, 60, 5, el);
    ctx.fillStyle = '#6d4a2c';
    ctx.beginPath(); ctx.roundRect(-1.8, -46, 3.6, 60, 1.8); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4.4, -44); ctx.lineTo(0, -60); ctx.lineTo(4.4, -44);
    ctx.quadraticCurveTo(0, -40, -4.4, -44);
    ctx.closePath();
    ctx.fillStyle = bladeGrad(ctx, sk, 4.4); ctx.fill(); ctx.stroke();
  } else if (w === 'daggers') {
    drawDagger(ctx, { x: 0, y: 0 }, 0, look.aura, 1);
  } else if (w === 'staff') {
    ctx.fillStyle = '#6d4a2c';
    ctx.beginPath(); ctx.roundRect(-2, -38, 4, 52, 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    // vòng kim loại
    ctx.fillStyle = '#c9a24a';
    ctx.beginPath(); ctx.roundRect(-3, -32, 6, 3, 1); ctx.fill();
    const orbGlow = 0.55 + p.charge * 0.45 + Math.sin(a.t * 5) * 0.08;
    glow(ctx, 0, -44, 7 + p.charge * 2.2, look.aura, orbGlow);
    ellipse(ctx, 0, -44, 6 + p.charge * 2.2, 6 + p.charge * 2.2, 0, look.aura, INK, 1.8);
    ellipse(ctx, -2, -46, 2.2, 1.7, -0.4, alpha('#ffffff', 0.85));
  } else if (w === 'bow') {
    ctx.rotate(-0.35);
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 20, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = lighten('#7a5230', 0.3); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 21.4, -1.2, 1.2); ctx.stroke();
    const pull = p.charge * 9;
    ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(20 * Math.cos(-1.25), 20 * Math.sin(-1.25));
    ctx.lineTo(-pull, 0);
    ctx.lineTo(20 * Math.cos(1.25), 20 * Math.sin(1.25));
    ctx.stroke();
    if (p.charge > 0.05) {
      glow(ctx, 8, 0, 5, look.aura, p.charge);
      ctx.strokeStyle = look.aura; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-pull, 0); ctx.lineTo(16, 0); ctx.stroke();
    }
  } else if (w === 'orb') {
    const r = 6.4 + p.charge * 2.6;
    const y = -6 + Math.sin(a.t * 3.2 + a.seed) * 2;
    glow(ctx, 0, y, r * 1.3, look.aura, 0.9 + p.charge * 0.6);
    const g = ctx.createRadialGradient(-r * 0.3, y - r * 0.3, 1, 0, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, lighten(look.aura, 0.3));
    g.addColorStop(1, darken(look.aura, 0.25));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, y, r, 0, TAU); ctx.fill();
    // vòng quỹ đạo
    ctx.strokeStyle = alpha(look.aura, 0.6); ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, y, r + 4, (r + 4) * 0.35, a.t * 1.6, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDagger(
  ctx: CanvasRenderingContext2D, at: Joint, rot: number, tint: string, sc: number,
): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.fillStyle = '#2f2620';
  ctx.beginPath(); ctx.roundRect(-2, -1, 4, 8, 1.6); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, -3); ctx.lineTo(-1.4, -21); ctx.lineTo(0, -24); ctx.lineTo(1.4, -21);
  ctx.lineTo(3, -3); ctx.closePath();
  const g = ctx.createLinearGradient(-3, 0, 3, 0);
  g.addColorStop(0, '#596071'); g.addColorStop(0.5, '#eef2fa'); g.addColorStop(1, mix('#98a0b2', tint, 0.3));
  ctx.fillStyle = g; ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, at: Joint, look: ChibiLook, p: Pose): void {
  ctx.save();
  ctx.translate(at.x - 2, at.y + 1);
  ctx.rotate(p.arms[0][0] * 0.4 - 0.1);
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.quadraticCurveTo(0, -15, 10, -12);
  ctx.quadraticCurveTo(11, 4, 0, 14);
  ctx.quadraticCurveTo(-11, 4, -10, -12);
  ctx.closePath();
  const g = ctx.createLinearGradient(-10, -12, 10, 14);
  g.addColorStop(0, '#9aa2b4'); g.addColorStop(0.5, '#6c7385'); g.addColorStop(1, '#464c5c');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
  ellipse(ctx, 0, -1, 4.2, 5, 0, look.aura, INK, 1.6);
  ctx.restore();
}

/**
 * Vệt chém: lấy mẫu quỹ đạo mũi vũ khí ở 12 thời điểm trước đó rồi nối thành dải.
 *
 * Số mẫu tăng gấp đôi so với trước và bước lấy mẫu nhỏ lại, nên ở tốc độ ×4–×6
 * dải không còn gãy thành đa giác thấy rõ. Bậc vũ khí và skin quyết định số
 * LỚP chồng lên nhau: một lớp lõi trắng, một lớp màu rộng hơn, và ở bậc cao
 * thêm hai vòng cung mỏng lệch pha — chính ba thứ đó tạo cảm giác "nặng đòn"
 * mà không cần thêm hạt.
 */
function drawSlashTrail(ctx: CanvasRenderingContext2D, look: ChibiLook, a: AnimState): void {
  const len = WEAPON_LEN[look.weapon] || 34;
  const sk = skinOf(look, a);
  const tier = look.weaponTier ?? 0;
  const fx = Math.max(look.weaponFx ?? 0, look.skinFx ?? 0);
  const tint = tier > 0 || look.weaponSkin ? sk.core : look.aura;

  /** Dải nối mũi vũ khí (bán kính `outer`) với một điểm gần tay (`innerK`). */
  const band = (outer: number, innerK: number, samples: number, step: number): {
    pts: Joint[]; inner: Joint[];
  } => {
    const pts: Joint[] = [];
    const inner: Joint[] = [];
    for (let i = 0; i < samples; i++) {
      const tt = a.actionT - i * step;
      if (tt < 0.28) break;
      const pp = solvePose({ ...a, actionT: tt });
      const h = handOf(pp);
      const ang = pp.arms[1][0] + pp.arms[1][1] + pp.wrist;
      const d = dir(ang + Math.PI, outer);
      pts.push({ x: h.x + d.x, y: h.y + d.y });
      const d2 = dir(ang + Math.PI, outer * innerK);
      inner.push({ x: h.x + d2.x, y: h.y + d2.y });
    }
    return { pts, inner };
  };

  const fill = (pts: Joint[], inner: Joint[], c0: number, c1: number, color: string): void => {
    if (pts.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
    const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    g.addColorStop(0, alpha('#ffffff', c0));
    g.addColorStop(0.35, alpha(lighten(color, 0.4), c1));
    g.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = g;
    ctx.fill();
  };

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // lớp ngoài: rộng, mờ, màu theo bậc — tạo khối
  const wide = band(len * 1.12, 0.18, 12, 0.016);
  fill(wide.pts, wide.inner, 0.3 + tier * 0.02, 0.22 + tier * 0.03, tint);
  // lớp lõi: hẹp, trắng gắt — tạo nét
  const core = band(len, 0.4, 12, 0.016);
  fill(core.pts, core.inner, Math.min(1, 0.8 + tier * 0.02), Math.min(0.95, 0.45 + tier * 0.05), tint);

  // Bậc/skin cao: thêm hai vòng cung mỏng lệch pha, chạy trước và sau lưỡi.
  if (tier >= 5 || fx >= 3) {
    ctx.strokeStyle = alpha(sk.core, 0.55);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (const off of [-0.045, 0.05]) {
      const arc = band(len * (1 + off * 3), 0.9, 9, 0.02);
      if (arc.pts.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(arc.pts[0].x, arc.pts[0].y);
      for (let i = 1; i < arc.pts.length; i++) ctx.lineTo(arc.pts[i].x, arc.pts[i].y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ============ QUÁI VẬT ============

export interface MonsterStyle { tint: string; eye: string; boss: boolean }

export function drawMonster(
  ctx: CanvasRenderingContext2D, kind: string, st: MonsterStyle, a: AnimState,
): void {
  const s = a.scale;
  const t = a.t + a.seed;
  const p = solveMonsterPose(kind, a);

  ctx.save();
  // hào quang boss
  if (st.boss) {
    // Bán kính có trần: boss to gấp đôi quái thường, nếu để quầng sáng
    // nhân theo tỉ lệ thì cả màn hình sẽ nhuộm đỏ và mất khả năng đọc.
    const r = Math.min(70 * s, 132);
    const g = ctx.createRadialGradient(0, -40 * s, 4, 0, -40 * s, r);
    g.addColorStop(0, alpha('#ff3b52', 0.22 + 0.08 * Math.sin(t * 4)));
    g.addColorStop(0.6, alpha('#ff3b52', 0.07));
    g.addColorStop(1, alpha('#ff3b52', 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -40 * s, r, 0, TAU); ctx.fill();
  }
  // Loé sáng khi trúng đòn — vẽ sau lưng để không che mất hình quái.
  if (a.hurt > 0) {
    const gh = ctx.createRadialGradient(0, -48 * s, 4, 0, -48 * s, 52 * s);
    gh.addColorStop(0, alpha('#ffb0b8', 0.66 * a.hurt));
    gh.addColorStop(0.6, alpha('#ffb0b8', 0.22 * a.hurt));
    gh.addColorStop(1, alpha('#ffb0b8', 0));
    ctx.fillStyle = gh;
    ctx.beginPath(); ctx.arc(0, -48 * s, 52 * s, 0, TAU); ctx.fill();
  }
  ctx.scale(-s, s); // quái luôn nhìn sang trái
  ctx.globalAlpha = p.fade;
  ctx.translate(p.ox, p.oy);

  switch (kind) {
    case 'slime': drawSlime(ctx, st, a, p); break;
    case 'bat': drawBat(ctx, st, a, p); break;
    case 'skeleton': drawSkeleton(ctx, st, a, p); break;
    case 'imp': drawImp(ctx, st, a, p); break;
    case 'wraith': drawWraith(ctx, st, a, p); break;
    case 'ogre': drawOgre(ctx, st, a, p); break;
    case 'lich': drawLich(ctx, st, a, p); break;
    case 'queen': drawQueen(ctx, st, a, p); break;
    case 'demon': drawDemon(ctx, st, a, p); break;
    default: drawKnight(ctx, st, a, p); break;
  }

  if (a.frozen > 0) {
    ctx.fillStyle = 'rgba(150,215,255,0.26)';
    ctx.beginPath(); ctx.ellipse(0, -44, 28, 52, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(205,240,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    // tinh thể băng
    ctx.fillStyle = 'rgba(220,245,255,0.75)';
    for (let i = 0; i < 3; i++) {
      const ax = -18 + i * 16, ay = -20 - i * 12;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 5, ay - 12); ctx.lineTo(ax + 10, ay); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

interface MPose { ox: number; oy: number; lean: number; swing: number; fade: number; squash: number; walk: number }

function solveMonsterPose(kind: string, a: AnimState): MPose {
  const t = a.t + a.seed;
  const flying = kind === 'bat' || kind === 'wraith' || kind === 'lich';
  const p: MPose = {
    ox: 0, oy: flying ? Math.sin(t * 2.4) * 4 : 0,
    lean: 0, swing: 0, fade: 1, squash: 1,
    walk: a.gait * TAU,
  };
  const q = clamp(a.actionT, 0, 1);
  if (a.action === 'attack') {
    // lấy đà chậm rồi bổ nhanh — tạo tín hiệu đọc được cho người chơi
    if (q < 0.42) {
      const k = easeBackIn(q / 0.42);
      p.swing = -k;
      p.ox = 7 * k;
      p.lean = 0.16 * k;
    } else if (q < 0.58) {
      const k = easeOutQuint((q - 0.42) / 0.16);
      p.swing = lerp(-1, 1, k);
      p.ox = lerp(7, -13, k);
      p.lean = lerp(0.16, -0.24, k);
      p.squash = 1 + 0.07 * Math.sin(k * Math.PI);
    } else {
      const k = easeInOutCubic((q - 0.58) / 0.42);
      p.swing = 1 - k;
      p.ox = -13 * (1 - k);
      p.lean = -0.24 * (1 - k);
    }
  } else if (a.action === 'hurt') {
    const k = 1 - q;
    p.ox = 10 * k;
    p.lean = 0.2 * k;
    p.squash = 1 - 0.07 * k;
  } else if (a.action === 'dead') {
    const k = easeInQuad(q);
    p.lean = 1.5 * k;
    p.ox = 12 * k;
    p.fade = 1 - k;
    p.squash = 1 - 0.2 * k;
  } else if (a.action === 'spawn') {
    p.fade = clamp(q * 2, 0, 1);
    p.oy -= (1 - easeOutCubic(q)) * 30;
  }
  if (a.frozen > 0) { p.swing = 0; p.ox = 0; }
  return p;
}

function bodyGrad(ctx: CanvasRenderingContext2D, tint: string, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(-16, y0, 16, y1);
  g.addColorStop(0, lighten(tint, 0.22));
  g.addColorStop(0.5, tint);
  g.addColorStop(1, darken(tint, 0.38));
  return g;
}

function monsterEyes(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sep: number, r: number,
  eye: string, glowing = true,
): void {
  for (const sd of [-1, 1]) {
    if (glowing) glow(ctx, cx + sd * sep, cy, r, eye, 0.8);
    ellipse(ctx, cx + sd * sep, cy, r, r * 1.18, 0, '#fdf6e6');
    ellipse(ctx, cx + sd * sep - r * 0.24, cy + r * 0.1, r * 0.56, r * 0.72, 0, eye);
    ellipse(ctx, cx + sd * sep - r * 0.3, cy + r * 0.15, r * 0.27, r * 0.4, 0, '#150f1c');
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const t = a.t + a.seed;
  // nhún nảy: dẹt khi chạm đất, kéo dài khi bật lên
  const j = Math.sin(p.walk);
  const sq = (1 + j * 0.16) * p.squash;
  const w = 26 / sq, h = 26 * sq;
  const y = -h + Math.max(0, j) * 6;
  ctx.save();
  ctx.translate(0, y + h);
  ctx.rotate(p.lean);
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 1.08, -h * 1.5, w * 1.08, -h * 1.5, w, 0);
  ctx.quadraticCurveTo(0, h * 0.22, -w, 0);
  ctx.closePath();
  const g = ctx.createRadialGradient(-w * 0.35, -h * 0.85, 2, 0, -h * 0.4, w * 1.7);
  g.addColorStop(0, lighten(st.tint, 0.45));
  g.addColorStop(0.5, st.tint);
  g.addColorStop(1, darken(st.tint, 0.35));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  // điểm sáng bề mặt
  ctx.globalAlpha = 0.55;
  ellipse(ctx, -w * 0.4, -h * 0.95, w * 0.3, h * 0.16, -0.4, '#ffffff');
  ctx.globalAlpha = 1;
  // nhân bên trong
  ctx.globalAlpha = 0.35;
  ellipse(ctx, w * 0.12, -h * 0.35, w * 0.3, h * 0.22, 0.3, darken(st.tint, 0.5));
  ctx.globalAlpha = 1;
  monsterEyes(ctx, -2, -h * 0.85, 7, 4.2, st.eye);
  ctx.strokeStyle = '#241224'; ctx.lineWidth = 2;
  ctx.beginPath();
  if (p.swing > 0.2) { ctx.ellipse(-2, -h * 0.44, 5, 4 + p.swing * 2, 0, 0, TAU); ctx.fillStyle = '#4e1626'; ctx.fill(); }
  else ctx.arc(-2, -h * 0.5, 5.6, 0.34, Math.PI - 0.34);
  ctx.stroke();
  void t;
  ctx.restore();
}

function drawBat(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const t = a.t + a.seed;
  const flap = Math.sin(t * 15) * 0.85 + p.swing * 0.5;
  const cy = -58 + p.oy;
  const dark = darken(st.tint, 0.42);
  ctx.save();
  ctx.rotate(p.lean);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * 8, cy - 2);
    ctx.rotate(sd * flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sd * 16, -14, sd * 30, -8);
    ctx.quadraticCurveTo(sd * 22, -2, sd * 25, 5);
    ctx.quadraticCurveTo(sd * 17, 1, sd * 18, 9);
    ctx.quadraticCurveTo(sd * 10, 4, sd * 6, 8);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -10, sd * 28, 8);
    g.addColorStop(0, st.tint);
    g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    // gân cánh
    ctx.strokeStyle = alpha(darken(st.tint, 0.6), 0.9); ctx.lineWidth = 1.2;
    for (const k of [0.4, 0.72]) {
      ctx.beginPath(); ctx.moveTo(sd * 3, 1); ctx.lineTo(sd * 28 * k, -8 + k * 14); ctx.stroke();
    }
    ctx.restore();
  }
  // thân
  ellipse(ctx, 0, cy, 12, 13.5, 0, bodyGrad(ctx, st.tint, cy - 12, cy + 12), INK, 2.4);
  // lông ngực
  ctx.globalAlpha = 0.5;
  ellipse(ctx, -1, cy + 4, 6.5, 6, 0, lighten(st.tint, 0.35));
  ctx.globalAlpha = 1;
  // tai
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 6, cy - 9);
    ctx.lineTo(sd * 10, cy - 22);
    ctx.lineTo(sd * 1, cy - 11);
    ctx.closePath();
    ctx.fillStyle = sd < 0 ? st.tint : dark;
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
  }
  monsterEyes(ctx, -1, cy - 2, 5, 3.4, st.eye);
  // răng nanh
  if (p.swing > 0.15) {
    ctx.fillStyle = '#fff8e0';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 3, cy + 5); ctx.lineTo(sd * 1.6, cy + 11); ctx.lineTo(sd * 0.2, cy + 5);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function drawSkeleton(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const bone = '#ddd6c4';
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.lean);
  ctx.scale(1 / p.squash, p.squash);
  ctx.translate(0, -HIP_Y);
  const th = p.walk;
  const amp = Math.abs(a.vx) > 4 ? 0.5 : 0.1;
  // chân
  for (const sd of [-1, 1]) {
    const hip = amp * Math.sin(th + (sd > 0 ? Math.PI : 0));
    chain(ctx, { x: sd * 4.6, y: HIP_Y }, hip, THIGH, 0.1 + Math.max(0, -hip) * 0.6, SHIN,
      6.5, 5.5, sd < 0 ? darken(bone, 0.22) : bone);
  }
  // xương chậu + cột sống
  seg(ctx, -5.5, HIP_Y, 5.5, HIP_Y, 6, darken(bone, 0.14));
  seg(ctx, 0, HIP_Y - 1, 0, SHO_Y + 4, 5, bone);
  // lồng ngực
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, SHO_Y + 2);
  ctx.quadraticCurveTo(-13, HIP_Y - 12, -6, HIP_Y - 6);
  ctx.lineTo(6, HIP_Y - 6);
  ctx.quadraticCurveTo(13, HIP_Y - 12, 11, SHO_Y + 2);
  ctx.closePath();
  ctx.fillStyle = bodyGrad(ctx, bone, SHO_Y, HIP_Y); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = darken(bone, 0.45); ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    const y = SHO_Y + 8 + i * 7;
    ctx.beginPath(); ctx.moveTo(-9 + i * 0.8, y); ctx.lineTo(9 - i * 0.8, y); ctx.stroke();
  }
  // tay trái đỡ
  chain(ctx, { x: -SHO_X, y: SHO_Y }, 0.5 + Math.sin(th) * amp, UPPER, 0.4, FORE, 6, 5, darken(bone, 0.2));
  // tay phải cầm kiếm
  const swing = p.swing > 0 ? lerp(-2.1, 0.7, p.swing) : -0.35 + Math.sin(th + 1) * amp * 0.5;
  const arm = chain(ctx, { x: SHO_X, y: SHO_Y }, swing, UPPER, 0.35, FORE, 6.5, 5.5, bone);
  ctx.save();
  ctx.translate(arm.end.x, arm.end.y);
  ctx.rotate(swing + 0.35);
  ctx.beginPath();
  ctx.moveTo(-3, -2); ctx.lineTo(-2, -30); ctx.lineTo(0, -35); ctx.lineTo(2, -30); ctx.lineTo(3, -2);
  ctx.closePath();
  ctx.fillStyle = metalGrad(ctx, 32, st.eye); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
  // sọ
  const cy = HEAD_Y + 2;
  ellipse(ctx, 0, cy, 12.5, 12, 0, bodyGrad(ctx, '#eae3d2', cy - 12, cy + 12), INK, 2.4);
  ctx.fillStyle = darken(bone, 0.1);
  ctx.beginPath(); ctx.roundRect(-6, cy + 7, 12, 7, 2.5); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.strokeStyle = darken(bone, 0.5); ctx.lineWidth = 1.1;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 3.4, cy + 7); ctx.lineTo(i * 3.4, cy + 13); ctx.stroke(); }
  // hốc mắt cháy lửa
  for (const sd of [-1, 1]) {
    ellipse(ctx, sd * 5, cy - 1.5, 3.6, 4.2, 0, '#140f18');
    glow(ctx, sd * 5 - 0.5, cy - 1, 2.6, st.eye, 1);
    ellipse(ctx, sd * 5 - 0.5, cy - 1, 1.8, 2.2, 0, st.eye);
  }
  ctx.restore();
}

function drawImp(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const t = a.t + a.seed;
  const dark = darken(st.tint, 0.4);
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.lean);
  ctx.scale(1 / p.squash, p.squash);
  ctx.translate(0, -HIP_Y);
  const th = p.walk;
  const amp = Math.abs(a.vx) > 4 ? 0.55 : 0.12;
  // cánh
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * 10, SHO_Y - 2);
    ctx.rotate(sd * (0.5 + Math.sin(t * 11) * 0.28));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sd * 13, -13, sd * 24, -6);
    ctx.quadraticCurveTo(sd * 16, -1, sd * 18, 7);
    ctx.quadraticCurveTo(sd * 8, 2, 0, 5);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
  }
  for (const sd of [-1, 1]) {
    const hip = amp * Math.sin(th + (sd > 0 ? Math.PI : 0));
    chain(ctx, { x: sd * 4.5, y: HIP_Y }, hip, THIGH * 0.8, 0.2 + Math.max(0, -hip) * 0.5, SHIN * 0.8,
      8, 6.5, sd < 0 ? dark : st.tint);
  }
  // đuôi
  ctx.strokeStyle = dark; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, HIP_Y + 2);
  ctx.quadraticCurveTo(-18, HIP_Y + 8 + Math.sin(t * 4) * 4, -22, HIP_Y - 8 + Math.sin(t * 4) * 6);
  ctx.stroke();
  // thân
  ctx.beginPath();
  ctx.moveTo(-12, SHO_Y);
  ctx.quadraticCurveTo(-14, HIP_Y - 6, -8, HIP_Y + 2);
  ctx.quadraticCurveTo(0, HIP_Y + 6, 8, HIP_Y + 2);
  ctx.quadraticCurveTo(14, HIP_Y - 6, 12, SHO_Y);
  ctx.quadraticCurveTo(0, SHO_Y - 6, -12, SHO_Y);
  ctx.closePath();
  ctx.fillStyle = bodyGrad(ctx, st.tint, SHO_Y, HIP_Y); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
  // tay vuốt
  for (const sd of [-1, 1]) {
    const sw = sd > 0 && p.swing > 0 ? lerp(-1.9, 0.9, p.swing) : 0.4 + Math.sin(th + sd) * amp * 0.4;
    const arm = chain(ctx, { x: sd * 9, y: SHO_Y + 2 }, sw, UPPER * 0.85, 0.4, FORE * 0.8,
      7, 5.5, sd < 0 ? dark : st.tint);
    ctx.strokeStyle = '#f2ead6'; ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(arm.end.x, arm.end.y);
      ctx.lineTo(arm.end.x + Math.sin(sw + 0.4 + i * 0.4) * 6, arm.end.y + Math.cos(sw + 0.4 + i * 0.4) * 6);
      ctx.stroke();
    }
  }
  // đầu
  const cy = HEAD_Y + 4;
  ellipse(ctx, 0, cy, 12, 11.5, 0, bodyGrad(ctx, st.tint, cy - 11, cy + 11), INK, 2.4);
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 6, cy - 8);
    ctx.quadraticCurveTo(sd * 13, cy - 15, sd * 10, cy - 22);
    ctx.quadraticCurveTo(sd * 8, cy - 14, sd * 2, cy - 10);
    ctx.closePath();
    ctx.fillStyle = '#e6ded0'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  }
  monsterEyes(ctx, -1, cy - 1, 5, 3.6, st.eye);
  ctx.strokeStyle = '#3a1018'; ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (p.swing > 0.2) { ctx.ellipse(-1, cy + 6, 4.4, 3 + p.swing * 2.6, 0, 0, TAU); ctx.fillStyle = '#4e1220'; ctx.fill(); }
  else ctx.arc(-1, cy + 4, 4.6, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
}

function drawWraith(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const t = a.t + a.seed;
  const cy = -62 + p.oy;
  ctx.save();
  ctx.rotate(p.lean * 0.6);
  // vạt áo bay
  ctx.beginPath();
  ctx.moveTo(-19, cy + 2);
  const w1 = Math.sin(t * 2.6) * 5;
  const w2 = Math.sin(t * 2.6 + 1.7) * 5;
  ctx.quadraticCurveTo(-24 + w1, cy + 30, -13 + w1 * 1.4, cy + 54);
  ctx.quadraticCurveTo(-6, cy + 38, -2 + w2 * 0.6, cy + 58);
  ctx.quadraticCurveTo(4, cy + 38, 11 + w2, cy + 52);
  ctx.quadraticCurveTo(22 + w2 * 0.5, cy + 28, 19, cy + 2);
  ctx.quadraticCurveTo(0, cy - 24, -19, cy + 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, cy - 22, 0, cy + 56);
  g.addColorStop(0, lighten(st.tint, 0.2));
  g.addColorStop(0.55, st.tint);
  g.addColorStop(1, alpha(darken(st.tint, 0.6), 0.15));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = alpha(INK, 0.8); ctx.lineWidth = 2.2; ctx.stroke();
  // mũ trùm tối
  ctx.beginPath();
  ctx.ellipse(0, cy - 6, 13, 15, 0, 0, TAU);
  ctx.fillStyle = darken(st.tint, 0.62); ctx.fill();
  // mắt phát sáng trong bóng tối
  for (const sd of [-1, 1]) {
    glow(ctx, sd * 5, cy - 7, 4, st.eye, 1.1);
    ellipse(ctx, sd * 5, cy - 7, 2.6 + p.swing * 0.8, 4.4, sd * 0.2, st.eye);
  }
  // linh hồn bay quanh
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 3; i++) {
    const ang = t * 1.4 + (i * TAU) / 3;
    ellipse(ctx, Math.cos(ang) * 22, cy + 10 + Math.sin(ang * 1.6) * 12, 2.4, 2.4, 0, st.eye);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawOgre(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const dark = darken(st.tint, 0.4);
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.lean);
  ctx.scale(1 / p.squash, p.squash);
  ctx.translate(0, -HIP_Y);
  const th = p.walk;
  const amp = Math.abs(a.vx) > 4 ? 0.42 : 0.08;
  for (const sd of [-1, 1]) {
    const hip = amp * Math.sin(th + (sd > 0 ? Math.PI : 0));
    chain(ctx, { x: sd * 9, y: HIP_Y + 4 }, hip, THIGH * 0.75, 0.16, SHIN * 0.75,
      15, 12, sd < 0 ? dark : st.tint);
  }
  // thân bè
  ctx.beginPath();
  ctx.moveTo(-22, SHO_Y + 4);
  ctx.quadraticCurveTo(-27, HIP_Y - 10, -16, HIP_Y + 6);
  ctx.quadraticCurveTo(0, HIP_Y + 12, 16, HIP_Y + 6);
  ctx.quadraticCurveTo(27, HIP_Y - 10, 22, SHO_Y + 4);
  ctx.quadraticCurveTo(0, SHO_Y - 4, -22, SHO_Y + 4);
  ctx.closePath();
  ctx.fillStyle = bodyGrad(ctx, st.tint, SHO_Y, HIP_Y); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
  // bụng
  ctx.globalAlpha = 0.45;
  ellipse(ctx, 2, HIP_Y - 10, 14, 12, 0, lighten(st.tint, 0.32));
  ctx.globalAlpha = 1;
  // dây đai
  ctx.strokeStyle = dark; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-20, SHO_Y + 12); ctx.lineTo(16, HIP_Y - 4); ctx.stroke();
  // tay trái
  chain(ctx, { x: -18, y: SHO_Y + 6 }, 0.45 + Math.sin(th) * amp, UPPER, 0.3, FORE, 12, 10, dark);
  // tay phải + chuỳ
  const sw = p.swing > 0 ? lerp(-2.0, 0.8, p.swing) : -0.25 + Math.sin(th + 1) * amp * 0.6;
  const arm = chain(ctx, { x: 18, y: SHO_Y + 6 }, sw, UPPER, 0.25, FORE, 13, 11, st.tint);
  ctx.save();
  ctx.translate(arm.end.x, arm.end.y);
  ctx.rotate(sw + 0.25);
  ctx.fillStyle = '#6d4a2c';
  ctx.beginPath(); ctx.roundRect(-3.4, -34, 6.8, 42, 3); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  ellipse(ctx, 0, -40, 12, 14, 0, bodyGrad(ctx, '#7d6a52', -54, -26), INK, 2.4);
  ctx.fillStyle = '#cfc6b2';
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * TAU + 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 9, -40 + Math.sin(ang) * 11);
    ctx.lineTo(Math.cos(ang) * 16, -40 + Math.sin(ang) * 19);
    ctx.lineTo(Math.cos(ang + 0.4) * 9, -40 + Math.sin(ang + 0.4) * 11);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // đầu
  const cy = HEAD_Y + 8;
  ellipse(ctx, 0, cy, 15, 14, 0, bodyGrad(ctx, st.tint, cy - 14, cy + 14), INK, 2.6);
  ctx.fillStyle = '#efe6d2';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 5, cy + 8); ctx.lineTo(sd * 7.5, cy - 4); ctx.lineTo(sd * 10, cy + 8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  }
  monsterEyes(ctx, -1, cy - 3, 6, 3.8, st.eye);
  ctx.strokeStyle = '#3a1018'; ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (p.swing > 0.2) { ctx.ellipse(-1, cy + 7, 6, 4 + p.swing * 3, 0, 0, TAU); ctx.fillStyle = '#4e1220'; ctx.fill(); }
  else ctx.arc(-1, cy + 5, 6, 0.35, Math.PI - 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawKnight(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const dark = darken(st.tint, 0.42);
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.lean);
  ctx.scale(1 / p.squash, p.squash);
  ctx.translate(0, -HIP_Y);
  const th = p.walk;
  const amp = Math.abs(a.vx) > 4 ? 0.45 : 0.08;
  // áo choàng
  ctx.beginPath();
  ctx.moveTo(-13, SHO_Y);
  ctx.quadraticCurveTo(-26 - Math.sin(a.t * 3) * 3, HIP_Y, -19, HIP_Y + 30);
  ctx.lineTo(6, HIP_Y + 26);
  ctx.quadraticCurveTo(14, HIP_Y - 6, 12, SHO_Y);
  ctx.closePath();
  ctx.fillStyle = darken('#7a1024', 0.15); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  for (const sd of [-1, 1]) {
    const hip = amp * Math.sin(th + (sd > 0 ? Math.PI : 0));
    chain(ctx, { x: sd * 6, y: HIP_Y }, hip, THIGH, 0.14, SHIN, 11, 9.5, sd < 0 ? dark : st.tint);
  }
  // giáp thân
  ctx.beginPath();
  ctx.moveTo(-16, SHO_Y - 2);
  ctx.quadraticCurveTo(-19, HIP_Y - 10, -11, HIP_Y + 3);
  ctx.quadraticCurveTo(0, HIP_Y + 8, 11, HIP_Y + 3);
  ctx.quadraticCurveTo(19, HIP_Y - 10, 16, SHO_Y - 2);
  ctx.quadraticCurveTo(0, SHO_Y - 8, -16, SHO_Y - 2);
  ctx.closePath();
  ctx.fillStyle = bodyGrad(ctx, st.tint, SHO_Y, HIP_Y); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = alpha(st.eye, 0.5); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, SHO_Y + 2); ctx.lineTo(0, HIP_Y); ctx.stroke();
  // đệm vai
  for (const sd of [-1, 1]) {
    ellipse(ctx, sd * 17, SHO_Y + 1, 10, 8.5, sd * 0.3, sd < 0 ? dark : lighten(st.tint, 0.1), INK, 2.2);
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(sd * 17, SHO_Y - 6); ctx.lineTo(sd * 22, SHO_Y - 17); ctx.lineTo(sd * 12, SHO_Y - 7);
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  }
  chain(ctx, { x: -14, y: SHO_Y + 4 }, 0.4 + Math.sin(th) * amp, UPPER, 0.3, FORE, 9, 8, dark);
  // đại kiếm
  const sw = p.swing > 0 ? lerp(-2.4, 0.75, p.swing) : -0.45 + Math.sin(th + 1) * amp * 0.5;
  const arm = chain(ctx, { x: 14, y: SHO_Y + 4 }, sw, UPPER, 0.3, FORE, 10, 8.5, st.tint);
  ctx.save();
  ctx.translate(arm.end.x, arm.end.y);
  ctx.rotate(sw + 0.3);
  ctx.fillStyle = '#33261f';
  ctx.beginPath(); ctx.roundRect(-3, -2, 6, 13, 2.4); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.roundRect(-11, -6, 22, 5, 2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -5); ctx.lineTo(-4.4, -48); ctx.lineTo(0, -58); ctx.lineTo(4.4, -48); ctx.lineTo(6, -5);
  ctx.closePath();
  ctx.fillStyle = metalGrad(ctx, 54, st.eye); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.restore();
  // mũ giáp
  const cy = HEAD_Y + 2;
  ellipse(ctx, 0, cy, 13, 13.5, 0, bodyGrad(ctx, st.tint, cy - 13, cy + 13), INK, 2.4);
  ctx.fillStyle = '#100c16';
  ctx.beginPath(); ctx.roundRect(-9, cy - 3, 18, 6, 2); ctx.fill();
  for (const sd of [-1, 1]) {
    glow(ctx, sd * 4.4, cy, 3, st.eye, 0.9);
    ellipse(ctx, sd * 4.4, cy, 2.6, 1.9, 0, st.eye);
  }
  ctx.fillStyle = '#e8e0d0';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 9, cy - 9);
    ctx.quadraticCurveTo(sd * 20, cy - 18, sd * 16, cy - 30);
    ctx.quadraticCurveTo(sd * 13, cy - 18, sd * 4, cy - 11);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
  }
  ctx.restore();
}

function drawDemon(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const t = a.t + a.seed;
  const dark = darken(st.tint, 0.45);
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.lean);
  ctx.scale(1 / p.squash, p.squash);
  ctx.translate(0, -HIP_Y);
  // cánh lớn
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * 13, SHO_Y - 4);
    ctx.rotate(sd * (0.35 + Math.sin(t * 3.4) * 0.16));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sd * 26, -32, sd * 52, -18);
    ctx.quadraticCurveTo(sd * 38, -8, sd * 44, 8);
    ctx.quadraticCurveTo(sd * 30, -2, sd * 32, 18);
    ctx.quadraticCurveTo(sd * 18, 4, sd * 16, 22);
    ctx.quadraticCurveTo(sd * 8, 6, 0, 8);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -24, sd * 48, 16);
    g.addColorStop(0, mix(st.tint, '#2a0a14', 0.35));
    g.addColorStop(1, '#1a0810');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();
  }
  const th = p.walk;
  const amp = Math.abs(a.vx) > 4 ? 0.45 : 0.08;
  for (const sd of [-1, 1]) {
    const hip = amp * Math.sin(th + (sd > 0 ? Math.PI : 0));
    chain(ctx, { x: sd * 7, y: HIP_Y }, hip, THIGH, 0.16, SHIN, 12, 10, sd < 0 ? dark : st.tint);
  }
  ctx.beginPath();
  ctx.moveTo(-18, SHO_Y - 2);
  ctx.quadraticCurveTo(-22, HIP_Y - 10, -12, HIP_Y + 4);
  ctx.quadraticCurveTo(0, HIP_Y + 9, 12, HIP_Y + 4);
  ctx.quadraticCurveTo(22, HIP_Y - 10, 18, SHO_Y - 2);
  ctx.quadraticCurveTo(0, SHO_Y - 9, -18, SHO_Y - 2);
  ctx.closePath();
  ctx.fillStyle = bodyGrad(ctx, st.tint, SHO_Y, HIP_Y); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  // vết nứt phát sáng trên ngực
  glow(ctx, -2, SHO_Y + 14, 9, st.eye, 0.7);
  ctx.strokeStyle = st.eye; ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-7, SHO_Y + 6); ctx.lineTo(-1, SHO_Y + 15); ctx.lineTo(-5, SHO_Y + 20); ctx.lineTo(3, HIP_Y - 4);
  ctx.stroke();
  chain(ctx, { x: -16, y: SHO_Y + 3 }, 0.45 + Math.sin(th) * amp, UPPER, 0.35, FORE, 10, 8, dark);
  const sw = p.swing > 0 ? lerp(-2.2, 1.0, p.swing) : -0.3 + Math.sin(th + 1) * amp * 0.5;
  const arm = chain(ctx, { x: 16, y: SHO_Y + 3 }, sw, UPPER, 0.35, FORE, 11, 9, st.tint);
  ctx.strokeStyle = '#f2ead6'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(arm.end.x, arm.end.y);
    ctx.lineTo(arm.end.x + Math.sin(sw + 0.35 + i * 0.42) * 11, arm.end.y + Math.cos(sw + 0.35 + i * 0.42) * 11);
    ctx.stroke();
  }
  const cy = HEAD_Y + 2;
  ellipse(ctx, 0, cy, 13.5, 13, 0, bodyGrad(ctx, st.tint, cy - 13, cy + 13), INK, 2.4);
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 8, cy - 8);
    ctx.quadraticCurveTo(sd * 22, cy - 14, sd * 21, cy - 30);
    ctx.quadraticCurveTo(sd * 15, cy - 18, sd * 3, cy - 11);
    ctx.closePath();
    ctx.fillStyle = sd > 0 ? '#3b2028' : '#2a161c'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
  }
  monsterEyes(ctx, -1, cy - 1, 5.5, 3.8, st.eye);
  ctx.fillStyle = '#fff4e0';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 3.2 - 1, cy + 5); ctx.lineTo(i * 3.2 + 0.4, cy + 11 + (i % 2 ? 2 : 0)); ctx.lineTo(i * 3.2 + 1.8, cy + 5);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawQueen(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const t = a.t + a.seed;
  const dark = darken(st.tint, 0.42);
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(p.lean);
  ctx.scale(1 / p.squash, p.squash);
  ctx.translate(0, -HIP_Y);
  // váy dài
  ctx.beginPath();
  ctx.moveTo(-13, HIP_Y - 6);
  ctx.quadraticCurveTo(-30 - Math.sin(t * 2.2) * 3, HIP_Y + 26, -26, 2);
  ctx.quadraticCurveTo(0, 9, 26, 2);
  ctx.quadraticCurveTo(30 + Math.sin(t * 2.2) * 3, HIP_Y + 26, 13, HIP_Y - 6);
  ctx.closePath();
  const gd = ctx.createLinearGradient(0, HIP_Y - 6, 0, 2);
  gd.addColorStop(0, st.tint);
  gd.addColorStop(1, darken(st.tint, 0.55));
  ctx.fillStyle = gd; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = alpha(st.eye, 0.35); ctx.lineWidth = 1.4;
  for (const k of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(k * 10, HIP_Y - 4);
    ctx.quadraticCurveTo(k * 20, HIP_Y + 20, k * 24, 0);
    ctx.stroke();
  }
  // thân
  ctx.beginPath();
  ctx.moveTo(-11, SHO_Y - 2);
  ctx.quadraticCurveTo(-10, HIP_Y - 14, -7, HIP_Y - 4);
  ctx.lineTo(7, HIP_Y - 4);
  ctx.quadraticCurveTo(10, HIP_Y - 14, 11, SHO_Y - 2);
  ctx.quadraticCurveTo(0, SHO_Y - 8, -11, SHO_Y - 2);
  ctx.closePath();
  ctx.fillStyle = bodyGrad(ctx, st.tint, SHO_Y, HIP_Y); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
  // tay
  chain(ctx, { x: -11, y: SHO_Y + 2 }, 0.55 + Math.sin(t * 1.6) * 0.06, UPPER, 0.4, FORE, 7.5, 6, dark);
  const sw = p.swing > 0 ? lerp(-2.3, 0.4, p.swing) : -0.6 + Math.sin(t * 1.6 + 1) * 0.08;
  const arm = chain(ctx, { x: 11, y: SHO_Y + 2 }, sw, UPPER, 0.35, FORE, 8, 6.5, st.tint);
  // trượng
  ctx.save();
  ctx.translate(arm.end.x, arm.end.y);
  ctx.rotate(sw + 0.35);
  ctx.fillStyle = '#4a3050';
  ctx.beginPath(); ctx.roundRect(-2.2, -44, 4.4, 58, 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  glow(ctx, 0, -50, 9, st.eye, 1.2);
  ellipse(ctx, 0, -50, 7, 8.5, 0, st.eye, INK, 1.8);
  ellipse(ctx, -2.2, -52, 2.2, 2.4, -0.3, alpha('#ffffff', 0.8));
  ctx.restore();
  // đầu + mạng che
  const cy = HEAD_Y;
  ellipse(ctx, 0, cy, 12, 12.5, 0, bodyGrad(ctx, lighten(st.tint, 0.35), cy - 12, cy + 12), INK, 2.2);
  ctx.beginPath();
  ctx.moveTo(-12, cy - 2);
  ctx.quadraticCurveTo(-18, cy + 24, -10, cy + 34);
  ctx.lineTo(10, cy + 32);
  ctx.quadraticCurveTo(17, cy + 20, 12, cy - 2);
  ctx.closePath();
  ctx.fillStyle = alpha(darken(st.tint, 0.35), 0.55); ctx.fill();
  monsterEyes(ctx, -1, cy - 1, 5, 3.4, st.eye);
  // vương miện
  ctx.beginPath();
  ctx.moveTo(-10, cy - 9); ctx.lineTo(-11, cy - 20); ctx.lineTo(-5, cy - 14);
  ctx.lineTo(0, cy - 24); ctx.lineTo(5, cy - 14); ctx.lineTo(11, cy - 20); ctx.lineTo(10, cy - 9);
  ctx.closePath();
  const gc = ctx.createLinearGradient(-11, cy - 24, 11, cy - 9);
  gc.addColorStop(0, '#ffe98a'); gc.addColorStop(0.5, '#d8a63c'); gc.addColorStop(1, '#8a5c1e');
  ctx.fillStyle = gc; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.restore();
}

function drawLich(ctx: CanvasRenderingContext2D, st: MonsterStyle, a: AnimState, p: MPose): void {
  const t = a.t + a.seed;
  const cy = HEAD_Y - 4 + p.oy;
  ctx.save();
  ctx.rotate(p.lean * 0.7);
  // áo choàng bay lơ lửng
  ctx.beginPath();
  ctx.moveTo(-20, SHO_Y + p.oy);
  ctx.quadraticCurveTo(-30 + Math.sin(t * 2) * 4, HIP_Y + 10, -20 + Math.sin(t * 2) * 6, 2);
  ctx.quadraticCurveTo(-8, -8, 0, 4);
  ctx.quadraticCurveTo(9, -8, 20 + Math.sin(t * 2 + 1) * 6, 0);
  ctx.quadraticCurveTo(30 + Math.sin(t * 2 + 1) * 4, HIP_Y + 10, 20, SHO_Y + p.oy);
  ctx.quadraticCurveTo(0, SHO_Y - 12 + p.oy, -20, SHO_Y + p.oy);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, SHO_Y - 12, 0, 4);
  g.addColorStop(0, lighten(st.tint, 0.18));
  g.addColorStop(0.6, st.tint);
  g.addColorStop(1, darken(st.tint, 0.6));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
  // dây thắt phát sáng
  ctx.strokeStyle = alpha(st.eye, 0.55); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, SHO_Y + 22); ctx.quadraticCurveTo(0, SHO_Y + 28, 14, SHO_Y + 22); ctx.stroke();
  // tay xương cầm trượng
  const sw = p.swing > 0 ? lerp(-2.2, 0.5, p.swing) : -0.7 + Math.sin(t * 1.4) * 0.1;
  const arm = chain(ctx, { x: 13, y: SHO_Y + 4 + p.oy }, sw, UPPER, 0.35, FORE, 6.5, 5, '#ddd6c4');
  ctx.save();
  ctx.translate(arm.end.x, arm.end.y);
  ctx.rotate(sw + 0.35);
  ctx.fillStyle = '#3a3040';
  ctx.beginPath(); ctx.roundRect(-2.2, -48, 4.4, 62, 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  // vòng sọ trên trượng
  glow(ctx, 0, -56, 10, st.eye, 1.2);
  ellipse(ctx, 0, -56, 8, 7.5, 0, '#e6ded0', INK, 1.8);
  for (const sd of [-1, 1]) ellipse(ctx, sd * 3, -57, 2, 2.4, 0, st.eye);
  ctx.restore();
  // mũ trùm + sọ
  ellipse(ctx, 0, cy, 12, 13, 0, darken(st.tint, 0.3), INK, 2.2);
  ellipse(ctx, 0, cy + 2, 8.5, 9.5, 0, '#141020');
  for (const sd of [-1, 1]) {
    glow(ctx, sd * 4, cy + 1, 3.4, st.eye, 1.1);
    ellipse(ctx, sd * 4, cy + 1, 2.4, 3.2, 0, st.eye);
  }
  // linh hồn quay quanh
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 4; i++) {
    const ang = t * 1.1 + (i * TAU) / 4;
    ellipse(ctx, Math.cos(ang) * 26, cy + 26 + Math.sin(ang * 1.3) * 10, 2.6, 2.6, 0, st.eye);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ============ CHÂN DUNG (dùng cho UI) ============
export function renderPortrait(
  canvas: HTMLCanvasElement, look: ChibiLook, t: number, action: AnimState['action'] = 'idle',
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // nền hào quang
  const g = ctx.createRadialGradient(W / 2, H * 0.48, 2, W / 2, H * 0.52, H * 0.62);
  g.addColorStop(0, alpha(look.aura, 0.34 + 0.1 * Math.sin(t * 2.6)));
  g.addColorStop(0.6, alpha(look.aura, 0.08));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // tia sáng phía sau
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.translate(W / 2, H * 0.5);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(TAU / 8);
    ctx.fillStyle = look.aura;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(H * 0.7, -H * 0.05);
    ctx.lineTo(H * 0.7, H * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(W / 2, H * 0.965);
  const s = (H * 0.86) / 104;
  drawHero(ctx, look, {
    t, gait: 0, action, actionT: (t * 0.55) % 1, facing: 1,
    scale: s, hurt: 0, frozen: 0, vx: 0,
    seed: (look.hair.charCodeAt(1) % 7) * 0.7,
  });
  ctx.restore();
  void luma;
}
