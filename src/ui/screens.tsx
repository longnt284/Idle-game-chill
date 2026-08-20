import { useEffect, useMemo, useState } from 'react';
import { CHAPTERS, ENDING, IMG } from '../story';
import type { EndStats, MetaInfo } from '../game/engine';
import { BOSSES, COMPANIONS, TOTAL_FLOORS, fmt } from '../game/engine';

/** Ảnh nền tải từ xa — nếu hỏng thì ẩn đi, lớp gradient bên dưới vẫn giữ được không khí. */
function Backdrop({ src, className = '', opacity = 1 }: { src: string; className?: string; opacity?: number }): React.JSX.Element {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 20%, #2a1020, #07060b 70%)' }} />;
  return (
    <img
      src={src}
      alt=""
      onError={() => setOk(false)}
      className={`absolute inset-0 w-full h-full object-cover anim-kenburns ${className}`}
      style={{ opacity }}
    />
  );
}

function Embers({ n = 16 }: { n?: number }): React.JSX.Element {
  const embers = useMemo(
    () => Array.from({ length: n }).map((_, i) => ({
      left: `${(i * 61) % 100}%`,
      delay: `${(i * 0.7) % 6}s`,
      dur: `${5 + ((i * 1.3) % 6)}s`,
      scale: 0.6 + ((i * 0.37) % 1),
    })),
    [n],
  );
  return (
    <>
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember-dot"
          style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, transform: `scale(${e.scale})` }}
        />
      ))}
    </>
  );
}

function TypePanel({ text, speed = 12, onDone }: { text: string; speed?: number; onDone?: () => void }): React.JSX.Element {
  const [len, setLen] = useState(0);
  useEffect(() => {
    setLen(0);
    const iv = window.setInterval(() => {
      setLen((l) => {
        if (l >= text.length) { window.clearInterval(iv); return l; }
        return l + 1;
      });
    }, speed);
    return () => window.clearInterval(iv);
  }, [text, speed]);
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if (e.code === 'Enter' || e.code === 'Space') setLen(text.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [text]);
  const done = len >= text.length;
  useEffect(() => {
    if (done && onDone) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  return (
    <p className={`font-body text-[13px] leading-relaxed text-[#d8cfba] ${done ? '' : 'caret'}`}>
      {text.slice(0, len)}
    </p>
  );
}

// ============ MÀN HÌNH CHÍNH ============
export function TitleScreen({ onStart, hasSave, meta }: {
  onStart: () => void; hasSave: boolean; meta: MetaInfo | null;
}): React.JSX.Element {
  const facts: Array<[string, string]> = [
    ['TẦNG HẦM NGỤC', `${TOTAL_FLOORS}`],
    ['TƯỚNG QUỶ', `${BOSSES.length}`],
    ['ĐỒNG HÀNH', `${COMPANIONS.length}`],
  ];
  return (
    <div className="absolute inset-0 z-30 overflow-hidden">
      <Backdrop src={IMG.title} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,6,11,0.6) 0%, rgba(7,6,11,0.22) 38%, rgba(7,6,11,0.95) 100%)' }} />
      <div className="absolute inset-0 scanline-vignette" />
      <Embers />
      <div className="relative h-full flex flex-col items-center justify-end pb-9 px-8 text-center">
        <div className="kicker text-[10px] text-[#ff9a3c] anim-flicker mb-2">
          IDLE DUNGEON RPG · TỰ ĐỘNG CHIẾN ĐẤU · CHƠI THẢNH THƠI
        </div>
        <h1 className="font-display title-blood anim-drip leading-none" style={{ fontSize: 84 }}>
          HUYẾT KIẾM CA
        </h1>
        <p className="font-body italic text-[#b8ae98] mt-2 max-w-[500px] text-[12px] leading-relaxed">
          Đêm nguyệt thực, đoàn quân của Kael tiến vào vực sâu — không dừng, không quay đầu.
        </p>

        <div className="flex flex-col items-center gap-2 mt-5">
          <button className="btn-blade primary anim-pulse-glow" style={{ fontSize: 15 }} onClick={onStart}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#ff3b52"><path d="M8 5v14l11-7z" /></svg>
            {hasSave ? 'TIẾP TỤC HÀNH QUÂN' : 'BẮT ĐẦU HUYỀN THOẠI'}
          </button>
          {hasSave && meta && (
            <div className="font-ui text-[10px] text-[#9a917f] tracking-widest flex items-center gap-3">
              <span>TẦNG SÂU NHẤT <b className="text-[#ffd23c]">{meta.bestFloor + 1}</b></span>
              <span className="text-[#3a3350]">|</span>
              <span>QUỶ ĐÃ DIỆT <b className="text-[#ff8a5a]">{fmt(meta.kills)}</b></span>
              {meta.seals > 0 && (
                <>
                  <span className="text-[#3a3350]">|</span>
                  <span>HUYẾT ẤN <b className="text-[#a78bfa]">×{meta.sealMul.toFixed(2)}</b></span>
                </>
              )}
            </div>
          )}
          {hasSave && (
            <span className="font-ui text-[9px] text-[#6f6780] tracking-widest">THƯỞNG NGOẠI TUYẾN ĐANG CHỜ</span>
          )}
        </div>

        <div className="flex items-center gap-6 mt-6">
          {facts.map(([label, value]) => (
            <div key={label} className="text-center">
              <div className="font-display text-[26px] leading-none text-[#ffd23c]">{value}</div>
              <div className="font-ui text-[8px] text-[#9a917f] tracking-[0.25em] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ TRUYỆN ============
export function StoryScreen({ chapter, onDone }: { chapter: number; onDone: () => void }): React.JSX.Element {
  const ch = CHAPTERS[Math.min(chapter, CHAPTERS.length - 1)];
  const [panel, setPanel] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { setPanel(0); setReady(false); }, [chapter]);
  const isLast = panel >= ch.panels.length - 1;
  const next = (): void => {
    if (!ready) return;
    if (isLast) onDone();
    else { setPanel((p) => p + 1); setReady(false); }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent): void => { if (e.code === 'Enter') next(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, panel, chapter]);

  return (
    <div className="absolute inset-0 z-30 overflow-hidden" style={{ background: '#07060b' }}>
      <Backdrop src={ch.img} opacity={0.55} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(7,6,11,0.97) 0%, rgba(7,6,11,0.84) 48%, rgba(7,6,11,0.4) 100%)' }} />
      <div className="absolute inset-0 scanline-vignette" />
      <Embers n={10} />
      <div className="relative h-full flex flex-col justify-center px-14 max-w-[620px]">
        <div className="kicker text-[10px] mb-1.5 anim-flicker" style={{ color: ch.accent }}>{ch.kicker}</div>
        <h2 className="font-display leading-tight mb-4 title-bone" style={{ fontSize: 40 }}>{ch.title}</h2>
        <div className="panel-dark p-4" style={{ borderLeft: `4px solid ${ch.accent}`, minHeight: 130 }}>
          <TypePanel key={`${chapter}-${panel}`} text={ch.panels[panel]} onDone={() => setReady(true)} />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {ch.panels.map((_, i) => (
              <span
                key={i}
                className="w-5 h-1.5 rounded-full transition-colors"
                style={{ background: i <= panel ? ch.accent : '#2c2738' }}
              />
            ))}
          </div>
          <button className="btn-blade" style={{ fontSize: 12 }} disabled={!ready} onClick={next}>
            {isLast ? 'TIẾN VÀO HẦM NGỤC' : 'TIẾP TỤC'}
            <span className="anim-blink">▸</span>
          </button>
        </div>
        <div className="font-ui text-[9px] text-[#6a6378] mt-2 tracking-widest">ENTER — LẬT TRANG · SPACE — HIỆN HẾT CHỮ</div>
      </div>
    </div>
  );
}

// ============ KẾT ============
export function EndScreen({ stats, onEndless, onNewGamePlus }: {
  stats: EndStats; onEndless: () => void; onNewGamePlus: () => void;
}): React.JSX.Element {
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const mm = Math.floor(stats.playTime / 60);
  const ss = Math.floor(stats.playTime % 60);
  const isLast = page >= ENDING.text.length - 1;
  const next = (): void => {
    if (!ready || isLast) return;
    setPage((p) => p + 1);
    setReady(false);
  };
  return (
    <div className="absolute inset-0 z-30 overflow-hidden">
      <Backdrop src={IMG.dawn} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,6,11,0.96) 0%, rgba(7,6,11,0.76) 52%, rgba(7,6,11,0.25) 100%)' }} />
      <div className="relative h-full flex flex-col justify-center px-14 max-w-[600px]">
        <div className="kicker text-[10px] text-[#ffd23c] mb-1.5 anim-flicker">{ENDING.kicker}</div>
        <h2 className="font-display leading-tight mb-4" style={{ fontSize: 40, color: '#ffe9a8', textShadow: '0 0 30px rgba(255,210,60,0.4)' }}>
          {ENDING.title}
        </h2>
        <div className="panel-dark p-4" style={{ borderLeft: '4px solid #ffd23c', minHeight: 120 }}>
          <TypePanel key={page} text={ENDING.text[page]} onDone={() => setReady(true)} />
        </div>
        {!isLast ? (
          <button className="btn-blade mt-4 self-start" style={{ fontSize: 12 }} disabled={!ready} onClick={next}>
            TIẾP <span className="anim-blink">▸</span>
          </button>
        ) : (
          <div className="anim-fade-up mt-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                ['TẦNG SÂU', `${TOTAL_FLOORS}/${TOTAL_FLOORS}`],
                ['QUỶ ĐÃ DIỆT', fmt(stats.kills)],
                ['THỜI GIAN', `${mm}p ${ss}s`],
              ] as Array<[string, string]>).map(([k, v]) => (
                <div key={k} className="panel-dark p-2 text-center">
                  <div className="font-ui text-[8px] text-[#9a917f] tracking-widest">{k}</div>
                  <div className="font-display text-[20px] text-[#ffd23c]">{v}</div>
                </div>
              ))}
            </div>
            <button className="btn-blade primary w-full" style={{ fontSize: 12 }} onClick={onEndless}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#a78bfa"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3z" /></svg>
              ĐI TIẾP — VỰC VÔ TẬN ĐANG CHỜ
            </button>
            <button className="btn-blade w-full mt-2" style={{ fontSize: 11 }} onClick={onNewGamePlus}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff3b52"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" /></svg>
              NEW GAME+ — ĐI LẠI TỪ TẦNG 1, GIỮ NGUYÊN SỨC MẠNH
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
