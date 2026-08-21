# Cân bằng lại & giữ chân người chơi — kế hoạch triển khai

Tài liệu này gồm hai phần:

- **Phần A** — những gì đã sửa trong nhánh này (mục 1: cân bằng chỉ số), kèm
  bảng đối chiếu số cũ/mới và phần giải trình chỗ tôi *không* làm theo đúng
  con số đề bài, vì con số đó mâu thuẫn với đường cong đang có.
- **Phần B** — hướng dẫn viết code từng bước cho mục 2, 3, 4. Mỗi hệ thống
  đều bám đúng bốn lớp kiến trúc hiện tại, có mẫu code để dán vào và có phần
  cảnh báo những chỗ dễ làm vỡ bản lưu.

---

## 0. Bản đồ kiến trúc — đọc trước khi viết bất cứ dòng nào

Game đang có bốn lớp, và **thêm bất kỳ hệ thống nào cũng đi đúng bốn bước
này**. Nếu bỏ bước nào thì hoặc bản lưu mất dữ liệu, hoặc giao diện và engine
tính ra hai con số khác nhau.

| Lớp | File | Vai trò | Luật cứng |
|---|---|---|---|
| Dữ liệu | `src/game/data.ts`, `trials.ts`, `daily.ts`, `quests.ts`, `relics.ts`, `synergy.ts`, `achievements.ts` | Bảng số và định nghĩa thuần | Không giữ state, không import engine |
| Engine | `src/game/engine.ts` | Toàn bộ state, vòng lặp, `save()`/`load()`, `getMeta()` | Mọi phép tính cân bằng nằm ở đây, **không** tính lại ở UI |
| Cầu nối | `MetaInfo` trong `engine.ts` | Ảnh chụp trạng thái cho React | UI chỉ đọc, không suy diễn |
| Giao diện | `src/ui/panels.tsx`, `App.tsx` | Modal + dock | Gọi method public của engine, không sờ vào field private |

### Công thức 5 bước thêm một hệ thống mới

1. **Bảng dữ liệu** → file mới trong `src/game/` (ví dụ `skilltree.ts`). Chỉ
   `export type` + `export const` + hàm thuần.
2. **State + bản lưu** → thêm field `private` trong `engine.ts`, thêm vào
   object trong `save()` (~dòng 3354) và đọc lại trong `load()` (~dòng 3402)
   **có kiểm tra kiểu và clamp**. Bản lưu cũ thiếu field mới phải chạy được.
3. **Method public** → một hàm *đọc* (`xxxInfo(): XxxInfo`) và các hàm *hành
   động* (`buyXxx()`, `resetXxx()`). Hàm hành động luôn kết thúc bằng
   `this.recomputeParty(); this.save(); this.pushMeta();`.
4. **Cầu nối** → thêm `interface XxxInfo` cạnh các interface khác (~dòng 175–455)
   và gán trong `getMeta()`.
5. **Giao diện** → thêm `'xxx'` vào `PanelId` (`panels.tsx:19`), viết
   `export function XxxModal(...)`, cắm vào `App.tsx` (~dòng 150–162) và thêm
   nút vào `DockBar` (`panels.tsx:636`).

> **Bẫy hay gặp nhất:** quên bước 2 → chơi xong tắt trình duyệt là mất sạch;
> hoặc tính lại công thức ở `panels.tsx` cho tiện → hai con số lệch nhau và
> không ai biết con nào đúng.

---

# PHẦN A — Mục 1: Cân bằng lại chỉ số (ĐÃ CODE XONG)

Toàn bộ trần sức mạnh nay nằm trong `BAL` ở `src/game/data.ts` chứ không rải
rác trong engine nữa — chỉnh một chỗ là cả engine lẫn giao diện đổi theo.

## A.1 Bảng đối chiếu

| Đề bài | Hằng số / vị trí thật | Cũ | Mới | Ghi chú |
|---|---|---|---|---|
| Kael base damage 15 → 5 | `BAL.KAEL_ATK0` | 95 | **32** | Giữ đúng tỉ lệ 1/3 của đề bài |
| Kael base HP 50 → 100 | `BAL.KAEL_HP0` | 320 | **640** | Gấp đôi |
| Max crit 60% | `BAL.CRIT_CAP`, dùng ở `kaelCrit()`, `makeHero()`, `rawCompanionStats()` | 0.85 | **0.60** | Ba chỗ clamp nay dùng chung một hằng số |
| Lifesteal trần 10%, stack 5% | `BAL.LIFESTEAL_CAP` / `LIFESTEAL_STACK`, dùng ở `dealHeroDamage()` | 30% + Liên Kết (tối đa ~48%) | **5% mỗi nguồn, tổng 10%** | Số trong `synergy.ts` đã hạ theo để mô tả không nói dối |
| Hồi máu tự nhiên | `BAL.REGEN_PS` | 1.2%/s | **0.3%/s** | |
| Trần damage từ item +800% | `BAL.ITEM_ATK_CAP` | 12 (+1200%) | **8** | Trần HP giữ 12, crit 0.45, aspd 1.2 |
| Boss +150% HP | `BAL.BOSS_HP_MUL` | ×2.4 | **×6.0** | |
| Boss +50% ATK | `BAL.BOSS_ATK_MUL` | ×1.3 | **×1.95** | |
| Telegraph 1.15s → 0.8s | `BAL.BOSS_TELEGRAPH` | 1.15 | **0.8** | Dùng chung cho cả logic lẫn vòng sáng cảnh báo |
| Đồng hành giữ 60% | `BAL.COMPANION_POWER` | 0.25 | **0.60** | Đúng ý "nerf penalty 75% → 40%" |
| Stun/Freeze ≤ 20%, 0.5s | `BAL.CC_CHANCE_CAP` / `CC_DURATION` | 25/30/35%, 0.8–0.9s | **20%, 0.5s** | Vex không còn ngoại lệ 35%/0.9s |

Mô tả kỹ năng trong `data.ts` (Gấu Nhỏ, Rhea, Vex, Fenrir, bộ `SKILLSET`, bậc
Tiến Hoá *Huyết Ẩm*) đã sửa theo số mới — nếu để nguyên, người chơi đọc "hút
30%" rồi nhận 5% thì đó là lỗi niềm tin, không phải lỗi cân bằng.

## A.2 Kết quả đo được

Mô phỏng Kael **đơn độc** (không đồng hành) đánh boss cuối tầng, giả định dồn
50% vàng cày được cho Kael:

| Tầng | TTK boss cũ | TTK boss mới | Kael sống được (mới) |
|---|---|---|---|
| 1 | 1.2s | **8.8s** | 36s |
| 5 | 1.5s | **11.3s** | 30s |
| 10 | 1.7s | **12.6s** | 29s |
| 20 | 1.9s | **14.4s** | 28s |
| 30 | 2.2s | **16.5s** | 28s |

Boss từ "biến mất trong 2 giây" thành một trận đánh thật. Có đồng hành (nay
mạnh gấp 2.4 lần) thì TTK thực tế rơi về khoảng 4–8s — đúng vùng mong muốn.

**Tổng sát thương đội không sụp.** Với đội hình điển hình trước đây Kael gánh
~70% sát thương: `0.7 × 0.337 + 0.3 × 2.4 ≈ 0.96`. Nghĩa là DPS tổng gần như
giữ nguyên, chỉ **đổi nguồn** từ Kael sang đội hình — nhờ vậy 72 đồng hành và
hệ Liên Kết mới thật sự có việc làm. Về cuối game trần crit và trần item kéo
thêm xuống còn ~0.83, cộng boss ×2.5 máu, nên hiện tượng one-shot boss biến
mất mà không chặn tiến trình.

## A.3 Phần tôi KHÔNG làm theo đúng đề bài, và vì sao

Đề bài viết: *"Tăng scaling máu quái `15 * 1.25^level` và damage `5 * 1.2^level`"*.

Đường cong đang chạy trong game là:

```
Máu quái  = 37.4 × 1.0375^(đợt)   → mỗi tầng 7 đợt → ×1.2939/tầng
Công quái =  6.05 × 1.0325^(đợt)                    → ×1.2482/tầng
```

Nếu `level` = tầng, thì `1.25^tầng` **chậm hơn** 1.2939 đang có, và base 15
**thấp hơn** 37.4. Áp dụng nguyên văn là *nerf* quái, ngược hẳn với tiêu đề
"Buff Quái". Nếu `level` = đợt thì `1.25^đợt` cho máu quái vượt `10^6` ngay ở
tầng 4 — không tầng nào qua nổi.

Thêm nữa, đường cong hiện tại đã được chọn khớp với tốc độ giàu lên của người
chơi:

```
Sức mạnh mua bằng vàng tăng: 1.055^(ln1.1 / ln1.16) = 1.0350 mỗi đợt
Máu quái tăng:                                        1.0375 mỗi đợt
```

Quái đã nhanh hơn người chơi 0.25%/đợt sẵn — phần thiếu do cấp từ boss, trang
bị, vũ khí và Thăng Hoa bù vào. Nâng `FOE_HP_RATE` lên nữa, **cộng với** việc
Kael vừa bị cắt còn 1/3 sát thương, sẽ làm tiến trình đứng hẳn ở khoảng tầng
20–30.

**Nên làm thay thế** (và đã có sẵn đường đi trong Phần B):

1. Buff boss ×2.5 máu / ×1.5 công — **đã làm**.
2. Đưa độ khó Hard/Nightmare xuống áp dụng từ tầng 1 (B.1) — đây mới đúng
   chỗ để "+50% HP/DMG quái" sống, vì người chơi tự chọn và tự nhận thưởng bù.
3. Elite & Danger zone (B.2) — buff quái theo từng điểm nhấn thay vì kéo cả
   đường cong.

Nếu vẫn muốn kéo đường cong nền: sửa `BAL.FOE_HP_RATE` từ `1.0375` lên tối đa
`1.0395` (≈ ×1.31/tầng) và **theo dõi tầng 25–35**. Đừng chạm `FOE_ATK_RATE`
trước khi đo lại thời gian sống của đội — công quái tăng làm chết đội chứ
không làm trận đánh hay hơn.

---

# PHẦN B — Hướng dẫn code mục 2, 3, 4

## B.1 — Hệ thống Khó/Dễ (Difficulty Tiers)

**Tin tốt:** hệ này đã có 80% trong `DUNGEON_MODES` (`data.ts:922`), chỉ bị
khoá hai chỗ. Đây là việc rẻ nhất trong cả danh sách — làm trước.

### Bước 1 — mở khoá cho toàn bộ tầng

`engine.ts:776` và `:781` đang chặn:

```ts
private modeFoeMul(): number {
  if (this.floor < TOTAL_FLOORS) return 1;   // ← bỏ dòng này
  return dungeonModeDef(this.dungeonMode).foeMul;
}
```

Bỏ hai dòng `if` đó là độ khó có hiệu lực từ tầng 1.

### Bước 2 — tách thưởng vàng và thưởng ngọc

Đề bài muốn Hard **+50% ngọc nhưng −20% vàng**. Hiện `rewardMul` là một số
duy nhất nhân vào cả hai. Tách trong `data.ts`:

```ts
export interface DungeonModeDef {
  id: DungeonMode; name: string; short: string; desc: string; color: string;
  foeMul: number;
  /** Nhân riêng vào Vàng. */
  goldMul: number;
  /** Nhân riêng vào Ngọc. */
  gemMul: number;
  edictMul: number;
  /** Tầng phải đạt mới mở được nấc này. */
  needFloor: number;
}

export const DUNGEON_MODES: DungeonModeDef[] = [
  { id: 'normal',    …, foeMul: 1,   goldMul: 1,   gemMul: 1,   edictMul: 1,   needFloor: 0  },
  { id: 'hard',      …, foeMul: 1.5, goldMul: 0.8, gemMul: 1.5, edictMul: 1.8, needFloor: 10 },
  { id: 'nightmare', …, foeMul: 2.5, goldMul: 0.6, gemMul: 2.2, edictMul: 2.6, needFloor: 30 },
];
```

Rồi trong engine, thay `modeRewardMul()` bằng hai hàm:

```ts
private modeGoldMul(): number { return dungeonModeDef(this.dungeonMode).goldMul; }
private modeGemMul(): number  { return dungeonModeDef(this.dungeonMode).gemMul; }
```

Sửa các chỗ gọi: `goldPerKill()` (`engine.ts:821`) dùng `modeGoldMul()`; ba
chỗ ngọc (`:2103`, `:2113`, `:3706`) dùng `modeGemMul()`.

> **Quyết định thiết kế:** đổi `evil` thành `nightmare` sẽ làm hỏng bản lưu cũ
> (`dungeonMode: 'evil'`). Hoặc giữ id `'evil'` và chỉ đổi tên hiển thị, hoặc
> thêm nhánh di trú trong `load()`:
> `if (d.dungeonMode === 'evil') this.dungeonMode = 'nightmare';`
> Cũng nhớ `evilOnly` trong `SHOP_ITEMS` và cờ `evilCleared` bám theo id này.

### Bước 3 — chặn nhảy cóc & lưu kỷ lục riêng

```ts
private bestFloorByMode: Partial<Record<DungeonMode, number>> = {};

setDungeonMode(m: DungeonMode): void {
  const def = dungeonModeDef(m);
  if (this.bestFloor < def.needFloor) {
    this.toast(`Cần tới tầng ${def.needFloor + 1} mới mở được ${def.short}`, '#ff5a6a');
    sfx.warn();
    return;
  }
  this.dungeonMode = m;
  this.startFloor(this.floor, true);   // đổi độ khó là đánh lại tầng từ đầu
  this.save(); this.pushMeta();
}
```

Lưu `bestFloorByMode` ở bước 2 của công thức 5 bước. Kỷ lục theo từng nấc là
thứ khiến người chơi quay lại: "Normal tầng 100 / Hard tầng 62" là một mục
tiêu, một con số chung thì không.

### Bước 4 — giao diện

`ModePicker` (`panels.tsx:605`) đã vẽ sẵn. Chỉ cần bỏ `if (!meta.modesUnlocked) return null;`
và thêm trạng thái khoá:

```tsx
const locked = meta.bestFloor < m.needFloor;
// … disabled={locked}, title={locked ? `Mở ở tầng ${m.needFloor + 1}` : m.desc}
```

---

## B.2 — Elite enemies & Danger zones

### Bước 1 — mở rộng `Enemy`

`engine.ts:139` thêm hai field:

```ts
elite: boolean;
/** Bậc elite: 1 = Tinh Anh, 2 = Thủ Lĩnh Vùng Nguy Hiểm. */
eliteTier: number;
```

Và hằng số trong `data.ts`:

```ts
export const ELITE = {
  /** Tỉ lệ một con quái thường hoá Tinh Anh. */
  CHANCE: 0.12,
  /** Tầng tối thiểu bắt đầu xuất hiện. */
  MIN_FLOOR: 5,
  HP_MUL: 4, ATK_MUL: 1.6, SCALE: 1.28,
  GOLD_MUL: 5, GEM_MUL: 4,
  /** Vùng Nguy Hiểm: cứ mỗi 10 tầng. */
  ZONE_EVERY: 10,
  ZONE_HP_MUL: 1.8, ZONE_ATK_MUL: 1.35, ZONE_REWARD_MUL: 2,
} as const;

export const isDangerFloor = (floorIdx: number): boolean =>
  floorIdx > 0 && floorIdx % ELITE.ZONE_EVERY === 0;
```

### Bước 2 — sinh quái

Trong `startWave()` (`engine.ts:1901`), sau khi dựng `spawnQueue`:

```ts
// Vùng Nguy Hiểm: mọi con trong tầng đều mạnh hơn, và chắc chắn có Tinh Anh.
const danger = isDangerFloor(this.floor);
for (const req of this.spawnQueue) {
  if (req.kind === 'boss') continue;
  req.elite = this.floor >= ELITE.MIN_FLOOR
    && Math.random() < ELITE.CHANCE * (danger ? 2.5 : 1);
}
if (danger && !this.spawnQueue.some((r) => r.elite)) {
  this.spawnQueue[0].elite = true;   // vùng nguy hiểm luôn có ít nhất một con
}
```

(`SpawnReq` ở `engine.ts:161` thêm `elite?: boolean`.)

Trong `spawnEnemy()` (`:1931`) nhân chỉ số:

```ts
const danger = isDangerFloor(this.floor);
const eliteTier = elite ? (danger ? 2 : 1) : 0;
const eMul = elite ? ELITE.HP_MUL : 1;
const zMul = danger ? ELITE.ZONE_HP_MUL : 1;
const hp = this.foeHpBase() * (FOE_HP_MUL[k] ?? 1) * (boss ? BAL.BOSS_HP_MUL : 1) * eMul * zMul;
```

Tương tự cho `atk` với `ELITE.ATK_MUL` / `ZONE_ATK_MUL`, và `scale` nhân
`ELITE.SCALE` để nhìn là biết ngay.

### Bước 3 — thưởng

Trong hàm xử lý quái chết (chỗ đang cộng vàng/ngọc, quanh `engine.ts:2100`):

```ts
const eliteMul = e.elite ? ELITE.GOLD_MUL : 1;
this.addGold(this.goldPerKill() * eliteMul * (isDangerFloor(this.floor) ? ELITE.ZONE_REWARD_MUL : 1));
```

Và `gemChance` nhân `ELITE.GEM_MUL` khi `e.elite`.

### Bước 4 — báo hiệu

Đây là phần quan trọng nhất với retention: người chơi phải **thấy** là có
chuyện đang xảy ra.

- `startFloor()` (`:1880`): nếu `isDangerFloor(this.floor)` thì đổi banner
  thành `'VÙNG NGUY HIỂM'` với màu `#ff3b52` và gọi `sfx.roar()`.
- Trong renderer quái (`engine.ts` ~`:4500`), nếu `e.elite` thì vẽ thêm vòng
  hào quang: đã có sẵn `this.ring(x, y, r, color)` để dùng.
- `HudState` (`:175`) thêm `danger: boolean`, `FloorCard` (`panels.tsx:221`)
  đổi viền sang đỏ khi bật.

### Bước 5 — nối vào hệ có sẵn

Thêm `'elites'` vào bộ đếm `this.ctr` (`:626`), vào `QuestStat`
(`quests.ts:21`) và vào `AchStatId` — Tinh Anh lập tức có nhiệm vụ ngày và
thành tựu riêng mà không cần viết hệ thống mới nào.

---

## B.3 — Daily Challenges

Không viết hệ mới: **tái dùng `TrialRule`** trong `trials.ts` — engine đã biết
đọc `regen`, `fewParty`, `noHeal`, `glass`, `noRage`… qua `trialHasRule()`.

### Bước 1 — file `src/game/challenge.ts`

```ts
import type { TrialRule } from './trials';

/** Modifier riêng của thử thách ngày — cái nào Tháp chưa có thì thêm ở đây. */
export type ChallengeMod = TrialRule | 'noCompanion' | 'noCrit' | 'heroCap';

export interface ChallengeDef {
  id: ChallengeMod;
  name: string;
  desc: string;
  color: string;
  /** Càng khó càng nhiều Ấn Điểm + Ngọc. */
  weight: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'noCompanion', name: 'Độc Hành',  desc: 'Không đồng hành nào ra sân — chỉ Kael.', color: '#ff5a6a', weight: 3 },
  { id: 'noCrit',      name: 'Vô Tình',   desc: 'Chí mạng bị vô hiệu hoàn toàn.',          color: '#8cdcff', weight: 2 },
  { id: 'heroCap',     name: 'Ngũ Nhân',  desc: 'Tối đa 5 đồng hành ra sân.',              color: '#ffd23c', weight: 2 },
  { id: 'frenzy',      name: 'Cuồng Bạo', desc: 'Quái gây gấp đôi sát thương.',            color: '#ff3b52', weight: 2 },
  { id: 'glass',       name: 'Thuỷ Tinh', desc: 'Máu toàn đội còn một nửa.',               color: '#a78bfa', weight: 3 },
  { id: 'noHeal',      name: 'Tuyệt Dược',desc: 'Mọi nguồn hồi máu bị chặn.',              color: '#ff9a3c', weight: 2 },
];

/**
 * Bốc modifier theo NGÀY, không theo `Math.random()`.
 * Cùng một ngày phải luôn ra cùng một bộ — nếu không, người chơi chỉ cần
 * tải lại trang cho tới khi bốc trúng bộ dễ, và thử thách mất hết ý nghĩa.
 */
export function challengeOfDay(dayKey: string): ChallengeDef[] {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) { h ^= dayKey.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = (): number => ((h = Math.imul(h ^ (h >>> 15), 2246822507)) >>> 0) / 4294967296;
  const pool = [...CHALLENGES];
  const out: ChallengeDef[] = [];
  const n = 1 + Math.floor(rnd() * 2);          // 1–2 modifier mỗi ngày
  for (let i = 0; i < n && pool.length > 0; i++) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
```

### Bước 2 — engine

```ts
private challengeDay = '';        // dayKey đã hoàn thành gần nhất
private challengeRun: ChallengeMod[] | null = null;   // KHÔNG lưu (giống TrialRun)

private challengeHasMod(m: ChallengeMod): boolean {
  return this.challengeRun !== null && this.challengeRun.includes(m);
}
```

Cắm ba modifier mới vào đúng chỗ đã có sẵn chốt chặn:

| Modifier | Sửa ở đâu |
|---|---|
| `noCompanion` | `recomputeParty()` — `fieldCap = 0` |
| `heroCap` | `recomputeParty()` — `fieldCap = 5` (cạnh luật `fewParty`) |
| `noCrit` | `kaelCrit()` và `rawCompanionStats()` — trả `0` |

Ba modifier còn lại (`frenzy`, `glass`, `noHeal`) hoạt động ngay: chỉ cần sửa
`trialHasRule()` thành:

```ts
private hasRule(r: TrialRule): boolean {
  return (this.trial?.rules.includes(r) ?? false) || this.challengeHasMod(r);
}
```

rồi đổi mọi chỗ gọi `trialHasRule` sang `hasRule`.

### Bước 3 — điều kiện thắng & thưởng

Dùng lại khung Tháp: dọn N đợt trong thời gian giới hạn, thắng thì cộng Ngọc +
Ấn Điểm (`this.edictPoints`) rồi ghi `this.challengeDay = dayKeyOf()`. Ngày
hôm sau `dayKeyOf()` đổi → thử thách tự mở lại. Không cần cron, không cần
server.

**Cân bằng thưởng:** tổng Ngọc một ngày nên khoảng 1.5–2 lần một ô điểm danh
trung bình (~150 Ngọc), nhân theo `weight` cộng dồn của bộ modifier hôm đó.
Thưởng cao hơn thế thì Điểm Danh thành thừa.

---

## B.4 — Skill Tree cho Kael

Hiện Kael tự mở chiêu theo bậc Tiến Hoá (`EVOLUTIONS`, `data.ts:772`) — không
có lựa chọn nào. Skill Tree không thay thế hệ đó mà **chồng lên**: Tiến Hoá
cho chiêu, Skill Tree cho hướng đi.

### Bước 1 — `src/game/skilltree.ts`

```ts
export type Branch = 'berserker' | 'guardian' | 'mage' | 'vampire';

export interface SkillNode {
  id: string;
  branch: Branch;
  name: string;
  desc: string;
  /** Bậc trong nhánh, 0-based — bậc n cần tổng ≥ n×2 điểm đã tiêu trong nhánh. */
  row: number;
  maxLv: number;
  /** Chi phí điểm mỗi cấp. */
  cost: number;
  /** Hiệu ứng cộng dồn mỗi cấp. */
  effect: Partial<Record<StatKey, number>>;
}

export type StatKey =
  | 'atkMul' | 'hpMul' | 'crit' | 'cdmg' | 'aspd'
  | 'lifesteal' | 'dmgReduce' | 'rageRate' | 'splashPct';

export const BRANCHES: Record<Branch, { name: string; color: string; desc: string }> = {
  berserker: { name: 'Cuồng Chiến', color: '#ff3b52', desc: 'Sát thương thuần và tốc đánh.' },
  guardian:  { name: 'Hộ Vệ',       color: '#3fe0b0', desc: 'Máu, giảm sát thương, phản đòn.' },
  mage:      { name: 'Pháp Sư',     color: '#8cdcff', desc: 'Sát thương lan và Nộ Khí.' },
  vampire:   { name: 'Huyết Đạo',   color: '#b14bff', desc: 'Hút máu và sát thương theo máu đã mất.' },
};

export const NODES: SkillNode[] = [
  { id: 'br_atk',  branch: 'berserker', name: 'Cuồng Nhận', desc: '+3% sát thương mỗi cấp',
    row: 0, maxLv: 10, cost: 1, effect: { atkMul: 0.03 } },
  // … 5–6 node mỗi nhánh
];

/** Điểm kỹ năng nhận được: 1 điểm mỗi 5 cấp Kael. */
export const POINTS_PER_LEVEL = 5;
export const skillPointsTotal = (kaelLevel: number): number =>
  Math.floor(kaelLevel / POINTS_PER_LEVEL);
```

### Bước 2 — engine: state + gộp hiệu ứng

```ts
private skillLv: Record<string, number> = {};

/** Tổng hiệu ứng của cây — tính một lần trong recomputeParty(), không tính trong vòng lặp. */
private treeBonus: Partial<Record<StatKey, number>> = {};

private recomputeTree(): void {
  const b: Partial<Record<StatKey, number>> = {};
  for (const n of NODES) {
    const lv = this.skillLv[n.id] ?? 0;
    if (lv <= 0) continue;
    for (const [k, v] of Object.entries(n.effect)) {
      b[k as StatKey] = (b[k as StatKey] ?? 0) + v * lv;
    }
  }
  this.treeBonus = b;
}

private skillPointsSpent(): number {
  return NODES.reduce((s, n) => s + (this.skillLv[n.id] ?? 0) * n.cost, 0);
}
skillPointsLeft(): number {
  return skillPointsTotal(this.kaelLevel) - this.skillPointsSpent();
}
```

Cắm vào công thức, chỉ ba chỗ:

```ts
private kaelAtkValue(bonus = this.itemBonus()): number {
  return BAL.KAEL_ATK0 * … * (1 + (this.treeBonus.atkMul ?? 0));
}
private kaelHpValue(…): number  { return … * (1 + (this.treeBonus.hpMul ?? 0)); }
private kaelCrit(…): number     { return clamp(0.08 + … + (this.treeBonus.crit ?? 0), 0, BAL.CRIT_CAP); }
```

> **Giữ trần:** `crit` từ cây vẫn phải đi qua `BAL.CRIT_CAP`, `lifesteal` vẫn
> qua `BAL.LIFESTEAL_CAP`. Cây kỹ năng không được là cửa sau vượt trần — nếu
> không thì cả mục 1 vô nghĩa. Riêng `dmgReduce` nên clamp ở 0.4 (giảm tối đa
> 40% sát thương nhận), vì cộng dồn với `skinwall` là bất tử.

### Bước 3 — điều kiện mở & tẩy điểm

```ts
canLearn(id: string): boolean {
  const n = NODES.find((x) => x.id === id);
  if (!n) return false;
  if ((this.skillLv[id] ?? 0) >= n.maxLv) return false;
  if (this.skillPointsLeft() < n.cost) return false;
  const inBranch = NODES.filter((x) => x.branch === n.branch)
    .reduce((s, x) => s + (this.skillLv[x.id] ?? 0) * x.cost, 0);
  return inBranch >= n.row * 2;          // luật mở bậc
}

/** Tẩy điểm bằng Ngọc — giá tăng theo số lần để không thành chuyện làm hằng ngày. */
resetTree(): boolean {
  const cost = 2000 * Math.pow(2, this.treeResets);
  if (this.gems < cost) { this.toast('Không đủ Ngọc để tẩy điểm!', '#ff5a6a'); return false; }
  this.gems -= cost; this.treeResets += 1; this.skillLv = {};
  this.recomputeTree(); this.recomputeParty(); this.save(); this.pushMeta();
  return true;
}
```

Bước 4–5 (MetaInfo `SkillTreeInfo` + tab mới trong `KaelModal`, cạnh
`EvoTab`/`RuneTab`/`ProfileTab` ở `panels.tsx:1892`) theo đúng công thức 5 bước.

---

## B.5 — Gear Enhancement (đập đồ +1 → +10)

Đây là **gold sink** duy nhất thật sự trong game — hiện vàng chỉ dùng để nâng
cấp, mà nâng cấp thì có trần hữu dụng. Làm cái này sớm.

### Bước 1 — bảng số trong `data.ts`

```ts
/**
 * Mỗi bậc cường hoá cộng thẳng vào phần công của vũ khí.
 * `keep` = giữ nguyên bậc khi thất bại; `down` = tụt một bậc.
 * Từ +7 trở đi mới có rủi ro tụt bậc — trước đó chỉ mất vàng, để người chơi
 * kịp học luật chơi trước khi bị phạt.
 */
export interface EnhanceStep {
  lv: number;
  /** Tỉ lệ thành công. */
  rate: number;
  /** Thất bại thì tụt bậc? */
  down: boolean;
  /** Phần công cộng thêm (cộng dồn từ +1 tới bậc này). */
  atkPct: number;
}
export const ENHANCE: EnhanceStep[] = [
  { lv: 1,  rate: 1.00, down: false, atkPct: 0.05 },
  { lv: 2,  rate: 0.95, down: false, atkPct: 0.11 },
  { lv: 3,  rate: 0.90, down: false, atkPct: 0.18 },
  { lv: 4,  rate: 0.80, down: false, atkPct: 0.26 },
  { lv: 5,  rate: 0.70, down: false, atkPct: 0.36 },
  { lv: 6,  rate: 0.60, down: false, atkPct: 0.48 },
  { lv: 7,  rate: 0.45, down: true,  atkPct: 0.64 },
  { lv: 8,  rate: 0.32, down: true,  atkPct: 0.85 },
  { lv: 9,  rate: 0.20, down: true,  atkPct: 1.15 },
  { lv: 10, rate: 0.12, down: true,  atkPct: 1.60 },
];
export const MAX_ENHANCE = ENHANCE.length;

/** Giá đập từ `lv` lên `lv+1`, bám theo giá nâng cấp nên không lỗi thời ở tầng sâu. */
export function enhanceCostAt(lv: number, kaelLevel: number): number {
  return Math.ceil(upgradeCostAt(kaelLevel) * 8 * Math.pow(1.55, lv));
}
```

Kiểm tra gold sink: ở tầng ~40 (`kaelLevel` ~90), `upgradeCostAt(90) ≈ 48 ×
1.16^89`. Nhân 8 và 1.55^7 cho bậc +8 là khoảng **300 lần** giá một cấp nâng
cấp — đúng tầm "một buổi cày đổi một lần thử". Chỉnh hệ số `8` nếu muốn nới
hoặc siết; đừng chỉnh `1.55` vì nó quyết định độ dốc.

### Bước 2 — engine

```ts
private enhanceLv: Record<string, number> = {};

enhanceWeapon(id: string): { ok: boolean; from: number; to: number } {
  const lv = this.enhanceLv[id] ?? 0;
  if (lv >= MAX_ENHANCE) { this.toast('Đã tới bậc cường hoá cao nhất', '#ffd23c'); return { ok: false, from: lv, to: lv }; }
  const step = ENHANCE[lv];
  const cost = enhanceCostAt(lv, this.kaelLevel);
  if (this.gold < cost) { this.toast('Không đủ Vàng để cường hoá!', '#ff5a6a'); sfx.warn(); return { ok: false, from: lv, to: lv }; }

  this.gold -= cost;
  const ok = Math.random() < step.rate;
  const to = ok ? lv + 1 : (step.down ? Math.max(0, lv - 1) : lv);
  this.enhanceLv[id] = to;

  if (ok)            { this.ascendFx('#ffd23c', 1 + to * 0.2); sfx.levelup(); this.toast(`Cường hoá thành công → +${to}`, '#ffd23c'); }
  else if (step.down){ this.shake = 12; sfx.warn(); this.toast(`Xịt! Tụt xuống +${to}`, '#ff3b52'); }
  else               { sfx.warn(); this.toast(`Xịt — giữ nguyên +${to}`, '#ff9a3c'); }

  this.ctr.enhances += 1;
  this.recomputeParty(); this.checkAchievements(); this.save(); this.pushMeta();
  return { ok, from: lv, to };
}
```

Cắm vào sức mạnh: `weaponPct()` (`engine.ts:1290`) cộng thêm

```ts
const eLv = this.enhanceLv[id] ?? 0;
const ePct = eLv > 0 ? ENHANCE[eLv - 1].atkPct : 0;
return base * (1 + ePct);
```

### Bước 3 — chống ức chế

Ba chốt bắt buộc, thiếu cái nào là người chơi bỏ game chứ không phải ở lại:

1. **Bùa bảo hộ** — đổi bằng Huy Hiệu Tháp (`BADGE_OFFERS` trong `trials.ts`),
   dùng một cái thì thất bại không tụt bậc. Cho đây là *sink* thứ hai của Huy Hiệu.
2. **Cột mốc không tụt** — +5 là mốc sàn: từ +7 tụt xuống không bao giờ dưới +5.
   Cài bằng `Math.max(5, lv - 1)` khi `lv > 5`.
3. **Hiển thị tỉ lệ thật** trên nút bấm. Giấu tỉ lệ là cách nhanh nhất để mất
   niềm tin của người chơi.

### Bước 4–5 — giao diện

Thêm tab "CƯỜNG HOÁ" vào `WeaponModal` (`panels.tsx:1697`). Trên thẻ vũ khí
hiện `+N` bằng màu `WTIER[tier].color`, và trong `sprites.ts` có thể dùng
`weaponFx` sẵn có để vũ khí +7 trở lên phát sáng thêm.

---

## B.6 — Power Ceiling (trần sát thương mỗi tầng)

Chốt cuối chống one-shot boss, và là chỗ rẻ nhất trong cả tài liệu — khoảng
15 dòng.

Trong `applyEnemyDamage()` (`engine.ts:2034`), trước khi trừ máu:

```ts
/**
 * Một đòn không được ăn quá `DMG_CAP_PCT` máu tối đa của mục tiêu.
 * Không phải để làm khó: nó đảm bảo mọi trận boss đều kéo dài ít nhất
 * `1/DMG_CAP_PCT` đòn, nên hoạt ảnh, telegraph và chiêu boss luôn kịp diễn ra.
 * Quái thường không bị chặn — chặn cả quái thường thì cày trở nên rất bực.
 */
private capDamage(e: Enemy, dmg: number): number {
  if (!e.boss) return dmg;
  return Math.min(dmg, e.maxHp * BAL.DMG_CAP_PCT);
}
```

với `BAL.DMG_CAP_PCT: 0.08` (boss chịu tối thiểu ~13 đòn). Khi bị chặn, hiển
thị số sát thương bằng màu khác (ví dụ `#8fa3b8`) kèm chữ "CHẶN" — người chơi
phải hiểu vì sao con số nhỏ hơn mong đợi, nếu không họ tưởng game lỗi.

> Tuyệt kỹ (Nộ Khí) nên **miễn trừ** trần này, hoặc dùng trần riêng 25%. Nếu
> không, đòn kết liễu mất hết cảm giác đã tay và Nộ Khí thành vô dụng.

---

## B.7 — Achievements có thưởng Cosmetic

`achievements.ts` đã có sẵn, hiện chỉ trả Ngọc. Mở rộng phần thưởng:

### Bước 1 — kiểu phần thưởng

```ts
export type AchRewardKind = 'gem' | 'frame' | 'title' | 'aura';
export interface AchReward { kind: AchRewardKind; amount?: number; ref?: string }
```

`TITLES` (`data.ts:832`) đã có sẵn `frame` / `glow` / `ornament` và
`ProfileTab` (`panels.tsx:2109`) đã biết vẽ khung. Nghĩa là **hệ khung đã
xong** — chỉ cần cho phép mở khung bằng thành tựu thay vì chỉ bằng cấp:

```ts
export interface FrameDef {
  id: string; name: string; frame: string; glow: string; ornament: number;
  /** `level` = mở theo cấp (như hiện tại); `ach` = mở bằng thành tựu. */
  source: 'level' | 'ach';
}
```

### Bước 2 — engine

```ts
private ownedFrames = new Set<string>();
private equippedFrame = '';
private ownedTitles = new Set<string>();
private equippedTitle = '';
```

Trong `claimAch()` (`:1756`), rẽ nhánh theo `kind` thay vì chỉ cộng Ngọc.

### Bước 3 — hiệu ứng (`aura`)

`ChibiLook.aura` đã là một màu tự do và `skinFx` đã là bậc hiệu ứng 0–5. Một
thành tựu trả `aura` chỉ cần ghi đè `aura` trong `kaelLook()`:

```ts
private kaelLook(): ChibiLook {
  …
  const auraOverride = this.equippedAura ? AURA_DEFS[this.equippedAura] : null;
  return { …armed, aura: auraOverride?.color ?? evo.aura, … };
}
```

Không cần đụng tới `sprites.ts`. **Đây là điểm mạnh nhất của kiến trúc hiện
tại — tận dụng nó thay vì viết hệ cosmetic mới.**

---

## B.8 — Endless Tower + Leaderboard

### Phần chạy được ngay (không cần server)

`TRIALS` đang là 12 tầng cố định. Đổi thành vô tận bằng hàm sinh:

```ts
/** Tầng tháp thứ n (1-based) — 12 tầng đầu giữ nguyên bảng tay, từ 13 sinh theo công thức. */
export function trialFloorOf(n: number): TrialDef {
  if (n <= TRIALS.length) return TRIALS[n - 1];
  const over = n - TRIALS.length;
  return {
    id: n,
    name: `Tầng Vô Danh ${over}`,
    waves: Math.min(10, 6 + Math.floor(over / 8)),
    time: 180,
    power: 5.0 * Math.pow(1.18, over),
    refFloor: 120 + over * 4,
    // Luật bốc theo `n` nên tầng nào cũng cố định, ai chơi cũng gặp cùng luật.
    rules: pickRulesSeeded(n),
    badges: 40 + over * 3,
  };
}
```

Lưu `trialBest` (đã có) làm điểm số. Bảng xếp hạng cục bộ = lịch sử 10 lần
chạy tốt nhất lưu trong `localStorage` — đủ để có cảm giác "phá kỷ lục của
chính mình", và **không tốn một dòng hạ tầng nào**.

### Phần cần server

`@supabase/supabase-js` đã có trong `package.json`, nên đường ngắn nhất là:

```sql
create table leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 24),
  best_trial int not null check (best_trial between 0 and 999),
  best_floor int not null check (best_floor between 0 and 9999),
  mode text not null check (mode in ('normal','hard','nightmare')),
  updated_at timestamptz not null default now()
);
alter table leaderboard enable row level security;
create policy "read all"  on leaderboard for select using (true);
create policy "own write" on leaderboard for insert with check (auth.uid() is not null);
```

**Cảnh báo bắt buộc đọc:** game chạy 100% ở client và bản lưu nằm trong
`localStorage`. Bất kỳ ai mở DevTools cũng sửa được `trialBest` thành 9999.
Ba lựa chọn, chọn một và chấp nhận hệ quả:

1. **Bảng xếp hạng "vui thôi"** — ghi rõ là không chống gian lận. Rẻ, trung thực.
2. **Ghi lại replay** (seed + chuỗi hành động) rồi cho server chạy lại engine
   để xác thực. Đúng đắn nhưng đắt: engine phải tách được phần thuần logic ra
   khỏi phần vẽ, và phải tất định (bỏ hết `Math.random()` trần trụi, thay bằng
   RNG có seed).
3. **Chuyển toàn bộ mô phỏng chiến đấu lên server.** Đúng nhất, và là một dự
   án khác hẳn dự án này.

Khuyến nghị: **chọn (1)** cho bản đầu, và nếu sau này thật sự cần thì làm (2)
— nhưng hãy chuyển sang RNG có seed **ngay từ bây giờ**, vì càng để lâu càng
khó gỡ.

---

## B.9 — Bang hội (Guild)

Đây là hạng mục **duy nhất trong danh sách không làm được bằng client**. Guild
Boss cần trạng thái chia sẻ giữa nhiều người chơi theo thời gian thực; Guild
Shop cần một loại tiền mà server phát ra.

Phạm vi tối thiểu chạy được, theo thứ tự:

1. **Bảng** `guilds(id, name, tag, owner, created_at)`,
   `guild_members(guild_id, user_id, role, contribution)`,
   `guild_boss(guild_id, boss_id, hp_left, ends_at)`.
2. **Guild Boss** — không mô phỏng chiến đấu trên server. Client đánh boss cục
   bộ trong 60 giây, gửi lên tổng sát thương, server dùng
   `rpc('damage_guild_boss', { amount })` để trừ máu **theo giao dịch nguyên
   tử** (đừng dùng `select` rồi `update`: hai người đánh cùng lúc sẽ ghi đè nhau).
   Kẹp `amount` theo lực chiến gần nhất mà server biết, nếu không một người
   giết boss trong một lần gửi.
3. **Guild Shop** — tiền `guild_coin` do server cộng khi boss chết, chia theo
   `contribution`. Hàng bán: Bùa bảo hộ cường hoá (B.5), Mảnh Trang Phục,
   Huy Hiệu. **Đừng bán chỉ số** — nếu bang hội bán sức mạnh thì người chơi
   đơn lẻ bị bỏ lại và mục 1 (cân bằng) sụp.

**Ước lượng thật:** phần này tốn nhiều thời gian hơn tất cả các mục B.1–B.8
cộng lại. Nếu mục tiêu là giữ chân, hãy làm B.1 → B.5 → B.3 → B.7 trước và
đo lại số liệu; guild chỉ đáng làm khi đã có lượng người chơi đủ để một bang
hội không rỗng.

---

## B.10 — Season Pass

**Đã có sẵn 90%**: Huyết Lệnh trong `quests.ts` chính là season pass — 40 bậc,
Ấn Điểm, reset theo tháng (`edictCycle`). Chỉ thiếu nhánh trả phí.

### Bước 1 — hai làn thưởng

```ts
export interface EdictTier {
  level: number;
  free: EdictReward[];
  /** Chỉ nhận được khi đã mở Huyết Lệnh Cao Cấp. */
  premium: EdictReward[];
}
```

### Bước 2 — engine

```ts
private edictPremium = false;   // theo chu kỳ, reset cùng edictCycle
private edictClaimedPremium: number[] = [];
```

Trong hàm đồng bộ chu kỳ, khi `edictCycle` đổi thì đặt lại **cả ba** field
(`edictPremium`, `edictClaimed`, `edictClaimedPremium`). Quên một cái là người
chơi tháng sau nhận lại được quà tháng trước.

### Bước 3 — mở khoá bằng gì

Game không có thanh toán. Hai lựa chọn giữ được ý nghĩa:

- **Ngọc** — ví dụ 12.000 Ngọc, đắt ngang một bộ skin Cửa Hàng. Ngọc đến từ
  cày và điểm danh, nên đây vẫn là phần thưởng cho sự bền bỉ.
- **Huy Hiệu Tháp** — nếu muốn nó là bằng chứng của kỹ năng chứ không phải
  của thời gian.

Khuyến nghị dùng Ngọc, và **hiển thị phần thưởng premium ngay từ đầu ở trạng
thái mờ**. Người chơi nhìn thấy thứ mình đang bỏ lỡ mới là động lực; giấu đi
thì cả cơ chế vô hình.

---

## Thứ tự triển khai đề xuất

| # | Hạng mục | Công sức | Tác động giữ chân | Ghi chú |
|---|---|---|---|---|
| 1 | Mục 1 — cân bằng | ✅ xong | Cao | Nền của mọi thứ còn lại |
| 2 | B.1 Difficulty tiers | Thấp | Cao | 80% đã có sẵn |
| 3 | B.6 Power ceiling | Rất thấp | Trung bình | ~15 dòng |
| 4 | B.5 Gear enhancement | Trung bình | **Rất cao** | Gold sink duy nhất |
| 5 | B.2 Elite & Danger zone | Trung bình | Cao | Phá nhịp cày đều đều |
| 6 | B.3 Daily challenges | Trung bình | **Rất cao** | Lý do vào game mỗi ngày |
| 7 | B.7 Achievements cosmetic | Thấp | Trung bình | Hạ tầng khung/aura đã có |
| 8 | B.4 Skill tree | Cao | Cao | Cẩn thận đừng vượt trần mục 1 |
| 9 | B.10 Season pass premium | Thấp | Trung bình | Mở rộng Huyết Lệnh |
| 10 | B.8 Endless tower (cục bộ) | Trung bình | Trung bình | Leaderboard để sau |
| 11 | B.8 Leaderboard (server) | Cao | Thấp khi ít người | Cần chốt phương án chống gian lận |
| 12 | B.9 Guild | **Rất cao** | Cao khi đông người | Chỉ làm khi đã có người chơi |

### Ba việc nên làm song song với mọi thay đổi trên

1. **Thay `Math.random()` bằng RNG có seed** trong phần logic chiến đấu. Nó là
   điều kiện tiên quyết của replay, của kiểm thử tự động, và của mọi hình thức
   chống gian lận sau này.
2. **Tách một file `src/game/balance.test.ts`** (hoặc một script như
   `scripts/balance.mjs`) mô phỏng TTK theo tầng như bảng ở mục A.2. Mỗi lần
   chỉnh số chạy lại một lệnh là biết ngay có làm vỡ tầng nào không.
3. **Nâng số phiên bản bản lưu** (`v: 4` trong `save()`) mỗi khi đổi ý nghĩa
   một field cũ, và viết nhánh di trú trong `load()`. Bản lưu hỏng là cách
   nhanh nhất để mất một người chơi đã gắn bó.
