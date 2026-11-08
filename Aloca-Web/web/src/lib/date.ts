const pad = (n: number) => n.toString().padStart(2, '0');

// d/m/yyyy in the viewer's local time
export const formatDate = (value: string | Date) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

// d/m (the mobile trip list cut the year off)
export const formatShortDate = (value: string | Date) =>
  formatDate(value).split('/').slice(0, 2).join('/');

// 1.000.000 (Vietnamese thousands separator, used for VND)
export const addCommas = (number: number | undefined | null): string =>
  (number ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// yyyy-mm-dd for <input type="date">
export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Parse yyyy-mm-dd as a local date, keeping the current time of day
// (the mobile date picker returned the picked day with the current time).
export const fromInputDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
};

export const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const DAY_MS = 24 * 60 * 60 * 1000;
