import {Formik} from 'formik';
import {useMutation} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {routes} from '@/app/routes';
import Field from '@/components/ui/Field';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {apiBody, apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {storage, StorageKeys} from '@/lib/storage';
import {authApi} from '../api/authApi';
import AuthShell, {AuthLink} from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';
import {registerSchema} from '../validation';
import type {RegisterInput} from '../types';

export default function RegisterPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const register = useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: (_res, data) => {
      storage.setItem(StorageKeys.registeredEmail, data.email);
      Toast.show({type: 'success', text1: t('common.success'), text2: t('auth.register.success')});
      navigate(routes.VerifyAccount);
    },
    onError: error => {
      const body = apiBody<{message?: string; field?: string}>(error);
      let text = t('auth.register.failed');
      if (connectionErrorKey(error)) {
        text = t(connectionErrorKey(error)!);
      } else if (body?.field === 'email') {
        text = t('auth.register.emailTaken');
      } else if (body?.field === 'username') {
        text = t('auth.register.usernameTaken');
      } else if (apiStatus(error) === 401 && body?.message === 'Username or email already exist') {
        text = t('auth.register.exists');
      }
      Toast.show({type: 'error', text1: t('common.failed'), text2: text});
    },
  });

  const handleSignUp = (data: RegisterInput) => {
    if (data.confirmPassword === data.password) {
      register.mutate(data);
    } else {
      Toast.show({type: 'error', text1: t('common.failed'), text2: t('auth.register.passwordMismatch')});
    }
  };

  return (
    <AuthShell
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <p>
          {t('auth.register.haveAccount')}{' '}
          <AuthLink to={routes.Login}>{t('auth.register.signIn')}</AuthLink>
        </p>
      }>
      <Formik
        initialValues={{email: '', password: '', confirmPassword: '', username: ''}}
        validationSchema={registerSchema}
        onSubmit={values => handleSignUp(values)}>
        {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label={t('auth.register.email')}
              htmlFor="email"
              error={touched.email && errors.email && t(errors.email)}>
              <input
                id="email"
                name="email"
                type="email"
                className="field"
                placeholder={t('auth.register.emailPlaceholder')}
                autoComplete="email"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.email}
              />
            </Field>
            <Field
              label={t('auth.login.username')}
              htmlFor="username"
              error={touched.username && errors.username && t(errors.username)}>
              <input
                id="username"
                name="username"
                className="field"
                placeholder={t('auth.register.usernamePlaceholder')}
                autoComplete="username"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.username}
              />
            </Field>
            <Field
              label={t('auth.login.password')}
              htmlFor="password"
              error={touched.password && errors.password && t(errors.password)}>
              <PasswordInput
                id="password"
                name="password"
                placeholder={t('auth.register.passwordPlaceholder')}
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
            </Field>
            <Field
              label={t('auth.register.confirmPassword')}
              htmlFor="confirmPassword"
              error={
                touched.confirmPassword && errors.confirmPassword && t(errors.confirmPassword)
              }>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder={t('auth.register.confirmPlaceholder')}
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.confirmPassword}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={register.isPending}>
              {register.isPending && <Spinner size={18} color="#fff" />}
              {t('auth.register.submit')}
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
