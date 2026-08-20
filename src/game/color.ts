// ============ COLOR / LIGHTING UTILITIES ============
// Tất cả phép biến đổi màu đều được ghi nhớ (memoize) vì renderer gọi chúng
// hàng trăm lần mỗi khung hình.

export interface RGB { r: number; g: number; b: number }

const rgbCache = new Map<string, RGB>();
export function toRgb(hex: string): RGB {
  const hit = rgbCache.get(hex);
  if (hit) return hit;
  let out: RGB;
  if (hex.startsWith('#')) {
    const s = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
    const n = parseInt(s.slice(1, 7), 16);
    out = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  } else {
    const m = hex.match(/-?\d+(\.\d+)?/g);
    out = m ? { r: +m[0], g: +m[1], b: +m[2] } : { r: 255, g: 0, b: 255 };
  }
  rgbCache.set(hex, out);
  return out;
}

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
const hx = (v: number): string => clamp255(v).toString(16).padStart(2, '0');

function memo1(fn: (hex: string, amt: number) => string): (hex: string, amt: number) => string {
  const cache = new Map<string, string>();
  return (hex, amt) => {
    const k = `${hex}|${amt}`;
    let v = cache.get(k);
    if (v === undefined) { v = fn(hex, amt); cache.set(k, v); }
    return v;
  };
}

/** Sáng lên bằng cách kéo về phía trắng — giữ được sắc độ (hue) tốt hơn nhân hệ số. */
export const lighten = memo1((hex, amt) => {
  const c = toRgb(hex);
  return `#${hx(c.r + (255 - c.r) * amt)}${hx(c.g + (255 - c.g) * amt)}${hx(c.b + (255 - c.b) * amt)}`;
});

/** Tối đi và ngả lạnh nhẹ — bóng đổ thực tế luôn ám xanh, không phải đen tuyền. */
export const darken = memo1((hex, amt) => {
  const c = toRgb(hex);
  const k = 1 - amt;
  return `#${hx(c.r * k * 0.96)}${hx(c.g * k * 0.98)}${hx(c.b * k + 14 * amt)}`;
});

/** Trộn hai màu theo tỉ lệ t (0 = a, 1 = b). */
export const mix = (() => {
  const cache = new Map<string, string>();
  return (a: string, b: string, t: number): string => {
    const k = `${a}|${b}|${t.toFixed(3)}`;
    let v = cache.get(k);
    if (v === undefined) {
      const ca = toRgb(a); const cb = toRgb(b);
      v = `#${hx(ca.r + (cb.r - ca.r) * t)}${hx(ca.g + (cb.g - ca.g) * t)}${hx(ca.b + (cb.b - ca.b) * t)}`;
      cache.set(k, v);
    }
    return v;
  };
})();

/** Màu kèm alpha — dùng cho hào quang, khói, ánh sáng. */
export const alpha = (() => {
  const cache = new Map<string, string>();
  return (hex: string, a: number): string => {
    const k = `${hex}|${a.toFixed(3)}`;
    let v = cache.get(k);
    if (v === undefined) {
      const c = toRgb(hex);
      v = `rgba(${c.r},${c.g},${c.b},${a})`;
      cache.set(k, v);
    }
    return v;
  };
})();

/** Độ sáng cảm nhận (0..1) — dùng để quyết định viền sáng hay tối. */
export function luma(hex: string): number {
  const c = toRgb(hex);
  return (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) / 255;
}

/** Màu viền nhân vật: tối theo tông màu gốc thay vì đen tuyền → mềm mắt hơn. */
export const outlineOf = memo1((hex, amt) => {
  const c = toRgb(hex);
  return `#${hx(c.r * amt + 10)}${hx(c.g * amt + 7)}${hx(c.b * amt + 16)}`;
});
export const INK = '#0b0812';
