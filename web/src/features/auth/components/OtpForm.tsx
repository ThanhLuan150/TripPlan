import {ReactNode} from 'react';
import FieldError from '@/components/ui/FieldError';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import {OTP_LENGTH, otpSchema} from '../validation';
import AuthShell from './AuthShell';
import OtpInput from './OtpInput';

// Shared screen for the two "enter the 6-digit code" steps
// (account verification, password reset).
export default function OtpForm({
  title,
  subtitle,
  hintIcon,
  hint,
  footer,
  onSubmit,
  onSuccess,
}: {
  title: string;
  subtitle: ReactNode;
  hintIcon: ReactNode;
  hint: string;
  footer: ReactNode;
  onSubmit: (code: string) => Promise<unknown>;
  onSuccess: () => void;
}) {
  const {t} = useTranslation();
  const formik = useFormik({
    initialValues: {otp: Array<string>(OTP_LENGTH).fill('')},
    validationSchema: otpSchema,
    onSubmit: async ({otp}) => {
      try {
        await onSubmit(otp.join(''));
        Toast.show({type: 'success', text1: t('common.success'), text2: t('auth.verify.success')});
        onSuccess();
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: t('common.failed'),
          text2: connectionErrorKey(error)
            ? t(connectionErrorKey(error)!)
            : apiStatus(error) === 401
              ? t('auth.verify.wrongCode')
              : t('auth.verify.failed'),
        });
      }
    },
  });
  const sending = formik.isSubmitting;
  const otpError = fieldError(formik, 'otp');

  return (
    <AuthShell title={title} subtitle={subtitle} footer={footer}>
      <form className="space-y-6" onSubmit={formik.handleSubmit} noValidate>
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800">
          <span className="shrink-0">{hintIcon}</span>
          {hint}
        </div>
        <OtpInput value={formik.values.otp} onChange={otp => formik.setFieldValue('otp', otp)} />
        <FieldError role="alert" className="-mt-3 justify-center">
          {otpError && t(otpError)}
        </FieldError>
        <button
          type="submit"
          className="btn btn-primary h-12 w-full text-base"
          disabled={sending}>
          {sending && <Spinner size={18} color="#fff" />}
          {t('auth.verify.submit')}
        </button>
      </form>
    </AuthShell>
  );
}

// "The code has been sent to <b>email</b>." with the email highlighted
export function SentTo({i18nKey, email}: {i18nKey: string; email: string | null}) {
  const {t} = useTranslation();
  const [before, after = ''] = t(i18nKey, {email: '\u0000'}).split('\u0000');
  return (
    <>
      {before}
      {email ? (
        <span className="font-semibold text-slate-700">{email}</span>
      ) : (
        t('auth.verify.yourEmail')
      )}
      {after}
    </>
  );
}
