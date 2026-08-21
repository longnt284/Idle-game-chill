import { sfx, initAudio, setMuted as setAudioMuted, getMuted, setZoneMood } from './audio';
import { drawHero, drawMonster, renderPortrait } from './sprites';
import { drawBackground, drawForeground, drawGrade, withReflection, zoneOf } from './scene';
import { alpha as alphaOf } from './color';
import type { AnimState, ChibiLook } from './types';
import { makeAnim } from './types';
import {
  BAL, BOSSES, COMPANIONS, FLOOR_NAMES, GACHA_COST, GACHA_X10_COST, GACHA_X100_COST,
  GACHA_X500_COST, GACHA_SKINS, ITEMS, MAX_FIELD, MAX_ITEM_SLOTS, MAX_PARTY, RARITY_ORDER,
  SKINS, SKIN_COST, SKIN_SHARD_COST,
  STORY_AFTER, TOTAL_FLOORS, WAVES_PER_FLOOR, WEAPONS, WGACHA_COST, WGACHA_X10_COST,
  WGACHA_X100_COST,
  bossIndexForFloor, evoStageOf, floorNameOf, fmt, hasBossOnFloor, levelsAffordable,
  rarityIdx, upgradeCostAt, upgradeCostRange, runeCostAt,
  EVOLUTIONS, EVO_EVERY, MAX_EVO, RUNES, TITLES, titleTierOf,
  WEAPON_MERGE, WEAPON_REFINE_STEP, RARITY, nextWeaponOf, weaponById, weaponTypeDef,
  WTIER, WTIER_ORDER, wtierIdx, MAX_WTIER, rollWeaponTier,
  DUNGEON_MODES, dungeonModeDef, SHOP_ITEMS, shopEntryById, weaponSkinById,
} from './data';
import type {
  BossDef, CompanionDef, DungeonMode, ItemDef, Pos, Rarity, RuneId, ShopEntry, SkillId,
  SkinDef, WeaponDef, WeaponTierId,
} from './data';
import {
  DAILY_CALENDAR, DAILY_CYCLE_DAYS, REWARD_META, cycleKeyOf, dayKeyOf, daysLeftInCycle, prevDayKey,
} from './daily';
import type { DailyDay, DailyReward } from './daily';
import {
  DAILY_QUEST_SLOTS, EDICT_MAX_LEVEL, EDICT_PER_BOSS, EDICT_PER_WAVE, WEEKLY_QUEST_SLOTS,
  WEEKLY_SCALE, dailyQuestsOf, edictCostAt, edictRewardAt, questDefById, weekKeyOf,
  weeklyQuestsOf,
} from './quests';
import type { QuestDef, QuestStat } from './quests';
import { ACHIEVEMENTS, ACH_TOTAL } from './achievements';
import type { AchStatId } from './achievements';

// ---- tái xuất cho tầng UI ----
export * from './data';
export * from './daily';
export * from './quests';
export * from './achievements';
export type { ChibiLook, AnimState } from './types';
import type { WeaponKind } from './types';
export { renderPortrait } from './sprites';
export { zoneOf } from './scene';
/** Tương thích ngược với tên gọi cũ trong UI. */
export const renderChibiPortrait = (
  canvas: HTMLCanvasElement, look: ChibiLook, t: number,
): void => renderPortrait(canvas, look, t);

// ============ hằng số sân khấu ============
export const VIEW_W = 960;
export const VIEW_H = 540;
/**
 * Đường chân tường; sàn nằm bên dưới và chia làm 3 làn có chiều sâu.
 * Toàn bộ đội hình nằm phía trên vùng HUD ở đáy màn hình (y ≳ 470).
 */
const HORIZON = 356;
/**
 * Ba hàng dàn trận tách hẳn nhau theo cả ba trục để nhìn là phân biệt được
 * ngay: chiều sâu (y), tỉ lệ (xa thì nhỏ) và vị trí ngang (hàng sau lùi hẳn
 * về trái). Trước đây ba hàng chỉ cách nhau 34px nên dính thành một khối.
 */
const LANE_Y = [478, 416, 360];
const LANE_SCALE = [1.26, 0.97, 0.75];
/**
 * Điểm neo của từng hàng. Ba dải x được chọn để KHÔNG chồng lên nhau:
 * với tối đa LANE_CAP người mỗi hàng và khoảng cách LANE_GAP, hàng trước
 * chiếm 416–548, hàng giữa 268–400, hàng sau 120–252.
 */
const LANE_ANCHOR = [548, 400, 252];
/** Khoảng cách giữa hai người cùng hàng. */
const LANE_GAP = 44;
/** Số người tối đa mỗi hàng — vượt quá thì dồn sang hàng còn chỗ. */
const LANE_CAP = 4;
/** Màu nhận diện của từng hàng, dùng cho vạch nền và huy hiệu trên giao diện. */
const LANE_TINT = ['#ff8a5a', '#ffd23c', '#8cdcff'];
const LANE_LABEL = ['TIỀN PHONG', 'TRUNG QUÂN', 'HẬU QUÂN'];
const LANE_OF: Record<Pos, number> = { front: 0, mid: 1, back: 2 };
/** Điểm dừng của quái — cách đội hình đủ xa để đọc được đòn đánh. */
const CLASH_X = 636;
const BOSS_CLASH_X = 694;
const MELEE_REACH = 74;
/** Cận chiến chỉ xông lên khi mục tiêu đã vào vùng giao tranh… */
const ENGAGE_X = CLASH_X + 150;
/** …và không bao giờ rời vị trí quá xa, để đội hình không bị vỡ. */
const MAX_ADVANCE = 130;

export const SPEEDS = [1, 2, 3, 4, 6];
const SAVE_KEY = 'huyet-kiem-ca-idle-v3';
const LEGACY_SAVE_KEY = 'huyet-kiem-ca-idle-v2';

// ============ tiện ích ============
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const approach = (v: number, target: number, step: number): number =>
  (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

/**
 * Kael mở thêm chiêu qua từng bậc Tiến Hoá nên mọi kiểm tra kỹ năng phải hỏi
 * cả danh sách, không thể so sánh với một giá trị duy nhất như trước.
 */
const has = (h: { skills: SkillId[] }, id: SkillId): boolean => h.skills.includes(id);

// ============ kiểu dữ liệu runtime ============
export interface HeroUnit {
  uid: string; isKael: boolean; defId: string; level: number;
  atk: number; maxHp: number; hp: number; aspd: number; crit: number;
  ranged: boolean; pos: Pos; lane: number;
  x: number; homeX: number; y: number; scale: number; vx: number;
  atkCd: number; hitCount: number; dead: boolean; respawnT: number;
  hurtT: number; frozenT: number;
  act: AnimState['action']; actT: number; actDur: number; hitFired: boolean;
  anim: AnimState;
  look: ChibiLook;
  /** Kael mở thêm chiêu theo bậc Tiến Hoá nên phải là danh sách, không phải một. */
  skills: SkillId[];
  def: CompanionDef | null;
}
export interface Enemy {
  uid: number; kind: string; boss: boolean;
  hp: number; maxHp: number; atk: number; atkCd: number;
  x: number; y: number; lane: number; scale: number; vx: number;
  stunT: number; hurtT: number; dead: boolean; tint: string; eye: string;
  skillCd: number; telegraph: number; telegraphKind: string;
  act: AnimState['action']; actT: number; actDur: number; hitFired: boolean;
  anim: AnimState; knock: number;
}
interface Proj {
  x: number; y: number; tx: number; ty: number; target: number; speed: number;
  dmg: number; kind: 'arrow' | 'magic' | 'light' | 'acid' | 'bolt' | 'meteor';
  t: number; pierce: number; splash: number; crit: number; ally: boolean;
  ownerSkill: SkillId | null; ownerUid: string; spin: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number; g: number; life: number; maxLife: number;
  size: number; color: string; shape: 'spark' | 'ember' | 'slash' | 'smoke' | 'ice' | 'ring';
  rot: number; vr: number;
}
interface FloatText {
  x: number; y: number; vx: number; vy: number; text: string; color: string;
  life: number; maxLife: number; size: number; bold: boolean;
}
interface Toast { text: string; color: string; life: number; id: number }
interface Pickup { x: number; y: number; vy: number; vx: number; kind: 'gold' | 'gem'; life: number; spin: number }
interface SpawnReq { kind: string; delay: number; lane: number }

export interface EndStats { kills: number; gold: number; playTime: number }
export interface CompanionSlot { id: string; name: string; rarity: Rarity; level: number; power: number; pos: Pos; hpPct: number }
export interface OwnedItem { id: string; name: string; count: number }
export interface OfflineReport { seconds: number; gold: number; gems: number }
export interface BannerState { main: string; sub: string; color: string; t: number; life: number; key: number }

export interface HudState {
  floor: number; wave: number; inBoss: boolean; bossName: string;
  bossHp: number; bossMaxHp: number; bossHpPct: number;
  gold: number; gems: number; power: number; floorName: string; zoneName: string;
  combo: number; comboPct: number; rage: number; enemiesLeft: number;
}
export interface RuneInfo {
  id: RuneId; level: number; max: number; cost: number; total: number; maxed: boolean;
}
export interface EvoInfo {
  stage: number; max: number; name: string; skillName: string; skillDesc: string;
  aura: string; mul: number;
  /** Cấp cần đạt để lên bậc kế tiếp; null nếu đã ở bậc cuối. */
  nextLevel: number | null;
  /** Tiến độ tới bậc kế tiếp, 0..1. */
  progress: number;
  /** Toàn bộ chiêu đã mở, theo thứ tự tiến hoá. */
  unlocked: Array<{ name: string; desc: string }>;
}
export interface TitleInfo {
  tier: number; title: string; frame: string; glow: string; ornament: number; desc: string;
  /** Cấp mở danh hiệu kế tiếp; null nếu đã là danh hiệu cuối. */
  nextLevel: number | null;
  nextTitle: string | null;
  progress: number;
  /** Toàn bộ danh hiệu, kèm trạng thái đã mở hay chưa. */
  all: Array<{ title: string; level: number; frame: string; unlocked: boolean }>;
}
/** Một ô trên lịch điểm danh, đã gắn trạng thái của người chơi hiện tại. */
export interface DailySlot {
  day: number;
  rewards: Array<{ kind: DailyReward['kind']; amount: number; label: string; color: string }>;
  big: boolean;
  claimed: boolean;
  /** Ô sẽ mở ở lần điểm danh kế tiếp. */
  next: boolean;
}
export interface DailyInfo {
  /** Chu kỳ hiện tại, ví dụ `2026-08`. */
  cycle: string;
  claimedCount: number;
  total: number;
  /** Hôm nay đã điểm danh chưa. */
  claimedToday: boolean;
  /** Có ô nào nhận được ngay bây giờ không. */
  canClaim: boolean;
  streak: number;
  bestStreak: number;
  totalDays: number;
  /** Số ngày còn lại của tháng, tính cả hôm nay. */
  daysLeft: number;
  slots: DailySlot[];
  clothShards: number;
  shardCost: number;
}
export interface SkinInfo {
  id: string; name: string; desc: string; source: 'gacha' | 'login' | 'shop';
  owned: boolean; equipped: boolean;
  /** Giá Ngọc — chỉ có nghĩa với skin nguồn `gacha`. */
  gemCost: number;
}
export interface ShopRow extends ShopEntry {
  owned: boolean;
  equipped: boolean;
  /** Bị khoá vì chưa chinh phục Tà Vực. */
  locked: boolean;
  affordable: boolean;
}
export interface ShopInfo {
  gold: number; gems: number;
  evilUnlocked: boolean;
  equippedSkin: string;
  equippedWeaponSkin: string | null;
  items: ShopRow[];
}

export interface QuestRow {
  id: string;
  name: string;
  text: string;
  color: string;
  progress: number;
  target: number;
  points: number;
  done: boolean;
  claimed: boolean;
}
export interface EdictTierRow {
  level: number;
  label: string;
  color: string;
  big: boolean;
  reached: boolean;
  claimed: boolean;
}
export interface QuestInfo {
  daily: QuestRow[];
  weekly: QuestRow[];
  /** Số ô có thể nhận ngay — dùng cho chấm đỏ trên thanh công cụ. */
  claimable: number;
  points: number;
  level: number;
  maxLevel: number;
  /** Điểm cần cho bậc kế tiếp; 0 khi đã kịch bậc. */
  nextCost: number;
  progress: number;
  cycle: string;
  daysLeft: number;
  edictMul: number;
  tiers: EdictTierRow[];
  claimableTiers: number;
}

export interface AchInfo {
  unlocked: number;
  claimed: number;
  total: number;
  claimable: number;
  /** Tổng Ngọc đang chờ nhận. */
  pendingGems: number;
  /** Giá trị hiện tại của từng chỉ số, để giao diện vẽ thanh tiến độ. */
  stats: Record<AchStatId, number>;
  claimedIds: string[];
}
export interface MetaInfo {
  gold: number; gems: number; kaelLevel: number; kaelXp: number; kaelXpNext: number;
  kaelUpgradeCost: number; kaelAtk: number; kaelHp: number;
  kaelCrit: number; kaelAspd: number;
  runes: RuneInfo[];
  evo: EvoInfo;
  title: TitleInfo;
  floor: number; wave: number; kills: number; playTime: number; bestFloor: number;
  speed: number; muted: boolean; paused: boolean; farmMode: boolean;
  seals: number; sealsPending: number; sealMul: number; canPrestige: boolean;
  ownedCompanions: Record<string, number>; party: CompanionSlot[];
  ownedSkins: string[]; equippedSkin: string; ownedItems: OwnedItem[]; equippedItems: string[];
  deployedIds: string[] | null; legionCount: number; legionAtk: number;
  banner: BannerState | null;
  toasts: Toast[];
  hud: HudState;
  daily: DailyInfo;
  ach: AchInfo;
  skins: SkinInfo[];
  clothShards: number;
  /** Độ khó Vực Vô Tận đang chọn. */
  mode: DungeonMode;
  /** Đã dọn trọn 100 tầng chưa — điều kiện mở Hard/Evil. */
  modesUnlocked: boolean;
  evilCleared: boolean;
  quests: QuestInfo;
  ownedShop: string[];
  equippedWeaponSkin: string | null;
}
export type EngineEvent =
  | { type: 'story'; chapter: number }
  | { type: 'victory'; stats: EndStats }
  | { type: 'offline'; report: OfflineReport }
  | { type: 'meta' };

export interface GachaResult {
  kind: 'companion' | 'skin' | 'item'; id: string; name: string;
  rarity: Rarity; isNew: boolean; dupeText: string;
}
export interface CompanionStats {
  level: number; atk: number; hp: number; crit: number; aspd: number; power: number;
  fielded: boolean; deployed: boolean;
}

const MONSTER_BY_ZONE: string[][] = [
  ['slime', 'bat', 'skeleton'],
  ['skeleton', 'imp', 'bat'],
  ['wraith', 'imp', 'skeleton'],
  ['slime', 'wraith', 'skeleton'],
  ['imp', 'ogre', 'skeleton'],
  ['slime', 'wraith', 'imp'],
  ['wraith', 'bat', 'ogre'],
  ['skeleton', 'wraith', 'ogre'],
  ['imp', 'wraith', 'ogre'],
  ['ogre', 'imp', 'wraith'],
];
const FOE_TINT: Record<string, string> = {
  slime: '#4e8a6a', bat: '#6a4a7a', skeleton: '#cfc7b4', imp: '#b04a5a',
  wraith: '#6a5a9a', ogre: '#8a6a4a', knight: '#7a7a8a', demon: '#8a2a3a',
  queen: '#9a3a6a', lich: '#5a6a8a',
};
const FOE_HP_MUL: Record<string, number> = {
  slime: 0.85, bat: 0.62, skeleton: 1, imp: 0.92, wraith: 1.1, ogre: 1.7,
};
const FOE_ATK_MUL: Record<string, number> = { ogre: 1.32, wraith: 1.1, bat: 0.8, slime: 0.85 };
const FOE_SPEED: Record<string, number> = {
  slime: 108, bat: 196, skeleton: 142, imp: 172, wraith: 150, ogre: 100,
  knight: 122, demon: 148, queen: 116, lich: 128,
};

// ============ ENGINE ============
export class GameIdle {
  private ctx: CanvasRenderingContext2D;
  private onEvent: (e: EngineEvent) => void;
  private raf = 0;
  private last = 0;
  private globalT = 0;
  private speedIdx = 0;
  private state: 'title' | 'playing' | 'story' | 'victory' = 'title';
  private paused = false;

  // ---- tài nguyên ----
  private gold = 0;
  private gems = 0;
  private kaelLevel = 1;
  private kaelXp = 0;
  private seals = 0;

  // ---- tiến trình ----
  private floor = 0;
  private wave = 0;
  private bestFloor = 0;
  private kills = 0;
  private playTime = 0;
  private waveDelay = 1;
  private farmMode = false;
  private clearedMilestones: number[] = [];
  private victorySeen = false;

  private spawnQueue: SpawnReq[] = [];
  private scrollX = 0;

  private heroes: HeroUnit[] = [];
  private enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private parts: Particle[] = [];
  private texts: FloatText[] = [];
  private toasts: Toast[] = [];
  private pickups: Pickup[] = [];
  private toastId = 1;

  // ---- sở hữu ----
  private ownedCompanions: Record<string, number> = {};
  private ownedSkins: string[] = ['default'];
  private equippedSkin = 'default';
  private ownedItems: Record<string, number> = {};
  private equippedItems: string[] = [];
  private pullsSinceEpic = 0;
  /** Cấp khảm của từng loại Ngọc Huyết. */
  private runes: Partial<Record<RuneId, number>> = {};
  /** Bậc Tiến Hoá đã thông báo, để chỉ hiện hoạt cảnh một lần mỗi bậc. */
  private evoSeen = 0;
  /** Bậc danh hiệu đã thông báo. */
  private titleSeen = 0;
  private ownedWeapons: Record<string, number> = {};
  /** Số lần tinh luyện của vũ khí đã ở bậc cao nhất. */
  private weaponRefine: Record<string, number> = {};
  private equippedWeapon: string | null = null;
  private deployedIds: string[] | null = null;

  // ---- cửa hàng ----
  /** Mã những món đã mua ở Cửa Hàng — gồm cả trang phục Kael lẫn skin vũ khí. */
  private ownedShop = new Set<string>();
  /** Skin vũ khí đang khoác (`ws_*`), null = dùng chất liệu gốc theo bậc rèn. */
  private equippedWeaponSkin: string | null = null;

  // ---- độ khó Vực Vô Tận ----
  private dungeonMode: DungeonMode = 'normal';
  /** Đã từng dọn ít nhất một tầng ở chế độ Evil — điều kiện mở hai món đắt nhất. */
  private evilCleared = false;

  // ---- nhiệm vụ & Huyết Lệnh ----
  private questDayKey = '';
  private questWeekKey = '';
  /** Giá trị bộ đếm tại lúc ô nhiệm vụ được sinh ra; tiến độ = hiện tại − mốc này. */
  private questBaseDaily: Partial<Record<QuestStat, number>> = {};
  private questBaseWeekly: Partial<Record<QuestStat, number>> = {};
  private questClaimedDaily: string[] = [];
  private questClaimedWeekly: string[] = [];
  /** Ấn Điểm còn lại chưa tiêu vào Huyết Lệnh. */
  private edictPoints = 0;
  private edictLevel = 0;
  private edictClaimed: number[] = [];
  private edictCycle = cycleKeyOf();

  // ---- điểm danh & trang phục ----
  /** Mảnh Trang Phục — tiền tệ duy nhất đổi được sáu bộ skin điểm danh. */
  private clothShards = 0;
  private dailyCycle = cycleKeyOf();
  /** Số ô đã mở trong chu kỳ này; ô kế tiếp luôn là `dailyClaimed + 1`. */
  private dailyClaimed = 0;
  /** Khoá ngày của lần điểm danh gần nhất — chặn nhận hai lần cùng ngày. */
  private dailyLastDay = '';
  private dailyStreak = 0;
  private dailyBestStreak = 0;
  private dailyTotalDays = 0;

  // ---- thành tựu ----
  /**
   * Bộ đếm cộng dồn cho những chỉ số không suy ra được từ trạng thái hiện tại.
   * Các chỉ số suy ra được (cấp Kael, tầng sâu nhất, số skin…) KHÔNG nằm ở đây
   * để tránh hai nguồn sự thật lệch nhau.
   */
  private ctr = {
    kills: 0, bossKills: 0, goldEarned: 0, gemsEarned: 0, pulls: 0, forges: 0,
    maxCombo: 0, wavesCleared: 0, crits: 0, ults: 0, clothEarned: 0,
    prestiges: 0, downs: 0, upgrades: 0,
  };
  /** Mọi vũ khí từng cầm trên tay — bản trùng bị nung chảy khi ghép nên phải ghi riêng. */
  private weaponDex = new Set<string>();
  private achUnlocked = new Set<string>();
  private achClaimed = new Set<string>();
  private achCheckT = 0;

  // ---- chỉ số phái sinh ----
  private legionAtk = 0;
  private legionCount = 0;
  private legionCd = 0;
  private partyAtkAura = 1;
  private partyGoldAura = 1;
  private partyGemAura = 1;

  // ---- chiến đấu ----
  private combo = 0;
  private comboT = 0;
  private rage = 0;
  private ultT = 0;

  // ---- hiệu ứng ----
  private shake = 0;
  private flash = 0;
  private flashColor = '#ff3b52';
  private slowmo = 0;
  private hitstop = 0;
  private banner: BannerState | null = null;
  private bannerKey = 1;
  private bossActive = false;
  private uid = 1;
  private lastMetaPush = 0;
  private pendingStart = false;
  private uiBlocked = false;
  /**
   * Mức chi tiết đồ hoạ tự điều chỉnh (0–2). Máy yếu hoặc không có GPU sẽ
   * tự rơi xuống mức thấp thay vì tụt khung hình — ưu tiên chuyển động mượt
   * hơn là hiệu ứng đẹp, vì đây là game chạy nền liên tục.
   */
  private quality = 2;
  private frameMs = 16;
  private qualityHold = 0;
  private hudCache: HudState = {
    floor: 0, wave: 1, inBoss: false, bossName: '', bossHp: 0, bossMaxHp: 0, bossHpPct: 0,
    gold: 0, gems: 0, power: 0, floorName: FLOOR_NAMES[0], zoneName: zoneOf(0).name,
    combo: 0, comboPct: 0, rage: 0, enemiesLeft: 0,
  };

  constructor(canvas: HTMLCanvasElement, onEvent: (e: EngineEvent) => void) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const c = canvas.getContext('2d', { alpha: false });
    if (!c) throw new Error('Canvas 2D không khả dụng');
    this.ctx = c;
    this.onEvent = onEvent;
    if (document.fonts) {
      void document.fonts.load('20px "Bangers"');
      void document.fonts.load('700 12px "Chakra Petch"');
    }
    this.recomputeParty();
    this.last = performance.now();
    const loop = (now: number): void => {
      // Khung hình đầu tiên có thể mang mốc thời gian được ghi TRƯỚC khi
      // constructor chạy, nên `raw` âm. Không chặn lại thì thời gian toàn cục
      // chạy lùi và mọi thứ suy ra từ nó (chỉ số mảng, pha hoạt ảnh) đều hỏng.
      const raw = Math.max(0, now - this.last);
      const dt = Math.min(0.05, raw / 1000);
      this.last = now;
      this.globalT += dt;
      this.adjustQuality(raw, dt);
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('beforeunload', this.save);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('beforeunload', this.save);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.save();
  }

  /**
   * Theo dõi thời gian khung hình trung bình và hạ/nâng mức chi tiết.
   * Có thời gian chờ giữa hai lần đổi để tránh nhấp nháy qua lại.
   */
  private adjustQuality(rawMs: number, dt: number): void {
    if (rawMs > 400) return; // vừa quay lại tab — số đo không đáng tin
    this.frameMs = this.frameMs * 0.92 + rawMs * 0.08;
    this.qualityHold -= dt;
    if (this.qualityHold > 0) return;
    if (this.frameMs > 34 && this.quality > 0) {
      this.quality -= 1;
      this.qualityHold = 3;
    } else if (this.frameMs < 19 && this.quality < 2) {
      this.quality += 1;
      this.qualityHold = 8;
    }
  }

  private onVisibility = (): void => {
    // Tránh nhảy vọt thời gian khi tab ẩn rồi hiện lại.
    if (!document.hidden) this.last = performance.now();
    else this.save();
  };

  /**
   * Khi một bảng giao diện đang mở, phím tắt của engine phải im lặng —
   * nếu không Escape sẽ vừa đóng bảng vừa bật tạm dừng.
   */
  setUiBlocked(blocked: boolean): void { this.uiBlocked = blocked; }

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space') e.preventDefault();
    if (this.uiBlocked) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.state === 'playing') this.setPaused(!this.paused);
    }
    if (e.code === 'KeyM') { setAudioMuted(!getMuted()); this.pushMeta(); }
    if (e.code === 'KeyF' && this.state === 'playing') this.toggleFarmMode();
  };

  // ---------- kinh tế & đường cong ----------
  /** Chỉ số đợt toàn cục, bắt đầu từ 1. */
  private gw(): number { return this.floor * WAVES_PER_FLOOR + this.wave + 1; }
  private zoneIdx(): number { return Math.floor(this.floor / 10) % 10; }
  private bossDef(): BossDef { return BOSSES[bossIndexForFloor(this.floor)]; }
  /** Vực Vô Tận (sau tầng 100) tăng độ khó theo cấp số nhân riêng. */
  private endlessMul(): number {
    if (this.floor < TOTAL_FLOORS) return 1;
    return Math.pow(BAL.ENDLESS_RATE, this.floor - TOTAL_FLOORS + 1);
  }
  /**
   * Hệ số độ khó Hard/Evil.
   * Chỉ có hiệu lực **trong Vực Vô Tận**: đổi độ khó của 100 tầng cốt truyện
   * sẽ phá vỡ đường cong cân bằng đã tính sẵn, còn ở Vực Vô Tận thì mọi thứ
   * đằng nào cũng đã vượt xa bảng số gốc nên nhân thêm là an toàn.
   */
  private modeFoeMul(): number {
    if (this.floor < TOTAL_FLOORS) return 1;
    return dungeonModeDef(this.dungeonMode).foeMul;
  }
  /** Hệ số phần thưởng theo độ khó — Hard 0.9, Evil 0.8. */
  private modeRewardMul(): number {
    if (this.floor < TOTAL_FLOORS) return 1;
    return dungeonModeDef(this.dungeonMode).rewardMul;
  }
  private foeHpBase(): number {
    return BAL.FOE_HP0 * Math.pow(BAL.FOE_HP_RATE, this.gw() - 1) * this.endlessMul() * this.modeFoeMul();
  }
  private foeAtkBase(): number {
    return BAL.FOE_ATK0 * Math.pow(BAL.FOE_ATK_RATE, this.gw() - 1)
      * Math.pow(this.endlessMul(), 0.75) * this.modeFoeMul();
  }
  /** Hệ số nhân vĩnh viễn từ Thăng Hoa. */
  private sealMul(): number { return 1 + this.seals * BAL.SEAL_BONUS; }
  private goldPerKill(): number {
    const combo = 1 + Math.min(this.combo, BAL.COMBO_MAX) * 0.02;
    return BAL.GOLD0 * Math.pow(BAL.GOLD_RATE, this.gw() - 1)
      * this.partyGoldAura * this.sealMul() * combo * this.modeRewardMul();
  }
  /** Tổng % cộng thêm từ vật phẩm đang trang bị (đã nhân số bản sao). */
  private itemBonus(): { atk: number; hp: number; crit: number; aspd: number } {
    const b = { atk: 0, hp: 0, crit: 0, aspd: 0 };
    for (const id of this.equippedItems) {
      const def: ItemDef | undefined = ITEMS.find((i) => i.id === id);
      if (!def) continue;
      const c = this.ownedItems[id] ?? 0;
      if (c <= 0) continue;
      b.atk += (def.bonus.atk ?? 0) * c;
      b.hp += (def.bonus.hp ?? 0) * c;
      b.crit += (def.bonus.crit ?? 0) * c;
      b.aspd += (def.bonus.aspd ?? 0) * c;
    }
    // Trần mềm để tích trữ vô hạn bản sao không phá vỡ cân bằng.
    b.atk = Math.min(b.atk, 12);
    b.hp = Math.min(b.hp, 12);
    b.crit = Math.min(b.crit, 0.45);
    b.aspd = Math.min(b.aspd, 1.2);
    return b;
  }
  private power(): number {
    let p = 0;
    for (const h of this.heroes) p += h.atk * h.aspd * 2 + h.maxHp * 0.2;
    p += this.legionAtk * 0.9;
    return Math.round(p);
  }
  /** Tổng sát thương mỗi giây danh nghĩa của đội — dùng cho tuyệt kỹ. */
  private partyDps(): number {
    let d = 0;
    for (const h of this.heroes) if (!h.dead) d += h.atk * h.aspd;
    return d + this.legionAtk;
  }

  // ---------- Ngọc Huyết ----------
  runeLevel(id: RuneId): number { return this.runes[id] ?? 0; }
  /** Tổng mức cộng của một loại ngọc (đã nhân số cấp). */
  private runeBonus(id: RuneId): number {
    const def = RUNES.find((r) => r.id === id);
    if (!def) return 0;
    return Math.min(this.runeLevel(id), def.max) * def.per;
  }
  runeCostOf(id: RuneId): number { return runeCostAt(this.runeLevel(id)); }
  runeMaxed(id: RuneId): boolean {
    const def = RUNES.find((r) => r.id === id);
    return def ? this.runeLevel(id) >= def.max : true;
  }
  upgradeRune(id: RuneId, times = 1): number {
    const def = RUNES.find((r) => r.id === id);
    if (!def) return 0;
    let done = 0;
    while (done < times && this.runeLevel(id) < def.max) {
      const cost = runeCostAt(this.runeLevel(id));
      if (this.gems < cost) break;
      this.gems -= cost;
      this.runes[id] = this.runeLevel(id) + 1;
      done += 1;
    }
    if (done === 0) {
      this.toast(this.runeMaxed(id) ? 'Ngọc này đã đạt cấp tối đa' : 'Không đủ Ngọc để khảm!', '#ff5a6a');
      sfx.warn();
      return 0;
    }
    this.ctr.upgrades += done;
    this.recomputeParty();
    this.toast(`${def.name} +${done} → cấp ${this.runeLevel(id)}`, def.color);
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return done;
  }

  // ---------- Tiến Hoá ----------
  evoStage(): number { return evoStageOf(this.kaelLevel); }
  /** Chiêu thức Kael đã mở — mọi bậc đã qua đều còn hiệu lực. */
  private kaelSkills(): SkillId[] {
    return EVOLUTIONS.slice(0, this.evoStage() + 1).map((e) => e.skill);
  }
  private evoMul(): number { return EVOLUTIONS[this.evoStage()].mul; }

  // ---------- đội hình ----------
  private kaelLook(): ChibiLook {
    const base = (SKINS.find((k) => k.id === this.equippedSkin) ?? SKINS[0]).look;
    const stage = this.evoStage();
    // Vũ khí đang trang bị quyết định hình dáng và độ hào nhoáng trên tay;
    // skin vũ khí mua ở Cửa Hàng phủ thêm bảng màu và hạt nguyên tố lên đó.
    const ws = weaponSkinById(this.equippedWeaponSkin);
    const armed = {
      ...base,
      weapon: this.weaponAnim(),
      weaponTier: this.weaponTier(),
      weaponSkin: ws?.id,
      weaponFx: ws?.fx ?? 0,
    };
    if (stage === 0) return { ...armed, evoTier: 0 };
    const evo = EVOLUTIONS[stage];
    // Tiến Hoá phủ lên skin: đổi hào quang và phụ kiện, giữ nguyên phần còn
    // lại để người chơi vẫn nhận ra bộ skin mình đang mặc.
    return { ...armed, aura: evo.aura, accessory: evo.accessory, evoTier: stage };
  }
  private kaelAtkValue(bonus = this.itemBonus()): number {
    return BAL.KAEL_ATK0 * Math.pow(BAL.LEVEL_POWER, this.kaelLevel - 1)
      * this.evoMul() * (1 + this.runeBonus('atk'))
      * this.weaponMul() * (1 + bonus.atk) * this.partyAtkAura * this.sealMul();
  }
  private kaelHpValue(bonus = this.itemBonus()): number {
    return BAL.KAEL_HP0 * Math.pow(BAL.LEVEL_HP, this.kaelLevel - 1)
      * (1 + this.runeBonus('hp')) * (1 + bonus.hp) * Math.sqrt(this.sealMul());
  }
  private kaelAspd(bonus = this.itemBonus()): number {
    return Math.min(2.6, (1.12 + this.kaelLevel * 0.003)
      * (1 + bonus.aspd + this.runeBonus('aspd')) * this.weaponAspdMul());
  }
  private kaelCrit(bonus = this.itemBonus()): number {
    return clamp(0.08 + bonus.crit + this.runeBonus('crit') + this.weaponCritAdd(), 0, 0.85);
  }

  private recomputeParty(): void {
    // Giữ nguyên tỉ lệ máu, trạng thái chết và vị trí của các đơn vị đang có.
    const prev = new Map<string, HeroUnit>();
    for (const h of this.heroes) prev.set(h.uid, h);

    const bonus = this.itemBonus();
    let cands = COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0);
    if (this.deployedIds !== null) {
      const set = new Set(this.deployedIds);
      cands = cands.filter((c) => set.has(c.id));
    }
    cands = cands.sort((a, b) => this.compPower(b) - this.compPower(a)).slice(0, MAX_PARTY);

    // Hào quang toàn đội: buff công, vàng, ngọc (có trần để không tăng vô hạn).
    let atkAura = 1, goldAura = 1, gemAura = 1;
    for (const c of cands) {
      if (c.skill.id === 'buff' || c.skill.id === 'holysplash') atkAura *= 1.12;
      if (c.skill.id === 'greed') goldAura *= 1.2;
      if (c.skill.id === 'prospect') gemAura *= 1.25;
    }
    this.partyAtkAura = Math.min(atkAura, 2.5);
    this.partyGoldAura = Math.min(goldAura, 3);
    this.partyGemAura = Math.min(gemAura, 3);

    const laneCount = [0, 0, 0];
    const newHeroes: HeroUnit[] = [];

    // Kael luôn đứng mũi chịu sào.
    newHeroes.push(this.makeHero({
      uid: 'kael', isKael: true, defId: 'kael', level: this.kaelLevel,
      atk: this.kaelAtkValue(bonus), maxHp: this.kaelHpValue(bonus),
      aspd: this.kaelAspd(bonus), crit: this.kaelCrit(bonus),
      ranged: false, pos: 'front', look: this.kaelLook(),
      skills: this.kaelSkills(), def: null,
      slot: 0,
    }, laneCount));

    this.legionAtk = 0;
    this.legionCount = 0;
    cands.forEach((c, i) => {
      const st = this.rawCompanionStats(c, bonus);
      if (i < MAX_FIELD) {
        newHeroes.push(this.makeHero({
          uid: c.id, isKael: false, defId: c.id, level: st.level,
          atk: st.atk, maxHp: st.hp, aspd: st.aspd, crit: st.crit,
          ranged: c.ranged, pos: c.pos, look: c.look, skills: [c.skill.id], def: c,
          slot: i + 1,
        }, laneCount));
      } else {
        // Đội tiếp viện: đóng góp một phần sát thương qua đòn tập kích định kỳ.
        this.legionAtk += st.atk * 0.45;
        this.legionCount += 1;
      }
    });

    for (const h of newHeroes) {
      const old = prev.get(h.uid);
      if (!old) continue;
      h.hp = h.maxHp * clamp(old.hp / old.maxHp, 0, 1);
      h.dead = old.dead;
      h.respawnT = old.respawnT;
      h.x = old.x;
      h.atkCd = old.atkCd;
      h.anim.seed = old.anim.seed;
    }
    this.heroes = newHeroes;
  }

  private makeHero(
    o: {
      uid: string; isKael: boolean; defId: string; level: number; atk: number; maxHp: number;
      aspd: number; crit: number; ranged: boolean; pos: Pos; look: ChibiLook; skills: SkillId[];
      def: CompanionDef | null; slot: number;
    },
    laneCount: number[],
  ): HeroUnit {
    // Hàng ưu tiên theo vai trò; nếu đã đủ chỗ thì dồn sang hàng kế bên để
    // ba dải vị trí không bao giờ tràn vào nhau.
    let lane = LANE_OF[o.pos];
    if (laneCount[lane] >= LANE_CAP) {
      for (let k = 1; k < 3; k++) {
        const alt = (lane + k) % 3;
        if (laneCount[alt] < LANE_CAP) { lane = alt; break; }
      }
    }
    const n = laneCount[lane]++;
    const homeX = LANE_ANCHOR[lane] - Math.min(n, LANE_CAP - 1) * LANE_GAP;
    return {
      uid: o.uid, isKael: o.isKael, defId: o.defId, level: o.level,
      atk: o.atk, maxHp: o.maxHp, hp: o.maxHp, aspd: o.aspd, crit: clamp(o.crit, 0, 0.85),
      ranged: o.ranged, pos: o.pos, lane,
      x: homeX, homeX, y: LANE_Y[lane], scale: LANE_SCALE[lane] * (o.isKael ? 1.14 : 1), vx: 0,
      atkCd: rand(0.1, 0.7), hitCount: 0, dead: false, respawnT: 0,
      hurtT: 0, frozenT: 0,
      act: 'idle', actT: 0, actDur: 0, hitFired: false,
      anim: makeAnim(o.slot * 1.37 + 0.3),
      look: o.look, skills: o.skills, def: o.def,
    };
  }

  private rawCompanionStats(
    c: CompanionDef, bonus = this.itemBonus(),
  ): { level: number; atk: number; hp: number; aspd: number; crit: number } {
    const level = Math.max(1, this.ownedCompanions[c.id] ?? 1);
    const g = Math.pow(BAL.LEVEL_POWER, level - 1);
    const gh = Math.pow(BAL.LEVEL_HP, level - 1);
    const r = rarityIdx(c.rarity);
    const rarAtk = 1 + r * 0.18;
    const rarHp = 1 + r * 0.22;
    return {
      level,
      atk: c.atkBase * g * rarAtk * this.weaponMulParty()
        * (1 + bonus.atk) * this.partyAtkAura * this.sealMul() * BAL.COMPANION_POWER,
      hp: c.hpBase * gh * rarHp * (1 + bonus.hp) * Math.sqrt(this.sealMul()) * BAL.COMPANION_POWER,
      aspd: c.atkSpd * (1 + bonus.aspd) * (c.skill.id === 'flurry' ? 1.2 : 1),
      crit: clamp(c.crit + bonus.crit + (c.skill.id === 'crit' ? 0.18 : c.skill.id === 'flurry' ? 0.25 : 0), 0, 0.85),
    };
  }

  /** Chỉ số công khai cho UI — dùng đúng công thức mà engine dùng, không tính lại. */
  companionStats(id: string): CompanionStats | null {
    const c = COMPANIONS.find((x) => x.id === id);
    if (!c) return null;
    const owned = this.ownedCompanions[id] ?? 0;
    const st = this.rawCompanionStats(c);
    const deployed = this.deployedIds === null ? owned > 0 : this.deployedIds.includes(id);
    return {
      level: owned, atk: st.atk, hp: st.hp, crit: st.crit, aspd: st.aspd,
      power: Math.round(st.atk * st.aspd * 2 + st.hp * 0.2),
      fielded: this.heroes.some((h) => h.defId === id),
      deployed: deployed && owned > 0,
    };
  }

  private compPower(c: CompanionDef): number {
    const lvl = Math.max(1, this.ownedCompanions[c.id] ?? 1);
    const g = Math.pow(BAL.LEVEL_POWER, lvl - 1);
    const r = rarityIdx(c.rarity);
    return c.atkBase * g * (1 + r * 0.18) * c.atkSpd * 2 + c.hpBase * g * 0.2 + r * 40;
  }

  // ---------- nâng cấp ----------
  upgradeCostOf(lvl: number): number { return upgradeCostAt(Math.max(1, lvl)); }
  upgradeBulkCost(id: string, n: number): number {
    return upgradeCostRange(Math.max(1, this.ownedCompanions[id] ?? 1), n);
  }
  upgradeCompanion(id: string): boolean { return this.upgradeCompanionTimes(id, 1) > 0; }

  upgradeCompanionTimes(id: string, n: number): number {
    const lvl = this.ownedCompanions[id] ?? 0;
    if (lvl <= 0) return 0;
    const done = levelsAffordable(lvl, this.gold, n);
    if (done <= 0) {
      this.toast('Không đủ Vàng để nâng cấp!', '#ff5a6a');
      sfx.warn();
      return 0;
    }
    this.gold -= upgradeCostRange(lvl, done);
    this.ownedCompanions[id] = lvl + done;
    this.ctr.upgrades += done;
    this.recomputeParty();
    const def = COMPANIONS.find((c) => c.id === id);
    this.toast(`${def?.name ?? id} ${done > 1 ? `+${done} cấp → ` : '→ '}Lv ${lvl + done}`, '#3fe0b0');
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return done;
  }
  /** Nâng cấp tối đa trong khả năng chi trả. */
  upgradeCompanionMax(id: string): number { return this.upgradeCompanionTimes(id, 500); }

  /**
   * Nâng đều toàn bộ đồng hành đang sở hữu bằng số vàng hiện có.
   * Vì chi phí mỗi cấp tăng nhanh hơn sức mạnh mỗi cấp (1.16 so với 1.10),
   * mỗi đồng vàng bỏ vào người thấp cấp luôn đổi được nhiều lực chiến hơn.
   * Do đó "san bằng lên cùng một mức" là cách tiêu hợp lý, và mức đó tìm
   * bằng tìm kiếm nhị phân thay vì mua từng cấp một.
   */
  upgradeAllCompanions(): number {
    const ids = this.ownedIds();
    if (ids.length === 0) {
      this.toast('Chưa có đồng hành nào để nâng cấp', '#ff9a3c');
      sfx.warn();
      return 0;
    }
    const levels = ids.map((id) => Math.max(1, this.ownedCompanions[id] ?? 1));
    const costToReach = (target: number): number =>
      levels.reduce((sum, l) => sum + upgradeCostRange(l, Math.max(0, target - l)), 0);

    let lo = Math.min(...levels);
    let hi = lo + 1;
    // nới trần cho tới khi vượt quá số vàng đang có
    while (costToReach(hi) <= this.gold && hi - lo < 5000) hi *= 2;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (costToReach(mid) <= this.gold) lo = mid; else hi = mid - 1;
    }
    let spent = costToReach(lo);
    let gained = 0;
    ids.forEach((id, i) => {
      const target = Math.max(levels[i], lo);
      gained += target - levels[i];
      this.ownedCompanions[id] = target;
      levels[i] = target;
    });
    // Phần vàng lẻ còn lại: rải tiếp cho những người thấp cấp nhất.
    let rest = this.gold - spent;
    for (let guard = 0; guard < 400; guard++) {
      let best = -1;
      let bestCost = Infinity;
      for (let i = 0; i < ids.length; i++) {
        const c = upgradeCostAt(levels[i]);
        if (c < bestCost) { bestCost = c; best = i; }
      }
      if (best < 0 || bestCost > rest) break;
      rest -= bestCost;
      spent += bestCost;
      levels[best] += 1;
      this.ownedCompanions[ids[best]] = levels[best];
      gained += 1;
    }

    if (gained === 0) {
      this.toast('Không đủ Vàng để nâng cấp toàn đội', '#ff5a6a');
      sfx.warn();
      return 0;
    }
    this.gold -= spent;
    this.ctr.upgrades += gained;
    this.recomputeParty();
    this.toast(`Toàn đội +${gained} cấp — tốn ${fmt(spent)} Vàng`, '#3fe0b0');
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return gained;
  }

  kaelUpgradeCost(): number { return upgradeCostAt(this.kaelLevel) * 3; }
  upgradeKael(times = 1): number {
    let done = 0;
    while (done < times) {
      const cost = this.kaelUpgradeCost();
      if (this.gold < cost) break;
      this.gold -= cost;
      this.kaelLevel += 1;
      done += 1;
    }
    if (done === 0) { this.toast('Không đủ Vàng để tôi luyện!', '#ff5a6a'); sfx.warn(); return 0; }
    this.ctr.upgrades += done;
    this.recomputeParty();
    this.checkEvolution();
    this.checkTitle();
    this.toast(`KAEL tôi luyện → Lv ${this.kaelLevel}`, '#ffd23c');
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return done;
  }

  // ---------- chọn đồng hành ra trận ----------
  private ownedIds(): string[] {
    return COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0).map((c) => c.id);
  }
  toggleDeploy(id: string): void {
    if ((this.ownedCompanions[id] ?? 0) <= 0) return;
    const cur = this.deployedIds ?? this.ownedIds();
    if (cur.includes(id)) {
      this.deployedIds = cur.filter((x) => x !== id);
    } else {
      if (cur.length >= MAX_PARTY) {
        this.toast(`Tối đa ${MAX_PARTY} đồng hành ra trận!`, '#ff5a6a');
        sfx.warn();
        return;
      }
      this.deployedIds = [...cur, id];
    }
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  deployAll(): void {
    this.deployedIds = COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0)
      .sort((a, b) => this.compPower(b) - this.compPower(a))
      .slice(0, MAX_PARTY)
      .map((c) => c.id);
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  clearDeploy(): void {
    this.deployedIds = [];
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }
  deployedCount(): number {
    return this.deployedIds === null ? this.ownedIds().length : this.deployedIds.length;
  }

  // ---------- vũ khí ----------
  /**
   * Vũ khí cộng theo TỈ LỆ chứ không phải điểm công cố định.
   * Cộng cố định sẽ vô nghĩa ở tầng sâu (khi chỉ số đã tăng theo cấp số nhân),
   * còn cộng theo tỉ lệ thì luôn đáng để đi săn vũ khí tốt hơn.
   */
  private equippedDef(): WeaponDef | null {
    return this.equippedWeapon ? weaponById(this.equippedWeapon) ?? null : null;
  }
  /** Tổng phần trăm công của một vũ khí, đã tính số lần tinh luyện. */
  private weaponPct(id: string): number {
    const def = weaponById(id);
    if (!def) return 0;
    return def.atkPct * (1 + WEAPON_REFINE_STEP * (this.weaponRefine[id] ?? 0));
  }
  private weaponMul(): number {
    const def = this.equippedDef();
    return def ? 1 + this.weaponPct(def.id) : 1;
  }
  /** Đồng hành hưởng một phần hiệu lực vũ khí của Kael. */
  private weaponMulParty(): number { return 1 + (this.weaponMul() - 1) * 0.35; }
  /** Mỗi loại vũ khí đổi nhịp đánh và chí mạng theo cách riêng. */
  private weaponAspdMul(): number {
    const def = this.equippedDef();
    return def ? weaponTypeDef(def.type).aspd : 1;
  }
  private weaponCritAdd(): number {
    const def = this.equippedDef();
    return def ? weaponTypeDef(def.type).crit : 0;
  }
  private weaponAnim(): WeaponKind {
    const def = this.equippedDef();
    return def ? weaponTypeDef(def.type).anim : 'sword';
  }
  private weaponTier(): number {
    const def = this.equippedDef();
    return def ? wtierIdx(def.tier) : 0;
  }

  equippedWeaponDef(): {
    def: WeaponDef; refine: number; pct: number; partyPct: number; trait: string;
    aspd: number; crit: number;
  } | null {
    const def = this.equippedDef();
    if (!def) return null;
    const t = weaponTypeDef(def.type);
    return {
      def,
      refine: this.weaponRefine[def.id] ?? 0,
      pct: Math.round(this.weaponPct(def.id) * 100),
      partyPct: Math.round((this.weaponMulParty() - 1) * 100),
      trait: t.trait, aspd: t.aspd, crit: t.crit,
    };
  }
  private weaponScore(id: string): number { return this.weaponPct(id); }

  equipWeapon(id: string): void {
    if ((this.ownedWeapons[id] ?? 0) <= 0) return;
    this.equippedWeapon = id;
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }

  /**
   * Nhận một vũ khí. Bản trùng được gom lại; đủ WEAPON_MERGE bản thì lột xác
   * lên bậc trên cùng loại — và vì bản mới cũng có thể đủ số, phép ghép chạy
   * lan truyền cho tới khi không còn gộp được nữa.
   */
  private addWeapon(id: string): { isNew: boolean; merged: WeaponDef | null } {
    const isNew = (this.ownedWeapons[id] ?? 0) === 0;
    this.ownedWeapons[id] = (this.ownedWeapons[id] ?? 0) + 1;
    this.weaponDex.add(id);
    let merged: WeaponDef | null = null;
    let cur = id;
    for (let guard = 0; guard < 8; guard++) {
      const count = this.ownedWeapons[cur] ?? 0;
      if (count < WEAPON_MERGE) break;
      const def = weaponById(cur);
      if (!def) break;
      const next = nextWeaponOf(def);
      this.ownedWeapons[cur] = count - WEAPON_MERGE + 1; // giữ lại một bản gốc
      if (!next) {
        // Đã ở bậc cao nhất: dồn thành tinh luyện thay vì lột xác.
        this.weaponRefine[cur] = (this.weaponRefine[cur] ?? 0) + 1;
        this.toast(`${def.name} tinh luyện +${this.weaponRefine[cur]}`, '#7dff5a');
        break;
      }
      this.ownedWeapons[next.id] = (this.ownedWeapons[next.id] ?? 0) + 1;
      this.weaponDex.add(next.id);
      merged = next;
      this.toast(`${def.name} ×${WEAPON_MERGE} → ${next.name}!`, WTIER[next.tier].color);
      sfx.levelup();
      cur = next.id;
    }
    // luôn cầm món mạnh nhất
    let best = this.equippedWeapon;
    let bestScore = best ? this.weaponScore(best) : -1;
    for (const k of Object.keys(this.ownedWeapons)) {
      if ((this.ownedWeapons[k] ?? 0) <= 0) continue;
      const sc = this.weaponScore(k);
      if (sc > bestScore) { bestScore = sc; best = k; }
    }
    if (best && best !== this.equippedWeapon) {
      this.equippedWeapon = best;
      const d = weaponById(best);
      if (d) this.toast(`Đã trang bị ${d.name}!`, '#ffb43c');
    }
    return { isNew, merged };
  }

  weaponGacha(times: 1 | 10 | 100 = 1): Array<{ def: WeaponDef; isNew: boolean; merged: WeaponDef | null }> | null {
    const cost = times === 1 ? WGACHA_COST : times === 10 ? WGACHA_X10_COST : WGACHA_X100_COST;
    if (this.gems < cost) { this.toast('Không đủ Ngọc để rèn!', '#ff5a6a'); sfx.warn(); return null; }
    this.gems -= cost;
    this.ctr.forges += times;
    const out: Array<{ def: WeaponDef; isNew: boolean; merged: WeaponDef | null }> = [];
    let bestMerge: WeaponDef | null = null;
    for (let i = 0; i < times; i++) {
      // Bảng tỉ lệ nằm ở data.ts và ba bậc chót KHÔNG có mặt trong đó: con
      // đường duy nhất lên tới chúng là gom mảnh trùng rồi ghép.
      const def = pick(WEAPONS.filter((w) => w.tier === rollWeaponTier()));
      const res = this.addWeapon(def.id);
      if (res.merged && (!bestMerge || res.merged.tierIdx > bestMerge.tierIdx)) bestMerge = res.merged;
      out.push({ def, ...res });
    }
    this.recomputeParty();
    sfx.pickup();
    // Chỉ phát hoạt cảnh lột xác MỘT lần cho lượt rèn, và cho món cao nhất:
    // rèn ×100 có thể ghép hàng chục lần, phát hết thì màn hình trắng xoá.
    if (bestMerge) this.ascendFx(WTIER[bestMerge.tier].color, bestMerge.tierIdx);
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return out;
  }

  /**
   * Hoạt cảnh "lột xác": vòng xung, cột sáng, tro bay và khựng hình.
   * Dùng chung cho lột xác vũ khí và cho việc khoác trang phục mới — hai
   * khoảnh khắc mà người chơi vừa bỏ công/bỏ của ra, nên chúng phải *nhìn
   * thấy được* chứ không chỉ là một dòng chữ trôi qua.
   */
  private ascendFx(color: string, power: number): void {
    const kael = this.heroes.find((h) => h.isKael);
    const x = kael?.x ?? LANE_ANCHOR[0];
    const y = kael?.y ?? LANE_Y[0];
    const k = 1 + Math.min(power, MAX_WTIER) / MAX_WTIER; // 1 → 2 theo bậc
    this.burst(x, y - 60, Math.round(40 * k), color, 'ember');
    this.burst(x, y - 60, Math.round(26 * k), '#ffffff', 'spark');
    this.ring(x, y - 34, 70 * k, color);
    this.ring(x, y - 34, 118 * k, '#ffffff');
    // cột sáng dựng lên từ chân — hạt bay thẳng lên thay vì toả tròn
    for (let i = 0; i < Math.round(14 * k); i++) {
      if (this.parts.length > 460) break;
      this.parts.push({
        x: x + rand(-18, 18), y: y - rand(0, 20),
        vx: rand(-14, 14), vy: -rand(160, 340), g: -40,
        life: rand(0.5, 1.1), maxLife: 1.1,
        size: rand(2, 5), color: i % 3 === 0 ? '#ffffff' : color,
        shape: 'ember', rot: 0, vr: rand(-3, 3),
      });
    }
    this.shake = Math.max(this.shake, 10 + power);
    this.flash = Math.min(1, 0.45 + power * 0.05);
    this.flashColor = color;
    this.slowmo = Math.max(this.slowmo, 0.35);
    this.hitstop = Math.max(this.hitstop, 0.06);
    sfx.levelup();
  }

  getWeapons(): Array<{ def: WeaponDef; count: number; refine: number; pct: number; toMerge: number }> {
    return Object.keys(this.ownedWeapons)
      .filter((id) => (this.ownedWeapons[id] ?? 0) > 0)
      .map((id) => ({ def: weaponById(id), id }))
      .filter((w): w is { def: WeaponDef; id: string } => Boolean(w.def))
      .map(({ def, id }) => ({
        def,
        count: this.ownedWeapons[id] ?? 0,
        refine: this.weaponRefine[id] ?? 0,
        pct: Math.round(this.weaponPct(id) * 100),
        toMerge: Math.max(0, WEAPON_MERGE - (this.ownedWeapons[id] ?? 0)),
      }))
      .sort((a, b) => this.weaponScore(b.def.id) - this.weaponScore(a.def.id));
  }

  // ---------- điểm danh mỗi ngày ----------
  /**
   * Đưa lịch về đúng chu kỳ của hôm nay. Gọi ở mọi điểm vào (tải bản lưu, mở
   * bảng, nhấn nhận) chứ không hẹn giờ: người chơi để tab mở qua đêm hoặc qua
   * mùng một là chuyện thường, và cả hai trường hợp đều phải tự đúng.
   */
  private syncDaily(now = new Date()): void {
    const cycle = cycleKeyOf(now);
    if (cycle !== this.dailyCycle) {
      this.dailyCycle = cycle;
      this.dailyClaimed = 0;
    }
    // Chuỗi ngày đứt khi lần điểm danh gần nhất không phải hôm qua hay hôm nay.
    const today = dayKeyOf(now);
    if (this.dailyLastDay && this.dailyLastDay !== today && this.dailyLastDay !== prevDayKey(now)) {
      this.dailyStreak = 0;
    }
  }
  private dailyClaimedToday(now = new Date()): boolean {
    return this.dailyLastDay === dayKeyOf(now);
  }
  canClaimDaily(): boolean {
    this.syncDaily();
    return !this.dailyClaimedToday() && this.dailyClaimed < DAILY_CYCLE_DAYS;
  }

  /** Nhãn hiển thị của một phần thưởng — dùng chung cho lịch và cho thông báo. */
  private rewardLabel(r: DailyReward): string {
    switch (r.kind) {
      case 'gem': return `${fmt(r.amount)} Ngọc`;
      case 'gold': return `${fmt(this.dailyGoldValue(r.amount))} Vàng`;
      case 'wshard': return `${r.amount} Mảnh ${WTIER[r.tier ?? 'rare'].name}`;
      case 'cloth': return `${r.amount} Mảnh Trang Phục`;
      case 'item': return `${r.amount} Vật Phẩm`;
    }
  }
  /**
   * Vàng của lịch điểm danh quy đổi theo nhịp farm hiện tại chứ không phải số
   * cố định: vàng trong game tăng theo cấp số nhân, một con số cứng sẽ thành
   * vô nghĩa chỉ sau chục tầng.
   */
  private dailyGoldValue(minutes: number): number {
    return Math.max(100, Math.round(this.goldPerKill() * 1.4 * 60 * minutes));
  }

  claimDaily(): DailySlot | null {
    this.syncDaily();
    if (this.dailyClaimedToday()) {
      this.toast('Hôm nay đã điểm danh rồi — quay lại vào ngày mai!', '#ff9a3c');
      sfx.warn();
      return null;
    }
    if (this.dailyClaimed >= DAILY_CYCLE_DAYS) {
      this.toast('Đã nhận trọn lịch tháng này. Lịch mới mở đầu tháng sau.', '#8cdcff');
      sfx.warn();
      return null;
    }
    const now = new Date();
    const day: DailyDay = DAILY_CALENDAR[this.dailyClaimed];
    this.dailyClaimed += 1;
    // Chuỗi chỉ nối khi lần trước là đúng hôm qua; syncDaily đã cắt các trường hợp khác.
    this.dailyStreak = this.dailyLastDay === prevDayKey(now) ? this.dailyStreak + 1 : 1;
    this.dailyBestStreak = Math.max(this.dailyBestStreak, this.dailyStreak);
    this.dailyLastDay = dayKeyOf(now);
    this.dailyTotalDays += 1;

    for (const r of day.rewards) this.grantDailyReward(r);

    const slot = this.dailySlotOf(day, this.dailyClaimed);
    this.showBanner(
      `ĐIỂM DANH NGÀY ${day.day}`,
      slot.rewards.map((x) => x.label).join(' · '),
      day.big ? '#ffd23c' : '#7dff5a',
      2.6,
    );
    sfx.levelup();
    this.recomputeParty();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return slot;
  }

  private grantDailyReward(r: DailyReward): void {
    switch (r.kind) {
      case 'gem':
        this.addGems(r.amount);
        break;
      case 'gold':
        this.addGold(this.dailyGoldValue(r.amount));
        break;
      case 'wshard': {
        const tier = r.tier ?? 'rare';
        for (let i = 0; i < r.amount; i++) {
          const def = pick(WEAPONS.filter((w) => w.tier === tier));
          this.addWeapon(def.id);
        }
        break;
      }
      case 'cloth':
        this.clothShards += r.amount;
        this.ctr.clothEarned += r.amount;
        break;
      case 'item': {
        for (let i = 0; i < r.amount; i++) {
          const it = pick(ITEMS);
          this.ownedItems[it.id] = (this.ownedItems[it.id] ?? 0) + 1;
          if (!this.equippedItems.includes(it.id) && this.equippedItems.length < MAX_ITEM_SLOTS) {
            this.equippedItems.push(it.id);
          }
        }
        break;
      }
    }
  }

  private dailySlotOf(day: DailyDay, claimedCount: number): DailySlot {
    return {
      day: day.day,
      rewards: day.rewards.map((r) => ({
        kind: r.kind,
        amount: r.kind === 'gold' ? this.dailyGoldValue(r.amount) : r.amount,
        label: this.rewardLabel(r),
        color: r.kind === 'wshard' ? WTIER[r.tier ?? 'rare'].color : REWARD_META[r.kind].color,
      })),
      big: day.big === true,
      claimed: day.day <= claimedCount,
      next: day.day === claimedCount + 1,
    };
  }

  dailyInfo(): DailyInfo {
    this.syncDaily();
    return {
      cycle: this.dailyCycle,
      claimedCount: this.dailyClaimed,
      total: DAILY_CYCLE_DAYS,
      claimedToday: this.dailyClaimedToday(),
      canClaim: this.canClaimDaily(),
      streak: this.dailyStreak,
      bestStreak: this.dailyBestStreak,
      totalDays: this.dailyTotalDays,
      daysLeft: daysLeftInCycle(),
      slots: DAILY_CALENDAR.map((d) => this.dailySlotOf(d, this.dailyClaimed)),
      clothShards: this.clothShards,
      shardCost: SKIN_SHARD_COST,
    };
  }

  // ---------- ghép trang phục từ mảnh ----------
  skinInfo(): SkinInfo[] {
    return SKINS.map((s) => ({
      id: s.id, name: s.name, desc: s.desc, source: s.source,
      owned: this.ownedSkins.includes(s.id),
      equipped: this.equippedSkin === s.id,
      gemCost: SKIN_COST[s.id] ?? 0,
    }));
  }
  /** Ghép một bộ trang phục điểm danh. Ngọc không mua được — chỉ Mảnh Trang Phục. */
  forgeSkin(id: string): boolean {
    const def = SKINS.find((s) => s.id === id);
    if (!def || def.source !== 'login') return false;
    if (this.ownedSkins.includes(id)) return false;
    if (this.clothShards < SKIN_SHARD_COST) {
      this.toast(`Cần ${SKIN_SHARD_COST} Mảnh Trang Phục — còn thiếu ${SKIN_SHARD_COST - this.clothShards}`, '#ff9a3c');
      sfx.warn();
      return false;
    }
    this.clothShards -= SKIN_SHARD_COST;
    this.ownedSkins.push(id);
    this.equippedSkin = id;
    this.recomputeParty();
    this.showBanner('GHÉP THÀNH CÔNG', def.name, def.look.aura, 2.8);
    this.toast(`Đã ghép trọn bộ ${def.name}!`, def.look.aura);
    const kael = this.heroes.find((h) => h.isKael);
    this.burst(kael?.x ?? LANE_ANCHOR[0], (kael?.y ?? LANE_Y[0]) - 70, 46, def.look.aura, 'ember');
    this.flash = 0.6; this.flashColor = def.look.aura;
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return true;
  }

  // ---------- thành tựu ----------
  /** Nguồn sự thật duy nhất cho giá trị của từng chỉ số thành tựu. */
  private achStats(): Record<AchStatId, number> {
    let companionLevels = 0;
    for (const v of Object.values(this.ownedCompanions)) companionLevels += v;
    let itemsOwned = 0;
    for (const v of Object.values(this.ownedItems)) itemsOwned += v;
    let runeLevels = 0;
    for (const r of RUNES) runeLevels += this.runeLevel(r.id);
    return {
      kills: this.ctr.kills,
      bossKills: this.ctr.bossKills,
      bestFloor: this.bestFloor + 1,
      kaelLevel: this.kaelLevel,
      goldEarned: this.ctr.goldEarned,
      gemsEarned: this.ctr.gemsEarned,
      pulls: this.ctr.pulls,
      forges: this.ctr.forges,
      companionsOwned: Object.keys(this.ownedCompanions).length,
      companionLevels,
      maxCombo: this.ctr.maxCombo,
      playTime: this.playTime,
      runeLevels,
      seals: this.seals,
      skinsOwned: this.ownedSkins.length,
      checkinTotal: this.dailyTotalDays,
      checkinStreak: this.dailyBestStreak,
      itemsOwned,
      wavesCleared: this.ctr.wavesCleared,
      crits: this.ctr.crits,
      ults: this.ctr.ults,
      weaponsOwned: this.weaponDex.size,
      clothEarned: this.ctr.clothEarned,
      prestiges: this.ctr.prestiges,
      downs: this.ctr.downs,
      upgrades: this.ctr.upgrades,
    };
  }

  /**
   * Quét toàn bộ 500 mốc và ghi nhận mốc mới mở. Rẻ hơn nhiều so với việc
   * rải kiểm tra vào từng điểm cộng chỉ số, và không thể bỏ sót mốc nào.
   * Người chơi vẫn phải tự bấm nhận — phần thưởng chỉ được cộng ở `claimAch`.
   */
  private checkAchievements(): void {
    const st = this.achStats();
    let fresh = 0;
    let last = '';
    for (const a of ACHIEVEMENTS) {
      if (this.achUnlocked.has(a.id)) continue;
      if (st[a.stat] >= a.need) {
        this.achUnlocked.add(a.id);
        fresh += 1;
        last = a.name;
      }
    }
    if (fresh === 1) this.toast(`⚑ Thành tựu: ${last} — vào bảng nhận Ngọc`, '#7dff5a');
    else if (fresh > 1) this.toast(`⚑ Mở ${fresh} thành tựu mới — vào bảng nhận Ngọc`, '#7dff5a');
  }

  achInfo(): AchInfo {
    let claimable = 0;
    let pendingGems = 0;
    for (const a of ACHIEVEMENTS) {
      if (this.achUnlocked.has(a.id) && !this.achClaimed.has(a.id)) {
        claimable += 1;
        pendingGems += a.gems;
      }
    }
    return {
      unlocked: this.achUnlocked.size,
      claimed: this.achClaimed.size,
      total: ACH_TOTAL,
      claimable,
      pendingGems,
      stats: this.achStats(),
      claimedIds: [...this.achClaimed],
    };
  }

  claimAch(id: string): boolean {
    // Quét lại trước khi trao: bảng chỉ làm mới mỗi 2 giây, người chơi hoàn
    // toàn có thể bấm đúng vào khoảnh khắc mốc vừa đạt mà engine chưa ghi nhận.
    this.checkAchievements();
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a || !this.achUnlocked.has(id) || this.achClaimed.has(id)) return false;
    this.achClaimed.add(id);
    this.addGems(a.gems);
    this.toast(`${a.name} — +${fmt(a.gems)} Ngọc`, a.color);
    sfx.pickup();
    this.save();
    this.pushMeta();
    return true;
  }

  claimAllAch(): number {
    this.checkAchievements();
    let gems = 0;
    let n = 0;
    for (const a of ACHIEVEMENTS) {
      if (!this.achUnlocked.has(a.id) || this.achClaimed.has(a.id)) continue;
      this.achClaimed.add(a.id);
      gems += a.gems;
      n += 1;
    }
    if (n === 0) {
      this.toast('Chưa có thành tựu nào chờ nhận', '#ff9a3c');
      sfx.warn();
      return 0;
    }
    this.addGems(gems);
    this.showBanner('THÀNH TỰU', `Nhận ${n} mốc · +${fmt(gems)} Ngọc`, '#7dff5a', 2.6);
    sfx.levelup();
    this.save();
    this.pushMeta();
    return n;
  }

  // ---------- cổng thu nhập ----------
  // Mọi đường cộng Vàng/Ngọc đều đi qua đây để bộ đếm thành tựu không bao giờ
  // lệch với số dư thật.
  private addGold(n: number): void {
    if (n <= 0) return;
    this.gold += n;
    this.ctr.goldEarned += n;
  }
  private addGems(n: number): void {
    if (n <= 0) return;
    this.gems += n;
    this.ctr.gemsEarned += n;
  }

  // ---------- luồng trò chơi ----------
  startGame(): void {
    initAudio();
    const hasSave = this.load();
    if (!hasSave) { this.gold = 800; this.gems = 1200; }
    else this.toast('Chào mừng trở lại, Đại Ca!', '#ffd23c');
    this.syncQuests();
    this.recomputeParty();
    this.state = 'playing';
    if (hasSave) this.startFloor(this.floor, true);
    else this.pendingStart = true;
    this.pushMeta();
  }
  hasSaveData(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null || localStorage.getItem(LEGACY_SAVE_KEY) !== null;
    } catch { return false; }
  }
  continueFromStory(): void {
    this.state = 'playing';
    if (this.pendingStart) {
      this.pendingStart = false;
      this.startFloor(this.floor, true);
    } else if (this.enemies.length === 0 && this.spawnQueue.length === 0) {
      this.startFloor(this.floor, true);
    }
    this.pushMeta();
  }
  toTitle(): void {
    this.save();
    this.state = 'title';
    this.enemies = []; this.projs = []; this.pickups = []; this.parts = []; this.texts = [];
    this.bossActive = false; this.banner = null;
    this.pushMeta();
  }
  restart(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* bỏ qua */ }
    this.gold = 800; this.gems = 1200; this.kaelLevel = 1; this.kaelXp = 0;
    this.floor = 0; this.wave = 0; this.kills = 0; this.playTime = 0;
    this.bestFloor = 0; this.seals = 0; this.clearedMilestones = []; this.victorySeen = false;
    this.ownedCompanions = {}; this.ownedSkins = ['default']; this.equippedSkin = 'default';
    this.ownedItems = {}; this.equippedItems = []; this.pullsSinceEpic = 0;
    this.ownedWeapons = {}; this.weaponRefine = {}; this.equippedWeapon = null; this.deployedIds = null;
    this.runes = {}; this.evoSeen = 0; this.titleSeen = 0;
    this.combo = 0; this.rage = 0; this.farmMode = false;
    this.clothShards = 0;
    this.dailyCycle = cycleKeyOf(); this.dailyClaimed = 0; this.dailyLastDay = '';
    this.dailyStreak = 0; this.dailyBestStreak = 0; this.dailyTotalDays = 0;
    this.ownedShop = new Set(); this.equippedWeaponSkin = null;
    this.dungeonMode = 'normal'; this.evilCleared = false;
    this.questDayKey = ''; this.questWeekKey = '';
    this.questClaimedDaily = []; this.questClaimedWeekly = [];
    this.questBaseDaily = {}; this.questBaseWeekly = {};
    this.edictCycle = cycleKeyOf(); this.edictPoints = 0; this.edictLevel = 0; this.edictClaimed = [];
    for (const k of Object.keys(this.ctr) as Array<keyof typeof this.ctr>) this.ctr[k] = 0;
    this.syncQuests();
    this.weaponDex = new Set();
    this.achUnlocked = new Set();
    this.achClaimed = new Set();
    this.recomputeParty();
    this.state = 'playing';
    this.startFloor(0, true);
    this.save();
    this.pushMeta();
  }

  private startFloor(f: number, heal: boolean): void {
    this.floor = Math.max(0, f);
    this.bestFloor = Math.max(this.bestFloor, this.floor);
    this.wave = 0;
    this.waveDelay = 0.7;
    this.spawnQueue = [];
    this.enemies = [];
    this.projs = [];
    this.bossActive = false;
    if (heal) {
      for (const h of this.heroes) { h.hp = h.maxHp; h.dead = false; h.respawnT = 0; h.x = h.homeX; }
    }
    const z = zoneOf(this.floor);
    setZoneMood(this.zoneIdx());
    this.showBanner(
      this.floor >= TOTAL_FLOORS ? `VỰC VÔ TẬN ${this.floor - TOTAL_FLOORS + 1}` : `TẦNG ${this.floor + 1}`,
      `${floorNameOf(this.floor)} · ${z.name}`, z.accent, 2.3,
    );
    sfx.warn();
    this.startWave();
  }

  private startWave(): void {
    const isLast = this.wave === WAVES_PER_FLOOR - 1;
    const isBoss = isLast && hasBossOnFloor(this.floor);
    if (isBoss) {
      this.bossActive = true;
      this.showBanner('BOSS XUẤT HIỆN', this.bossDef().name, '#ff3b52', 2.6);
      sfx.roar();
      this.shake = Math.max(this.shake, 10);
      this.flash = 0.5; this.flashColor = '#ff3b52';
      this.spawnQueue = [{ kind: 'boss', delay: 1.0, lane: 0 }];
    } else {
      const kinds = MONSTER_BY_ZONE[this.zoneIdx()];
      let count = 2 + Math.min(4, Math.floor(this.floor / 9)) + (this.wave >= 3 ? 1 : 0);
      if (isLast) count += 2;
      this.spawnQueue = [];
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({
          kind: pick(kinds),
          delay: 0.15 + i * 0.28,
          lane: i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2,
        });
      }
      if (this.floor >= 5 && this.wave >= 4 && Math.random() < 0.45) {
        this.spawnQueue.push({ kind: 'ogre', delay: 0.5 + count * 0.28, lane: 0 });
      }
    }
    this.waveDelay = 0.8;
  }

  private spawnEnemy(kind: string, lane: number): void {
    const z = zoneOf(this.floor);
    const boss = kind === 'boss';
    const k = boss ? this.bossDef().kind : kind;
    const hp = this.foeHpBase() * (FOE_HP_MUL[k] ?? 1) * (boss ? 2.4 : 1);
    const ln = boss ? 0 : lane;
    this.enemies.push({
      uid: this.uid++, kind: k, boss,
      hp, maxHp: hp,
      atk: this.foeAtkBase() * (FOE_ATK_MUL[k] ?? 1) * (boss ? 1.3 : 1),
      atkCd: rand(0.9, 1.6),
      x: VIEW_W + rand(70, 150) + (boss ? 160 : 0),
      y: LANE_Y[ln], lane: ln,
      scale: LANE_SCALE[ln] * (0.94 + Math.random() * 0.14) * (1 + this.floor * 0.0035) * (boss ? 1.95 : 1),
      vx: 0, stunT: 0, hurtT: 0, dead: false,
      tint: FOE_TINT[k] ?? '#7a7a8a',
      eye: boss ? '#ff3b52' : z.eye,
      skillCd: rand(4, 6), telegraph: 0, telegraphKind: '',
      act: 'spawn', actT: 0, actDur: 0.35, hitFired: true,
      anim: makeAnim(this.uid * 0.73),
      knock: 0,
    });
  }

  private showBanner(main: string, sub: string, color: string, life: number): void {
    this.banner = { main, sub, color, t: 0, life, key: this.bannerKey++ };
  }
  private toast(text: string, color: string): void {
    this.toasts.push({ text, color, life: 3.4, id: this.toastId++ });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  // ---------- chiến đấu ----------
  private critMul(h: HeroUnit): number {
    const base = has(h, 'crit') || has(h, 'flurry') ? 2.5 : 2;
    return h.isKael ? base + this.runeBonus('cdmg') : base;
  }

  private dealHeroDamage(
    h: HeroUnit, e: Enemy, mult: number, opts?: { splashOverride?: number; silent?: boolean },
  ): void {
    if (e.dead) return;
    const crit = Math.random() < h.crit;
    let dmg = h.atk * mult * rand(0.93, 1.07) * (crit ? this.critMul(h) : 1);
    if (has(h, 'berserk') && h.hp < h.maxHp * 0.5) dmg *= 1.6;
    if ((has(h, 'execute') || has(h, 'annihilate')) && e.hp < e.maxHp * 0.3) dmg *= 2;
    h.hitCount += 1;

    this.applyEnemyDamage(e, dmg, crit ? '#ffd23c' : (h.isKael ? '#ffb27a' : '#f2ead8'), crit, h);

    // sát thương lan
    const splashR = opts?.splashOverride ?? (
      has(h, 'splash') ? 108
        : has(h, 'holysplash') ? 132
          : has(h, 'annihilate') ? 126
            : 0);
    if (splashR > 0) {
      for (const o of this.enemies) {
        if (o !== e && !o.dead && Math.abs(o.x - e.x) < splashR) {
          this.applyEnemyDamage(o, dmg * 0.55, '#ffb43c', false, h);
        }
      }
      this.ring(e.x, e.y - 40, splashR * 0.8, h.look.aura);
    }

    // khống chế
    const stunChance = has(h, 'stun') ? 0.25 : has(h, 'freeze') ? (h.defId === 'vex' ? 0.35 : 0.3) : 0;
    if (stunChance > 0 && Math.random() < stunChance && !e.dead) {
      e.stunT = h.defId === 'vex' ? 0.9 : 0.8;
      this.burst(e.x, e.y - 60 * e.scale, 9, '#8cdcff', 'ice');
      sfx.splat();
    }

    // hồi máu
    if (has(h, 'heal') || has(h, 'strongheal') || has(h, 'holysplash')) {
      this.healLowest(dmg * (has(h, 'strongheal') ? 0.9 : 0.4));
    }
    if (has(h, 'lifesteal') && !h.dead) {
      const amt = Math.min(h.maxHp - h.hp, dmg * 0.3);
      if (amt > 0) {
        h.hp += amt;
        this.burst(h.x, h.y - 60, 3, '#ff5a7a', 'spark');
      }
    }

    // thiên thạch mỗi 4 đòn
    if (has(h, 'meteor') && h.hitCount % 4 === 0) {
      this.projs.push({
        x: e.x + rand(-40, 40), y: -70, tx: e.x, ty: e.y - 20, target: 0, speed: 700,
        dmg: h.atk * 2.5, kind: 'meteor', t: 0, pierce: 0, splash: 130, crit: h.crit,
        ally: true, ownerSkill: 'meteor', ownerUid: h.uid, spin: 0,
      });
      sfx.beam();
    }
    void opts?.silent;
  }

  /** Điểm vào duy nhất cho mọi sát thương lên quái — bảo đảm không tính trùng. */
  private applyEnemyDamage(
    e: Enemy, dmg: number, color: string, crit: boolean, killer: HeroUnit | null,
  ): void {
    if (e.dead || dmg <= 0) return;
    e.hp -= dmg;
    e.hurtT = 0.2;
    e.knock = Math.min(14, e.knock + (crit ? 9 : 4) / Math.max(0.5, e.scale));
    if (e.act !== 'attack' && e.act !== 'dead') { e.act = 'hurt'; e.actT = 0; e.actDur = 0.24; }
    this.pushText(
      fmt(dmg), e.x + rand(-14, 14), e.y - 96 * e.scale,
      color, crit ? 25 : 15, crit,
    );
    this.burst(e.x, e.y - 56 * e.scale, crit ? 12 : 5, crit ? '#ffd23c' : '#ff6a52', 'spark');
    if (crit) {
      sfx.crit();
      this.ctr.crits += 1;
      this.hitstop = Math.max(this.hitstop, 0.045);
      this.shake = Math.max(this.shake, 4);
    } else sfx.hit();
    this.addRage(crit ? 1.6 : 0.9);
    if (e.hp <= 0) this.killEnemy(e, killer);
  }

  private healLowest(amount: number): void {
    const hurt = this.heroes
      .filter((a) => !a.dead && a.hp < a.maxHp)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!hurt) return;
    const real = Math.min(hurt.maxHp - hurt.hp, amount);
    if (real <= 0) return;
    hurt.hp += real;
    this.pushText(`+${fmt(real)}`, hurt.x, hurt.y - 110, '#3fe0b0', 13, false);
    this.burst(hurt.x, hurt.y - 60, 4, '#3fe0b0', 'spark');
  }

  private killEnemy(e: Enemy, killer: HeroUnit | null): void {
    if (e.dead) return;
    e.dead = true;
    e.act = 'dead'; e.actT = 0; e.actDur = 0.55;
    this.kills += 1;
    this.ctr.kills += 1;
    if (e.boss) this.ctr.bossKills += 1;

    // chuỗi liên trảm
    this.combo += 1;
    this.comboT = BAL.COMBO_WINDOW;
    this.ctr.maxCombo = Math.max(this.ctr.maxCombo, this.combo);
    this.addRage(3.5);

    const gold = Math.round(this.goldPerKill() * (e.boss ? 12 : 1));
    this.addGold(gold);
    this.burst(e.x, e.y - 56 * e.scale, e.boss ? 46 : 14, '#ffd23c', 'spark');
    this.burst(e.x, e.y - 56 * e.scale, e.boss ? 28 : 9, '#ff6a4a', 'ember');
    this.pickups.push({ x: e.x, y: e.y - 70 * e.scale, vy: -rand(150, 240), vx: rand(-50, 50), kind: 'gold', life: 3.2, spin: rand(0, 6) });
    this.pushText(`+${fmt(gold)}`, e.x, e.y - 116 * e.scale, '#ffd23c', 14, false);

    const gemChance = BAL.GEM_CHANCE * this.partyGemAura * (e.boss ? 3 : 1)
      + (killer && has(killer, 'holysplash') ? 0.08 : 0);
    if (Math.random() < gemChance) {
      const amt = Math.max(1, Math.round((2 + this.gw() * 0.4) * this.sealMul() * this.modeRewardMul()));
      this.addGems(amt);
      this.pickups.push({ x: e.x + 18, y: e.y - 92 * e.scale, vy: -rand(170, 250), vx: rand(-60, 20), kind: 'gem', life: 3.2, spin: rand(0, 6) });
      this.pushText(`+${fmt(amt)} Ngọc`, e.x + 20, e.y - 140, '#ff4fd8', 14, false);
    }

    this.gainXp(this.xpUnit());
    sfx.pickup();

    if (e.boss) {
      const bonusGem = Math.round((10 + this.floor * 2) * this.sealMul() * this.modeRewardMul());
      this.addGems(bonusGem);
      this.pushText(`BOSS +${fmt(bonusGem)} Ngọc`, e.x, e.y - 180, '#ff4fd8', 21, true);
      this.toast(`Boss ${this.bossDef().name} đã gục ngã!`, '#ff3b52');
      sfx.bossdie();
      this.shake = Math.max(this.shake, 18);
      this.flash = 0.9; this.flashColor = '#ff3b52';
      this.slowmo = 0.55;
      this.gainXp(this.xpUnit() * 14);
      // Thưởng tiến trình: toàn bộ đồng hành sở hữu +1 cấp.
      for (const id of Object.keys(this.ownedCompanions)) {
        this.ownedCompanions[id] = (this.ownedCompanions[id] ?? 1) + 1;
      }
      this.recomputeParty();
      this.floorCleared();
    }
  }

  private gainXp(x: number): void {
    this.kaelXp += x;
    let leveled = 0;
    while (this.kaelXp >= this.kaelXpNeed() && leveled < 50) {
      this.kaelXp -= this.kaelXpNeed();
      this.kaelLevel += 1;
      leveled += 1;
    }
    if (leveled > 0) {
      this.toast(`KAEL THĂNG CẤP ${this.kaelLevel}!`, '#ffd23c');
      this.checkEvolution();
      this.checkTitle();
      this.burst(this.heroes[0]?.x ?? 500, LANE_Y[0] - 80, 24, '#ffd23c', 'spark');
      sfx.levelup();
      this.recomputeParty();
      // Thăng cấp hồi 40% máu — không còn bất tử nhờ lên cấp liên tục.
      for (const h of this.heroes) {
        if (!h.dead) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.4);
      }
    }
  }
  /**
   * Kinh nghiệm cần cho cấp kế tiếp.
   * Cố ý dùng đa thức chứ không phải cấp số nhân: lượng kinh nghiệm nhặt được
   * tăng theo luỹ thừa của tầng, nếu yêu cầu cũng tăng theo cấp số nhân với
   * cơ số lớn hơn thì hệ thống sẽ chết hẳn sau vài chục cấp.
   */
  private kaelXpNeed(): number { return Math.round(45 * Math.pow(this.kaelLevel, 1.55)); }

  /** Mở danh hiệu và khung hồ sơ mới sau mỗi 100 cấp. */
  private checkTitle(): void {
    const tier = titleTierOf(this.kaelLevel);
    if (tier === this.titleSeen) return;
    const up = tier > this.titleSeen;
    this.titleSeen = tier;
    if (!up) return;
    const t = TITLES[tier];
    this.showBanner('DANH HIỆU MỚI', t.title, t.frame, 2.8);
    this.toast(`Mở danh hiệu: ${t.title}`, t.frame);
    this.burst(this.heroes[0]?.x ?? LANE_ANCHOR[0], LANE_Y[0] - 90, 34, t.frame, 'spark');
    sfx.levelup();
  }

  /**
   * Gọi sau mỗi lần cấp của Kael thay đổi. Chỉ phát hoạt cảnh khi thật sự
   * bước lên một bậc mới, và ghi lại bậc đã thấy vào bản lưu để không phát
   * lại mỗi lần vào game.
   */
  private checkEvolution(): void {
    const stage = this.evoStage();
    if (stage === this.evoSeen) return;
    const levelledUp = stage > this.evoSeen;
    this.evoSeen = stage;
    if (!levelledUp) return;
    const evo = EVOLUTIONS[stage];
    this.recomputeParty();
    this.showBanner('TIẾN HOÁ', `${evo.name} · mở ${evo.skillName}`, evo.aura, 3.2);
    this.toast(`Kael tiến hoá — ${evo.name}!`, evo.aura);
    this.toast(`Chiêu mới: ${evo.skillName} — ${evo.skillDesc}`, evo.aura);
    const kael = this.heroes.find((h) => h.isKael);
    const x = kael?.x ?? LANE_ANCHOR[0];
    const y = kael?.y ?? LANE_Y[0];
    this.burst(x, y - 70, 60, evo.aura, 'ember');
    this.burst(x, y - 70, 34, '#ffffff', 'spark');
    this.ring(x, y - 40, 90, evo.aura);
    this.shake = Math.max(this.shake, 16);
    this.flash = 0.8; this.flashColor = evo.aura;
    this.slowmo = 0.6;
    sfx.levelup();
    sfx.berserk();
  }
  /** Kinh nghiệm cơ bản theo độ sâu — dùng chung cho quái, đợt và boss. */
  private xpUnit(): number { return 10 * Math.pow(1 + this.floor, 1.35); }

  private floorCleared(): void {
    this.bossActive = false;
    const cleared = this.floor;
    this.bestFloor = Math.max(this.bestFloor, cleared + 1);
    // Đợt cuối của tầng cũng là một đợt đã dọn — nhánh boss không đi qua nhịp
    // đếm đợt thông thường nên phải cộng ở đây.
    this.ctr.wavesCleared += 1;
    this.addEdict(EDICT_PER_WAVE + EDICT_PER_BOSS);
    // Dọn được một tầng ở Tà Vực là mốc mở khoá hai món đắt nhất Cửa Hàng.
    if (this.dungeonMode === 'evil' && cleared >= TOTAL_FLOORS && !this.evilCleared) {
      this.evilCleared = true;
      this.showBanner('TÀ VỰC KHUẤT PHỤC', 'Cửa Hàng mở khoá hai món đắt nhất', '#b14bff', 3.4);
    }
    this.checkAchievements();

    // mốc 10 tầng
    const milestone = Math.floor((cleared + 1) / 10);
    if ((cleared + 1) % 10 === 0 && !this.clearedMilestones.includes(milestone)) {
      this.clearedMilestones.push(milestone);
      const reward = Math.round(400 * milestone * this.sealMul());
      this.addGems(reward);
      this.toast(`⚑ MỐC TẦNG ${cleared + 1} — thưởng ${fmt(reward)} Ngọc!`, '#ff4fd8');
    }

    if (cleared === TOTAL_FLOORS - 1 && !this.victorySeen) {
      this.victorySeen = true;
      this.state = 'victory';
      this.save();
      this.onEvent({ type: 'victory', stats: { kills: this.kills, gold: this.gold, playTime: this.playTime } });
      return;
    }

    this.save();
    this.pushMeta();

    // Chế độ Trấn Giữ: ở lại tầng hiện tại để tích lũy.
    if (this.farmMode) {
      this.toast('Trấn Giữ — lặp lại tầng này để tích lũy', '#8cdcff');
      this.startFloor(cleared, false);
      return;
    }

    const ch = STORY_AFTER[cleared];
    if (ch !== undefined) {
      this.floor = cleared + 1;
      this.wave = 0;
      this.enemies = []; this.projs = []; this.spawnQueue = [];
      this.state = 'story';
      this.onEvent({ type: 'story', chapter: ch });
      return;
    }
    this.startFloor(cleared + 1, false);
  }

  // ---------- nộ khí & tuyệt kỹ ----------
  private addRage(x: number): void {
    if (this.ultT > 0) return;
    this.rage = Math.min(BAL.RAGE_MAX, this.rage + x * (1 + this.runeBonus('rage')));
    if (this.rage >= BAL.RAGE_MAX) this.unleashUltimate();
  }
  private unleashUltimate(): void {
    const alive = this.enemies.filter((e) => !e.dead);
    if (alive.length === 0) { this.rage = BAL.RAGE_MAX; return; }
    this.rage = 0;
    this.ctr.ults += 1;
    this.ultT = 1.1;
    this.slowmo = 0.5;
    this.flash = 0.7; this.flashColor = '#ff3b52';
    this.shake = Math.max(this.shake, 20);
    this.showBanner('HUYẾT NGUYỆT TRẢM', 'Toàn đội hợp kích!', '#ff3b52', 1.7);
    sfx.berserk();
    const kael = this.heroes.find((h) => h.isKael) ?? this.heroes[0];
    const dmg = this.partyDps() * 9 + 40;
    for (const e of alive) {
      this.applyEnemyDamage(e, dmg * rand(0.9, 1.15), '#ff5a7a', true, kael ?? null);
    }
    for (let i = 0; i < 4; i++) {
      this.parts.push({
        x: VIEW_W * 0.2 + i * 160, y: LANE_Y[0] - 70, vx: rand(-30, 30), vy: rand(-60, 20),
        g: 60, life: 0.6, maxLife: 0.6, size: 90, color: '#ff3b52', shape: 'ring',
        rot: rand(0, 6), vr: 2,
      });
    }
    this.burst(VIEW_W * 0.6, LANE_Y[0] - 70, 60, '#ff3b52', 'ember');
  }

  private heroDown(h: HeroUnit): void {
    if (h.dead) return;
    h.dead = true;
    this.ctr.downs += 1;
    h.hp = 0;
    h.act = 'dead'; h.actT = 0; h.actDur = 0.6;
    h.respawnT = h.isKael ? 5 : 6;
    this.burst(h.x, h.y - 60, 16, '#ff5a4a', 'spark');
    this.burst(h.x, h.y - 60, 9, '#8a8a98', 'smoke');
    sfx.hurt();
    this.shake = Math.max(this.shake, 7);
    this.addRage(6);
    if (this.heroes.every((x) => x.dead)) {
      this.toast('Cả đội gục ngã... nhưng sẽ đứng dậy!', '#ff3b52');
      this.combo = 0;
      for (const x of this.heroes) x.respawnT = Math.min(x.respawnT, 3);
    }
  }

  private hitHero(tgt: HeroUnit, rawDmg: number, source: Enemy | null, color: string): void {
    if (tgt.dead) return;
    let dmg = rawDmg;
    if (has(tgt, 'skinwall')) dmg *= 0.7;
    tgt.hp -= dmg;
    tgt.hurtT = 0.3;
    if (tgt.act !== 'attack') { tgt.act = 'hurt'; tgt.actT = 0; tgt.actDur = 0.26; }
    this.pushText(`-${fmt(dmg)}`, tgt.x, tgt.y - 110, color, 13, false);
    this.burst(tgt.x, tgt.y - 60, 5, color, 'spark');
    this.addRage(1.4);
    if (source && (has(tgt, 'thorns') || has(tgt, 'annihilate'))) {
      this.applyEnemyDamage(source, dmg * 0.6, '#8cdcff', false, tgt);
    }
    if (tgt.hp <= 0) this.heroDown(tgt);
  }

  private bossSkill(e: Enemy): void {
    const targets = this.heroes.filter((h) => !h.dead);
    if (targets.length === 0) return;
    sfx.spike();
    if (e.kind === 'queen') {
      for (let i = 0; i < 3; i++) {
        const tgt = pick(targets);
        this.projs.push({
          x: e.x - 40, y: e.y - 130 * e.scale, tx: tgt.x, ty: tgt.y - 50, target: 0, speed: 430,
          dmg: e.atk * 0.7, kind: 'acid', t: -i * 0.22, pierce: 0, splash: 0, crit: 0,
          ally: false, ownerSkill: null, ownerUid: '', spin: 0,
        });
      }
      sfx.shoot();
    } else if (e.kind === 'lich') {
      for (let i = 0; i < 3; i++) {
        const tgt = pick(targets);
        this.projs.push({
          x: e.x - 40, y: e.y - 120 * e.scale, tx: tgt.x, ty: tgt.y - 50, target: 0, speed: 510,
          dmg: e.atk * 0.55, kind: 'bolt', t: -i * 0.18, pierce: 0, splash: 0, crit: 0,
          ally: false, ownerSkill: null, ownerUid: '', spin: 0,
        });
      }
      const freezeTgt = pick(targets);
      freezeTgt.frozenT = 0.9;
      this.burst(freezeTgt.x, freezeTgt.y - 60, 12, '#8cdcff', 'ice');
      sfx.shoot();
    } else if (e.kind === 'demon') {
      for (const t of targets) this.hitHero(t, e.atk * 0.45, null, '#ff6a5a');
      this.burst(VIEW_W / 2, LANE_Y[0] - 40, 30, '#ff5a4a', 'ember');
      this.shake = Math.max(this.shake, 12);
      this.flash = 0.4; this.flashColor = '#ff3b52';
      sfx.beam();
    } else {
      const front = targets.filter((h) => h.pos === 'front');
      for (const t of (front.length > 0 ? front : targets)) {
        this.hitHero(t, e.atk * 1.5, null, '#ff5a6a');
      }
      this.shake = Math.max(this.shake, 14);
      this.burst(e.x - 90, e.y - 16, 18, '#c8c0b0', 'smoke');
      this.ring(e.x - 90, e.y - 10, 90, '#ff8a5a');
      sfx.spike();
    }
    e.act = 'attack'; e.actT = 0; e.actDur = 0.6; e.hitFired = true;
  }

  // ---------- gacha ----------
  private rollOne(): GachaResult {
    const r = Math.random();
    let rarity: Rarity = r < 0.015 ? 'mythic' : r < 0.055 ? 'legendary' : r < 0.175 ? 'epic' : r < 0.5 ? 'rare' : 'common';
    this.pullsSinceEpic += 1;
    if (this.pullsSinceEpic >= 10 && (rarity === 'common' || rarity === 'rare')) {
      rarity = Math.random() < 0.15 ? 'legendary' : 'epic';
    }
    if (rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic') this.pullsSinceEpic = 0;

    const poolR = Math.random();
    if (poolR < 0.6) {
      const pool = COMPANIONS.filter((c) => c.rarity === rarity);
      const c = pick(pool);
      const owned = this.ownedCompanions[c.id] ?? 0;
      if (owned === 0) {
        this.ownedCompanions[c.id] = 1;
        return { kind: 'companion', id: c.id, name: c.name, rarity, isNew: true, dupeText: 'Đồng hành mới gia nhập!' };
      }
      this.ownedCompanions[c.id] = owned + 2;
      return { kind: 'companion', id: c.id, name: c.name, rarity, isNew: false, dupeText: `Đã sở hữu → +2 cấp (Lv ${owned + 2})` };
    }
    if (poolR < 0.78) {
      // Chỉ skin nguồn `gacha` mới nằm trong bể. Sáu bộ điểm danh phải giữ
      // nguyên giá trị của việc quay lại mỗi ngày, nên tuyệt đối không rơi ra ở đây.
      const skinPool = GACHA_SKINS.filter((s) => s.id !== 'default' && !this.ownedSkins.includes(s.id));
      if (skinPool.length > 0) {
        const s: SkinDef = pick(skinPool);
        this.ownedSkins.push(s.id);
        return { kind: 'skin', id: s.id, name: s.name, rarity, isNew: true, dupeText: 'Skin mới cho Kael!' };
      }
      const refund = rarity === 'mythic' ? 700 : rarity === 'legendary' ? 400 : rarity === 'epic' ? 250 : 120;
      this.addGems(refund);
      return { kind: 'skin', id: 'refund', name: 'Hoàn Ngọc', rarity, isNew: false, dupeText: `Đã đủ skin → +${refund} ngọc` };
    }
    const item = pick(ITEMS);
    const before = this.ownedItems[item.id] ?? 0;
    this.ownedItems[item.id] = before + 1;
    if (!this.equippedItems.includes(item.id) && this.equippedItems.length < MAX_ITEM_SLOTS) {
      this.equippedItems.push(item.id);
    }
    return {
      kind: 'item', id: item.id, name: item.name, rarity,
      isNew: before === 0, dupeText: `Bản sao ×${before + 1} — cộng dồn chỉ số`,
    };
  }

  gacha(times: 1 | 10 | 100 | 500): GachaResult[] | null {
    const cost = times === 1 ? GACHA_COST
      : times === 10 ? GACHA_X10_COST
        : times === 100 ? GACHA_X100_COST : GACHA_X500_COST;
    if (this.gems < cost) {
      this.toast('Không đủ Ngọc Huyết Nguyệt!', '#ff5a6a');
      sfx.warn();
      return null;
    }
    this.gems -= cost;
    this.ctr.pulls += times;
    const results: GachaResult[] = [];
    for (let i = 0; i < times; i++) results.push(this.rollOne());
    // Bảo hiểm: mỗi nhóm 10 lượt chắc chắn có ≥1 Cực Hiếm trở lên.
    for (let g0 = 0; g0 + 10 <= times; g0 += 10) {
      const slice = results.slice(g0, g0 + 10);
      if (!slice.some((x) => x.rarity === 'epic' || x.rarity === 'legendary' || x.rarity === 'mythic')) {
        const c = pick(COMPANIONS.filter((x) => x.rarity === 'epic'));
        const owned = this.ownedCompanions[c.id] ?? 0;
        this.ownedCompanions[c.id] = owned === 0 ? 1 : owned + 2;
        results[g0 + 9] = {
          kind: 'companion', id: c.id, name: c.name, rarity: 'epic', isNew: owned === 0,
          dupeText: owned === 0 ? 'Đồng hành mới gia nhập!' : `Đã sở hữu → +2 cấp (Lv ${owned + 2})`,
        };
      }
    }
    this.recomputeParty();
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return results;
  }

  equipSkin(id: string): void {
    if (!this.ownedSkins.includes(id)) return;
    const changed = this.equippedSkin !== id;
    this.equippedSkin = id;
    this.recomputeParty();
    sfx.click();
    // Khoác bộ mới là một khoảnh khắc, không phải một thao tác cấu hình:
    // bộ càng đắt (fx càng cao) thì hoạt cảnh càng mạnh.
    if (changed) {
      const def = SKINS.find((s) => s.id === id);
      const fx = def?.look.skinFx ?? 0;
      this.ascendFx(def?.look.aura ?? '#ff3b52', 2 + fx * 2);
      this.showBanner('THAY TRANG PHỤC', def?.name ?? '', def?.look.aura ?? '#ff3b52', 2.2);
    }
    this.save();
    this.pushMeta();
  }

  // ---------- cửa hàng ----------
  /** Đã chinh phục Tà Vực chưa — hai món đắt nhất chỉ mở sau mốc này. */
  private shopEvilUnlocked(): boolean { return this.evilCleared; }

  shopInfo(): ShopInfo {
    return {
      gold: this.gold,
      gems: this.gems,
      evilUnlocked: this.shopEvilUnlocked(),
      equippedSkin: this.equippedSkin,
      equippedWeaponSkin: this.equippedWeaponSkin,
      items: SHOP_ITEMS.map((e) => ({
        ...e,
        owned: this.ownedShop.has(e.id),
        equipped: e.kind === 'hero' ? this.equippedSkin === e.id : this.equippedWeaponSkin === e.id,
        locked: e.evilOnly === true && !this.shopEvilUnlocked(),
        affordable: this.gold >= e.gold && this.gems >= e.gems,
      })),
    };
  }

  /**
   * Mua một món ở Cửa Hàng. Trừ **cả Vàng lẫn Ngọc** trong cùng một giao dịch:
   * thiếu một trong hai là hỏng cả, không có chuyện trả góp một nửa.
   */
  buyShopItem(id: string): boolean {
    const e: ShopEntry | undefined = shopEntryById(id);
    if (!e) return false;
    if (this.ownedShop.has(id)) { this.equipShopItem(id); return false; }
    if (e.evilOnly && !this.shopEvilUnlocked()) {
      this.toast('Phải chinh phục Tà Vực (Evil) trước đã', '#b14bff');
      sfx.warn();
      return false;
    }
    if (this.gold < e.gold || this.gems < e.gems) {
      this.toast(
        this.gold < e.gold ? `Thiếu ${fmt(e.gold - this.gold)} Vàng` : `Thiếu ${fmt(e.gems - this.gems)} Ngọc`,
        '#ff5a6a',
      );
      sfx.warn();
      return false;
    }
    this.gold -= e.gold;
    this.gems -= e.gems;
    this.ownedShop.add(id);
    if (e.kind === 'hero' && !this.ownedSkins.includes(id)) this.ownedSkins.push(id);
    this.showBanner('CỬA HÀNG', `${e.name} đã thuộc về anh`, e.color, 3);
    this.toast(`Đã mua ${e.name}!`, e.color);
    this.equipShopItem(id);
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return true;
  }

  equipShopItem(id: string): void {
    const e = shopEntryById(id);
    if (!e || !this.ownedShop.has(id)) return;
    if (e.kind === 'hero') { this.equipSkin(id); return; }
    // Bấm lại vào skin vũ khí đang khoác thì gỡ ra — không cần nút riêng.
    const off = this.equippedWeaponSkin === id;
    this.equippedWeaponSkin = off ? null : id;
    this.recomputeParty();
    if (!off) this.ascendFx(e.color, 2 + e.fx * 2);
    else sfx.click();
    this.save();
    this.pushMeta();
  }
  buySkin(id: string): boolean {
    const def = SKINS.find((s) => s.id === id);
    // Trang phục điểm danh không có giá Ngọc: mua được bằng Ngọc thì Mảnh
    // Trang Phục lập tức mất hết ý nghĩa.
    if (!def || def.source !== 'gacha') {
      if (def) this.toast(`${def.name} chỉ ghép được từ Mảnh Trang Phục`, '#8cdcff');
      return false;
    }
    const cost = SKIN_COST[id] ?? 500;
    if (this.ownedSkins.includes(id)) return false;
    if (this.gems < cost) { this.toast('Không đủ Ngọc!', '#ff5a6a'); sfx.warn(); return false; }
    this.gems -= cost;
    this.ownedSkins.push(id);
    this.equippedSkin = id;
    this.recomputeParty();
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return true;
  }
  equipItem(id: string): void {
    if ((this.ownedItems[id] ?? 0) <= 0) return;
    if (this.equippedItems.includes(id)) {
      this.equippedItems = this.equippedItems.filter((x) => x !== id);
    } else if (this.equippedItems.length < MAX_ITEM_SLOTS) {
      this.equippedItems.push(id);
    } else {
      this.toast(`Chỉ trang bị tối đa ${MAX_ITEM_SLOTS} vật phẩm!`, '#ff9a3c');
      sfx.warn();
      return;
    }
    this.recomputeParty();
    sfx.click();
    this.save();
    this.pushMeta();
  }

  // ---------- điều khiển ----------
  cycleSpeed(): void {
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    sfx.click();
    this.save();
    this.pushMeta();
  }
  togglePause(): void { this.setPaused(!this.paused); }
  private setPaused(p: boolean): void {
    this.paused = p;
    if (!p) this.last = performance.now();
    this.pushMeta();
  }
  toggleMute(): void { setAudioMuted(!getMuted()); this.pushMeta(); }
  toggleFarmMode(): void {
    this.farmMode = !this.farmMode;
    this.toast(this.farmMode ? 'TRẤN GIỮ — ở lại tầng này' : 'TIẾN CÔNG — đánh xuống tầng sâu', this.farmMode ? '#8cdcff' : '#ffd23c');
    sfx.click();
    this.save();
    this.pushMeta();
  }

  // ---------- Thăng Hoa (prestige) ----------
  /** Tổng Huyết Ấn ứng với tầng sâu nhất từng tới. */
  private sealsFor(floorReached: number): number {
    if (floorReached < BAL.SEAL_MIN_FLOOR) return 0;
    return Math.floor(Math.pow((floorReached - 20) / 4, 1.25));
  }
  sealsPending(): number { return Math.max(0, this.sealsFor(this.bestFloor) - this.seals); }
  canPrestige(): boolean { return this.sealsPending() > 0; }
  prestige(): boolean {
    const gain = this.sealsPending();
    if (gain <= 0) {
      this.toast(`Cần xuống sâu hơn tầng ${BAL.SEAL_MIN_FLOOR} để Thăng Hoa`, '#ff9a3c');
      sfx.warn();
      return false;
    }
    this.seals += gain;
    this.ctr.prestiges += 1;
    this.floor = 0;
    this.wave = 0;
    this.combo = 0; this.rage = 0;
    this.gold = Math.max(this.gold, 2000 * this.sealMul());
    this.farmMode = false;
    this.recomputeParty();
    this.state = 'playing';
    this.startFloor(0, true);
    this.showBanner('THĂNG HOA', `+${gain} Huyết Ấn · Toàn bộ sức mạnh ×${this.sealMul().toFixed(2)}`, '#ff4fd8', 3);
    this.toast(`Thăng Hoa! +${gain} Huyết Ấn (tổng ${this.seals})`, '#ff4fd8');
    sfx.levelup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return true;
  }
  /** Sau khi hạ Khởi Nguồn: đi xuống Vực Vô Tận, độ khó tăng theo cấp số nhân. */
  enterEndless(): void {
    this.state = 'playing';
    this.startFloor(TOTAL_FLOORS, true);
    this.toast('Vực Vô Tận mở ra — dưới đáy không còn đáy nữa', '#a78bfa');
    this.toast('Ba nấc độ khó đã mở: Thường · Hard · Evil', '#ff9a3c');
    this.save();
    this.pushMeta();
  }

  // ---------- độ khó Vực Vô Tận ----------
  /** Hard/Evil chỉ mở sau khi đã dọn trọn 100 tầng. */
  modesUnlocked(): boolean { return this.bestFloor >= TOTAL_FLOORS || this.victorySeen; }
  currentMode(): DungeonMode { return this.dungeonMode; }
  /**
   * Đổi độ khó. Luôn khởi động lại tầng hiện tại: chỉ số quái được chốt lúc
   * sinh ra, nên nếu không dọn sân thì người chơi có thể đổi sang Evil giữa
   * đợt và vẫn đánh đám quái yếu của độ khó cũ.
   */
  setDungeonMode(m: DungeonMode): boolean {
    if (m !== 'normal' && !this.modesUnlocked()) {
      this.toast(`Phải dọn trọn ${TOTAL_FLOORS} tầng trước đã`, '#ff9a3c');
      sfx.warn();
      return false;
    }
    if (m === this.dungeonMode) return false;
    this.dungeonMode = m;
    const def = dungeonModeDef(m);
    this.showBanner(def.name, def.desc, def.color, 3.4);
    this.toast(`Độ khó: ${def.short}`, def.color);
    sfx.roar();
    if (this.state === 'playing' && this.floor >= TOTAL_FLOORS) this.startFloor(this.floor, true);
    this.save();
    this.pushMeta();
    return true;
  }

  // ---------- nhiệm vụ & Huyết Lệnh ----------
  /** Bộ đếm tích luỹ mà nhiệm vụ bám vào — cùng nguồn với bộ đếm thành tựu. */
  private questCounter(stat: QuestStat): number { return this.ctr[stat]; }

  /**
   * Mục tiêu của một ô. Hai chỉ số tiền tệ (Vàng/Ngọc) phải co giãn theo tiến
   * trình, nếu không thì ở tầng 200 người chơi hoàn thành trước khi kịp đọc đề.
   */
  private questTarget(def: QuestDef, weekly: boolean): number {
    let n = def.base;
    if (def.scaleWithFloor) {
      n = def.stat === 'goldEarned'
        ? Math.max(2000, this.goldPerKill() * 260)
        : Math.max(300, (2 + this.gw() * 0.4) * this.sealMul() * 55);
    }
    if (weekly) n *= WEEKLY_SCALE;
    return Math.max(1, Math.round(n));
  }

  /**
   * Đưa nhiệm vụ về đúng ngày/tuần hiện tại.
   * Khi sang chu kỳ mới, mốc `baseline` được đặt lại bằng bộ đếm hiện tại —
   * đó là toàn bộ cơ chế reset, không có bộ đếm riêng nào phải xoá.
   */
  private syncQuests(now = new Date()): void {
    const dk = dayKeyOf(now);
    if (dk !== this.questDayKey) {
      this.questDayKey = dk;
      this.questClaimedDaily = [];
      this.questBaseDaily = {};
      for (const q of dailyQuestsOf(dk)) this.questBaseDaily[q.stat] = this.questCounter(q.stat);
    }
    const wk = weekKeyOf(now);
    if (wk !== this.questWeekKey) {
      this.questWeekKey = wk;
      this.questClaimedWeekly = [];
      this.questBaseWeekly = {};
      for (const q of weeklyQuestsOf(wk)) this.questBaseWeekly[q.stat] = this.questCounter(q.stat);
    }
    // Huyết Lệnh reset cùng chu kỳ tháng với lịch điểm danh: một mùa = một tháng.
    const cyc = cycleKeyOf(now);
    if (cyc !== this.edictCycle) {
      this.edictCycle = cyc;
      this.edictPoints = 0;
      this.edictLevel = 0;
      this.edictClaimed = [];
    }
  }

  private questRows(weekly: boolean): QuestRow[] {
    const defs = weekly ? weeklyQuestsOf(this.questWeekKey) : dailyQuestsOf(this.questDayKey);
    const base = weekly ? this.questBaseWeekly : this.questBaseDaily;
    const claimed = weekly ? this.questClaimedWeekly : this.questClaimedDaily;
    return defs.map((d) => {
      const target = this.questTarget(d, weekly);
      const progress = clamp(this.questCounter(d.stat) - (base[d.stat] ?? 0), 0, target);
      return {
        id: d.id,
        name: d.name,
        text: d.text(target),
        color: d.color,
        progress,
        target,
        points: Math.round(d.points * (weekly ? WEEKLY_SCALE : 1)),
        done: progress >= target,
        claimed: claimed.includes(d.id),
      };
    });
  }

  questInfo(): QuestInfo {
    this.syncQuests();
    const daily = this.questRows(false);
    const weekly = this.questRows(true);
    const nextCost = this.edictLevel >= EDICT_MAX_LEVEL ? 0 : edictCostAt(this.edictLevel);
    const tiers: EdictTierRow[] = [];
    for (let lv = 1; lv <= EDICT_MAX_LEVEL; lv++) {
      const r = edictRewardAt(lv);
      tiers.push({
        level: lv, label: r.label, color: r.color, big: r.big === true,
        reached: this.edictLevel >= lv, claimed: this.edictClaimed.includes(lv),
      });
    }
    return {
      daily,
      weekly,
      claimable: [...daily, ...weekly].filter((q) => q.done && !q.claimed).length,
      points: this.edictPoints,
      level: this.edictLevel,
      maxLevel: EDICT_MAX_LEVEL,
      nextCost,
      progress: nextCost > 0 ? clamp(this.edictPoints / nextCost, 0, 1) : 1,
      cycle: this.edictCycle,
      daysLeft: daysLeftInCycle(),
      edictMul: dungeonModeDef(this.dungeonMode).edictMul,
      tiers,
      claimableTiers: tiers.filter((t) => t.reached && !t.claimed).length,
    };
  }

  /**
   * Cộng Ấn Điểm. Hard/Evil nhân ở đây — đó là toàn bộ lý do để chọn độ khó
   * cao dù Vàng/Ngọc rơi ra ít hơn.
   */
  private addEdict(n: number): void {
    if (n <= 0) return;
    const mul = this.floor >= TOTAL_FLOORS ? dungeonModeDef(this.dungeonMode).edictMul : 1;
    this.edictPoints += Math.round(n * mul);
    let leveled = 0;
    while (this.edictLevel < EDICT_MAX_LEVEL && this.edictPoints >= edictCostAt(this.edictLevel)) {
      this.edictPoints -= edictCostAt(this.edictLevel);
      this.edictLevel += 1;
      leveled += 1;
    }
    if (leveled > 0) {
      this.toast(`HUYẾT LỆNH bậc ${this.edictLevel} — có phần thưởng chờ nhận`, '#ff4fd8');
      sfx.levelup();
    }
  }

  claimQuest(id: string, weekly: boolean): boolean {
    this.syncQuests();
    const row = this.questRows(weekly).find((q) => q.id === id);
    if (!row || !row.done || row.claimed) return false;
    (weekly ? this.questClaimedWeekly : this.questClaimedDaily).push(id);
    this.addEdict(row.points);
    // Nhiệm vụ trả Ngọc kèm Ấn Điểm: một nhịp thưởng dùng được ngay, một nhịp
    // tích vào mùa giải — thiếu vế đầu thì ô nhiệm vụ ngày cảm giác rỗng.
    const gems = Math.round(row.points * 6);
    this.addGems(gems);
    this.toast(`${row.name} hoàn thành — +${row.points} Ấn Điểm, +${fmt(gems)} Ngọc`, row.color);
    sfx.pickup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return true;
  }

  claimAllQuests(): number {
    this.syncQuests();
    let n = 0;
    for (const w of [false, true]) {
      for (const q of this.questRows(w)) {
        if (q.done && !q.claimed && this.claimQuest(q.id, w)) n += 1;
      }
    }
    if (n === 0) { this.toast('Chưa có nhiệm vụ nào xong', '#ff9a3c'); sfx.warn(); }
    return n;
  }

  /** Nhận phần thưởng của một bậc Huyết Lệnh đã đạt tới. */
  claimEdict(level: number): boolean {
    this.syncQuests();
    if (level < 1 || level > EDICT_MAX_LEVEL) return false;
    if (this.edictLevel < level || this.edictClaimed.includes(level)) return false;
    this.edictClaimed.push(level);
    const r = edictRewardAt(level);
    if (r.kind === 'gem') this.addGems(r.amount);
    else if (r.kind === 'gold') this.addGold(this.dailyGoldValue(r.amount));
    else if (r.kind === 'cloth') { this.clothShards += r.amount; this.ctr.clothEarned += r.amount; }
    else if (r.kind === 'item') {
      for (let i = 0; i < r.amount; i++) {
        const it = pick(ITEMS);
        this.ownedItems[it.id] = (this.ownedItems[it.id] ?? 0) + 1;
        if (!this.equippedItems.includes(it.id) && this.equippedItems.length < MAX_ITEM_SLOTS) {
          this.equippedItems.push(it.id);
        }
      }
    } else {
      // Mảnh vũ khí của Huyết Lệnh lấy bậc theo độ sâu của mùa: bậc 10 cho
      // Cực Hiếm, bậc 40 cho Thần Khí — cao hơn hẳn mức lịch điểm danh trả.
      const tier: WeaponTierId = level >= 40 ? 'divine' : level >= 30 ? 'mythic'
        : level >= 20 ? 'legendary' : 'epic';
      for (let i = 0; i < r.amount; i++) {
        this.addWeapon(pick(WEAPONS.filter((w) => w.tier === tier)).id);
      }
    }
    this.recomputeParty();
    this.toast(`Huyết Lệnh bậc ${level} — ${r.label}`, r.color);
    sfx.pickup();
    this.checkAchievements();
    this.save();
    this.pushMeta();
    return true;
  }

  claimAllEdict(): number {
    this.syncQuests();
    let n = 0;
    for (let lv = 1; lv <= this.edictLevel; lv++) {
      if (this.claimEdict(lv)) n += 1;
    }
    if (n === 0) { this.toast('Chưa có bậc Huyết Lệnh nào chờ nhận', '#ff9a3c'); sfx.warn(); }
    else this.showBanner('HUYẾT LỆNH', `Nhận ${n} bậc phần thưởng`, '#ff4fd8', 2.6);
    return n;
  }
  newGamePlus(): void {
    this.floor = 0; this.wave = 0;
    for (const h of this.heroes) { h.hp = h.maxHp; h.dead = false; h.respawnT = 0; }
    this.state = 'playing';
    this.startFloor(0, true);
    this.toast('Hành trình mới bắt đầu — New Game+!', '#ff4fd8');
    this.save();
    this.pushMeta();
  }

  // ---------- lưu / tải ----------
  save = (): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 4,
        gold: this.gold, gems: this.gems, kaelLevel: this.kaelLevel, kaelXp: this.kaelXp,
        seals: this.seals, bestFloor: this.bestFloor,
        floor: this.floor, wave: this.wave, kills: this.kills, playTime: this.playTime,
        ownedCompanions: this.ownedCompanions, ownedSkins: this.ownedSkins, equippedSkin: this.equippedSkin,
        ownedItems: this.ownedItems, equippedItems: this.equippedItems, pullsSinceEpic: this.pullsSinceEpic,
        ownedWeapons: this.ownedWeapons, equippedWeapon: this.equippedWeapon,
        runes: this.runes, evoSeen: this.evoSeen, titleSeen: this.titleSeen,
        weaponRefine: this.weaponRefine,
        deployedIds: this.deployedIds, farmMode: this.farmMode, speedIdx: this.speedIdx,
        clearedMilestones: this.clearedMilestones, victorySeen: this.victorySeen,
        clothShards: this.clothShards,
        daily: {
          cycle: this.dailyCycle, claimed: this.dailyClaimed, lastDay: this.dailyLastDay,
          streak: this.dailyStreak, best: this.dailyBestStreak, total: this.dailyTotalDays,
        },
        ownedShop: [...this.ownedShop],
        equippedWeaponSkin: this.equippedWeaponSkin,
        dungeonMode: this.dungeonMode,
        evilCleared: this.evilCleared,
        quests: {
          dayKey: this.questDayKey, weekKey: this.questWeekKey,
          baseDaily: this.questBaseDaily, baseWeekly: this.questBaseWeekly,
          claimedDaily: this.questClaimedDaily, claimedWeekly: this.questClaimedWeekly,
        },
        edict: {
          cycle: this.edictCycle, points: this.edictPoints,
          level: this.edictLevel, claimed: this.edictClaimed,
        },
        ctr: this.ctr,
        weaponDex: [...this.weaponDex],
        achUnlocked: [...this.achUnlocked],
        achClaimed: [...this.achClaimed],
        savedAt: Date.now(),
      }));
    } catch { /* localStorage có thể bị chặn — bỏ qua */ }
  };

  private load(): boolean {
    let raw: string | null = null;
    let legacy = false;
    try {
      raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { raw = localStorage.getItem(LEGACY_SAVE_KEY); legacy = raw !== null; }
    } catch { return false; }
    if (!raw) return false;

    let d: Record<string, unknown>;
    try { d = JSON.parse(raw) as Record<string, unknown>; } catch { return false; }

    const num = (k: string, min: number, max: number, def: number): number => {
      const v = d[k];
      return typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : def;
    };
    this.gold = num('gold', 0, 1e300, 800);
    this.gems = num('gems', 0, 1e300, 1200);
    this.kaelLevel = Math.round(num('kaelLevel', 1, 1e6, 1));
    this.kaelXp = num('kaelXp', 0, 1e300, 0);
    this.seals = Math.round(num('seals', 0, 1e6, 0));
    this.floor = Math.round(num('floor', 0, 9999, 0));
    this.wave = Math.round(num('wave', 0, WAVES_PER_FLOOR - 1, 0));
    this.bestFloor = Math.round(num('bestFloor', 0, 9999, this.floor));
    this.kills = num('kills', 0, 1e300, 0);
    this.playTime = num('playTime', 0, 1e300, 0);
    this.speedIdx = Math.round(num('speedIdx', 0, SPEEDS.length - 1, 0));
    this.farmMode = d.farmMode === true;
    this.victorySeen = d.victorySeen === true;

    // Bộ đếm thành tựu phải nạp TRƯỚC mọi đường cộng Ngọc/Vàng phía dưới
    // (hoàn Ngọc vũ khí cũ, thưởng ngoại tuyến) — nếu không, phần cộng đó sẽ
    // ghi vào bộ đếm rỗng rồi bị bản lưu ghi đè, và số liệu lệch vĩnh viễn.
    this.clothShards = Math.max(0, Math.round(num('clothShards', 0, 1e9, 0)));
    if (d.ctr && typeof d.ctr === 'object') {
      const src = d.ctr as Record<string, unknown>;
      for (const k of Object.keys(this.ctr) as Array<keyof typeof this.ctr>) {
        const v = src[k];
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) this.ctr[k] = v;
      }
    }
    if (d.daily && typeof d.daily === 'object') {
      const s = d.daily as Record<string, unknown>;
      if (typeof s.cycle === 'string') this.dailyCycle = s.cycle;
      if (typeof s.lastDay === 'string') this.dailyLastDay = s.lastDay;
      const n = (k: string, max: number): number => {
        const v = s[k];
        return typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), 0, max) : 0;
      };
      this.dailyClaimed = n('claimed', DAILY_CYCLE_DAYS);
      this.dailyStreak = n('streak', 1e6);
      this.dailyBestStreak = Math.max(n('best', 1e6), this.dailyStreak);
      this.dailyTotalDays = n('total', 1e6);
    }
    this.syncDaily();

    // ---- cửa hàng & độ khó ----
    if (Array.isArray(d.ownedShop)) {
      const valid = new Set(SHOP_ITEMS.map((s) => s.id));
      this.ownedShop = new Set(
        (d.ownedShop as unknown[]).filter((x): x is string => typeof x === 'string' && valid.has(x)),
      );
    }
    if (typeof d.equippedWeaponSkin === 'string' && this.ownedShop.has(d.equippedWeaponSkin)) {
      this.equippedWeaponSkin = d.equippedWeaponSkin;
    }
    this.evilCleared = d.evilCleared === true;
    if (typeof d.dungeonMode === 'string' && DUNGEON_MODES.some((m) => m.id === d.dungeonMode)) {
      this.dungeonMode = d.dungeonMode as DungeonMode;
    }

    // ---- nhiệm vụ & Huyết Lệnh ----
    // Nạp TRƯỚC `syncQuests()`: sync so khoá ngày/tuần đã lưu với hôm nay để
    // quyết định giữ hay đặt lại mốc, nên nếu chưa nạp thì mọi tiến độ đang
    // dở sẽ bị coi là của chu kỳ cũ và bay sạch mỗi lần vào game.
    if (d.quests && typeof d.quests === 'object') {
      const q = d.quests as Record<string, unknown>;
      if (typeof q.dayKey === 'string') this.questDayKey = q.dayKey;
      if (typeof q.weekKey === 'string') this.questWeekKey = q.weekKey;
      const baseOf = (v: unknown): Partial<Record<QuestStat, number>> => {
        const out: Partial<Record<QuestStat, number>> = {};
        if (!v || typeof v !== 'object') return out;
        for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
          if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[k as QuestStat] = n;
        }
        return out;
      };
      this.questBaseDaily = baseOf(q.baseDaily);
      this.questBaseWeekly = baseOf(q.baseWeekly);
      const ids = (v: unknown): string[] => (Array.isArray(v)
        ? (v as unknown[]).filter((x): x is string => typeof x === 'string' && questDefById(x) !== undefined)
        : []);
      this.questClaimedDaily = ids(q.claimedDaily);
      this.questClaimedWeekly = ids(q.claimedWeekly);
    } else {
      // Bản lưu cũ chưa có khối nhiệm vụ. Giao diện đã gọi `getMeta()` một lần
      // TRƯỚC khi bản lưu được nạp, nên `syncQuests()` lúc đó đã chốt mốc theo
      // bộ đếm rỗng và khoá ngày hôm nay — nếu để nguyên thì mốc bằng 0 trong
      // khi bộ đếm thật là hàng nghìn, và mọi ô nhiệm vụ xong ngay khi vào game.
      // Xoá khoá để `syncQuests()` bên dưới chốt lại theo bộ đếm vừa nạp.
      this.questDayKey = '';
      this.questWeekKey = '';
      this.questClaimedDaily = [];
      this.questClaimedWeekly = [];
      this.questBaseDaily = {};
      this.questBaseWeekly = {};
    }
    if (d.edict && typeof d.edict === 'object') {
      const e = d.edict as Record<string, unknown>;
      if (typeof e.cycle === 'string') this.edictCycle = e.cycle;
      if (typeof e.points === 'number' && Number.isFinite(e.points)) {
        this.edictPoints = clamp(Math.round(e.points), 0, 1e9);
      }
      if (typeof e.level === 'number' && Number.isFinite(e.level)) {
        this.edictLevel = clamp(Math.round(e.level), 0, EDICT_MAX_LEVEL);
      }
      if (Array.isArray(e.claimed)) {
        this.edictClaimed = (e.claimed as unknown[])
          .filter((x): x is number => typeof x === 'number' && x >= 1 && x <= this.edictLevel);
      }
    }
    this.syncQuests();

    if (Array.isArray(d.weaponDex)) {
      const valid = new Set(WEAPONS.map((w) => w.id));
      this.weaponDex = new Set(
        (d.weaponDex as unknown[]).filter((x): x is string => typeof x === 'string' && valid.has(x)),
      );
    }
    if (Array.isArray(d.achUnlocked)) {
      const valid = new Set(ACHIEVEMENTS.map((a) => a.id));
      this.achUnlocked = new Set(
        (d.achUnlocked as unknown[]).filter((x): x is string => typeof x === 'string' && valid.has(x)),
      );
    }
    if (Array.isArray(d.achClaimed)) {
      // Đã nhận thì đương nhiên đã mở — giao nhau để một bản lưu hỏng không
      // tạo ra mốc "đã nhận nhưng chưa mở" rồi bị trao thưởng lần nữa.
      this.achClaimed = new Set(
        (d.achClaimed as unknown[])
          .filter((x): x is string => typeof x === 'string' && this.achUnlocked.has(x)),
      );
    }

    if (d.ownedCompanions && typeof d.ownedCompanions === 'object') {
      const src = d.ownedCompanions as Record<string, unknown>;
      const valid = new Set(COMPANIONS.map((c) => c.id));
      // Bản lưu cũ dùng đường cong chi phí đa thức nên cấp có thể phi lý;
      // giới hạn lại theo tiến trình để không phá vỡ cân bằng mới.
      const cap = legacy ? 60 + this.floor * 2 : 1e6;
      this.ownedCompanions = {};
      for (const [k, v] of Object.entries(src)) {
        if (valid.has(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) {
          this.ownedCompanions[k] = Math.min(cap, Math.round(v));
        }
      }
    }
    if (Array.isArray(d.ownedSkins)) {
      const valid = new Set(SKINS.map((s) => s.id));
      this.ownedSkins = ['default', ...(d.ownedSkins as unknown[])
        .filter((x): x is string => typeof x === 'string' && valid.has(x) && x !== 'default')];
    }
    if (typeof d.equippedSkin === 'string' && this.ownedSkins.includes(d.equippedSkin)) {
      this.equippedSkin = d.equippedSkin;
    }
    if (d.ownedItems && typeof d.ownedItems === 'object') {
      const valid = new Set(ITEMS.map((i) => i.id));
      this.ownedItems = {};
      for (const [k, v] of Object.entries(d.ownedItems as Record<string, unknown>)) {
        if (valid.has(k) && typeof v === 'number' && v > 0) this.ownedItems[k] = Math.round(v);
      }
    }
    if (Array.isArray(d.equippedItems)) {
      this.equippedItems = (d.equippedItems as unknown[])
        .filter((x): x is string => typeof x === 'string' && (this.ownedItems[x] ?? 0) > 0)
        .slice(0, MAX_ITEM_SLOTS);
    }
    this.pullsSinceEpic = Math.round(num('pullsSinceEpic', 0, 100, 0));
    if (d.runes && typeof d.runes === 'object') {
      const valid = new Set(RUNES.map((r) => r.id as string));
      this.runes = {};
      for (const [k, v] of Object.entries(d.runes as Record<string, unknown>)) {
        if (valid.has(k) && typeof v === 'number' && v > 0) {
          const def = RUNES.find((r) => r.id === k);
          this.runes[k as RuneId] = Math.min(def ? def.max : 0, Math.round(v));
        }
      }
    }
    this.evoSeen = Math.round(num('evoSeen', 0, MAX_EVO, evoStageOf(this.kaelLevel)));
    this.titleSeen = Math.round(num('titleSeen', 0, TITLES.length - 1, titleTierOf(this.kaelLevel)));
    if (d.ownedWeapons && typeof d.ownedWeapons === 'object') {
      const valid = new Set(WEAPONS.map((w) => w.id));
      this.ownedWeapons = {};
      let dropped = 0;
      for (const [k, v] of Object.entries(d.ownedWeapons as Record<string, unknown>)) {
        if (typeof v !== 'number' || v <= 0) continue;
        if (valid.has(k)) this.ownedWeapons[k] = Math.round(v);
        else dropped += 1; // vũ khí của hệ cũ, không còn tồn tại
      }
      if (dropped > 0) {
        const refund = dropped * WGACHA_COST;
        this.addGems(refund);
        this.toast(`Kho vũ khí cũ đã đổi thành ${fmt(refund)} Ngọc`, '#ffb43c');
      }
      // Bản lưu cũ chưa có sổ vũ khí: coi mọi món đang giữ là đã từng cầm,
      // để mốc "Binh Khí Phổ" không bắt đầu lại từ con số không.
      for (const k of Object.keys(this.ownedWeapons)) this.weaponDex.add(k);
    }
    if (d.weaponRefine && typeof d.weaponRefine === 'object') {
      const valid = new Set(WEAPONS.map((w) => w.id));
      this.weaponRefine = {};
      for (const [k, v] of Object.entries(d.weaponRefine as Record<string, unknown>)) {
        if (valid.has(k) && typeof v === 'number' && v > 0) this.weaponRefine[k] = Math.round(v);
      }
    }
    if (typeof d.equippedWeapon === 'string' && (this.ownedWeapons[d.equippedWeapon] ?? 0) > 0) {
      this.equippedWeapon = d.equippedWeapon;
    }
    if (Array.isArray(d.deployedIds)) {
      const valid = new Set(COMPANIONS.map((c) => c.id));
      this.deployedIds = (d.deployedIds as unknown[])
        .filter((x): x is string => typeof x === 'string' && valid.has(x))
        .slice(0, MAX_PARTY);
    } else if (d.deployedIds === null) {
      this.deployedIds = null;
    }
    if (Array.isArray(d.clearedMilestones)) {
      this.clearedMilestones = (d.clearedMilestones as unknown[])
        .filter((x): x is number => typeof x === 'number');
    }

    if (legacy) {
      this.toast('Bản lưu cũ đã được chuyển đổi sang hệ cân bằng mới', '#8cdcff');
    }

    // ---- thưởng ngoại tuyến ----
    const savedAt = typeof d.savedAt === 'number' ? d.savedAt : 0;
    if (savedAt > 0) {
      const sec = clamp((Date.now() - savedAt) / 1000, 0, BAL.OFFLINE_CAP_H * 3600);
      if (sec > 120) {
        // Ước lượng bằng nhịp farm chủ động (~1.4 quái/giây) nhân hệ số ngoại tuyến.
        this.recomputeParty();
        const gold = Math.round(this.goldPerKill() * 1.4 * BAL.OFFLINE_RATE * sec);
        const gems = Math.round(BAL.GEM_CHANCE * this.partyGemAura * 1.4 * BAL.OFFLINE_RATE * sec
          * (2 + this.gw() * 0.4) * this.sealMul() * this.modeRewardMul() * 0.5);
        this.addGold(gold);
        this.addGems(gems);
        this.onEvent({ type: 'offline', report: { seconds: sec, gold, gems } });
      }
    }
    this.checkAchievements();
    return true;
  }

  // ---------- meta ----------
  private evoInfo(): EvoInfo {
    const stage = this.evoStage();
    const evo = EVOLUTIONS[stage];
    const nextLevel = stage >= MAX_EVO ? null : (stage + 1) * EVO_EVERY;
    const from = stage * EVO_EVERY;
    return {
      stage, max: MAX_EVO, name: evo.name, skillName: evo.skillName,
      skillDesc: evo.skillDesc, aura: evo.aura, mul: evo.mul,
      nextLevel,
      progress: nextLevel === null ? 1
        : clamp((this.kaelLevel - from) / (nextLevel - from), 0, 1),
      unlocked: EVOLUTIONS.slice(0, stage + 1).map((e) => ({ name: e.skillName, desc: e.skillDesc })),
    };
  }

  private titleInfo(): TitleInfo {
    const tier = titleTierOf(this.kaelLevel);
    const cur = TITLES[tier];
    const next = tier < TITLES.length - 1 ? TITLES[tier + 1] : null;
    return {
      tier, title: cur.title, frame: cur.frame, glow: cur.glow,
      ornament: cur.ornament, desc: cur.desc,
      nextLevel: next ? next.level : null,
      nextTitle: next ? next.title : null,
      progress: next
        ? clamp((this.kaelLevel - cur.level) / (next.level - cur.level), 0, 1)
        : 1,
      all: TITLES.map((t, i) => ({
        title: t.title, level: t.level, frame: t.frame, unlocked: i <= tier,
      })),
    };
  }

  private pushMeta(): void { this.onEvent({ type: 'meta' }); }
  getMeta(): MetaInfo {
    const bonus = this.itemBonus();
    return {
      gold: this.gold, gems: this.gems, kaelLevel: this.kaelLevel,
      kaelXp: this.kaelXp, kaelXpNext: this.kaelXpNeed(),
      kaelUpgradeCost: this.kaelUpgradeCost(),
      kaelAtk: this.kaelAtkValue(bonus), kaelHp: this.kaelHpValue(bonus),
      kaelCrit: this.kaelCrit(bonus), kaelAspd: this.kaelAspd(bonus),
      runes: RUNES.map((r) => ({
        id: r.id,
        level: this.runeLevel(r.id),
        max: r.max,
        cost: runeCostAt(this.runeLevel(r.id)),
        total: this.runeBonus(r.id),
        maxed: this.runeMaxed(r.id),
      })),
      evo: this.evoInfo(),
      title: this.titleInfo(),
      floor: this.floor, wave: this.wave, kills: this.kills, playTime: this.playTime,
      bestFloor: this.bestFloor,
      speed: SPEEDS[this.speedIdx], muted: getMuted(), paused: this.paused, farmMode: this.farmMode,
      seals: this.seals, sealsPending: this.sealsPending(), sealMul: this.sealMul(),
      canPrestige: this.canPrestige(),
      ownedCompanions: { ...this.ownedCompanions },
      party: this.heroes.filter((h) => !h.isKael).map((h) => ({
        id: h.defId, name: h.def?.name ?? '?', rarity: h.def?.rarity ?? 'common', level: h.level,
        power: Math.round(h.atk * h.aspd * 2 + h.maxHp * 0.2), pos: h.pos,
        hpPct: h.dead ? 0 : clamp(h.hp / h.maxHp, 0, 1),
      })),
      ownedSkins: [...this.ownedSkins], equippedSkin: this.equippedSkin,
      ownedItems: Object.keys(this.ownedItems).map((id) => ({
        id, name: ITEMS.find((i) => i.id === id)?.name ?? id, count: this.ownedItems[id] ?? 0,
      })),
      equippedItems: [...this.equippedItems],
      deployedIds: this.deployedIds ? [...this.deployedIds] : null,
      legionCount: this.legionCount, legionAtk: this.legionAtk,
      banner: this.banner ? { ...this.banner } : null,
      toasts: this.toasts.map((t) => ({ ...t })),
      hud: { ...this.hudCache },
      daily: this.dailyInfo(),
      ach: this.achInfo(),
      skins: this.skinInfo(),
      clothShards: this.clothShards,
      mode: this.dungeonMode,
      modesUnlocked: this.modesUnlocked(),
      evilCleared: this.evilCleared,
      quests: this.questInfo(),
      ownedShop: [...this.ownedShop],
      equippedWeaponSkin: this.equippedWeaponSkin,
    };
  }

  // ---------- hạt & chữ ----------
  private burst(x: number, y: number, n: number, color: string, shape: Particle['shape']): void {
    if (this.parts.length > 460) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, shape === 'ember' ? 270 : 190);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (shape === 'ember' ? 90 : 40),
        g: shape === 'smoke' ? -34 : 320, life: rand(0.3, shape === 'ember' ? 0.95 : 0.6), maxLife: 0.95,
        size: rand(2, shape === 'ember' ? 6 : 4.5), color, shape, rot: rand(0, 6), vr: rand(-7, 7),
      });
    }
  }
  private ring(x: number, y: number, r: number, color: string): void {
    this.parts.push({
      x, y, vx: 0, vy: 0, g: 0, life: 0.4, maxLife: 0.4, size: r, color,
      shape: 'ring', rot: 0, vr: 0,
    });
  }
  private pushText(text: string, x: number, y: number, color: string, size: number, bold: boolean): void {
    if (this.texts.length > 90) this.texts.shift();
    this.texts.push({
      x, y, vx: rand(-24, 24), vy: -rand(70, 110), text, color,
      life: bold ? 1.15 : 0.85, maxLife: bold ? 1.15 : 0.85, size, bold,
    });
  }

  // ---------- vòng lặp ----------
  private tick(dt: number): void {
    if (this.paused) { this.draw(); return; }
    if (this.hitstop > 0) { this.hitstop -= dt; this.draw(); return; }
    const ts = this.slowmo > 0 ? 0.35 : 1;
    if (this.slowmo > 0) this.slowmo -= dt;
    if (this.ultT > 0) this.ultT -= dt;
    const wdt = dt * ts * SPEEDS[this.speedIdx];
    if (this.state === 'playing') this.updateWorld(wdt, dt);
    else this.updateAmbient(dt);
    this.draw();
  }

  private updateAmbient(dt: number): void {
    this.scrollX += 40 * dt;
    this.updateParticles(dt);
    this.updateAnims(dt);
  }

  private updateParticles(dt: number): void {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt;
    }
    if (this.parts.some((p) => p.life <= 0)) this.parts = this.parts.filter((p) => p.life > 0);
  }

  /** Cập nhật trạng thái hoạt ảnh — chạy theo thời gian thực để luôn mượt. */
  private updateAnims(realDt: number): void {
    for (const h of this.heroes) {
      const a = h.anim;
      a.t += realDt;
      a.vx = h.vx;
      a.gait = (a.gait + (Math.abs(h.vx) / 68) * realDt) % 1;
      a.action = h.act;
      a.actionT = h.actDur > 0 ? clamp(h.actT / h.actDur, 0, 1) : 0;
      a.scale = h.scale;
      a.facing = 1;
      a.hurt = Math.max(0, h.hurtT / 0.3);
      a.frozen = h.frozenT;
    }
    for (const e of this.enemies) {
      const a = e.anim;
      a.t += realDt;
      a.vx = e.vx;
      a.gait = (a.gait + (Math.abs(e.vx) / 62) * realDt) % 1;
      a.action = e.act;
      a.actionT = e.actDur > 0 ? clamp(e.actT / e.actDur, 0, 1) : 0;
      a.scale = e.scale;
      a.hurt = Math.max(0, e.hurtT / 0.2);
      a.frozen = e.stunT;
    }
  }

  private updateWorld(dt: number, realDt: number): void {
    if (this.pendingStart) {
      this.scrollX += 58 * dt;
      this.updateParticles(dt);
      this.updateAnims(realDt);
      return;
    }
    this.playTime += realDt;
    this.scrollX += 58 * dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 34);
    if (this.flash > 0) this.flash -= realDt * 1.6;
    if (this.banner) {
      this.banner.t += realDt;
      if (this.banner.t > this.banner.life) this.banner = null;
    }
    for (const t of this.toasts) t.life -= realDt;
    if (this.toasts.some((t) => t.life <= 0)) this.toasts = this.toasts.filter((t) => t.life > 0);

    // liên trảm & nộ khí
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) { this.combo = 0; this.comboT = 0; }
    }
    if (this.enemies.some((e) => !e.dead)) this.addRage(4.2 * dt);

    this.updateParticles(dt);

    for (const t of this.texts) {
      t.life -= dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 120 * dt;
    }
    if (this.texts.some((t) => t.life <= 0)) this.texts = this.texts.filter((t) => t.life > 0);

    for (const pk of this.pickups) {
      pk.life -= dt;
      pk.vy += 620 * dt;
      pk.y += pk.vy * dt;
      pk.x += pk.vx * dt;
      pk.spin += dt * 5;
      const floorY = LANE_Y[0] - 6;
      if (pk.y > floorY) { pk.y = floorY; pk.vy *= -0.42; pk.vx *= 0.7; }
    }
    if (this.pickups.some((p) => p.life <= 0)) this.pickups = this.pickups.filter((p) => p.life > 0);

    // ---- hàng đợi sinh quái ----
    const aliveCount = this.enemies.filter((e) => !e.dead).length;
    if (this.spawnQueue.length > 0) {
      for (const s of this.spawnQueue) s.delay -= dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= 0 && aliveCount < 8) {
        const s = this.spawnQueue.shift();
        if (s) this.spawnEnemy(s.kind, s.lane);
      }
    }

    this.updateEnemies(dt);
    this.updateHeroes(dt);
    this.updateProjectiles(dt);
    this.updateLegion(dt);
    this.updateAnims(realDt);

    // dọn xác đã kết thúc hoạt ảnh chết
    this.enemies = this.enemies.filter((e) => !(e.dead && e.actT >= e.actDur));

    // ---- nhịp đợt ----
    if (this.spawnQueue.length === 0 && this.enemies.every((e) => e.dead) && !this.bossActive) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        if (this.wave === WAVES_PER_FLOOR - 1 && !hasBossOnFloor(this.floor)) {
          this.floorCleared();
          return;
        }
        this.wave = Math.min(WAVES_PER_FLOOR - 1, this.wave + 1);
        this.ctr.wavesCleared += 1;
        this.addEdict(EDICT_PER_WAVE);
        this.gainXp(this.xpUnit() * 3);
        this.startWave();
      }
    }

    // Các mốc theo thời gian và theo số đếm dồn được quét định kỳ chứ không
    // rải kiểm tra vào từng điểm cộng: 500 phép so sánh mỗi 2 giây là không
    // đáng kể, còn bỏ sót một điểm cộng thì mốc treo vĩnh viễn.
    this.achCheckT += dt;
    if (this.achCheckT >= 2) {
      this.achCheckT = 0;
      this.checkAchievements();
      // Tab để mở qua nửa đêm là chuyện thường: nhịp quét này cũng là chỗ
      // nhiệm vụ ngày/tuần đổi sang chu kỳ mới mà không cần hẹn giờ riêng.
      this.syncQuests();
    }

    this.refreshHud();
    if (this.globalT - this.lastMetaPush > 0.2) {
      this.lastMetaPush = this.globalT;
      this.pushMeta();
    }
  }

  private updateEnemies(dt: number): void {
    const alive = this.enemies.filter((e) => !e.dead).sort((a, b) => a.x - b.x);
    // Xếp hàng theo từng làn để quái không chồng lên nhau.
    const laneQueue: Enemy[][] = [[], [], []];
    for (const e of alive) laneQueue[e.lane].push(e);

    for (const e of this.enemies) {
      if (e.act !== 'idle' && e.act !== 'walk') {
        e.actT += dt;
        if (e.act === 'attack' && !e.hitFired && e.actT / e.actDur >= 0.5) {
          e.hitFired = true;
          this.enemyStrike(e);
        }
        if (e.actT >= e.actDur && e.act !== 'dead') { e.act = 'idle'; e.vx = 0; }
      }
      if (e.dead) { e.vx = 0; continue; }
      if (e.hurtT > 0) e.hurtT -= dt;
      if (e.knock > 0) {
        e.x += e.knock * dt * 6;
        e.knock = Math.max(0, e.knock - dt * 40);
      }
      if (e.stunT > 0) { e.stunT -= dt; e.vx = 0; continue; }
      if (e.act === 'attack') { e.vx = 0; continue; }

      // tiến tới vạch giao chiến
      const q = laneQueue[e.lane];
      const idx = q.indexOf(e);
      const base = e.boss ? BOSS_CLASH_X : CLASH_X + e.lane * 42;
      const stop = idx <= 0 ? base : q[idx - 1].x + (q[idx - 1].boss ? 150 : 92);
      const spd = (FOE_SPEED[e.kind] ?? 140) * (e.boss ? 0.85 : 1);
      if (e.x > stop + 1) {
        const step = Math.min(spd * dt, e.x - stop);
        e.x -= step;
        e.vx = -spd;
        if (e.act === 'idle') e.act = 'walk';
      } else {
        e.vx = 0;
        if (e.act === 'walk') e.act = 'idle';
      }

      // tấn công
      const inRange = e.x < CLASH_X + 120;
      if (!inRange) continue;
      e.atkCd -= dt;
      if (e.atkCd <= 0 && e.act === 'idle') {
        e.atkCd = e.boss ? 1.8 : 1.6;
        e.act = 'attack'; e.actT = 0; e.actDur = e.boss ? 0.85 : 0.68; e.hitFired = false;
      }
      if (e.boss) {
        if (e.telegraph > 0) {
          e.telegraph -= dt;
          if (e.telegraph <= 0) this.bossSkill(e);
        } else {
          e.skillCd -= dt;
          if (e.skillCd <= 0) {
            e.skillCd = rand(6.5, 9);
            e.telegraph = 1.15;
            e.telegraphKind = e.kind;
            this.toast('⚠ Boss đang tụ lực!', '#ff9a3c');
            sfx.warn();
          }
        }
      }
    }
  }

  private enemyStrike(e: Enemy): void {
    const targets = this.heroes.filter((h) => !h.dead);
    if (targets.length === 0) return;
    // Ưu tiên tiền phong — vai trò chắn đòn mới có ý nghĩa.
    const front = targets.filter((h) => h.pos === 'front');
    const tgt = front.length > 0 && Math.random() < 0.72 ? pick(front) : pick(targets);
    this.hitHero(tgt, e.atk * rand(0.9, 1.1) * (e.boss ? 1.15 : 1), e, '#ff5a6a');
  }

  private updateHeroes(dt: number): void {
    const foes = this.enemies.filter((e) => !e.dead).sort((a, b) => a.x - b.x);
    const nearest = foes[0] ?? null;

    this.heroes.forEach((h, idx) => {
      // hoạt ảnh đang chạy
      if (h.act !== 'idle' && h.act !== 'walk') {
        h.actT += dt;
        const p = h.actDur > 0 ? h.actT / h.actDur : 1;
        if (!h.hitFired && (h.act === 'attack' || h.act === 'cast') && p >= (h.act === 'attack' ? 0.42 : 0.5)) {
          h.hitFired = true;
          if (h.act === 'attack') this.heroMelee(h);
          else this.heroShoot(h);
        }
        if (h.actT >= h.actDur) {
          if (h.act === 'dead') { h.vx = 0; return; }
          h.act = 'idle';
        }
      }

      if (h.dead) {
        h.vx = 0;
        h.respawnT -= dt;
        if (h.respawnT <= 0) {
          h.dead = false;
          h.hp = h.maxHp * 0.6;
          h.x = h.homeX;
          h.act = 'spawn'; h.actT = 0; h.actDur = 0.5; h.hitFired = true;
          this.burst(h.x, h.y - 60, 14, '#3fe0b0', 'spark');
          this.ring(h.x, h.y - 40, 46, '#3fe0b0');
          this.pushText('Hồi sinh!', h.x, h.y - 116, '#3fe0b0', 14, false);
          sfx.potion();
        }
        return;
      }

      if (h.hurtT > 0) h.hurtT -= dt;
      if (h.frozenT > 0) { h.frozenT -= dt; h.vx = 0; return; }
      // hồi máu tự nhiên
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.012 * dt);

      if (h.act === 'attack' || h.act === 'cast' || h.act === 'hurt' || h.act === 'spawn') {
        h.vx = 0;
        return;
      }

      if (!nearest) {
        this.moveHeroTo(h, h.homeX, dt, 130);
        return;
      }

      h.atkCd -= dt;
      if (h.ranged) {
        this.moveHeroTo(h, h.homeX, dt, 120);
        if (h.atkCd <= 0 && nearest.x < VIEW_W + 40) {
          h.atkCd = 1 / h.aspd;
          h.act = 'cast'; h.actT = 0;
          h.actDur = clamp(0.72 / Math.max(0.5, h.aspd), 0.3, 1.0);
          h.hitFired = false;
        }
        return;
      }

      // Cận chiến: chủ động áp sát rồi lùi về vị trí — mọi hàng đều đánh được.
      const reach = MELEE_REACH * h.scale;
      const stagger = (idx % 3) * 22;
      const strikeX = clamp(
        nearest.x - reach - stagger,
        h.homeX - 20,
        Math.min(h.homeX + MAX_ADVANCE, CLASH_X + 20),
      );
      // Chỉ xông lên khi quái đã tới nơi và đòn đánh sắp sẵn sàng.
      const closing = h.atkCd <= 0.45 && nearest.x < ENGAGE_X;
      const goal = closing ? strikeX : h.homeX;
      const speed = closing ? 300 : 160;
      this.moveHeroTo(h, goal, dt, speed);
      if (closing && h.atkCd <= 0 && Math.abs(h.x - strikeX) < 14) {
        h.atkCd = 1 / h.aspd;
        h.act = 'attack'; h.actT = 0;
        h.actDur = clamp(0.6 / Math.max(0.5, h.aspd), 0.26, 0.85);
        h.hitFired = false;
      }
    });
  }

  private moveHeroTo(h: HeroUnit, goal: number, dt: number, speed: number): void {
    const d = goal - h.x;
    if (Math.abs(d) < 1.5) { h.x = goal; h.vx = approach(h.vx, 0, 900 * dt); h.act = h.act === 'walk' ? 'idle' : h.act; return; }
    const step = Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    h.x += step;
    h.vx = step / Math.max(dt, 1e-4);
    if (h.act === 'idle') h.act = 'walk';
  }

  /** Chọn mục tiêu cận chiến hợp lệ tại thời điểm đòn đánh chạm. */
  private meleeTarget(h: HeroUnit): Enemy | null {
    const reach = MELEE_REACH * h.scale + 46;
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.x - h.x;
      if (d < -30 || d > reach) continue;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  private heroMelee(h: HeroUnit): void {
    const tgt = this.meleeTarget(h);
    if (!tgt) { sfx.dodge(); return; }
    sfx.slash();
    this.dealHeroDamage(h, tgt, 1);
    if ((has(h, 'double') || has(h, 'flurry')) && !tgt.dead) {
      this.dealHeroDamage(h, tgt, 0.7);
    } else if (has(h, 'double') || has(h, 'flurry')) {
      const next = this.meleeTarget(h);
      if (next) this.dealHeroDamage(h, next, 0.7);
    }
  }

  private heroShoot(h: HeroUnit): void {
    const tgt = this.enemies.filter((e) => !e.dead).sort((a, b) => a.x - b.x)[0];
    if (!tgt) return;
    const kind: Proj['kind'] = h.look.weapon === 'bow' ? 'arrow'
      : (has(h, 'holysplash') || h.look.weapon === 'orb') ? 'light' : 'magic';
    const pierce = (has(h, 'pierce') || (has(h, 'crit') && h.defId === 'lyra')) ? 2 : 0;
    this.projs.push({
      x: h.x + 22, y: h.y - 74 * h.scale, tx: tgt.x, ty: tgt.y - 60 * tgt.scale,
      target: tgt.uid, speed: kind === 'arrow' ? 780 : 540, dmg: h.atk, kind, t: 0,
      pierce, splash: has(h, 'splash') ? 100 : 0, crit: h.crit,
      ally: true, ownerSkill: h.skills[0] ?? null, ownerUid: h.uid, spin: 0,
    });
    if (kind === 'arrow') sfx.shoot(); else sfx.beam();
  }

  private ownerOf(uid: string): HeroUnit | null {
    return this.heroes.find((h) => h.uid === uid) ?? this.heroes[0] ?? null;
  }

  private updateProjectiles(dt: number): void {
    for (const pr of this.projs) {
      pr.t += dt;
      if (pr.t < 0) continue;
      pr.spin += dt * 12;
      const tgt = pr.target ? this.enemies.find((e) => e.uid === pr.target && !e.dead) : undefined;
      const tx = tgt ? tgt.x : pr.tx;
      const ty = tgt ? tgt.y - 60 * tgt.scale : pr.ty;
      const dx = tx - pr.x;
      const dy = ty - pr.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = pr.speed * dt;

      if (d > step + 14) {
        pr.x += (dx / d) * step;
        pr.y += (dy / d) * step;
        if (pr.kind === 'magic' || pr.kind === 'light' || pr.kind === 'bolt') {
          if (Math.random() < 0.6 && this.parts.length < 400) {
            this.parts.push({
              x: pr.x, y: pr.y, vx: rand(-14, 14), vy: rand(-14, 14), g: 0,
              life: 0.24, maxLife: 0.24, size: 2.6,
              color: pr.kind === 'light' ? '#fff4c8' : pr.kind === 'magic' ? '#c48aff' : '#8cdcff',
              shape: 'spark', rot: 0, vr: 0,
            });
          }
        }
        continue;
      }

      // ---- chạm đích ----
      const owner = pr.ally ? this.ownerOf(pr.ownerUid) : null;
      if (pr.kind === 'meteor') {
        this.burst(pr.x, LANE_Y[0] - 20, 30, '#ff9a3c', 'ember');
        this.burst(pr.x, LANE_Y[0] - 20, 16, '#ffd23c', 'spark');
        this.ring(pr.x, LANE_Y[0] - 26, pr.splash, '#ff9a3c');
        this.shake = Math.max(this.shake, 9);
        sfx.crit();
        for (const e of this.enemies) {
          if (e.dead || Math.abs(e.x - pr.x) >= pr.splash) continue;
          const crit = Math.random() < pr.crit;
          this.applyEnemyDamage(e, pr.dmg * (crit ? 2 : 1), '#ff9a3c', crit, owner);
        }
      } else if (pr.ally) {
        if (tgt) {
          const crit = Math.random() < pr.crit;
          const dmg = pr.dmg * (crit ? 2 : 1) * rand(0.93, 1.07);
          this.applyEnemyDamage(tgt, dmg, crit ? '#ffd23c' : '#c8e8ff', crit, owner);
          this.burst(tgt.x, ty, crit ? 9 : 4,
            pr.kind === 'light' ? '#fff4c8' : pr.kind === 'magic' ? '#c48aff' : '#8cdcff', 'spark');
          if (pr.splash > 0) {
            for (const o of this.enemies) {
              if (o !== tgt && !o.dead && Math.abs(o.x - tgt.x) < pr.splash) {
                this.applyEnemyDamage(o, dmg * 0.55, '#ffb43c', false, owner);
              }
            }
            this.ring(tgt.x, ty, pr.splash * 0.8, '#ffb43c');
          }
          if (pr.pierce > 0) {
            const others = this.enemies
              .filter((e) => !e.dead && e.uid !== tgt.uid)
              .sort((a, b) => Math.abs(a.x - tgt.x) - Math.abs(b.x - tgt.x))
              .slice(0, pr.pierce);
            for (const o of others) this.applyEnemyDamage(o, dmg * 0.6, '#8cdcff', false, owner);
          }
          if (owner && (has(owner, 'heal') || has(owner, 'strongheal') || has(owner, 'holysplash'))) {
            this.healLowest(dmg * (has(owner, 'strongheal') ? 0.9 : 0.4));
          }
        }
      } else {
        const victims = this.heroes.filter((h) => !h.dead);
        if (victims.length > 0) {
          const tgtHero = victims.reduce((a, b) =>
            Math.abs(a.x - pr.tx) < Math.abs(b.x - pr.tx) ? a : b);
          this.hitHero(tgtHero, pr.dmg * rand(0.9, 1.1), null,
            pr.kind === 'acid' ? '#8dff5a' : '#c48aff');
          sfx.splat();
        }
      }
      pr.t = 999;
    }
    if (this.projs.some((p) => p.t > 900)) this.projs = this.projs.filter((p) => p.t < 900);
  }

  private updateLegion(dt: number): void {
    if (this.legionCount <= 0 || this.legionAtk <= 0) return;
    this.legionCd -= dt;
    if (this.legionCd > 0) return;
    this.legionCd = 1.1;
    const lead = this.enemies.find((e) => !e.dead);
    if (!lead) return;
    const dmg = this.legionAtk * rand(0.9, 1.15);
    this.applyEnemyDamage(lead, dmg, '#b8a0ff', false, this.heroes[0] ?? null);
    this.burst(lead.x, lead.y - 60 * lead.scale, 5, '#b8a0ff', 'spark');
  }

  private refreshHud(): void {
    const boss = this.enemies.find((e) => e.boss && !e.dead);
    this.hudCache = {
      floor: this.floor, wave: this.wave + 1, inBoss: this.bossActive,
      bossName: hasBossOnFloor(this.floor) ? this.bossDef().name : '',
      bossHp: boss ? boss.hp : 0, bossMaxHp: boss ? boss.maxHp : 0,
      bossHpPct: boss ? clamp(boss.hp / boss.maxHp, 0, 1) : 0,
      gold: this.gold, gems: this.gems, power: this.power(),
      floorName: floorNameOf(this.floor), zoneName: zoneOf(this.floor).name,
      combo: this.combo, comboPct: clamp(this.comboT / BAL.COMBO_WINDOW, 0, 1),
      rage: this.rage / BAL.RAGE_MAX,
      enemiesLeft: this.enemies.filter((e) => !e.dead).length + this.spawnQueue.length,
    };
  }

  // ============ VẼ ============
  private draw(): void {
    const ctx = this.ctx;
    const zone = zoneOf(this.floor);
    const scene = {
      w: VIEW_W, h: VIEW_H, ground: HORIZON, scroll: this.scrollX, t: this.globalT,
      zone, intensity: clamp(this.hudCache.rage * 0.4 + (this.bossActive ? 0.3 : 0), 0, 1),
    };

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(rand(-this.shake, this.shake) * 0.6, rand(-this.shake, this.shake) * 0.5);
      ctx.rotate(rand(-this.shake, this.shake) * 0.0006);
    }
    drawBackground(ctx, scene, this.quality);
    if (this.state === 'title') this.drawTitleScene();
    else this.drawWorld();
    this.drawParticles();
    drawForeground(ctx, scene);
    drawGrade(ctx, scene, this.quality);
    ctx.restore();

    if (this.flash > 0) {
      ctx.globalAlpha = clamp(this.flash, 0, 1) * 0.3;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(5,4,10,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawTitleScene(): void {
    const ctx = this.ctx;
    const t = this.globalT;
    const previews = COMPANIONS.filter((c) => (this.ownedCompanions[c.id] ?? 0) > 0).slice(0, 4);
    previews.forEach((c, i) => {
      ctx.save();
      ctx.translate(VIEW_W / 2 - 200 + i * 132, LANE_Y[1]);
      ctx.globalAlpha = 0.92;
      drawHero(ctx, c.look, {
        t: t + i * 0.7, gait: (t * 0.35 + i * 0.25) % 1, action: 'idle', actionT: 0,
        facing: i % 2 === 0 ? 1 : -1, scale: 0.95, hurt: 0, frozen: 0, vx: 0, seed: i * 1.9,
      });
      ctx.restore();
    });
    ctx.save();
    ctx.translate(VIEW_W / 2, LANE_Y[0] + 6);
    drawHero(ctx, this.kaelLook(), {
      t, gait: (t * 0.4) % 1, action: 'idle', actionT: 0, facing: 1,
      scale: 1.9, hurt: 0, frozen: 0, vx: 0, seed: 0.4,
    });
    ctx.restore();
  }

  /**
   * Vạch nền của ba hàng dàn trận. Không có nó thì ba hàng chỉ khác nhau ở
   * độ cao trên màn hình, người chơi khó nhận ra đội hình có chiều sâu.
   */
  private drawRankMarkers(): void {
    const ctx = this.ctx;
    const counts = [0, 0, 0];
    for (const h of this.heroes) counts[h.lane] += 1;
    ctx.save();
    for (let lane = 2; lane >= 0; lane--) {
      if (counts[lane] === 0) continue;
      const y = LANE_Y[lane];
      const right = LANE_ANCHOR[lane] + 34;
      const left = LANE_ANCHOR[lane] - (LANE_CAP - 1) * LANE_GAP - 34;
      const pulse = 0.3 + 0.08 * Math.sin(this.globalT * 1.6 + lane);
      const g = ctx.createLinearGradient(left, 0, right, 0);
      g.addColorStop(0, alphaOf(LANE_TINT[lane], 0));
      g.addColorStop(0.5, alphaOf(LANE_TINT[lane], pulse));
      g.addColorStop(1, alphaOf(LANE_TINT[lane], 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse((left + right) / 2, y + 3, (right - left) / 2, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Nhãn đặt bên TRÁI dải: vùng đó luôn trống vì ba dải không chồng nhau.
      ctx.globalAlpha = 0.5 - lane * 0.08;
      ctx.fillStyle = LANE_TINT[lane];
      ctx.font = '700 9px "Chakra Petch", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(LANE_LABEL[lane], left - 6, y + 3);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawWorld(): void {
    const ctx = this.ctx;
    this.drawRankMarkers();

    // vật phẩm rơi
    for (const pk of this.pickups) {
      const a = clamp(pk.life, 0, 1);
      const glow = pk.kind === 'gem' ? '#ff4fd8' : '#ffd23c';
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
      g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.scale(Math.cos(pk.spin) * 0.4 + 0.6, 1);
      if (pk.kind === 'gem') {
        ctx.fillStyle = '#ff4fd8';
        ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -9); ctx.lineTo(7, -2); ctx.lineTo(0, 9); ctx.lineTo(-7, -2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-2, -3, 1.6, 0, Math.PI * 2); ctx.fill();
      } else {
        const cg = ctx.createLinearGradient(-8, -8, 8, 8);
        cg.addColorStop(0, '#ffeaa0'); cg.addColorStop(0.5, '#ffd23c'); cg.addColorStop(1, '#a8741e');
        ctx.fillStyle = cg;
        ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }

    // Cảnh báo tụ lực của boss — vẽ dưới chân nhân vật để người chơi đọc được.
    for (const e of this.enemies) {
      if (e.telegraph <= 0 || e.dead) continue;
      const p = 1 - e.telegraph / 1.15;
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(this.globalT * 22);
      ctx.strokeStyle = '#ff3b52';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(e.x - 60, e.y + 4, 150 * p, 34 * p, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,59,82,0.14)';
      ctx.fill();
      ctx.restore();
    }

    // Sắp xếp theo chiều sâu: làn xa vẽ trước, làn gần vẽ sau.
    type Drawable = { y: number; x: number; draw: () => void };
    const list: Drawable[] = [];
    const reflect = this.quality >= 2;

    for (const e of this.enemies) {
      list.push({
        y: e.y, x: e.x, draw: (): void => {
          const style = { tint: e.tint, eye: e.eye, boss: e.boss };
          if (reflect) withReflection(ctx, e.x, e.y, 0.16, (c) => drawMonster(c, e.kind, style, e.anim));
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 30 * e.scale, 7 * e.scale, 0, 0, Math.PI * 2);
          ctx.fill();
          drawMonster(ctx, e.kind, style, e.anim);
          if (!e.boss && !e.dead && e.hp < e.maxHp) {
            const w = 44 * e.scale;
            const top = -112 * e.scale;
            ctx.fillStyle = 'rgba(8,6,12,0.82)';
            ctx.beginPath(); ctx.roundRect(-w / 2, top, w, 5.5, 2.5); ctx.fill();
            const pct = clamp(e.hp / e.maxHp, 0, 1);
            ctx.fillStyle = pct > 0.4 ? '#ff5a52' : '#ff2d44';
            ctx.beginPath(); ctx.roundRect(-w / 2 + 1, top + 1, (w - 2) * pct, 3.5, 1.8); ctx.fill();
          }
          ctx.restore();
        },
      });
    }

    for (const h of this.heroes) {
      list.push({
        y: h.y, x: h.x, draw: (): void => {
          if (reflect) withReflection(ctx, h.x, h.y, 0.18, (c) => drawHero(c, h.look, h.anim));
          ctx.save();
          ctx.translate(h.x, h.y);
          drawHero(ctx, h.look, h.anim);
          if (!h.dead) {
            const w = h.isKael ? 46 : 38;
            const top = -122 * h.scale;
            ctx.fillStyle = 'rgba(8,6,12,0.82)';
            ctx.beginPath(); ctx.roundRect(-w / 2, top, w, 5.5, 2.5); ctx.fill();
            const pct = clamp(h.hp / h.maxHp, 0, 1);
            ctx.fillStyle = pct > 0.35 ? '#3fe0b0' : '#ff3b52';
            ctx.beginPath(); ctx.roundRect(-w / 2 + 1, top + 1, (w - 2) * pct, 3.5, 1.8); ctx.fill();
            if (h.isKael) {
              ctx.fillStyle = '#ffd23c';
              ctx.font = '700 9px "Chakra Petch", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('KAEL', 0, top - 4);
            }
          }
          ctx.restore();
        },
      });
    }

    list.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const d of list) d.draw();

    // đạn
    for (const pr of this.projs) {
      if (pr.t < 0 || pr.t > 900) continue;
      ctx.save();
      ctx.translate(pr.x, pr.y);
      if (pr.kind === 'arrow') {
        ctx.rotate(Math.atan2(pr.ty - pr.y, pr.tx - pr.x));
        ctx.strokeStyle = 'rgba(255,240,200,0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-8, 0); ctx.stroke();
        ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#8cdcff';
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
      } else if (pr.kind === 'meteor') {
        ctx.rotate(pr.spin * 0.3);
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
        g.addColorStop(0, '#fff2c0'); g.addColorStop(0.4, '#ff9a3c'); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b4432';
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,25,0.9)'; ctx.lineWidth = 2.4; ctx.stroke();
      } else {
        const color = pr.kind === 'light' ? '#fff4c8'
          : pr.kind === 'magic' ? '#c48aff'
            : pr.kind === 'acid' ? '#8dff5a' : '#8cdcff';
        const r = 13 + Math.sin(pr.spin) * 2;
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // chữ sát thương
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ft of this.texts) {
      const life = ft.life / ft.maxLife;
      const pop = life > 0.82 ? 1 + (life - 0.82) * 3 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(life * 1.8, 0, 1);
      ctx.translate(ft.x, ft.y);
      ctx.scale(pop, pop);
      ctx.font = `${ft.size}px "Bangers", cursive`;
      ctx.strokeStyle = 'rgba(8,4,10,0.9)';
      ctx.lineWidth = ft.bold ? 6 : 4;
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    ctx.save();
    for (const p of this.parts) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'smoke') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2.4 - a), 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === 'ring') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * a;
        ctx.globalAlpha = a * 0.7;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * (1.4 - a), p.size * (1.4 - a) * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.shape === 'slash' || p.shape === 'ice') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -1, p.size * 2, 2);
        ctx.restore();
      } else {
        if (p.shape === 'ember') { ctx.globalCompositeOperation = 'lighter'; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
