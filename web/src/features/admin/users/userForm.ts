import type {Role} from '@/features/auth/types';
import type {AdminUser} from '../types';

export interface UserFormValues {
  fullname: string;
  email: string;
  phone: string;
  role: Role;
}

// translation key of the error of each invalid field
export type UserFormErrors = Partial<Record<'fullname' | 'email' | 'phone', string>>;

// same rules as the backend (adminService.updateUser)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\s().-]{6,20}$/;

export const toFormValues = (user: AdminUser): UserFormValues => ({
  fullname: user.fullname,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

export const validateUserForm = ({fullname, email, phone}: UserFormValues): UserFormErrors => {
  const errors: UserFormErrors = {};
  if (!fullname.trim()) {
    errors.fullname = 'admin.users.errors.fullnameRequired';
  } else if (fullname.trim().length > 100) {
    errors.fullname = 'admin.users.errors.fullnameLong';
  }
  if (!email.trim()) {
    errors.email = 'admin.users.errors.emailRequired';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'admin.users.errors.emailInvalid';
  }
  if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) {
    errors.phone = 'admin.users.errors.phoneInvalid';
  }
  return errors;
};

export interface CreateFormValues extends Omit<UserFormValues, 'role'> {
  username: string;
  password: string;
  role: UserFormValues['role'];
}

export type CreateFormErrors = Partial<Record<'fullname' | 'username' | 'email' | 'phone' | 'password', string>>;

export const emptyCreateForm: CreateFormValues = {fullname: '', username: '', email: '', phone: '', password: '', role: 'user'};

export const validateCreateForm = (values: CreateFormValues): CreateFormErrors => {
  const errors: CreateFormErrors = {...validateUserForm(values)};
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(values.username.trim())) {
    errors.username = 'admin.users.errors.usernameInvalid';
  }
  if (values.password.length < 8) {
    errors.password = 'admin.users.errors.passwordShort';
  }
  return errors;
};

// extra classes of an input whose value is invalid
export const invalidInput = (error?: string) =>
  error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : '';
