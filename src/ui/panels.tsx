import { useEffect, useRef, useState } from 'react';
import {
  IdleEngine, HudSnapshot, GachaResult, Rarity, RARITY_COLOR, RARITY_LABEL,
  COMPANIONS, SKINS, ITEMS, GACHA_COST, GACHA_COST_10, GACHA_ODDS,
  heroCfgFor, renderPortrait, renderItemIcon,
} from '../game/engine';

/* ---------------- inline SVG icons ---------------- */
const CoinIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="#ffd23c" stroke="#8a6a10" strokeWidth="2" />
    <circle cx="12" cy="12" r="5.5" fill="none" stroke="#8a6a10" strokeWidth="1.6" />
    <path d="M12 8.5v7M9.8 10.2h3.4a1.6 1.6 0 1 1 0 3.2H9.8" stroke="#8a6a10" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const GemIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M7 4h10l4 5-9 12L3 9l4-5z" fill="#ff8fd0" stroke="#a03070" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M3 9h18M12 21 8.5 9 12 4l3.5 5L12 21z" stroke="#a03070" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
const SwordIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 3.5 20 3l-.5 5.5L8 20l-4-4L14.5 3.5z" />
    <path d="m6 14 4 4M3 21l3-3" />
  </svg>
);
const UsersIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M16.5 14.6c2.4.3 4.3 1.9 5 4.4" />
  </svg>
);
const ShieldIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3z" />
    <path d="M12 8v5M9.5 10.5h5" />
  </svg>
);
const StarIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.5 14.6 9l6.9.4-5.3 4.4 1.7 6.7L12 16.8l-5.9 3.7 1.7-6.7-5.3-4.4L9.4 9 12 2.5z" />
  </svg>
);

/* ---------------- portrait ---------------- */
export function Portrait({ kind, id, size, ring }: { kind: 'companion' | 'skin'; id: string; size: number; ring?: Rarity }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderPortrait(ref.current, heroCfgFor(kind, id), size);
  }, [kind, id, size]);
  return (
    <canvas
      ref={ref}
      className="shrink-0 rounded-sm"
      style={ring ? { boxShadow: `0 0 0 2px ${RARITY_COLOR[ring]}, 0 0 14px ${RARITY_COLOR[ring]}55` } : undefined}
    />
  );
}
export function ItemIconCv({ slot, rarity, size }: { slot: 'weapon' | 'armor' | 'charm'; rarity: Rarity; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderItemIcon(ref.current, slot, RARITY_COLOR[rarity], size);
  }, [slot, rarity, size]);
  return <canvas ref={ref} className="shrink-0 rounded-sm" style={{ boxShadow: `0 0 0 2px ${RARITY_COLOR[rarity]}, 0 0 14px ${RARITY_COLOR[rarity]}55` }} />;
}

const RarityTag = ({ r, small }: { r: Rarity; small?: boolean }) => (
  <span
    className={`font-display font-bold uppercase tracking-widest ${small ? 'text-[9px] px-1.5 py-px' : 'text-[10px] px-2 py-0.5'}`}
    style={{ color: '#12080c', background: RARITY_COLOR[r], clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}
  >
    {RARITY_LABEL[r]}
  </span>
);

/* ================= HUD ================= */
export function GameHud({ hud, engine, onOpen, onPause }: {
  hud: HudSnapshot; engine: IdleEngine | null;
  onOpen: (m: 'gacha' | 'party' | 'equip') => void; onPause: () => void;
}) {
  const cycles = [1, 2, 3];
  return (
    <>
      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-3 pt-2 pointer-events-none select-none">
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 panel-chip">
            <CoinIcon /> <span className="font-display font-bold text-amber-300 text-sm tabular-nums">{hud.gold.toLocaleString('vi')}</span>
          </div>
          <div className="flex items-center gap-2 panel-chip">
            <GemIcon /> <span className="font-display font-bold text-pink-300 text-sm tabular-nums">{hud.gems.toLocaleString('vi')}</span>
          </div>
          <div className="flex items-center gap-1.5 panel-chip text-[10px] text-rose-200/80">
            <StarIcon s={11} /> Bảo hiểm <b className="text-rose-100">{hud.pity}/10</b>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 pt-0.5">
          <div className="font-display text-[11px] tracking-[0.3em] text-amber-200/90 uppercase" style={{ textShadow: '0 2px 8px #000' }}>
            Tầng {['I', 'II', 'III'][hud.floor]} — {hud.floorName}
          </div>
          <div className={`font-display font-extrabold text-xl leading-none flex items-center gap-2 ${hud.inBoss ? 'text-rose-400' : 'text-[#e8dfc8]'}`} style={{ textShadow: '0 2px 10px #000, 0 0 20px rgba(194,23,47,.4)' }}>
            {hud.inBoss ? (<><SwordIcon s={17} /> BOSS CHIẾN</>) : `ĐỢT ${Math.max(1, hud.wave)}/${hud.wavesPerFloor}`}
          </div>
        </div>

        <div className="flex gap-1.5 pointer-events-auto">
          <button className="hud-btn" title="Tốc độ" onClick={() => engine?.setSpeed(cycles[(cycles.indexOf(hud.speed) + 1) % cycles.length] ?? 1)}>
            ×{hud.speed}
          </button>
          <button className="hud-btn" title="Âm thanh" onClick={() => engine?.toggleMute()}>
            {hud.muted ? 'TẮT' : 'BẬT'}
          </button>
          <button className="hud-btn flex items-center" title="Tạm dừng" onClick={onPause}>
            <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor"><rect x="0" y="0" width="4" height="12" rx="1" /><rect x="7" y="0" width="4" height="12" rx="1" /></svg>
          </button>
        </div>
      </div>

      {/* bottom action dock */}
      <div className="absolute bottom-3 right-3 flex items-end gap-2 pointer-events-auto select-none">
        <button className="dock-btn" onClick={() => onOpen('party')}>
          <UsersIcon s={20} /> <span>Đội Hình</span>
        </button>
        <button className="dock-btn" onClick={() => onOpen('equip')}>
          <ShieldIcon s={20} /> <span>Trang Bị</span>
        </button>
        <button className="dock-btn gacha-dock anim-pulse-glow" onClick={() => onOpen('gacha')}>
          <GemIcon s={22} /> <span>Triệu Hồi</span>
          <em className="not-italic text-[10px] font-body opacity-90 -mt-0.5">{GACHA_COST} ngọc</em>
        </button>
      </div>

      {/* kill counter */}
      <div className="absolute bottom-3 left-3 pointer-events-none select-none panel-chip text-[11px] text-amber-100/85 flex items-center gap-2">
        <SwordIcon s={13} /> Hạ: <b className="text-amber-200">{hud.kills}</b>
        <span className="opacity-40">|</span> Sát thương: <b className="text-amber-200">{hud.totalDmg.toLocaleString('vi')}</b>
      </div>
    </>
  );
}

/* ================= GACHA ================= */
function ResultCard({ r, i }: { r: GachaResult; i: number }) {
  const col = RARITY_COLOR[r.rarity];
  return (
    <div
      className="card-in relative w-[124px] p-1.5 flex flex-col items-center gap-1 text-center"
      style={{
        animationDelay: `${i * 0.09}s`,
        background: `linear-gradient(165deg, ${col}30, #14101c 55%)`,
        border: `2px solid ${col}`,
        boxShadow: r.rarity === 'legendary' ? `0 0 26px ${col}88` : r.rarity === 'epic' ? `0 0 16px ${col}66` : 'none',
        clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
      }}
    >
      {r.rarity === 'legendary' && <div className="card-shine pointer-events-none absolute inset-0" />}
      {!r.isNew && (
        <span className="absolute -top-0 -right-0 z-10 text-[9px] font-display font-bold bg-[#12080c] text-amber-300 px-1.5 py-0.5 border border-amber-400/60">
          {r.kind === 'companion' ? '+2 CẤP' : '+NGỌC'}
        </span>
      )}
      {r.kind === 'item' ? (
        <ItemIconCv slot={(ITEMS.find((x) => x.id === r.id)?.slot ?? 'charm') as 'weapon' | 'armor' | 'charm'} rarity={r.rarity} size={88} />
      ) : (
        <Portrait kind={r.kind === 'skin' ? 'skin' : 'companion'} id={r.id} size={88} ring={r.rarity} />
      )}
      <div className="font-display font-bold text-[13px] leading-tight text-[#f2ead8]">{r.name}</div>
      <div className="text-[10px] text-[#b8ad98] leading-tight font-body">{r.kind === 'skin' ? 'Skin Kael' : r.kind === 'companion' ? 'Đồng hành' : ITEMS.find((x) => x.id === r.id)?.desc}</div>
      <RarityTag r={r.rarity} small />
      {r.isNew && <div className="text-[9px] font-display text-emerald-300 tracking-wider">✦ MỚI</div>}
    </div>
  );
}

export function GachaModal({ engine, hud, onClose }: { engine: IdleEngine | null; hud: HudSnapshot; onClose: () => void }) {
  const [results, setResults] = useState<GachaResult[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const pull = (n: number) => {
    if (!engine || rolling) return;
    setRolling(true);
    setResults(null);
    setTimeout(() => {
      const res = engine.pullGacha(n);
      setResults(res);
      setRolling(false);
    }, 650);
  };
  return (
    <ModalShell title="ĐÀI TRIỆU HỒI" sub="Dùng Ngọc để triệu hồi đồng hành, skin và vật phẩm" onClose={onClose} accent="#ff8fd0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {GACHA_ODDS.map((o) => (
            <div key={o.rarity} className="text-center px-2 py-1 border" style={{ borderColor: `${RARITY_COLOR[o.rarity]}66`, background: `${RARITY_COLOR[o.rarity]}14` }}>
              <div className="text-[9px] font-display tracking-wider" style={{ color: RARITY_COLOR[o.rarity] }}>{RARITY_LABEL[o.rarity]}</div>
              <div className="text-[11px] font-bold text-[#e8dfc8]">{o.pct}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-pink-300 font-display font-bold text-sm"><GemIcon s={16} /> {hud.gems.toLocaleString('vi')}</div>
      </div>

      <div className="min-h-[190px] flex items-center justify-center">
        {rolling ? (
          <div className="summon-portal relative w-40 h-40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-pink-400/70 anim-slow-spin" style={{ borderStyle: 'dashed' }} />
            <div className="absolute inset-4 rounded-full border-2 border-amber-300/60 anim-slow-spin" style={{ animationDirection: 'reverse', animationDuration: '9s' }} />
            <GemIcon s={44} />
          </div>
        ) : results ? (
          <div className="flex flex-wrap justify-center gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {results.map((r, i) => <ResultCard key={i} r={r} i={i} />)}
          </div>
        ) : (
          <div className="text-center text-[#9a917f] font-body italic">
            Ánh trăng máu soi xuống đài cổ... <br /> Vận mệnh của những đồng minh mới đang chờ được hé lộ.
            <div className="mt-2 text-[11px] text-rose-200/70">Bảo hiểm: triệu hồi lần thứ 10 chắc chắn nhận Cực Hiếm trở lên.</div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3 mt-4">
        <button className="btn-blade primary" disabled={!engine?.canPull(1) || rolling} onClick={() => pull(1)} style={{ opacity: engine?.canPull(1) && !rolling ? 1 : 0.45 }}>
          <GemIcon s={18} /> ×1 — {GACHA_COST} Ngọc
        </button>
        <button className="btn-blade primary" disabled={!engine?.canPull(10) || rolling} onClick={() => pull(10)} style={{ opacity: engine?.canPull(10) && !rolling ? 1 : 0.45 }}>
          <GemIcon s={18} /> ×10 — {GACHA_COST_10} Ngọc
        </button>
      </div>
    </ModalShell>
  );
}

/* ================= PARTY ================= */
export function PartyModal({ engine, hud, onClose }: { engine: IdleEngine | null; hud: HudSnapshot; onClose: () => void }) {
  return (
    <ModalShell title="ĐỘI HÌNH HUYẾT KIẾM" sub="Nâng cấp bằng Vàng — 3 đồng hành mạnh nhất sẽ ra trận cùng Kael" onClose={onClose} accent="#ffd23c">
      <div className="flex items-center gap-3 mb-3 text-amber-300 font-display font-bold text-sm">
        <CoinIcon s={18} /> {hud.gold.toLocaleString('vi')} Vàng
      </div>
      <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
        {hud.party.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-2 panel-row" style={{ borderColor: `${RARITY_COLOR[p.rarity]}44` }}>
            <div className="relative">
              <Portrait kind={p.isKael ? 'skin' : 'companion'} id={p.isKael ? (p.skinId ?? 'default') : p.id} size={62} ring={p.rarity} />
              {p.active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-display font-bold bg-emerald-500 text-emerald-950 px-1.5 rounded-sm tracking-wider">RA TRẬN</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[15px] text-[#f2ead8]">{p.name}</span>
                <span className="text-[10px] text-[#9a917f] font-body">{p.cls}</span>
                <RarityTag r={p.rarity} small />
              </div>
              <div className="text-[11px] text-[#b8ad98] font-body">
                Cấp <b className="text-amber-200">{p.level}</b> · Công <b className="text-rose-300">{p.atk}</b> · Máu <b className="text-emerald-300">{p.maxHp}</b>
              </div>
              <div className="mt-1 h-1.5 bg-black/60 rounded-sm overflow-hidden w-full max-w-[220px]">
                <div className="h-full transition-all duration-300" style={{ width: `${Math.round(p.hpPct * 100)}%`, background: p.hpPct > 0.5 ? '#52e07a' : p.hpPct > 0.25 ? '#ffd23c' : '#ff3b52' }} />
              </div>
            </div>
            <button
              className="upgrade-btn"
              disabled={hud.gold < p.upgradeCost}
              onClick={() => { if (engine) { if (p.isKael) engine.upgradeKael(); else engine.upgradeCompanion(p.id); } }}
              style={{ opacity: hud.gold >= p.upgradeCost ? 1 : 0.4 }}
            >
              <CoinIcon s={13} /> {p.upgradeCost.toLocaleString('vi')}
              <em className="not-italic block text-[8px] tracking-widest">NÂNG CẤP</em>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-[#9a917f] font-body italic text-center">
        Chưa có đồng hành? Ghé <b className="text-pink-300">Đài Triệu Hồi</b> để tìm kiếm những người bạn mới.
      </div>
    </ModalShell>
  );
}

/* ================= EQUIPMENT ================= */
export function EquipModal({ engine, onClose, ownedSkins, equippedSkin, ownedItems, equipped }: {
  engine: IdleEngine | null; onClose: () => void;
  ownedSkins: string[]; equippedSkin: string; ownedItems: string[];
  equipped: { weapon: string | null; armor: string | null; charm: string | null };
}) {
  return (
    <ModalShell title="TRANG BỊ & SKIN" sub="Skin thay đổi diện mạo Kael · Vật phẩm cộng chỉ số vĩnh viễn" onClose={onClose} accent="#7fd4ff">
      <div className="text-[11px] font-display tracking-[0.2em] text-rose-300 mb-1.5">SKIN KAEL</div>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        {SKINS.filter((s) => ownedSkins.includes(s.id)).map((s) => {
          const on = equippedSkin === s.id;
          return (
            <button key={s.id} className="skin-card" onClick={() => engine?.equipSkin(s.id)}
              style={{ borderColor: on ? RARITY_COLOR[s.rarity] : `${RARITY_COLOR[s.rarity]}44`, boxShadow: on ? `0 0 16px ${RARITY_COLOR[s.rarity]}66` : 'none' }}>
              <Portrait kind="skin" id={s.id} size={72} ring={s.rarity} />
              <span className="font-display text-[11px] font-bold text-[#f2ead8]">{s.name}</span>
              {on ? <span className="text-[9px] font-display text-emerald-300 tracking-widest">ĐANG DÙNG</span> : <RarityTag r={s.rarity} small />}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] font-display tracking-[0.2em] text-rose-300 mb-1.5">VẬT PHẨM</div>
      <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
        {ownedItems.length === 0 && <div className="text-[#9a917f] italic font-body text-sm">Chưa sở hữu vật phẩm nào — hãy triệu hồi!</div>}
        {ownedItems.map((id) => {
          const def = ITEMS.find((i) => i.id === id);
          if (!def) return null;
          const on = equipped[def.slot] === id;
          return (
            <button key={id} className="flex items-center gap-3 p-1.5 panel-row text-left" onClick={() => engine?.equipItem(id)}
              style={{ borderColor: on ? RARITY_COLOR[def.rarity] : `${RARITY_COLOR[def.rarity]}33`, background: on ? `${RARITY_COLOR[def.rarity]}14` : undefined }}>
              <ItemIconCv slot={def.slot} rarity={def.rarity} size={46} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[13px] text-[#f2ead8]">{def.name}</span>
                  <RarityTag r={def.rarity} small />
                </div>
                <div className="text-[11px] text-[#b8ad98] font-body">{def.desc}</div>
              </div>
              <span className={`text-[9px] font-display tracking-widest ${on ? 'text-emerald-300' : 'text-[#9a917f]'}`}>{on ? 'ĐANG ĐEO' : 'ĐEO ▶'}</span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

/* ================= PAUSE ================= */
export function PauseOverlay({ engine, onResume }: { engine: IdleEngine | null; onResume: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="panel-dark px-10 py-8 text-center anim-fade-up" style={{ clipPath: 'polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)' }}>
        <div className="kicker text-[11px] text-rose-400 mb-1">Tạm Dừng</div>
        <div className="font-display font-extrabold text-3xl text-[#e8dfc8] mb-5">HƠI THỞ GIỮA TRẬN</div>
        <div className="flex flex-col gap-2.5 items-center">
          <button className="btn-blade primary" onClick={onResume}>Tiếp Tục Chiến Đấu</button>
          <button className="btn-quiet" onClick={() => engine?.toggleMute()}>Bật / Tắt Tiếng</button>
          {!confirm ? (
            <button className="btn-quiet" onClick={() => setConfirm(true)}>Chơi Lại Từ Đầu</button>
          ) : (
            <button className="btn-quiet" style={{ color: '#ff3b52', borderColor: '#ff3b52' }} onClick={() => engine?.hardReset()}>
              Chắc chắn? Xóa toàn bộ tiến trình!
            </button>
          )}
        </div>
        <div className="mt-4 text-[11px] text-[#9a917f] font-body italic">Trận chiến vẫn auto — nhưng đồng đội cần hơi ấm của ngươi.</div>
      </div>
    </div>
  );
}

/* ================= shell ================= */
function ModalShell({ title, sub, onClose, accent, children }: {
  title: string; sub: string; onClose: () => void; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div
        className="panel-dark relative w-full max-w-[620px] px-6 py-5 anim-fade-up"
        style={{ clipPath: 'polygon(20px 0,100% 0,100% calc(100% - 20px),calc(100% - 20px) 100%,0 100%,0 20px)', borderTop: `3px solid ${accent}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-3 right-4 font-display text-xl text-[#9a917f] hover:text-rose-400 transition-colors cursor-pointer" onClick={onClose}>✕</button>
        <div className="kicker text-[10px] mb-0.5" style={{ color: accent }}>{sub}</div>
        <h2 className="font-display font-extrabold text-[26px] leading-tight text-[#f2ead8] mb-4" style={{ textShadow: `0 0 22px ${accent}44` }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export { COMPANIONS };
