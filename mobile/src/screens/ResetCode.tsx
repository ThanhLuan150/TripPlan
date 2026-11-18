import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import {authApi} from '../api';
import {OtpScreen} from '../components';
import {useApiMutation} from '../hooks/useApiMutation';

// Step 2 of a password reset: the code sent to the e-mail.
export default function ResetCode() {
  const {t} = useTranslation();
  const {email} = useRoute<any>().params as {email: string};
  const navigation = useNavigation<any>();

  const check = useApiMutation((code: string) => authApi.verifyResetCode(email, code), {
    onSuccess: () => navigation.replace('NewPassword', {email}),
  });
  const resend = useApiMutation(() => authApi.forgotPassword(email));

  return (
    <OtpScreen
      message={t('auth.resetCode.sentTo', {email})}
      submitText={t('auth.verify.submit')}
      loading={check.isPending}
      error={check.errorMessage || resend.errorMessage}
      onSubmit={check.mutate}
      onResend={() => resend.mutate()}
    />
  );
}
