import { useCallback, useEffect, useRef, useState } from 'react';
import { IdleEngine, HudSnapshot, EndStats, GameEvent, GACHA_COST } from './game/engine';
import { TitleScreen, StoryScreen, VictoryScreen } from './ui/screens';
import { GameHud, GachaModal, PartyModal, EquipModal, PauseOverlay } from './ui/panels';

const SAVE_KEY = 'huyet-kiem-idle-v1';

type View = 'title' | 'story' | 'game' | 'victory';
type Modal = null | 'gacha' | 'party' | 'equip';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IdleEngine | null>(null);
  const [view, setView] = useState<View>('title');
  const [chapter, setChapter] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [stats, setStats] = useState<EndStats | null>(null);
  const [hasSave] = useState(() => {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  });
  const [metaTick, setMetaTick] = useState(0);

  const onEvent = useCallback((e: GameEvent) => {
    if (e.type === 'story') {
      setChapter(e.chapter);
      setModal(null);
      setPaused(false);
      setView('story');
    } else if (e.type === 'victory') {
      setStats(e.stats);
      setModal(null);
      setView('victory');
    }
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const eng = new IdleEngine(cv, { onHud: setHud, onEvent });
    engineRef.current = eng;
    return () => {
      eng.destroy();
      engineRef.current = null;
    };
  }, [onEvent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== 'game') return;
      const k = e.key.toLowerCase();
      if (k === 'p' || k === 'escape') {
        if (modal) { setModal(null); return; }
        engineRef.current?.togglePause();
        setPaused((p) => !p);
      } else if (k === 'm') engineRef.current?.toggleMute();
      else if (k === 'g' && !paused) setModal((m) => (m === 'gacha' ? null : 'gacha'));
      else if (k === '1') engineRef.current?.setSpeed(1);
      else if (k === '2') engineRef.current?.setSpeed(2);
      else if (k === '3') engineRef.current?.setSpeed(3);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, modal, paused]);

  const start = () => {
    if (hasSave) {
      engineRef.current?.continueFromStory();
      setView('game');
    } else {
      engineRef.current?.startGame();
      setChapter(0);
      setView('story');
    }
  };

  const engine = engineRef.current;
  const meta = engine ? engine.getMeta() : null;
  const inGame = view === 'game' && hud;

  return (
    <div className="relative w-screen h-screen bg-[#07060b] overflow-hidden font-body">
      {/* battle layer — canvas always mounted */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#05040a]">
        <div className="relative" style={{ width: 'min(100vw, calc(100vh * 2.0625))' }}>
          <canvas ref={canvasRef} className="block w-full h-auto" />

          {inGame && (
            <>
              <GameHud
                hud={hud}
                engine={engine}
                onOpen={(m) => { setModal(m); setMetaTick((t) => t + 1); }}
                onPause={() => { engineRef.current?.togglePause(); setPaused((p) => !p); }}
              />

              {/* keyboard hints */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-3 text-[10px] font-display tracking-wider text-[#8a8172] pointer-events-none select-none">
                <span><span className="kbd">G</span> Triệu hồi</span>
                <span><span className="kbd">1·2·3</span> Tốc độ</span>
                <span><span className="kbd">P</span> Tạm dừng</span>
                <span><span className="kbd">M</span> Âm thanh</span>
              </div>

              {/* first-run tip */}
              {hud.kills === 0 && hud.wave <= 1 && !modal && (
                <div className="absolute bottom-24 right-4 anim-fade-up pointer-events-none" style={{ animationDelay: '1.5s' }}>
                  <div className="panel-dark px-4 py-2.5 text-[12px] text-[#e8dfc8] max-w-[230px]" style={{ clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}>
                    <span className="text-pink-300 font-display font-bold">Mẹo:</span> nhấn <b className="text-pink-300">Triệu Hồi</b>, dùng <b className="text-pink-300">{GACHA_COST} Ngọc</b> để gọi đồng hành đầu tiên!
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* modal layer */}
      {inGame && modal === 'gacha' && engine && (
        <GachaModal engine={engine} hud={hud} onClose={() => setModal(null)} />
      )}
      {inGame && modal === 'party' && engine && (
        <PartyModal engine={engine} hud={hud} onClose={() => setModal(null)} />
      )}
      {inGame && modal === 'equip' && engine && meta && (
        <EquipModal
          key={metaTick}
          engine={engine}
          onClose={() => setModal(null)}
          ownedSkins={meta.ownedSkins}
          equippedSkin={meta.equippedSkin}
          ownedItems={meta.ownedItems}
          equipped={meta.equipped}
        />
      )}
      {inGame && paused && !modal && (
        <PauseOverlay
          engine={engine}
          onResume={() => { engineRef.current?.togglePause(); setPaused(false); }}
        />
      )}

      {/* full-screen view layers */}
      {view === 'title' && (
        <div className="absolute inset-0 z-20">
          <TitleScreen onStart={start} hasSave={hasSave} />
        </div>
      )}
      {view === 'story' && (
        <div className="absolute inset-0 z-20">
          <StoryScreen
            chapter={chapter}
            onDone={() => {
              engineRef.current?.continueFromStory();
              setView('game');
            }}
          />
        </div>
      )}
      {view === 'victory' && stats && (
        <div className="absolute inset-0 z-20">
          <VictoryScreen stats={stats} onRestart={() => engineRef.current?.hardReset()} />
        </div>
      )}
    </div>
  );
}
