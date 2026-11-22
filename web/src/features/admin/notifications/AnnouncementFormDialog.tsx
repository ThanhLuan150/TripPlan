import {useState} from 'react';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useSaveAnnouncement} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import {toLocalInput} from './state';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminAnnouncement, AdminAnnouncementInput, AnnouncementStatus} from '../types';
import {announcementSchema} from '../validation';

// Write (`item` missing) or edit a notification of the app. A published one
// shows from its date on: a future date schedules it.
export default function AnnouncementFormDialog({item, onClose}: {item?: AdminAnnouncement; onClose: () => void}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const save = useSaveAnnouncement();
  const [error, setError] = useState<string>();

  const formik = useFormik({
    initialValues: {
      title: item?.title ?? '',
      message: item?.message ?? '',
      status: (item?.status ?? 'draft') as AnnouncementStatus,
      publishAt: toLocalInput(item?.publishAt ?? new Date().toISOString()),
    },
    validationSchema: announcementSchema,
    onSubmit: values => {
      const input: AdminAnnouncementInput = {
        title: values.title.trim(),
        message: values.message.trim(),
        status: values.status,
        publishAt: new Date(values.publishAt).toISOString(),
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
    },
  });
  const {values} = formik;
  const shown = (field: keyof typeof values) => {
    const message = fieldError(formik, field);
    return message ? t(message) : undefined;
  };
  const bind = (field: keyof typeof values) => ({
    name: field,
    value: values[field],
    onBlur: formik.handleBlur,
    onChange: formik.handleChange,
  });

  const busy = save.isPending;
  return (
    <form onSubmit={formik.handleSubmit} noValidate>
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
          <FormField label={t('admin.notifications.columns.title')} error={shown('title')}>
            {props => (
              <input {...props} maxLength={200} className={`${adminInput} ${invalidInput(shown('title'))}`} {...bind('title')} />
            )}
          </FormField>
          <FormField label={t('admin.notifications.fields.message')}>
            {props => (
              <textarea {...props} rows={4} maxLength={2000} className={`${adminInput} h-auto resize-none py-2`} {...bind('message')} />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('admin.common.status')}>
              {props => (
                <select {...props} className={adminInput} {...bind('status')}>
                  <option value="draft">{t('admin.status.draft')}</option>
                  <option value="published">{t('admin.notifications.publish')}</option>
                </select>
              )}
            </FormField>
            <FormField label={t('admin.notifications.columns.time')} error={shown('publishAt')}>
              {props => (
                <input {...props} type="datetime-local" className={`${adminInput} ${invalidInput(shown('publishAt'))}`} {...bind('publishAt')} />
              )}
            </FormField>
          </div>
        </div>
      </AdminModal>
    </form>
  );
}
