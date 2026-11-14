import {Formik} from 'formik';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useLocation, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {routes} from '@/app/routes';
import Field from '@/components/ui/Field';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {apiMessage, apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {authApi} from '../api/authApi';
import AuthShell, {AuthLink} from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';
import {homeRouteFor, saveSession} from '../store/session';
import {loginSchema} from '../validation';
import type {LoginInput} from '../types';

export default function LoginPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: session => {
      saveSession(session);
      queryClient.invalidateQueries({queryKey: ['profile']});
      Toast.show({type: 'success', text1: t('common.success'), text2: t('auth.login.success')});
      const from = (location.state as {from?: {pathname: string}})?.from?.pathname;
      // back to the page the user wanted, else the admin panel / home page
      navigate(from && from !== routes.Login ? from : homeRouteFor(session.data), {replace: true});
    },
    onError: error => {
      const status = apiStatus(error);
      let text = t('auth.login.failed');
      if (connectionErrorKey(error)) {
        text = t(connectionErrorKey(error)!);
      } else if (apiMessage(error) === 'Unverified account') {
        text = t('auth.login.unverified');
      } else if (status === 404 || status === 401) {
        text = t('auth.login.wrongCredentials');
      }
      Toast.show({type: 'error', text1: t('common.failed'), text2: text});
    },
  });

  return (
    <AuthShell
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <p>
          {t('auth.login.noAccount')}{' '}
          <AuthLink to={routes.Registration}>{t('auth.login.signUp')}</AuthLink>
        </p>
      }>
      <Formik
        initialValues={{username: '', password: ''}}
        validationSchema={loginSchema}
        onSubmit={values => login.mutate(values)}>
        {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label={t('auth.login.username')}
              htmlFor="username"
              error={touched.username && errors.username && t(errors.username)}>
              <input
                id="username"
                name="username"
                className="field"
                placeholder={t('auth.login.usernamePlaceholder')}
                autoComplete="username"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.username}
              />
            </Field>
            <Field
              label={t('auth.login.password')}
              htmlFor="password"
              error={touched.password && errors.password && t(errors.password)}
              aside={
                <AuthLink to={routes.ForgotPassword}>{t('auth.login.forgot')}</AuthLink>
              }>
              <PasswordInput
                id="password"
                name="password"
                placeholder={t('auth.login.passwordPlaceholder')}
                autoComplete="current-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={login.isPending}>
              {login.isPending && <Spinner size={18} color="#fff" />}
              {t('auth.login.submit')}
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
