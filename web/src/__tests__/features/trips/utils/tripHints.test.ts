import {describe, expect, it} from 'vitest';
import {extractTripHints} from '@/features/trips/utils/tripHints';

describe('extractTripHints', () => {
  it('finds a province named in the text', () => {
    expect(extractTripHints('Gợi ý lịch trình đi Hà Giang mùa hoa tam giác mạch')).toEqual({
      location: 'Hà Giang',
    });
  });

  it('maps well-known places to their province', () => {
    expect(extractTripHints('Đi Đà Lạt').location).toBe('Lâm Đồng');
    expect(extractTripHints('Một ngày ở Sài Gòn').location).toBe('TP Hồ Chí Minh');
    expect(extractTripHints('tắm biển phú quốc').location).toBe('Kiên Giang');
    expect(extractTripHints('SAPA mùa đông').location).toBe('Lào Cai');
  });

  it('prefers the longest name ("Bà Rịa Vũng Tàu" is not just "Vũng Tàu")', () => {
    expect(extractTripHints('Du lịch Bà Rịa Vũng Tàu').location).toBe('Bà Rịa Vũng Tàu');
    // "Hà Giang", not "Giang" of An Giang / Kiên Giang...
    expect(extractTripHints('Hà Giang').location).toBe('Hà Giang');
  });

  it('keeps the first place mentioned', () => {
    expect(extractTripHints('Từ Hà Nội đi Hạ Long rồi về Ninh Bình').location).toBe('Hà Nội');
  });

  it('matches whole words only', () => {
    // "hue" inside another word is not Huế
    expect(extractTripHints('chuẩn bị hành lý').location).toBeUndefined();
  });

  it('reads the number of days and people (vi / en), clamped to the form limits', () => {
    expect(extractTripHints('Kế hoạch 3 ngày 2 đêm cho 4 người')).toMatchObject({days: 3, people: 4});
    expect(extractTripHints('a 5 days trip for 2 people')).toMatchObject({days: 5, people: 2});
    expect(extractTripHints('trip 1 day, 1 person')).toMatchObject({days: 1, people: 1});
    expect(extractTripHints('30 ngày, 50 người')).toMatchObject({days: 7, people: 10});
    expect(extractTripHints('0 ngày 0 người')).toMatchObject({days: 1, people: 1});
  });

  it('combines several texts, the first one winning', () => {
    const hints = extractTripHints(
      'Lịch trình Đà Nẵng 3 ngày',
      undefined,
      'Tôi muốn đi Huế 5 ngày với 2 người',
    );
    expect(hints).toEqual({location: 'Đà Nẵng', days: 3, people: 2});
  });

  it('returns nothing for empty input', () => {
    expect(extractTripHints()).toEqual({});
    expect(extractTripHints('', undefined)).toEqual({});
  });
});
