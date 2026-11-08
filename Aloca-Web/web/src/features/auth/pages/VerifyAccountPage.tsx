import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack, IoMailOpenOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import {storage, StorageKeys} from '@/lib/storage';
import {authApi} from '../api/authApi';
import {AuthLink} from '../components/AuthShell';
import OtpForm, {SentTo} from '../components/OtpForm';

// Step after sign-up: confirm the account with the emailed code.
export default function VerifyAccountPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const email = storage.getItem(StorageKeys.registeredEmail);

  return (
    <OtpForm
      title={t('auth.verify.title')}
      subtitle={<SentTo i18nKey="auth.verify.sentTo" email={email} />}
      hintIcon={<IoMailOpenOutline size={24} />}
      hint={t('auth.verify.hint')}
      footer={
        <AuthLink to={routes.Login}>
          <span className="inline-flex items-center gap-1.5">
            <IoArrowBack size={16} />
            {t('auth.backToLogin')}
          </span>
        </AuthLink>
      }
      onSubmit={code => authApi.confirmAccount(email, code)}
      onSuccess={() => navigate(routes.Login)}
    />
  );
}
