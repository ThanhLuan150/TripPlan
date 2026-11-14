import {useTranslation} from 'react-i18next';
import {IoCheckmarkCircleOutline, IoClose, IoDownloadOutline, IoPauseCircleOutline} from 'react-icons/io5';
import {adminButton} from '../components/styles';

// Appears above the table while accounts are selected.
export default function UserBulkBar({
  count,
  canSuspend,
  canReactivate,
  onExport,
  onSuspend,
  onReactivate,
  onClear,
}: {
  count: number;
  canSuspend: boolean;
  canReactivate: boolean;
  onExport: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onClear: () => void;
}) {
  const {t} = useTranslation();
  return (
    <div
      role="region"
      aria-label={t('admin.users.bulk.label')}
      className="flex flex-col gap-2 border-b border-brand-100 bg-brand-50/70 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <p role="status" className="text-sm font-medium text-brand-900 sm:mr-auto">
        {t('admin.users.bulk.selected', {count})}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={adminButton.secondary} onClick={onExport}>
          <IoDownloadOutline size={16} aria-hidden />
          {t('admin.users.bulk.export')}
        </button>
        <button type="button" className={adminButton.secondary} onClick={onSuspend} disabled={!canSuspend}>
          <IoPauseCircleOutline size={16} aria-hidden />
          {t('admin.users.bulk.suspend')}
        </button>
        <button type="button" className={adminButton.secondary} onClick={onReactivate} disabled={!canReactivate}>
          <IoCheckmarkCircleOutline size={16} aria-hidden />
          {t('admin.users.bulk.reactivate')}
        </button>
        <button type="button" className={adminButton.secondary} onClick={onClear}>
          <IoClose size={16} aria-hidden />
          {t('admin.users.bulk.clear')}
        </button>
      </div>
    </div>
  );
}
