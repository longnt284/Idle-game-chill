import { useEffect, useRef, useState } from 'react';
import { CHAPTERS, ENDING, IMG, StoryChapter } from '../story';
import type { EndStats } from '../game/engine';

function Embers({ n = 16 }: { n?: number }) {
  const dots = Array.from({ length: n }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((i) => (
        <span
          key={i}
          className="ember-dot"
          style={{
            left: `${(i * 61) % 100}%`,
            animationDuration: `${7 + (i % 5) * 2.4}s`,
            animationDelay: `${(i * 0.83) % 7}s`,
            opacity: 0.7,
            transform: `scale(${0.6 + (i % 4) * 0.3})`,
          }}
        />
      ))}
    </div>
  );
}

function Bg({ src, children }: { src: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img src={src} alt="" className="anim-kenburns absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 scanline-vignette" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07060b] via-transparent to-[#07060b]/70" />
      <Embers />
      {children}
    </div>
  );
}

const Diamond = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={`w-3.5 h-3.5 ${className}`} fill="currentColor">
    <path d="M10 1 L19 10 L10 19 L1 10 Z" />
  </svg>
);

/* ================= TITLE ================= */
export function TitleScreen({ onStart, hasSave }: { onStart: () => void; hasSave: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07060b]">
      <Bg src={IMG.title}>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-[7vh] px-6">
          <div className="anim-fade-up flex flex-col items-center" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3 text-rose-400 anim-flicker">
              <Diamond />
              <span className="kicker text-[12px]">Berserk-inspired · Idle Dungeon RPG</span>
              <Diamond />
            </div>
            <h1 className="font-display font-extrabold text-[clamp(44px,8vw,92px)] leading-[0.95] text-center mt-2 anim-drip">
              <span className="title-bone">HUYẾT</span>{' '}
              <span className="title-blood">KIẾM CA</span>
            </h1>
            <p className="font-body italic text-[#c9bfa8] text-[15px] mt-3 max-w-xl text-center">
              Đêm nguyệt thực, dấu ấn rỉ máu. Kael cùng những đồng hành mới
              <br className="hidden md:block" /> tiến vào Hầm Ngục Vĩnh Cửu — và lần này, không ai bước đi đơn độc.
            </p>
          </div>

          <div className="anim-fade-up mt-7 flex flex-col items-center gap-3" style={{ animationDelay: '0.4s' }}>
            <button className="btn-blade primary text-lg px-12 py-4 anim-pulse-glow" onClick={onStart}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 3.5 20 3l-.5 5.5L8 20l-4-4L14.5 3.5z" /><path d="m6 14 4 4" />
              </svg>
              {hasSave ? 'Tiếp Tục Hành Trình' : 'Bắt Đầu Chinh Phạt'}
            </button>
            <div className="flex gap-5 text-[11px] font-display tracking-[0.18em] text-[#9a917f] uppercase">
              <span className="flex items-center gap-1.5"><Diamond className="text-amber-400" /> Tự động chiến đấu</span>
              <span className="flex items-center gap-1.5"><Diamond className="text-pink-400" /> Triệu hồi đồng hành</span>
              <span className="flex items-center gap-1.5"><Diamond className="text-sky-400" /> 3 Boss · 27 đợt</span>
            </div>
            <div className="anim-blink text-[12px] font-display tracking-[0.3em] text-[#c9bfa8]/70 mt-1">▲ NHẤN ĐỂ XUỐNG HẦM NGỤC ▲</div>
          </div>
        </div>
      </Bg>
    </div>
  );
}

/* ================= STORY ================= */
export function StoryScreen({ chapter, onDone }: { chapter: number; onDone: () => void }) {
  const ch: StoryChapter = CHAPTERS[Math.min(chapter, CHAPTERS.length - 1)];
  const [panel, setPanel] = useState(0);
  const [typed, setTyped] = useState('');
  const [full, setFull] = useState(false);
  const skipRef = useRef(false);

  useEffect(() => {
    setPanel(0); setTyped(''); setFull(false);
  }, [chapter]);

  useEffect(() => {
    const text = ch.panels[panel] ?? '';
    setTyped(''); setFull(false); skipRef.current = false;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setFull(true); }
    }, 24);
    return () => clearInterval(iv);
  }, [panel, ch]);

  const advance = () => {
    if (!full) { skipRef.current = true; setTyped(ch.panels[panel]); setFull(true); return; }
    if (panel < ch.panels.length - 1) setPanel(panel + 1);
    else onDone();
  };

  return (
    <div className="relative w-full h-full bg-[#07060b]" onClick={advance}>
      <Bg src={ch.img}>
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1" style={{ color: ch.accent }}>
              <Diamond />
              <span className="kicker text-[11px] anim-flicker">{ch.kicker} · {panel + 1}/{ch.panels.length}</span>
            </div>
            <h2 className="font-display font-extrabold text-[clamp(28px,4.5vw,52px)] leading-tight anim-fade-up" style={{ color: '#f2ead8', textShadow: `0 0 30px ${ch.accent}55, 0 3px 0 #140a10` }}>
              {ch.title}
            </h2>
            <div className="mt-4 panel-dark px-5 py-4 cursor-pointer" style={{ borderLeft: `3px solid ${ch.accent}`, clipPath: 'polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)' }}>
              <p className={`font-body text-[15px] md:text-[16px] leading-relaxed text-[#dcd3bd] min-h-[84px] ${full ? '' : 'caret'}`}>
                {typed}
              </p>
              <div className="mt-2 flex justify-end">
                <span className={`text-[11px] font-display tracking-[0.25em] uppercase ${full ? 'anim-blink' : 'opacity-40'}`} style={{ color: ch.accent }}>
                  {full ? (panel < ch.panels.length - 1 ? 'Tiếp tục ▸' : 'Tiến vào hầm ngục ▸') : 'Chạm để lướt nhanh'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Bg>
    </div>
  );
}

/* ================= VICTORY ================= */
export function VictoryScreen({ stats, onRestart }: { stats: EndStats; onRestart: () => void }) {
  const mm = Math.floor(stats.time / 60);
  const ss = Math.floor(stats.time % 60).toString().padStart(2, '0');
  return (
    <div className="relative w-full h-full bg-[#07060b]">
      <Bg src={IMG.dawn}>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="anim-fade-up">
            <div className="kicker text-[12px] text-amber-300 mb-2 anim-flicker">{ENDING.kicker}</div>
            <h2 className="font-display font-extrabold text-[clamp(36px,6vw,72px)] leading-tight" style={{ color: '#ffe9b8', textShadow: '0 0 40px rgba(255,176,32,0.5), 0 3px 0 #3a2408' }}>
              {ENDING.title}
            </h2>
          </div>
          <div className="anim-fade-up max-w-2xl mt-5 flex flex-col gap-3" style={{ animationDelay: '0.25s' }}>
            {ENDING.text.map((t, i) => (
              <p key={i} className="font-body text-[15px] leading-relaxed text-[#efe6cf]" style={{ textShadow: '0 2px 8px #000' }}>{t}</p>
            ))}
          </div>
          <div className="anim-fade-up mt-6 flex gap-3 flex-wrap justify-center" style={{ animationDelay: '0.45s' }}>
            {[
              { l: 'Thời gian', v: `${mm}:${ss}` },
              { l: 'Quái đã hạ', v: stats.kills.toLocaleString('vi') },
              { l: 'Tổng sát thương', v: stats.totalDmg.toLocaleString('vi') },
            ].map((s) => (
              <div key={s.l} className="panel-dark px-6 py-3" style={{ clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}>
                <div className="kicker text-[9px] text-amber-300/80">{s.l}</div>
                <div className="font-display font-extrabold text-2xl text-[#ffe9b8]">{s.v}</div>
              </div>
            ))}
          </div>
          <button className="btn-blade primary anim-fade-up mt-7 px-10" style={{ animationDelay: '0.6s' }} onClick={onRestart}>
            Bắt Đầu Truyền Thuyết Mới
          </button>
        </div>
      </Bg>
    </div>
  );
}
