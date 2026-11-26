// 1250000 -> "1.250.000" (same grouping as the web app, without relying on Intl support)
export const addCommas = (n: number | undefined | null): string =>
  String(Math.round(n ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
