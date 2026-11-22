import {useState} from 'react';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useSaveVideo} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import {optionsOf, videoStatusBadge} from '../status';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminVideo, AdminVideoInput, VideoStatus} from '../types';
import {videoSchema} from '../validation';

// Add (`video` missing) or edit a travel video: title, place, YouTube link,
// minutes of duration, whether it is on the home page and if it is published.
export default function VideoFormDialog({video, onClose}: {video?: AdminVideo; onClose: () => void}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const save = useSaveVideo();
  const [error, setError] = useState<string>();

  const formik = useFormik({
    initialValues: {
      title: video?.title ?? '',
      location: video?.location ?? '',
      youtubeLink: video?.youtubeLink ?? '',
      duration: String(video?.durationSec ?? 0),
      showOnHome: video?.showOnHome ?? false,
      status: (video?.status ?? 'published') as VideoStatus,
    },
    validationSchema: videoSchema,
    onSubmit: values => {
      const input: AdminVideoInput = {
        title: values.title.trim(),
        location: values.location.trim(),
        youtubeLink: values.youtubeLink.trim(),
        durationSec: Number(values.duration),
        showOnHome: values.showOnHome,
        status: values.status,
      };
      save.mutate(
        {id: video?.id, video: input},
        {
          onSuccess: () => {
            toast.done(t(video ? 'admin.videos.updated' : 'admin.videos.created'));
            onClose();
          },
          onError: e => setError(apiMessage(e) ?? t('admin.common.tryAgain')),
        },
      );
    },
  });
  const {values} = formik;
  const busy = save.isPending;
  const shown = (field: keyof typeof values) => {
    const message = fieldError(formik, field);
    return message ? t(message) : undefined;
  };
  const bind = (field: Exclude<keyof typeof values, 'showOnHome'>) => ({
    name: field,
    value: values[field],
    onBlur: formik.handleBlur,
    onChange: formik.handleChange,
  });
  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <AdminModal
        title={t(video ? 'admin.videos.edit' : 'admin.videos.add')}
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
          <FormField label={t('admin.videos.fields.title')} error={shown('title')}>
            {props => <input {...props} className={`${adminInput} ${invalidInput(shown('title'))}`} {...bind('title')} />}
          </FormField>
          <FormField label={t('admin.videos.fields.location')}>
            {props => <input {...props} className={adminInput} {...bind('location')} />}
          </FormField>
          <FormField label={t('admin.videos.fields.youtubeLink')} error={shown('youtubeLink')}>
            {props => (
              <input {...props} type="url" placeholder="https://www.youtube.com/watch?v=…" className={`${adminInput} ${invalidInput(shown('youtubeLink'))}`} {...bind('youtubeLink')} />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('admin.videos.fields.duration')} error={shown('duration')}>
              {props => (
                <input {...props} type="number" min={0} inputMode="numeric" className={`${adminInput} ${invalidInput(shown('duration'))}`} {...bind('duration')} />
              )}
            </FormField>
            <FormField label={t('admin.common.status')}>
              {props => (
                <select {...props} className={adminInput} {...bind('status')}>
                  {optionsOf(videoStatusBadge, t).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
            <input type="checkbox" className="size-4 accent-brand-700" name="showOnHome" checked={values.showOnHome} onChange={formik.handleChange} />
            {t('admin.videos.fields.showOnHome')}
          </label>
        </div>
      </AdminModal>
    </form>
  );
}
