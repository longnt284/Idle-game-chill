import { useEffect, useRef, useState } from 'react';
import { GameIdle, VIEW_W, VIEW_H } from './game/engine';
import type { MetaInfo, EndStats, EngineEvent } from './game/engine';
import { TitleScreen, StoryScreen, EndScreen } from './ui/screens';
import { HudOverlay, SummonModal, PartyModal, EquipModal, SkinModal, PauseModal } from './ui/panels';

type Screen = 'title' | 'story' | 'game' | 'victory';
type Panel = 'none' | 'summon' | 'party' | 'equip' | 'skin' | 'pause';

export default function App(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameIdle | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [chapter, setChapter] = useState(0);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [panel, setPanel] = useState<Panel>('none');
  const [stats, setStats] = useState<EndStats | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const screenRef = useRef<Screen>('title');
  screenRef.current = screen;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameIdle(canvas, (e: EngineEvent) => {
      if (e.type === 'meta') {
        const m = engineRef.current?.getMeta() ?? null;
        if (m) {
          setMeta(m);
          // show pause modal when engine paused via keyboard
          setPanel((p) => (m.paused && p === 'none' ? 'pause' as Panel : !m.paused && p === 'pause' ? 'none' : p));
        }
      } else if (e.type === 'story') {
        setChapter(e.chapter);
        setScreen('story');
      } else if (e.type === 'victory') {
        setStats(e.stats);
        setScreen('victory');
        setPanel('none');
      }
    });
    engineRef.current = engine;
    setHasSave(engine.hasSaveData());
    setMeta(engine.getMeta());
    const onOpen = (ev: Event): void => {
      const detail = (ev as CustomEvent).detail as Panel;
      setPanel(detail);
    };
    window.addEventListener('hk-open-panel', onOpen);
    return () => {
      window.removeEventListener('hk-open-panel', onOpen);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const startGame = (): void => {
    const engine = engineRef.current;
    if (!engine) return;
    const continueSave = engine.hasSaveData();
    engine.startGame();
    if (continueSave) {
      setScreen('game');
    } else {
      setChapter(0);
      setScreen('story');
    }
  };

  const onStoryDone = (): void => {
    engineRef.current?.continueFromStory();
    setScreen('game');
  };

  const eng = engineRef.current;
  const inGame = screen === 'game' && meta !== null && eng !== null;

  return (
    <div className="w-screen h-screen grid place-items-center overflow-hidden" style={{ background: '#05040a' }}>
      <div
        className="relative overflow-hidden select-none"
        style={{
          width: 'min(100vw, calc(100vh * 16 / 9))',
          aspectRatio: '16 / 9',
          boxShadow: '0 0 120px rgba(194,23,47,0.15)',
        }}
      >
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className="absolute inset-0 w-full h-full" style={{ imageRendering: 'auto' }} />

        {/* game HUD */}
        {inGame && eng && meta && <HudOverlay meta={meta} engine={eng} />}

        {/* panels */}
        {inGame && eng && meta && panel === 'summon' && <SummonModal meta={meta} engine={eng} onClose={() => setPanel('none')} />}
        {inGame && eng && meta && panel === 'party' && <PartyModal meta={meta} engine={eng} onClose={() => setPanel('none')} />}
        {inGame && eng && meta && panel === 'equip' && <EquipModal meta={meta} engine={eng} onClose={() => setPanel('none')} />}
        {inGame && eng && meta && panel === 'skin' && <SkinModal meta={meta} engine={eng} onClose={() => setPanel('none')} />}
        {inGame && eng && meta && panel === 'pause' && (
          <PauseModal engine={eng} muted={meta.muted} onTitle={() => { setPanel('none'); eng.toTitle(); setScreen('title'); setHasSave(true); }} />
        )}

        {/* screens */}
        {screen === 'title' && <TitleScreen onStart={startGame} hasSave={hasSave} />}
        {screen === 'story' && <StoryScreen chapter={chapter} onDone={onStoryDone} />}
        {screen === 'victory' && stats && eng && (
          <EndScreen stats={stats} onRestart={() => { eng.newGamePlus(); setScreen('game'); }} />
        )}
      </div>
    </div>
  );
}
