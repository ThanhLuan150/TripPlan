// Helpers for the admin mock data: deterministic "random" numbers (the same
// data on every load) and dates relative to now (the data always looks fresh).

export const DAY_MS = 86_400_000;

// 0 <= x < 1, always the same for the same n
export const seeded = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// integer in [min, max]
export const between = (n: number, min: number, max: number) =>
  Math.round(min + seeded(n) * (max - min));

// ISO time `days` (may be fractional, or negative for the future) before now
export const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

const pad = (n: number) => n.toString().padStart(3, '0');
export const mockId = (prefix: string, i: number) => `${prefix}${pad(i + 1)}`;

// `count` points ending today, `stepDays` apart, around `base`
export const series = (seed: number, count: number, stepDays: number, base: number, spread: number) =>
  Array.from({length: count}, (_, i) => ({
    date: ago((count - 1 - i) * stepDays),
    // slow upward trend + noise
    value: Math.round(base * (0.8 + (0.4 * i) / count) + (seeded(seed + i) - 0.5) * spread),
  }));
