import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext, useContext} from 'react';

export interface SessionUser {
  username?: string;
  email?: string;
  fullname?: string;
  phone?: string | number;
  address?: string;
  image?: string;
  experience?: number;
  role?: 'user' | 'admin';
}
export interface StoredSession {
  accessToken: string;
  data: SessionUser;
}

const TOKEN = 'AccessToken';
const USER = 'user';

// In-memory copy so the axios interceptor can read the token synchronously.
let token: string | null = null;
export const getAccessToken = () => token;

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const [t, u] = await Promise.all([AsyncStorage.getItem(TOKEN), AsyncStorage.getItem(USER)]);
    if (!t || !u) return null;
    token = t;
    return {accessToken: t, data: JSON.parse(u)};
  } catch {
    return null;
  }
}

export async function saveSession(s: StoredSession) {
  token = s.accessToken;
  await AsyncStorage.setItem(TOKEN, s.accessToken);
  await AsyncStorage.setItem(USER, JSON.stringify(s.data));
}

export async function updateAccessToken(t: string) {
  token = t;
  await AsyncStorage.setItem(TOKEN, t);
}

export async function clearSession() {
  token = null;
  await Promise.all([AsyncStorage.removeItem(TOKEN), AsyncStorage.removeItem(USER)]);
}

export interface AuthContextValue {
  user: SessionUser | null;
  signIn: (s: StoredSession) => Promise<void>;
  signOut: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  signIn: async () => {},
  signOut: async () => {},
});
export const useAuth = () => useContext(AuthContext);
