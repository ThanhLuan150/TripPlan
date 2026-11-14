import {adminRoutes, routes} from '@/app/routes';
import {storage, StorageKeys} from '@/lib/storage';
import type {SessionUser, StoredSession} from '../types';

// The signed-in user lives in localStorage (same keys as the mobile app);
// React Query's ['profile'] query reads it through useProfile().

const parse = (json: string | null): StoredSession | null => {
  if (!json) {
    return null;
  }
  try {
    return JSON.parse(json) as StoredSession;
  } catch {
    return null;
  }
};

export const getSession = (): StoredSession | null =>
  parse(storage.getItem(StorageKeys.user));

export const getUser = (): SessionUser | null => getSession()?.data ?? null;

// First screen after signing in: the admin panel for an admin, the home page
// for everyone else.
export const homeRouteFor = (user: SessionUser | null | undefined): string =>
  user?.role === 'admin' ? adminRoutes.dashboard : routes.Home;

export const getAccessToken = (): string | null =>
  storage.getItem(StorageKeys.accessToken) ?? getSession()?.accessToken ?? null;

export const saveSession = (session: StoredSession) => {
  storage.setItem(StorageKeys.accessToken, session.accessToken);
  storage.setItem(StorageKeys.user, JSON.stringify(session));
};

// The backend sends a new access token when the old one has expired.
export const updateAccessToken = (accessToken: string) => {
  const session = getSession();
  if (session) {
    saveSession({...session, accessToken});
  } else {
    storage.setItem(StorageKeys.accessToken, accessToken);
  }
};

export const updateUser = (changes: Partial<SessionUser>) => {
  const session = getSession();
  if (session) {
    saveSession({...session, data: {...session.data, ...changes}});
  }
};

export const clearSession = () =>
  storage.multiRemove([StorageKeys.user, StorageKeys.accessToken]);
