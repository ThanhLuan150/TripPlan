import {extractTripHints} from '../src/lib/tripHints';

describe('extractTripHints', () => {
  it('returns nothing for empty input', () => {
    expect(extractTripHints()).toEqual({});
    expect(extractTripHints(undefined, '')).toEqual({});
  });

  it('finds a province by name, ignoring accents and case', () => {
    expect(extractTripHints('toi muon di da nang')).toEqual({
      location: 'Đà Nẵng',
    });
  });

  it('maps well-known places to their province', () => {
    expect(extractTripHints('Chuyến đi Đà Lạt').location).toBe('Lâm Đồng');
    expect(extractTripHints('Phú Quốc').location).toBe('Kiên Giang');
    expect(extractTripHints('Sapa mùa đông').location).toBe('Lào Cai');
  });

  it('takes the destination mentioned first', () => {
    expect(extractTripHints('Từ Hà Nội đến Đà Nẵng').location).toBe('Hà Nội');
  });

  it('prefers the longer name ("Bà Rịa Vũng Tàu" over "Vũng Tàu")', () => {
    expect(extractTripHints('Bà Rịa Vũng Tàu').location).toBe(
      'Bà Rịa Vũng Tàu',
    );
  });

  it('reads days and people, in Vietnamese and English', () => {
    expect(extractTripHints('3 ngày 2 người')).toMatchObject({
      days: 3,
      people: 2,
    });
    expect(extractTripHints('5 days for 4 people')).toMatchObject({
      days: 5,
      people: 4,
    });
  });

  it('clamps days to 1..7 and people to 1..10', () => {
    expect(extractTripHints('20 ngày 30 người')).toMatchObject({
      days: 7,
      people: 10,
    });
    expect(extractTripHints('0 ngày 0 người')).toMatchObject({
      days: 1,
      people: 1,
    });
  });

  it('checks the texts in order and fills what is still missing', () => {
    expect(extractTripHints('Huế 2 ngày', 'Hà Nội 4 ngày 3 người')).toEqual({
      location: 'Thừa Thiên Huế',
      days: 2,
      people: 3,
    });
  });

  it('skips empty texts', () => {
    expect(extractTripHints(undefined, 'Hải Phòng')).toEqual({
      location: 'Hải Phòng',
    });
  });
});
