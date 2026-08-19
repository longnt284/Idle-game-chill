export const IMG = {
  title: 'https://image.qwenlm.ai/generated-images/1765ae4e-f443-4160-8e6a-200cf7e99778/_result.png',
  floor1: 'https://image.qwenlm.ai/generated-images/75bb1338-62b4-4cd4-b6ab-3b082d1d9b5a/_result.png',
  floor2: 'https://image.qwenlm.ai/generated-images/b68a8200-2733-4e05-857c-98586a9f42f9/_result.png',
  floor3: 'https://image.qwenlm.ai/generated-images/c5306593-514c-483a-94c1-b5bb77ae5465/_result.png',
  dawn: 'https://image.qwenlm.ai/generated-images/2128a404-9ec8-49e9-bf02-406ec5d51653/_result.png',
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
      'Giữa đêm nguyệt thực đỏ như máu, Đoàn Kiếm Ưng — mái nhà duy nhất của Kael — bị dâng lên làm vật tế. Trên cổ anh bị khắc Dấu Ấn Hi Sinh, vết thương rỉ máu mỗi đêm, gọi bầy quỷ đến đòi mạng. Cây cự kiếm "Trảm Long" trở thành cánh tay còn lại của anh.',
      'Nhưng lần này Kael không đơn độc. Dưới đáy Hầm Ngục Vĩnh Cửu, những linh hồn đồng điệu — kẻ mất nhà, người mất tên — tụ về dưới lá cờ Huyết Kiếm. Cùng nhau, họ đi xuống. Ba tầng sâu. Ba kẻ canh cửa. Muốn báo thù, phải chém. Muốn sống sót, phải có nhau.',
    ],
  },
  {
    kicker: 'TẦNG I — CỔNG XƯƠNG',
    title: 'Kẻ Chặn Đường Cũ',
    img: IMG.floor1,
    accent: '#ff9a3c',
    panels: [
      'Cổng hầm ngục dựng bằng xương của chính những kẻ từng muốn bước vào đây. Đám xác sống mặc giáp rỉ canh giữ từng bậc thang, mắt cháy lên thứ ánh sáng vay mượn từ địa ngục.',
      'Sau lớp cổng thép là Morgrim — kẻ từng kề vai chiến đấu với Kael, nay bị nhốt trong bộ giáp khổng lồ rực màu tro tàn. Hắn chặn mọi lối xuống tầng sâu. Vậy thì mở đường bằng kiếm — và bằng cả những người bạn mới kề vai. Ân nghĩa cũ, trả hết trong một nhát.',
    ],
  },
  {
    kicker: 'TẦNG II — HẦM MÁU',
    title: 'Dạ Dày Của Địa Ngục',
    img: IMG.floor2,
    accent: '#8dff9a',
    panels: [
      'Morgrim gục xuống, lời thì thào cuối cùng: "...chạy đi... ả ta đói..." Cầu thang xoắn ốc mở ra tầng dưới, mùi máu tươi xộc lên như tường thành.',
      'Nơi đây là dạ dày của hầm ngục — máu nhỏ từ trần đá như cơn mưa ngược. Ishvara, Sứ Đồ Đói Khát, đã nuốt trọn cả một thành phố mà vẫn chưa no. Ả nhận ra Dấu Ấn trên cổ Kael... và thèm khát nó hơn mọi linh hồn. Cả đội siết chặt vũ khí: trận này không ai được gục ngã.',
    ],
  },
  {
    kicker: 'TẦNG III — ĐIỆN THỰC NHẬT',
    title: 'Ngai Vàng Trong Bóng Tối',
    img: IMG.floor3,
    accent: '#c9b8ff',
    panels: [
      'Ishvara tan thành vũng máu đen. Trong bụng ả, Kael tìm thấy nửa tấm huy hiệu của Đoàn Kiếm Ưng — và một cái tên được khắc bằng móng tay lên xương: VÔ DIỆN. Tầng cuối không có cửa, chỉ có vòm trời giả nơi nguyệt thực treo vĩnh viễn như một con ngươi mở trừng.',
      'Giữa điện thờ treo ngược, Vô Diện Thần — Bàn Tay Trái của Chúa Trời — xoay chiếc cổ không xương về phía Kael: "Ngươi đến đúng hẹn, kẻ mang dấu ấn. Và ngươi còn mang theo cả những linh hồn ngon lành khác." Nguyệt thực giãn nở. Trận cuối cùng bắt đầu — và lần này, Kael không chiến đấu một mình.',
    ],
  },
];

export const ENDING = {
  kicker: 'CHƯƠNG CUỐI',
  title: 'Bình Minh Đầu Tiên',
  text: [
    'Thần tan rã như tro trước gió. Nguyệt thực khép lại, và ánh sáng thật sự rơi xuống đáy sâu lần đầu tiên sau trăm năm.',
    'Vết thương trên cổ vẫn cháy — có những món nợ không bao giờ được xóa. Nhưng xung quanh Kael giờ là những gương mặt đồng hành, những người đã cùng anh đi qua ba tầng địa ngục. Hận thù không phải là nhà, nó chỉ là con đường. Và con đường thì dễ đi hơn khi có bạn.',
    'Cả đội lau vũ khí, khoác vai nhau bước về phía ánh sáng đầu tiên. Cuộc săn vẫn còn dài — nhưng kẻ mang dấu ấn không còn bước đi đơn độc nữa.',
  ],
};

export const DEATH_QUOTE =
  'Đội ngũ gục ngã trước bóng tối... Nhưng dấu ấn vẫn nóng — báo thù chưa trọn. Hãy triệu hồi thêm đồng hành, nâng cấp sức mạnh, và quay lại mạnh mẽ hơn.';
