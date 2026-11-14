import {removeVietnameseTones} from '@/lib/text';
import type {
  AdminActivityLog,
  AdminAiOverview,
  AdminAlert,
  AdminAnnouncement,
  AdminChallenge,
  AdminDashboard,
  AdminModerationItem,
  AdminReport,
  AdminRoles,
  AdminSettings,
  AdminShowcase,
  AdminTrip,
  AdminUser,
  AdminVideo,
  LogAction,
  ModerationReason,
  ModerationType,
  Permission,
  ReportPeriod,
  VideoStatus,
} from '@/features/admin/types';
import type {Role} from '@/features/auth/types';
import {ago, between, DAY_MS, mockId, series} from './seed';

// Mock data of the admin panel. Lists are samples; the dashboard / report
// totals are at the scale of the whole app.

const people: [string, string][] = [
  ['Nguyễn Văn An', 'Hà Nội'],
  ['Trần Thị Bình', 'Đà Nẵng'],
  ['Lê Hoàng Cường', 'TP. Hồ Chí Minh'],
  ['Phạm Minh Dũng', 'Hải Phòng'],
  ['Hoàng Thu Hà', 'Huế'],
  ['Vũ Đức Hiếu', 'Cần Thơ'],
  ['Đặng Ngọc Lan', 'Đà Lạt'],
  ['Bùi Quang Minh', 'Hà Nội'],
  ['Đỗ Thảo My', 'Nha Trang'],
  ['Hồ Gia Nam', 'TP. Hồ Chí Minh'],
  ['Ngô Bảo Ngọc', 'Quy Nhơn'],
  ['Dương Khánh Linh', 'Hà Nội'],
  ['Lý Thanh Phong', 'Vũng Tàu'],
  ['Mai Anh Quân', 'Đà Nẵng'],
  ['Trịnh Hải Yến', 'Ninh Bình'],
  ['Phan Tuấn Kiệt', 'Biên Hòa'],
  ['Võ Thị Hồng', 'Quảng Ngãi'],
  ['Đinh Công Sơn', 'Thanh Hóa'],
  ['Tạ Mỹ Duyên', 'Hội An'],
  ['Châu Nhật Huy', 'TP. Hồ Chí Minh'],
  ['Lương Thùy Trang', 'Hà Nội'],
  ['Kiều Minh Tâm', 'Buôn Ma Thuột'],
  ['Huỳnh Phương Thảo', 'Cần Thơ'],
  ['La Quốc Bảo', 'Hạ Long'],
  ['Tô Hoài Thương', 'Vinh'],
  ['Quách Gia Bảo', 'Đà Lạt'],
  ['Thái Minh Khoa', 'Huế'],
  ['Âu Ngọc Hân', 'Phú Quốc'],
  ['Lâm Chí Thanh', 'TP. Hồ Chí Minh'],
  ['Cao Bích Phượng', 'Hà Nội'],
  ['Hà Đức Anh', 'Lào Cai'],
  ['Mạc Tú Uyên', 'Đà Nẵng'],
];

const toUsername = (fullname: string, i: number) => {
  const words = removeVietnameseTones(fullname).toLowerCase().split(' ');
  return `${words[words.length - 1]}${words[0]}${i + 1}`;
};

export const mockUsers: AdminUser[] = people.map(([fullname, city], i) => {
  const username = toUsername(fullname, i);
  return {
    id: mockId('u', i),
    username,
    fullname,
    email: `${username}@example.com`,
    phone: i % 3 === 0 ? '' : `09${between(i + 300, 10000000, 99999999)}`,
    image: '',
    city,
    role: (i === 0 || i === 9 ? 'admin' : 'user') as Role,
    status: i % 7 === 5 ? 'notActive' : i % 11 === 8 ? 'delete' : i % 13 === 4 ? 'suspended' : 'active',
    suspendReason: i % 13 === 4 ? 'Spam' : '',
    suspendedAt: i % 13 === 4 ? ago(3) : null,
    level: between(i, 1, 12),
    experience: between(i + 100, 0, 4800),
    createdAt: ago(i * 9 + between(i + 200, 0, 8)),
    lastActiveAt: i % 6 === 5 ? null : ago(between(i + 400, 0, 60)),
    totalTrips: i % 5 === 3 ? 0 : between(i + 500, 1, 12),
    completedTrips: i % 5 === 3 ? 0 : between(i + 600, 0, 1),
    challengesJoined: i % 4 === 2 ? 0 : between(i + 700, 1, 9),
    challengesCompleted: 0,
  };
});

const places = ['Hà Giang', 'Sa Pa', 'Hạ Long', 'Ninh Bình', 'Huế', 'Hội An', 'Đà Nẵng', 'Đà Lạt', 'Nha Trang', 'Phú Quốc', 'Cần Thơ', 'Mũi Né'];

const tripName = (place: string, days: number, i: number) =>
  [`Khám phá ${place}`, `${place} ${days} ngày ${days - 1} đêm`, `Phượt ${place} cuối tuần`, `Gia đình đi ${place}`][i % 4];

export const mockTrips: AdminTrip[] = Array.from({length: 30}, (_, i) => {
  const place = places[i % places.length];
  const days = between(i + 7, 2, 5);
  const start = new Date(ago(between(i + 3, -30, 150)));
  return {
    id: mockId('t', i),
    nameTrip: tripName(place, days, i),
    location: place,
    owner: mockUsers[(i * 5) % mockUsers.length].fullname,
    startDate: start.toISOString(),
    endDate: new Date(start.getTime() + (days - 1) * DAY_MS).toISOString(),
    days,
    transportCostTotal: between(i + 11, 4, 40) * 100_000,
    foodCostTotal: between(i + 12, 3, 25) * 100_000,
    otherCostTotal: between(i + 13, 1, 15) * 100_000,
    challenges: between(i + 5, 2, 8),
    status: i % 9 === 4 ? 'delete' : 'active',
  };
});

const challengeSpots: [string, string, string][] = [
  ['Cột cờ Lũng Cú', 'Đồng Văn', 'Hà Giang'],
  ['Đèo Mã Pí Lèng', 'Mèo Vạc', 'Hà Giang'],
  ['Đỉnh Fansipan', 'Sa Pa', 'Lào Cai'],
  ['Bản Cát Cát', 'Sa Pa', 'Lào Cai'],
  ['Vịnh Hạ Long', 'Hạ Long', 'Quảng Ninh'],
  ['Tràng An', 'Hoa Lư', 'Ninh Bình'],
  ['Hang Múa', 'Hoa Lư', 'Ninh Bình'],
  ['Đại Nội Huế', 'Phú Hậu', 'Thừa Thiên Huế'],
  ['Phố cổ Hội An', 'Minh An', 'Quảng Nam'],
  ['Cầu Vàng Bà Nà', 'Hòa Vang', 'Đà Nẵng'],
  ['Bán đảo Sơn Trà', 'Sơn Trà', 'Đà Nẵng'],
  ['Hồ Xuân Hương', 'Phường 1', 'Lâm Đồng'],
  ['Thung lũng Tình Yêu', 'Phường 8', 'Lâm Đồng'],
  ['Tháp Bà Ponagar', 'Vĩnh Phước', 'Khánh Hòa'],
  ['Hòn Thơm', 'An Thới', 'Kiên Giang'],
  ['Chợ nổi Cái Răng', 'Cái Răng', 'Cần Thơ'],
  ['Đồi cát bay', 'Mũi Né', 'Bình Thuận'],
  ['Nhà thờ Đức Bà', 'Quận 1', 'TP. Hồ Chí Minh'],
  ['Hồ Hoàn Kiếm', 'Hoàn Kiếm', 'Hà Nội'],
  ['Văn Miếu', 'Đống Đa', 'Hà Nội'],
];

export const mockChallenges: AdminChallenge[] = challengeSpots.map(([nameLocation, area, province], i) => {
  const participants = between(i + 30, 40, 900);
  return {
    id: mockId('c', i),
    nameLocation,
    challengeSummary: `Check in tại ${nameLocation}`,
    location: `${area}, ${province}`,
    province,
    points: between(i + 40, 2, 12) * 25,
    participants,
    completed: Math.round(participants * (0.3 + 0.6 * (between(i + 50, 0, 100) / 100))),
  };
});

const aiTitles = [
  'Lịch trình Đà Lạt 3 ngày',
  'Ăn gì ở Huế?',
  'Khách sạn gần phố cổ Hội An',
  'Chi phí đi Phú Quốc 4 ngày',
  'Thời tiết Sa Pa tháng 12',
  'Đi Hà Giang bằng xe máy',
  'Gợi ý quán cà phê Đà Nẵng',
  'Lặn ngắm san hô Nha Trang',
  'Vé tham quan Tràng An',
  'Chợ nổi Cái Răng mấy giờ mở?',
  'Lịch trình Hạ Long 2 ngày',
  'Đặc sản Mũi Né',
  'Đi Côn Đảo mùa nào đẹp?',
];

export const mockAiOverview: AdminAiOverview = {
  stats: {
    conversations: {value: 21_430, delta: 0.215},
    messages: {value: 148_920, delta: 0.184},
    activeUsers: {value: 9_870},
    avgMessages: {value: 6.9},
  },
  dailyMessages: series(300, 14, 1, 4_800, 1_400),
  chats: Array.from({length: 26}, (_, i) => ({
    id: mockId('chat', i),
    title: aiTitles[i % aiTitles.length],
    user: mockUsers[(i * 3 + 1) % mockUsers.length].fullname,
    messages: between(i + 60, 2, 36),
    updatedAt: ago(i * 0.37 + between(i + 80, 0, 3) / 24),
  })),
};

const videoTitles: [string, string][] = [
  ['Bình minh trên đỉnh Fansipan', 'Lào Cai'],
  ['Một ngày ở phố cổ Hội An', 'Quảng Nam'],
  ['Mùa hoa tam giác mạch', 'Hà Giang'],
  ['Chèo thuyền ở Tràng An', 'Ninh Bình'],
  ['Hoàng hôn Mũi Né', 'Bình Thuận'],
  ['Ẩm thực đường phố Sài Gòn', 'TP. Hồ Chí Minh'],
  ['Săn mây Đà Lạt', 'Lâm Đồng'],
  ['Du thuyền vịnh Hạ Long', 'Quảng Ninh'],
  ['Lặn biển Nha Trang', 'Khánh Hòa'],
  ['Cầu Vàng Bà Nà', 'Đà Nẵng'],
  ['Chợ nổi miền Tây', 'Cần Thơ'],
  ['Đêm hoàng cung Huế', 'Thừa Thiên Huế'],
  ['Đảo ngọc Phú Quốc', 'Kiên Giang'],
  ['Phố đi bộ Hồ Gươm', 'Hà Nội'],
  ['Đèo Hải Vân', 'Đà Nẵng'],
];
const videoStatuses: VideoStatus[] = ['published', 'published', 'published', 'hidden', 'published', 'hidden'];

export const mockVideos: AdminVideo[] = videoTitles.map(([title, location], i) => ({
  id: mockId('v', i),
  title,
  location,
  youtubeLink: `https://www.youtube.com/watch?v=video${String(i).padStart(6, '0')}`,
  src: '',
  showOnHome: i % 4 === 0,
  durationSec: between(i + 90, 15, 75),
  views: between(i + 95, 800, 96_000),
  status: videoStatuses[i % videoStatuses.length],
  createdAt: ago(i * 4 + 1),
}));

const campaignTitles = [
  'Chào mừng thành viên mới',
  'Thử thách mùa thu Đà Lạt',
  'Nhắc lịch trình sắp tới',
  'Bảng xếp hạng tuần đã cập nhật',
  'Ưu đãi cuối tuần Phú Quốc',
  'Hoàn thành hồ sơ để nhận điểm',
  'Video du lịch nổi bật tháng này',
  'Thử thách Hà Giang mùa hoa',
  'Bảo trì hệ thống định kỳ',
  'Mời bạn bè cùng khám phá',
  'Tổng kết hành trình năm 2026',
  'Cập nhật trợ lý AI mới',
];
export const mockAnnouncements: AdminAnnouncement[] = campaignTitles.map((title, i) => ({
  id: mockId('n', i),
  title,
  message: `Nội dung: ${title}`,
  // the first three are published for a later date (scheduled), every fifth is a draft
  status: i % 5 === 4 ? 'draft' : 'published',
  publishAt: ago(i < 3 ? -(i + 1) : i * 3),
  createdAt: ago(i * 3 + 1),
}));

const logActions: LogAction[] = [
  'login',
  'createTrip',
  'completeChallenge',
  'updateProfile',
  'login',
  'deleteTrip',
  'useAi',
  'changeRole',
  'createTrip',
  'updateSettings',
  'completeChallenge',
  'deleteUser',
];

const logTarget = (action: LogAction, i: number) => {
  switch (action) {
    case 'createTrip':
    case 'deleteTrip':
      return mockTrips[i % mockTrips.length].nameTrip;
    case 'completeChallenge':
      return mockChallenges[i % mockChallenges.length].nameLocation;
    case 'useAi':
      return aiTitles[i % aiTitles.length];
    case 'changeRole':
    case 'deleteUser':
      return `@${mockUsers[(i + 4) % mockUsers.length].username}`;
    case 'updateSettings':
      return 'appName';
    default:
      return 'web';
  }
};

const logLevel = (action: LogAction) =>
  action === 'useAi' ? 'info' : action === 'deleteUser' || action === 'changeRole' ? 'warning' : 'info';

export const mockActivityLogs: AdminActivityLog[] = Array.from({length: 42}, (_, i) => {
  const action = logActions[i % logActions.length];
  const admin = action === 'changeRole' || action === 'deleteUser' || action === 'updateSettings';
  return {
    id: mockId('log', i),
    at: ago(i * 0.21 + 0.004),
    actor: admin ? mockUsers[0].fullname : mockUsers[(i * 7 + 2) % mockUsers.length].fullname,
    action,
    target: logTarget(action, i),
    ip: `113.${between(i + 140, 160, 190)}.${between(i + 141, 1, 254)}.${between(i + 142, 1, 254)}`,
    level: logLevel(action),
  };
});

const moderationContent: [ModerationType, ModerationReason, string][] = [
  ['challengePhoto', 'wrongLocation', 'Ảnh check-in Cột cờ Lũng Cú chụp trong nhà'],
  ['chatMessage', 'spam', 'Liên hệ mình để mua tour giá rẻ, inbox ngay!!!'],
  ['profile', 'inappropriate', 'Ảnh đại diện có nội dung không phù hợp'],
  ['video', 'copyright', 'Video sử dụng nhạc nền có bản quyền'],
  ['challengePhoto', 'wrongLocation', 'Ảnh hoàn thành thử thách Cầu Vàng là ảnh mạng'],
  ['chatMessage', 'inappropriate', 'Tin nhắn chứa từ ngữ xúc phạm'],
  ['challengePhoto', 'spam', 'Cùng một ảnh gửi cho 5 thử thách khác nhau'],
  ['profile', 'spam', 'Tên hiển thị chứa đường dẫn quảng cáo'],
  ['video', 'inappropriate', 'Video có cảnh nguy hiểm khi lái xe'],
  ['challengePhoto', 'wrongLocation', 'Vị trí ảnh cách điểm thử thách 12 km'],
  ['chatMessage', 'spam', 'Quảng cáo dịch vụ đổi tiền'],
  ['profile', 'copyright', 'Ảnh bìa lấy từ tài khoản khác'],
  ['challengePhoto', 'inappropriate', 'Ảnh check-in Văn Miếu không phù hợp'],
  ['video', 'spam', 'Video lặp lại nhiều lần trong ngày'],
];

export const mockModeration: AdminModerationItem[] = moderationContent.map(([type, reason, content], i) => ({
  id: mockId('m', i),
  type,
  reason,
  content,
  author: mockUsers[(i * 5 + 3) % mockUsers.length].fullname,
  reportedAt: ago(i * 0.45 + 0.02),
  status: i < 8 ? 'pending' : i % 2 === 0 ? 'approved' : 'rejected',
}));

export const mockAlerts: AdminAlert[] = [
  {id: 'a1', type: 'pendingModeration', count: 8, at: ago(0.006), read: false},
  {id: 'a2', type: 'aiErrors', count: 3, at: ago(0.09), read: false},
  {id: 'a3', type: 'newUsers', count: 24, at: ago(0.4), read: false},
  {id: 'a4', type: 'reportReady', count: 1, at: ago(1.6), read: true},
];

export const mockDashboard: AdminDashboard = {
  stats: {
    users: {value: 12_846, delta: 0.124},
    trips: {value: 3_912, delta: 0.081},
    challengesCompleted: {value: 8_754, delta: -0.032},
    aiChats: {value: 21_430, delta: 0.215},
  },
  newUsers: Array.from({length: 12}, (_, i) => {
    const now = new Date();
    return {
      date: new Date(now.getFullYear(), now.getMonth() - 11 + i, 1).toISOString(),
      value: Math.round(620 + i * 55 + between(i + 400, -120, 120)),
    };
  }),
  topDestinations: [
    {name: 'Đà Lạt', trips: 642},
    {name: 'Hội An', trips: 518},
    {name: 'Hà Giang', trips: 471},
    {name: 'Phú Quốc', trips: 389},
    {name: 'Sa Pa', trips: 302},
  ],
};

const report = (seed: number, scale: number, points: number, stepDays: number): AdminReport => ({
  stats: {
    newUsers: {value: Math.round(410 * scale), delta: 0.06 + seed / 100},
    tripsCreated: {value: Math.round(128 * scale), delta: 0.11 - seed / 50},
    completionRate: {value: 0.62 + seed / 100, delta: 0.021},
    avgTripCost: {value: 4_850_000 + seed * 120_000, delta: -0.018},
  },
  tripsCreated: series(seed * 50, points, stepDays, (128 * scale) / points, (40 * scale) / points),
  provinces: [
    ['Lâm Đồng', 0.21],
    ['Quảng Nam', 0.17],
    ['Hà Giang', 0.15],
    ['Kiên Giang', 0.13],
    ['Lào Cai', 0.1],
    ['Quảng Ninh', 0.09],
    ['Ninh Bình', 0.08],
  ].map(([name, share], i) => ({
    name: name as string,
    trips: Math.round(128 * scale * (share as number)),
    completed: Math.round(310 * scale * (share as number)),
    avgCost: between(seed + i, 32, 78) * 100_000,
  })),
});

export const mockReports: Record<ReportPeriod, AdminReport> = {
  '7d': report(1, 1, 7, 1),
  '30d': report(2, 4.3, 30, 1),
  '90d': report(3, 12.8, 13, 7),
};

// What each role may do (roles are User.role on the backend)
const permissionRows: {permission: Permission; roles: Role[]}[] = [
  {permission: 'planTrips', roles: ['user', 'admin']},
  {permission: 'chatAi', roles: ['user', 'admin']},
  {permission: 'completeChallenges', roles: ['user', 'admin']},
  {permission: 'viewRanking', roles: ['user', 'admin']},
  {permission: 'deleteOwnAccount', roles: ['user', 'admin']},
  {permission: 'deleteAnyAccount', roles: ['admin']},
  {permission: 'manageContent', roles: ['admin']},
  {permission: 'moderate', roles: ['admin']},
  {permission: 'viewReports', roles: ['admin']},
  {permission: 'manageSettings', roles: ['admin']},
];

export const mockRoles: AdminRoles = {
  members: {
    admin: mockUsers.filter(user => user.role === 'admin' && user.status !== 'delete').length,
    user: mockUsers.filter(user => user.role === 'user' && user.status !== 'delete').length,
  },
  permissions: permissionRows,
};

export const mockSettingsData: AdminSettings = {
  appName: 'Aloca',
  supportEmail: 'support@example.com',
  hotline: '19001009',
};

export const mockShowcase: AdminShowcase[] = [
  ...[1, 2, 3].map(
    (n): AdminShowcase => ({
      id: `sb${n}`,
      kind: 'banner',
      title: `Banner ${n}`,
      location: '',
      imageUrl: `https://cdn.example.com/banner${n}.jpg`,
      status: n === 3 ? 'hidden' : 'published',
      sortOrder: n,
      createdAt: ago(n),
    }),
  ),
  ...[1, 2].map(
    (n): AdminShowcase => ({
      id: `ss${n}`,
      kind: 'suggestion',
      title: n === 1 ? 'Đà Lạt' : '',
      location: n === 1 ? 'Lâm Đồng' : '',
      imageUrl: `https://cdn.example.com/suggestion${n}.jpg`,
      status: 'published',
      sortOrder: n,
      createdAt: ago(n),
    }),
  ),
];
