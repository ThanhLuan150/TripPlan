import type {AxiosRequestConfig, AxiosResponse} from 'axios';
import {
  api,
  apiMessage,
  errorText,
  setOnUnauthorized,
} from '../src/lib/apiClient';
import {clearSession, getAccessToken, saveSession} from '../src/store/session';

type Reply = Partial<AxiosResponse> & {status: number};

// Replaces the network: the adapter answers with `reply` (2xx resolves, others reject like axios).
const respondWith = (reply: Reply) => {
  const seen: AxiosRequestConfig[] = [];
  api.defaults.adapter = async config => {
    seen.push(config);
    const res = {data: {}, headers: {}, statusText: '', config, ...reply};
    if (reply.status >= 200 && reply.status < 300) {
      return res as AxiosResponse;
    }
    const err: any = new Error(`status ${reply.status}`);
    err.config = config;
    err.response = res;
    throw err;
  };
  return seen;
};

beforeEach(async () => {
  await clearSession();
  setOnUnauthorized(() => {});
});

describe('request interceptor', () => {
  it('sends no Authorization without a session', async () => {
    const seen = respondWith({status: 200});
    await api.get('/home');
    expect(seen[0].headers?.Authorization).toBeUndefined();
  });

  it('sends the saved token as Bearer', async () => {
    await saveSession({accessToken: 'abc', data: {}});
    const seen = respondWith({status: 200});
    await api.get('/home');
    expect(seen[0].headers?.Authorization).toBe('Bearer abc');
  });

  it('keeps an Authorization the caller set', async () => {
    await saveSession({accessToken: 'abc', data: {}});
    const seen = respondWith({status: 200});
    await api.get('/home', {headers: {Authorization: 'Bearer other'}});
    expect(seen[0].headers?.Authorization).toBe('Bearer other');
  });
});

describe('response interceptor', () => {
  it('stores a refreshed access token', async () => {
    await saveSession({accessToken: 'old', data: {}});
    respondWith({status: 200, headers: {authorization: 'Bearer fresh'}});
    await api.get('/home');
    expect(getAccessToken()).toBe('fresh');
  });

  it('ignores an Authorization header that is not a Bearer token', async () => {
    await saveSession({accessToken: 'old', data: {}});
    respondWith({status: 200, headers: {authorization: 'Basic x'}});
    await api.get('/home');
    expect(getAccessToken()).toBe('old');
  });

  it('on 401 of a signed-in request clears the session and signs out', async () => {
    const out = jest.fn();
    setOnUnauthorized(out);
    await saveSession({accessToken: 'abc', data: {}});
    respondWith({status: 401});
    await expect(api.get('/trip-plan/get-trip')).rejects.toBeTruthy();
    expect(getAccessToken()).toBeNull();
    expect(out).toHaveBeenCalledTimes(1);
  });

  it('on 401 of an /auth/ call (wrong password) keeps the session', async () => {
    const out = jest.fn();
    setOnUnauthorized(out);
    await saveSession({accessToken: 'abc', data: {}});
    respondWith({status: 401});
    await expect(api.post('/auth/login', {})).rejects.toBeTruthy();
    expect(getAccessToken()).toBe('abc');
    expect(out).not.toHaveBeenCalled();
  });

  it('on 401 without a token does not sign out', async () => {
    const out = jest.fn();
    setOnUnauthorized(out);
    respondWith({status: 401});
    await expect(api.get('/home')).rejects.toBeTruthy();
    expect(out).not.toHaveBeenCalled();
  });

  it('passes other errors through', async () => {
    respondWith({status: 500});
    await expect(api.get('/home')).rejects.toMatchObject({
      response: {status: 500},
    });
  });
});

describe('error helpers', () => {
  it('apiMessage reads the backend message', () => {
    expect(apiMessage({response: {data: {message: 'Nope'}}})).toBe('Nope');
    expect(apiMessage({response: {data: {}}})).toBeUndefined();
    expect(apiMessage(undefined)).toBeUndefined();
  });

  it('errorText prefers the backend message', () => {
    expect(errorText({response: {data: {message: 'Nope'}}})).toBe('Nope');
  });

  it('errorText falls back to a generic or a network message', () => {
    const generic = errorText({response: {data: {}}});
    const network = errorText(new Error('Network Error'));
    expect(generic).toBeTruthy();
    expect(network).toBeTruthy();
    expect(generic).not.toBe(network);
  });
});
