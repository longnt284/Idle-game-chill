import { useEffect, useMemo, useState } from 'react';
import { CHAPTERS, ENDING, IMG } from '../story';
import type { EndStats } from '../game/engine';
import { fmt, TOTAL_FLOORS } from '../game/engine';

function Embers({ n = 16 }: { n?: number }) {
  const embers = useMemo(
    () =>
      Array.from({ length: n }).map((_, i) => ({
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
        <span key={i} className="ember-dot" style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, transform: `scale(${e.scale})` }} />
      ))}
    </>
  );
}

function TypePanel({ text, speed = 14, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [len, setLen] = useState(0);
  useEffect(() => {
    setLen(0);
    const iv = window.setInterval(() => {
      setLen((l) => {
        if (l >= text.length) {
          window.clearInterval(iv);
          return l;
        }
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
    <p className={`font-body text-[15px] leading-relaxed text-[#d8cfba] ${done ? '' : 'caret'}`}>{text.slice(0, len)}</p>
  );
}

// ============ TITLE ============
export function TitleScreen({ onStart, hasSave }: { onStart: () => void; hasSave: boolean }) {
  return (
    <div className="absolute inset-0 z-30 overflow-hidden">
      <img src={IMG.title} alt="" className="absolute inset-0 w-full h-full object-cover anim-kenburns" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,6,11,0.55) 0%, rgba(7,6,11,0.25) 40%, rgba(7,6,11,0.92) 100%)' }} />
      <div className="absolute inset-0 scanline-vignette" />
      <Embers />
      <div className="relative h-full flex flex-col items-center justify-end pb-[8vh] px-6 text-center">
        <div className="kicker text-[11px] text-[#ff9a3c] anim-flicker mb-3">IDLE DUNGEON RPG · 30 TẦNG · 30 BOSS</div>
        <h1 className="font-display title-blood anim-drip leading-none" style={{ fontSize: 'clamp(56px, 10vw, 110px)' }}>
          HUYẾT KIẾM CA
        </h1>
        <p className="font-body italic text-[#b8ae98] mt-3 max-w-xl text-[15px]">
          Đêm nguyệt thực, đoàn quân của Kael tiến vào vực sâu — không dừng, không quay đầu.
        </p>
        <div className="flex flex-col items-center gap-3 mt-7">
          <button className="btn-blade primary anim-pulse-glow text-lg" onClick={onStart}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff3b52"><path d="M8 5v14l11-7z" /></svg>
            {hasSave ? 'TIẾP TỤC HÀNH QUÂN' : 'BẮT ĐẦU HUYỀN THOẠI'}
          </button>
          {hasSave && <span className="font-ui text-[10px] text-[#9a917f] tracking-widest">TIẾN TRÌNH ĐÃ LƯU · THƯỞNG NGOẠI TUYẾN ĐANG CHỜ</span>}
        </div>
        <div className="grid grid-cols-3 gap-x-8 gap-y-1.5 mt-8 font-ui text-[11px] text-[#9a917f]">
          <span>⚔ Tự động chiến đấu · tốc độ ×6</span>
          <span>✦ Triệu Hồi 20 đồng hành</span>
          <span>⚡ Skin & vật phẩm gacha</span>
        </div>
      </div>
    </div>
  );
}

// ============ STORY ============
export function StoryScreen({ chapter, onDone }: { chapter: number; onDone: () => void }) {
  const ch = CHAPTERS[Math.min(chapter, CHAPTERS.length - 1)];
  const [panel, setPanel] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPanel(0);
    setReady(false);
  }, [chapter]);
  const isLast = panel >= ch.panels.length - 1;
  const next = (): void => {
    if (!ready) return;
    if (isLast) onDone();
    else {
      setPanel((p) => p + 1);
      setReady(false);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if (e.code === 'Enter') next();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, panel, chapter]);
  return (
    <div className="absolute inset-0 z-30 overflow-hidden" style={{ background: '#07060b' }}>
      <img src={ch.img} alt="" className="absolute inset-0 w-full h-full object-cover anim-kenburns opacity-60" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(100deg, rgba(7,6,11,0.97) 0%, rgba(7,6,11,0.82) 45%, rgba(7,6,11,0.4) 100%)` }} />
      <div className="absolute inset-0 scanline-vignette" />
      <Embers n={10} />
      <div className="relative h-full flex flex-col justify-center px-[6vw] max-w-3xl">
        <div className="kicker text-[11px] mb-2 anim-flicker" style={{ color: ch.accent }}>{ch.kicker}</div>
        <h2 className="font-display text-5xl leading-tight mb-6 title-bone">{ch.title}</h2>
        <div className="panel-dark p-6" style={{ borderLeft: `4px solid ${ch.accent}` }}>
          <TypePanel key={`${chapter}-${panel}`} text={ch.panels[panel]} onDone={() => setReady(true)} />
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {ch.panels.map((_, i) => (
              <span key={i} className="w-6 h-1.5 rounded-full transition-colors" style={{ background: i <= panel ? ch.accent : '#2c2738' }} />
            ))}
          </div>
          <button className={`btn-blade ${ready ? '' : 'opacity-40 pointer-events-none'}`} onClick={next}>
            {isLast ? 'TIẾN VÀO HẦM NGỤC' : 'TIẾP TỤC'}
            <span className="anim-blink">▸</span>
          </button>
        </div>
        <div className="font-ui text-[10px] text-[#6a6378] mt-3 tracking-widest">ENTER — LẬT TRANG</div>
      </div>
    </div>
  );
}

// ============ ENDING ============
export function EndScreen({ stats, onRestart }: { stats: EndStats; onRestart: () => void }) {
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const mm = Math.floor(stats.playTime / 60);
  const ss = Math.floor(stats.playTime % 60);
  const isLast = page >= ENDING.text.length - 1;
  const next = (): void => {
    if (!ready) return;
    if (isLast) return;
    setPage((p) => p + 1);
    setReady(false);
  };
  return (
    <div className="absolute inset-0 z-30 overflow-hidden">
      <img src={IMG.dawn} alt="" className="absolute inset-0 w-full h-full object-cover anim-kenburns" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,6,11,0.96) 0%, rgba(7,6,11,0.75) 50%, rgba(7,6,11,0.25) 100%)' }} />
      <div className="relative h-full flex flex-col justify-center px-[6vw] max-w-2xl">
        <div className="kicker text-[11px] text-[#ffd23c] mb-2 anim-flicker">{ENDING.kicker}</div>
        <h2 className="font-display text-5xl leading-tight mb-6" style={{ color: '#ffe9a8', textShadow: '0 0 30px rgba(255,210,60,0.4)' }}>{ENDING.title}</h2>
        <div className="panel-dark p-6" style={{ borderLeft: '4px solid #ffd23c' }}>
          <TypePanel key={page} text={ENDING.text[page]} onDone={() => setReady(true)} />
        </div>
        {!isLast ? (
          <button className={`btn-blade mt-6 self-start ${ready ? '' : 'opacity-40 pointer-events-none'}`} onClick={next}>
            TIẾP <span className="anim-blink">▸</span>
          </button>
        ) : (
          <div className="anim-fade-up mt-6">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                ['TẦNG SÂU', `${TOTAL_FLOORS}/${TOTAL_FLOORS}`],
                ['QUỶ ĐÃ DIỆT', fmt(stats.kills)],
                ['THỜI GIAN', `${mm}p ${ss}s`],
              ].map(([k, v]) => (
                <div key={k} className="panel-dark p-3 text-center">
                  <div className="font-ui text-[9px] text-[#9a917f] tracking-widest">{k}</div>
                  <div className="font-display text-2xl text-[#ffd23c]">{v}</div>
                </div>
              ))}
            </div>
            <button className="btn-blade primary" onClick={onRestart}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#ff3b52"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" /></svg>
              NEW GAME+ — GIỮ SỨC MẠNH, ĐI LẠI TỪ ĐẦU
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
