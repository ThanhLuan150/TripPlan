import type {Role} from '@/features/auth/types';
import {schemaErrors} from '@/lib/forms';
import type {AdminUser} from '../types';
import {createUserSchema, userSchema} from '../validation';

export interface UserFormValues {
  fullname: string;
  email: string;
  phone: string;
  role: Role;
}

// translation key of the error of each invalid field
export type UserFormErrors = Partial<Record<'fullname' | 'email' | 'phone', string>>;

export const toFormValues = (user: AdminUser): UserFormValues => ({
  fullname: user.fullname,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

// rules: userSchema (same as the backend, adminService.updateUser)
export const validateUserForm = (values: UserFormValues): UserFormErrors => schemaErrors(userSchema, values);

export interface CreateFormValues extends Omit<UserFormValues, 'role'> {
  username: string;
  password: string;
  role: UserFormValues['role'];
}

export type CreateFormErrors = Partial<Record<'fullname' | 'username' | 'email' | 'phone' | 'password', string>>;

export const emptyCreateForm: CreateFormValues = {fullname: '', username: '', email: '', phone: '', password: '', role: 'user'};

export const validateCreateForm = (values: CreateFormValues): CreateFormErrors => schemaErrors(createUserSchema, values);

// extra classes of an input whose value is invalid
export const invalidInput = (error?: string) =>
  error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : '';
