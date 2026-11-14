import {useTranslation} from 'react-i18next';
import {IoRefreshOutline} from 'react-icons/io5';
import AdminFilter from '../components/AdminFilter';
import AdminSearch from '../components/AdminSearch';
import {adminButton, adminToolbar} from '../components/styles';
import {optionsOf, roleBadge, userStatusBadge} from '../status';
import {
  activeOptions,
  ALL,
  registeredOptions,
  sortOptions,
  type ActiveFilter,
  type RegisteredFilter,
  type UserFilters,
  type UserSort,
} from './userList';

// Search box, filters (role, status, registration date, last active), sort and
// "reset filters" of the user list. `text` is the search box, `filters.query`
// the debounced value the list uses.
export default function UserFilterBar({
  text,
  onText,
  filters,
  onChange,
  canReset,
  onReset,
}: {
  text: string;
  onText: (value: string) => void;
  filters: UserFilters;
  onChange: (patch: Partial<UserFilters>) => void;
  canReset: boolean;
  onReset: () => void;
}) {
  const {t} = useTranslation();
  const options = <V extends string>(values: V[], prefix: string) =>
    values.map(value => ({value, label: t(`admin.users.${prefix}.${value}`)}));

  return (
    <div className={adminToolbar}>
      <AdminSearch value={text} onChange={onText} placeholder={t('admin.users.search')} />
      <AdminFilter
        label={t('admin.users.columns.role')}
        value={filters.role}
        onChange={role => onChange({role})}
        options={[{value: ALL, label: t('admin.users.allRoles')}, ...optionsOf(roleBadge, t)]}
      />
      <AdminFilter
        label={t('admin.users.columns.status')}
        value={filters.status}
        onChange={status => onChange({status})}
        options={[{value: ALL, label: t('admin.common.allStatuses')}, ...optionsOf(userStatusBadge, t)]}
      />
      <AdminFilter
        label={t('admin.users.registrationDate')}
        value={filters.registered}
        onChange={value => onChange({registered: value as RegisteredFilter})}
        options={options(registeredOptions, 'registered')}
      />
      <AdminFilter
        label={t('admin.users.columns.lastActive')}
        value={filters.lastActive}
        onChange={value => onChange({lastActive: value as ActiveFilter})}
        options={options(activeOptions, 'lastActiveFilter')}
      />
      <AdminFilter
        label={t('admin.users.sortBy')}
        value={filters.sort}
        onChange={value => onChange({sort: value as UserSort})}
        options={options(sortOptions, 'sort')}
      />
      <button type="button" className={`${adminButton.secondary} sm:ml-auto`} onClick={onReset} disabled={!canReset}>
        <IoRefreshOutline size={16} aria-hidden />
        {t('admin.common.resetFilters')}
      </button>
    </div>
  );
}
