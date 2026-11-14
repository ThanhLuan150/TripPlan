import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {adminRoutes} from '@/app/routes';
import AdminAvatar from '../components/AdminAvatar';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {roleBadge, userStatusBadge} from '../status';
import type {AdminUser} from '../types';
import type {UserDialogKind} from './UserDialogs';
import UserActionsMenu from './UserActionsMenu';
import {canSelect, isSelf} from './userRules';
import type {ReactNode} from 'react';

const checkbox = 'size-4 cursor-pointer rounded border-slate-300 accent-brand-700 disabled:cursor-not-allowed';

// Table of the user list: checkbox, user, role, status, joined, last active,
// trips and the row menu. Selected rows are highlighted.
export default function UserTable({
  rows,
  loading,
  empty,
  username,
  selected,
  onToggle,
  onTogglePage,
  onNavigate,
  onAction,
}: {
  rows: AdminUser[];
  loading: boolean;
  empty: ReactNode;
  // signed-in admin
  username?: string;
  selected: Set<string>;
  onToggle: (user: AdminUser) => void;
  onTogglePage: (checked: boolean) => void;
  onNavigate: (user: AdminUser) => void;
  onAction: (kind: UserDialogKind, user: AdminUser) => void;
}) {
  const {t} = useTranslation();
  const format = useAdminFormat();

  const selectable = rows.filter(user => canSelect(user, isSelf(user, username)));
  const pageSelected = selectable.length > 0 && selectable.every(user => selected.has(user.id));
  const pageSome = selectable.some(user => selected.has(user.id));

  const columns: AdminColumn<AdminUser>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          className={checkbox}
          aria-label={t('admin.users.selectPage')}
          checked={pageSelected}
          disabled={!selectable.length}
          ref={input => {
            if (input) input.indeterminate = pageSome && !pageSelected;
          }}
          onChange={e => onTogglePage(e.target.checked)}
        />
      ),
      cell: user => (
        <input
          type="checkbox"
          className={checkbox}
          aria-label={t('admin.users.selectUser', {name: user.fullname})}
          checked={selected.has(user.id)}
          disabled={!canSelect(user, isSelf(user, username))}
          onChange={() => onToggle(user)}
        />
      ),
    },
    {
      key: 'user',
      header: t('admin.users.columns.user'),
      cell: user => (
        <div className="flex max-w-52 items-center gap-3 sm:max-w-72">
          <AdminAvatar name={user.fullname} src={user.image} />
          <div className="min-w-0">
            <Link
              to={`${adminRoutes.users}/${user.id}`}
              className="block truncate font-medium text-slate-900 hover:text-brand-700 hover:underline">
              {user.fullname}
            </Link>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('admin.users.columns.role'),
      hideBelow: 'md',
      cell: user => (
        <AdminStatusBadge tone={roleBadge[user.role].tone}>{t(roleBadge[user.role].labelKey)}</AdminStatusBadge>
      ),
    },
    {
      key: 'status',
      header: t('admin.users.columns.status'),
      cell: user => (
        <AdminStatusBadge tone={userStatusBadge[user.status].tone}>{t(userStatusBadge[user.status].labelKey)}</AdminStatusBadge>
      ),
    },
    {key: 'joined', header: t('admin.users.columns.joined'), hideBelow: 'lg', cell: user => format.date(user.createdAt)},
    {
      key: 'lastActive',
      header: t('admin.users.columns.lastActive'),
      hideBelow: 'xl',
      cell: user =>
        user.lastActiveAt ? (
          <span title={format.dateTime(user.lastActiveAt)}>{format.relative(user.lastActiveAt)}</span>
        ) : (
          <span className="text-slate-400">{t('admin.users.never')}</span>
        ),
    },
    {
      key: 'trips',
      header: t('admin.users.columns.trips'),
      hideBelow: 'lg',
      align: 'right',
      cell: user => <span className="tabular-nums">{format.number(user.totalTrips)}</span>,
    },
    {
      key: 'actions',
      pinned: true,
      header: <span className="sr-only">{t('admin.common.actions')}</span>,
      align: 'right',
      cell: user => (
        <UserActionsMenu
          user={user}
          self={isSelf(user, username)}
          onView={() => onNavigate(user)}
          onAction={kind => onAction(kind, user)}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      caption={t('admin.users.title')}
      columns={columns}
      rows={rows}
      rowKey={user => user.id}
      loading={loading}
      empty={empty}
      isSelected={user => selected.has(user.id)}
    />
  );
}
