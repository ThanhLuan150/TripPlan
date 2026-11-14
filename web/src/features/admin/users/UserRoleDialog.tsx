import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import type {Role} from '@/features/auth/types';
import AdminModal from '../components/AdminModal';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminButton} from '../components/styles';
import {roleBadge} from '../status';
import type {AdminUser} from '../types';
import {UserSummaryList} from './UserSummary';

const ROLES: Role[] = ['user', 'admin'];

// Change the role of an account: current role, new role and what changes.
export default function UserRoleDialog({
  user,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  user: AdminUser;
  busy: boolean;
  error?: string;
  onSubmit: (role: Role) => void;
  onClose: () => void;
}) {
  const {t} = useTranslation();
  const [role, setRole] = useState<Role>(user.role === 'admin' ? 'user' : 'admin');
  const changed = role !== user.role;

  return (
    <AdminModal
      title={t('admin.users.changeRole')}
      description={t('admin.users.dialogs.roleText')}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className={adminButton.primary} disabled={busy || !changed} onClick={() => onSubmit(role)}>
            {busy ? t('admin.users.dialogs.saving') : t('admin.users.dialogs.confirmRole')}
          </button>
        </>
      }>
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <UserSummaryList users={[user]} />
        <p className="flex items-center gap-2 text-sm text-slate-500">
          {t('admin.users.dialogs.currentRole')}
          <AdminStatusBadge tone={roleBadge[user.role].tone}>{t(roleBadge[user.role].labelKey)}</AdminStatusBadge>
        </p>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">{t('admin.users.dialogs.newRole')}</legend>
          <div className="space-y-2">
            {ROLES.map(value => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  role === value ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="mt-1 accent-brand-700"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{t(roleBadge[value].labelKey)}</span>
                  <span className="block text-xs text-slate-500">{t(`admin.users.dialogs.roleImpact.${value}`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </AdminModal>
  );
}
