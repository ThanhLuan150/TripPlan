// Data the mocked API sends. Shapes follow the app's types (src/features/*/types.ts).

export const user = {
  username: 'lan123',
  fullname: 'Lan Nguyễn',
  email: 'lan@x.vn',
  phone: '0901234567',
  address: 'Hà Nội',
  image: 'http://img.e2e/lan.jpg',
  role: 'user',
};

export const trips = [
  {_id: 't1', nameTrip: 'Đà Lạt mộng mơ', location: 'Lâm Đồng', startDate: '2026-03-02T00:00:00', endDate: '2026-03-04T00:00:00', status: 'active'},
  {_id: 't2', nameTrip: 'Đã xoá', location: 'Huế', startDate: '2026-01-01T00:00:00', endDate: '2026-01-02T00:00:00', status: 'delete'},
  {_id: 't3', nameTrip: 'Biển Nha Trang', location: 'Khánh Hòa', startDate: '2026-05-10T00:00:00', endDate: '2026-05-12T00:00:00', status: 'active'},
];

export const tripDetail = {
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-03T09:00:00',
  dataTripDays: [
    {
      title: 'Trung tâm Đà Lạt',
      date: '2026-03-02T09:00:00',
      transportCost: 100000,
      foodCost: 200000,
      otherCost: 0,
      challenges: [
        {_id: 'c1', challengeSummary: 'Chụp ảnh Hồ Xuân Hương', location: 'Hồ Xuân Hương, Đà Lạt', points: 20, completed: true, imageUrl: 'http://img.e2e/c1.jpg'},
        {_id: 'c2', challengeSummary: 'Ăn bánh tráng nướng', points: 10},
      ],
    },
    {
      title: 'Langbiang',
      date: '2026-03-03T09:00:00',
      transportCost: 50000,
      foodCost: 150000,
      otherCost: 300000,
      challenges: [{_id: 'c3', challengeSummary: 'Leo núi Langbiang', points: 80}],
    },
  ],
};

// AI suggestions: plans -> days -> activities
export const generatedPlans = {
  plan1: {
    day1: {title: 'Hồ Xuân Hương', activities: [{challenge_summary: 'Đạp vịt trên hồ'}, {challenge_summary: 'Uống cà phê'}]},
    day2: {title: 'Langbiang', activities: [{challenge_summary: 'Leo núi'}]},
  },
  plan2: {
    day1: {title: 'Thung lũng Tình Yêu', activities: [{challenge_summary: 'Chụp ảnh'}]},
  },
};

export const ranking = [
  {_id: 'u3', fullname: 'Duy', experience: 260, image: 'http://img.e2e/3'},
  {_id: 'u1', fullname: 'Bảo', experience: 1200, image: 'http://img.e2e/1'},
  {_id: 'u2', fullname: 'Cúc', experience: 640},
  {_id: 'u4', fullname: 'Yến', experience: 90, image: 'http://img.e2e/4'},
  {_id: 'u5', fullname: 'Tuấn', experience: 2500, image: 'http://img.e2e/5'},
];

export const videos = [
  {id: 'v1', title: 'Fansipan', location: 'Lào Cai', youtubeLink: 'https://youtu.be/aaaaaaaaaaa', src: '', thumbnail: 'https://img.youtube.com/vi/aaaaaaaaaaa/hqdefault.jpg'},
  {id: 'v2', title: 'Hội An', location: 'Quảng Nam', youtubeLink: 'https://youtu.be/bbbbbbbbbbb', src: 'https://cdn.e2e/x.mp4', thumbnail: ''},
];

export const homeContent = {
  banners: [1, 2].map(n => ({id: `b${n}`, title: `Banner ${n}`, imageUrl: `https://cdn.e2e/b${n}.jpg`})),
  suggestions: [
    {id: 's1', title: 'Đà Lạt', location: 'Lâm Đồng', imageUrl: 'https://cdn.e2e/s1.jpg'},
    {id: 's2', title: 'Biển xanh', location: '', imageUrl: 'https://cdn.e2e/s2.jpg'},
  ],
};

export const announcements = [
  {id: 'a1', title: 'Chào mừng Aloca', message: 'Bắt đầu hành trình của bạn', publishAt: '2026-02-01T08:00:00.000Z'},
  {id: 'a2', title: 'Tính năng mới', message: 'Bản đồ thử thách', publishAt: '2026-02-10T08:00:00.000Z'},
];
