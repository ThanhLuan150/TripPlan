import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import {api} from '@/lib/apiClient';
import {durationText, routeApi, stepText} from '@/features/trips/route';
import i18n from '@/lib/i18n';

const t = i18n.t.bind(i18n) as (key: string, options?: Record<string, unknown>) => string;

describe('routeApi', () => {
  let get: MockInstance<typeof api.get>;
  beforeEach(() => {
    get = vi.spyOn(api, 'get').mockResolvedValue({data: {distance: 1}} as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('asks the backend for the way between two positions', async () => {
    await expect(routeApi.get({latitude: 1, longitude: 2}, {latitude: 3, longitude: 4})).resolves.toEqual({distance: 1});

    expect(get).toHaveBeenCalledWith('/geo/route', {params: {fromLat: 1, fromLng: 2, toLat: 3, toLng: 4}});
  });
});

describe('stepText', () => {
  const step = (type: string, modifier = '', name = '') => ({type, modifier, name, distance: 10});

  it.each([
    [step('depart'), 'route.depart'],
    [step('arrive'), 'route.arrive'],
    [step('turn', 'left'), 'route.left'],
    [step('turn', 'right', 'Lê Lợi'), 'route.right'],
    [step('fork', 'slight left'), 'route.slightLeft'],
    [step('turn', 'sharp right'), 'route.sharpRight'],
    [step('continue', 'straight', 'Hai Bà Trưng'), 'route.straight'],
    [step('turn', 'uturn'), 'route.uturn'],
    [step('new name'), 'route.continue'],
    [step('roundabout'), 'route.roundabout'],
  ])('%j starts with %s', (value, key) => {
    expect(stepText(value, t).startsWith(t(key))).toBe(true);
  });

  it('adds the street name', () => {
    expect(stepText(step('turn', 'right', 'Lê Lợi'), t)).toBe(t('route.right') + ' ' + t('route.onto', {name: 'Lê Lợi'}));
    expect(stepText(step('continue', 'straight', 'Hai Bà Trưng'), t)).toBe(t('route.straight') + ' ' + t('route.along', {name: 'Hai Bà Trưng'}));
    expect(stepText(step('depart', 'right', 'Hẻm 69'), t)).toBe(t('route.departOn', {name: 'Hẻm 69'}));
    expect(stepText(step('roundabout', '', 'Điện Biên Phủ'), t)).toBe(t('route.roundaboutOnto', {name: 'Điện Biên Phủ'}));
  });
});

describe('durationText', () => {
  it('writes minutes, then hours and minutes', () => {
    expect(durationText(20, t)).toBe(t('route.minutes', {count: 1}));
    expect(durationText(1480, t)).toBe(t('route.minutes', {count: 25}));
    expect(durationText(3900, t)).toBe(t('route.hours', {hours: 1, minutes: 5}));
  });
});
