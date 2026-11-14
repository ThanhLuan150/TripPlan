import {useId, useState} from 'react';
import {useTranslation} from 'react-i18next';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import type {AdminUser} from '../types';
import {UserSummaryList} from './UserSummary';

interface DialogProps {
  users: AdminUser[];
  busy: boolean;
  error?: string;
  onClose: () => void;
}

const ErrorNote = ({error}: {error?: string}) =>
  error ? (
    <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {error}
    </p>
  ) : null;

// Suspend one or several accounts: the reason is required. The users cannot
// sign in until an admin reactivates the account.
export function UserSuspendDialog({users, busy, error, onSubmit, onClose}: DialogProps & {onSubmit: (reason: string) => void}) {
  const {t} = useTranslation();
  const id = useId();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const missing = reason.trim().length < 3;

  const submit = () => {
    setSubmitted(true);
    if (!missing) {
      onSubmit(reason.trim());
    }
  };

  return (
    <AdminModal
      title={users.length > 1 ? t('admin.users.dialogs.suspendMany', {count: users.length}) : t('admin.users.suspendAccount')}
      description={t('admin.users.dialogs.suspendText')}
      onClose={onClose}
      busy={busy}
      role="alertdialog"
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className={adminButton.danger} disabled={busy} onClick={submit}>
            {busy ? t('admin.users.dialogs.saving') : t('admin.users.dialogs.confirmSuspension')}
          </button>
        </>
      }>
      <div className="space-y-4">
        <ErrorNote error={error} />
        <UserSummaryList users={users} />
        <div>
          <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
            {t('admin.users.dialogs.reason')}
          </label>
          <textarea
            id={id}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={e => setReason(e.target.value)}
            aria-invalid={submitted && missing}
            aria-describedby={submitted && missing ? `${id}-error` : undefined}
            placeholder={t('admin.users.dialogs.reasonPlaceholder')}
            className={`${adminInput} h-auto resize-none py-2 ${submitted && missing ? 'border-rose-400' : ''}`}
          />
          {submitted && missing && (
            <p id={`${id}-error`} className="mt-1 text-xs text-rose-600">
              {t('admin.users.errors.reasonRequired')}
            </p>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

// Reactivate (unlock) one or several accounts.
export function UserReactivateDialog({users, busy, error, onSubmit, onClose}: DialogProps & {onSubmit: () => void}) {
  const {t} = useTranslation();
  return (
    <AdminModal
      title={users.length > 1 ? t('admin.users.dialogs.reactivateMany', {count: users.length}) : t('admin.users.reactivateAccount')}
      description={t('admin.users.dialogs.reactivateText')}
      onClose={onClose}
      busy={busy}
      role="alertdialog"
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className={adminButton.primary} disabled={busy} onClick={onSubmit}>
            {busy ? t('admin.users.dialogs.saving') : t('admin.users.dialogs.confirmReactivation')}
          </button>
        </>
      }>
      <div className="space-y-4">
        <ErrorNote error={error} />
        <UserSummaryList users={users} />
      </div>
    </AdminModal>
  );
}

// Delete an account: the user can no longer sign in (soft delete on the backend).
export function UserDeleteDialog({users, busy, error, onSubmit, onClose}: DialogProps & {onSubmit: () => void}) {
  const {t} = useTranslation();
  return (
    <AdminModal
      title={users.length > 1 ? t('admin.users.dialogs.deleteMany', {count: users.length}) : t('admin.users.deleteAccount')}
      description={t('admin.users.dialogs.deleteText')}
      onClose={onClose}
      busy={busy}
      role="alertdialog"
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className={adminButton.danger} disabled={busy} onClick={onSubmit}>
            {busy ? t('admin.users.dialogs.deleting') : t('admin.users.deleteAccount')}
          </button>
        </>
      }>
      <div className="space-y-4">
        <ErrorNote error={error} />
        <UserSummaryList users={users} />
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{t('admin.users.dialogs.deleteWarning')}</p>
      </div>
    </AdminModal>
  );
}
