const thu: string[] = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

// Returns [weekday, day, month, year] of the date in the viewer's local time.
export const convertDate = (ngayThangGMT: string | Date): string[] => {
  const ngayThang = new Date(ngayThangGMT);

  if (isNaN(ngayThang.getTime())) {
    throw new Error('Không thể chuyển đổi ngày tháng');
  }

  return [
    thu[ngayThang.getDay()],
    `${ngayThang.getDate()}`,
    `${ngayThang.getMonth() + 1}`,
    `${ngayThang.getFullYear()}`,
  ];
};

// d/m/yyyy
export const convertDatetoString = (date: Date) => {
  const [, d, m, y] = convertDate(date);
  return `${d}/${m}/${y}`;
};

// d/m/yyyy from an ISO string coming from the backend
export const convertDatetoString2 = (date: string) => {
  const [, d, m, y] = convertDate(date);
  return `${d}/${m}/${y}`;
};

export const addCommas = (number: number | undefined | null): string => {
  return (number ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// yyyy-mm-dd for <input type="date">
export const toInputDate = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

// Parse yyyy-mm-dd as a local date, keeping the current time of day
// (the mobile date picker returned the picked day with the current time).
export const fromInputDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  const now = new Date();
  return new Date(
    y,
    m - 1,
    d,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );
};
