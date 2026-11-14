import {describe, expect, it} from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  registerSchema,
} from '@/features/auth/validation';

// i18n key of the first error, or null when valid
const firstError = (schema: {validateSync: (v: unknown) => unknown}, value: unknown) => {
  try {
    schema.validateSync(value);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    expect(firstError(loginSchema, {username: 'traveler', password: 'secret1'})).toBeNull();
  });

  it.each([
    [{username: 'abc', password: 'secret1'}, 'validation.usernameMin'],
    [{username: 'a'.repeat(13), password: 'secret1'}, 'validation.usernameMax'],
    [{password: 'secret1'}, 'validation.usernameRequired'],
    [{username: 'traveler', password: '12345'}, 'validation.passwordMin'],
    [{username: 'traveler', password: 'x'.repeat(21)}, 'validation.passwordMax'],
    [{username: 'traveler'}, 'validation.passwordRequired'],
  ])('%j -> %s', (value, key) => {
    expect(firstError(loginSchema, value)).toBe(key);
  });
});

describe('registerSchema', () => {
  const valid = {username: 'traveler', email: 'a@b.vn', password: 'secret1', confirmPassword: 'secret1'};

  it('accepts a valid registration', () => {
    expect(firstError(registerSchema, valid)).toBeNull();
  });

  it('checks the email and the confirmation', () => {
    expect(firstError(registerSchema, {...valid, email: 'not-an-email'})).toBe('validation.emailInvalid');
    expect(firstError(registerSchema, {...valid, email: ''})).toBe('validation.emailRequired');
    expect(firstError(registerSchema, {...valid, confirmPassword: undefined})).toBe('validation.confirmRequired');
    // Yup runs the rules in order: an empty string fails `min` first
    expect(firstError(registerSchema, {...valid, confirmPassword: ''})).toBe('validation.passwordMin');
  });
});

describe('forgot / new password schemas', () => {
  it('forgotPasswordSchema needs a valid email', () => {
    expect(firstError(forgotPasswordSchema, {email: 'a@b.vn'})).toBeNull();
    expect(firstError(forgotPasswordSchema, {email: 'a@'})).toBe('validation.emailInvalid');
  });

  it('newPasswordSchema needs both fields', () => {
    expect(firstError(newPasswordSchema, {password: 'secret1', confirmPassword: 'secret1'})).toBeNull();
    expect(firstError(newPasswordSchema, {password: 'secret1'})).toBe('validation.confirmRequired');
  });
});

describe('error keys', () => {
  it('all exist in the translations', async () => {
    const {default: vi} = await import('@/locales/vi.json');
    const used = [
      'usernameMin', 'usernameMax', 'usernameRequired', 'passwordMin', 'passwordMax',
      'passwordRequired', 'confirmRequired', 'emailInvalid', 'emailRequired',
    ];
    for (const key of used) {
      expect((vi as {validation: Record<string, string>}).validation[key], key).toBeTruthy();
    }
  });
});
