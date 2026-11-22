import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {countDays, createTripSchema, planNameSchema} from '@/features/trips/validation';
import {schemaErrors} from '@/lib/forms';

// Monday 2 March 2026, 9:00
const NOW = new Date(2026, 2, 2, 9, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const valid = {
  location: 'Lâm Đồng',
  startDate: '2026-03-02',
  endDate: '2026-03-04',
  quantity: 2,
  budgetTier: 'mid',
  interests: ['history'] as string[],
  note: '',
};
const errors = (change: Record<string, unknown> = {}) => schemaErrors(createTripSchema, {...valid, ...change});

describe('countDays', () => {
  it('counts both the first and the last day', () => {
    expect(countDays('2026-03-02', '2026-03-02')).toBe(1);
    expect(countDays('2026-03-02', '2026-03-08')).toBe(7);
  });

  it('is below 1 when the end is before the start', () => {
    expect(countDays('2026-03-05', '2026-03-03')).toBe(-1);
  });
});

describe('createTripSchema', () => {
  it('accepts a complete trip', () => {
    expect(errors()).toEqual({});
  });

  it('accepts every budget tier and 7 days', () => {
    for (const budgetTier of ['low', 'mid', 'high']) {
      expect(errors({budgetTier})).toEqual({});
    }
    expect(errors({endDate: '2026-03-08'})).toEqual({});
  });

  it.each(['', 'Sài Gòn', 'lâm đồng'])('needs a province of the list (%j)', location => {
    expect(errors({location})).toEqual({location: 'trips.create.errorProvince'});
  });

  it('refuses a start date in the past', () => {
    expect(errors({startDate: '2026-03-01', endDate: '2026-03-03'})).toEqual({startDate: 'trips.create.errorPastDate'});
  });

  it('refuses today once it is 18:00', () => {
    vi.setSystemTime(new Date(2026, 2, 2, 18, 0));
    expect(errors()).toEqual({startDate: 'trips.create.errorTooLate'});
    // tomorrow is still fine
    expect(errors({startDate: '2026-03-03', endDate: '2026-03-04'})).toEqual({});
  });

  it('allows today until 17:59', () => {
    vi.setSystemTime(new Date(2026, 2, 2, 17, 59));
    expect(errors()).toEqual({});
  });

  it('refuses an end date before the start', () => {
    expect(errors({startDate: '2026-03-05', endDate: '2026-03-03'})).toEqual({endDate: 'trips.create.errorEndBeforeStart'});
  });

  it('refuses a trip of more than 7 days', () => {
    expect(errors({endDate: '2026-03-09'})).toEqual({endDate: 'trips.create.errorMaxDays'});
  });

  it('needs both dates', () => {
    expect(errors({startDate: '', endDate: ''})).toEqual({
      startDate: 'trips.create.errorPickDates',
      endDate: 'trips.create.errorPickDates',
    });
  });

  it.each([0, 11, 1.5, 'abc', ''])('keeps the people between 1 and 10 (%j)', quantity => {
    expect(errors({quantity})).toEqual({quantity: 'trips.create.errorPeople'});
  });

  it('accepts 1 and 10 people', () => {
    expect(errors({quantity: 1})).toEqual({});
    expect(errors({quantity: 10})).toEqual({});
  });

  it.each(['', 'free'])('needs a budget (%j)', budgetTier => {
    expect(errors({budgetTier})).toEqual({budgetTier: 'trips.create.errorMissing'});
  });

  it('needs at least one kind of place', () => {
    expect(errors({interests: []})).toEqual({interests: 'trips.create.errorInterests'});
    expect(errors({interests: ['history', 'outdoor']})).toEqual({});
  });

  it('limits the note to 1500 characters', () => {
    expect(errors({note: 'x'.repeat(1500)})).toEqual({});
    expect(errors({note: 'x'.repeat(1501)})).toEqual({note: 'trips.create.errorNoteLong'});
  });
});

describe('planNameSchema', () => {
  const nameErrors = (name: string) => schemaErrors(planNameSchema, {name});

  it('accepts a name', () => {
    expect(nameErrors('Đà Lạt 3 ngày')).toEqual({});
    expect(nameErrors('x'.repeat(35))).toEqual({});
  });

  it.each(['', '   '])('needs a name (%j)', name => {
    expect(nameErrors(name)).toEqual({name: 'trips.generate.nameRequired'});
  });

  it('limits the name to 35 characters', () => {
    expect(nameErrors('x'.repeat(36))).toEqual({name: 'trips.generate.nameLong'});
  });
});
