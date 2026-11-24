import {
  CHAT_ERROR,
  CHAT_SUCCESS,
  authApi,
  challengeApi,
  chatApi,
  contentApi,
  profileApi,
  rankingApi,
  tripsApi,
} from '../src/api';
import {api} from '../src/lib/apiClient';

const get = jest.spyOn(api, 'get');
const post = jest.spyOn(api, 'post');
const del = jest.spyOn(api, 'delete');
const reply = (data: unknown) => ({data} as any);

afterEach(() => {
  get.mockReset();
  post.mockReset();
  del.mockReset();
});

describe('authApi', () => {
  it('calls the auth endpoints', async () => {
    post.mockResolvedValue(reply({ok: 1}));
    await authApi.login({username: 'a', password: 'b'});
    await authApi.register({
      email: 'e',
      username: 'u',
      password: 'p',
      confirmPassword: 'p',
    });
    await authApi.confirmAccount('e', '123456');
    await authApi.resendCode('e');
    await authApi.forgotPassword('e');
    await authApi.verifyResetCode('e', '123456');
    await authApi.resetPassword('e', 'p', 'p');
    expect(post.mock.calls).toEqual([
      ['/auth/login', {username: 'a', password: 'b'}],
      [
        '/auth/register',
        {email: 'e', username: 'u', password: 'p', confirmPassword: 'p'},
      ],
      ['/auth/confirm-account', {email: 'e', code: '123456'}],
      ['/auth/refresh-verification', {email: 'e'}],
      ['/auth/forgot-password', {email: 'e'}],
      ['/auth/reset-password/123456', {email: 'e'}],
      [
        '/auth/reset-password/',
        {email: 'e', password: 'p', confirmPassword: 'p'},
      ],
    ]);
  });

  it('login returns the response body', async () => {
    post.mockResolvedValue(reply({accessToken: 't', data: {}}));
    await expect(
      authApi.login({username: 'a', password: 'b'}),
    ).resolves.toEqual({accessToken: 't', data: {}});
  });
});

describe('tripsApi', () => {
  const params = {
    location: 'Đà Nẵng',
    quantity: 2,
    budget: '1000000',
    budgetTier: 'mid' as const,
    areaTypes: ['Lịch sử'],
    days: 3,
    startDate: '2026-01-01',
    endDate: '2026-01-03',
    note: 'n',
  };

  it('generate maps the form to the backend body', async () => {
    post.mockResolvedValue(reply({data: {a: {}}}));
    await expect(tripsApi.generate(params)).resolves.toEqual({a: {}});
    expect(post).toHaveBeenCalledWith('/trip-plan/', {
      location: 'Đà Nẵng',
      numberOfPeople: 2,
      budget: '1000000',
      interest: ['Lịch sử'],
      userLocation: null,
      numberOfDay: 3,
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      note: 'n',
    });
  });

  it('generate returns null when there is no plan', async () => {
    post.mockResolvedValue(reply({}));
    await expect(tripsApi.generate(params)).resolves.toBeNull();
  });

  it('save posts the chosen days', async () => {
    post.mockResolvedValue(reply({tripId: 't1'}));
    await expect(tripsApi.save(params, 'My trip', [])).resolves.toEqual({
      tripId: 't1',
    });
    expect(post).toHaveBeenCalledWith('/trip-plan/save-trip', {
      jsonTrip: [],
      location: 'Đà Nẵng',
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      nameTrip: 'My trip',
    });
  });

  it('list / get / remove', async () => {
    get.mockResolvedValueOnce(reply({dataTrip: [{_id: '1'}]}));
    await expect(tripsApi.list()).resolves.toEqual([{_id: '1'}]);
    get.mockResolvedValueOnce(reply({}));
    await expect(tripsApi.list()).resolves.toEqual([]);
    get.mockResolvedValueOnce(reply({tripDatas: {location: 'x'}}));
    await expect(tripsApi.get('7')).resolves.toEqual({location: 'x'});
    expect(get).toHaveBeenLastCalledWith('/trip-plan/get-trip/7');
    del.mockResolvedValue(reply({message: 'deleted'}));
    await expect(tripsApi.remove('7')).resolves.toEqual({message: 'deleted'});
    expect(del).toHaveBeenCalledWith('/trip-plan/7');
  });

  it('favorites: list, add and remove use the favorite routes', async () => {
    get.mockResolvedValue(reply({dataTrip: [{_id: '7'}]}));
    post.mockResolvedValue(reply({isFavorite: true}));
    del.mockResolvedValue(reply({isFavorite: false}));
    await expect(tripsApi.favorites()).resolves.toEqual([{_id: '7'}]);
    await expect(tripsApi.addFavorite('7')).resolves.toEqual({isFavorite: true});
    await expect(tripsApi.removeFavorite('7')).resolves.toEqual({isFavorite: false});
    expect(get).toHaveBeenCalledWith('/trip-plan/favorites');
    expect(post).toHaveBeenCalledWith('/trip-plan/7/favorite');
    expect(del).toHaveBeenCalledWith('/trip-plan/7/favorite');
  });

  it('duplicate posts to the trip duplicate route', async () => {
    post.mockResolvedValue(reply({tripId: '8', nameTrip: 'x (bản sao)'}));
    await expect(tripsApi.duplicate('7')).resolves.toEqual({tripId: '8', nameTrip: 'x (bản sao)'});
    expect(post).toHaveBeenCalledWith('/trip-plan/7/duplicate');
  });
});

describe('rankingApi', () => {
  it('uses the right path per period', async () => {
    get.mockResolvedValue(reply({dataRanks: [{experience: 1}]}));
    await rankingApi.get('weekly');
    await rankingApi.get('monthly');
    await rankingApi.get('highest');
    expect(get.mock.calls.map(c => c[0])).toEqual([
      '/rankings/weekly',
      '/rankings/monthly',
      '/rankings/rankingUserHighest',
    ]);
  });

  it('returns [] without ranks', async () => {
    get.mockResolvedValue(reply({}));
    await expect(rankingApi.get('weekly')).resolves.toEqual([]);
  });
});

describe('contentApi / profileApi', () => {
  it('reads home and videos', async () => {
    get.mockResolvedValue(reply({banners: []}));
    await expect(contentApi.home()).resolves.toEqual({banners: []});
    await contentApi.videos();
    expect(get.mock.calls.map(c => c[0])).toEqual(['/home', '/videos']);
  });

  it('updates the profile and lists notifications', async () => {
    post.mockResolvedValue(reply({ok: true}));
    await profileApi.update({
      fullname: 'a',
      phone: '1',
      address: 'x',
      image: 'i',
    });
    expect(post.mock.calls[0][0]).toBe('/user/profile');
    get.mockResolvedValueOnce(reply([{id: '1'}]));
    await expect(profileApi.notifications()).resolves.toEqual([{id: '1'}]);
    get.mockResolvedValueOnce(reply(undefined));
    await expect(profileApi.notifications()).resolves.toEqual([]);
  });
});

describe('challengeApi', () => {
  it('checks and completes a challenge', async () => {
    post.mockResolvedValue(reply({distance: 5}));
    await expect(challengeApi.checkProgress('c', 1, 2)).resolves.toEqual({
      distance: 5,
    });
    await challengeApi.complete('c', 'url');
    expect(post.mock.calls).toEqual([
      ['/challenge/checkProgress', {chaId: 'c', lat: 1, lng: 2}],
      ['/challenge/updateProgress', {chaId: 'c', imageUrl: 'url'}],
    ]);
  });
});

describe('chatApi', () => {
  it('exports the backend status texts', () => {
    expect(CHAT_SUCCESS).toBe('Send message successfully');
    expect(CHAT_ERROR).toBeTruthy();
  });

  it('send / list / remove', async () => {
    post.mockResolvedValue(reply({message: CHAT_SUCCESS}));
    await chatApi.send('hi', null);
    expect(post).toHaveBeenCalledWith('/chat', {message: 'hi', idChat: null});
    get.mockResolvedValueOnce(reply({data: [{_id: '1'}]}));
    await expect(chatApi.list()).resolves.toEqual([{_id: '1'}]);
    get.mockResolvedValueOnce(reply({}));
    await expect(chatApi.list()).resolves.toEqual([]);
    del.mockResolvedValue(reply({}));
    await chatApi.remove('9');
    expect(del).toHaveBeenCalledWith('/chat/9');
  });

  it('messages returns the ready-made list when the backend sends one', async () => {
    const messages = [{role: 'user', text: 'a', createdAt: '2026-01-01'}];
    get.mockResolvedValue(reply({messages}));
    await expect(chatApi.messages('1')).resolves.toBe(messages);
  });

  it('messages merges questions and responses by time', async () => {
    get.mockResolvedValue(
      reply({
        questions: [
          {content: 'q1', createdAt: '2026-01-01T10:00:00Z'},
          {content: 'q2', createdAt: '2026-01-01T10:02:00Z'},
        ],
        responses: [{content: 'r1', createdAt: '2026-01-01T10:01:00Z'}],
      }),
    );
    const out = await chatApi.messages('1');
    expect(out.map(m => [m.role, m.text])).toEqual([
      ['user', 'q1'],
      ['model', 'r1'],
      ['user', 'q2'],
    ]);
  });

  it('messages is empty when the conversation has nothing', async () => {
    get.mockResolvedValue(reply({}));
    await expect(chatApi.messages('1')).resolves.toEqual([]);
  });
});
