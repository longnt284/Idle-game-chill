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
| `src/game/sprites.ts` | Dựng nhân vật bằng hệ xương khớp: tư thế là hàm thuần của `AnimState`. Hành động dùng chuỗi khung khoá (`MELEE_TRACK`, `CAST_TRACK`) nội suy liên tục — đừng quay lại kiểu cộng chồng nhiều pha, nó gây gãy khúc ở chỗ nối. |
| `src/game/scene.ts` | Bối cảnh thủ tục: 9 lớp parallax, 10 vùng, ánh sáng đuốc, thời tiết. |
| `src/game/color.ts` | Phép biến đổi màu có ghi nhớ (renderer gọi hàng trăm lần mỗi khung hình). |
| `src/game/types.ts` | Kiểu dùng chung giữa engine và renderer. |
| `src/game/audio.ts` | Âm thanh tổng hợp bằng Web Audio, nền đổi cao độ theo vùng. |
| `src/ui/` | Lớp giao diện React đặt trong hệ toạ độ 960×540 rồi phóng theo khung. |

## Các hệ thống chính

| Hệ thống | Nơi định nghĩa | Ghi chú |
| --- | --- | --- |
| **Tiến Hoá** | `EVOLUTIONS` trong `data.ts` | Mỗi 50 cấp Kael đổi hình hài và mở thêm một chiêu **giữ vĩnh viễn**. Chiêu cũ vẫn cộng dồn, nên `HeroUnit.skills` là mảng chứ không phải một giá trị. |
| **Ngọc Huyết** | `RUNES` trong `data.ts` | Sáu loại khảm nâng chỉ số riêng cho Kael, mua bằng Ngọc. Đây là nơi tiêu Ngọc thứ hai ngoài Triệu Hồi. |
| **Vũ khí** | `WEAPONS` trong `data.ts` | 6 loại × 5 bậc. Gom đủ `WEAPON_MERGE` bản trùng thì lột xác lên bậc trên cùng loại, và phép ghép chạy lan truyền. Ở bậc cao nhất, bản trùng đổi thành tinh luyện. |
| **Danh hiệu** | `TITLES` trong `data.ts` | Mười bậc, mỗi 100 cấp một bậc; đổi khung hồ sơ và danh xưng, không đụng chỉ số. |
| **Thăng Hoa** | `BAL.SEAL_*` | Đổi độ sâu lấy hệ số nhân vĩnh viễn. |

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

Renderer cố tình tránh `ctx.filter` và `ctx.shadowBlur` — hai thứ này buộc
trình duyệt dựng thêm lớp đệm cho từng lần gọi và kéo tốc độ khung xuống dưới
5 fps trên máy không có GPU. Quầng sáng dùng vòng tròn alpha chồng nhau thay
thế. Engine còn tự hạ mức chi tiết (`quality` 0–2) khi thời gian khung hình
trung bình vượt ngưỡng.
