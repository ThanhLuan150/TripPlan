import {type FormEvent, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useSaveAnnouncement} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import {toLocalInput} from './state';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminAnnouncement, AdminAnnouncementInput, AnnouncementStatus} from '../types';

// Write (`item` missing) or edit a notification of the app. A published one
// shows from its date on: a future date schedules it.
export default function AnnouncementFormDialog({item, onClose}: {item?: AdminAnnouncement; onClose: () => void}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const save = useSaveAnnouncement();
  const [title, setTitle] = useState(item?.title ?? '');
  const [message, setMessage] = useState(item?.message ?? '');
  const [status, setStatus] = useState<AnnouncementStatus>(item?.status ?? 'draft');
  const [publishAt, setPublishAt] = useState(toLocalInput(item?.publishAt ?? new Date().toISOString()));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const errors = {
    title: title.trim() ? undefined : t('admin.notifications.errors.titleRequired'),
    date: Number.isNaN(new Date(publishAt).getTime()) ? t('admin.notifications.errors.dateInvalid') : undefined,
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.title || errors.date) {
      return;
    }
    const input: AdminAnnouncementInput = {
      title: title.trim(),
      message: message.trim(),
      status,
      publishAt: new Date(publishAt).toISOString(),
    };
    save.mutate(
      {id: item?.id, item: input},
      {
        onSuccess: () => {
          toast.done(t(item ? 'admin.notifications.updated' : 'admin.notifications.created'));
          onClose();
        },
        onError: e => setError(apiMessage(e) ?? t('admin.common.tryAgain')),
      },
    );
  };

  const busy = save.isPending;
  return (
    <form onSubmit={submit} noValidate>
      <AdminModal
        title={t(item ? 'admin.notifications.edit' : 'admin.notifications.create')}
        description={t('admin.notifications.formText')}
        onClose={onClose}
        busy={busy}
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={adminButton.primary} disabled={busy}>
              {busy ? t('admin.users.dialogs.saving') : t('admin.users.dialogs.saveChanges')}
            </button>
          </>
        }>
        <div className="space-y-4">
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <FormField label={t('admin.notifications.columns.title')} error={submitted ? errors.title : undefined}>
            {props => (
              <input {...props} maxLength={200} className={`${adminInput} ${invalidInput(submitted ? errors.title : undefined)}`} value={title} onChange={e => setTitle(e.target.value)} />
            )}
          </FormField>
          <FormField label={t('admin.notifications.fields.message')}>
            {props => (
              <textarea {...props} rows={4} maxLength={2000} className={`${adminInput} h-auto resize-none py-2`} value={message} onChange={e => setMessage(e.target.value)} />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('admin.common.status')}>
              {props => (
                <select {...props} className={adminInput} value={status} onChange={e => setStatus(e.target.value as AnnouncementStatus)}>
                  <option value="draft">{t('admin.status.draft')}</option>
                  <option value="published">{t('admin.notifications.publish')}</option>
                </select>
              )}
            </FormField>
            <FormField label={t('admin.notifications.columns.time')} error={submitted ? errors.date : undefined}>
              {props => (
                <input {...props} type="datetime-local" className={`${adminInput} ${invalidInput(submitted ? errors.date : undefined)}`} value={publishAt} onChange={e => setPublishAt(e.target.value)} />
              )}
            </FormField>
          </div>
        </div>
      </AdminModal>
    </form>
  );
}
