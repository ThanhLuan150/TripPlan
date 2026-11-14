import {describe, expect, it} from 'vitest';
import vi from '@/locales/vi.json';
import en from '@/locales/en.json';

type Dict = Record<string, unknown>;

// "a.b.c" path -> string, for every string of a translation file
const flatten = (obj: Dict, prefix = ''): Record<string, string> =>
  Object.fromEntries(
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object'
        ? Object.entries(flatten(v as Dict, `${prefix}${k}.`))
        : [[`${prefix}${k}`, v as string]],
    ),
  );

// i18next plural forms: English has "x_one" / "x_other", Vietnamese only "x".
const PLURAL = /_(zero|one|two|few|many|other)$/;
const baseKey = (key: string) => key.replace(PLURAL, '');

// {{name}} placeholders used in a string ({{count}} is optional in a singular form)
const placeholders = (text: string) =>
  [...new Set([...text.matchAll(/{{\s*(\w+)\s*}}/g)].map(m => m[1]))].filter(p => p !== 'count').sort().join();

const viStrings = flatten(vi);
const enStrings = flatten(en);
const baseKeys = (strings: Record<string, string>) => [...new Set(Object.keys(strings).map(baseKey))].sort();

describe('translations', () => {
  it('en.json and vi.json have the same keys (plural forms aside)', () => {
    const viKeys = baseKeys(viStrings);
    const enKeys = baseKeys(enStrings);

    expect(enKeys.filter(k => !viKeys.includes(k))).toEqual([]);
    expect(viKeys.filter(k => !enKeys.includes(k))).toEqual([]);
  });

  it('has no empty strings', () => {
    const empty = Object.entries({...viStrings, ...enStrings}).filter(([, v]) => typeof v !== 'string' || !v.trim());
    expect(empty).toEqual([]);
  });

  it('uses the same {{placeholders}} in both languages', () => {
    const byBase = (strings: Record<string, string>) => {
      const map: Record<string, Set<string>> = {};
      for (const [key, text] of Object.entries(strings)) {
        (map[baseKey(key)] ??= new Set()).add(placeholders(text));
      }
      return map;
    };
    const viMap = byBase(viStrings);
    const enMap = byBase(enStrings);

    const mismatches = Object.keys(viMap).filter(key => {
      const viSet = [...viMap[key]];
      const enSet = [...(enMap[key] ?? [])];
      // every form of one language must match some form of the other
      return !viSet.every(p => enSet.includes(p)) || !enSet.every(p => viSet.includes(p));
    });
    expect(mismatches).toEqual([]);
  });
});
