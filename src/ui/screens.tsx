import { useEffect, useMemo, useState } from 'react';
import type { RunStats } from '../game/engine';
import { CHAPTERS, CONTROLS, DEATH_QUOTE, ENDING, IMG, type StoryChapter } from '../story';

/* ---------------- shared bits ---------------- */

function SwordIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21l3.5-3.5M6 18L18.5 5.5 21 3l-2.5 2.5M6 18l-1.5-1.5M14 7l3 3" strokeLinecap="round" />
      <path d="M5 16l3 3" strokeLinecap="round" />
    </svg>
  );
}
function SkullIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3 6v4h10v-4c1.5-1 3-3 3-6a8 8 0 0 0-8-8Z" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <circle cx="15" cy="10" r="1.6" fill="currentColor" />
      <path d="M10.5 20v-2M13.5 20v-2" strokeLinecap="round" />
    </svg>
  );
}
function BrandIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4l4 5-3 4 5 3-2 4M14 3l3 4 4 1-3 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ControlsTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-x-8 gap-y-2`}>
      {CONTROLS.map((c) => (
        <div key={c.label} className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
          <span className="text-[15px] text-[#c9c0ac]">{c.label}</span>
          <span className="flex gap-1.5 shrink-0">
            {c.keys.map((k) => (
              <kbd key={k} className="kbd">{k}</kbd>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function StatGrid({ stats }: { stats: RunStats }) {
  const rows = [
    ['ĐIỂM', stats.score.toString().padStart(6, '0')],
    ['CẤP ĐỘ', String(stats.level)],
    ['KẾT LIỄU', String(stats.kills)],
    ['LIÊN KÍCH CAO NHẤT', `×${stats.bestCombo}`],
    ['TẦNG SÂU NHẤT', `TẦNG ${['I', 'II', 'III'][Math.min(2, stats.floor)]}`],
    ['THỜI GIAN', fmtTime(stats.time)],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between border-b border-white/8 py-1.5">
          <span className="kicker text-[10px] text-[#9a917f]">{k}</span>
          <span className="font-display font-bold text-lg text-[#ffd23c]">{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- title ---------------- */

export function TitleScreen({ onStart, muted, onToggleMute }: {
  onStart: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [showControls, setShowControls] = useState(false);
  const embers = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 61) % 100}%`,
        delay: `${(i * 0.7) % 6}s`,
        dur: `${5 + ((i * 1.3) % 6)}s`,
        size: 2 + ((i * 7) % 4),
      })),
    []
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onStart();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onStart]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07060b]">
      <img src={IMG.title} alt="" className="absolute inset-0 w-full h-full object-cover anim-kenburns opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07060b] via-[#07060b]/72 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07060b] via-transparent to-[#07060b]/60" />
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember-dot"
          style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, width: e.size, height: e.size }}
        />
      ))}

      <div className="relative h-full flex flex-col justify-center pl-[6vw] pr-6">
        <div className="anim-flicker">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-14 bg-[#c2172f]" />
            <span className="kicker text-[11px] text-[#ff9a3c]">Trường ca hắc ám — một người chơi</span>
          </div>
          <h1 className="font-display font-extrabold leading-[0.92] select-none">
            <span className="block text-bone title-bone text-[clamp(3rem,8.5vw,7rem)] anim-fade-up">DẤU ẤN</span>
            <span className="block title-blood text-[clamp(3rem,8.5vw,7rem)] anim-drip" style={{ animationDelay: '0.35s' }}>
              HẮC NGUYỆT
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#c9c0ac] italic anim-fade-up" style={{ animationDelay: '0.6s' }}>
            Đêm nguyệt thực ấy, đồng đội bị dâng làm vật tế. Kẻ sống sót duy nhất vác cự kiếm bước xuống Hầm Ngục Vĩnh
            Cửu — ba tầng sâu, ba con quái vật, và một vị Thần đang đợi ở đáy tối.
          </p>
        </div>

        <div className="mt-9 flex flex-col items-start gap-3 anim-fade-up" style={{ animationDelay: '0.85s' }}>
          <button className="btn-blade primary anim-pulse-glow" onClick={onStart}>
            <SwordIcon className="w-5 h-5 text-[#ff8095]" />
            Bắt đầu huyết chiến
            <span className="text-[11px] font-semibold text-[#9a917f] tracking-widest ml-2">↵</span>
          </button>
          <button className="btn-blade" onClick={() => setShowControls((s) => !s)}>
            <SkullIcon className="w-5 h-5 text-[#ff9a3c]" />
            {showControls ? 'Ẩn điều khiển' : 'Điều khiển'}
          </button>
          <button className="btn-quiet" onClick={onToggleMute}>
            Âm thanh: {muted ? 'ĐANG TẮT' : 'ĐANG BẬT'} (M)
          </button>
        </div>

        {showControls && (
          <div className="mt-6 panel-dark max-w-2xl p-5 anim-fade-up">
            <ControlsTable />
          </div>
        )}
      </div>

      <div className="absolute bottom-5 right-6 text-right">
        <p className="kicker text-[10px] text-[#6f6759]">Lấy cảm hứng từ Berserk — Kentaro Miura</p>
        <p className="text-[12px] text-[#4d463c] italic mt-1">Kiếm đã tuốt thì không còn đường quay lại.</p>
      </div>
    </div>
  );
}

/* ---------------- story ---------------- */

function useTypewriter(text: string, cps = 2) {
  const [n, setN] = useState(0);
  useEffect(() => setN(0), [text]);
  useEffect(() => {
    if (n >= text.length) return;
    const id = window.setTimeout(() => setN((v) => Math.min(text.length, v + cps)), 16);
    return () => clearTimeout(id);
  }, [n, text, cps]);
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}

export function StoryScreen({ chapter, onDone }: { chapter: StoryChapter; onDone: () => void }) {
  const [pi, setPi] = useState(0);
  const text = chapter.panels[Math.min(pi, chapter.panels.length - 1)];
  const tw = useTypewriter(text);

  const advance = () => {
    if (!tw.done) tw.skip();
    else if (pi < chapter.panels.length - 1) setPi(pi + 1);
    else onDone();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07060b] cursor-pointer select-none" onClick={advance}>
      <img src={chapter.img} alt="" className="absolute inset-0 w-full h-full object-cover anim-kenburns opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07060b] via-[#07060b]/45 to-[#07060b]/80" />
      <div className="absolute inset-0 scanline-vignette" />

      <div className="absolute top-[7%] left-[6vw] right-[6vw]">
        <div className="flex items-center gap-3">
          <BrandIcon className="w-4 h-4" />
          <span className="kicker text-[11px]" style={{ color: chapter.accent }}>
            {chapter.kicker}
          </span>
        </div>
        <h2 className="font-display font-extrabold text-bone mt-2 text-[clamp(2rem,4.6vw,3.6rem)] leading-tight anim-fade-up">
          {chapter.title}
        </h2>
      </div>

      <div className="absolute bottom-[9%] left-[6vw] right-[6vw] flex items-end justify-between gap-8">
        <div className="panel-dark max-w-3xl p-6 sm:p-7 border-l-4" style={{ borderLeftColor: chapter.accent }}>
          <p className={`text-[16px] sm:text-[19px] leading-relaxed text-[#ded5bf] ${tw.done ? '' : 'caret'}`}>
            {tw.shown}
          </p>
          <div className="mt-5 flex items-center gap-2">
            {chapter.panels.map((_, i) => (
              <span
                key={i}
                className="h-[3px] transition-all duration-300"
                style={{ width: i === pi ? 34 : 14, background: i <= pi ? chapter.accent : '#3a3542' }}
              />
            ))}
          </div>
        </div>
        <div className="kicker text-[11px] text-[#9a917f] anim-blink whitespace-nowrap pb-2">
          {tw.done ? (pi < chapter.panels.length - 1 ? 'Nhấn ENTER — lật trang ▸' : 'Nhấn ENTER — rút kiếm ▸') : 'Nhấn ENTER — đọc ngay'}
        </div>
      </div>
    </div>
  );
}

/* ---------------- pause ---------------- */

export function PauseScreen({ stats, onResume, onQuit, muted, onToggleMute }: {
  stats: RunStats;
  onResume: () => void;
  onQuit: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-[#050408]/78 flex items-center justify-center p-6">
      <div className="panel-dark w-full max-w-3xl p-8 anim-fade-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="kicker text-[11px] text-[#ff9a3c] mb-1">Lưỡi kiếm dừng lại</div>
            <h2 className="font-display font-extrabold text-[44px] leading-none text-bone">TẠM DỪNG</h2>
          </div>
          <SkullIcon className="w-10 h-10 text-[#3a3542]" />
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="kicker text-[11px] text-[#9a917f] mb-3">Chiến tích</div>
            <StatGrid stats={stats} />
          </div>
          <div>
            <div className="kicker text-[11px] text-[#9a917f] mb-3">Điều khiển</div>
            <ControlsTable compact />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button className="btn-blade primary" onClick={onResume}>
            <SwordIcon className="w-5 h-5 text-[#ff8095]" /> Tiếp tục (P)
          </button>
          <button className="btn-blade" onClick={onToggleMute}>Âm thanh: {muted ? 'TẮT' : 'BẬT'}</button>
          <button className="btn-quiet" onClick={onQuit}>Bỏ cuộc — về màn hình chính</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- death ---------------- */

export function DeathScreen({ stats, onRetry }: { stats: RunStats; onRetry: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onRetry();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onRetry]);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(90% 90% at 50% 60%, rgba(58,5,16,0.88), rgba(5,4,8,0.96))' }}>
      <div className="max-w-3xl w-full text-center anim-fade-up">
        <SkullIcon className="w-12 h-12 text-[#5e0a18] mx-auto mb-3" />
        <h2 className="font-display font-extrabold title-blood text-[clamp(3.4rem,9vw,6.5rem)] leading-none anim-drip">
          NGÃ XUỐNG
        </h2>
        <p className="mt-5 italic text-[17px] leading-relaxed text-[#c9c0ac] max-w-xl mx-auto">{DEATH_QUOTE}</p>
        <div className="panel-dark mt-8 p-6 text-left">
          <StatGrid stats={stats} />
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <button className="btn-blade primary anim-pulse-glow" onClick={onRetry}>
            <SwordIcon className="w-5 h-5 text-[#ff8095]" /> Đứng dậy — trả thù (↵)
          </button>
          <span className="text-[12px] text-[#6f6759]">Giữ nguyên cấp độ và điểm — làm lại tầng hiện tại</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- victory ---------------- */

export function VictoryScreen({ stats, onReplay }: { stats: RunStats; onReplay: () => void }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07060b]">
      <img src={IMG.dawn} alt="" className="absolute inset-0 w-full h-full object-cover anim-kenburns opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07060b] via-[#07060b]/55 to-[#07060b]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07060b]/90 via-transparent to-transparent" />

      <div className="relative h-full overflow-y-auto flex items-center">
        <div className="max-w-5xl w-full mx-auto px-[6vw] py-14 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div className="anim-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-14 bg-[#ffd23c]" />
              <span className="kicker text-[11px] text-[#ffd23c]">{ENDING.kicker}</span>
            </div>
            <h2 className="font-display font-extrabold text-bone title-bone text-[clamp(2.4rem,5.4vw,4.4rem)] leading-tight">
              {ENDING.title}
            </h2>
            <div className="mt-6 space-y-4 max-w-xl">
              {ENDING.text.map((t, i) => (
                <p key={i} className="text-[16px] sm:text-[17px] leading-relaxed text-[#ded5bf] anim-fade-up" style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
                  {t}
                </p>
              ))}
            </div>
          </div>
          <div className="anim-fade-up" style={{ animationDelay: '0.5s' }}>
            <div className="panel-dark p-6">
              <div className="kicker text-[11px] text-[#9a917f] mb-4">Tổng kết cuộc săn</div>
              <StatGrid stats={stats} />
              <button className="btn-blade primary w-full justify-center mt-7" onClick={onReplay}>
                <SwordIcon className="w-5 h-5 text-[#ff8095]" /> Chơi lại từ đầu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CHAPTER_LIST = CHAPTERS;
