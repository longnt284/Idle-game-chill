// ============ SCENE / ENVIRONMENT RENDERER ============
// Bối cảnh dựng hoàn toàn bằng thủ tục (procedural) nên không phụ thuộc ảnh
// tải từ mạng: 9 lớp parallax, ánh sáng đuốc động, sương mù, thời tiết riêng
// từng vùng, và phản chiếu dưới sàn.

import { alpha, darken, lighten, mix } from './color';

const TAU = Math.PI * 2;

export interface ZoneTheme {
  name: string;
  sky: [string, string, string];
  fog: string;
  far: string;
  mid: string;
  near: string;
  ground: string;
  groundLine: string;
  accent: string;
  torch: string;
  eye: string;
  /** Hạt môi trường đặc trưng của vùng. */
  weather: 'ember' | 'ash' | 'snow' | 'spore' | 'rain' | 'dust' | 'blood';
  /** 0 = không có mặt trăng, 1 = trăng máu lớn. */
  moon: number;
  moonColor: string;
}

/** 10 vùng cho 100 tầng — cứ 10 tầng đổi cảnh một lần. */
export const ZONES: ZoneTheme[] = [
  {
    name: 'Vực Xương Trắng', sky: ['#0a0812', '#170f1c', '#241627'], fog: '#2a1c30',
    far: '#191024', mid: '#241a2e', near: '#160f1e', ground: '#1a1422', groundLine: '#3d3050',
    accent: '#ff9a3c', torch: '#ff9a3c', eye: '#ffd23c', weather: 'ember', moon: 0.9, moonColor: '#e8643c',
  },
  {
    name: 'Hầm Máu', sky: ['#0e070c', '#260c14', '#3a1018'], fog: '#3d1420',
    far: '#200a12', mid: '#2f1018', near: '#1a0810', ground: '#1e1016', groundLine: '#5a2030',
    accent: '#ff3b52', torch: '#ff5a3c', eye: '#ff3b52', weather: 'blood', moon: 1, moonColor: '#c2172f',
  },
  {
    name: 'Vực Trời', sky: ['#070a16', '#101a34', '#1c2a4a'], fog: '#22304e',
    far: '#0e1628', mid: '#182444', near: '#0c1220', ground: '#131a2a', groundLine: '#31456e',
    accent: '#8cdcff', torch: '#7ab8ff', eye: '#8cdcff', weather: 'dust', moon: 0.6, moonColor: '#9ec8ff',
  },
  {
    name: 'Băng Đen', sky: ['#060c10', '#0e1e26', '#16323c'], fog: '#1e3a44',
    far: '#0a1a20', mid: '#123038', near: '#08161c', ground: '#101e24', groundLine: '#2f5a66',
    accent: '#7dffe0', torch: '#8ee8ff', eye: '#7dffe0', weather: 'snow', moon: 0.7, moonColor: '#cfeeff',
  },
  {
    name: 'Lửa Tàn', sky: ['#120704', '#2c1006', '#48200a'], fog: '#4a2210',
    far: '#220e06', mid: '#38180a', near: '#1a0a04', ground: '#22120a', groundLine: '#6e3618',
    accent: '#ff7a1e', torch: '#ffb43c', eye: '#ffb43c', weather: 'ash', moon: 0.5, moonColor: '#ff8a3c',
  },
  {
    name: 'Đầm Dạ Quang', sky: ['#060e0a', '#0e2418', '#153a24'], fog: '#1c4028',
    far: '#0a1c12', mid: '#12301e', near: '#07160e', ground: '#0e1e16', groundLine: '#2a6642',
    accent: '#8dff9a', torch: '#7dffc0', eye: '#8dff9a', weather: 'spore', moon: 0.4, moonColor: '#a8ffc8',
  },
  {
    name: 'Trăng Máu', sky: ['#0c060e', '#221024', '#3a1832'], fog: '#3c1e3a',
    far: '#180a1a', mid: '#2c1430', near: '#120814', ground: '#1a1020', groundLine: '#562a58',
    accent: '#ff4fd8', torch: '#ff6ad0', eye: '#ff4fd8', weather: 'blood', moon: 1, moonColor: '#ff3b6e',
  },
  {
    name: 'Vườn Tượng', sky: ['#0a0a10', '#1a1c26', '#2c303e'], fog: '#333848',
    far: '#15171f', mid: '#252a36', near: '#101218', ground: '#181a22', groundLine: '#454b60',
    accent: '#c9b8ff', torch: '#b8a8ff', eye: '#c9b8ff', weather: 'rain', moon: 0.35, moonColor: '#d8d0f0',
  },
  {
    name: 'Ngai Hư Không', sky: ['#08060e', '#160e22', '#241638'], fog: '#2c1c44',
    far: '#120a1e', mid: '#1e1230', near: '#0c0716', ground: '#151022', groundLine: '#41306a',
    accent: '#a78bfa', torch: '#9a7aff', eye: '#c9a8ff', weather: 'dust', moon: 0.8, moonColor: '#b8a0ff',
  },
  {
    name: 'Hỗn Mang', sky: ['#0a0406', '#20080e', '#38101c'], fog: '#40161e',
    far: '#1a060a', mid: '#2e0c14', near: '#140406', ground: '#1c0a10', groundLine: '#6a1c2e',
    accent: '#ffd23c', torch: '#ffd23c', eye: '#ffea8a', weather: 'ember', moon: 1, moonColor: '#ffcf3c',
  },
];

export function zoneOf(floorIdx: number): ZoneTheme {
  return ZONES[Math.floor(floorIdx / 10) % ZONES.length];
}

// ---------- nhiễu tất định ----------
/** Hash 1 chiều → [0,1). Giữ chi tiết cảnh ổn định qua từng khung hình. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export interface SceneParams {
  w: number; h: number;
  ground: number;
  scroll: number;
  t: number;
  zone: ZoneTheme;
  /** 0..1 — mức "nóng" của trận đấu (boss / combo cao) làm cảnh rực lên. */
  intensity: number;
}

// ---------- 1. bầu trời + mặt trăng ----------
function drawSky(ctx: CanvasRenderingContext2D, s: SceneParams): void {
  const { w, h, zone } = s;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, zone.sky[0]);
  g.addColorStop(0.55, zone.sky[1]);
  g.addColorStop(1, zone.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (zone.moon > 0.05) {
    const mx = w * 0.74 - (s.scroll * 0.01) % (w * 1.4);
    const my = h * 0.2;
    const r = 40 + zone.moon * 26;
    // quầng sáng
    const halo = ctx.createRadialGradient(mx, my, r * 0.5, mx, my, r * 4.4);
    halo.addColorStop(0, alpha(zone.moonColor, 0.34 * zone.moon));
    halo.addColorStop(0.35, alpha(zone.moonColor, 0.1 * zone.moon));
    halo.addColorStop(1, alpha(zone.moonColor, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(mx, my, r * 4.4, 0, TAU); ctx.fill();
    // đĩa trăng
    const disc = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, 2, mx, my, r);
    disc.addColorStop(0, lighten(zone.moonColor, 0.4));
    disc.addColorStop(0.7, zone.moonColor);
    disc.addColorStop(1, darken(zone.moonColor, 0.45));
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill();
    // miệng núi lửa
    ctx.fillStyle = alpha(darken(zone.moonColor, 0.5), 0.35);
    for (let i = 0; i < 5; i++) {
      const a = hash(i * 3.3) * TAU;
      const d = hash(i * 7.1) * r * 0.62;
      ctx.beginPath();
      ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, 3 + hash(i * 11.7) * 7, 0, TAU);
      ctx.fill();
    }
    // vành nguyệt thực
    if (zone.moon > 0.85) {
      ctx.strokeStyle = alpha('#ffffff', 0.25);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, r + 4, 0, TAU); ctx.stroke();
    }
  }

  // sao / tro bay xa
  ctx.fillStyle = alpha('#ffffff', 0.5);
  const so = (s.scroll * 0.02) % w;
  for (let i = 0; i < 46; i++) {
    const x = (hash(i) * w * 2 - so) % w;
    const y = hash(i + 90) * s.ground * 0.55;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(s.t * (0.6 + hash(i + 40)) + i));
    ctx.globalAlpha = tw * 0.4;
    ctx.fillRect(x < 0 ? x + w : x, y, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
}

// ---------- 2. dãy núi/tàn tích xa ----------
function drawFarRange(ctx: CanvasRenderingContext2D, s: SceneParams): void {
  const { w, zone } = s;
  const base = s.ground - 40;
  const off = (s.scroll * 0.06) % 400;
  ctx.fillStyle = zone.far;
  ctx.beginPath();
  ctx.moveTo(-off - 400, base);
  for (let x = -400; x <= w + 800; x += 50) {
    const i = Math.floor((x + off) / 50);
    const hgt = 70 + hash(i * 1.7) * 130 + Math.sin(i * 0.7) * 26;
    ctx.lineTo(x - off, base - hgt);
    ctx.lineTo(x - off + 25, base - hgt * (0.55 + hash(i * 5.5) * 0.3));
  }
  ctx.lineTo(w + 800, base);
  ctx.closePath();
  ctx.fill();
  // sương chân núi
  const g = ctx.createLinearGradient(0, base - 120, 0, base + 10);
  g.addColorStop(0, alpha(zone.fog, 0));
  g.addColorStop(1, alpha(zone.fog, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, base - 120, w, 130);
}

// ---------- 3. vòm cung trung cảnh ----------
function drawMidArches(ctx: CanvasRenderingContext2D, s: SceneParams): void {
  const { w, zone } = s;
  const base = s.ground;
  const off = (s.scroll * 0.18) % 300;
  ctx.fillStyle = zone.mid;
  for (let k = -1; k * 300 - off < w + 300; k++) {
    const x = k * 300 - off;
    const i = Math.floor(k + s.scroll / 300);
    const hgt = 190 + hash(i * 2.9) * 90;
    const wide = 96 + hash(i * 4.1) * 40;
    // hai trụ
    ctx.fillRect(x, base - hgt, 20, hgt);
    ctx.fillRect(x + wide, base - hgt, 20, hgt);
    // vòm nối
    ctx.beginPath();
    ctx.moveTo(x, base - hgt);
    ctx.quadraticCurveTo(x + wide / 2 + 10, base - hgt - 58, x + wide + 20, base - hgt);
    ctx.lineTo(x + wide + 20, base - hgt + 16);
    ctx.quadraticCurveTo(x + wide / 2 + 10, base - hgt - 32, x, base - hgt + 16);
    ctx.closePath();
    ctx.fill();
    // ô cửa sổ phát sáng
    if (hash(i * 8.3) > 0.55) {
      ctx.fillStyle = alpha(zone.torch, 0.16 + 0.06 * Math.sin(s.t * 2 + i));
      ctx.fillRect(x + wide * 0.3, base - hgt * 0.7, 18, 30);
      ctx.fillStyle = zone.mid;
    }
  }
  const g = ctx.createLinearGradient(0, base - 260, 0, base);
  g.addColorStop(0, alpha(zone.fog, 0.05));
  g.addColorStop(1, alpha(zone.fog, 0.42));
  ctx.fillStyle = g;
  ctx.fillRect(0, base - 260, w, 260);
}

// ---------- 4. dải sương trôi ----------
function drawFogBands(ctx: CanvasRenderingContext2D, s: SceneParams): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const y = s.ground - 60 - i * 52;
    const speed = 0.05 + i * 0.035;
    const off = (s.scroll * speed + s.t * (6 + i * 4)) % (s.w + 400);
    const g = ctx.createLinearGradient(0, y - 34, 0, y + 34);
    g.addColorStop(0, alpha(s.zone.fog, 0));
    g.addColorStop(0.5, alpha(s.zone.fog, 0.16 - i * 0.035));
    g.addColorStop(1, alpha(s.zone.fog, 0));
    ctx.fillStyle = g;
    for (let k = -1; k < 3; k++) {
      const x = k * (s.w + 400) - off;
      ctx.beginPath();
      ctx.ellipse(x + s.w * 0.5, y + Math.sin(s.t * 0.4 + i) * 6, s.w * 0.55, 30, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- 5. trụ gần + đuốc ----------
interface TorchLight { x: number; y: number; r: number; color: string; power: number }

function drawNearPillars(ctx: CanvasRenderingContext2D, s: SceneParams, lights: TorchLight[]): void {
  const { w, zone } = s;
  const base = s.ground;
  const off = (s.scroll * 0.52) % 260;
  for (let k = -1; k * 260 - off < w + 260; k++) {
    const x = k * 260 - off;
    const i = Math.floor(k + s.scroll / 260);
    const pw = 40;
    const g = ctx.createLinearGradient(x, 0, x + pw, 0);
    g.addColorStop(0, darken(zone.near, 0.3));
    g.addColorStop(0.4, zone.near);
    g.addColorStop(1, darken(zone.near, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(x, 48, pw, base - 48);
    // đầu và chân trụ
    ctx.fillStyle = darken(zone.near, 0.18);
    ctx.fillRect(x - 8, 40, pw + 16, 18);
    ctx.fillRect(x - 8, base - 22, pw + 16, 22);
    // rãnh dọc
    ctx.strokeStyle = alpha('#000000', 0.35);
    ctx.lineWidth = 2;
    for (const d of [12, 20, 28]) {
      ctx.beginPath(); ctx.moveTo(x + d, 58); ctx.lineTo(x + d, base - 22); ctx.stroke();
    }
    // đuốc gắn tường
    const fx = x + pw + 26;
    const fy = 176 + Math.sin(i * 2.1) * 14;
    const flick = 0.8 + 0.2 * Math.sin(s.t * 13 + i * 3) + 0.1 * Math.sin(s.t * 27 + i);
    ctx.fillStyle = '#3a2e28';
    ctx.fillRect(fx - 3, fy, 6, 24);
    ctx.fillStyle = '#241c1a';
    ctx.fillRect(fx - 7, fy + 20, 14, 5);
    // ngọn lửa nhiều lớp
    const fh = 16 * flick;
    for (const [rw, rh, col, a] of [
      [9, fh * 1.5, zone.torch, 0.4],
      [6, fh * 1.1, lighten(zone.torch, 0.3), 0.75],
      [3, fh * 0.6, '#fff6d0', 1],
    ] as Array<[number, number, string, number]>) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(fx - rw, fy - 2);
      ctx.quadraticCurveTo(fx - rw * 0.6, fy - rh, fx + Math.sin(s.t * 8 + i) * 2, fy - rh * 1.25);
      ctx.quadraticCurveTo(fx + rw * 0.6, fy - rh, fx + rw, fy - 2);
      ctx.quadraticCurveTo(fx, fy + 3, fx - rw, fy - 2);
      ctx.fillStyle = col;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    lights.push({ x: fx, y: fy - 8, r: 150 * flick, color: zone.torch, power: flick });
  }
}

// ---------- 6. sàn ----------
function drawFloor(ctx: CanvasRenderingContext2D, s: SceneParams, lights: TorchLight[]): void {
  const { w, h, zone } = s;
  const base = s.ground;
  const g = ctx.createLinearGradient(0, base, 0, h);
  g.addColorStop(0, lighten(zone.ground, 0.1));
  g.addColorStop(0.25, zone.ground);
  g.addColorStop(1, darken(zone.ground, 0.45));
  ctx.fillStyle = g;
  ctx.fillRect(0, base, w, h - base);

  // phiến đá có phối cảnh: hàng càng gần càng cao
  const rows = 5;
  ctx.strokeStyle = alpha(zone.groundLine, 0.4);
  ctx.lineWidth = 1.4;
  for (let r = 1; r <= rows; r++) {
    const y = base + Math.pow(r / rows, 1.7) * (h - base);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    const cell = 60 + r * 26;
    const off = (s.scroll * (0.4 + r * 0.18)) % cell;
    for (let x = -off; x < w + cell; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - (h - base) / rows * 0.55);
      ctx.stroke();
    }
  }
  // vệt nứt
  ctx.strokeStyle = alpha('#000000', 0.4);
  ctx.lineWidth = 2;
  const co = s.scroll % 520;
  for (let k = -1; k * 520 - co < w + 520; k++) {
    const x = k * 520 - co;
    ctx.beginPath();
    ctx.moveTo(x, base + 10);
    ctx.lineTo(x + 26, base + 30);
    ctx.lineTo(x + 8, base + 52);
    ctx.stroke();
  }
  // đường chân tường phát sáng
  ctx.strokeStyle = alpha(zone.accent, 0.5);
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke();
  ctx.strokeStyle = alpha(zone.accent, 0.14);
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0, base + 2); ctx.lineTo(w, base + 2); ctx.stroke();

  // vũng sáng của đuốc hắt xuống sàn
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const pg = ctx.createRadialGradient(l.x, base + 16, 4, l.x, base + 16, l.r * 0.9);
    pg.addColorStop(0, alpha(l.color, 0.2 * l.power));
    pg.addColorStop(1, alpha(l.color, 0));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(l.x, base + 18, l.r * 0.9, l.r * 0.32, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- 7. hạt môi trường ----------
interface Mote { x: number; y: number; z: number; seed: number }
const motes: Mote[] = [];
function ensureMotes(n: number, w: number, h: number): void {
  while (motes.length < n) {
    const i = motes.length;
    motes.push({ x: hash(i * 1.3) * w, y: hash(i * 2.7) * h, z: 0.3 + hash(i * 5.9) * 1.4, seed: i });
  }
}

function drawWeather(ctx: CanvasRenderingContext2D, s: SceneParams): void {
  const { w, h, zone } = s;
  ensureMotes(70, w, h);
  ctx.save();
  for (const m of motes) {
    const sp = m.z;
    let x = m.x; let y = m.y;
    const t = s.t;
    switch (zone.weather) {
      case 'ember':
      case 'blood':
        y = (m.y - t * 26 * sp) % h;
        x = m.x + Math.sin(t * 0.9 + m.seed) * 22 * sp;
        break;
      case 'ash':
      case 'snow':
      case 'spore':
        y = (m.y + t * 18 * sp) % h;
        x = m.x + Math.sin(t * 0.6 + m.seed) * 30 * sp;
        break;
      case 'rain':
        y = (m.y + t * 420 * sp) % h;
        x = m.x - t * 40 * sp;
        break;
      default:
        y = (m.y + Math.sin(t * 0.5 + m.seed) * 30) % h;
        x = (m.x - t * 12 * sp) % w;
    }
    if (y < 0) y += h;
    x = ((x % w) + w) % w;
    const a = (0.12 + hash(m.seed * 3.1) * 0.4) * Math.min(1, sp);
    if (zone.weather === 'rain') {
      ctx.strokeStyle = alpha(zone.accent, a * 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12 * sp); ctx.stroke();
    } else {
      const col = zone.weather === 'snow' ? '#dff2ff'
        : zone.weather === 'spore' ? zone.accent
          : zone.weather === 'ash' ? '#9a8d84'
            : zone.weather === 'blood' ? '#ff4a5e' : zone.torch;
      const glowing = zone.weather === 'ember' || zone.weather === 'blood' || zone.weather === 'spore';
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      const r = 1.1 + sp * 1.1;
      if (glowing) {
        // Quầng sáng bằng hai vòng tròn chồng nhau — rẻ hơn shadowBlur
        // hàng chục lần khi có tới bảy mươi hạt mỗi khung hình.
        ctx.globalAlpha = a * 0.28;
        ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill();
        ctx.globalAlpha = a;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- 8. phủ màu + vignette + hạt nhiễu ----------
/** Vignette phụ thuộc kích thước nên chỉ dựng lại khi kích thước đổi. */
let vignette: { key: string; grad: CanvasGradient } | null = null;
/** Hạt phim dựng sẵn thành vài khung rồi luân phiên — một lần blit mỗi frame. */
let grainFrames: HTMLCanvasElement[] | null = null;

function grainTile(w: number, h: number): HTMLCanvasElement[] {
  if (grainFrames && grainFrames[0].width === w) return grainFrames;
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < 3; f++) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (g) {
      const img = g.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + Math.random() * 135;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 9;
      }
      g.putImageData(img, 0, 0);
    }
    frames.push(c);
  }
  grainFrames = frames;
  return frames;
}

export function drawGrade(ctx: CanvasRenderingContext2D, s: SceneParams, quality: number): void {
  const { w, h, zone } = s;
  if (quality >= 1) {
    // ánh sáng khí quyển từ trên xuống
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, alpha(zone.accent, 0.1 + s.intensity * 0.1));
    g.addColorStop(0.6, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const key = `${w}x${h}`;
  if (!vignette || vignette.key !== key) {
    const v = ctx.createRadialGradient(w / 2, h * 0.46, h * 0.32, w / 2, h * 0.5, h * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(2,1,5,0.66)');
    vignette = { key, grad: v };
  }
  ctx.fillStyle = vignette.grad;
  ctx.fillRect(0, 0, w, h);

  if (quality >= 2) {
    const frames = grainTile(w, h);
    // Math.abs: chỉ số phải luôn không âm dù thời gian có bất thường.
    ctx.drawImage(frames[Math.abs((s.t * 24) | 0) % frames.length], 0, 0);
  }
}

/**
 * Vẽ toàn bộ nền (trước khi vẽ nhân vật).
 * `quality` 0–2: máy yếu sẽ bỏ bớt lớp sương và hạt môi trường.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, s: SceneParams, quality: number): void {
  const lights: TorchLight[] = [];
  drawSky(ctx, s);
  drawFarRange(ctx, s);
  drawMidArches(ctx, s);
  if (quality >= 1) drawFogBands(ctx, s);
  drawNearPillars(ctx, s, lights);
  drawFloor(ctx, s, lights);
  if (quality >= 1) drawWeather(ctx, s);
}

/** Lớp tiền cảnh mờ — đóng khung và tạo chiều sâu, vẽ sau nhân vật. */
export function drawForeground(ctx: CanvasRenderingContext2D, s: SceneParams): void {
  const { w, h, zone } = s;
  const off = (s.scroll * 1.5) % 620;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = darken(zone.near, 0.6);
  for (let k = -1; k * 620 - off < w + 620; k++) {
    const x = k * 620 - off;
    // cột đá gãy ở tiền cảnh
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + 8, h - 96);
    ctx.lineTo(x + 34, h - 118);
    ctx.lineTo(x + 58, h - 88);
    ctx.lineTo(x + 66, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // đáy tối dần
  const g = ctx.createLinearGradient(0, h - 90, 0, h);
  g.addColorStop(0, 'rgba(3,2,6,0)');
  g.addColorStop(1, 'rgba(3,2,6,0.8)');
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 90, w, 90);
}

/**
 * Bóng phản chiếu của một đơn vị trên sàn ướt.
 * Cố tình KHÔNG dùng `ctx.filter = blur()`: bộ lọc canvas buộc trình duyệt
 * dựng thêm một lớp riêng cho mỗi lần gọi, và với hai mươi đơn vị mỗi khung
 * hình nó kéo tốc độ khung xuống dưới 5 fps trên máy không có GPU.
 * Độ trong và phép nén dọc đã đủ để mắt đọc ra đó là phản chiếu.
 */
export function withReflection(
  ctx: CanvasRenderingContext2D, x: number, groundY: number, opacity: number,
  paint: (c: CanvasRenderingContext2D) => void,
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, groundY + 2);
  ctx.scale(1, -0.42);
  paint(ctx);
  ctx.restore();
}

export { mix };
