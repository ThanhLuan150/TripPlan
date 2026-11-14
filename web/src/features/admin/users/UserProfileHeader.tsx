import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack, IoCheckmarkCircleOutline, IoCreateOutline} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';
import AdminAvatar from '../components/AdminAvatar';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminButton} from '../components/styles';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {roleBadge, userStatusBadge} from '../status';
import type {AdminUser} from '../types';
import UserActionsMenu from './UserActionsMenu';
import type {UserDialogKind} from './UserDialogs';
import {canEdit, canReactivate} from './userRules';

// Top of the profile page: back link, avatar, name, email, role, status, join
// date and the actions. A suspended account shows why it was suspended.
export default function UserProfileHeader({
  user,
  self,
  onAction,
}: {
  user: AdminUser;
  self: boolean;
  onAction: (kind: UserDialogKind) => void;
}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const role = roleBadge[user.role];
  const status = userStatusBadge[user.status];

  return (
    <div className="mb-6">
      <Link to={adminRoutes.users} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
        <IoArrowBack size={16} aria-hidden />
        {t('admin.users.backToUsers')}
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div className="shrink-0 [&>*]:size-16 [&>*]:text-2xl">
          <AdminAvatar name={user.fullname} src={user.image} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{user.fullname}</h1>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AdminStatusBadge tone={role.tone}>{t(role.labelKey)}</AdminStatusBadge>
            <AdminStatusBadge tone={status.tone}>{t(status.labelKey)}</AdminStatusBadge>
            <span className="text-xs text-slate-500">
              {t('admin.users.joinedOn', {date: format.date(user.createdAt)})}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canReactivate(user, self) && (
            <button type="button" className={adminButton.primary} onClick={() => onAction('reactivate')}>
              <IoCheckmarkCircleOutline size={16} aria-hidden />
              {t('admin.users.reactivateAccount')}
            </button>
          )}
          <button type="button" className={adminButton.secondary} disabled={!canEdit(user, self)} onClick={() => onAction('edit')}>
            <IoCreateOutline size={16} aria-hidden />
            {t('admin.users.editUser')}
          </button>
          <UserActionsMenu user={user} self={self} onAction={onAction} align="header" />
        </div>
      </div>

      {user.status === 'suspended' && (
        <p role="note" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">{t('admin.users.suspendedBanner')}</span>{' '}
          {user.suspendReason || t('admin.users.noReason')}
          {user.suspendedAt && ` · ${format.dateTime(user.suspendedAt)}`}
        </p>
      )}
    </div>
  );
}
