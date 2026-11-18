import i18n from '../i18n';
import axios from 'axios';
import {API_URL} from './config';
import {clearSession, getAccessToken, updateAccessToken} from '../store/session';

// ngrok's free plan answers non-browser clients with an HTML warning page unless this header is sent.
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {'ngrok-skip-browser-warning': '1'},
});

let onUnauthorized: () => void = () => {};
export const setOnUnauthorized = (fn: () => void) => {
  onUnauthorized = fn;
};

api.interceptors.request.use(config => {
  const t = getAccessToken();
  if (t && !config.headers.Authorization) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  res => {
    const refreshed = res.headers.authorization as string | undefined;
    if (refreshed?.startsWith('Bearer ')) void updateAccessToken(refreshed.slice(7));
    return res;
  },
  async error => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    if (status === 401 && error?.config?.headers?.Authorization && !url.startsWith('/auth/')) {
      await clearSession();
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export const apiMessage = (e: unknown): string | undefined =>
  (e as {response?: {data?: {message?: string}}})?.response?.data?.message;

export const errorText = (e: unknown) =>
  apiMessage(e) ?? i18n.t((e as {response?: unknown})?.response ? 'common.error' : 'common.network');
