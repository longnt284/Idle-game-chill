import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GameIdle, VIEW_W, VIEW_H } from './game/engine';
import type { MetaInfo, EndStats, EngineEvent, OfflineReport } from './game/engine';
import { TitleScreen, StoryScreen, EndScreen } from './ui/screens';
import {
  HudOverlay, SummonModal, PartyModal, EquipModal, SkinModal, WeaponModal,
  PauseModal, PrestigeModal, OfflineModal, KaelModal, DailyModal, AchievementModal,
  ShopModal, QuestModal, TrialModal, ExpeditionModal,
} from './ui/panels';
import type { PanelId } from './ui/panels';

type Screen = 'title' | 'story' | 'game' | 'victory';

/**
 * Sân khấu cố định 960×540: mọi lớp giao diện được đặt trong hệ toạ độ này
 * rồi phóng to bằng transform, nên bố cục luôn khớp với canvas và chữ vẫn
 * sắc nét ở mọi kích thước màn hình.
 */
function useStageScale(): { ref: React.RefObject<HTMLDivElement>; scale: number } {
  const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (): void => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setScale(r.width / VIEW_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

export default function App(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameIdle | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [chapter, setChapter] = useState(0);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [panel, setPanel] = useState<PanelId>('none');
  const [stats, setStats] = useState<EndStats | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [offline, setOffline] = useState<OfflineReport | null>(null);
  const { ref: stageRef, scale } = useStageScale();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameIdle(canvas, (e: EngineEvent) => {
      if (e.type === 'meta') {
        const m = engineRef.current?.getMeta() ?? null;
        if (!m) return;
        setMeta(m);
        // Đồng bộ bảng Tạm Dừng khi người chơi dùng phím P/Esc.
        setPanel((p) => (m.paused && p === 'none' ? 'pause' : !m.paused && p === 'pause' ? 'none' : p));
      } else if (e.type === 'story') {
        setChapter(e.chapter);
        setScreen('story');
      } else if (e.type === 'victory') {
        setStats(e.stats);
        setScreen('victory');
        setPanel('none');
      } else if (e.type === 'offline') {
        setOffline(e.report);
      }
    });
    engineRef.current = engine;
    setHasSave(engine.hasSaveData());
    setMeta(engine.getMeta());
    const onOpen = (ev: Event): void => setPanel((ev as CustomEvent).detail as PanelId);
    window.addEventListener('hk-open-panel', onOpen);
    return () => {
      window.removeEventListener('hk-open-panel', onOpen);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const startGame = useCallback((): void => {
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
  }, []);

  const onStoryDone = useCallback((): void => {
    engineRef.current?.continueFromStory();
    setScreen('game');
  }, []);

  const closePanel = useCallback(() => setPanel('none'), []);
  const eng = engineRef.current;
  const inGame = screen === 'game' && meta !== null && eng !== null;

  // Lịch điểm danh tự mở đúng một lần mỗi phiên, và chỉ khi thật sự có quà
  // chờ: đây là thứ dễ bỏ quên nhất, nhưng bật lại mỗi lần đóng thì thành
  // phiền. Nhường chỗ cho bảng ngoại tuyến và cho bảng người chơi đang mở.
  const dailyAutoShown = useRef(false);
  useEffect(() => {
    if (dailyAutoShown.current) return;
    if (screen !== 'game' || !meta || offline !== null) return;
    if (!meta.daily.canClaim) return;
    dailyAutoShown.current = true;
    setPanel((p) => (p === 'none' ? 'daily' : p));
  }, [screen, meta, offline]);

  // Khi có bảng đang mở, engine bỏ qua phím tắt (P/Esc/M/F): mỗi phím chỉ
  // được xử lý bởi đúng một nơi. Bảng Tạm Dừng tự gọi togglePause khi đóng.
  const uiBlocked = panel !== 'none' || offline !== null || screen !== 'game';
  useEffect(() => { engineRef.current?.setUiBlocked(uiBlocked); }, [uiBlocked]);

  return (
    <div className="w-screen h-screen grid place-items-center overflow-hidden" style={{ background: '#05040a' }}>
      <div
        ref={stageRef}
        className="relative overflow-hidden select-none"
        style={{
          width: 'min(100vw, calc(100vh * 16 / 9))',
          aspectRatio: '16 / 9',
          boxShadow: '0 0 140px rgba(194,23,47,0.18)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'auto' }}
        />

        {/* Lớp giao diện dựng ở hệ toạ độ 960×540 rồi phóng theo khung. */}
        <div
          className="absolute top-0 left-0"
          style={{
            width: VIEW_W, height: VIEW_H,
            transform: `scale(${scale})`, transformOrigin: 'top left',
          }}
        >
          {inGame && eng && meta && <HudOverlay meta={meta} engine={eng} />}

          {inGame && eng && meta && panel === 'summon' && <SummonModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'party' && <PartyModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'equip' && <EquipModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'skin' && <SkinModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'weapon' && <WeaponModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'prestige' && <PrestigeModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'kael' && <KaelModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'daily' && <DailyModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'achievement' && <AchievementModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'shop' && <ShopModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'quest' && <QuestModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'trial' && <TrialModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'expedition' && <ExpeditionModal meta={meta} engine={eng} onClose={closePanel} />}
          {inGame && eng && meta && panel === 'pause' && (
            <PauseModal
              engine={eng}
              meta={meta}
              onTitle={() => { setPanel('none'); eng.toTitle(); setScreen('title'); setHasSave(true); }}
            />
          )}

          {/* Thưởng ngoại tuyến chỉ được CỘNG khi bảng đóng lại — engine giữ
              nó ở trạng thái chờ cho tới lúc đó, và `claimOffline()` tự chốt
              nên ba đường đóng bảng không thể trao thưởng ba lần. */}
          {offline && (
            <OfflineModal
              report={offline}
              onClose={() => { engineRef.current?.claimOffline(); setOffline(null); }}
            />
          )}

          {screen === 'title' && <TitleScreen onStart={startGame} hasSave={hasSave} meta={meta} />}
          {screen === 'story' && <StoryScreen chapter={chapter} onDone={onStoryDone} />}
          {screen === 'victory' && stats && eng && (
            <EndScreen
              stats={stats}
              onEndless={() => { eng.enterEndless(); setScreen('game'); }}
              onNewGamePlus={() => { eng.newGamePlus(); setScreen('game'); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
