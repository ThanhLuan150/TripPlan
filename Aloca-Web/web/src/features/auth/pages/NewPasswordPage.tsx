import {Formik} from 'formik';
import {useMutation} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {routes} from '@/app/routes';
import Field from '@/components/ui/Field';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {apiMessage, apiStatus} from '@/lib/apiClient';
import {storage, StorageKeys} from '@/lib/storage';
import {authApi} from '../api/authApi';
import AuthShell, {AuthLink} from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';
import {newPasswordSchema} from '../validation';
import type {NewPasswordInput} from '../types';

// Step 3 of "forgot password". The backend only accepts it within 15 minutes
// after the code was verified.
export default function NewPasswordPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const reset = useMutation({
    mutationFn: (data: NewPasswordInput) =>
      authApi.resetPassword(storage.getItem(StorageKeys.resetEmail), data),
    onSuccess: () => {
      Toast.show({type: 'success', text1: t('common.success'), text2: t('auth.newPassword.success')});
      navigate(routes.Login);
    },
    onError: error => {
      let text = t('auth.newPassword.failed');
      if (apiMessage(error)?.startsWith('Please verify the code')) {
        text = t('auth.newPassword.expired');
      } else if (apiStatus(error) === 404) {
        text = t('auth.newPassword.wrongInfo');
      }
      Toast.show({type: 'error', text1: t('common.failed'), text2: text});
    },
  });

  const handleNewPassword = (data: NewPasswordInput) => {
    if (data.confirmPassword === data.password) {
      reset.mutate(data);
    } else {
      Toast.show({type: 'error', text1: t('common.failed'), text2: t('auth.newPassword.mismatch')});
    }
  };

  return (
    <AuthShell
      title={t('auth.newPassword.title')}
      subtitle={t('auth.newPassword.subtitle')}
      footer={
        <>
          <p>
            {t('auth.newPassword.remember')}{' '}
            <AuthLink to={routes.Login}>{t('auth.login.submit')}</AuthLink>
          </p>
          <p>
            {t('auth.login.noAccount')}{' '}
            <AuthLink to={routes.Registration}>{t('auth.login.signUp')}</AuthLink>
          </p>
        </>
      }>
      <Formik
        initialValues={{password: '', confirmPassword: ''}}
        validationSchema={newPasswordSchema}
        onSubmit={values => handleNewPassword(values)}>
        {({errors, touched, handleChange, handleBlur, handleSubmit, values}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label={t('auth.newPassword.password')}
              htmlFor="password"
              error={touched.password && errors.password && t(errors.password)}>
              <PasswordInput
                id="password"
                name="password"
                placeholder={t('auth.newPassword.passwordPlaceholder')}
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
            </Field>
            <Field
              label={t('auth.newPassword.confirm')}
              htmlFor="confirmPassword"
              error={
                touched.confirmPassword && errors.confirmPassword && t(errors.confirmPassword)
              }>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder={t('auth.newPassword.confirmPlaceholder')}
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.confirmPassword}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={reset.isPending}>
              {reset.isPending && <Spinner size={18} color="#fff" />}
              {t('auth.newPassword.submit')}
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
