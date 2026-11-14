// Every translation key written in the source code exists in vi.json and
// en.json (catches typos and keys forgotten in one language).
import {describe, expect, it} from 'vitest';
import vi from '@/locales/vi.json';
import en from '@/locales/en.json';

const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const namespaces = Object.keys(vi);
// 'auth.login.title', "trips.create.budgetLow"... (template literals are dynamic: skipped)
const keyPattern = new RegExp(`['"]((?:${namespaces.join('|')})\\.[A-Za-z0-9_.]+)['"]`, 'g');

const has = (dict: object, key: string) => {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict);
  if (value !== undefined) {
    return true;
  }
  // plural forms: "x" may only exist as "x_one" / "x_other"
  const parent = key.split('.').slice(0, -1).join('.');
  const last = key.split('.').at(-1)!;
  const siblings = parent
    ? (parent.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict) as object)
    : dict;
  return Object.keys(siblings ?? {}).some(k => k.startsWith(`${last}_`));
};

const usedKeys = () => {
  const found = new Map<string, string>();
  for (const [file, code] of Object.entries(sources)) {
    for (const match of code.matchAll(keyPattern)) {
      found.set(match[1], file);
    }
  }
  return found;
};

describe('translation keys used in the code', () => {
  it('finds the keys of the source files', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect(usedKeys().size).toBeGreaterThan(200);
  });

  it.each([
    ['vi.json', vi],
    ['en.json', en],
  ])('all exist in %s', (_name, dict) => {
    const missing = [...usedKeys()].filter(([key]) => !has(dict, key)).map(([key, file]) => `${key} (${file})`);
    expect(missing).toEqual([]);
  });
});
