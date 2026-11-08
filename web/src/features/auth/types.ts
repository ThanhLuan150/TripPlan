export type Role = 'user' | 'admin';

export interface SessionUser {
  username?: string;
  email?: string;
  fullname?: string;
  phone?: string | number;
  address?: string;
  image?: string;
  experience?: number;
  role?: Role;
  [key: string]: unknown;
}

// Response of POST /auth/login, kept as-is in storage
export interface StoredSession {
  message?: string;
  accessToken: string;
  data: SessionUser;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface NewPasswordInput {
  password: string;
  confirmPassword: string;
}
