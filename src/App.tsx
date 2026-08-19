import { useCallback, useEffect, useRef, useState } from 'react';
import { Engine, VIEW_H, VIEW_W, type EngineEvent, type RunStats } from './game/engine';
import { getMuted, initAudio, setMuted, sfx } from './game/audio';
import { CHAPTERS } from './story';
import { DeathScreen, PauseScreen, StoryScreen, TitleScreen, VictoryScreen } from './ui/screens';

type Screen = 'title' | 'story' | 'playing' | 'pause' | 'dead' | 'victory';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [chapterIdx, setChapterIdx] = useState(0);
  const [stats, setStats] = useState<RunStats>({ level: 1, kills: 0, score: 0, time: 0, floor: 0, bestCombo: 0 });
  const [muted, setMutedState] = useState(false);
  const [size, setSize] = useState({ w: 960, h: 540 });

  const handleEvent = useCallback((e: EngineEvent) => {
    switch (e.type) {
      case 'playing':
        setScreen('playing');
        break;
      case 'pause':
        setScreen('pause');
        break;
      case 'dead':
        setStats(e.stats);
        setScreen('dead');
        break;
      case 'victory':
        setStats(e.stats);
        setScreen('victory');
        break;
      case 'story':
        setChapterIdx(e.chapter);
        setScreen('story');
        break;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, handleEvent);
    engineRef.current = engine;

    const onResize = () => {
      const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
      const w = Math.floor(VIEW_W * scale);
      const h = Math.floor(VIEW_H * scale);
      setSize({ w, h });
      engine.setView(w, h);
    };
    onResize();
    window.addEventListener('resize', onResize);

    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') {
        initAudio();
        const m = !getMuted();
        setMuted(m);
        setMutedState(m);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleEvent]);

  const startGame = useCallback(() => {
    initAudio();
    sfx.click();
    setChapterIdx(0);
    setScreen('story');
  }, []);

  const storyDone = useCallback(() => {
    sfx.click();
    engineRef.current?.beginFloor(chapterIdx);
  }, [chapterIdx]);

  const retry = useCallback(() => {
    initAudio();
    sfx.click();
    engineRef.current?.retryFloor();
  }, []);

  const resume = useCallback(() => {
    sfx.click();
    engineRef.current?.setPaused(false);
  }, []);

  const quitToTitle = useCallback(() => {
    sfx.click();
    engineRef.current?.resetRun();
    setScreen('title');
  }, []);

  const toggleMute = useCallback(() => {
    initAudio();
    const m = !getMuted();
    setMuted(m);
    setMutedState(m);
    if (!m) sfx.click();
  }, []);

  const chapter = CHAPTERS[Math.min(chapterIdx, CHAPTERS.length - 1)];

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#07060b]">
      <div className="relative" style={{ width: size.w, height: size.h }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ imageRendering: 'auto', cursor: screen === 'playing' ? 'crosshair' : 'default' }}
        />
        {screen === 'title' && <TitleScreen onStart={startGame} muted={muted} onToggleMute={toggleMute} />}
        {screen === 'story' && <StoryScreen key={chapterIdx} chapter={chapter} onDone={storyDone} />}
        {screen === 'pause' && (
          <PauseScreen
            stats={engineRef.current?.getStats() ?? stats}
            onResume={resume}
            onQuit={quitToTitle}
            muted={muted}
            onToggleMute={toggleMute}
          />
        )}
        {screen === 'dead' && <DeathScreen stats={stats} onRetry={retry} />}
        {screen === 'victory' && <VictoryScreen stats={stats} onReplay={quitToTitle} />}
      </div>
    </div>
  );
}
