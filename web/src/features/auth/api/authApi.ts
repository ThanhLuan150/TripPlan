import {api} from '@/lib/apiClient';
import type {
  LoginInput,
  NewPasswordInput,
  RegisterInput,
  StoredSession,
} from '../types';

export const authApi = {
  // No FCM token on the web (push notifications are mobile-only).
  login: async (data: LoginInput) =>
    (await api.post<StoredSession>('/auth/login', data)).data,

  register: async (data: RegisterInput) =>
    (await api.post('/auth/register', data)).data,

  confirmAccount: async (email: string | null, code: string) =>
    (await api.post('/auth/confirm-account', {email, code})).data,

  forgotPassword: async (email: string) =>
    (await api.post('/auth/forgot-password', {email})).data,

  verifyResetCode: async (email: string | null, code: string) =>
    (await api.post(`/auth/reset-password/${code}`, {email})).data,

  resetPassword: async (email: string | null, data: NewPasswordInput) =>
    (await api.post('/auth/reset-password/', {...data, email})).data,
};
