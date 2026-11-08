// Web replacement for @react-native-async-storage/async-storage.
// Same keys as the mobile app: 'user', 'AccessToken', 'userLocation',
// 'hasShownWelcomeScreen', 'registeredEmail', 'emailResetPassword'.

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const storage = {
  getItem: (key: string): string | null =>
    safe(() => window.localStorage.getItem(key), null),
  setItem: (key: string, value: string) =>
    safe(() => window.localStorage.setItem(key, value), undefined),
  removeItem: (key: string) =>
    safe(() => window.localStorage.removeItem(key), undefined),
  multiRemove: (keys: string[]) => keys.forEach(k => storage.removeItem(k)),
  clear: () => safe(() => window.localStorage.clear(), undefined),
};

export interface StoredUser {
  message?: string;
  accessToken: string;
  data: {
    username?: string;
    email?: string;
    fullname?: string;
    phone?: string | number;
    address?: string;
    image?: string;
    experience?: number;
    [key: string]: unknown;
  };
}

export const getUser = (): StoredUser | null => {
  const json = storage.getItem('user');
  return json ? safe(() => JSON.parse(json) as StoredUser, null) : null;
};

export const setUser = (user: StoredUser) =>
  storage.setItem('user', JSON.stringify(user));

export const getAccessToken = (): string | null =>
  storage.getItem('AccessToken') ?? getUser()?.accessToken ?? null;
