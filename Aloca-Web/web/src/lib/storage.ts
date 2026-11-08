// localStorage wrapper (AsyncStorage on mobile). Never throws: storage can be
// unavailable in private windows or when site data is blocked.
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
};

// Keys shared with the mobile app
export const StorageKeys = {
  user: 'user',
  accessToken: 'AccessToken',
  userLocation: 'userLocation',
  welcomeShown: 'hasShownWelcomeScreen',
  registeredEmail: 'registeredEmail',
  resetEmail: 'emailResetPassword',
} as const;
