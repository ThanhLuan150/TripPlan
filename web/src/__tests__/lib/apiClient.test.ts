import {AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig} from 'axios';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  api,
  apiBody,
  apiMessage,
  apiStatus,
  connectionErrorKey,
  isAiError,
  isNetworkError,
} from '@/lib/apiClient';
import {getAccessToken, getSession, saveSession} from '@/features/auth/store/session';

// Error shaped like the ones axios rejects with
const httpError = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`status ${status}`), {
    isAxiosError: true,
    response: {status, data},
  });
const networkError = () => Object.assign(new Error('Network Error'), {isAxiosError: true});

describe('error helpers', () => {
  it('read the backend { message } and status', () => {
    const err = httpError(400, {message: 'Missing trip data', code: 'X'});

    expect(apiMessage(err)).toBe('Missing trip data');
    expect(apiStatus(err)).toBe(400);
    expect(apiBody(err)).toEqual({message: 'Missing trip data', code: 'X'});
  });

  it('return undefined for errors without response', () => {
    expect(apiMessage(new Error('x'))).toBeUndefined();
    expect(apiStatus(undefined)).toBeUndefined();
    expect(apiBody(null)).toBeUndefined();
  });

  it('tell network errors apart from HTTP errors', () => {
    expect(isNetworkError(networkError())).toBe(true);
    expect(isNetworkError(httpError(500))).toBe(false);
    expect(isNetworkError(new Error('plain'))).toBe(false);
  });

  it('recognise AI failures by their AI_* code', () => {
    expect(isAiError(httpError(503, {code: 'AI_BUSY'}))).toBe(true);
    expect(isAiError(httpError(503, {code: 'IMAGE_TYPE'}))).toBe(false);
    expect(isAiError(httpError(503))).toBe(false);
  });

  it('map connection problems to an i18n key', () => {
    expect(connectionErrorKey(networkError())).toBe('common.networkError');
    expect(connectionErrorKey(httpError(503))).toBe('common.databaseError');
    expect(connectionErrorKey(httpError(400))).toBeNull();
  });
});

describe('api instance', () => {
  // Fake transport: records the request and answers with `reply`
  let sent: InternalAxiosRequestConfig[];
  let reply: (config: InternalAxiosRequestConfig) => Promise<unknown>;
  const originalAdapter = api.defaults.adapter;
  const assign = vi.fn();

  beforeEach(() => {
    sent = [];
    reply = async config => ({data: {}, status: 200, statusText: 'OK', headers: {}, config});
    api.defaults.adapter = (async config => {
      sent.push(config);
      return reply(config);
    }) as AxiosAdapter;
    vi.stubGlobal('location', {...window.location, pathname: '/home', assign});
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
  });

  const session = {accessToken: 'old-token', data: {username: 'lan'}};
  const reject401 = (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: {message: 'Invalid token'},
        headers: {},
        config,
      }),
    );

  it('uses VITE_API_URL as base URL', () => {
    expect(api.defaults.baseURL).toBe('http://api.test');
  });

  it('sends the stored access token', async () => {
    saveSession(session);

    await api.get('/trip-plan/get-trip');

    expect(sent[0].headers.Authorization).toBe('Bearer old-token');
  });

  it('sends no Authorization header when signed out', async () => {
    await api.get('/rankings/weekly');

    expect(sent[0].headers.Authorization).toBeUndefined();
  });

  it('keeps an Authorization header set by the caller', async () => {
    saveSession(session);

    await api.get('/x', {headers: {Authorization: 'Bearer explicit'}});

    expect(sent[0].headers.Authorization).toBe('Bearer explicit');
  });

  it('stores the new access token the backend sends back', async () => {
    saveSession(session);
    reply = async config => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {authorization: 'Bearer fresh-token'},
      config,
    });

    await api.get('/trip-plan/get-trip');

    expect(getAccessToken()).toBe('fresh-token');
    expect(getSession()?.accessToken).toBe('fresh-token');
  });

  it('signs out and goes to /login on a 401 of an authenticated call', async () => {
    saveSession(session);
    reply = reject401;

    await expect(api.get('/trip-plan/get-trip')).rejects.toBeInstanceOf(AxiosError);

    expect(getSession()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('does not sign out on a 401 of the auth routes (wrong password)', async () => {
    saveSession(session);
    reply = reject401;

    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);

    expect(getSession()).not.toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not redirect again when already on /login', async () => {
    saveSession(session);
    vi.stubGlobal('location', {...window.location, pathname: '/login', assign});
    reply = reject401;

    await expect(api.get('/chat')).rejects.toBeInstanceOf(AxiosError);

    expect(getSession()).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });
});
