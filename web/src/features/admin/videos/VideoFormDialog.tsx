import {type FormEvent, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useSaveVideo} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import {optionsOf, videoStatusBadge} from '../status';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminVideo, AdminVideoInput, VideoStatus} from '../types';

const isUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

// Add (`video` missing) or edit a travel video: title, place, YouTube link,
// minutes of duration, whether it is on the home page and if it is published.
export default function VideoFormDialog({video, onClose}: {video?: AdminVideo; onClose: () => void}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const save = useSaveVideo();
  const [title, setTitle] = useState(video?.title ?? '');
  const [location, setLocation] = useState(video?.location ?? '');
  const [youtubeLink, setYoutubeLink] = useState(video?.youtubeLink ?? '');
  const [duration, setDuration] = useState(String(video?.durationSec ?? 0));
  const [showOnHome, setShowOnHome] = useState(video?.showOnHome ?? false);
  const [status, setStatus] = useState<VideoStatus>(video?.status ?? 'published');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const seconds = Number(duration);
  const errors = {
    title: title.trim() ? undefined : t('admin.videos.errors.titleRequired'),
    link: youtubeLink.trim() && !isUrl(youtubeLink.trim()) ? t('admin.videos.errors.linkInvalid') : undefined,
    duration: Number.isInteger(seconds) && seconds >= 0 ? undefined : t('admin.videos.errors.duration'),
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.title || errors.link || errors.duration) {
      return;
    }
    const input: AdminVideoInput = {
      title: title.trim(),
      location: location.trim(),
      youtubeLink: youtubeLink.trim(),
      durationSec: seconds,
      showOnHome,
      status,
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
  };

  const busy = save.isPending;
  const shown = <K extends keyof typeof errors>(key: K) => (submitted ? errors[key] : undefined);
  return (
    <form onSubmit={submit} noValidate>
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
            {props => <input {...props} className={`${adminInput} ${invalidInput(shown('title'))}`} value={title} onChange={e => setTitle(e.target.value)} />}
          </FormField>
          <FormField label={t('admin.videos.fields.location')}>
            {props => <input {...props} className={adminInput} value={location} onChange={e => setLocation(e.target.value)} />}
          </FormField>
          <FormField label={t('admin.videos.fields.youtubeLink')} error={shown('link')}>
            {props => (
              <input {...props} type="url" placeholder="https://www.youtube.com/watch?v=…" className={`${adminInput} ${invalidInput(shown('link'))}`} value={youtubeLink} onChange={e => setYoutubeLink(e.target.value)} />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('admin.videos.fields.duration')} error={shown('duration')}>
              {props => (
                <input {...props} type="number" min={0} inputMode="numeric" className={`${adminInput} ${invalidInput(shown('duration'))}`} value={duration} onChange={e => setDuration(e.target.value)} />
              )}
            </FormField>
            <FormField label={t('admin.common.status')}>
              {props => (
                <select {...props} className={adminInput} value={status} onChange={e => setStatus(e.target.value as VideoStatus)}>
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
            <input type="checkbox" className="size-4 accent-brand-700" checked={showOnHome} onChange={e => setShowOnHome(e.target.checked)} />
            {t('admin.videos.fields.showOnHome')}
          </label>
        </div>
      </AdminModal>
    </form>
  );
}
