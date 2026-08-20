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
| `src/game/sprites.ts` | Dựng nhân vật bằng hệ xương khớp: tư thế là hàm thuần của `AnimState`. |
| `src/game/scene.ts` | Bối cảnh thủ tục: 9 lớp parallax, 10 vùng, ánh sáng đuốc, thời tiết. |
| `src/game/color.ts` | Phép biến đổi màu có ghi nhớ (renderer gọi hàng trăm lần mỗi khung hình). |
| `src/game/types.ts` | Kiểu dùng chung giữa engine và renderer. |
| `src/game/audio.ts` | Âm thanh tổng hợp bằng Web Audio, nền đổi cao độ theo vùng. |
| `src/ui/` | Lớp giao diện React đặt trong hệ toạ độ 960×540 rồi phóng theo khung. |

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
