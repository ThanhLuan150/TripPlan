import {money, removeVietnameseTones, stripTones} from '../src/lib/text';

describe('money', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [1000000, '1.000.000'],
    [12345678, '12.345.678'],
  ])('formats %d as %s', (n, out) => {
    expect(money(n)).toBe(out);
  });
});

describe('stripTones', () => {
  it('removes tones and lower-cases', () => {
    expect(stripTones('Đà Nẵng')).toBe('da nang');
    expect(stripTones('ĐỒNG THÁP')).toBe('dong thap');
  });

  it('leaves plain text alone', () => {
    expect(stripTones('hanoi 123')).toBe('hanoi 123');
  });
});

describe('removeVietnameseTones', () => {
  it('replaces tones in lower and upper case', () => {
    expect(removeVietnameseTones('Thừa Thiên Huế')).toBe('Thua Thien Hue');
    expect(removeVietnameseTones('Đắk Lắk')).toBe('Dak Lak');
  });

  it('turns punctuation into spaces and trims', () => {
    expect(removeVietnameseTones('  TP.HCM  ')).toBe('TP HCM');
    expect(removeVietnameseTones('a-b_c')).toBe('a b c');
  });

  it('collapses repeated spaces', () => {
    expect(removeVietnameseTones('a   b')).toBe('a b');
  });

  it('removes combining marks of decomposed text', () => {
    expect(removeVietnameseTones('Hà Nội')).not.toMatch(
      /[̀-ͯ]/,
    );
  });
});
