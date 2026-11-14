import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  addCommas,
  DAY_MS,
  formatDate,
  formatShortDate,
  fromInputDate,
  startOfDay,
  toInputDate,
} from '@/lib/date';

describe('formatDate / formatShortDate', () => {
  it('formats d/m/yyyy without leading zeros', () => {
    expect(formatDate(new Date(2026, 2, 5, 23, 59))).toBe('5/3/2026');
    expect(formatShortDate(new Date(2026, 11, 31))).toBe('31/12');
  });

  it('accepts ISO strings', () => {
    expect(formatDate('2026-07-14T08:00:00')).toBe('14/7/2026');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('not a date')).toBe('');
    expect(formatShortDate('nope')).toBe('');
  });
});

describe('addCommas', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [1234567, '1.234.567'],
    [undefined, '0'],
    [null, '0'],
  ])('%s -> %s', (value, expected) => {
    expect(addCommas(value)).toBe(expected);
  });
});

describe('input dates', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('toInputDate pads month and day', () => {
    expect(toInputDate(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('fromInputDate keeps the picked day and the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 1, 14, 30, 15));

    const date = fromInputDate('2026-06-20');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 5, 20]);
    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([14, 30, 15]);
  });

  it('round-trips through toInputDate', () => {
    expect(toInputDate(fromInputDate('2026-02-28'))).toBe('2026-02-28');
  });

  it('startOfDay drops the time; DAY_MS is one day', () => {
    const a = startOfDay(new Date(2026, 3, 10, 18, 45));
    expect(a).toBe(new Date(2026, 3, 10).getTime());
    expect(startOfDay(new Date(2026, 3, 11, 1)) - a).toBe(DAY_MS);
  });
});
