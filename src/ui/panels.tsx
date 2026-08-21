import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type {
  AchStatId, ChibiLook, CompanionStats, DungeonMode, GachaResult, MetaInfo, OfflineReport, Pos,
  Rarity, RuneId, ShopRow, QuestRow, WeaponDef,
} from '../game/engine';
import {
  ACHIEVEMENTS, ACH_GROUPS, ACH_RANKS, ACH_TOTAL, rankOfTier,
  BAL, COMPANIONS, GACHA_COST, GACHA_X10_COST, GACHA_X100_COST, GACHA_X500_COST, ITEMS,
  MAX_ITEM_SLOTS, MAX_PARTY, RARITY, RUNES, SKINS, TOTAL_FLOORS, WAVES_PER_FLOOR,
  WEAPONS, WEAPON_MERGE, WEAPON_TYPES, WGACHA_COST, WGACHA_X10_COST, WGACHA_X100_COST, EVO_EVERY,
  WTIER, WTIER_ORDER, WEAPON_SKINS_DEF, DUNGEON_MODES, dungeonModeDef,
  fmt, hasBossOnFloor, renderPortrait, weaponTypeDef, zoneOf,
} from '../game/engine';
import type { GameIdle } from '../game/engine';

export type PanelId =
  | 'none' | 'summon' | 'party' | 'equip' | 'skin' | 'weapon' | 'pause' | 'prestige' | 'kael'
  | 'daily' | 'achievement' | 'shop' | 'quest';

// ============ nguyên thủy dùng chung ============

const Svg = ({ d, s = 15, c = 'currentColor' }: { d: string; s?: number; c?: string }): React.JSX.Element => (
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
  shield: 'M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3z',
  flame: 'M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.3-4.2C8.8 8.6 9 10 10 10c0-3 2-5.5 2-8z',
  anvil: 'M3 7h6l2 3h7a4 4 0 0 1-4 4h-1l2 4H7l2-4H8a5 5 0 0 1-5-5V7z',
  seal: 'M12 1.6 14.6 7l5.9.9-4.3 4.1 1 5.9L12 15.1 6.8 17.9l1-5.9L3.5 7.9 9.4 7 12 1.6z',
  chevron: 'M9.4 6 8 7.4 12.6 12 8 16.6 9.4 18l6-6-6-6z',
  lock: 'M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zM9 7a3 3 0 0 1 6 0v2H9V7z',
  calendar: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zM5 9h14v10H5V9z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  trophy: 'M18 3h3v4a4 4 0 0 1-4 4h-.6A5 5 0 0 1 13 13.9V17h3v2H8v-2h3v-3.1A5 5 0 0 1 7.6 11H7a4 4 0 0 1-4-4V3h3V2h12v1zM5 5v2a2 2 0 0 0 1 1.7V5H5zm14 0h-1v3.7A2 2 0 0 0 19 7V5z',
  cloth: 'M9 2 5 4 3 9l3 1.4V22h12V10.4L21 9l-2-5-4-2a3 3 0 0 1-6 0z',
  cart: 'M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM6.2 6h15L19 14H8L6.2 6zM2 2h3l.9 4H4.3L2 2z',
  scroll: 'M6 2h12a2 2 0 0 1 2 2v3h-3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1 5h8v2H7V7zm0 4h8v2H7v-2zm0 4h5v2H7v-2z',
  skull: 'M12 2a8 8 0 0 0-8 8v4l2 2v3a1 1 0 0 0 1 1h2v-3h2v3h2v-3h2v3h2a1 1 0 0 0 1-1v-3l2-2v-4a8 8 0 0 0-8-8zM9 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
};

/** Chân dung nhân vật vẽ trên canvas. Chỉ chạy vòng lặp khi thật sự cần động. */
function Portrait({ look, size, animate = false, action = 'idle' }: {
  look: ChibiLook; size: number; animate?: boolean; action?: 'idle' | 'attack';
}): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(look);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const L = JSON.parse(key) as ChibiLook;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(size * 0.86 * dpr);
    const H = Math.round(size * dpr);
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    if (!animate) { renderPortrait(cv, L, 0.85, action); return; }
    let raf = 0;
    const t0 = performance.now();
    const loop = (): void => {
      renderPortrait(cv, L, (performance.now() - t0) / 1000, action);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [key, size, animate, action]);
  return <canvas ref={ref} style={{ width: Math.round(size * 0.86), height: size, display: 'block' }} />;
}

function PortraitFrame({ look, size, ring, animate = false, className = '' }: {
  look: ChibiLook; size: number; ring: string; animate?: boolean; className?: string;
}): React.JSX.Element {
  return (
    <div
      className={`relative shrink-0 overflow-hidden flex items-end justify-center ${className}`}
      style={{
        width: Math.round(size * 0.86), height: size, borderRadius: 8,
        background: `radial-gradient(circle at 50% 30%, ${ring}33, #120e1c 76%)`,
        border: `1.5px solid ${ring}`,
        boxShadow: `0 0 14px ${ring}44, inset 0 -10px 20px rgba(0,0,0,.6)`,
      }}
    >
      <Portrait look={look} size={size - 4} animate={animate} />
      <div
        className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }}
      />
    </div>
  );
}

const ITEM_LOOK: ChibiLook = {
  hair: '#ffd23c', outfit: '#8a6a1e', outfit2: '#4e3c10', skin: '#f0d8a8', eyes: '#8a5a1e',
  hairStyle: 'none', weapon: 'none', accessory: 'crown', aura: '#ffb43c',
};
function lookOfResult(r: GachaResult): ChibiLook {
  if (r.kind === 'companion') return COMPANIONS.find((c) => c.id === r.id)?.look ?? SKINS[0].look;
  if (r.kind === 'skin') return SKINS.find((s) => s.id === r.id)?.look ?? SKINS[0].look;
  return ITEM_LOOK;
}

function Stars({ r }: { r: Rarity }): React.JSX.Element {
  return (
    <span className="inline-flex gap-[1px]" style={{ color: RARITY[r].color }}>
      {Array.from({ length: RARITY[r].stars }).map((_, i) => <Svg key={i} d={ICONS.star} s={9} />)}
    </span>
  );
}

const POS_META: Record<Pos, { label: string; color: string }> = {
  front: { label: 'TIỀN PHONG', color: '#ff8a5a' },
  mid: { label: 'TRUNG QUÂN', color: '#ffd23c' },
  back: { label: 'HẬU QUÂN', color: '#8cdcff' },
};
function PosBadge({ pos }: { pos: Pos }): React.JSX.Element {
  const m = POS_META[pos];
  return (
    <span className="hk-tag" style={{ color: m.color, border: `1px solid ${m.color}55`, background: `${m.color}14` }}>
      {m.label}
    </span>
  );
}

function Meter({ pct, color, h = 6, track, className = '', sharp = false }: {
  pct: number; color: string; h?: number; track?: string; className?: string; sharp?: boolean;
}): React.JSX.Element {
  return (
    <div className={`hk-meter ${sharp ? 'sharp' : ''} ${className}`} style={{ height: h, background: track }}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct * 100))}%`, background: color }} />
    </div>
  );
}

function Modal({ title, subtitle, accent = '#ff3b52', onClose, children, wide = false, footer }: {
  title: string; subtitle?: string; accent?: string; onClose: () => void;
  children: ReactNode; wide?: boolean; footer?: ReactNode;
}): React.JSX.Element {
  useEffect(() => {
    const h = (e: KeyboardEvent): void => { if (e.code === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,3,8,0.8)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`hk-panel hk-cut-lg relative w-full ${wide ? 'max-w-[830px]' : 'max-w-[520px]'} max-h-[500px] flex flex-col anim-fade-up`}
        style={{ borderColor: `${accent}55` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header
          className="flex items-center justify-between gap-3 px-5 py-2.5 shrink-0"
          style={{ borderBottom: `1px solid ${accent}33`, background: `linear-gradient(90deg, ${accent}1c, transparent)` }}
        >
          <div className="min-w-0">
            <h2 className="font-display text-xl leading-none tracking-wide truncate" style={{ color: accent, textShadow: `0 0 16px ${accent}55` }}>
              {title}
            </h2>
            {subtitle && <p className="font-ui text-[10px] text-[var(--color-bone-dim)] mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-[var(--color-bone-dim)] hover:text-[var(--color-blood-lit)] transition-colors cursor-pointer shrink-0" aria-label="Đóng">
            <Svg d={ICONS.close} s={18} />
          </button>
        </header>
        <div className="overflow-y-auto p-4 min-h-0 flex-1">{children}</div>
        {footer && <footer className="px-4 py-2.5 shrink-0" style={{ borderTop: `1px solid ${accent}22` }}>{footer}</footer>}
      </div>
    </div>
  );
}

export function dispatchOpen(which: Exclude<PanelId, 'none'>): void {
  window.dispatchEvent(new CustomEvent('hk-open-panel', { detail: which }));
}

// ============ HUD ============

export function HudOverlay({ meta, engine }: { meta: MetaInfo; engine: GameIdle }): React.JSX.Element {
  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontSize: 12 }}>
      <FloorCard meta={meta} />
      <PartyStrip party={meta.party} legion={meta.legionCount} />
      <ResourceRail meta={meta} />
      {meta.hud.inBoss && meta.hud.bossMaxHp > 0 && <BossBar meta={meta} />}
      <ComboBadge meta={meta} />
      <KaelCard meta={meta} />
      <BannerLayer banner={meta.banner} />
      <ToastStack toasts={meta.toasts} />
      <DockBar meta={meta} engine={engine} />
    </div>
  );
}

function FloorCard({ meta }: { meta: MetaInfo }): React.JSX.Element {
  const h = meta.hud;
  const zone = zoneOf(h.floor);
  const bossFloor = hasBossOnFloor(h.floor);
  return (
    <div className="absolute top-3 left-3 hk-glass hk-cut-md px-3 py-2 w-[262px]">
      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="font-display text-[19px] leading-none" style={{ color: h.inBoss ? '#ff3b52' : '#ece4d2' }}>
          {h.floor >= TOTAL_FLOORS ? `VỰC ${h.floor - TOTAL_FLOORS + 1}` : `TẦNG ${h.floor + 1}`}
        </span>
        {h.floor < TOTAL_FLOORS && (
          <span className="num text-[10px] text-[var(--color-bone-faint)]">/{TOTAL_FLOORS}</span>
        )}
        <span className="font-body text-[10px] text-[var(--color-bone-dim)] ml-auto truncate max-w-[150px]">
          {h.floorName}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="font-ui text-[9px] font-bold tracking-widest truncate" style={{ color: zone.accent }}>
          {zone.name.toUpperCase()}
        </span>
        {/* Độ khó chỉ có hiệu lực trong Vực Vô Tận, nên chỉ dán nhãn ở đó —
            hiện ở 100 tầng đầu sẽ khiến người chơi tưởng nó đang tác động. */}
        {h.floor >= TOTAL_FLOORS && meta.mode !== 'normal' && (
          <span
            className="hk-tag ml-auto shrink-0"
            style={{
              color: dungeonModeDef(meta.mode).color,
              border: `1px solid ${dungeonModeDef(meta.mode).color}66`,
              background: `${dungeonModeDef(meta.mode).color}18`,
            }}
            title={dungeonModeDef(meta.mode).desc}
          >
            {dungeonModeDef(meta.mode).short.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        {Array.from({ length: WAVES_PER_FLOOR }).map((_, i) => {
          const done = h.wave > i + 1 || (h.wave === i + 1 && h.inBoss);
          const current = h.wave === i + 1 && !h.inBoss;
          const last = i === WAVES_PER_FLOOR - 1;
          const color = last && bossFloor
            ? (h.inBoss ? '#ff3b52' : done ? '#ff3b52' : '#5a2030')
            : done ? zone.accent : current ? zone.accent : '#2c2738';
          return (
            <span
              key={i}
              title={last && bossFloor ? 'Boss' : `Đợt ${i + 1}`}
              style={{
                width: last ? 12 : 9, height: last ? 12 : 9,
                background: color,
                opacity: done || current ? 1 : 0.55,
                transform: `rotate(45deg) scale(${current ? 1.25 : 1})`,
                transition: 'all .2s ease',
                boxShadow: current ? `0 0 8px ${color}` : 'none',
                borderRadius: 1,
              }}
            />
          );
        })}
        <span className="font-ui text-[9px] font-bold text-[var(--color-bone-faint)] ml-auto tracking-wider">
          {h.inBoss ? 'BOSS CHIẾN' : `ĐỢT ${h.wave}/${WAVES_PER_FLOOR}`}
        </span>
      </div>
    </div>
  );
}

function ResourceRail({ meta }: { meta: MetaInfo }): React.JSX.Element {
  const h = meta.hud;
  const rows: Array<{ v: string; label: string; color: string; icon: string }> = [
    { v: fmt(h.gold), label: 'VÀNG', color: '#ffd23c', icon: ICONS.coin },
    { v: fmt(h.gems), label: 'NGỌC', color: '#ff4fd8', icon: ICONS.gem },
    { v: fmt(h.power), label: 'LỰC CHIẾN', color: '#ff8a5a', icon: ICONS.bolt },
  ];
  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
      {rows.map((r) => (
        <div key={r.label} className="hk-glass hk-cut-sm flex items-center gap-2 pl-2 pr-2.5 py-1 w-[168px]">
          <Svg d={r.icon} s={13} c={r.color} />
          <span className="num text-[15px] leading-none" style={{ color: r.color }}>{r.v}</span>
          <span className="font-ui text-[8px] font-bold text-[var(--color-bone-faint)] tracking-widest ml-auto">{r.label}</span>
        </div>
      ))}
      {meta.seals > 0 && (
        <div className="hk-glass hk-cut-sm flex items-center gap-2 pl-2 pr-2.5 py-1 w-[168px]" title="Huyết Ấn — hệ số nhân vĩnh viễn từ Thăng Hoa">
          <Svg d={ICONS.seal} s={13} c="#a78bfa" />
          <span className="num text-[15px] leading-none text-[#a78bfa]">×{meta.sealMul.toFixed(2)}</span>
          <span className="font-ui text-[8px] font-bold text-[var(--color-bone-faint)] tracking-widest ml-auto">{meta.seals} ẤN</span>
        </div>
      )}
    </div>
  );
}

function BossBar({ meta }: { meta: MetaInfo }): React.JSX.Element {
  const h = meta.hud;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[420px] anim-fade-up">
      <div className="hk-glass hk-cut-md px-4 py-2" style={{ borderColor: 'rgba(255,59,82,0.55)' }}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-[15px] leading-none text-[#ff3b52] truncate" style={{ textShadow: '0 0 14px rgba(255,59,82,.6)' }}>
            {h.bossName}
          </span>
          <span className="num text-[10px] text-[var(--color-bone-dim)] shrink-0">
            {fmt(h.bossHp)} / {fmt(h.bossMaxHp)}
          </span>
        </div>
        <div className="mt-1.5 relative">
          <Meter pct={h.bossHpPct} color="linear-gradient(90deg,#ff5a6a,#8a1020)" h={11} sharp />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'repeating-linear-gradient(90deg, transparent 0 24px, rgba(0,0,0,.35) 24px 25px)' }}
          />
        </div>
      </div>
    </div>
  );
}

function ComboBadge({ meta }: { meta: MetaInfo }): React.JSX.Element | null {
  const { combo, comboPct } = meta.hud;
  if (combo < 3) return null;
  const tier = combo >= 40 ? '#ff4fd8' : combo >= 20 ? '#ff3b52' : combo >= 10 ? '#ff9a3c' : '#ffd23c';
  const bonus = Math.min(combo, BAL.COMBO_MAX) * 2;
  return (
    <div className="absolute left-3 top-[168px] w-[210px]" key={combo}>
      <div className="anim-combo origin-left" style={{ transform: 'rotate(-4deg)' }}>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="font-display leading-none" style={{ fontSize: 32, color: tier, textShadow: `0 0 18px ${tier}, 0 3px 0 #1a0a12` }}>
            {combo}
          </span>
          <span className="font-display leading-none" style={{ fontSize: 14, color: tier, textShadow: '0 2px 6px #000' }}>
            LIÊN TRẢM
          </span>
        </div>
        <div className="font-ui text-[9px] font-bold mt-0.5" style={{ color: tier }}>+{bonus}% VÀNG</div>
        <Meter pct={comboPct} color={tier} h={3} className="mt-1 w-[92px]" />
      </div>
    </div>
  );
}

function KaelCard({ meta }: { meta: MetaInfo }): React.JSX.Element {
  const skin = SKINS.find((s) => s.id === meta.equippedSkin) ?? SKINS[0];
  const xpPct = meta.kaelXpNext > 0 ? meta.kaelXp / meta.kaelXpNext : 0;
  const rage = meta.hud.rage;
  const rageFull = rage >= 0.999;
  const look = { ...skin.look, aura: meta.evo.aura, evoTier: meta.evo.stage };
  return (
    <button
      className="absolute bottom-3 left-3 flex items-end gap-2.5 pointer-events-auto text-left cursor-pointer transition-transform hover:-translate-y-0.5"
      onClick={() => dispatchOpen('kael')}
      title="Mở bảng Kael — Tiến Hoá, Ngọc Huyết, Hồ Sơ"
    >
      <ProfileFrame frame={meta.title.frame} glow={meta.title.glow} ornament={meta.title.ornament} size={62}>
        <div className="w-full h-full flex items-end justify-center">
          <Portrait look={look} size={60} animate />
        </div>
      </ProfileFrame>
      <div className="pb-0.5">
        <div className="font-display text-[17px] leading-none text-[var(--color-bone)]" style={{ textShadow: '0 2px 8px #000' }}>
          KAEL <span className="num text-[11px] text-[#ffd23c]">Lv {meta.kaelLevel}</span>
        </div>
        <div className="font-ui text-[9px] font-bold tracking-wider mt-0.5 flex items-center gap-1.5">
          <span style={{ color: meta.title.frame, textShadow: '0 1px 4px #000' }}>{meta.title.title}</span>
          <span style={{ color: meta.evo.aura }}>· TH{meta.evo.stage}</span>
        </div>
        <div className="w-[168px] mt-1">
          <Meter pct={xpPct} color="linear-gradient(90deg,#c2172f,#ff9a3c)" h={5} />
          <div className="flex justify-between font-ui text-[8px] text-[var(--color-bone-faint)] mt-0.5 tracking-wide">
            <span>KINH NGHIỆM</span>
            <span className="num">{fmt(meta.kaelXp)}/{fmt(meta.kaelXpNext)}</span>
          </div>
        </div>
        <div className={`w-[168px] mt-1 ${rageFull ? 'anim-rage-full rounded-full' : ''}`}>
          <Meter pct={rage} color={rageFull ? '#ff3b52' : 'linear-gradient(90deg,#8a1020,#ff3b52)'} h={7} />
          <div className="flex justify-between font-ui text-[8px] mt-0.5 tracking-wide">
            <span className={rageFull ? 'text-[#ff3b52] font-bold' : 'text-[var(--color-bone-faint)]'}>
              {rageFull ? 'HUYẾT NGUYỆT TRẢM!' : 'NỘ KHÍ'}
            </span>
            <span className="num text-[var(--color-bone-faint)]">{Math.floor(rage * 100)}%</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/** Bảng điểm danh đồng hành — nằm ngay dưới thẻ tầng, tránh vùng chiến đấu. */
function PartyStrip({ party, legion }: { party: MetaInfo['party']; legion: number }): React.JSX.Element | null {
  if (party.length === 0) return null;
  return (
    <div className="absolute left-3 top-[96px] flex items-end gap-1 w-[262px] flex-wrap">
      {party.slice(0, 12).map((p) => {
        const rc = RARITY[p.rarity];
        return (
          <div key={p.id} className="w-[22px]" title={`${p.name} · Lv ${p.level}`}>
            <div
              className="h-[22px] flex items-center justify-center font-display text-[11px]"
              style={{
                background: `linear-gradient(160deg, ${rc.color}30, #100c18)`,
                border: `1px solid ${p.hpPct > 0 ? rc.color : '#3a3346'}`,
                color: p.hpPct > 0 ? rc.color : '#4c4459',
                borderRadius: 3,
                filter: p.hpPct > 0 ? 'none' : 'grayscale(1)',
              }}
            >
              {p.name[0]}
            </div>
            <Meter pct={p.hpPct} color={p.hpPct > 0.35 ? '#3fe0b0' : '#ff3b52'} h={2} className="mt-[2px]" sharp />
          </div>
        );
      })}
      {legion > 0 && (
        <div
          className="h-[22px] px-1 flex items-center font-ui text-[9px] font-bold text-[#b8a0ff]"
          style={{ border: '1px solid #b8a0ff55', background: 'rgba(184,160,255,.1)', borderRadius: 3 }}
          title={`${legion} đồng hành tiếp viện — tập kích định kỳ`}
        >
          +{legion}
        </div>
      )}
    </div>
  );
}

function BannerLayer({ banner }: { banner: MetaInfo['banner'] }): React.JSX.Element | null {
  if (!banner) return null;
  return (
    <div key={banner.key} className="absolute inset-x-0 top-[132px] flex flex-col items-center text-center px-16">
      <div className="anim-banner" style={{ '--dur': `${banner.life}s` } as CSSProperties}>
        <div
          className="font-display leading-none"
          style={{ fontSize: 42, color: banner.color, textShadow: `0 0 28px ${banner.color}, 0 3px 0 #14060e, 0 0 76px ${banner.color}55` }}
        >
          {banner.main}
        </div>
        <div className="font-ui text-[12px] font-bold tracking-[0.2em] mt-1.5 text-[var(--color-bone)]" style={{ textShadow: '0 2px 10px #000' }}>
          {banner.sub}
        </div>
      </div>
    </div>
  );
}

/**
 * Thông báo xếp dọc ở cạnh phải, dưới cụm tài nguyên.
 * Trước đây chúng nằm giữa màn hình và che mất băng-rôn Tiến Hoá / Boss —
 * hai thứ hay xuất hiện cùng lúc nhất.
 */
function ToastStack({ toasts }: { toasts: MetaInfo['toasts'] }): React.JSX.Element {
  return (
    <div className="absolute right-3 top-[152px] flex flex-col items-end gap-1 max-w-[280px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-toast hk-glass hk-cut-sm px-2.5 py-1 font-ui text-[10.5px] font-bold text-right"
          style={{ color: t.color, borderColor: `${t.color}55`, opacity: Math.min(1, t.life) }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Chấm số đỏ trên nút dock — thứ duy nhất được phép nhấp nháy trong HUD. */
function DockBadge({ n, color }: { n: number; color: string }): React.JSX.Element | null {
  if (n <= 0) return null;
  return (
    <span
      className="anim-badge num text-[9px] px-1 rounded-sm leading-[1.5]"
      style={{ background: color, color: '#0d0a14' }}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

/**
 * Bộ chọn độ khó Vực Vô Tận.
 * Cố ý là ba nút rời chứ không phải một nút xoay vòng: đổi độ khó sẽ dọn sân
 * và khởi động lại tầng, nên người chơi phải chọn đúng thứ mình muốn ngay
 * lần bấm đầu, không được lỡ tay đi qua Evil.
 */
function ModePicker({ meta, engine }: { meta: MetaInfo; engine: GameIdle }): React.JSX.Element | null {
  if (!meta.modesUnlocked) return null;
  return (
    <div className="flex items-stretch gap-[3px]">
      {DUNGEON_MODES.map((m) => {
        const on = meta.mode === m.id;
        return (
          <button
            key={m.id}
            className="hk-dock"
            style={{
              padding: '5px 8px', fontSize: 10,
              borderColor: on ? m.color : '#3a3350',
              color: on ? m.color : '#8f8aa0',
              background: on ? `${m.color}1c` : undefined,
              boxShadow: on ? `0 0 12px ${m.color}44` : undefined,
            }}
            onClick={() => engine.setDungeonMode(m.id as DungeonMode)}
            title={m.desc}
          >
            {m.id === 'normal' ? <Svg d={ICONS.shield} s={11} c={on ? m.color : '#8fa3b8'} />
              : m.id === 'hard' ? <Svg d={ICONS.flame} s={11} c={on ? m.color : '#8fa3b8'} />
                : <Svg d={ICONS.skull} s={11} c={on ? m.color : '#8fa3b8'} />}
            {m.short.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

function DockBar({ meta, engine }: { meta: MetaInfo; engine: GameIdle }): React.JSX.Element {
  const canPrestige = meta.canPrestige;
  const dailyReady = meta.daily.canClaim;
  const achReady = meta.ach.claimable;
  const questReady = meta.quests.claimable + meta.quests.claimableTiers;
  return (
    <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1.5 pointer-events-auto">
      {/* độ khó Vực Vô Tận — chỉ hiện sau khi dọn trọn 100 tầng */}
      <ModePicker meta={meta} engine={engine} />
      {/* hàng tiện ích — chỉ biểu tượng, gọn để chừa chỗ cho sân khấu */}
      <div className="flex items-stretch gap-1.5">
        <button
          className="hk-dock"
          style={{
            borderColor: dailyReady ? '#7dff5a' : '#3a3350',
            color: dailyReady ? '#c8ffb0' : '#ece4d2',
            padding: '5px 10px', fontSize: 11,
            boxShadow: dailyReady ? '0 0 16px rgba(125,255,90,0.35)' : undefined,
          }}
          onClick={() => dispatchOpen('daily')}
          title={dailyReady ? 'Hôm nay chưa điểm danh — có quà đang chờ' : 'Lịch điểm danh tháng này'}
        >
          <Svg d={ICONS.calendar} s={12} c={dailyReady ? '#7dff5a' : '#8fa3b8'} />
          ĐIỂM DANH
          {dailyReady && <DockBadge n={1} color="#7dff5a" />}
        </button>
        <button
          className="hk-dock"
          style={{
            borderColor: achReady > 0 ? '#ffd23c' : '#3a3350',
            color: achReady > 0 ? '#ffeaa0' : '#ece4d2',
            padding: '5px 10px', fontSize: 11,
          }}
          onClick={() => dispatchOpen('achievement')}
          title={achReady > 0 ? `${achReady} thành tựu đang chờ nhận Ngọc` : `Bia thành tựu — ${meta.ach.claimed}/${meta.ach.total} mốc`}
        >
          <Svg d={ICONS.trophy} s={12} c={achReady > 0 ? '#ffd23c' : '#8fa3b8'} />
          THÀNH TỰU
          <DockBadge n={achReady} color="#ffd23c" />
        </button>
        <button
          className="hk-dock"
          style={{
            borderColor: questReady > 0 ? '#ff4fd8' : '#3a3350',
            color: questReady > 0 ? '#ffd6ec' : '#ece4d2',
            padding: '5px 10px', fontSize: 11,
            boxShadow: questReady > 0 ? '0 0 16px rgba(255,79,216,0.3)' : undefined,
          }}
          onClick={() => dispatchOpen('quest')}
          title={questReady > 0
            ? `${questReady} phần thưởng đang chờ nhận`
            : `Huyết Lệnh bậc ${meta.quests.level}/${meta.quests.maxLevel} — nhiệm vụ ngày và tuần`}
        >
          <Svg d={ICONS.scroll} s={12} c={questReady > 0 ? '#ff4fd8' : '#8fa3b8'} />
          HUYẾT LỆNH
          <DockBadge n={questReady} color="#ff4fd8" />
        </button>
        <button
          className="hk-dock"
          data-on={meta.farmMode}
          style={{
            borderColor: meta.farmMode ? '#8cdcff' : '#3a3350',
            color: meta.farmMode ? '#8cdcff' : '#ece4d2',
            padding: '5px 10px', fontSize: 11,
          }}
          onClick={() => engine.toggleFarmMode()}
          title="F — Trấn Giữ: lặp lại tầng hiện tại để tích luỹ thay vì đi xuống sâu"
        >
          <Svg d={ICONS.shield} s={12} c={meta.farmMode ? '#8cdcff' : '#8fa3b8'} />
          {meta.farmMode ? 'TRẤN GIỮ' : 'TIẾN CÔNG'}
        </button>
        <button
          className="hk-dock"
          style={{ borderColor: '#ffd23c66', padding: '5px 10px', fontSize: 11 }}
          onClick={() => engine.cycleSpeed()}
          title="Tốc độ trận đấu"
        >
          <Svg d={ICONS.bolt} s={12} c="#ffd23c" /> ×{meta.speed}
        </button>
        <button
          className="hk-dock"
          style={{ padding: '5px 9px' }}
          onClick={() => engine.toggleMute()}
          title="Âm thanh (M)"
          aria-label="Bật hoặc tắt âm thanh"
        >
          <Svg d={meta.muted ? ICONS.mute : ICONS.sound} s={13} c="#8fa3b8" />
        </button>
        <button
          className="hk-dock"
          style={{ borderColor: '#ff3b5266', padding: '5px 9px' }}
          onClick={() => engine.togglePause()}
          title="Tạm dừng (P)"
          aria-label="Tạm dừng"
        >
          <Svg d={ICONS.pause} s={12} c="#ff3b52" />
        </button>
      </div>
      {/* hàng chính */}
      <div className="flex items-stretch gap-1.5">
        <button className="hk-dock" style={{ borderColor: '#ff4fd888', color: '#ffd6ec' }} onClick={() => dispatchOpen('summon')}>
          <Svg d={ICONS.gem} s={14} c="#ff4fd8" /> TRIỆU HỒI
        </button>
        <button className="hk-dock" style={{ borderColor: '#3fb9ff88' }} onClick={() => dispatchOpen('party')}>
          <Svg d={ICONS.squad} s={14} c="#3fb9ff" /> ĐỘI HÌNH
        </button>
        <button className="hk-dock" style={{ borderColor: '#ffb43c88' }} onClick={() => dispatchOpen('equip')}>
          <Svg d={ICONS.bag} s={14} c="#ffb43c" /> TRANG BỊ
        </button>
        <button className="hk-dock" style={{ borderColor: '#ff8a5a88' }} onClick={() => dispatchOpen('weapon')}>
          <Svg d={ICONS.sword} s={14} c="#ff8a5a" /> VŨ KHÍ
        </button>
        <button className="hk-dock" style={{ borderColor: '#ffd23c88', color: '#ffeaa0' }} onClick={() => dispatchOpen('shop')}>
          <Svg d={ICONS.cart} s={14} c="#ffd23c" /> HUYẾT THỊ
        </button>
        <button
          className="hk-dock"
          style={{ borderColor: canPrestige ? '#a78bfa' : '#3a3350', color: canPrestige ? '#c9b6ff' : '#6f6780' }}
          onClick={() => dispatchOpen('prestige')}
          title={canPrestige ? `Sẵn sàng nhận ${meta.sealsPending} Huyết Ấn` : `Cần xuống sâu hơn tầng ${BAL.SEAL_MIN_FLOOR}`}
        >
          <Svg d={ICONS.seal} s={14} c={canPrestige ? '#a78bfa' : '#6f6780'} />
          THĂNG HOA
          {canPrestige && (
            <span className="num text-[10px] px-1 rounded-sm" style={{ background: '#a78bfa', color: '#140c22' }}>
              +{meta.sealsPending}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ============ TRIỆU HỒI ============

const PULLS: Array<{ n: 1 | 10 | 100 | 500; cost: number; accent: string }> = [
  { n: 1, cost: GACHA_COST, accent: '#ff4fd8' },
  { n: 10, cost: GACHA_X10_COST, accent: '#ff4fd8' },
  { n: 100, cost: GACHA_X100_COST, accent: '#ffb43c' },
  { n: 500, cost: GACHA_X500_COST, accent: '#7dff5a' },
];

type GachaPhase = 'idle' | 'charge' | 'burst' | 'reveal';

const RARITY_RANK: Record<Rarity, number> = {
  common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4,
};
const bestRarityOf = (rs: GachaResult[]): Rarity =>
  rs.reduce<Rarity>((b, r) => (RARITY_RANK[r.rarity] > RARITY_RANK[b] ? r.rarity : b), 'common');

/** Màu trung tính lúc chưa "lộ bài" — người chơi chưa được đoán ra kết quả. */
const NEUTRAL_AURA = '#7a6aa8';

/**
 * Trận pháp triệu hồi. Nhận sẵn màu của độ hiếm cao nhất trong lượt quay và
 * chỉ hé lộ nó ở nửa sau pha nạp: khoảng lặng trước khi màu đổi chính là chỗ
 * hồi hộp của gacha, mất nó thì hoạt cảnh chỉ còn là thời gian chờ.
 */
function GachaStage({ phase, aura, rank }: {
  phase: GachaPhase; aura: string; rank: number;
}): React.JSX.Element {
  const charging = phase === 'charge';
  const bursting = phase === 'burst';
  const motes = 14;
  // Sức nổ tỉ lệ với độ hiếm. Nếu lượt Thường cũng nổ tung như lượt Thần
  // Thoại thì hoạt cảnh mất hết sức nặng — người chơi thôi không nhìn nữa.
  const rays = 8 + rank * 4;
  const shocks = 1 + Math.floor(rank / 2);
  const power = 0.34 + rank * 0.165;
  return (
    <div
      className={`gacha-stage ${bursting && rank >= 2 ? 'anim-shake' : ''}`}
      style={{
        ['--aura' as string]: aura,
        ['--heat' as string]: bursting ? 0.5 + power * 0.5 : charging ? 0.72 : 0.4,
      }}
    >
      {/* ba vòng trận pháp quay ngược chiều nhau */}
      <div className="gacha-ring" style={{ width: 232, height: 232, ['--spin' as string]: charging ? '5s' : '26s', borderStyle: 'dashed' }} />
      <div className="gacha-ring rev" style={{ width: 178, height: 178, ['--spin' as string]: charging ? '3.4s' : '18s' }} />
      <div
        className="gacha-ring"
        style={{
          width: 128, height: 128, ['--spin' as string]: charging ? '2.2s' : '12s',
          borderStyle: 'dotted', borderWidth: 2,
        }}
      />
      <svg
        viewBox="0 0 200 200"
        className="absolute"
        style={{ width: 210, height: 210, opacity: 0.55, animation: `slowSpin ${charging ? '8s' : '44s'} linear infinite reverse` }}
        aria-hidden="true"
      >
        <path d="M100 8 192 100 100 192 8 100z" fill="none" stroke={aura} strokeWidth="1" strokeDasharray="5 9" />
        <path d="M100 30 170 100 100 170 30 100z" fill="none" stroke={aura} strokeWidth="0.8" opacity="0.6" />
      </svg>

      {/* linh khí bị hút vào tâm */}
      {charging && Array.from({ length: motes }).map((_, i) => (
        <span key={i} className="mote-arm" style={{ ['--a' as string]: `${(360 / motes) * i + 7}deg` }}>
          <span
            className="mote"
            style={{
              ['--r' as string]: `${132 + (i % 4) * 22}px`,
              ['--dur' as string]: `${0.85 + (i % 5) * 0.12}s`,
              ['--delay' as string]: `${(i % 7) * 0.11}s`,
            }}
          />
        </span>
      ))}

      {/* lõi ngọc */}
      <svg viewBox="0 0 100 100" className={`gacha-core ${bursting ? 'swell' : ''}`} style={{ width: 62, height: 62 }} aria-hidden="true">
        <path d="M50 2 68 36 98 50 68 64 50 98 32 64 2 50 32 36z" fill={aura} opacity="0.92" />
        <path d="M50 20 60 42 80 50 60 58 50 80 40 58 20 50 40 42z" fill="#fff" opacity="0.9" />
      </svg>

      {/* pha vỡ */}
      {bursting && (
        <>
          <span className="gacha-flash" style={{ ['--pw' as string]: power }} />
          {Array.from({ length: shocks }).map((_, i) => (
            <span key={i} className="gacha-shock" style={{ ['--delay' as string]: `${i * 0.1}s` }} />
          ))}
          {Array.from({ length: rays }).map((_, i) => (
            <span
              key={i}
              className="gacha-ray"
              style={{ ['--a' as string]: `${(360 / rays) * i}deg`, ['--pw' as string]: power }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** Vài đốm sáng lượn quanh những tấm bài hiếm. */
function CardSparks({ color, n = 5 }: { color: string; n?: number }): React.JSX.Element {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="card-spark"
          style={{
            left: `${12 + (i * 73) % 76}%`,
            bottom: `${18 + (i * 37) % 54}%`,
            ['--rc' as string]: color,
            ['--dur' as string]: `${1.3 + (i % 3) * 0.35}s`,
            ['--delay' as string]: `${i * 0.28}s`,
          }}
        />
      ))}
    </>
  );
}

export function SummonModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const [results, setResults] = useState<GachaResult[] | null>(null);
  const [phase, setPhase] = useState<GachaPhase>('idle');
  /** Đã hé lộ màu của độ hiếm cao nhất chưa. */
  const [revealedAura, setRevealedAura] = useState(false);
  const timers = useRef<number[]>([]);
  /** Kết quả đã quay xong nhưng chưa cho xem — giữ ngoài state để nút Bỏ Qua dùng lại. */
  const pending = useRef<GachaResult[] | null>(null);

  const clearTimers = (): void => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const after = (ms: number, fn: () => void): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const showResults = (): void => {
    clearTimers();
    if (pending.current) setResults(pending.current);
    pending.current = null;
    setPhase('reveal');
  };

  const roll = (times: 1 | 10 | 100 | 500): void => {
    if (phase === 'charge' || phase === 'burst') return;
    // Quay NGAY rồi mới diễn hoạt cảnh: nhờ vậy trận pháp biết trước độ hiếm
    // cao nhất để đổi màu, và nút Bỏ Qua không bao giờ làm mất lượt.
    const res = engine.gacha(times);
    if (!res) return;
    clearTimers();
    pending.current = res;
    setResults(null);
    setRevealedAura(false);
    setPhase('charge');
    const chargeMs = times === 1 ? 1350 : 1750;
    after(chargeMs * 0.58, () => setRevealedAura(true));
    after(chargeMs, () => setPhase('burst'));
    after(chargeMs + 560, showResults);
  };

  const bestPending = pending.current ? bestRarityOf(pending.current) : null;
  const bestShown = results ? bestRarityOf(results) : null;
  const aura = phase === 'reveal' && bestShown
    ? RARITY[bestShown].color
    : revealedAura && bestPending
      ? RARITY[bestPending].color
      : NEUTRAL_AURA;
  const rank = bestPending ? RARITY_RANK[bestPending] : 1;
  const busy = phase === 'charge' || phase === 'burst';

  const summary = useMemo(() => {
    if (!results || results.length < 20) return null;
    const byRarity: Record<string, number> = { mythic: 0, legendary: 0, epic: 0, rare: 0, common: 0 };
    const byName = new Map<string, { r: GachaResult; n: number; isNew: boolean }>();
    for (const r of results) {
      byRarity[r.rarity] += 1;
      const k = `${r.kind}|${r.name}`;
      const e = byName.get(k);
      if (e) { e.n += 1; if (r.isNew) e.isNew = true; } else byName.set(k, { r, n: 1, isNew: r.isNew });
    }
    const ord: Record<string, number> = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
    const top = [...byName.entries()].sort(
      (a, b) => ord[b[1].r.rarity] - ord[a[1].r.rarity] || b[1].n - a[1].n,
    );
    return { byRarity, top };
  }, [results]);

  return (
    <Modal
      title="ĐÀI TRIỆU HỒI HUYẾT NGUYỆT"
      subtitle="Thần Thoại 1.5% · Huyền Thoại 4% · Cực Hiếm 12% · Hiếm 33% · Thường 49.5% — mỗi 10 lượt bảo hiểm ≥1 Cực Hiếm"
      accent="#ff4fd8"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-4 gap-2 flex-1">
            {PULLS.map((p) => (
              <button
                key={p.n}
                className="hk-btn lg solid justify-center"
                disabled={busy || meta.gems < p.cost}
                onClick={() => roll(p.n)}
                style={{ background: meta.gems >= p.cost ? p.accent : '#2c2738', color: meta.gems >= p.cost ? '#140c1c' : '#6f6780' }}
              >
                ×{p.n} — {fmt(p.cost)}
              </button>
            ))}
          </div>
          <div className="num text-[13px] text-[#ff4fd8] flex items-center gap-1.5 shrink-0 pl-2">
            <Svg d={ICONS.gem} s={13} c="#ff4fd8" /> {fmt(meta.gems)}
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        {busy && (
          <>
            <GachaStage phase={phase} aura={aura} rank={revealedAura ? rank : 1} />
            <div className="flex flex-col items-center gap-2 -mt-3">
              <div
                className="font-display text-[15px] tracking-[0.24em]"
                style={{ color: aura, textShadow: `0 0 16px ${aura}` }}
              >
                {phase === 'burst' ? 'ẤN KÝ VỠ RA' : revealedAura ? 'LINH KHÍ TỤ ĐỦ' : 'ĐANG DẪN LINH KHÍ…'}
              </div>
              <button onClick={showResults} className="hk-btn">BỎ QUA HOẠT CẢNH ▸▸</button>
            </div>
          </>
        )}

        {!busy && !results && (
          <div className="py-6">
            <GachaStage phase="idle" aura="#ff4fd8" rank={1} />
          </div>
        )}

        {phase === 'reveal' && bestShown && (
          <div
            className="anim-ribbon font-display text-[17px] mb-2"
            style={{ color: RARITY[bestShown].color, textShadow: `0 0 22px ${RARITY[bestShown].color}` }}
          >
            ★ {RARITY[bestShown].name.toUpperCase()} ★
          </div>
        )}

        {results && !summary && (
          <div className={`grid gap-2 w-full ${results.length > 1 ? 'grid-cols-5' : 'grid-cols-1 max-w-[220px] mx-auto'}`}>
            {results.map((r, i) => {
              const rc = RARITY[r.rarity];
              const big = results.length === 1;
              const shiny = r.rarity === 'epic' || r.rarity === 'legendary' || r.rarity === 'mythic';
              return (
                <div
                  key={i}
                  className={`card-in relative rounded-md p-2 flex flex-col items-center text-center ${shiny ? 'card-shine card-aura' : ''}`}
                  style={{
                    animationDelay: `${i * 70}ms`,
                    background: `linear-gradient(165deg, ${rc.color}26, #0d0a14 72%)`,
                    border: `1.5px solid ${rc.color}`,
                    ['--rc' as string]: rc.color,
                  }}
                >
                  {shiny && <CardSparks color={rc.color} n={big ? 9 : 4} />}
                  <PortraitFrame look={lookOfResult(r)} ring={rc.color} size={big ? 120 : 58} animate={big && shiny} />
                  <Stars r={r.rarity} />
                  <div className="font-display leading-tight mt-0.5" style={{ color: rc.color, fontSize: big ? 17 : 12 }}>{r.name}</div>
                  <div className="font-ui text-[9px] text-[var(--color-bone-faint)] leading-snug">
                    {r.kind === 'companion' ? 'Đồng hành' : r.kind === 'skin' ? 'Skin Kael' : 'Vật phẩm'}
                  </div>
                  <div className="font-ui text-[9px] font-bold mt-0.5" style={{ color: r.isNew ? '#3fe0b0' : '#ffd23c' }}>
                    {r.isNew ? 'MỚI!' : r.dupeText}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {results && summary && (
          <div className="w-full anim-fade-up">
            <div className="flex justify-center gap-2 flex-wrap mb-3">
              {(['mythic', 'legendary', 'epic', 'rare', 'common'] as const).map((rr) => (
                <div
                  key={rr}
                  className="hk-cut-sm px-3 py-1 text-center"
                  style={{ background: `${RARITY[rr].color}1c`, border: `1px solid ${RARITY[rr].color}66` }}
                >
                  <div className="font-display text-lg leading-none" style={{ color: RARITY[rr].color }}>{summary.byRarity[rr]}</div>
                  <div className="font-ui text-[8px] tracking-wider" style={{ color: RARITY[rr].color }}>{RARITY[rr].name.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1.5 max-h-[210px] overflow-y-auto pr-1">
              {summary.top.map(([k, { r, n, isNew }]) => {
                const rc = RARITY[r.rarity];
                return (
                  <div
                    key={k}
                    className="rounded-md p-1.5 flex flex-col items-center text-center"
                    style={{ background: `linear-gradient(165deg, ${rc.color}20, #0d0a14 76%)`, border: `1px solid ${rc.color}88` }}
                  >
                    <PortraitFrame look={lookOfResult(r)} ring={rc.color} size={44} />
                    <div className="font-display text-[10px] leading-tight mt-0.5 truncate w-full" style={{ color: rc.color }}>{r.name}</div>
                    <div className="font-ui text-[9px] font-bold" style={{ color: isNew ? '#3fe0b0' : '#ffd23c' }}>{isNew ? 'MỚI!' : `×${n}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============ ĐỘI HÌNH ============

type SortKey = 'power' | 'rarity' | 'level' | 'name';

export function PartyModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const [filter, setFilter] = useState<Rarity | 'all' | 'owned'>('owned');
  const [sort, setSort] = useState<SortKey>('power');
  const [bulk, setBulk] = useState<1 | 10 | 100 | 'max'>(10);

  const ownedCount = Object.keys(meta.ownedCompanions).length;
  const deployed = meta.deployedIds ?? COMPANIONS.filter((c) => (meta.ownedCompanions[c.id] ?? 0) > 0).map((c) => c.id);
  // Chưa có ai thì lọc "đang có" sẽ ra trang trắng — hiện toàn bộ danh sách
  // để người chơi thấy được mình đang hướng tới cái gì.
  const effFilter = filter === 'owned' && ownedCount === 0 ? 'all' : filter;

  const list = useMemo(() => {
    const ord: Record<Rarity, number> = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
    return COMPANIONS
      .filter((c) => {
        if (effFilter === 'all') return true;
        if (effFilter === 'owned') return (meta.ownedCompanions[c.id] ?? 0) > 0;
        return c.rarity === effFilter;
      })
      .map((c) => ({ c, st: engine.companionStats(c.id) }))
      .sort((a, b) => {
        const ao = (meta.ownedCompanions[a.c.id] ?? 0) > 0 ? 1 : 0;
        const bo = (meta.ownedCompanions[b.c.id] ?? 0) > 0 ? 1 : 0;
        if (ao !== bo) return bo - ao;
        if (sort === 'name') return a.c.name.localeCompare(b.c.name);
        if (sort === 'rarity') return ord[b.c.rarity] - ord[a.c.rarity];
        if (sort === 'level') return (meta.ownedCompanions[b.c.id] ?? 0) - (meta.ownedCompanions[a.c.id] ?? 0);
        return (b.st?.power ?? 0) - (a.st?.power ?? 0);
      });
  }, [effFilter, sort, meta.ownedCompanions, engine]);

  const bulkLabel = bulk === 'max' ? 'MAX' : `+${bulk}`;
  const doUpgrade = (id: string): void => {
    if (bulk === 'max') engine.upgradeCompanionMax(id);
    else engine.upgradeCompanionTimes(id, bulk);
  };

  return (
    <Modal
      title="ĐỘI HÌNH"
      subtitle={`${ownedCount} sở hữu · ${deployed.length}/${MAX_PARTY} ra trận · 12 mạnh nhất đứng sân, phần còn lại tiếp viện`}
      accent="#3fb9ff"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-ui text-[9px] text-[var(--color-bone-faint)] tracking-widest">MỖI LẦN</span>
            {([1, 10, 100, 'max'] as const).map((b) => (
              <button
                key={String(b)}
                onClick={() => setBulk(b)}
                className="hk-btn"
                style={bulk === b ? { background: '#ffd23c', color: '#140c1c', borderColor: 'transparent' } : undefined}
              >
                {b === 'max' ? 'MAX' : `+${b}`}
              </button>
            ))}
          </div>
          <button
            onClick={() => engine.upgradeAllCompanions()}
            disabled={ownedCount === 0}
            className="hk-btn lg solid"
            style={{ background: ownedCount > 0 ? '#3fe0b0' : '#2c2738', color: ownedCount > 0 ? '#0c1a16' : '#6f6780' }}
            title="Dồn Vàng để san bằng cấp cả đội — mỗi đồng vàng bỏ vào người thấp cấp đổi được nhiều lực chiến hơn"
          >
            <Svg d={ICONS.squad} s={13} c={ownedCount > 0 ? '#0c1a16' : '#6f6780'} /> NÂNG CẤP TOÀN ĐỘI
          </button>
          <div className="num text-[13px] text-[#ffd23c] flex items-center gap-1.5">
            <Svg d={ICONS.coin} s={13} c="#ffd23c" /> {fmt(meta.gold)}
          </div>
        </div>
      }
    >
      {/* Kael — luôn ở đầu vì đây là nơi tiêu vàng đáng giá nhất */}
      <div
        className="rounded-md p-2.5 mb-3 flex gap-3 items-center"
        style={{ background: 'linear-gradient(120deg, rgba(194,23,47,.18), #0d0a14 70%)', border: '1.5px solid #ff3b5288' }}
      >
        <PortraitFrame
          look={(SKINS.find((s) => s.id === meta.equippedSkin) ?? SKINS[0]).look}
          ring="#ff3b52"
          size={56}
        />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[16px] leading-none text-[#ff3b52]">
            KAEL <span className="num text-[11px] text-[#ffd23c]">Lv {meta.kaelLevel}</span>
          </div>
          <div className="font-ui text-[10px] text-[var(--color-bone-dim)] mt-1">
            <span className="text-[#ff8a5a] font-bold">{fmt(meta.kaelAtk)}</span> Công ·
            <span className="text-[#3fe0b0] font-bold"> {fmt(meta.kaelHp)}</span> Máu · Tiền phong
          </div>
          <div className="font-body text-[10px] text-[var(--color-bone-faint)] mt-0.5">
            Tôi luyện Kael để giữ nhịp với độ khó của tầng — sát thương và máu tăng {Math.round((BAL.LEVEL_POWER - 1) * 100)}% mỗi cấp.
          </div>
        </div>
        <button
          className="hk-btn lg solid"
          style={{ background: meta.gold >= meta.kaelUpgradeCost ? '#ff3b52' : '#2c2738', color: meta.gold >= meta.kaelUpgradeCost ? '#fff' : '#6f6780' }}
          disabled={meta.gold < meta.kaelUpgradeCost}
          onClick={() => engine.upgradeKael(bulk === 'max' ? 500 : bulk)}
        >
          TÔI LUYỆN {fmt(meta.kaelUpgradeCost)}
        </button>
      </div>

      {/* bộ lọc */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
        <div className="flex flex-wrap gap-1.5">
          {(['owned', 'all', 'mythic', 'legendary', 'epic', 'rare', 'common'] as const).map((f) => {
            const isR = f !== 'all' && f !== 'owned';
            const col = isR ? RARITY[f as Rarity].color : f === 'owned' ? '#3fe0b0' : '#ece4d2';
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="hk-btn"
                style={effFilter === f
                  ? { background: col, color: '#140c1c', borderColor: 'transparent' }
                  : { color: col, borderColor: `${col}55` }}
              >
                {f === 'all' ? 'TẤT CẢ' : f === 'owned' ? 'ĐANG CÓ' : RARITY[f as Rarity].name.toUpperCase()}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          {(['power', 'rarity', 'level', 'name'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="hk-btn"
              style={sort === s ? { background: '#3fb9ff', color: '#0d1620', borderColor: 'transparent' } : undefined}
            >
              {s === 'power' ? 'LỰC' : s === 'rarity' ? 'BẬC' : s === 'level' ? 'CẤP' : 'TÊN'}
            </button>
          ))}
          <button onClick={() => engine.deployAll()} className="hk-btn solid" style={{ background: '#3fe0b0' }}>CHỌN TẤT CẢ</button>
          <button onClick={() => engine.clearDeploy()} className="hk-btn">BỎ CHỌN</button>
        </div>
      </div>

      {ownedCount === 0 && (
        <div className="rounded-md p-3 mb-2.5 text-center font-body text-[11px] text-[var(--color-bone-dim)]"
          style={{ background: 'rgba(255,79,216,.08)', border: '1px dashed #ff4fd855' }}>
          Chưa có đồng hành nào. Mở <b className="text-[#ff4fd8]">ĐÀI TRIỆU HỒI</b> để chiêu mộ —
          dưới đây là toàn bộ {COMPANIONS.length} nhân vật có thể gặp.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {list.map(({ c, st }) => (
          <CompanionRow
            key={c.id}
            def={c}
            st={st}
            gold={meta.gold}
            bulkLabel={bulkLabel}
            bulkCost={engine.upgradeBulkCost(c.id, bulk === 'max' ? 1 : bulk)}
            onToggle={() => engine.toggleDeploy(c.id)}
            onUpgrade={() => doUpgrade(c.id)}
          />
        ))}
      </div>
    </Modal>
  );
}

function CompanionRow({ def, st, gold, bulkLabel, bulkCost, onToggle, onUpgrade }: {
  def: (typeof COMPANIONS)[number];
  st: CompanionStats | null;
  gold: number;
  bulkLabel: string;
  bulkCost: number;
  onToggle: () => void;
  onUpgrade: () => void;
}): React.JSX.Element {
  const rc = RARITY[def.rarity];
  const owned = (st?.level ?? 0) > 0;
  const inParty = st?.deployed ?? false;
  const affordable = gold >= bulkCost;
  return (
    <div
      className="relative rounded-md p-2 flex gap-2"
      style={{
        background: owned ? `linear-gradient(160deg, ${rc.color}18, #0c0a12 76%)` : 'rgba(18,15,26,0.55)',
        border: `1.5px solid ${owned ? (inParty ? rc.color : `${rc.color}44`) : '#241f33'}`,
        opacity: owned ? 1 : 0.55,
        boxShadow: inParty ? `0 0 12px ${rc.color}44` : 'none',
      }}
    >
      {owned && (
        <button
          onClick={onToggle}
          className="hk-btn absolute top-1.5 right-1.5 z-10"
          style={inParty
            ? { background: '#3fe0b0', color: '#0c1a16', borderColor: 'transparent' }
            : { color: '#a79d8c' }}
        >
          {inParty ? '✓ RA TRẬN' : 'CHỌN'}
        </button>
      )}
      <div className="relative">
        <PortraitFrame look={def.look} ring={rc.color} size={62} />
        {st?.fielded && (
          <span
            className="hk-tag absolute -bottom-1 left-1/2 -translate-x-1/2"
            style={{ background: '#3fe0b0', color: '#0c1a16' }}
          >
            SÂN
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap pr-16">
          <span className="font-display text-[14px] leading-none" style={{ color: owned ? rc.color : '#5c5470' }}>{def.name}</span>
          <Stars r={def.rarity} />
          {owned && <span className="num text-[10px] text-[#ffd23c]">Lv {st?.level}</span>}
        </div>
        <div className="font-ui text-[9px] text-[var(--color-bone-faint)] tracking-wide mt-0.5">
          {def.role} · {def.school} · {def.ranged ? 'Đánh xa' : 'Cận chiến'}
        </div>
        <div className="mt-1"><PosBadge pos={def.pos} /></div>
        <div className="mt-1 leading-snug">
          <span className="font-ui text-[10px] font-bold" style={{ color: rc.color }}>✦ {def.skill.name}</span>
          <span className="font-body text-[10px] text-[#b0a89c] ml-1">{def.skill.desc}</span>
        </div>
        {owned && st ? (
          <>
            <div className="grid grid-cols-4 gap-1 mt-1.5 font-ui text-[9px]">
              <Stat label="CÔNG" value={fmt(st.atk)} color="#ff8a5a" />
              <Stat label="MÁU" value={fmt(st.hp)} color="#3fe0b0" />
              <Stat label="C.MẠNG" value={`${Math.round(st.crit * 100)}%`} color="#ffd23c" />
              <Stat label="TỐC" value={st.aspd.toFixed(2)} color="#8cdcff" />
            </div>
            <button
              onClick={onUpgrade}
              disabled={!affordable}
              className="hk-btn solid w-full mt-1.5 justify-center"
              style={{ background: affordable ? '#ffd23c' : '#2c2738', color: affordable ? '#140c1c' : '#6f6780' }}
            >
              {bulkLabel} · {fmt(bulkCost)} vàng
            </button>
          </>
        ) : (
          <div className="font-ui text-[9px] text-[var(--color-bone-faint)] mt-1.5">Chưa sở hữu — hãy triệu hồi!</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }): React.JSX.Element {
  return (
    <div>
      <div className="text-[7.5px] text-[var(--color-bone-faint)] tracking-widest">{label}</div>
      <div className="num text-[11px] leading-none" style={{ color }}>{value}</div>
    </div>
  );
}

// ============ TRANG BỊ ============

export function EquipModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const totals = useMemo(() => {
    const t = { atk: 0, hp: 0, crit: 0, aspd: 0 };
    for (const id of meta.equippedItems) {
      const def = ITEMS.find((i) => i.id === id);
      const c = meta.ownedItems.find((o) => o.id === id)?.count ?? 0;
      if (!def || c <= 0) continue;
      t.atk += (def.bonus.atk ?? 0) * c;
      t.hp += (def.bonus.hp ?? 0) * c;
      t.crit += (def.bonus.crit ?? 0) * c;
      t.aspd += (def.bonus.aspd ?? 0) * c;
    }
    return t;
  }, [meta.equippedItems, meta.ownedItems]);

  return (
    <Modal
      title="TÚI ĐỒ — VẬT PHẨM"
      subtitle={`Trang bị tối đa ${MAX_ITEM_SLOTS} vật phẩm · mỗi bản sao cộng dồn phần trăm chỉ số`}
      accent="#ffb43c"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-4 gap-2 font-ui text-[10px]">
          <Stat label="TỔNG CÔNG" value={`+${Math.round(totals.atk * 100)}%`} color="#ff8a5a" />
          <Stat label="TỔNG MÁU" value={`+${Math.round(totals.hp * 100)}%`} color="#3fe0b0" />
          <Stat label="CHÍ MẠNG" value={`+${Math.round(totals.crit * 100)}%`} color="#ffd23c" />
          <Stat label="TỐC ĐÁNH" value={`+${Math.round(totals.aspd * 100)}%`} color="#8cdcff" />
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        {Array.from({ length: MAX_ITEM_SLOTS }).map((_, slot) => {
          const id = meta.equippedItems[slot];
          const def = ITEMS.find((i) => i.id === id);
          const count = meta.ownedItems.find((o) => o.id === id)?.count ?? 0;
          return (
            <div
              key={slot}
              className="rounded-md p-2 text-center min-h-[66px] flex flex-col items-center justify-center"
              style={{
                background: def ? 'linear-gradient(160deg, rgba(255,180,60,.14), #0d0a14)' : 'rgba(18,15,26,0.6)',
                border: def ? '1.5px solid #ffb43c88' : '1.5px dashed #3a3350',
              }}
            >
              {def ? (
                <>
                  <Svg d={ICONS.bag} s={16} c="#ffb43c" />
                  <div className="font-display text-[12px] text-[#ffb43c] leading-tight mt-1">{def.name}</div>
                  <div className="num text-[9px] text-[var(--color-bone-faint)] mt-0.5">×{count} bản sao</div>
                </>
              ) : (
                <div className="font-ui text-[10px] text-[var(--color-bone-faint)]">Ô trống {slot + 1}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        {ITEMS.map((it) => {
          const count = meta.ownedItems.find((o) => o.id === it.id)?.count ?? 0;
          const equipped = meta.equippedItems.includes(it.id);
          const has = count > 0;
          return (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-md px-3 py-2"
              style={{
                background: has ? 'rgba(255,180,60,0.07)' : 'rgba(18,15,26,0.45)',
                border: `1px solid ${has ? 'rgba(255,180,60,0.35)' : '#241f33'}`,
                opacity: has ? 1 : 0.5,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: has ? 'linear-gradient(160deg, rgba(255,180,60,.28), #14101c)' : '#14101c', border: '2px solid #ffb43c' }}
              >
                <Svg d={ICONS.bag} s={15} c="#ffb43c" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[13px] text-[var(--color-bone)] leading-none">
                  {it.name} {has && <span className="num text-[10px] text-[#ffd23c]">×{count}</span>}
                </div>
                <div className="font-ui text-[10px] text-[var(--color-bone-dim)] mt-0.5">{it.desc}</div>
              </div>
              {has && (
                <button
                  onClick={() => engine.equipItem(it.id)}
                  className="hk-btn"
                  style={equipped
                    ? { background: '#ffb43c', color: '#140c1c', borderColor: 'transparent' }
                    : { color: '#ffb43c', borderColor: '#ffb43c88' }}
                >
                  {equipped ? 'THÁO' : 'TRANG BỊ'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ============ SKIN ============

export function SkinModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const gachaSkins = meta.skins.filter((s) => s.source === 'gacha');
  const loginSkins = meta.skins.filter((s) => s.source === 'login');
  // Bộ mua ở Huyết Thị vẫn phải thay được từ tủ đồ: người chơi tìm trang phục
  // ở tủ đồ trước, không ai nghĩ tới chuyện mở lại cửa hàng chỉ để đổi đồ.
  const shopSkins = meta.skins.filter((s) => s.source === 'shop' && s.owned);
  const shards = meta.clothShards;
  const cost = meta.daily.shardCost;
  const forgedCount = loginSkins.filter((s) => s.owned).length;

  return (
    <Modal
      title="TỦ ĐỒ KAEL"
      subtitle="Trang phục chỉ đổi diện mạo — không ảnh hưởng chỉ số"
      accent="#c2172f"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Svg d={ICONS.cloth} s={15} c="#8cdcff" />
            <span className="num text-[15px] text-[#8cdcff]">{fmt(shards)}</span>
            <span className="font-ui text-[9px] tracking-widest text-[var(--color-bone-faint)]">MẢNH TRANG PHỤC</span>
          </div>
          <div className="font-ui text-[10px] text-[var(--color-bone-dim)]">
            Đã ghép <b className="text-[#8cdcff]">{forgedCount}</b>/{loginSkins.length} bộ điểm danh
          </div>
          <div className="num text-[13px] text-[#ff4fd8] flex items-center gap-1.5">
            <Svg d={ICONS.gem} s={13} c="#ff4fd8" /> {fmt(meta.gems)}
          </div>
        </div>
      }
    >
      {/* ---- Vân Cẩm Các: sáu bộ chỉ có từ điểm danh ---- */}
      <div
        className="rounded-md px-3 py-2 mb-2.5 flex items-center gap-3"
        style={{ background: 'linear-gradient(120deg, rgba(140,220,255,0.14), #0d0a14 72%)', border: '1.5px solid #8cdcff66' }}
      >
        <Svg d={ICONS.cloth} s={22} c="#8cdcff" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[15px] leading-none text-[#8cdcff]">VÂN CẨM CÁC</div>
          <div className="font-body text-[10px] text-[var(--color-bone-dim)] mt-1 leading-snug">
            Sáu bộ dưới đây <b className="text-[var(--color-bone)]">không quay và không mua được</b> —
            chỉ ghép từ Mảnh Trang Phục nhặt khi điểm danh. Đi đủ một tháng gom đúng {cost} mảnh, vừa tròn một bộ.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {loginSkins.map((s) => {
          const def = SKINS.find((x) => x.id === s.id);
          if (!def) return null;
          const ready = shards >= cost;
          const pct = Math.min(1, shards / cost);
          return (
            <div
              key={s.id}
              className="rounded-md p-2.5 flex flex-col items-center text-center"
              style={{
                background: s.equipped ? 'rgba(140,220,255,0.16)' : 'rgba(18,15,26,0.6)',
                border: `1.5px solid ${s.equipped ? '#8cdcff' : s.owned ? '#7a688c66' : '#241f33'}`,
                boxShadow: s.equipped ? '0 0 16px rgba(140,220,255,0.35)' : 'none',
              }}
            >
              {/* Bộ chưa ghép vẫn phải NHÌN THẤY được — đó chính là thứ kéo
                  người chơi quay lại mỗi ngày. Chỉ làm nhạt màu và gắn ổ khoá
                  ở góc, không phủ kín. */}
              <div className="relative">
                <div style={{ filter: s.owned ? 'none' : 'grayscale(0.45) brightness(0.68)' }}>
                  <PortraitFrame look={def.look} ring={def.look.aura} size={88} animate={s.equipped} />
                </div>
                {!s.owned && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center"
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: '#0d1620', border: '1px solid #8cdcff88',
                    }}
                  >
                    <Svg d={ICONS.lock} s={11} c="#8cdcff" />
                  </span>
                )}
              </div>
              <div className="font-display text-[12.5px] leading-tight mt-1.5" style={{ color: s.equipped ? '#8cdcff' : 'var(--color-bone)' }}>
                {s.name}
              </div>
              <div className="font-body text-[9px] text-[var(--color-bone-dim)] mt-1 leading-snug min-h-[24px]">{s.desc}</div>
              <div className="mt-1.5 w-full">
                {s.equipped ? (
                  <span className="font-ui text-[10px] font-bold text-[#8cdcff]">ĐANG MẶC</span>
                ) : s.owned ? (
                  <button onClick={() => engine.equipSkin(s.id)} className="hk-btn solid w-full justify-center" style={{ background: '#ece4d2' }}>MẶC</button>
                ) : (
                  <>
                    <Meter pct={pct} color="linear-gradient(90deg,#3fb9ff,#8cdcff)" h={4} className="mb-1" />
                    <button
                      onClick={() => engine.forgeSkin(s.id)}
                      disabled={!ready}
                      className="hk-btn w-full justify-center"
                      style={{ color: ready ? '#8cdcff' : '#6f6780', borderColor: ready ? '#8cdcff88' : '#241f33' }}
                    >
                      <Svg d={ready ? ICONS.cloth : ICONS.lock} s={10} c={ready ? '#8cdcff' : '#6f6780'} />
                      GHÉP {Math.min(shards, cost)}/{cost}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- bộ đã mua ở Huyết Thị ---- */}
      {shopSkins.length > 0 && (
        <>
          <div className="kicker text-[9px] text-[var(--color-bone-faint)] mb-1.5">HUYẾT THỊ — ĐÃ MUA</div>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {shopSkins.map((s) => {
              const def = SKINS.find((x) => x.id === s.id);
              if (!def) return null;
              const c = def.look.aura;
              return (
                <div
                  key={s.id}
                  className="rounded-md p-2.5 flex flex-col items-center text-center"
                  style={{
                    background: s.equipped ? `${c}22` : 'rgba(18,15,26,0.6)',
                    border: `1.5px solid ${s.equipped ? c : `${c}55`}`,
                    boxShadow: s.equipped ? `0 0 16px ${c}55` : 'none',
                  }}
                >
                  <PortraitFrame look={def.look} ring={c} size={88} animate={s.equipped} />
                  <div className="font-display text-[12.5px] leading-tight mt-1.5" style={{ color: s.equipped ? c : 'var(--color-bone)' }}>
                    {s.name}
                  </div>
                  <div className="font-body text-[9px] text-[var(--color-bone-dim)] mt-1 leading-snug min-h-[24px]">{s.desc}</div>
                  <div className="mt-1.5 w-full">
                    {s.equipped ? (
                      <span className="font-ui text-[10px] font-bold" style={{ color: c }}>ĐANG MẶC</span>
                    ) : (
                      <button onClick={() => engine.equipSkin(s.id)} className="hk-btn solid w-full justify-center" style={{ background: '#ece4d2' }}>MẶC</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ---- bộ quay/mua bằng Ngọc ---- */}
      <div className="kicker text-[9px] text-[var(--color-bone-faint)] mb-1.5">TRIỆU HỒI &amp; NGỌC</div>
      <div className="grid grid-cols-3 gap-2.5">
        {gachaSkins.map((s) => {
          const def = SKINS.find((x) => x.id === s.id);
          if (!def) return null;
          return (
            <div
              key={s.id}
              className="rounded-md p-2.5 flex flex-col items-center text-center"
              style={{
                background: s.equipped ? 'rgba(194,23,47,0.16)' : 'rgba(18,15,26,0.6)',
                border: `1.5px solid ${s.equipped ? '#ff3b52' : s.owned ? '#7a688c66' : '#241f33'}`,
                boxShadow: s.equipped ? '0 0 16px rgba(255,59,82,0.35)' : 'none',
              }}
            >
              <PortraitFrame look={def.look} ring={def.look.aura} size={88} animate={s.equipped} />
              <div className="font-display text-[12.5px] leading-tight mt-1.5" style={{ color: s.equipped ? '#ff3b52' : 'var(--color-bone)' }}>
                {s.name}
              </div>
              <div className="font-body text-[9px] text-[var(--color-bone-dim)] mt-1 leading-snug min-h-[24px]">{s.desc}</div>
              <div className="mt-1.5 w-full">
                {s.equipped ? (
                  <span className="font-ui text-[10px] font-bold text-[#ff3b52]">ĐANG MẶC</span>
                ) : s.owned ? (
                  <button onClick={() => engine.equipSkin(s.id)} className="hk-btn solid w-full justify-center" style={{ background: '#ece4d2' }}>MẶC</button>
                ) : (
                  <button
                    onClick={() => engine.buySkin(s.id)}
                    disabled={meta.gems < s.gemCost}
                    className="hk-btn w-full justify-center"
                    style={{ color: '#ff4fd8', borderColor: '#ff4fd888' }}
                  >
                    <Svg d={meta.gems < s.gemCost ? ICONS.lock : ICONS.gem} s={10} c="#ff4fd8" /> {fmt(s.gemCost)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ============ VŨ KHÍ ============

export function WeaponModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const [lastPull, setLastPull] = useState<Array<{ def: WeaponDef; isNew: boolean; merged: WeaponDef | null }> | null>(null);
  const equipped = engine.equippedWeaponDef();
  const owned = engine.getWeapons();
  const ownedById = new Map(owned.map((o) => [o.def.id, o]));
  const forge = (n: 1 | 10 | 100): void => {
    const r = engine.weaponGacha(n);
    // Rèn ×100 trả về 100 dòng — chỉ giữ lại phần đáng nhìn: mọi lần lột xác,
    // mọi món mới, rồi bù cho đủ 12 ô. Đổ hết 100 ô ra thì không ai đọc nổi.
    if (!r) return;
    if (r.length <= 12) { setLastPull(r); return; }
    const notable = r.filter((x) => x.merged || x.isNew);
    setLastPull([...notable, ...r.filter((x) => !x.merged && !x.isNew)].slice(0, 12));
  };
  const ws = meta.equippedWeaponSkin
    ? WEAPON_SKINS_DEF.find((w) => w.id === meta.equippedWeaponSkin)
    : undefined;
  return (
    <Modal
      title="LÒ RÈN"
      subtitle={`${WEAPON_TYPES.length} loại × ${WTIER_ORDER.length} bậc · gom đủ ${WEAPON_MERGE} bản trùng thì vũ khí lột xác lên bậc trên`}
      accent="#ff8a5a"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center gap-2">
          <button onClick={() => forge(1)} disabled={meta.gems < WGACHA_COST} className="hk-btn lg solid flex-1 justify-center" style={{ background: '#ff8a5a' }}>
            <Svg d={ICONS.anvil} s={14} c="#2a1208" /> ×1 — {fmt(WGACHA_COST)}
          </button>
          <button onClick={() => forge(10)} disabled={meta.gems < WGACHA_X10_COST} className="hk-btn lg solid flex-1 justify-center" style={{ background: '#ffb43c' }}>
            <Svg d={ICONS.anvil} s={14} c="#2a1208" /> ×10 — {fmt(WGACHA_X10_COST)}
          </button>
          <button
            onClick={() => forge(100)}
            disabled={meta.gems < WGACHA_X100_COST}
            className="hk-btn lg solid flex-1 justify-center"
            style={{ background: '#7dff5a' }}
            title={`Rèn 100 lượt liên tiếp — rẻ hơn 15% so với ${fmt(WGACHA_COST * 100)} Ngọc`}
          >
            <Svg d={ICONS.anvil} s={14} c="#0e2a08" /> ×100 — {fmt(WGACHA_X100_COST)}
          </button>
          <div className="num text-[13px] text-[#ff4fd8] flex items-center gap-1.5 shrink-0">
            <Svg d={ICONS.gem} s={13} c="#ff4fd8" /> {fmt(meta.gems)}
          </div>
        </div>
      }
    >
      {/* đang cầm */}
      <div
        className="rounded-md p-3 mb-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(120deg, rgba(255,138,90,0.14), #0d0a14 70%)', border: '1.5px solid #ff8a5a88' }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#1c1424', border: '2px solid #ff8a5a' }}>
          <Svg d={ICONS.sword} s={19} c="#ff8a5a" />
        </div>
        <div className="flex-1 min-w-0">
          {equipped ? (
            <>
              <div className="font-display text-[15px] leading-none" style={{ color: WTIER[equipped.def.tier].color }}>
                {equipped.def.name}
                {equipped.refine > 0 && <span className="num text-[10px] text-[#7dff5a] ml-1">tinh luyện +{equipped.refine}</span>}
                {ws && <span className="num text-[10px] ml-1" style={{ color: ws.edge }}>· {ws.name}</span>}
              </div>
              <div className="font-ui text-[10px] text-[var(--color-bone-dim)] mt-1">
                <span style={{ color: WTIER[equipped.def.tier].color }}>{WTIER[equipped.def.tier].name}</span>
                {' · bậc '}{equipped.def.tierIdx + 1}/{WTIER_ORDER.length}
                {' · '}{weaponTypeDef(equipped.def.type).name}
                {' · Kael '}<span className="text-[#ff8a5a] font-bold">+{equipped.pct}% Công</span>
                {' · đội '}<span className="text-[#ffd23c] font-bold">+{equipped.partyPct}%</span>
              </div>
              <div className="font-body text-[10px] text-[var(--color-bone-faint)] mt-0.5">
                {equipped.trait}
                {equipped.aspd !== 1 && ` · tốc đánh ×${equipped.aspd.toFixed(2)}`}
                {equipped.crit > 0 && ` · +${Math.round(equipped.crit * 100)}% chí mạng`}
              </div>
            </>
          ) : (
            <div className="font-ui text-[11px] text-[var(--color-bone-dim)]">Chưa có vũ khí — hãy rèn bên dưới!</div>
          )}
        </div>
      </div>

      {lastPull && (
        <div className="anim-fade-up grid grid-cols-2 gap-1.5 mb-3">
          {lastPull.map((r, i) => {
            const shown = r.merged ?? r.def;
            const rc = WTIER[shown.tier];
            return (
              <div
                key={i}
                className="rounded-md p-2 flex items-center gap-2"
                style={{ background: `linear-gradient(120deg, ${rc.color}22, #0d0a14 76%)`, border: `1.5px solid ${rc.color}` }}
              >
                <Svg d={ICONS.sword} s={15} c={rc.color} />
                <span className="font-display text-[12px] truncate flex-1" style={{ color: rc.color }}>{shown.name}</span>
                <span className="font-ui text-[9px] font-bold" style={{ color: r.merged ? '#7dff5a' : r.isNew ? '#3fe0b0' : '#ffd23c' }}>
                  {r.merged ? 'LỘT XÁC!' : r.isNew ? 'MỚI!' : '+1 MẢNH'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* bảng 6 loại × 10 bậc — nhìn là biết còn thiếu gì.
          Mười cột thì tên vũ khí không còn chỗ, nên ô chỉ giữ phần đọc được
          từ xa (% công + vạch mảnh) và đẩy tên vào tooltip. */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-[74px] shrink-0" />
        <div className="grid grid-cols-10 gap-1 flex-1">
          {WTIER_ORDER.map((tier) => (
            <div
              key={tier}
              className="font-ui text-[7.5px] tracking-wide text-center leading-none truncate"
              style={{ color: WTIER[tier].color }}
              title={WTIER[tier].name}
            >
              {WTIER[tier].short}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {WEAPON_TYPES.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <div className="w-[74px] shrink-0">
              <div className="font-display text-[12px] text-[var(--color-bone)] leading-none">{t.name}</div>
              <div className="font-ui text-[8px] text-[var(--color-bone-faint)] mt-0.5 leading-tight">{t.trait}</div>
            </div>
            <div className="grid grid-cols-10 gap-1 flex-1">
              {WTIER_ORDER.map((tier) => {
                const def = WEAPONS.find((w) => w.type === t.id && w.tier === tier);
                if (!def) return null;
                const own = ownedById.get(def.id);
                const rc = WTIER[tier];
                const isEq = equipped?.def.id === def.id;
                const have = (own?.count ?? 0) > 0;
                const top = def.tierIdx === WTIER_ORDER.length - 1;
                return (
                  <button
                    key={tier}
                    onClick={() => have && engine.equipWeapon(def.id)}
                    disabled={!have}
                    title={have
                      ? `${def.name} (${rc.name}) — +${own?.pct}% Công · ${own?.count}/${WEAPON_MERGE} mảnh${top ? ' tới một lần tinh luyện' : ' tới bậc sau'}`
                      : `${def.name} (${rc.name}) — chưa sở hữu`}
                    className="rounded-sm px-0.5 py-1 text-center transition-transform hover:-translate-y-0.5 disabled:hover:translate-y-0"
                    style={{
                      background: have ? `linear-gradient(140deg, ${rc.color}22, #0d0a14 78%)` : 'rgba(18,15,26,0.5)',
                      border: `1px solid ${isEq ? rc.color : have ? `${rc.color}55` : '#241f33'}`,
                      boxShadow: isEq ? `0 0 10px ${rc.color}66` : 'none',
                      opacity: have ? 1 : 0.4,
                      cursor: have ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {have ? (
                      <>
                        <div className="num text-[9px] leading-none" style={{ color: rc.color }}>
                          +{own?.pct}%
                        </div>
                        <div className="flex gap-[1px] mt-1">
                          {Array.from({ length: WEAPON_MERGE }).map((_, i) => (
                            <span
                              key={i}
                              style={{
                                flex: 1, height: 3, borderRadius: 1,
                                background: i < (own?.count ?? 0) ? rc.color : '#2c2738',
                              }}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="font-ui text-[9px] text-[var(--color-bone-faint)] leading-[1.6]">—</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="font-ui text-[9px] text-[var(--color-bone-faint)] mt-2.5 text-center leading-relaxed">
        Bấm vào một vũ khí đã sở hữu để trang bị · Đủ {WEAPON_MERGE} mảnh sẽ tự lột xác lên bậc trên cùng loại ·
        Ba bậc chót (từ {WTIER.abyssal.name}) <b className="text-[var(--color-bone-dim)]">không rèn thẳng ra được</b> — chỉ tới bằng đường ghép mảnh ·
        Ở bậc {WTIER.transcendent.name}, {WEAPON_MERGE} mảnh đổi thành một lần tinh luyện
      </p>
    </Modal>
  );
}

// ============ KAEL: TIẾN HOÁ · NGỌC HUYẾT · HỒ SƠ ============

type KaelTab = 'evo' | 'rune' | 'profile';

export function KaelModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const [tab, setTab] = useState<KaelTab>('evo');
  const [bulk, setBulk] = useState<1 | 10>(1);
  const skin = SKINS.find((s) => s.id === meta.equippedSkin) ?? SKINS[0];
  const tabs: Array<[KaelTab, string]> = [['evo', 'TIẾN HOÁ'], ['rune', 'NGỌC HUYẾT'], ['profile', 'HỒ SƠ']];
  return (
    <Modal
      title="KAEL"
      subtitle={`${meta.evo.name} · ${meta.title.title} · Cấp ${meta.kaelLevel}`}
      accent={meta.evo.aura}
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="hk-btn lg"
                style={tab === id
                  ? { background: meta.evo.aura, color: '#140c1c', borderColor: 'transparent' }
                  : undefined}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="num text-[13px] text-[#ff4fd8] flex items-center gap-1.5">
            <Svg d={ICONS.gem} s={13} c="#ff4fd8" /> {fmt(meta.gems)}
          </div>
        </div>
      }
    >
      {tab === 'evo' && <EvoTab meta={meta} look={skin.look} />}
      {tab === 'rune' && <RuneTab meta={meta} engine={engine} bulk={bulk} setBulk={setBulk} />}
      {tab === 'profile' && <ProfileTab meta={meta} />}
    </Modal>
  );
}

function EvoTab({ meta, look }: { meta: MetaInfo; look: ChibiLook }): React.JSX.Element {
  const e = meta.evo;
  return (
    <div>
      <div className="flex gap-3 items-center mb-3">
        <PortraitFrame look={{ ...look, aura: e.aura, evoTier: e.stage }} ring={e.aura} size={104} animate />
        <div className="flex-1 min-w-0">
          <div className="font-ui text-[9px] tracking-widest" style={{ color: e.aura }}>
            BẬC TIẾN HOÁ {e.stage}/{e.max}
          </div>
          <div className="font-display text-[24px] leading-none mt-0.5" style={{ color: e.aura, textShadow: `0 0 20px ${e.aura}55` }}>
            {e.name}
          </div>
          <div className="font-ui text-[10px] text-[var(--color-bone-dim)] mt-1.5">
            Sát thương Kael ×<b style={{ color: e.aura }}>{e.mul.toFixed(2)}</b> nhờ tiến hoá
          </div>
          <div className="mt-2">
            <Meter pct={e.progress} color={e.aura} h={7} />
            <div className="flex justify-between font-ui text-[9px] text-[var(--color-bone-faint)] mt-1">
              <span>{e.nextLevel === null ? 'ĐÃ ĐẠT BẬC CUỐI CÙNG' : `BẬC SAU Ở CẤP ${e.nextLevel}`}</span>
              <span className="num">Lv {meta.kaelLevel}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="font-body text-[10px] text-[var(--color-bone-dim)] mb-2.5 leading-relaxed">
        Cứ mỗi {EVO_EVERY} cấp, Kael tiến hoá: đổi hào quang và hình hài, đồng thời mở thêm một chiêu thức
        <b className="text-[var(--color-bone)]"> giữ vĩnh viễn</b> — các chiêu cũ vẫn còn hiệu lực và cộng dồn.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: e.max + 1 }).map((_, i) => {
          const un = i <= e.stage;
          const info = e.unlocked[i];
          return (
            <div
              key={i}
              className="rounded-md p-2"
              style={{
                background: un ? `linear-gradient(150deg, ${e.aura}18, #0d0a14 78%)` : 'rgba(18,15,26,0.5)',
                border: `1px solid ${un ? `${e.aura}66` : '#241f33'}`,
                opacity: un ? 1 : 0.5,
              }}
            >
              <div className="flex items-center gap-1.5">
                <Svg d={un ? ICONS.flame : ICONS.lock} s={11} c={un ? e.aura : '#6f6780'} />
                <span className="font-display text-[12px] leading-none" style={{ color: un ? e.aura : '#5c5470' }}>
                  {un && info ? info.name : `Bậc ${i} — cấp ${i * EVO_EVERY}`}
                </span>
              </div>
              <div className="font-body text-[9.5px] text-[var(--color-bone-faint)] mt-1 leading-snug">
                {un && info ? info.desc : `Mở khoá khi Kael đạt cấp ${i * EVO_EVERY}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuneTab({ meta, engine, bulk, setBulk }: {
  meta: MetaInfo; engine: GameIdle; bulk: 1 | 10; setBulk: (b: 1 | 10) => void;
}): React.JSX.Element {
  const fmtBonus = (id: RuneId, total: number): string => {
    const def = RUNES.find((r) => r.id === id);
    if (!def) return '';
    if (id === 'crit' || id === 'aspd' || id === 'rage') return `+${(total * 100).toFixed(1)}%`;
    if (id === 'cdmg') return `+${total.toFixed(2)}×`;
    return `+${Math.round(total * 100)}%`;
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-body text-[10px] text-[var(--color-bone-dim)] leading-relaxed max-w-[520px]">
          Khảm Ngọc Huyết vào Kael. Đây là nơi tiêu Ngọc thứ hai ngoài Triệu Hồi, và là cách dồn sức mạnh
          vào nhân vật chính thay vì rải đều cho đồng hành.
        </p>
        <div className="flex gap-1.5 shrink-0">
          {([1, 10] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBulk(b)}
              className="hk-btn"
              style={bulk === b ? { background: '#ff4fd8', color: '#140c1c', borderColor: 'transparent' } : undefined}
            >
              +{b}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {meta.runes.map((r) => {
          const def = RUNES.find((x) => x.id === r.id);
          if (!def) return null;
          const can = !r.maxed && meta.gems >= r.cost;
          return (
            <div
              key={r.id}
              className="rounded-md p-2.5 flex gap-2.5 items-center"
              style={{ background: `linear-gradient(150deg, ${def.color}16, #0d0a14 78%)`, border: `1px solid ${def.color}55` }}
            >
              <div
                className="w-9 h-9 shrink-0 flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 40% 30%, ${def.color}, #14101c 130%)`,
                  clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-display text-[13px] leading-none" style={{ color: def.color }}>{def.name}</div>
                <div className="font-ui text-[9px] text-[var(--color-bone-faint)] mt-0.5">
                  {def.desc} · cấp <b className="num" style={{ color: def.color }}>{r.level}</b>/{r.max}
                </div>
                <div className="num text-[11px] mt-0.5" style={{ color: def.color }}>
                  hiện tại {fmtBonus(r.id, r.total)}
                </div>
              </div>
              <button
                onClick={() => engine.upgradeRune(r.id, bulk)}
                disabled={!can}
                className="hk-btn solid shrink-0"
                style={{ background: can ? def.color : '#2c2738', color: can ? '#140c1c' : '#6f6780' }}
              >
                {r.maxed ? 'TỐI ĐA' : <>+{bulk} · {fmt(r.cost)}</>}
              </button>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 pt-2.5" style={{ borderTop: '1px solid var(--color-line)' }}>
        <Stat label="CÔNG KAEL" value={fmt(meta.kaelAtk)} color="#ff8a5a" />
        <Stat label="MÁU KAEL" value={fmt(meta.kaelHp)} color="#3fe0b0" />
        <Stat label="CHÍ MẠNG" value={`${Math.round(meta.kaelCrit * 100)}%`} color="#ffd23c" />
        <Stat label="TỐC ĐÁNH" value={meta.kaelAspd.toFixed(2)} color="#8cdcff" />
      </div>
    </div>
  );
}

/** Khung hồ sơ — độ cầu kỳ của viền tăng theo bậc danh hiệu. */
function ProfileFrame({ children, frame, glow, ornament, size }: {
  children: React.ReactNode; frame: string; glow: string; ornament: number; size: number;
}): React.JSX.Element {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 28%, ${frame}2e, #100c18 76%)`,
          border: `2px solid ${frame}`,
          boxShadow: `0 0 ${8 + ornament * 5}px ${glow}, inset 0 0 ${6 + ornament * 4}px ${frame}44`,
          clipPath: ornament >= 2
            ? 'polygon(50% 0, 92% 12%, 100% 50%, 92% 88%, 50% 100%, 8% 88%, 0 50%, 8% 12%)'
            : 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      {/* hoạ tiết góc: mỗi bậc thêm một lớp */}
      {Array.from({ length: ornament }).map((_, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            inset: -3 - i * 3,
            border: `1px solid ${frame}${i === 0 ? '99' : '55'}`,
            borderRadius: ornament >= 2 ? '50%' : 3,
            opacity: 0.8 - i * 0.16,
          }}
        />
      ))}
    </div>
  );
}

function ProfileTab({ meta }: { meta: MetaInfo }): React.JSX.Element {
  const t = meta.title;
  const skin = SKINS.find((s) => s.id === meta.equippedSkin) ?? SKINS[0];
  const roster = meta.party.slice(0, 12);
  const mm = Math.floor(meta.playTime / 60);
  return (
    <div>
      <div className="flex gap-3.5 items-center mb-3">
        <ProfileFrame frame={t.frame} glow={t.glow} ornament={t.ornament} size={104}>
          <div className="w-full h-full flex items-end justify-center">
            <Portrait look={{ ...skin.look, aura: meta.evo.aura, evoTier: meta.evo.stage }} size={100} animate />
          </div>
        </ProfileFrame>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[22px] leading-none text-[var(--color-bone)]">
            KAEL <span className="num text-[12px] text-[#ffd23c]">Lv {meta.kaelLevel}</span>
          </div>
          <div className="font-display text-[16px] leading-none mt-1" style={{ color: t.frame, textShadow: `0 0 16px ${t.glow}` }}>
            « {t.title} »
          </div>
          <div className="font-body italic text-[10px] text-[var(--color-bone-dim)] mt-1 leading-snug">{t.desc}</div>
          <div className="mt-2">
            <Meter pct={t.progress} color={t.frame} h={6} />
            <div className="flex justify-between font-ui text-[9px] text-[var(--color-bone-faint)] mt-1">
              <span>{t.nextLevel === null ? 'DANH HIỆU CAO NHẤT' : `${t.nextTitle} — CẤP ${t.nextLevel}`}</span>
              <span className="num">{t.tier + 1}/{t.all.length}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 shrink-0 w-[168px]">
          <Stat label="TẦNG SÂU NHẤT" value={`${meta.bestFloor + 1}`} color="#ffd23c" />
          <Stat label="QUỶ ĐÃ DIỆT" value={fmt(meta.kills)} color="#ff8a5a" />
          <Stat label="HUYẾT ẤN" value={`×${meta.sealMul.toFixed(2)}`} color="#a78bfa" />
          <Stat label="THỜI GIAN" value={`${mm}p`} color="#8cdcff" />
        </div>
      </div>

      <div className="font-ui text-[9px] text-[var(--color-bone-faint)] tracking-widest mb-1.5">ĐỒNG HÀNH TRÊN SÂN</div>
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {roster.length === 0 && (
          <div className="col-span-6 font-ui text-[10px] text-[var(--color-bone-faint)] text-center py-3">
            Chưa có đồng hành nào ra trận
          </div>
        )}
        {roster.map((p) => {
          const def = COMPANIONS.find((c) => c.id === p.id);
          const rc = RARITY[p.rarity];
          if (!def) return null;
          return (
            <div key={p.id} className="flex flex-col items-center">
              <ProfileFrame frame={rc.color} glow={`${rc.color}55`} ornament={RARITY[p.rarity].stars >= 4 ? 1 : 0} size={46}>
                <div className="w-full h-full flex items-end justify-center">
                  <Portrait look={def.look} size={44} />
                </div>
              </ProfileFrame>
              <div className="font-display text-[9px] leading-tight mt-0.5 truncate w-full text-center" style={{ color: rc.color }}>
                {def.name}
              </div>
              <div className="num text-[8px] text-[var(--color-bone-faint)]">Lv {p.level}</div>
            </div>
          );
        })}
      </div>

      <div className="font-ui text-[9px] text-[var(--color-bone-faint)] tracking-widest mb-1.5">BỘ SƯU TẬP DANH HIỆU</div>
      <div className="grid grid-cols-5 gap-1.5">
        {t.all.map((x, i) => (
          <div
            key={i}
            className="rounded-sm px-1.5 py-1 text-center"
            style={{
              background: x.unlocked ? `${x.frame}1c` : 'rgba(18,15,26,0.5)',
              border: `1px solid ${x.unlocked ? `${x.frame}88` : '#241f33'}`,
              opacity: x.unlocked ? 1 : 0.45,
            }}
          >
            <div className="font-display text-[9.5px] leading-tight" style={{ color: x.unlocked ? x.frame : '#4c4459' }}>
              {x.unlocked ? x.title : '???'}
            </div>
            <div className="num text-[8px] text-[var(--color-bone-faint)] mt-0.5">Lv {x.level}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ THĂNG HOA ============

export function PrestigeModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const next = meta.sealMul + meta.sealsPending * BAL.SEAL_BONUS;
  return (
    <Modal title="THĂNG HOA" subtitle="Khắc Huyết Ấn lên linh hồn — mạnh hơn vĩnh viễn, rồi đi lại từ tầng 1" accent="#a78bfa" onClose={onClose}>
      <div className="flex items-center justify-center gap-6 py-2 mb-3">
        <div className="text-center">
          <div className="font-ui text-[9px] text-[var(--color-bone-faint)] tracking-widest">HIỆN TẠI</div>
          <div className="font-display text-[30px] leading-none text-[var(--color-bone)]">×{meta.sealMul.toFixed(2)}</div>
          <div className="num text-[10px] text-[var(--color-bone-dim)] mt-1">{meta.seals} Huyết Ấn</div>
        </div>
        <Svg d={ICONS.chevron} s={22} c="#a78bfa" />
        <div className="text-center">
          <div className="font-ui text-[9px] text-[#a78bfa] tracking-widest">SAU KHI THĂNG HOA</div>
          <div className="font-display text-[30px] leading-none text-[#a78bfa]" style={{ textShadow: '0 0 20px #a78bfa66' }}>
            ×{next.toFixed(2)}
          </div>
          <div className="num text-[10px] text-[#c9b6ff] mt-1">+{meta.sealsPending} Huyết Ấn</div>
        </div>
      </div>

      <div className="rounded-md p-3 mb-3 font-body text-[11px] leading-relaxed text-[var(--color-bone-dim)]" style={{ background: 'rgba(167,139,250,.08)', border: '1px solid #a78bfa44' }}>
        <p className="mb-2">
          <b className="text-[#a78bfa]">Giữ nguyên:</b> toàn bộ đồng hành và cấp của họ, vũ khí, vật phẩm, skin, Ngọc, và số Vàng đang có.
        </p>
        <p className="mb-2">
          <b className="text-[#a78bfa]">Đặt lại:</b> quay về tầng 1 để đi lại hành trình — nhưng lần này mọi sát thương, máu và vàng đều nhân với hệ số Huyết Ấn.
        </p>
        <p>
          Số Huyết Ấn nhận được tính theo <b>tầng sâu nhất từng tới</b> (hiện tại: tầng {meta.bestFloor + 1}).
          Càng xuống sâu trước khi Thăng Hoa, phần thưởng càng lớn — nhưng bạn có thể Thăng Hoa bất cứ lúc nào từ tầng {BAL.SEAL_MIN_FLOOR}.
        </p>
      </div>

      <button
        className="btn-blade primary w-full"
        disabled={!meta.canPrestige}
        onClick={() => { if (engine.prestige()) onClose(); }}
      >
        <Svg d={ICONS.seal} s={16} c="#a78bfa" />
        {meta.canPrestige ? `THĂNG HOA — NHẬN ${meta.sealsPending} HUYẾT ẤN` : `CẦN XUỐNG SÂU HƠN TẦNG ${BAL.SEAL_MIN_FLOOR}`}
      </button>
    </Modal>
  );
}

// ============ NGOẠI TUYẾN ============

export function OfflineModal({ report, onClose }: { report: OfflineReport; onClose: () => void }): React.JSX.Element {
  const h = Math.floor(report.seconds / 3600);
  const m = Math.floor((report.seconds % 3600) / 60);
  return (
    <Modal title="ĐOÀN QUÂN VẪN HÀNH QUÂN" subtitle="Chiến lợi phẩm thu được khi bạn rời đi" accent="#ffd23c" onClose={onClose}>
      <div className="text-center py-2">
        <div className="font-ui text-[10px] text-[var(--color-bone-faint)] tracking-widest">THỜI GIAN VẮNG MẶT</div>
        <div className="font-display text-[34px] leading-none text-[#ffd23c] mt-1">
          {h > 0 ? `${h} giờ ` : ''}{m} phút
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="hk-cut-sm p-3" style={{ background: 'rgba(255,210,60,.1)', border: '1px solid #ffd23c55' }}>
            <Svg d={ICONS.coin} s={18} c="#ffd23c" />
            <div className="font-display text-[22px] leading-none text-[#ffd23c] mt-1">+{fmt(report.gold)}</div>
            <div className="font-ui text-[9px] text-[var(--color-bone-faint)] tracking-widest mt-0.5">VÀNG</div>
          </div>
          <div className="hk-cut-sm p-3" style={{ background: 'rgba(255,79,216,.1)', border: '1px solid #ff4fd855' }}>
            <Svg d={ICONS.gem} s={18} c="#ff4fd8" />
            <div className="font-display text-[22px] leading-none text-[#ff4fd8] mt-1">+{fmt(report.gems)}</div>
            <div className="font-ui text-[9px] text-[var(--color-bone-faint)] tracking-widest mt-0.5">NGỌC</div>
          </div>
        </div>
        <p className="font-body text-[10px] text-[var(--color-bone-faint)] mt-3">
          Tính theo {Math.round(BAL.OFFLINE_RATE * 100)}% nhịp farm chủ động, tối đa {BAL.OFFLINE_CAP_H} giờ.
        </p>
        <button className="btn-blade primary w-full mt-4" onClick={onClose}>NHẬN THƯỞNG</button>
      </div>
    </Modal>
  );
}

// ============ TẠM DỪNG ============

export function PauseModal({ engine, meta, onTitle }: { engine: GameIdle; meta: MetaInfo; onTitle: () => void }): React.JSX.Element {
  const mm = Math.floor(meta.playTime / 60);
  const stats: Array<[string, string]> = [
    ['TẦNG SÂU NHẤT', `${meta.bestFloor + 1}`],
    ['QUỶ ĐÃ DIỆT', fmt(meta.kills)],
    ['THỜI GIAN', `${mm} phút`],
    ['HUYẾT ẤN', `${meta.seals} (×${meta.sealMul.toFixed(2)})`],
  ];
  return (
    <Modal title="TẠM DỪNG" accent="#8fa3b8" onClose={() => engine.togglePause()}>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {stats.map(([k, v]) => (
          <div key={k} className="hk-cut-sm p-2 text-center" style={{ background: 'rgba(24,20,37,.8)', border: '1px solid #362c4d' }}>
            <div className="font-ui text-[8px] text-[var(--color-bone-faint)] tracking-widest">{k}</div>
            <div className="num text-[15px] text-[#ffd23c] mt-0.5">{v}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <button className="btn-blade primary" onClick={() => engine.togglePause()}>
          <Svg d={ICONS.play} s={15} c="#ff3b52" /> TIẾP TỤC CHIẾN ĐẤU
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-blade" onClick={() => engine.toggleMute()}>
            <Svg d={meta.muted ? ICONS.mute : ICONS.sound} s={15} c="#8fa3b8" /> ÂM THANH: {meta.muted ? 'TẮT' : 'BẬT'}
          </button>
          <button className="btn-blade" onClick={() => { engine.togglePause(); dispatchOpen('skin'); }}>
            <Svg d={ICONS.flame} s={15} c="#c2172f" /> TỦ ĐỒ SKIN
          </button>
        </div>
        <button className="btn-blade" onClick={onTitle}>
          <Svg d={ICONS.close} s={14} c="#8fa3b8" /> VỀ MÀN HÌNH CHÍNH
        </button>
        <p className="font-ui text-[10px] text-[var(--color-bone-faint)] text-center mt-1 leading-relaxed">
          P / Esc — tạm dừng · M — tắt tiếng · F — đổi Trấn Giữ / Tiến Công · Tiến trình tự động lưu
        </p>
      </div>
    </Modal>
  );
}

// ============ ĐIỂM DANH MỖI NGÀY ============

const REWARD_ICON: Record<string, string> = {
  gem: ICONS.gem, gold: ICONS.coin, wshard: ICONS.sword, cloth: ICONS.cloth, item: ICONS.bag,
};

export function DailyModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const d = meta.daily;
  const [justClaimed, setJustClaimed] = useState<number | null>(null);
  const clothPct = Math.min(1, d.clothShards / d.shardCost);

  const claim = (): void => {
    const slot = engine.claimDaily();
    if (slot) setJustClaimed(slot.day);
  };

  return (
    <Modal
      title="ĐIỂM DANH HUYẾT NGUYỆT"
      subtitle={`Chu kỳ ${d.cycle} · lịch mở lại vào đầu tháng sau · ô mở theo thứ tự lần điểm danh, bỏ lỡ một ngày chỉ làm chậm chứ không mất phần`}
      accent="#7dff5a"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center gap-3">
          <button
            onClick={claim}
            disabled={!d.canClaim}
            className={`hk-btn lg solid flex-1 justify-center ${d.canClaim ? 'anim-pulse-glow' : ''}`}
            style={{ background: d.canClaim ? '#7dff5a' : '#2c2738', color: d.canClaim ? '#0d1a08' : '#6f6780' }}
          >
            <Svg d={d.canClaim ? ICONS.calendar : ICONS.check} s={14} c={d.canClaim ? '#0d1a08' : '#6f6780'} />
            {d.canClaim
              ? `ĐIỂM DANH NGÀY ${d.claimedCount + 1}`
              : d.claimedCount >= d.total ? 'ĐÃ NHẬN TRỌN LỊCH THÁNG NÀY' : 'HÔM NAY ĐÃ ĐIỂM DANH'}
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <Svg d={ICONS.cloth} s={13} c="#8cdcff" />
            <span className="num text-[13px] text-[#8cdcff]">{fmt(d.clothShards)}</span>
          </div>
        </div>
      }
    >
      {/* Trạng thái và tiến độ vải gộp một hàng: cả 30 ô phải nhìn thấy cùng
          lúc, vì sức hút của lịch điểm danh nằm ở chỗ thấy được đích đến. */}
      <div className="flex items-stretch gap-2 mb-2">
        {([
          { v: `${d.claimedCount}/${d.total}`, label: 'Ô ĐÃ MỞ', color: '#7dff5a' },
          { v: `${d.streak}`, label: 'CHUỖI', color: '#ff9a3c' },
          { v: `${d.totalDays}`, label: 'TỔNG', color: '#ffd23c' },
          { v: `${d.daysLeft}`, label: 'CÒN LẠI', color: '#8cdcff' },
        ]).map((x) => (
          <div key={x.label} className="hk-cut-sm px-2.5 py-1 text-center shrink-0" style={{ background: `${x.color}14`, border: `1px solid ${x.color}55` }}>
            <div className="font-display text-[15px] leading-none" style={{ color: x.color }}>{x.v}</div>
            <div className="font-ui text-[7.5px] tracking-widest mt-0.5" style={{ color: x.color }}>{x.label}</div>
          </div>
        ))}
        <div
          className="rounded-sm px-2.5 py-1 flex items-center gap-2 flex-1 min-w-0"
          style={{ background: 'linear-gradient(120deg, rgba(140,220,255,0.12), #0d0a14 74%)', border: '1px solid #8cdcff55' }}
        >
          <Svg d={ICONS.cloth} s={15} c="#8cdcff" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-ui text-[9px] font-bold text-[#8cdcff] tracking-wider">MẢNH TRANG PHỤC</span>
              <span className="num text-[9px] text-[var(--color-bone-dim)] shrink-0">{fmt(d.clothShards)}/{d.shardCost} — một bộ</span>
            </div>
            <Meter pct={clothPct} color="linear-gradient(90deg,#3fb9ff,#8cdcff)" h={5} className="mt-1" />
          </div>
        </div>
      </div>

      {/* lịch 30 ô */}
      <div className="grid grid-cols-6 gap-1.5">
        {d.slots.map((s) => {
          const tone = s.big ? '#ffd23c' : '#7dff5a';
          const pop = justClaimed === s.day;
          return (
            <div
              key={s.day}
              className={`relative rounded-md px-1 py-1 flex flex-col items-center text-center ${s.next && d.canClaim ? 'slot-next' : ''} ${pop ? 'anim-claim' : ''}`}
              style={{
                ['--sc' as string]: tone,
                background: s.claimed
                  ? 'rgba(12,10,18,0.85)'
                  : s.big ? `linear-gradient(160deg, ${tone}22, #0d0a14 74%)` : 'rgba(24,20,37,0.7)',
                border: `1px solid ${s.claimed ? '#241f33' : s.big ? `${tone}88` : '#3a3350'}`,
                opacity: s.claimed ? 0.55 : 1,
                minHeight: 50,
              }}
            >
              <div className="font-ui text-[7.5px] font-bold tracking-wider leading-none" style={{ color: s.big ? tone : 'var(--color-bone-faint)' }}>
                NGÀY {s.day}
              </div>
              <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full">
                {s.rewards.map((r, i) => (
                  <div key={i} className="flex items-center gap-1 w-full justify-center">
                    <Svg d={REWARD_ICON[r.kind] ?? ICONS.gem} s={8} c={r.color} />
                    <span className="num text-[8.5px] leading-none truncate" style={{ color: r.color }}>
                      {r.kind === 'gold' ? fmt(r.amount) : r.kind === 'gem' ? fmt(r.amount) : `×${r.amount}`}
                    </span>
                  </div>
                ))}
              </div>
              {s.claimed && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,5,10,0.5)', borderRadius: 6 }}>
                  <Svg d={ICONS.check} s={18} c="#3fe0b0" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="font-ui text-[9px] text-[var(--color-bone-faint)] mt-2 text-center leading-relaxed">
        Ngày 7 · 14 · 21 · 28 · 30 là mốc lớn — Ngọc và Mảnh Vũ Khí bậc cao ·
        Vàng thưởng quy đổi theo nhịp farm hiện tại nên không bao giờ lỗi thời
      </p>
    </Modal>
  );
}

// ============ THÀNH TỰU ============

export function AchievementModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const a = meta.ach;
  const [group, setGroup] = useState<AchStatId | 'pending'>('pending');
  const claimed = useMemo(() => new Set(a.claimedIds), [a.claimedIds]);

  const rows = useMemo(() => {
    const pool = group === 'pending'
      ? ACHIEVEMENTS.filter((x) => a.stats[x.stat] >= x.need && !claimed.has(x.id))
      : (ACH_GROUPS.find((g) => g.stat === group)?.list ?? []);
    // Trong tab "chờ nhận" ưu tiên mốc thưởng lớn; trong nhóm giữ nguyên thứ bậc.
    return group === 'pending' ? [...pool].sort((x, y) => y.gems - x.gems) : pool;
  }, [group, a.stats, claimed]);

  const donePct = a.total > 0 ? a.claimed / a.total : 0;

  return (
    <Modal
      title="BIA THÀNH TỰU"
      subtitle={`${ACH_TOTAL} mốc từ dễ tới khó — mỗi mốc đạt được đổi lấy Ngọc Huyết Nguyệt`}
      accent="#7dff5a"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <Meter pct={donePct} color="linear-gradient(90deg,#3fe0b0,#7dff5a)" h={6} />
            <div className="flex justify-between font-ui text-[9px] text-[var(--color-bone-faint)] mt-1">
              <span>ĐÃ NHẬN {a.claimed}/{a.total}</span>
              <span className="num">MỞ KHOÁ {a.unlocked}</span>
            </div>
          </div>
          <button
            onClick={() => engine.claimAllAch()}
            disabled={a.claimable === 0}
            className={`hk-btn lg solid justify-center shrink-0 ${a.claimable > 0 ? 'anim-pulse-glow' : ''}`}
            style={{ background: a.claimable > 0 ? '#7dff5a' : '#2c2738', color: a.claimable > 0 ? '#0d1a08' : '#6f6780' }}
          >
            <Svg d={ICONS.trophy} s={14} c={a.claimable > 0 ? '#0d1a08' : '#6f6780'} />
            NHẬN TẤT CẢ {a.claimable > 0 ? `(${a.claimable}) +${fmt(a.pendingGems)}` : ''}
          </button>
        </div>
      }
    >
      <div className="flex gap-2.5" style={{ minHeight: 300 }}>
        {/* rãnh nhóm */}
        <div className="w-[150px] shrink-0 flex flex-col gap-1 max-h-[330px] overflow-y-auto pr-1">
          <button
            onClick={() => setGroup('pending')}
            className="hk-btn justify-between w-full"
            style={group === 'pending'
              ? { background: '#7dff5a', color: '#0d1a08', borderColor: 'transparent' }
              : { color: '#7dff5a', borderColor: '#7dff5a55' }}
          >
            CHỜ NHẬN
            <span className="num text-[9px]">{a.claimable}</span>
          </button>
          {ACH_GROUPS.map((g) => {
            const val = a.stats[g.stat];
            const done = g.list.filter((x) => claimed.has(x.id)).length;
            const on = group === g.stat;
            return (
              <button
                key={g.stat}
                onClick={() => setGroup(g.stat)}
                className="hk-btn justify-between w-full"
                title={`${g.name} — hiện tại ${fmt(val)}`}
                style={on ? { background: g.color, color: '#0d0a14', borderColor: 'transparent' } : { color: g.color, borderColor: `${g.color}44` }}
              >
                <span className="truncate">{g.name}</span>
                <span className="num text-[9px] shrink-0">{done}/{g.list.length}</span>
              </button>
            );
          })}
        </div>

        {/* danh sách mốc */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 max-h-[330px] overflow-y-auto pr-1">
          {rows.length === 0 && (
            <div className="font-ui text-[11px] text-[var(--color-bone-faint)] text-center py-10">
              {group === 'pending'
                ? 'Chưa có mốc nào chờ nhận — cứ đánh tiếp, mốc sẽ tự mở.'
                : 'Nhóm này chưa có mốc nào.'}
            </div>
          )}
          {rows.map((x) => {
            const val = a.stats[x.stat];
            const unlocked = val >= x.need;
            const got = claimed.has(x.id);
            const rank = ACH_RANKS[rankOfTier(x.tier)];
            const pct = Math.min(1, x.need > 0 ? val / x.need : 0);
            return (
              <div
                key={x.id}
                className="rounded-md px-2.5 py-1.5 flex items-center gap-2.5"
                style={{
                  background: got
                    ? 'rgba(12,10,18,0.7)'
                    : unlocked ? `linear-gradient(120deg, ${x.color}22, #0d0a14 74%)` : 'rgba(24,20,37,0.6)',
                  border: `1px solid ${got ? '#241f33' : unlocked ? `${x.color}88` : '#2c2738'}`,
                  opacity: got ? 0.6 : 1,
                }}
              >
                <div
                  className="w-[38px] shrink-0 text-center py-0.5 rounded-sm"
                  style={{ background: `${rank.color}1e`, border: `1px solid ${rank.color}66` }}
                  title={`Hạng ${rank.name}`}
                >
                  <div className="font-ui text-[7.5px] font-bold tracking-wider" style={{ color: rank.color }}>{rank.name}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[12.5px] leading-none truncate" style={{ color: unlocked ? x.color : 'var(--color-bone-dim)' }}>
                      {x.name}
                    </span>
                    <span className="font-body text-[9.5px] text-[var(--color-bone-faint)] truncate">{x.desc}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Meter pct={pct} color={unlocked ? x.color : '#4a4260'} h={3} className="flex-1" sharp />
                    <span className="num text-[9px] shrink-0 text-[var(--color-bone-faint)]">
                      {fmt(Math.min(val, x.need))}/{fmt(x.need)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 w-[92px] text-right">
                  {got ? (
                    <span className="font-ui text-[9.5px] font-bold text-[#3fe0b0] inline-flex items-center gap-1">
                      <Svg d={ICONS.check} s={11} c="#3fe0b0" /> ĐÃ NHẬN
                    </span>
                  ) : unlocked ? (
                    <button
                      onClick={() => engine.claimAch(x.id)}
                      className="hk-btn solid w-full justify-center"
                      style={{ background: '#7dff5a', color: '#0d1a08' }}
                    >
                      <Svg d={ICONS.gem} s={10} c="#0d1a08" /> {fmt(x.gems)}
                    </button>
                  ) : (
                    <span className="num text-[9.5px] text-[var(--color-bone-faint)] inline-flex items-center gap-1">
                      <Svg d={ICONS.gem} s={10} c="#6f6780" /> {fmt(x.gems)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ============ CỬA HÀNG ============

/** Một dòng giá "Vàng + Ngọc": tô đỏ đúng vế đang thiếu, không tô cả cụm. */
function PriceTag({ gold, gems, haveGold, haveGems }: {
  gold: number; gems: number; haveGold: number; haveGems: number;
}): React.JSX.Element {
  const okGold = haveGold >= gold;
  const okGems = haveGems >= gems;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1 num text-[11px]" style={{ color: okGold ? '#ffd23c' : '#ff5a6a' }}>
        <Svg d={ICONS.coin} s={11} c={okGold ? '#ffd23c' : '#ff5a6a'} />{fmt(gold)}
      </span>
      <span className="inline-flex items-center gap-1 num text-[11px]" style={{ color: okGems ? '#ff4fd8' : '#ff5a6a' }}>
        <Svg d={ICONS.gem} s={11} c={okGems ? '#ff4fd8' : '#ff5a6a'} />{fmt(gems)}
      </span>
    </span>
  );
}

function ShopCard({ row, meta, engine }: { row: ShopRow; meta: MetaInfo; engine: GameIdle }): React.JSX.Element {
  const skin = row.kind === 'hero' ? SKINS.find((s) => s.id === row.id) : undefined;
  const ws = row.kind === 'weapon' ? WEAPON_SKINS_DEF.find((w) => w.id === row.id) : undefined;
  // Xem trước skin vũ khí bằng chính vũ khí Kael đang cầm: người chơi thấy
  // đúng thứ mình sẽ nhận, chứ không phải một hình mẫu chung chung.
  const preview: ChibiLook | undefined = ws
    ? { ...(SKINS.find((s) => s.id === meta.equippedSkin) ?? SKINS[0]).look, weaponSkin: ws.id, weaponFx: ws.fx, weaponTier: 6 }
    : skin?.look;
  return (
    <div
      className="rounded-md p-2.5 flex flex-col items-center text-center"
      style={{
        background: row.equipped ? `${row.color}22` : 'rgba(18,15,26,0.6)',
        border: `1.5px solid ${row.equipped ? row.color : row.owned ? `${row.color}66` : '#241f33'}`,
        boxShadow: row.equipped ? `0 0 16px ${row.color}55` : 'none',
      }}
    >
      <div className="relative">
        <div style={{ filter: row.owned ? 'none' : 'grayscale(0.4) brightness(0.72)' }}>
          {preview && <PortraitFrame look={preview} ring={row.color} size={92} animate={row.equipped || row.owned} />}
        </div>
        {row.locked && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center"
            style={{ width: 20, height: 20, borderRadius: 4, background: '#150a20', border: '1px solid #b14bff88' }}
          >
            <Svg d={ICONS.skull} s={12} c="#b14bff" />
          </span>
        )}
        <span
          className="absolute -bottom-1 -left-1 font-ui text-[8px] px-1 rounded-sm leading-[1.5]"
          style={{ background: row.color, color: '#120c1a' }}
          title={`Bậc hiệu ứng ${row.fx}/4 — càng cao renderer càng chồng thêm lớp`}
        >
          FX {row.fx}
        </span>
      </div>
      <div className="font-display text-[12.5px] leading-tight mt-1.5" style={{ color: row.owned ? row.color : 'var(--color-bone)' }}>
        {row.name}
      </div>
      <div className="font-body text-[9px] text-[var(--color-bone-dim)] mt-1 leading-snug min-h-[32px]">{row.desc}</div>
      <div className="mt-1.5 w-full">
        {row.equipped ? (
          <button
            onClick={() => engine.equipShopItem(row.id)}
            className="hk-btn w-full justify-center"
            style={{ color: row.color, borderColor: `${row.color}88` }}
          >
            {row.kind === 'weapon' ? 'ĐANG KHOÁC — GỠ' : 'ĐANG MẶC'}
          </button>
        ) : row.owned ? (
          <button onClick={() => engine.equipShopItem(row.id)} className="hk-btn solid w-full justify-center" style={{ background: '#ece4d2' }}>
            {row.kind === 'weapon' ? 'KHOÁC' : 'MẶC'}
          </button>
        ) : row.locked ? (
          <div className="font-ui text-[9px] leading-snug text-[#b14bff]">Cần chinh phục Tà Vực</div>
        ) : (
          <button
            onClick={() => engine.buyShopItem(row.id)}
            disabled={!row.affordable}
            className="hk-btn w-full justify-center"
            style={{ borderColor: row.affordable ? `${row.color}88` : '#241f33' }}
          >
            <PriceTag gold={row.gold} gems={row.gems} haveGold={meta.gold} haveGems={meta.gems} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ShopModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const [tab, setTab] = useState<'hero' | 'weapon'>('hero');
  const shop = engine.shopInfo();
  const rows = shop.items.filter((i) => i.kind === tab);
  return (
    <Modal
      title="HUYẾT THỊ"
      subtitle="Trả bằng Vàng và Ngọc cùng lúc · càng đắt hiệu ứng càng dày · không đụng tới chỉ số"
      accent="#ffd23c"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="num text-[13px] text-[#ffd23c] flex items-center gap-1.5">
            <Svg d={ICONS.coin} s={13} c="#ffd23c" /> {fmt(meta.gold)}
          </div>
          <div className="font-ui text-[9.5px] text-[var(--color-bone-faint)] text-center flex-1 leading-snug">
            {shop.evilUnlocked
              ? 'Tà Vực đã khuất phục — hai món đắt nhất đã mở bán'
              : 'Dọn một tầng ở độ khó Evil để mở khoá hai món đắt nhất'}
          </div>
          <div className="num text-[13px] text-[#ff4fd8] flex items-center gap-1.5">
            <Svg d={ICONS.gem} s={13} c="#ff4fd8" /> {fmt(meta.gems)}
          </div>
        </div>
      }
    >
      <div className="flex gap-1.5 mb-3">
        {([['hero', 'TRANG PHỤC KAEL'], ['weapon', 'SKIN VŨ KHÍ']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="hk-btn flex-1 justify-center"
            style={{
              color: tab === id ? '#ffd23c' : 'var(--color-bone-dim)',
              borderColor: tab === id ? '#ffd23c88' : '#241f33',
              background: tab === id ? 'rgba(255,210,60,0.1)' : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {rows.map((r) => <ShopCard key={r.id} row={r} meta={meta} engine={engine} />)}
      </div>
      <p className="font-ui text-[9px] text-[var(--color-bone-faint)] mt-3 text-center leading-relaxed">
        Skin vũ khí là lớp phủ — mua một lần dùng được với cả {WEAPON_TYPES.length} loại và cả {WTIER_ORDER.length} bậc rèn ·
        Bấm lại vào skin vũ khí đang khoác để gỡ ra
      </p>
    </Modal>
  );
}

// ============ NHIỆM VỤ & HUYẾT LỆNH ============

function QuestLine({ q, weekly, engine }: { q: QuestRow; weekly: boolean; engine: GameIdle }): React.JSX.Element {
  const pct = q.target > 0 ? q.progress / q.target : 0;
  return (
    <div
      className="rounded-md px-2.5 py-2 flex items-center gap-2.5"
      style={{
        background: q.claimed ? 'rgba(18,15,26,0.4)' : `linear-gradient(120deg, ${q.color}14, #0d0a14 72%)`,
        border: `1px solid ${q.claimed ? '#241f33' : q.done ? q.color : `${q.color}44`}`,
        opacity: q.claimed ? 0.55 : 1,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[12px] leading-none" style={{ color: q.color }}>{q.name}</span>
          <span className="font-body text-[9.5px] text-[var(--color-bone-dim)] truncate">{q.text}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Meter pct={pct} color={q.color} h={4} className="flex-1" />
          <span className="num text-[9px] text-[var(--color-bone-faint)] shrink-0">
            {fmt(q.progress)}/{fmt(q.target)}
          </span>
        </div>
      </div>
      <div className="shrink-0 w-[92px] text-right">
        {q.claimed ? (
          <span className="font-ui text-[9px] text-[var(--color-bone-faint)] inline-flex items-center gap-1">
            <Svg d={ICONS.check} s={10} c="#4c4459" /> ĐÃ NHẬN
          </span>
        ) : (
          <button
            onClick={() => engine.claimQuest(q.id, weekly)}
            disabled={!q.done}
            className="hk-btn w-full justify-center"
            style={{
              color: q.done ? '#0d0a14' : '#6f6780',
              background: q.done ? q.color : undefined,
              borderColor: q.done ? q.color : '#241f33',
            }}
          >
            +{q.points} ẤN
          </button>
        )}
      </div>
    </div>
  );
}

export function QuestModal({ meta, engine, onClose }: { meta: MetaInfo; engine: GameIdle; onClose: () => void }): React.JSX.Element {
  const q = meta.quests;
  const mode = dungeonModeDef(meta.mode);
  return (
    <Modal
      title="HUYẾT LỆNH"
      subtitle={`Mùa ${q.cycle} · còn ${q.daysLeft} ngày · nhiệm vụ ngày đổi lúc nửa đêm, nhiệm vụ tuần đổi thứ Hai`}
      accent="#ff4fd8"
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center gap-2">
          <button
            onClick={() => engine.claimAllQuests()}
            disabled={q.claimable === 0}
            className="hk-btn lg solid flex-1 justify-center"
            style={{ background: q.claimable > 0 ? '#ff4fd8' : '#3a3350' }}
          >
            <Svg d={ICONS.check} s={14} c="#1a0a16" /> NHẬN {q.claimable} NHIỆM VỤ
          </button>
          <button
            onClick={() => engine.claimAllEdict()}
            disabled={q.claimableTiers === 0}
            className="hk-btn lg solid flex-1 justify-center"
            style={{ background: q.claimableTiers > 0 ? '#ffd23c' : '#3a3350' }}
          >
            <Svg d={ICONS.seal} s={14} c="#2a1e08" /> NHẬN {q.claimableTiers} BẬC LỆNH
          </button>
        </div>
      }
    >
      {/* ---- thanh mùa giải ---- */}
      <div
        className="rounded-md px-3 py-2.5 mb-3"
        style={{ background: 'linear-gradient(120deg, rgba(255,79,216,0.14), #0d0a14 72%)', border: '1.5px solid #ff4fd866' }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display text-[15px] leading-none text-[#ff4fd8]">
            BẬC {q.level}<span className="text-[var(--color-bone-faint)] text-[11px]">/{q.maxLevel}</span>
          </div>
          <div className="num text-[11px] text-[var(--color-bone-dim)]">
            {q.nextCost > 0 ? `${fmt(q.points)}/${fmt(q.nextCost)} Ấn Điểm` : 'Đã đi hết mùa'}
          </div>
          <div className="font-ui text-[10px]" style={{ color: mode.color }}>
            Ấn Điểm ×{q.edictMul} · {mode.short}
          </div>
        </div>
        <Meter pct={q.progress} color="linear-gradient(90deg,#ff4fd8,#ffd23c)" h={6} className="mt-2" />
        <div className="flex gap-[3px] mt-2 overflow-x-auto pb-1">
          {q.tiers.map((t) => (
            <button
              key={t.level}
              onClick={() => t.reached && !t.claimed && engine.claimEdict(t.level)}
              disabled={!t.reached || t.claimed}
              title={`Bậc ${t.level} — ${t.label}`}
              className="shrink-0 rounded-sm flex flex-col items-center justify-center"
              style={{
                width: t.big ? 26 : 18, height: 30,
                background: t.claimed ? 'rgba(18,15,26,0.5)' : t.reached ? `${t.color}33` : 'rgba(18,15,26,0.7)',
                border: `1px solid ${t.claimed ? '#241f33' : t.reached ? t.color : `${t.color}33`}`,
                cursor: t.reached && !t.claimed ? 'pointer' : 'default',
                opacity: t.reached ? 1 : 0.5,
              }}
            >
              <span className="num text-[8px] leading-none" style={{ color: t.claimed ? '#4c4459' : t.color }}>
                {t.level}
              </span>
              {t.claimed
                ? <Svg d={ICONS.check} s={9} c="#4c4459" />
                : <span style={{ width: 5, height: 5, borderRadius: 5, background: t.color, marginTop: 3 }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="kicker text-[9px] text-[var(--color-bone-faint)] mb-1.5">NHIỆM VỤ NGÀY</div>
      <div className="flex flex-col gap-1.5 mb-3">
        {q.daily.map((x) => <QuestLine key={x.id} q={x} weekly={false} engine={engine} />)}
      </div>
      <div className="kicker text-[9px] text-[var(--color-bone-faint)] mb-1.5">NHIỆM VỤ TUẦN</div>
      <div className="flex flex-col gap-1.5">
        {q.weekly.map((x) => <QuestLine key={x.id} q={x} weekly engine={engine} />)}
      </div>
      <p className="font-ui text-[9px] text-[var(--color-bone-faint)] mt-3 text-center leading-relaxed">
        Mỗi ô hoàn thành trả Ấn Điểm và Ngọc · Dọn đợt quái và hạ boss cũng nhỏ giọt Ấn Điểm ·
        Chọn độ khó Hard/Evil ở Vực Vô Tận để nhân Ấn Điểm lên {DUNGEON_MODES[1].edictMul}–{DUNGEON_MODES[2].edictMul} lần
      </p>
    </Modal>
  );
}
