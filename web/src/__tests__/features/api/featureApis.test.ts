// Each feature API calls the right backend endpoint with the right body and
// unwraps the response.
import axios from 'axios';
import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import {api} from '@/lib/apiClient';
import {authApi} from '@/features/auth/api/authApi';
import {CHAT_ERROR, CHAT_SUCCESS, chatApi} from '@/features/assistant/api/chatApi';
import {profileApi} from '@/features/profile/api/profileApi';
import {rankingApi} from '@/features/ranking/api/rankingApi';
import {challengeApi, tripsApi} from '@/features/trips/api/tripsApi';
import type {GenerateTripParams} from '@/features/trips/types';

const reply = (data: unknown) => ({data}) as never;
let get: MockInstance<typeof api.get>;
let post: MockInstance<typeof api.post>;
let del: MockInstance<typeof api.delete>;

beforeEach(() => {
  get = vi.spyOn(api, 'get');
  post = vi.spyOn(api, 'post');
  del = vi.spyOn(api, 'delete');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authApi', () => {
  it('login', async () => {
    post.mockResolvedValue(reply({accessToken: 't', data: {}}));

    await expect(authApi.login({username: 'lan', password: 'x'})).resolves.toEqual({accessToken: 't', data: {}});
    expect(post).toHaveBeenCalledWith('/auth/login', {username: 'lan', password: 'x'});
  });

  it('register / confirm / forgot / verify / reset', async () => {
    post.mockResolvedValue(reply({message: 'ok'}));
    const register = {email: 'a@b.vn', username: 'lan', password: 'x', confirmPassword: 'x'};

    await authApi.register(register);
    await authApi.confirmAccount('a@b.vn', '123456');
    await authApi.forgotPassword('a@b.vn');
    await authApi.verifyResetCode('a@b.vn', '654321');
    await expect(authApi.resetPassword('a@b.vn', {password: 'n', confirmPassword: 'n'})).resolves.toEqual({message: 'ok'});

    expect(post.mock.calls).toEqual([
      ['/auth/register', register],
      ['/auth/confirm-account', {email: 'a@b.vn', code: '123456'}],
      ['/auth/forgot-password', {email: 'a@b.vn'}],
      ['/auth/reset-password/654321', {email: 'a@b.vn'}],
      ['/auth/reset-password/', {password: 'n', confirmPassword: 'n', email: 'a@b.vn'}],
    ]);
  });
});

describe('chatApi', () => {
  it('exposes the backend messages it compares with', () => {
    expect(CHAT_SUCCESS).toBe('Send message successfully');
    expect(CHAT_ERROR).toContain('Đã xảy ra lỗi');
  });

  it('send', async () => {
    post.mockResolvedValue(reply({message: CHAT_SUCCESS}));

    await expect(chatApi.send('hi', 'c1')).resolves.toEqual({message: CHAT_SUCCESS});
    expect(post).toHaveBeenCalledWith('/chat', {message: 'hi', idChat: 'c1'});
  });

  it('list (empty when the backend sends nothing)', async () => {
    get.mockResolvedValueOnce(reply({data: [{_id: 'c1'}]})).mockResolvedValueOnce(reply({}));

    await expect(chatApi.list()).resolves.toEqual([{_id: 'c1'}]);
    await expect(chatApi.list()).resolves.toEqual([]);
    expect(get).toHaveBeenCalledWith('/chat');
  });

  it('messages: the ordered timeline of the current backend', async () => {
    const messages = [{role: 'user', text: 'Q', createdAt: '2026-01-01T10:00:00Z'}];
    get.mockResolvedValue(reply({messages}));

    await expect(chatApi.messages('c1')).resolves.toBe(messages);
    expect(get).toHaveBeenCalledWith('/chat/c1');
  });

  it('messages: merges questions / responses of an older backend by time', async () => {
    get.mockResolvedValue(
      reply({
        questions: [
          {content: 'Q1', createdAt: '2026-01-01T10:00:00Z'},
          {content: 'Q2', createdAt: '2026-01-01T10:02:00Z'},
        ],
        responses: [{content: 'A1', createdAt: '2026-01-01T10:01:00Z'}],
      }),
    );

    const result = await chatApi.messages('c1');

    expect(result.map(m => `${m.role}:${m.text}`)).toEqual(['user:Q1', 'model:A1', 'user:Q2']);
  });

  it('messages: nothing at all', async () => {
    get.mockResolvedValue(reply({}));
    await expect(chatApi.messages('c1')).resolves.toEqual([]);
  });

  it('remove', async () => {
    del.mockResolvedValue(reply({message: 'deleted'}));

    await expect(chatApi.remove('c1')).resolves.toEqual({message: 'deleted'});
    expect(del).toHaveBeenCalledWith('/chat/c1');
  });
});

describe('profileApi', () => {
  it('update', async () => {
    post.mockResolvedValue(reply({message: 'ok'}));
    const data = {fullname: 'Lan', phone: '0901234567', address: 'HN', image: 'http://img'};

    await profileApi.update(data);
    expect(post).toHaveBeenCalledWith('/user/profile', data);
  });

  it('notifications come from the demo mock API (not the backend)', async () => {
    const axiosGet = vi.spyOn(axios, 'get').mockResolvedValue({data: [{id: 1, name: 'n', description: 'd'}]});

    await expect(profileApi.notifications()).resolves.toEqual([{id: 1, name: 'n', description: 'd'}]);
    expect(axiosGet.mock.calls[0][0]).toMatch(/^https:\/\/.*mockapi\.io\//);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('rankingApi', () => {
  it.each([
    ['weekly', '/rankings/weekly'],
    ['monthly', '/rankings/monthly'],
    ['highest', '/rankings/rankingUserHighest'],
  ] as const)('%s -> %s', async (period, path) => {
    get.mockResolvedValue(reply({dataRanks: [{experience: 1}]}));

    await expect(rankingApi.get(period)).resolves.toEqual([{experience: 1}]);
    expect(get).toHaveBeenCalledWith(path);
  });

  it('returns an empty list without data', async () => {
    get.mockResolvedValue(reply({}));
    await expect(rankingApi.get('weekly')).resolves.toEqual([]);
  });
});

describe('tripsApi / challengeApi', () => {
  const params: GenerateTripParams = {
    location: 'Lâm Đồng',
    quantity: 2,
    budget: 'Dưới 2.000.000 VND',
    budgetTier: 'low',
    areaTypes: ['Lịch sử'],
    userLocation: 'Quận 1',
    days: 3,
    startDate: '2026-03-02T00:00:00.000Z',
    endDate: '2026-03-04T00:00:00.000Z',
    note: 'Hồ Xuân Hương',
  };

  it('list / get / remove', async () => {
    get.mockResolvedValueOnce(reply({dataTrip: [{_id: 't1'}]})).mockResolvedValueOnce(reply({tripDatas: {location: 'x'}}));
    del.mockResolvedValue(reply({message: 'deleted'}));

    await expect(tripsApi.list()).resolves.toEqual([{_id: 't1'}]);
    await expect(tripsApi.get('t1')).resolves.toEqual({location: 'x'});
    await tripsApi.remove('t1');

    expect(get.mock.calls).toEqual([['/trip-plan/get-trip'], ['/trip-plan/get-trip/t1']]);
    expect(del).toHaveBeenCalledWith('/trip-plan/t1');
  });

  it('generate maps the form to the backend fields', async () => {
    post.mockResolvedValue(reply({data: {plan1: {}}}));

    await expect(tripsApi.generate(params)).resolves.toEqual({plan1: {}});
    expect(post).toHaveBeenCalledWith('/trip-plan/', {
      location: 'Lâm Đồng',
      numberOfPeople: 2,
      budget: 'Dưới 2.000.000 VND',
      interest: ['Lịch sử'],
      userLocation: 'Quận 1',
      numberOfDay: 3,
      startDate: params.startDate,
      endDate: params.endDate,
      note: 'Hồ Xuân Hương',
    });
  });

  it('generate returns null without plans', async () => {
    post.mockResolvedValue(reply({message: 'An error occurred'}));
    await expect(tripsApi.generate(params)).resolves.toBeNull();
  });

  it('save sends the chosen days', async () => {
    post.mockResolvedValue(reply({tripId: 't9'}));
    const days = [{title: 'Ngày 1'}];

    await expect(tripsApi.save(params, 'Đà Lạt', days)).resolves.toEqual({tripId: 't9'});
    expect(post).toHaveBeenCalledWith('/trip-plan/save-trip', {
      jsonTrip: days,
      location: 'Lâm Đồng',
      startDate: params.startDate,
      endDate: params.endDate,
      nameTrip: 'Đà Lạt',
    });
  });

  it('checkProgress / complete', async () => {
    post.mockResolvedValueOnce(reply({distance: 40, message: 'ok'})).mockResolvedValueOnce(reply({message: 'done'}));

    await expect(challengeApi.checkProgress('c1', 11.9, 108.4)).resolves.toEqual({distance: 40, message: 'ok'});
    await challengeApi.complete('c1', 'http://img');

    expect(post.mock.calls).toEqual([
      ['/challenge/checkProgress', {chaId: 'c1', lat: 11.9, lng: 108.4}],
      ['/challenge/updateProgress', {chaId: 'c1', imageUrl: 'http://img'}],
    ]);
  });
});
