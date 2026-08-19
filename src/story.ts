export const IMG = {
  title: 'https://image.qwenlm.ai/generated-images/be489786-ae9f-430f-a68a-844462ee3701/_result.png',
  floor1: 'https://image.qwenlm.ai/generated-images/35ea13cd-7888-4650-b14e-3092d6c766fd/_result.png',
  floor2: 'https://image.qwenlm.ai/generated-images/4f295af4-c95e-4df0-a79d-9b172d63d6e5/_result.png',
  floor3: 'https://image.qwenlm.ai/generated-images/dc8641d6-552d-4aee-88f2-151d6abd1c93/_result.png',
  dawn: 'https://image.qwenlm.ai/generated-images/a8e9014e-233e-49e4-8fff-2097100323bf/_result.png',
};

export interface StoryChapter {
  kicker: string;
  title: string;
  img: string;
  accent: string;
  panels: string[];
}

export const CHAPTERS: StoryChapter[] = [
  {
    kicker: 'ĐÊM THỰC NHẬT',
    title: 'Lời Thề Dưới Trăng Máu',
    img: IMG.title,
    accent: '#ff3b52',
    panels: [
      'Giữa đêm nguyệt thực đỏ như máu, Đoàn Kiếm Ưng — mái nhà duy nhất của Kael — bị dâng lên làm vật tế. Đồng đội bị xé xác trước mắt anh. Morgrim, người anh em kết nghĩa, quỳ dưới chân Thần Bàn Tay và trở thành con rối của hắn. Trên cổ Kael bị khắc Dấu Ấn Hi Sinh — vết thương rỉ máu mỗi đêm, gọi bầy quỷ đến đòi mạng.',
      'Kael không chết. Cây cự kiếm "Trảm Long" — khối sắt nặng hơn cả một mạng người — trở thành cánh tay còn lại của anh. Dưới đáy thành phố chết là Hầm Ngục Vĩnh Cửu, nơi Thần Bàn Tay ngủ giữa muôn tầng xương. Muốn báo thù, phải đi xuống. Muốn sống sót, phải chém. Không còn con đường thứ ba.',
      'Ba tầng sâu. Ba kẻ canh cửa. Một ngai vàng trong bóng tối. Kiếm đã tuốt, dấu ấn đang nóng rực như than. Cửa hầm ngục nuốt lấy ánh trăng — và nuốt luôn cả lối về.',
    ],
  },
  {
    kicker: 'TẦNG I — CỔNG XƯƠNG',
    title: 'Kẻ Chặn Đường Cũ',
    img: IMG.floor1,
    accent: '#ff9a3c',
    panels: [
      'Cổng hầm ngục được dựng bằng xương của chính những kẻ từng muốn bước vào đây. Đám xác sống mặc giáp rỉ canh giữ từng bậc thang, mắt chúng cháy lên thứ ánh sáng vay mượn từ địa ngục.',
      'Sau lớp cổng thép là Morgrim — kẻ từng kề vai chiến đấu, nay bị nhốt trong bộ giáp khổng lồ, đôi mắt sau khe visor rực màu tro tàn. Hắn chặn mọi lối xuống tầng sâu. Vậy thì mở đường bằng kiếm. Ân nghĩa cũ, trả hết trong một nhát.',
    ],
  },
  {
    kicker: 'TẦNG II — HẦM MÁU',
    title: 'Dạ Dày Của Địa Ngục',
    img: IMG.floor2,
    accent: '#8dff9a',
    panels: [
      'Morgrim gục xuống. Dưới lớp giáp chỉ còn là một cái xác khô, và lời thì thào cuối cùng: "...chạy đi... ả ta đói..." Cầu thang xoắn ốc mở ra tầng dưới, mùi máu tươi xộc lên như tường thành.',
      'Nơi đây là dạ dày của hầm ngục — máu nhỏ từ trần đá như cơn mưa ngược. Ishvara, Sứ Đồ Đói Khát, đã nuốt trọn cả một thành phố mà vẫn chưa no. Ả nhận ra Dấu Ấn trên cổ Kael... và thèm khát nó hơn mọi linh hồn từng nếm.',
    ],
  },
  {
    kicker: 'TẦNG III — ĐIỆN THỰC NHẬT',
    title: 'Ngai Vàng Trong Bóng Tối',
    img: IMG.floor3,
    accent: '#c9b8ff',
    panels: [
      'Ishvara tan thành vũng máu đen. Trong bụng ả, Kael tìm thấy nửa tấm huy hiệu của Đoàn Kiếm Ưng — và một cái tên được khắc bằng móng tay lên xương: VÔ DIỆN. Tầng cuối cùng không có cửa. Chỉ có một vòm trời giả, nơi nguyệt thực treo đó vĩnh viễn như một con ngươi mở trừng.',
      'Giữa điện thờ treo ngược, Vô Diện Thần — Bàn Tay Trái của Chúa Trời — xoay chiếc cổ không xương về phía Kael, đôi mắt trắng dã cong lên thành nụ cười. "Ngươi đến đúng hẹn, kẻ mang dấu ấn. Linh hồn ngươi đã được định giá từ đêm ấy." Nguyệt thực giãn nở. Trận cuối cùng bắt đầu.',
    ],
  },
];

export const ENDING = {
  kicker: 'CHƯƠNG CUỐI',
  title: 'Bình Minh Đầu Tiên',
  text: [
    'Thần tan rã như tro trước gió. Những tầng hầm ngục rung chuyển rồi lặng im — lần đầu tiên sau trăm năm, nguyệt thực khép lại, và ánh sáng thật sự rơi xuống đáy sâu.',
    'Vết thương trên cổ vẫn cháy. Dấu ấn không biến mất — có những món nợ không bao giờ được xóa. Nhưng Kael hiểu ra một điều giữa đống tro tàn: hận thù không phải là nhà, nó chỉ là con đường.',
    'Anh lau lưỡi cự kiếm, vác nó lên vai, và bước về phía ánh sáng đầu tiên. Cuộc săn vẫn còn dài. Và kẻ mang dấu ấn thì không bao giờ dừng chân.',
  ],
};

export const DEATH_QUOTE =
  'Máu loang trên đá lạnh, tiếng quỷ cười xa dần... Nhưng dấu ấn vẫn nóng — báo thù chưa trọn, kẻ chết không được phép nằm yên.';

export const CONTROLS: { keys: string[]; label: string }[] = [
  { keys: ['A', 'D'], label: 'Di chuyển' },
  { keys: ['W', 'SPACE'], label: 'Nhảy' },
  { keys: ['J', 'CHUỘT TRÁI'], label: 'Chém — combo 3 thức' },
  { keys: ['K', 'CHUỘT PHẢI'], label: 'Trọng kích (hất tung)' },
  { keys: ['SHIFT'], label: 'Né lăn — miễn nhiễm ngắn' },
  { keys: ['Q'], label: 'Cuồng Nộ — khi thanh nộ đầy' },
  { keys: ['P', 'ESC'], label: 'Tạm dừng' },
  { keys: ['M'], label: 'Bật / tắt tiếng' },
];
