# Huyết Kiếm Ca — Idle Dungeon RPG

Game idle tự động chiến đấu: Kael và đoàn quân đi xuống 100 tầng hầm ngục,
37 tướng quỷ, 72 đồng hành có thể chiêu mộ. Chạy hoàn toàn trên trình duyệt,
không cần máy chủ, tiến trình lưu trong `localStorage`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

## Cấu trúc mã nguồn

| Tệp | Vai trò |
| --- | --- |
| `src/game/data.ts` | Toàn bộ dữ liệu tĩnh và **hằng số cân bằng** (`BAL`). Mọi con số ảnh hưởng tới độ khó nằm ở đây. |
| `src/game/engine.ts` | Vòng lặp trò chơi, chiến đấu, kinh tế, lưu/tải. Không chứa mã vẽ nhân vật. |
| `src/game/sprites.ts` | Dựng nhân vật bằng hệ xương khớp: tư thế là hàm thuần của `AnimState`. Chất liệu vũ khí = bậc rèn (quyết định CÓ những lớp nào) phủ lên bảng màu skin (quyết định lớp đó MÀU GÌ) — tách hai trục nên một bộ skin dùng được với mọi bậc. Hành động dùng chuỗi khung khoá (`MELEE_TRACK`, `CAST_TRACK`) nội suy liên tục — đừng quay lại kiểu cộng chồng nhiều pha, nó gây gãy khúc ở chỗ nối. |
| `src/game/scene.ts` | Bối cảnh thủ tục: 9 lớp parallax, 10 vùng, ánh sáng đuốc, thời tiết. |
| `src/game/color.ts` | Phép biến đổi màu có ghi nhớ (renderer gọi hàng trăm lần mỗi khung hình). |
| `src/game/daily.ts` | Lịch điểm danh 30 ô và cách quy đổi từng loại phần thưởng. |
| `src/game/quests.ts` | Nhiệm vụ ngày/tuần và đường mùa giải Huyết Lệnh. Nhiệm vụ **không có bộ đếm riêng**: mỗi ô ghi mốc bộ đếm lúc sinh ra, tiến độ là hiệu số. |
| `src/game/synergy.ts` | Liên Kết đội hình — buff theo môn phái và vai trò, chỉ đếm 12 người đứng trên sân. |
| `src/game/relics.ts` | Cây Di Tích: lớp meta thứ hai nằm trên Thăng Hoa, tiêu Mảnh Linh Hồn. |
| `src/game/trials.ts` | Tháp Thử Thách: 12 tầng boss-rush kèm luật riêng, và bảng đổi Huy Hiệu. |
| `src/game/expedition.ts` | Phái Đoàn: cử đồng hành dự bị đi 4/8/24 giờ đổi lấy tài nguyên. |
| `src/game/achievements.ts` | 500 mốc thành tựu, sinh từ 26 chỉ số × bảng ngưỡng. |
| `src/game/types.ts` | Kiểu dùng chung giữa engine và renderer. |
| `src/game/audio.ts` | Âm thanh tổng hợp bằng Web Audio, nền đổi cao độ theo vùng. |
| `src/ui/` | Lớp giao diện React đặt trong hệ toạ độ 960×540 rồi phóng theo khung. |

## Các hệ thống chính

| Hệ thống | Nơi định nghĩa | Ghi chú |
| --- | --- | --- |
| **Tiến Hoá** | `EVOLUTIONS` trong `data.ts` | Mỗi 50 cấp Kael đổi hình hài và mở thêm một chiêu **giữ vĩnh viễn**. Chiêu cũ vẫn cộng dồn, nên `HeroUnit.skills` là mảng chứ không phải một giá trị. |
| **Ngọc Huyết** | `RUNES` trong `data.ts` | Sáu loại khảm nâng chỉ số riêng cho Kael, mua bằng Ngọc. Đây là nơi tiêu Ngọc thứ hai ngoài Triệu Hồi. |
| **Vũ khí** | `WEAPONS` trong `data.ts` | 6 loại × **10 bậc** (`WTIER_ORDER`, tách hẳn khỏi `Rarity` của đồng hành). Gom đủ `WEAPON_MERGE` bản trùng thì lột xác lên bậc trên cùng loại, và phép ghép chạy lan truyền. Ở bậc cao nhất, bản trùng đổi thành tinh luyện. |
| **Độ khó** | `DUNGEON_MODES` trong `data.ts` | Hard/Evil mở sau khi dọn trọn 100 tầng, **chỉ có hiệu lực trong Vực Vô Tận**. Quái ×2 / ×2.5, thưởng ×0.9 / ×0.8, Ấn Điểm ×1.8 / ×2.6. |
| **Cửa Hàng** | `SHOP_ITEMS` trong `data.ts` | Bốn trang phục Kael và bốn skin vũ khí, trả bằng **cả Vàng lẫn Ngọc** trong một giao dịch. Trường `fx` (1–4) là bậc hiệu ứng mà renderer chồng thêm. Hai món đắt nhất khoá sau mốc dọn một tầng ở Evil. |
| **Huyết Lệnh** | `quests.ts` | 4 ô nhiệm vụ ngày + 3 ô tuần nuôi đường mùa giải 40 bậc, reset cùng chu kỳ tháng với lịch điểm danh. |
| **Liên Kết** | `SYNERGIES` trong `synergy.ts` | Buff khi xếp nhiều đồng hành cùng môn phái/vai trò. Chỉ đếm **12 người trên sân**, không đếm đội tiếp viện — đếm cả 50 thì mọi liên kết bật sẵn và cơ chế thành buff miễn phí. |
| **Cây Di Tích** | `RELICS` trong `relics.ts` | 12 nút có nhánh phụ thuộc, tiêu Mảnh Linh Hồn nhận khi Thăng Hoa. Mọi hiệu ứng là **cộng thêm vào công thức có sẵn**; nút nào cần sửa `BAL` là nút đó đã sai chỗ. Đây cũng là nơi nới trần ngoại tuyến 8 → 24 giờ. |
| **Tháp Thử Thách** | `TRIALS` trong `trials.ts` | 12 tầng boss-rush có đồng hồ và **không hồi sinh** — nơi duy nhất trong game có thể thua. Mỗi tầng bật một luật vô hiệu hoá một cách chơi quen thuộc. Trả Huy Hiệu, và Huy Hiệu không đổi qua lại với Vàng/Ngọc. |
| **Phái Đoàn** | `EXPEDITION_ROUTES` trong `expedition.ts` | Cử đồng hành đi 4/8/24 giờ. Người đi bị **rút khỏi đội hình** cho tới khi về — không có cái giá đó thì đây chỉ là nút bấm cho tài nguyên miễn phí. |
| **Danh hiệu** | `TITLES` trong `data.ts` | Mười bậc, mỗi 100 cấp một bậc; đổi khung hồ sơ và danh xưng, không đụng chỉ số. |
| **Thăng Hoa** | `BAL.SEAL_*` | Đổi độ sâu lấy hệ số nhân vĩnh viễn. |
| **Điểm Danh** | `DAILY_CALENDAR` trong `daily.ts` | Lịch 30 ô, reset đầu mỗi tháng dương lịch. Ô mở theo **thứ tự lần điểm danh** trong tháng, không theo ngày trong tháng, nên bỏ lỡ một ngày chỉ làm chậm lịch chứ không đốt mất phần thưởng. |
| **Trang phục ghép mảnh** | `LOGIN_SKINS`, `SKIN_SHARD_COST` | Sáu bộ **chỉ** đổi được bằng Mảnh Trang Phục từ điểm danh. `rollOne` quay trên `GACHA_SKINS` và `buySkin` chặn nguồn `login` — hai chốt này giữ cho việc quay lại mỗi ngày còn giá trị. |
| **Thành tựu** | `CATS` trong `achievements.ts` | 500 mốc = 26 chỉ số × bảng ngưỡng, thưởng Ngọc theo bậc. `checkAchievements()` quét toàn bộ mỗi 2 giây thay vì rải kiểm tra vào từng điểm cộng — rẻ, và không thể treo mốc. |

Bốn bất biến của các hệ thống trên, phá là hỏng thiết kế:

1. `DAILY_CLOTH_TOTAL === SKIN_SHARD_COST` — đi đủ một tháng ghép được đúng
   một bộ, không sớm hơn một ngày nào. `daily.ts` tự cảnh báo nếu lệch.
2. Mọi đường cộng Vàng/Ngọc đi qua `addGold` / `addGems` trong engine. Cộng
   thẳng vào `this.gold` / `this.gems` sẽ làm bộ đếm thành tựu lệch vĩnh viễn.
3. `load()` phải chốt lại mốc nhiệm vụ khi bản lưu chưa có khối `quests`.
   Giao diện gọi `getMeta()` một lần **trước** khi bản lưu được nạp, nên
   `syncQuests()` lúc đó chốt mốc theo bộ đếm rỗng; không xoá khoá ngày để
   chốt lại thì mọi ô nhiệm vụ xong ngay khi vào game.
4. Ba bậc vũ khí chót không nằm trong `WEAPON_ROLL_TABLE`. Cho chúng rơi
   thẳng từ lò rèn là xoá sổ ý nghĩa của hệ ghép mảnh.
5. Thưởng ngoại tuyến chỉ được **tính** trong `load()`, phần **cộng** nằm ở
   `claimOffline()`. Hàm đó tự chốt `pendingOffline = null` ngay đầu: bảng
   tổng kết có ba đường đóng và cả ba đều gọi vào nó.
6. Lượt Tháp đang chạy KHÔNG được lưu. Nó phụ thuộc vào trạng thái sân (máu
   từng đơn vị, quái đang đứng đâu) mà bản lưu không giữ; lưu mỗi đồng hồ
   đếm ngược sẽ cho một lượt tháp không thể thắng.
7. `Mảnh Linh Hồn` tỉ lệ với **số Huyết Ấn vừa nhận**, không phải số lần
   Thăng Hoa. Trả theo số lần thì cách chơi tối ưu là Thăng Hoa liên tục ở
   tầng 25 và toàn bộ động lực đi sâu biến mất.

Sát thương chủ yếu đến từ Kael: đồng hành chỉ còn `BAL.COMPANION_POWER` (25%)
sức mạnh gốc, bù lại chỉ số nền của Kael cao hơn nhiều và còn được nhân thêm
bởi Tiến Hoá, Ngọc Huyết và vũ khí.

## Nguyên tắc cân bằng

Sức mạnh người chơi mua bằng vàng tăng theo:

```
growthPerWave = GOLD_RATE ^ ( ln(LEVEL_POWER) / ln(UP_COST_RATE) )
```

`FOE_HP_RATE` được chọn khớp con số đó cộng một biên nhỏ; phần chênh lệch do
các nguồn nhân khác bù vào (cấp thưởng khi hạ boss, trang bị, vũ khí theo tỉ
lệ, và hệ số Huyết Ấn từ Thăng Hoa). Đổi bất kỳ hằng số nào trong `BAL` thì
phải kiểm tra lại quan hệ trên, nếu không sẽ sinh ra tường chắn hoặc lạm phát.

## Hiệu năng

Chuyến Phái Đoàn tự bốc **đội dự bị mạnh nhất** (những người ngoài 12 chỗ
trên sân) chứ không bốc người yếu nhất: bốc yếu nhất là cách hiển nhiên hơn
nhưng lần nào cũng cho ra chuyến tệ nhất, và một mặc định mà lần nào người
chơi cũng phải sửa là một mặc định sai.

Buff tốc đánh của chuỗi Liên Trảm nhân thẳng vào thời gian hồi đòn
(`comboHaste`), không gọi `recomputeParty()`: chuỗi đổi mỗi lần hạ quái, dựng
lại toàn đội mỗi lần thì vừa tốn vừa làm mất máu và vị trí đang có.

Lưu ảnh khi ra đòn (`drawAfterimage`) chỉ vẽ bộ xương bằng nét dày trong
suốt chứ không dựng lại toàn thân — rẻ hơn nhiều lần, và vì lấy mẫu cùng
`solvePose` nên bóng luôn khớp tuyệt đối với thân thật.

Quầng sáng của vũ khí bậc cao tăng **độ sáng** chứ không tăng bán kính: để
bán kính nở tự do theo bậc thì ở bậc chót nó thành một đĩa sáng lơ lửng và
mất hẳn hình lưỡi kiếm.

Renderer cố tình tránh `ctx.filter` và `ctx.shadowBlur` — hai thứ này buộc
trình duyệt dựng thêm lớp đệm cho từng lần gọi và kéo tốc độ khung xuống dưới
5 fps trên máy không có GPU. Quầng sáng dùng vòng tròn alpha chồng nhau thay
thế. Engine còn tự hạ mức chi tiết (`quality` 0–2) khi thời gian khung hình
trung bình vượt ngưỡng.
