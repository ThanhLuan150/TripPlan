import {useTranslation} from 'react-i18next';
import {IoSearchOutline} from 'react-icons/io5';
import AdminEmptyState from './AdminEmptyState';
import {adminButton} from './styles';

// Empty state of a filtered list, with a button that clears search + filters.
export default function NoResults({onReset}: {onReset: () => void}) {
  const {t} = useTranslation();
  return (
    <AdminEmptyState
      icon={IoSearchOutline}
      title={t('admin.common.noResults')}
      description={t('admin.common.noResultsHint')}
      action={
        <button type="button" className={adminButton.secondary} onClick={onReset}>
          {t('admin.common.resetFilters')}
        </button>
      }
    />
  );
}
