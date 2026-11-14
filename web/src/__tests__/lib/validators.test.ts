import {describe, expect, it} from 'vitest';
import {isEmail} from '@/lib/validators';

describe('isEmail', () => {
  it.each(['an@example.com', 'a.b+c@mail.example.co.uk', 'x@y.z'])('accepts %s', value => {
    expect(isEmail(value)).toBe(true);
  });

  it.each(['', 'plain', '@example.com', 'an@', 'an@example', 'an@.com', 'an@example.', 'a@b@c.com', 'an @example.com'])(
    'rejects "%s"',
    value => {
      expect(isEmail(value)).toBe(false);
    },
  );

  it('is fast on the strings that made the old pattern take minutes', () => {
    const start = Date.now();

    expect(isEmail(`!@!.${'!.'.repeat(100_000)}`)).toBe(false);
    expect(isEmail(`!@!.${'!.'.repeat(120)}!`)).toBe(true);

    expect(Date.now() - start).toBeLessThan(1000);
  });
});
