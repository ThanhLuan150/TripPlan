import {describe, expect, it} from 'vitest';
import {removeVietnameseTones} from '@/lib/text';

describe('removeVietnameseTones', () => {
  it('removes accents, lower and upper case', () => {
    expect(removeVietnameseTones('Đà Lạt mộng mơ')).toBe('Da Lat mong mo');
    expect(removeVietnameseTones('ĐẮK LẮK, BUÔN MA THUỘT')).toMatch(/^DAK LAK\s+BUON MA THUOT$/);
    expect(removeVietnameseTones('Thừa Thiên Huế')).toBe('Thua Thien Hue');
    expect(removeVietnameseTones('ỳ ý ỵ ỷ ỹ Ỳ')).toBe('y y y y y Y');
  });

  it('handles accents typed as combining characters (NFD)', () => {
    expect(removeVietnameseTones('Hà Nội'.normalize('NFD'))).toBe('Ha Noi');
  });

  it('collapses spaces, trims and turns punctuation into spaces', () => {
    expect(removeVietnameseTones('  Sa   Pa  ')).toBe('Sa Pa');
    expect(removeVietnameseTones('TP.HCM')).toBe('TP HCM');
    expect(removeVietnameseTones('a-b_c!d')).toBe('a b c d');
  });
});

describe('removeVietnameseTones punctuation', () => {
  it('replaces every special character with a space', () => {
    const specials = '!@%^*()+=<>?/,.:;\'"&#[]~$_`-{}|\\';
    expect(removeVietnameseTones(`a${specials}b`)).toBe(`a${' '.repeat(specials.length)}b`);
  });
});
