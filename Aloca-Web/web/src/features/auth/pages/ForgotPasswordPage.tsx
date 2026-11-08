import {Formik} from 'formik';
import {useMutation} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Field from '@/components/ui/Field';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {storage, StorageKeys} from '@/lib/storage';
import {authApi} from '../api/authApi';
import AuthShell, {AuthLink} from '../components/AuthShell';
import {forgotPasswordSchema} from '../validation';

export default function ForgotPasswordPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const sendCode = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: (_res, email) => {
      storage.setItem(StorageKeys.resetEmail, email);
      Toast.show({type: 'success', text1: t('common.success'), text2: t('auth.forgot.sent')});
      navigate(routes.RefreshVerifyCode);
    },
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(connectionErrorKey(error) ?? 'auth.forgot.failed'),
      }),
  });

  return (
    <AuthShell
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <AuthLink to={routes.Login}>
          <span className="inline-flex items-center gap-1.5">
            <IoArrowBack size={16} />
            {t('auth.backToLogin')}
          </span>
        </AuthLink>
      }>
      <Formik
        validationSchema={forgotPasswordSchema}
        initialValues={{email: ''}}
        onSubmit={values => sendCode.mutate(values.email)}>
        {({errors, touched, handleChange, handleBlur, values, handleSubmit}) => (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label={t('auth.forgot.email')}
              htmlFor="email"
              error={touched.email && errors.email && t(errors.email)}>
              <input
                id="email"
                name="email"
                type="email"
                className="field"
                placeholder={t('auth.register.emailPlaceholder')}
                autoComplete="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary mt-2 h-12 w-full text-base"
              disabled={sendCode.isPending}>
              {sendCode.isPending && <Spinner size={18} color="#fff" />}
              {t('auth.forgot.submit')}
            </button>
          </form>
        )}
      </Formik>
    </AuthShell>
  );
}
