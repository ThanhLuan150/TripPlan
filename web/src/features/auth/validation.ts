import * as Yup from 'yup';

// Messages are i18n keys; forms show them with t(error).

const username = Yup.string()
  .min(5, 'validation.usernameMin')
  .max(12, 'validation.usernameMax')
  .required('validation.usernameRequired');

const password = Yup.string()
  .min(6, 'validation.passwordMin')
  .max(20, 'validation.passwordMax')
  .required('validation.passwordRequired');

const confirmPassword = Yup.string()
  .min(6, 'validation.passwordMin')
  .max(20, 'validation.passwordMax')
  .required('validation.confirmRequired');

const email = Yup.string()
  .email('validation.emailInvalid')
  .required('validation.emailRequired');

export const loginSchema = Yup.object().shape({username, password});

export const registerSchema = Yup.object().shape({
  username,
  email,
  password,
  confirmPassword,
});

export const forgotPasswordSchema = Yup.object().shape({email});

export const newPasswordSchema = Yup.object().shape({password, confirmPassword});
