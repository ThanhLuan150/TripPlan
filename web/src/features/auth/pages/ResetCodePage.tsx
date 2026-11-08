import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack, IoShieldCheckmarkOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import {storage, StorageKeys} from '@/lib/storage';
import {authApi} from '../api/authApi';
import {AuthLink} from '../components/AuthShell';
import OtpForm, {SentTo} from '../components/OtpForm';

// Step 2 of "forgot password": check the emailed code.
export default function ResetCodePage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const email = storage.getItem(StorageKeys.resetEmail);

  return (
    <OtpForm
      title={t('auth.resetCode.title')}
      subtitle={<SentTo i18nKey="auth.resetCode.sentTo" email={email} />}
      hintIcon={<IoShieldCheckmarkOutline size={24} />}
      hint={t('auth.resetCode.hint')}
      footer={
        <AuthLink to={routes.ForgotPassword}>
          <span className="inline-flex items-center gap-1.5">
            <IoArrowBack size={16} />
            {t('auth.resetCode.resend')}
          </span>
        </AuthLink>
      }
      onSubmit={code => authApi.verifyResetCode(email, code)}
      onSuccess={() => navigate(routes.NewPassword)}
    />
  );
}
