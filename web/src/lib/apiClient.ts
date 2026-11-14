import axios from 'axios';
import {routes} from '@/app/routes';
import {API_URL} from './config';
import {
  clearSession,
  getAccessToken,
  updateAccessToken,
} from '@/features/auth/store/session';

// Shared axios instance for the Aloca backend.
export const api = axios.create({baseURL: API_URL});

// Send the access token when signed in.
api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => {
    // expired access token + valid refresh token -> the backend returns a new one
    const refreshed = response.headers.authorization as string | undefined;
    if (refreshed?.startsWith('Bearer ')) {
      updateAccessToken(refreshed.slice(7));
    }
    return response;
  },
  error => {
    // session expired / account gone: signed out, back to the landing page
    // (same place as a manual logout)
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    const sentToken = !!error?.config?.headers?.Authorization;
    if (status === 401 && sentToken && !url.startsWith('/auth/')) {
      clearSession();
      if (window.location.pathname !== routes.LandingPage) {
        window.location.assign(routes.LandingPage);
      }
    }
    return Promise.reject(error);
  },
);

// Message returned by the backend ({ message }) if any
export const apiMessage = (error: unknown): string | undefined =>
  (error as {response?: {data?: {message?: string}}})?.response?.data?.message;

export const apiStatus = (error: unknown): number | undefined =>
  (error as {response?: {status?: number}})?.response?.status;

// Body of the error response ({ message, ...extra })
export const apiBody = <T = Record<string, unknown>>(error: unknown): T | undefined =>
  (error as {response?: {data?: T}})?.response?.data;

// The request never got an answer (backend down, wrong VITE_API_URL, CORS...)
export const isNetworkError = (error: unknown) =>
  !!(error as {isAxiosError?: boolean})?.isAxiosError && !apiStatus(error);

// The backend could not get an answer from the AI (Gemini) service
export const isAiError = (error: unknown) =>
  !!apiBody<{code?: string}>(error)?.code?.startsWith('AI_');

// i18n key for "can't reach the backend / its database", or null for other errors
export const connectionErrorKey = (error: unknown): string | null => {
  if (isNetworkError(error)) {
    return 'common.networkError';
  }
  if (apiStatus(error) === 503) {
    return 'common.databaseError';
  }
  return null;
};
