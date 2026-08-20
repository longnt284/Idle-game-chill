// ============ PIXEL 2.5D RENDERER ============
// Vẽ nhân vật / quái dạng pixel-art có chiều sâu (viền outline, đổ bóng, bóng mặt đất).
import type { ChibiLook } from './engine';

type Palette = Record<string, string>;

// ---------- helpers ----------
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255; let g = (n >> 8) & 255; let b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + amt))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + amt))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
  return `rgb(${r},${g},${b})`;
}

interface Sprite {
  grid: string[];
  pal: Palette;
}

function buildPixels(sp: Sprite, px: number): HTMLCanvasElement {
  const rows = sp.grid;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  // outline pass: expand by 1
  const W = w + 2; const H = h + 2;
  const cv = document.createElement('canvas');
  cv.width = W * px; cv.height = H * px;
  const c = cv.getContext('2d')!;
  const solid = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const ch = rows[y][x];
    return ch !== undefined && ch !== '.' && ch !== ' ';
  };
  const colorAt = (x: number, y: number): string => {
    const ch = rows[y][x];
    return sp.pal[ch] ?? '#ff00ff';
  };
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (solid(x, y)) {
        let col = colorAt(x, y);
        // shading: if right or bottom neighbor empty -> it's an edge facing light? darken bottom/right
        const edgeDark = !solid(x + 1, y) || !solid(x, y + 1);
        const edgeLight = !solid(x - 1, y) || !solid(x, y - 1);
        if (edgeDark && !edgeLight) col = shade(col.startsWith('#') ? col : rgbToHex(col), -0.28);
        else if (edgeLight && !edgeDark) col = shade(col.startsWith('#') ? col : rgbToHex(col), 0.16);
        c.fillStyle = col;
        c.fillRect((x + 1) * px, (y + 1) * px, px, px);
      } else {
        // outline if any neighbor solid
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
          c.fillStyle = 'rgba(12,8,18,0.95)';
          c.fillRect((x + 1) * px, (y + 1) * px, px, px);
        }
      }
    }
  }
  return cv;
}
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m) return '#ffffff';
  const to = (v: string) => parseInt(v, 10).toString(16).padStart(2, '0');
  return `#${to(m[0])}${to(m[1])}${to(m[2])}`;
}

// sprite cache
const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, builder: () => HTMLCanvasElement): HTMLCanvasElement {
  let s = cache.get(key);
  if (!s) { s = builder(); cache.set(key, s); }
  return s;
}

// ============ HERO ============
const HERO_BODY = [
  '....HHHH....',
  '...HHHHHH...',
  '..HHHHHHHH..',
  '..HSSSSSSH..',
  '..HSESSESH..',
  '..HSSSSSSH..',
  '...SSSSSS...',
  '..OOOOOOOO..',
  '.OOOOOOOOOO.',
  '.OOoOOOOoOO.',
  '.SOoOOOOoOS.',
  '.SOOOOOOOOS.',
  '..OOOOOOOO..',
  '..22222222..',
  '..OO....OO..',
  '..OO....OO..',
  '..22....22..',
  '.222....222.',
];

function heroPal(l: ChibiLook): Palette {
  return {
    H: l.hair, S: l.skin, E: l.eyes,
    O: l.outfit, o: l.outfit2, 2: l.outfit2,
  };
}

// weapon overlays drawn as separate small sprites anchored to the hand
const WEAPON_GRIDS: Record<string, string[]> = {
  sword: ['..W..', '..W..', '..W..', '..W..', '..W..', '.www.', '..2..'],
  staff: ['..A..', '.AAA.', '..W..', '..W..', '..W..', '..W..', '..W..', '..2..'],
  bow: ['.WW..', 'W..W.', 'W...W', 'W..wW', 'W...W', 'W..W.', '.WW..'],
  daggers: ['.W.W.', '.W.W.', '.w.w.', '.....'],
  orb: ['.AAA.', 'AAAAA', 'AAAAA', '.AAA.'],
  shield: ['.OOO.', 'OOAOO', 'OOAOO', '.OOO.'],
  spear: ['..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '..2..'],
  none: [],
};
const WEAPON_PAL: Palette = { W: '#d8dce8', w: '#8a6a3a', A: '#ffd23c', O: '#8a8a9a', 2: '#6a4a2a' };

export function drawPixelHero(
  ctx: CanvasRenderingContext2D, look: ChibiLook, t: number, walk: number,
  lunge: number, scale: number, facing: number, frozen: number,
): void {
  const px = 3;
  const key = `hero|${look.hair}|${look.outfit}|${look.outfit2}|${look.skin}|${look.eyes}`;
  const body = cached(key, () => buildPixels({ grid: HERO_BODY, pal: heroPal(look) }, px));
  const wk = look.weapon === 'none' ? '' : look.weapon;
  const weapon = wk ? cached(`wp|${wk}`, () => buildPixels({ grid: WEAPON_GRIDS[wk] ?? [], pal: WEAPON_PAL }, px)) : null;

  const bob = Math.sin(walk) * 2 * scale + Math.sin(t * 2) * scale;
  const w = body.width * scale; const h = body.height * scale;
  ctx.save();
  if (frozen > 0) ctx.globalAlpha = 0.75;
  // ground shadow (3D)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, w * 0.42, w * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // aura glow
  ctx.globalAlpha *= 0.35 + 0.15 * Math.sin(t * 4);
  ctx.fillStyle = look.aura;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.45, w * 0.55, h * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = frozen > 0 ? 0.75 : 1;

  ctx.save();
  ctx.scale(facing, 1);
  // lunge = attack thrust
  const thrust = lunge > 0 ? Math.sin(Math.min(1, lunge) * Math.PI) * 10 * scale : 0;
  ctx.translate(thrust, -h + bob);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(body, -w / 2, 0, w, h);
  if (weapon) {
    const ww = weapon.width * scale; const wh = weapon.height * scale;
    const swing = lunge > 0 ? -1.2 + lunge * 1.6 : Math.sin(walk) * 0.15;
    ctx.save();
    ctx.translate(w * 0.34, h * 0.42);
    ctx.rotate(swing);
    ctx.drawImage(weapon, 0, -wh * 0.3, ww, wh);
    ctx.restore();
  }
  ctx.restore();
  if (frozen > 0) {
    ctx.fillStyle = 'rgba(120,200,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.5, w * 0.5, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderPixelPortrait(canvas: HTMLCanvasElement, look: ChibiLook, t: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width; const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * 0.96);
  const s = Math.min(W, H) / 70;
  drawPixelHero(ctx, look, t, t * 2, 0, s * 2.2, 1, 0);
  ctx.restore();
}

// ============ MONSTERS ============
const MON: Record<string, string[]> = {
  slime: [
    '....AAAA....',
    '..AAAAAAAA..',
    '.AAAAAAAAAA.',
    '.AAEEAAEEAA.',
    'AAAAAAAAAAAA',
    'AAAAAAAAAAAA',
    '.AAAAAAAAAA.',
    '..AAAAAAAA..',
  ],
  bat: [
    'A..........A',
    'AA...AA...AA',
    'AAA.AAAA.AAA',
    '.AAAAAAAAAA.',
    '..AAEAAEAA..',
    '...AAAAAA...',
    '....A..A....',
  ],
  skeleton: [
    '...WWWW...',
    '..WWWWWW..',
    '..WEEWEEW..'.replace('WEEWEEW', 'EWWWWWE'),
    '..WWWWWW..',
    '...WWWW...',
    '..WWWWWW..',
    '.WW.WWWW.WW'.replace('WW.WWWW.WW', 'WWWWWWWWW'),
    '..WWWWWW..',
    '..WW..WW..',
    '..WW..WW..',
  ],
  imp: [
    '.A......A.',
    'AA.AAAA.AA',
    '.AAAAAAAA.',
    '.AEEAAEEA.',
    '.AAAAAAAA.',
    '..AAAAAA..',
    '.AAAAAAAA.',
    '..AA..AA..',
    '..AA..AA..',
  ],
  wraith: [
    '...AAAA...',
    '..AAAAAA..',
    '.AAEEAEEA.'.replace('AAEEAEEA', 'AAEEEAEA'),
    '.AAAAAAAA.',
    '.AAAAAAAA.',
    '.AAAAAAAA.',
    '..A.AA.A..',
    '...A..A...',
  ],
  ogre: [
    '..AAAAAA..',
    '.AAAAAAAA.',
    '.AEEAAEEA.',
    '.AAAAAAAA.',
    '.AAWWWWAA.',
    'AAAAAAAAAA',
    'AAAAAAAAAA',
    '.AAAAAAAA.',
    '.AAA..AAA.',
    '.AAA..AAA.',
  ],
  knight: [
    '..WWWWWW..',
    '.WWWWWWWW.',
    '.WEWWWWEW.',
    '.WWWWWWWW.',
    '..WWWWWW..',
    '.WWWWWWWW.',
    'WWWWWWWWWW',
    '.WWWWWWWW.',
    '.WWW..WWW.',
    '.WWW..WWW.',
    '.222..222.',
  ],
  demon: [
    'A........A',
    'AA.AAAA.AA',
    '.AAAAAAAA.',
    '.AEEAAEEA.',
    '.AAAAAAAA.',
    '.AAWWWWAA.',
    'AAAAAAAAAA',
    '.AAAAAAAA.',
    '.AAAAAAAA.',
    '.AAA..AAA.',
    '.AAA..AAA.',
  ],
  queen: [
    '..A.AA.A..',
    '..AAAAAA..',
    '.AAAAAAAA.',
    '.AEEAAEEA.',
    '.AAAAAAAA.',
    'AAAAAAAAAA',
    'AAAAAAAAAA',
    '.AAAAAAAA.',
    '..AAAAAA..',
    '...AAAA...',
  ],
  lich: [
    '...2222...',
    '..222222..',
    '..2EEEE2..',
    '..222222..',
    '.2222222..'.replace('2222222', '22222222'),
    '.22222222.',
    '.22222222.',
    '..222222..',
    '...2..2...',
  ],
};
const MON_PAL = (tint: string, eye: string): Palette => ({
  A: tint, E: eye, W: '#e8e0d0', 2: shade(tint, -0.4),
});

export function drawPixelMonster(
  ctx: CanvasRenderingContext2D, kind: string, tint: string, eye: string,
  t: number, walk: number, swing: number, scale: number, stun: number, boss: boolean,
): void {
  const grid = MON[kind] ?? MON.imp;
  const px = boss ? 5 : 3;
  const key = `mon|${kind}|${tint}|${eye}`;
  const spr = cached(key, () => buildPixels({ grid, pal: MON_PAL(tint, eye) }, px));
  const w = spr.width * scale; const h = spr.height * scale;
  const bob = Math.sin(walk) * 2 * scale;
  ctx.save();
  if (stun > 0) ctx.globalAlpha = 0.8;
  // (bóng đổ + quầng boss do engine vẽ để xử lý đúng quái bay)
  ctx.imageSmoothingEnabled = false;
  const hurt = swing > 0 ? Math.sin(swing * Math.PI) * 6 * scale : 0;
  ctx.translate(-hurt, -h + bob);
  ctx.drawImage(spr, -w / 2, 0, w, h);
  if (stun > 0) {
    ctx.fillStyle = 'rgba(140,220,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.5, w * 0.5, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
