import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import {authApi} from '../api';
import {OtpScreen} from '../components';
import {useApiMutation} from '../hooks/useApiMutation';

// Confirms a new account with the code e-mailed after sign-up.
export default function Verify() {
  const {t} = useTranslation();
  const {email} = useRoute<any>().params as {email: string};
  const navigation = useNavigation<any>();

  const confirm = useApiMutation(
    (code: string) => authApi.confirmAccount(email, code),
    {
      onSuccess: () => navigation.replace('Login'),
    },
  );
  const resend = useApiMutation(() => authApi.resendCode(email));

  return (
    <OtpScreen
      message={t('auth.verify.sentTo', {email})}
      submitText={t('auth.verify.submit')}
      loading={confirm.isPending}
      error={confirm.errorMessage || resend.errorMessage}
      onSubmit={confirm.mutate}
      onResend={() => resend.mutate()}
    />
  );
}
