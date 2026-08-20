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
      'Giữa đêm nguyệt thực, Đoàn Kiếm Ưng bị dâng làm vật tế cho Thần Bàn Tay. Đồng đội ngã xuống, Morgrim — người anh em kết nghĩa — quỳ gối nhận phong ấn phản bội. Trên cổ Kael bị khắc Dấu Ấn Hi Sinh, rỉ máu mỗi đêm, gọi bầy quỷ đến đòi mạng.',
      'Kael không chết. Anh vác cự kiếm "Trảm Long" bước xuống Hầm Ngục Vĩnh Cửu — vực sâu 30 tầng, mỗi tầng do một tướng quỷ trấn giữ. Nhưng lần này anh không đơn độc: trên đường đi, những chiến binh mang vết thương của riêng mình lần lượt gia nhập — cung thủ Lyra, đấu sĩ Bram, hiền nhân Yuki... Họ gọi anh là "Đại Ca", và gọi cuộc hành quân này là NHÀ.',
      '30 tầng. 30 boss. Vô Diện Thần đang chờ ở đáy vực. Đoàn quân tiến lên — không dừng, không quay đầu. Kiếm đã tuốt, trăng máu đã lên.',
    ],
  },
  {
    kicker: 'SAU TẦNG 10 — CỔNG XƯƠNG',
    title: 'Mười Tầng Vạn Xương',
    img: IMG.floor1,
    accent: '#ff9a3c',
    panels: [
      'Mười tầng đầu sụp đổ dưới bước chân đoàn quân. Lớp lớp cổng xương, đầm lầy rêu và những hành lang ngập tro tàn — tất cả không cản nổi một đội hình đã học cách chiến đấu như một cơ thể.',
      'Và ở cuối tầng 10, hắn xuất hiện: MORGRIM — Kị Sĩ Phản Thệ, kẻ từng kề vai với Kael trong mọi trận đánh. Bộ giáp khổng lồ phun khói đen, đôi mắt sau visor rực màu tro. "Quay về đi, Kael. Dưới này chỉ còn địa ngục." Kael cười, nâng cự kiếm: "Vậy thì bọn ta sẽ biến địa ngục thành đường hành quân."',
    ],
  },
  {
    kicker: 'SAU TẦNG 20 — HẦM MÁU',
    title: 'Đói Khát Tan Thành Máu',
    img: IMG.floor2,
    accent: '#8dff9a',
    panels: [
      'Morgrim gục, để lại lời trăn trối: "...hắn không phải người... Vô Diện... hắn ăn cả thần...". Mười tầng máu tiếp theo mở ra như dạ dày của địa ngục — nơi Ishvara, Sứ Đồ Đói Khát, đã nuốt trọn cả một thành phố mà vẫn chưa no.',
      'Ả thèm khát Dấu Ấn trên cổ Kael hơn mọi linh hồn từng nếm. Nhưng ả không tính đến một điều: ả nuốt một mình — còn Kael chiến đấu cùng những người sẵn sàng chết thay cho anh. Khi Ishvara tan thành vũng máu đen, nửa tấm huy hiệu Đoàn Kiếm Ưng rơi ra từ bụng ả. Tầng 21 và những tầng sau đó... tối dần.',
    ],
  },
  {
    kicker: 'TẦNG 30 — ĐIỆN THỰC NHẬT',
    title: 'Cửa Cuối Cùng',
    img: IMG.floor3,
    accent: '#c9b8ff',
    panels: [
      '29 tầng đã qua. Đoàn quân dừng trước cửa ải cuối — một vòm trời giả, nơi nguyệt thực treo vĩnh viễn như con ngươi mở trừng của một vị thần điên. Xương của những kẻ thách thức trước đây lát thành lối đi.',
      'Vô Diện Thần — Bàn Tay Trái của Chúa Trời — xoay chiếc cổ không xương về phía Kael, giọng nói vang lên từ khắp mọi hướng: "Ngươi đến đúng hẹn, kẻ mang dấu ấn. Linh hồn ngươi đã được định giá từ đêm ấy." Kael nhìn những người bạn sau lưng, rồi nâng kiếm: "Giá đó... ngươi không trả nổi đâu." Trận cuối cùng — BẮT ĐẦU.',
    ],
  },
];

export const ENDING = {
  kicker: 'CHƯƠNG CUỐI',
  title: 'Bình Minh Đầu Tiên',
  text: [
    'Thần tan rã như tro trước gió. Nguyệt thực khép lại sau trăm năm, và ánh sáng thật sự rơi xuống đáy vực. 30 tầng hầm ngục im lặng — lần đầu tiên trong lịch sử, không còn tiếng gầm nào vang lên.',
    'Vết thương trên cổ vẫn cháy. Dấu ấn không biến mất — có những món nợ không bao giờ được xóa. Nhưng xung quanh Kael giờ là một mái nhà biết di chuyển: Lyra lau cây cung, Bram cười ầm ĩ, Yuki băng bó cho Kuro... Hận thù từng là con đường duy nhất — giờ chỉ là một lối rẽ đã đi qua.',
    'Đoàn quân bước về phía ánh sáng đầu tiên. Cuộc săn vẫn còn dài, và kẻ mang dấu ấn thì không bao giờ dừng chân. Nhưng từ nay, anh không bao giờ bước một mình nữa.',
  ],
};
