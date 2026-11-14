import {useTranslation} from 'react-i18next';
import Toast from '@/components/ui/Toast';
import {apiMessage} from '@/lib/apiClient';

// Toasts of the admin actions: `done("Saved")` after a success, `failed(error)`
// with the message of the backend after a failure.
export const useAdminToast = () => {
  const {t} = useTranslation();
  return {
    done: (message: string) => Toast.show({type: 'success', text1: message}),
    failed: (error: unknown) =>
      Toast.show({type: 'error', text1: t('admin.common.actionFailed'), text2: apiMessage(error) ?? t('admin.common.tryAgain')}),
  };
};
