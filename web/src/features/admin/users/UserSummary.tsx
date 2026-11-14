import {useTranslation} from 'react-i18next';
import AdminAvatar from '../components/AdminAvatar';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {roleBadge, userStatusBadge} from '../status';
import type {AdminUser} from '../types';

// Who a dialog is about: avatar, name, email and the role / status badges.
export default function UserSummary({user}: {user: AdminUser}) {
  const {t} = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <AdminAvatar name={user.fullname} src={user.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{user.fullname}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <AdminStatusBadge tone={roleBadge[user.role].tone}>{t(roleBadge[user.role].labelKey)}</AdminStatusBadge>
        <AdminStatusBadge tone={userStatusBadge[user.status].tone}>{t(userStatusBadge[user.status].labelKey)}</AdminStatusBadge>
      </div>
    </div>
  );
}

// Several accounts: the first names and "+ N more".
export function UserSummaryList({users}: {users: AdminUser[]}) {
  const {t} = useTranslation();
  if (users.length === 1) {
    return <UserSummary user={users[0]} />;
  }
  const shown = users.slice(0, 3);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-sm font-medium text-slate-900">{t('admin.users.dialogs.selectedCount', {count: users.length})}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">
        {shown.map(user => user.fullname).join(', ')}
        {users.length > shown.length && ` ${t('admin.users.dialogs.andMore', {count: users.length - shown.length})}`}
      </p>
    </div>
  );
}
