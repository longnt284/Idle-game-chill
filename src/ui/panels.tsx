import { useEffect, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import type { MetaInfo, GachaResult, Rarity, Pos, ChibiLook } from '../game/engine';
import {
  COMPANIONS, RARITY, SKINS, SKIN_COST, ITEMS, GACHA_COST, GACHA_X10_COST, GACHA_X100_COST, GACHA_X500_COST,
  SPEEDS, MAX_PARTY, WEAPONS, WGACHA_COST, fmt, renderChibiPortrait,
} from '../game/engine';
import type { GameIdle } from '../game/engine';

// ---------- chibi portrait (canvas) ----------
function ChibiCanvas({ look, size, animate = false }: { look: ChibiLook; size: number; animate?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(look);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const L = JSON.parse(key) as ChibiLook;
    const dpr = 2;
    const W = Math.round(size * 0.9 * dpr);
    const H = Math.round(size * dpr);
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    if (!animate) {
      renderChibiPortrait(cv, L, 0.85);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const loop = (): void => {
      renderChibiPortrait(cv, L, (performance.now() - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [key, size, animate]);
  return <canvas ref={ref} style={{ width: Math.round(size * 0.9), height: size, display: 'block' }} />;
}

function PortraitFrame({ look, size, ring, animate = false, className = '' }: { look: ChibiLook; size: number; ring: string; animate?: boolean; className?: string }) {
  const w = Math.round(size * 0.9);
  return (
    <div className={`relative shrink-0 overflow-hidden flex items-end justify-center ${className}`}
      style={{
        width: w, height: size, borderRadius: 10,
        background: `radial-gradient(circle at 50% 24%, ${ring}3a, #15101f 74%)`,
        border: `2px solid ${ring}`,
        boxShadow: `0 0 16px ${ring}55, inset 0 -12px 22px rgba(0,0,0,.6)`,
      }}>
      <ChibiCanvas look={look} size={size - 4} animate={animate} />
      <div className="absolute inset-x-0 top-0 h-1/3 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.13), transparent)' }} />
    </div>
  );
}

function lookOfResult(r: GachaResult): ChibiLook {
  if (r.kind === 'companion') return COMPANIONS.find((c) => c.id === r.id)?.look ?? SKINS[0].look;
  if (r.kind === 'skin') return SKINS.find((s) => s.id === r.id)?.look ?? SKINS[0].look;
  // vật phẩm: dùng look trung tính ánh vàng
  return { hair: '#ffd23c', outfit: '#8a6a1e', outfit2: '#4e3c10', skin: '#f0d8a8', eyes: '#8a5a1e', hairStyle: 'none', weapon: 'none', accessory: 'none', aura: '#ffb43c' };
}

// ---------- tiny SVG icons ----------
const Svg = ({ d, s = 15, c = 'currentColor' }: { d: string; s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c} aria-hidden="true"><path d={d} /></svg>
);
const ICONS = {
  gem: 'M12 2 22 12 12 22 2 12 12 2z',
  coin: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  sword: 'M6.9 17.1 3 21l1.4 1.4 3.9-3.9 1.4 1.4 1.4-1.4-2.8-2.8-1.4 1.4zm14.5-12.9L13 12.6l-1.6-1.6 8.4-8.4c1.2 1.2 1.6 1.6 1.6 1.6z',
  squad: 'M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5c0-2.3-4.7-3.5-7-3.5zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 1.9 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z',
  bag: 'M19 7h-3V6a4 4 0 0 0-8 0v1H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-9-1a2 2 0 0 1 4 0v1h-4V6z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  play: 'M8 5v14l11-7z',
  sound: 'M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
  mute: 'M3 10v4h4l5 5V5L7 10H3zm18.1 2 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4-2.4-2.4z',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4z',
  star: 'M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.4 5.8 21l1.6-7L2 9.3l7.1-.7L12 2z',
};

function RarityStars({ r }: { r: Rarity }) {
  const n = RARITY[r].stars;
  return (
    <span className="inline-flex gap-[1px]" style={{ color: RARITY[r].color }}>
      {Array.from({ length: n }).map((_, i) => <Svg key={i} d={ICONS.star} s={10} />)}
    </span>
  );
}
function PosBadge({ pos }: { pos: Pos }) {
  const label = pos === 'front' ? 'TIỀN PHONG' : pos === 'mid' ? 'TRUNG QUÂN' : 'HẬU QUÂN';
  const color = pos === 'front' ? '#ff8a5a' : pos === 'mid' ? '#ffd23c' : '#8cdcff';
  return (
    <span className="font-ui text-[9px] font-bold tracking-wider px-1.5 py-px rounded-sm" style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}>
      {label}
    </span>
  );
}
function Avatar({ outfit, aura, letter, size = 40 }: { outfit: string; aura: string; letter: string; size?: number }) {
  return (
    <div className="relative shrink-0 rounded-full flex items-center justify-center font-display"
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 35% 30%, ${outfit}, #14101c 130%)`,
        border: `2px solid ${aura}`,
        boxShadow: `0 0 14px ${aura}66, inset 0 -6px 12px rgba(0,0,0,.5)`,
        color: '#f5efe0', fontSize: size * 0.46, textShadow: '0 2px 4px #000',
      }}>
      {letter}
    </div>
  );
}

function Modal({ title, accent = '#ff3b52', onClose, children, wide = false }: { title: string; accent?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(5,4,10,0.78)' }} onClick={onClose}>
      <div
        className={`panel-dark relative w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[88vh] flex flex-col anim-fade-up`}
        style={{ borderColor: `${accent}55`, clipPath: 'polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${accent}33`, background: `linear-gradient(90deg, ${accent}1f, transparent)` }}>
          <h2 className="font-display text-2xl tracking-wide" style={{ color: accent, textShadow: `0 0 16px ${accent}66` }}>{title}</h2>
          <button onClick={onClose} className="text-[#9a917f] hover:text-[#ff3b52] transition-colors cursor-pointer" aria-label="Đóng"><Svg d={ICONS.close} s={18} /></button>
        </div>
        <div className="overflow-y-auto p-5 min-h-0">{children}</div>
      </div>
    </div>
  );
}

// ============ HUD: Kael card + dock ============
export function HudOverlay({ meta, engine }: { meta: MetaInfo; engine: GameIdle }) {
  const xpPct = Math.min(100, (meta.kaelXp / meta.kaelXpNext) * 100);
  return (
    <>
      {/* Kael card bottom-left */}
      <div className="absolute bottom-3 left-3 flex items-end gap-2.5 pointer-events-none select-none">
        <PortraitFrame look={SKINS.find((s) => s.id === meta.equippedSkin)?.look ?? SKINS[0].look} ring={SKINS.find((s) => s.id === meta.equippedSkin)?.look.aura ?? '#c2172f'} size={64} animate />
        <div className="pb-1">
          <div className="font-display text-lg leading-none text-[#f0e8d8]" style={{ textShadow: '0 2px 8px #000' }}>
            KAEL <span className="text-[#ffd23c] text-sm">Lv {meta.kaelLevel}</span>
          </div>
          <div className="font-ui text-[10px] text-[#ff8a5a] font-bold tracking-wider mt-0.5">BẬC THĂNG HOA {meta.asc}</div>
          <div className="w-40 h-2 mt-1 rounded-full overflow-hidden" style={{ background: '#1a1424', border: '1px solid #3a2f4a' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #c2172f, #ff9a3c)' }} />
          </div>
          <div className="font-ui text-[9px] text-[#9a917f] mt-0.5">XP {fmt(meta.kaelXp)}/{fmt(meta.kaelXpNext)}</div>
        </div>
      </div>
      <DockBar meta={meta} engine={engine} />
    </>
  );
}

function DockBar({ meta, engine }: { meta: MetaInfo; engine: GameIdle }) {
  const btn = 'group flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 font-display text-sm tracking-wide';
  return (
    <div className="absolute bottom-3 right-3 flex items-stretch gap-1.5 select-none">
      <button className={btn} style={dockStyle('#ff4fd8')} onClick={() => dispatchOpen('summon')}>
        <Svg d={ICONS.gem} s={15} c="#ff4fd8" /> TRIỆU HỒI
      </button>
      <button className={btn} style={dockStyle('#3fb9ff')} onClick={() => dispatchOpen('party')}>
        <Svg d={ICONS.squad} s={15} c="#3fb9ff" /> ĐỘI HÌNH
      </button>
      <button className={btn} style={dockStyle('#ffb43c')} onClick={() => dispatchOpen('equip')}>
        <Svg d={ICONS.bag} s={15} c="#ffb43c" /> TRANG BỊ
      </button>
      <button className={btn} style={dockStyle('#ff8a5a')} onClick={() => dispatchOpen('weapon')}>
        <Svg d={ICONS.sword} s={15} c="#ff8a5a" /> VŨ KHÍ
      </button>
      <button className={btn} style={dockStyle('#ffd23c')} onClick={() => engine.cycleSpeed()} title="Tốc độ trận đấu">
        <Svg d={ICONS.bolt} s={14} c="#ffd23c" /> ×{meta.speed}
      </button>
      <button className={btn} style={dockStyle('#8fa3b8')} onClick={() => engine.toggleMute()} title="Âm thanh (M)">
        <Svg d={meta.muted ? ICONS.mute : ICONS.sound} s={15} c="#8fa3b8" />
      </button>
      <button className={btn} style={dockStyle('#ff3b52')} onClick={() => engine.togglePause()} title="Tạm dừng (P)">
        <Svg d={ICONS.pause} s={13} c="#ff3b52" />
      </button>
    </div>
  );
}
function dockStyle(accent: string): CSSProperties {
  return {
    color: '#e8dfc8',
    background: 'linear-gradient(180deg, rgba(28,22,38,0.92), rgba(12,9,18,0.94))',
    border: `1px solid ${accent}55`,
    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
    textShadow: '0 2px 6px #000',
  };
}

// dispatch custom event so App can open modals (keeps DockBar loosely coupled)
export function dispatchOpen(which: 'summon' | 'party' | 'equip' | 'skin' | 'weapon'): void {
  window.dispatchEvent(new CustomEvent('hk-open-panel', { detail: which }));
}

// ============ SUMMON ============
export function SummonModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }) {
  const [results, setResults] = useState<GachaResult[] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<1 | 10 | 100 | 500 | null>(null);

  const finish = (): void => {
    const times = pendingRef.current;
    if (times === null) return;
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    pendingRef.current = null;
    const r = engine.gacha(times);
    setResults(r);
    setSpinning(false);
  };
  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  const roll = (times: 1 | 10 | 100 | 500): void => {
    if (spinning) return;
    setSpinning(true);
    setResults(null);
    pendingRef.current = times;
    const delay = times === 1 ? 500 : times === 10 ? 900 : 1300;
    timerRef.current = window.setTimeout(finish, delay);
  };

  // tổng hợp kết quả cho lượt quay lớn
  const summary = (() => {
    if (!results || results.length < 20) return null;
    const byRarity: Record<string, number> = { mythic: 0, legendary: 0, epic: 0, rare: 0, common: 0 };
    const byName = new Map<string, { r: GachaResult; n: number; isNew: boolean }>();
    for (const r of results) {
      byRarity[r.rarity] += 1;
      const k = `${r.kind}|${r.name}`;
      const e = byName.get(k);
      if (e) { e.n += 1; if (r.isNew) e.isNew = true; } else byName.set(k, { r, n: 1, isNew: r.isNew });
    }
    const top = [...byName.entries()].sort((a, b) => {
      const ord = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 } as Record<string, number>;
      return ord[b[1].r.rarity] - ord[a[1].r.rarity] || b[1].n - a[1].n;
    });
    return { byRarity, top };
  })();

  return (
    <Modal title="ĐÀI TRIỆU HỒI HUYẾT NGUYỆT" accent="#ff4fd8" onClose={onClose} wide>
      <div className="flex flex-col items-center">
        {/* summon circle */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-1">
          <svg viewBox="0 0 200 200" className={`absolute inset-0 ${spinning ? 'anim-slow-spin' : ''}`} style={{ animationDuration: spinning ? '1.2s' : '3s' }}>
            <circle cx="100" cy="100" r="92" fill="none" stroke="#ff4fd855" strokeWidth="2" strokeDasharray="14 8" />
            <circle cx="100" cy="100" r="72" fill="none" stroke="#ff3b5277" strokeWidth="1.5" strokeDasharray="4 10" />
            <path d="M100 12 188 100 100 188 12 100z" fill="none" stroke="#ffd23c44" strokeWidth="1.5" />
          </svg>
          <svg viewBox="0 0 100 100" className={`w-14 h-14 ${spinning ? 'animate-pulse' : ''}`}>
            <path d="M50 4 66 38 98 50 66 62 50 96 34 62 2 50 34 38z" fill="#ff4fd8" opacity="0.9" />
            <path d="M50 22 59 42 80 50 59 58 50 78 41 58 20 50 41 42z" fill="#fff" opacity="0.85" />
          </svg>
          {spinning && <div className="absolute inset-0 rounded-full anim-pulse-glow" />}
        </div>
        <p className="font-ui text-[10px] text-[#9a917f] text-center mb-3">
          Thần Thoại <span className="text-[#c96bff] font-bold">1.5%</span> · Huyền Thoại <span className="text-[#ff4fd8] font-bold">4%</span> · Cực Hiếm <span className="text-[#ffb43c] font-bold">12%</span> · Hiếm <span className="text-[#3fb9ff] font-bold">33%</span> · Thường <span className="text-[#8fa3b8] font-bold">49.5%</span>
          <br />Cứ mỗi 10 lần chắc chắn ≥1 Cực Hiếm (bảo hiểm)
        </p>

        {spinning && (
          <button onClick={finish} className="font-ui text-[11px] font-bold text-[#e8dfc8] px-3 py-1 mb-2 cursor-pointer"
            style={{ border: '1px solid #e8dfc855', clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}>
            BỎ QUA HOẠT CẢNH ▸▸
          </button>
        )}

        {/* results */}
        {results && !summary && (
          <div className={`grid gap-2 mb-4 w-full ${results.length > 1 ? 'grid-cols-5' : 'grid-cols-1 max-w-[230px] mx-auto'}`}>
            {results.map((r, i) => {
              const rc = RARITY[r.rarity];
              const big = results.length === 1 && (r.rarity === 'epic' || r.rarity === 'legendary' || r.rarity === 'mythic');
              return (
                <div key={i} className="anim-fade-up relative rounded-md p-2 flex flex-col items-center text-center"
                  style={{
                    animationDelay: `${i * 70}ms`,
                    background: `linear-gradient(165deg, ${rc.color}26, #0e0a16 70%)`,
                    border: `1.5px solid ${rc.color}`,
                    boxShadow: r.rarity === 'legendary' || r.rarity === 'epic' || r.rarity === 'mythic' ? `0 0 18px ${rc.color}88` : 'none',
                  }}>
                  <PortraitFrame look={lookOfResult(r)} ring={rc.color} size={big ? 128 : results.length > 1 ? 62 : 84} animate={big} className="mt-1" />
                  <RarityStars r={r.rarity} />
                  <div className="font-display leading-tight mt-1" style={{ color: rc.color, fontSize: big ? 17 : 13 }}>{r.name}</div>
                  <div className="font-ui text-[9px] text-[#9a917f] mt-0.5 leading-snug">
                    {r.kind === 'companion' ? 'Đồng hành' : r.kind === 'skin' ? 'Skin Kael' : 'Vật phẩm'}
                  </div>
                  <div className={`font-ui text-[9px] font-bold mt-1 ${r.isNew ? 'text-[#3fe0b0]' : 'text-[#ffd23c]'}`}>
                    {r.isNew ? 'MỚI!' : r.dupeText}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* tổng hợp cho lượt lớn */}
        {results && summary && (
          <div className="w-full mb-4 anim-fade-up">
            <div className="flex justify-center gap-2 flex-wrap mb-3">
              {(['mythic', 'legendary', 'epic', 'rare', 'common'] as const).map((rr) => (
                <div key={rr} className="px-2.5 py-1 text-center" style={{ background: `${RARITY[rr].color}1c`, border: `1px solid ${RARITY[rr].color}66`, clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}>
                  <div className="font-display text-lg leading-none" style={{ color: RARITY[rr].color }}>{summary.byRarity[rr]}</div>
                  <div className="font-ui text-[8px]" style={{ color: RARITY[rr].color }}>{RARITY[rr].name.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {summary.top.map(([k, { r, n, isNew }]) => {
                const rc = RARITY[r.rarity];
                return (
                  <div key={k} className="rounded-md p-1.5 flex flex-col items-center text-center"
                    style={{ background: `linear-gradient(165deg, ${rc.color}20, #0e0a16 75%)`, border: `1px solid ${rc.color}88` }}>
                    <PortraitFrame look={lookOfResult(r)} ring={rc.color} size={46} />
                    <div className="font-display text-[10px] leading-tight mt-0.5" style={{ color: rc.color }}>{r.name}</div>
                    <div className="font-ui text-[9px] font-bold" style={{ color: isNew ? '#3fe0b0' : '#ffd23c' }}>{isNew ? 'MỚI!' : `×${n}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 w-full">
          <button className="btn-blade primary" disabled={spinning || meta.gems < GACHA_COST} onClick={() => roll(1)} style={{ opacity: meta.gems < GACHA_COST ? 0.45 : 1 }}>
            <Svg d={ICONS.gem} s={14} c="#ff4fd8" /> ×1 — {fmt(GACHA_COST)}
          </button>
          <button className="btn-blade primary" disabled={spinning || meta.gems < GACHA_X10_COST} onClick={() => roll(10)} style={{ opacity: meta.gems < GACHA_X10_COST ? 0.45 : 1 }}>
            <Svg d={ICONS.gem} s={14} c="#ff4fd8" /> ×10 — {fmt(GACHA_X10_COST)}
          </button>
          <button className="btn-blade" disabled={spinning || meta.gems < GACHA_X100_COST} onClick={() => roll(100)} style={{ opacity: meta.gems < GACHA_X100_COST ? 0.45 : 1, borderColor: '#ffb43c88' }}>
            <Svg d={ICONS.gem} s={14} c="#ffb43c" /> ×100 — {fmt(GACHA_X100_COST)}
          </button>
          <button className="btn-blade" disabled={spinning || meta.gems < GACHA_X500_COST} onClick={() => roll(500)} style={{ opacity: meta.gems < GACHA_X500_COST ? 0.45 : 1, borderColor: '#c96bff88' }}>
            <Svg d={ICONS.gem} s={14} c="#c96bff" /> ×500 — {fmt(GACHA_X500_COST)}
          </button>
        </div>
        <div className="font-ui text-sm text-[#ff4fd8] mt-2 font-bold flex items-center gap-1.5">
          <Svg d={ICONS.gem} s={13} c="#ff4fd8" /> {fmt(meta.gems)} Ngọc trong túi
        </div>
      </div>
    </Modal>
  );
}

// ============ PARTY ============
export function PartyModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }) {
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const ownedCount = Object.keys(meta.ownedCompanions).length;
  const deployed = meta.deployedIds ?? COMPANIONS.filter((c) => (meta.ownedCompanions[c.id] ?? 0) > 0).map((c) => c.id);
  const isDeployed = (id: string): boolean => deployed.includes(id);
  const list = COMPANIONS.filter((c) => filter === 'all' || c.rarity === filter);
  return (
    <Modal title={`ĐỘI HÌNH — ${ownedCount} SỞ HỮU · ${deployed.length}/${MAX_PARTY} RA TRẬN`} accent="#3fb9ff" onClose={onClose} wide>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'mythic', 'legendary', 'epic', 'rare', 'common'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="font-ui text-[10px] font-bold px-2.5 py-1 cursor-pointer transition-colors"
              style={{
                color: filter === f ? '#0e0a16' : f === 'all' ? '#e8dfc8' : RARITY[f as Rarity].color,
                background: filter === f ? (f === 'all' ? '#e8dfc8' : RARITY[f as Rarity].color) : 'transparent',
                border: `1px solid ${f === 'all' ? '#e8dfc855' : RARITY[f as Rarity].color + '66'}`,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}>
              {f === 'all' ? 'TẤT CẢ' : RARITY[f as Rarity].name.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => engine.deployAll()} className="font-ui text-[10px] font-bold px-2.5 py-1 cursor-pointer text-[#0e0a16]"
            style={{ background: '#3fe0b0', clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}>
            CHỌN TẤT CẢ
          </button>
          <button onClick={() => engine.clearDeploy()} className="font-ui text-[10px] font-bold px-2.5 py-1 cursor-pointer text-[#e8dfc8]"
            style={{ border: '1px solid #e8dfc855', clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}>
            BỎ CHỌN
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {list.map((c) => {
          const owned = meta.ownedCompanions[c.id] ?? 0;
          const rc = RARITY[c.rarity];
          const inParty = isDeployed(c.id) && owned > 0;
          const lvl = owned;
          const rarMul = 1 + ({ common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 } as Record<string, number>)[c.rarity] * 0.15;
          const g = Math.pow(1.11, Math.max(0, lvl - 1)) * rarMul;
          const atk = Math.round(c.atkBase * g);
          const hp = Math.round(c.hpBase * g);
          const c1 = engine.upgradeCostOf(lvl);
          const c10 = engine.upgradeBulkCost(c.id, 10);
          const c100 = engine.upgradeBulkCost(c.id, 100);
          const upBtn = (label: string, cost: number, fn: () => void): ReactNode => (
            <button onClick={fn} disabled={meta.gold < cost}
              className="font-ui text-[9px] font-bold px-1.5 py-0.5 cursor-pointer transition-all hover:brightness-125"
              style={{
                color: meta.gold >= cost ? '#0e0a16' : '#6a6378',
                background: meta.gold >= cost ? '#ffd23c' : '#2c2738',
                clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
              }}>
              {label} {fmt(cost)}
            </button>
          );
          return (
            <div key={c.id} className="relative rounded-md p-2.5 flex gap-2.5"
              style={{
                background: owned > 0 ? `linear-gradient(160deg, ${rc.color}1c, #0d0a14 75%)` : 'rgba(20,16,28,0.5)',
                border: `1.5px solid ${owned > 0 ? (inParty ? rc.color : rc.color + '55') : '#2c2738'}`,
                opacity: owned > 0 ? 1 : 0.5,
                boxShadow: inParty ? `0 0 14px ${rc.color}55` : 'none',
              }}>
              {owned > 0 && (
                <button onClick={() => engine.toggleDeploy(c.id)}
                  className="absolute top-1.5 right-1.5 z-10 font-ui text-[8px] font-bold px-1.5 py-0.5 cursor-pointer transition-all hover:brightness-125"
                  style={{
                    color: inParty ? '#0e0a16' : '#9a917f',
                    background: inParty ? '#3fe0b0' : 'rgba(44,39,56,0.9)',
                    border: inParty ? 'none' : '1px solid #4b4257',
                    clipPath: 'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)',
                  }}>
                  {inParty ? '✓ RA TRẬN' : 'CHỌN'}
                </button>
              )}
              <PortraitFrame look={c.look} ring={rc.color} size={58} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap pr-14">
                  <span className="font-display text-[15px] leading-none" style={{ color: owned ? rc.color : '#6a6378' }}>{c.name}</span>
                  <RarityStars r={c.rarity} />
                  {owned > 0 && <span className="font-ui text-[10px] text-[#ffd23c] font-bold">Lv {lvl}</span>}
                </div>
                <div className="font-ui text-[9px] text-[#9a917f] tracking-wide mt-0.5">
                  {c.role} · {c.school}
                </div>
                <div className="flex items-center gap-1 mt-1"><PosBadge pos={c.pos} /></div>
                <div className="mt-1">
                  <span className="font-ui text-[10px] font-bold" style={{ color: rc.color }}>✦ {c.skill.name}</span>
                  <span className="font-body text-[10px] text-[#b8b0a0] ml-1 leading-tight">{c.skill.desc}</span>
                </div>
                {owned > 0 ? (
                  <>
                    <div className="font-ui text-[10px] text-[#9a917f] mt-1">
                      <span className="text-[#ff8a5a] font-bold">{fmt(atk)}</span> Công · <span className="text-[#3fe0b0] font-bold">{fmt(hp)}</span> Máu
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {upBtn('+1', c1, () => engine.upgradeCompanion(c.id))}
                      {upBtn('+10', c10, () => engine.upgradeCompanionTimes(c.id, 10))}
                      {upBtn('+100', c100, () => engine.upgradeCompanionTimes(c.id, 100))}
                    </div>
                  </>
                ) : (
                  <div className="font-ui text-[9px] text-[#6a6378] mt-1">Chưa sở hữu — hãy triệu hồi!</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="font-ui text-[10px] text-[#6a6378] mt-3 text-center">
        Chọn tối đa {MAX_PARTY} đồng hành ra trận · 12 mạnh nhất chiến đấu trực tiếp, còn lại tiếp viện · Diệt boss: toàn bộ đồng hành +1 cấp
      </p>
    </Modal>
  );
}

// ============ EQUIP ============
export function EquipModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }) {
  return (
    <Modal title="TÚ ĐỒ — VẬT PHẨM" accent="#ffb43c" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map((slot) => {
          const id = meta.equippedItems[slot];
          const def = ITEMS.find((i) => i.id === id);
          return (
            <div key={slot} className="rounded-md p-2.5 text-center min-h-[74px] flex flex-col items-center justify-center"
              style={{ background: 'rgba(20,16,28,0.6)', border: '1.5px dashed #ffb43c55' }}>
              {def ? (
                <>
                  <div className="font-display text-[13px] text-[#ffb43c] leading-tight">{def.name}</div>
                  <div className="font-ui text-[9px] text-[#9a917f] mt-1">×{meta.ownedItems.find((o) => o.id === id)?.count ?? 1} bản sao</div>
                </>
              ) : (
                <div className="font-ui text-[10px] text-[#6a6378]">Ô trống {slot + 1}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        {ITEMS.map((it) => {
          const owned = meta.ownedItems.find((o) => o.id === it.id);
          const equipped = meta.equippedItems.includes(it.id);
          const has = (owned?.count ?? 0) > 0;
          const rowBg = has ? 'rgba(255,180,60,0.07)' : 'rgba(20,16,28,0.4)';
          const rowBorder = has ? '1px solid rgba(255,180,60,0.4)' : '1px solid #2c2738';
          const iconBg = has ? 'linear-gradient(160deg, rgba(255,180,60,0.27), #14101c)' : '#14101c';
          return (
            <div key={it.id} className="flex items-center gap-3 rounded-md px-3 py-2"
              style={{ background: rowBg, border: rowBorder, opacity: has ? 1 : 0.5 }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: iconBg, border: '2px solid #ffb43c' }}>
                <Svg d={ICONS.bag} s={16} c="#ffb43c" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[14px] text-[#f0e8d8] leading-none">{it.name} {has && <span className="font-ui text-[10px] text-[#ffd23c]">×{owned?.count}</span>}</div>
                <div className="font-ui text-[10px] text-[#9a917f] mt-0.5">{it.desc}</div>
              </div>
              {has && (
                <button onClick={() => engine.equipItem(it.id)}
                  className="font-ui text-[10px] font-bold px-2.5 py-1 cursor-pointer"
                  style={{
                    color: equipped ? '#0e0a16' : '#ffb43c',
                    background: equipped ? '#ffb43c' : 'transparent',
                    border: '1px solid #ffb43c88',
                    clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  }}>
                  {equipped ? 'THÁO' : 'TRANG BỊ'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="font-ui text-[10px] text-[#6a6378] mt-3 text-center">Trang bị tối đa 3 vật phẩm · Bản sao cộng dồn chỉ số · Triệu Hồi để nhận thêm</p>
    </Modal>
  );
}

// ============ SKINS ============
export function SkinModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }) {
  return (
    <Modal title="TỦ ĐỒ KAEL — SKIN" accent="#c2172f" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2.5">
        {SKINS.map((s) => {
          const owned = meta.ownedSkins.includes(s.id);
          const equipped = meta.equippedSkin === s.id;
          const cost = SKIN_COST[s.id] ?? 0;
          return (
            <div key={s.id} className="rounded-md p-3 flex gap-3 items-center"
              style={{
                background: equipped ? 'rgba(194,23,47,0.14)' : 'rgba(20,16,28,0.55)',
                border: `1.5px solid ${equipped ? '#ff3b52' : owned ? '#7a688c66' : '#2c2738'}`,
                boxShadow: equipped ? '0 0 16px rgba(255,59,82,0.4)' : 'none',
              }}>
              <Avatar outfit={s.look.outfit} aura={s.look.aura} letter="K" size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-[14px] leading-none" style={{ color: equipped ? '#ff3b52' : '#f0e8d8' }}>{s.name}</div>
                <div className="font-body text-[10px] text-[#9a917f] mt-1 leading-snug">{s.desc}</div>
                <div className="mt-1.5">
                  {equipped ? (
                    <span className="font-ui text-[10px] font-bold text-[#ff3b52]">ĐANG MẶC</span>
                  ) : owned ? (
                    <button onClick={() => engine.equipSkin(s.id)} className="font-ui text-[10px] font-bold px-2.5 py-0.5 cursor-pointer text-[#0e0a16]" style={{ background: '#e8dfc8', clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>MẶC</button>
                  ) : (
                    <button onClick={() => engine.buySkin(s.id)} className="font-ui text-[10px] font-bold px-2.5 py-0.5 cursor-pointer text-[#ff4fd8]" style={{ border: '1px solid #ff4fd888', clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                      MUA · {cost} <Svg d={ICONS.gem} s={9} c="#ff4fd8" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ============ WEAPON ============
export function WeaponModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }) {
  const [lastPull, setLastPull] = useState<{ def: (typeof WEAPONS)[number]; isNew: boolean } | null>(null);
  const equipped = engine.equippedWeaponDef();
  const owned = engine.getWeapons();
  const doPull = (): void => {
    const r = engine.weaponGacha();
    if (r) setLastPull(r);
  };
  return (
    <Modal title={`KHO VŨ KHÍ — ${WEAPONS.length} LOẠI`} accent="#ff8a5a" onClose={onClose} wide>
      {/* equipped */}
      <div className="rounded-md p-3 mb-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(120deg, rgba(255,138,90,0.14), #0d0a14 70%)', border: '1.5px solid #ff8a5a88' }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: '#1c1424', border: '2px solid #ff8a5a' }}>
          <Svg d={ICONS.sword} s={20} c="#ff8a5a" />
        </div>
        <div className="flex-1 min-w-0">
          {equipped ? (
            <>
              <div className="font-display text-[15px] leading-none" style={{ color: RARITY[equipped.def.tier].color }}>
                {equipped.def.name} <span className="font-ui text-[10px] text-[#ffd23c]">+{equipped.level - 1}</span>
              </div>
              <div className="font-ui text-[10px] text-[#9a917f] mt-1">
                <span style={{ color: RARITY[equipped.def.tier].color }}>{RARITY[equipped.def.tier].name}</span> · Công +<span className="text-[#ff8a5a] font-bold">{fmt(equipped.atk)}</span> · Tự động trang bị vũ khí mạnh nhất
              </div>
            </>
          ) : (
            <div className="font-ui text-[11px] text-[#9a917f]">Chưa có vũ khí — hãy rèn bên dưới!</div>
          )}
        </div>
      </div>

      {/* forge button */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button onClick={doPull} disabled={meta.gems < WGACHA_COST}
          className="btn-blade primary" style={{ opacity: meta.gems < WGACHA_COST ? 0.45 : 1, borderColor: '#ff8a5a99' }}>
          <Svg d={ICONS.sword} s={15} c="#ff8a5a" /> RÈN VŨ KHÍ — {WGACHA_COST} Ngọc
        </button>
        <div className="font-ui text-sm text-[#ff4fd8] font-bold flex items-center gap-1.5">
          <Svg d={ICONS.gem} s={13} c="#ff4fd8" /> {fmt(meta.gems)}
        </div>
      </div>

      {lastPull && (
        <div className="anim-fade-up rounded-md p-2.5 mb-3 flex items-center gap-2.5"
          style={{ background: `linear-gradient(120deg, ${RARITY[lastPull.def.tier].color}22, #0d0a14 75%)`, border: `1.5px solid ${RARITY[lastPull.def.tier].color}` }}>
          <Svg d={ICONS.sword} s={18} c={RARITY[lastPull.def.tier].color} />
          <div className="flex-1">
            <span className="font-display text-[14px]" style={{ color: RARITY[lastPull.def.tier].color }}>{lastPull.def.name}</span>
            <span className="font-ui text-[10px] ml-2" style={{ color: RARITY[lastPull.def.tier].color }}>{RARITY[lastPull.def.tier].name}</span>
          </div>
          <span className={`font-ui text-[10px] font-bold ${lastPull.isNew ? 'text-[#3fe0b0]' : 'text-[#ffd23c]'}`}>
            {lastPull.isNew ? 'VŨ KHÍ MỚI!' : '+1 nâng cấp'}
          </span>
        </div>
      )}

      {/* owned list */}
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {owned.length === 0 && <div className="col-span-2 font-ui text-[11px] text-[#6a6378] text-center py-4">Chưa sở hữu vũ khí nào</div>}
        {owned.map(({ def, level }) => {
          const rc = RARITY[def.tier];
          const isEq = equipped?.def.id === def.id;
          return (
            <div key={def.id} className="rounded-md p-2 flex items-center gap-2"
              style={{ background: `linear-gradient(140deg, ${rc.color}18, #0d0a14 75%)`, border: `1px solid ${isEq ? rc.color : rc.color + '44'}`, boxShadow: isEq ? `0 0 12px ${rc.color}55` : 'none' }}>
              <Svg d={ICONS.sword} s={15} c={rc.color} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-[12px] leading-none truncate" style={{ color: rc.color }}>{def.name} {level > 1 && <span className="font-ui text-[9px] text-[#ffd23c]">+{level - 1}</span>}</div>
                <div className="font-ui text-[9px] text-[#9a917f] mt-0.5">{rc.name} · Công +{fmt(Math.round(def.baseAtk * (1 + 0.3 * (level - 1))))}</div>
              </div>
              {isEq && <span className="font-ui text-[8px] font-bold text-[#3fe0b0]">ĐANG DÙNG</span>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ============ PAUSE ============
export function PauseModal({ engine, muted, onTitle }: { engine: GameIdle; muted: boolean; onTitle: () => void }) {
  return (
    <Modal title="TẠM DỪNG" accent="#8fa3b8" onClose={() => engine.togglePause()}>
      <div className="flex flex-col gap-2.5">
        <button className="btn-blade primary" onClick={() => engine.togglePause()}>
          <Svg d={ICONS.play} s={15} c="#ff3b52" /> TIẾP TỤC CHIẾN ĐẤU
        </button>
        <button className="btn-blade" onClick={() => engine.toggleMute()}>
          <Svg d={ICONS.sound} s={15} c="#8fa3b8" /> ÂM THANH: {muted ? 'TẮT' : 'BẬT'}
        </button>
        <button className="btn-blade" onClick={() => { engine.togglePause(); dispatchOpen('skin'); }}>
          <Svg d={ICONS.sword} s={15} c="#c2172f" /> TỦ ĐỒ SKIN
        </button>
        <button className="btn-blade" onClick={onTitle}>
          <Svg d={ICONS.close} s={14} c="#8fa3b8" /> VỀ MÀN HÌNH CHÍNH
        </button>
        <p className="font-ui text-[10px] text-[#6a6378] text-center mt-1">P / Esc — tạm dừng · M — tắt tiếng · Tiến trình tự động lưu</p>
      </div>
    </Modal>
  );
}
