import Video from "../models/Video.js";
import Showcase from "../models/Showcase.js";
import Announcement from "../models/Announcement.js";

// What the home page and the notifications screen of the app show: travel
// videos, the slider / suggestion pictures and a few announcements.
// Without options each collection is filled only when it is empty, so the
// admin's own content is never touched. `{ reset: true }` (npm run seed:content
// -- --reset) first empties the three collections. Safe to run more than once.
//
// The videos are public YouTube videos about the places (each id was checked
// with YouTube's oEmbed; duration in seconds). The pictures are photos from
// Wikimedia Commons (1280 px thumbnails, free licences: CC BY / CC BY-SA / CC0).

const youtube = (id) => `https://www.youtube.com/watch?v=${id}`;
const commons = (path) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/1280px-${path.split("/").pop()}`;

const sampleVideos = [
    { title: "Đèo Mã Pí Lèng – Tuyệt phẩm của du lịch Hà Giang", location: "Hà Giang", youtubeLink: youtube("Rh9PVcRwnPM"), durationSec: 2851, showOnHome: true },
    { title: "Đà Lạt 2025 [4K] – Thành phố sương mù nhìn từ trên cao", location: "Lâm Đồng", youtubeLink: youtube("V9IIO8GkssE"), durationSec: 427, showOnHome: true },
    { title: "Vịnh Hạ Long – Nơi rồng đáp xuống", location: "Quảng Ninh", youtubeLink: youtube("2_i6JBHEKuM"), durationSec: 1218, showOnHome: true },
    { title: "Thăm phố cổ Hội An – Di sản văn hóa thế giới", location: "Quảng Nam", youtubeLink: youtube("lRqxe81p4gQ"), durationSec: 300, showOnHome: true },
    { title: "Du lịch Sa Pa tự túc – Cáp treo lên đỉnh Fansipan", location: "Lào Cai", youtubeLink: youtube("9QjsgRa2R7w"), durationSec: 1128, showOnHome: true },
    { title: "Hướng dẫn tham quan khu du lịch Tràng An", location: "Ninh Bình", youtubeLink: youtube("FiJDDkuu5zI"), durationSec: 615 },
    { title: "Chen chúc tại Cầu Vàng trên đỉnh Bà Nà Hills", location: "Đà Nẵng", youtubeLink: youtube("5BeqyiagCKY"), durationSec: 625 },
    { title: "Hướng dẫn du lịch Phú Quốc tất tần tật", location: "Kiên Giang", youtubeLink: youtube("uSHSdasYsAU"), durationSec: 5303 },
];

const photos = {
    haLong: commons("2/2f/Ha_Long_Bay_22.jpg"),
    fansipan: commons("7/79/Fansipan_Summit_3143m_aerial_wide_temple_complex_sea_of_clouds_Sa_Pa_Vietnam.jpg"),
    hoiAn: commons("b/b1/H%E1%BB%99i_An%2C_Ancient_Town%2C_2020-01_CN-06.jpg"),
    baNa: commons("0/0c/Golden_Bridge_at_Ba_Na_Hills_20250718.jpg"),
    haGiang: commons("4/46/Ma_Pi_Leng_Pass_winding_road_Ha_Giang_Vietnam.jpg"),
    daLat: commons("a/aa/Da_Lat_-_Xuan_Huong_Lake.jpg"),
    trangAn: commons("0/0b/Trang_An_Landscape_Complex%2C_Ninh_Binh_Province%2C_Vietnam%2C_20240202_1456_5313.jpg"),
    phuQuoc: commons("1/1f/1_Phu_Quoc_beach_Saigon_Phu_Quoc_Resort_and_Spa.jpg"),
    saPa: commons("3/38/Road_and_paddy_fields_in_Sa_Pa%2C_Vietnam%2C_20240126_1202_3586.jpg"),
};

// "location" is the province the trip planner starts with
const sampleShowcase = [
    { kind: "banner", title: "Vịnh Hạ Long, Quảng Ninh", imageUrl: photos.haLong, sortOrder: 1 },
    { kind: "banner", title: "Fansipan – Nóc nhà Đông Dương, Lào Cai", imageUrl: photos.fansipan, sortOrder: 2 },
    { kind: "banner", title: "Phố cổ Hội An, Quảng Nam", imageUrl: photos.hoiAn, sortOrder: 3 },
    { kind: "banner", title: "Cầu Vàng – Bà Nà Hills, Đà Nẵng", imageUrl: photos.baNa, sortOrder: 4 },
    { kind: "suggestion", title: "Mã Pí Lèng", location: "Hà Giang", imageUrl: photos.haGiang, sortOrder: 1 },
    { kind: "suggestion", title: "Hồ Xuân Hương, Đà Lạt", location: "Lâm Đồng", imageUrl: photos.daLat, sortOrder: 2 },
    { kind: "suggestion", title: "Tràng An", location: "Ninh Bình", imageUrl: photos.trangAn, sortOrder: 3 },
    { kind: "suggestion", title: "Biển Phú Quốc", location: "Kiên Giang", imageUrl: photos.phuQuoc, sortOrder: 4 },
    { kind: "suggestion", title: "Ruộng bậc thang Sa Pa", location: "Lào Cai", imageUrl: photos.saPa, sortOrder: 5 },
    { kind: "suggestion", title: "Phố cổ Hội An", location: "Quảng Nam", imageUrl: photos.hoiAn, sortOrder: 6 },
    { kind: "suggestion", title: "Cầu Vàng Bà Nà", location: "Đà Nẵng", imageUrl: photos.baNa, sortOrder: 7 },
];

const hoursAgo = (hours) => new Date(Date.now() - hours * 3_600_000);

const sampleAnnouncements = [
    { title: "Chào mừng bạn đến với Aloca", message: "Lên kế hoạch chuyến đi chỉ trong vài bước, trò chuyện với trợ lý AI và chinh phục thử thách tại mỗi điểm đến để nhận điểm thưởng.", status: "published", publishAt: hoursAgo(96) },
    { title: "Thử thách mùa thu Đà Lạt", message: "Check-in tại Hồ Xuân Hương, đồi chè Cầu Đất và các điểm nổi bật khác ở Đà Lạt để nhận thêm điểm thưởng.", status: "published", publishAt: hoursAgo(48) },
    { title: "Video du lịch mới", message: "Xem thêm video về Hà Giang, Sa Pa, Hạ Long và Hội An ở mục Video nổi bật trên trang chủ.", status: "published", publishAt: hoursAgo(12) },
    { title: "Bảng xếp hạng đã cập nhật", message: "Xem bạn đang đứng ở vị trí nào trong bảng xếp hạng tuần này và leo hạng bằng cách hoàn thành thêm thử thách.", status: "published", publishAt: hoursAgo(2) },
];

const fill = async (model, items, label, reset) => {
    if (reset) {
        await model.deleteMany({});
    } else if (await model.countDocuments()) {
        console.log(`[seed:content] ${label} already exist`);
        return;
    }
    await model.insertMany(items);
    console.log(`[seed:content] ${items.length} ${label} ${reset ? "replaced" : "created"}`);
};

export default async function seedContent({ reset = false } = {}) {
    await fill(Video, sampleVideos, "videos", reset);
    await fill(Showcase, sampleShowcase, "home page pictures", reset);
    await fill(Announcement, sampleAnnouncements, "announcements", reset);
}
