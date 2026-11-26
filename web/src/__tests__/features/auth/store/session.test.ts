import {describe, expect, it} from 'vitest';
import {storage, StorageKeys} from '@/lib/storage';
import {
  clearSession,
  getAccessToken,
  getSession,
  getUser,
  homeRouteFor,
  saveSession,
  updateAccessToken,
  updateUser,
} from '@/features/auth/store/session';

const session = {
  message: 'Login successfully',
  accessToken: 'token-1',
  data: {username: 'lan', fullname: 'Lan', role: 'user' as const},
};

describe('session store', () => {
  it('is empty when signed out', () => {
    expect(getSession()).toBeNull();
    expect(getUser()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('saves the login response under the mobile app keys', () => {
    saveSession(session);

    expect(storage.getItem(StorageKeys.accessToken)).toBe('token-1');
    expect(JSON.parse(storage.getItem(StorageKeys.user)!)).toEqual(session);
    expect(getUser()).toEqual(session.data);
    expect(getAccessToken()).toBe('token-1');
  });

  it('reads the token from the session when the separate key is missing', () => {
    storage.setItem(StorageKeys.user, JSON.stringify(session));
    expect(getAccessToken()).toBe('token-1');
  });

  it('ignores corrupted stored JSON', () => {
    storage.setItem(StorageKeys.user, '{not json');
    expect(getSession()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it('updateAccessToken replaces the token in both places', () => {
    saveSession(session);

    updateAccessToken('token-2');

    expect(getAccessToken()).toBe('token-2');
    expect(getSession()).toEqual({...session, accessToken: 'token-2'});
  });

  it('updateAccessToken without session only stores the token', () => {
    updateAccessToken('token-3');

    expect(getAccessToken()).toBe('token-3');
    expect(getSession()).toBeNull();
  });

  it('updateUser merges profile changes, and does nothing when signed out', () => {
    updateUser({fullname: 'Nobody'});
    expect(getSession()).toBeNull();

    saveSession(session);
    updateUser({fullname: 'Lan Nguyễn', image: 'http://img'});

    expect(getUser()).toEqual({...session.data, fullname: 'Lan Nguyễn', image: 'http://img'});
  });

  it('clearSession signs out', () => {
    saveSession(session);
    storage.setItem(StorageKeys.userLocation, 'Quận 1');

    clearSession();

    expect(getSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(storage.getItem(StorageKeys.userLocation)).toBe('Quận 1');
  });

  it('homeRouteFor: the admin panel for an admin, the home page for everyone else', () => {
    expect(homeRouteFor({role: 'admin'})).toBe('/admin/dashboard');
    expect(homeRouteFor({role: 'user'})).toBe('/home');
    expect(homeRouteFor({username: 'no role'})).toBe('/home');
    expect(homeRouteFor(null)).toBe('/home');
    expect(homeRouteFor(undefined)).toBe('/home');
  });
});

describe('updateAccessToken with tokens of different accounts', () => {
  const jwt = (userId: string) => `h.${btoa(JSON.stringify({userId}))}.s`;

  it('keeps the token of the signed-in account when a late answer brings one of another account', async () => {
    const {saveSession, updateAccessToken, getAccessToken} = await import('@/features/auth/store/session');
    saveSession({message: 'ok', accessToken: jwt('new-user'), data: {username: 'thanhluan'}} as never);

    updateAccessToken(jwt('old-user'));
    expect(getAccessToken()).toBe(jwt('new-user'));

    updateAccessToken(jwt('new-user') + 'x'); // same account: refreshed normally
    expect(getAccessToken()).toBe(jwt('new-user') + 'x');
  });

  it('does not block a refreshed token it cannot read (no userId, or not a JWT)', async () => {
    const {saveSession, updateAccessToken, getAccessToken} = await import('@/features/auth/store/session');
    saveSession({message: 'ok', accessToken: jwt('new-user'), data: {username: 'thanhluan'}} as never);

    const noUser = `h.${btoa(JSON.stringify({sub: 'x'}))}.s`;
    updateAccessToken(noUser);
    expect(getAccessToken()).toBe(noUser);

    updateAccessToken('not-a-jwt');
    expect(getAccessToken()).toBe('not-a-jwt');
  });
});
