// Each feature API calls the right backend endpoint with the right body and
// unwraps the response.
import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import {api} from '@/lib/apiClient';
import {authApi} from '@/features/auth/api/authApi';
import {CHAT_ERROR, CHAT_SUCCESS, chatApi} from '@/features/assistant/api/chatApi';
import {profileApi} from '@/features/profile/api/profileApi';
import {homeApi} from '@/features/home/api';
import {videosApi} from '@/features/videos/api';
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

  it('notifications are the announcements the admin published', async () => {
    get.mockResolvedValue(reply([{id: 'a1', title: 'Bảo trì', message: 'Tối nay 22h', publishAt: '2026-01-01'}]));

    await expect(profileApi.notifications()).resolves.toEqual([{id: 'a1', name: 'Bảo trì', description: 'Tối nay 22h', publishAt: '2026-01-01'}]);
    expect(get).toHaveBeenCalledWith('/announcements');
  });
});

describe('homeApi', () => {
  it('reads the slider and the suggestions of the home page', async () => {
    get.mockResolvedValue(reply({banners: [], suggestions: []}));

    await expect(homeApi.get()).resolves.toEqual({banners: [], suggestions: []});
    expect(get).toHaveBeenCalledWith('/home');
  });
});

describe('videosApi', () => {
  it('lists every published video, or only those of the home page', async () => {
    get.mockResolvedValue(reply([{id: 'v1'}]));

    await expect(videosApi.list()).resolves.toEqual([{id: 'v1'}]);
    expect(get).toHaveBeenLastCalledWith('/videos', {params: undefined});
    await videosApi.list(true);
    expect(get).toHaveBeenLastCalledWith('/videos', {params: {home: 1}});
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

  it('favorites: list, add and remove use the favorite routes', async () => {
    get.mockResolvedValue(reply({dataTrip: [{_id: 't1'}]}));
    post.mockResolvedValue(reply({isFavorite: true}));
    del.mockResolvedValue(reply({isFavorite: false}));

    await expect(tripsApi.favorites()).resolves.toEqual([{_id: 't1'}]);
    await expect(tripsApi.addFavorite('t1')).resolves.toEqual({isFavorite: true});
    await expect(tripsApi.removeFavorite('t1')).resolves.toEqual({isFavorite: false});

    expect(get).toHaveBeenCalledWith('/trip-plan/favorites');
    expect(post).toHaveBeenCalledWith('/trip-plan/t1/favorite');
    expect(del).toHaveBeenCalledWith('/trip-plan/t1/favorite');
  });

  it('duplicate posts to the duplicate route', async () => {
    post.mockResolvedValue(reply({tripId: 't2', nameTrip: 'x (bản sao)'}));

    await expect(tripsApi.duplicate('t1')).resolves.toEqual({tripId: 't2', nameTrip: 'x (bản sao)'});
    expect(post).toHaveBeenCalledWith('/trip-plan/t1/duplicate');
  });

  it('exportPdf asks for the PDF as a blob in the chosen language', async () => {
    const blob = new Blob(['%PDF']);
    get.mockResolvedValue(reply(blob));

    await expect(tripsApi.exportPdf('t1', 'en')).resolves.toBe(blob);
    expect(get).toHaveBeenCalledWith('/trip-plan/t1/export-pdf', {params: {lang: 'en'}, responseType: 'blob'});
  });

  it('share status / enable / disable call the owner endpoints', async () => {
    const status = {isShared: true, permission: 'view', shareToken: 'tok', sharedAt: null};
    get.mockResolvedValue(reply(status));
    post.mockResolvedValue(reply(status));
    del.mockResolvedValue(reply({...status, isShared: false}));

    await expect(tripsApi.shareStatus('t1')).resolves.toEqual(status);
    await expect(tripsApi.enableShare('t1')).resolves.toEqual(status);
    await expect(tripsApi.disableShare('t1')).resolves.toMatchObject({isShared: false});
    expect(get).toHaveBeenCalledWith('/trip-plan/t1/share');
    expect(post).toHaveBeenCalledWith('/trip-plan/t1/share');
    expect(del).toHaveBeenCalledWith('/trip-plan/t1/share');
  });

  it('notes: list / add / update / remove call the owner endpoints and unwrap the note', async () => {
    const put = vi.spyOn(api, 'put');
    get.mockResolvedValue(reply({notes: [{_id: 'n1'}]}));
    post.mockResolvedValue(reply({note: {_id: 'n2'}}));
    put.mockResolvedValue(reply({note: {_id: 'n1', content: 'new'}}));
    del.mockResolvedValue(reply({message: 'ok'}));

    await expect(tripsApi.notes('t1')).resolves.toEqual([{_id: 'n1'}]);
    await expect(tripsApi.addNote('t1', 'hi')).resolves.toEqual({_id: 'n2'});
    await expect(tripsApi.updateNote('t1', 'n1', 'new')).resolves.toMatchObject({content: 'new'});
    await expect(tripsApi.removeNote('t1', 'n1')).resolves.toEqual({message: 'ok'});
    expect(get).toHaveBeenCalledWith('/trip-plan/t1/notes');
    expect(post).toHaveBeenCalledWith('/trip-plan/t1/notes', {content: 'hi'});
    expect(put).toHaveBeenCalledWith('/trip-plan/t1/notes/n1', {content: 'new'});
    expect(del).toHaveBeenCalledWith('/trip-plan/t1/notes/n1');
  });

  it('getShared reads the public endpoint and unwraps the trip', async () => {
    get.mockResolvedValue(reply({tripDatas: {location: 'Đà Lạt'}}));

    await expect(tripsApi.getShared('a_b-c')).resolves.toEqual({location: 'Đà Lạt'});
    expect(get).toHaveBeenCalledWith('/shared/a_b-c');
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
