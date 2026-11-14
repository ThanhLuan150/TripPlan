import {type FormEvent, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import {uploadErrorKey, uploadImage} from '@/lib/upload';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useSaveShowcase} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminShowcase, ShowcaseKind, ShowcaseStatus} from '../types';

// Add (`item` missing) or edit a picture of the home page of the app: a slide of
// the slider or a destination suggestion. The picture is uploaded here.
export default function ShowcaseFormDialog({
  item,
  kind,
  onClose,
}: {
  item?: AdminShowcase;
  // what a new picture is
  kind: ShowcaseKind;
  onClose: () => void;
}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const save = useSaveShowcase();
  const fileInput = useRef<HTMLInputElement>(null);
  const current = item?.kind ?? kind;
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');
  const [title, setTitle] = useState(item?.title ?? '');
  const [location, setLocation] = useState(item?.location ?? '');
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [status, setStatus] = useState<ShowcaseStatus>(item?.status ?? 'published');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const order = Number(sortOrder);
  const errors = {
    image: imageUrl ? undefined : t('admin.showcase.errors.imageRequired'),
    order: Number.isInteger(order) && order >= 0 && order <= 9999 ? undefined : t('admin.showcase.errors.order'),
  };

  const pick = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setUploading(true);
    setUploadError(undefined);
    try {
      setImageUrl(await uploadImage(file));
    } catch (e) {
      setUploadError(t(uploadErrorKey(e) ?? 'admin.users.errors.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.image || errors.order) {
      return;
    }
    save.mutate(
      {
        id: item?.id,
        item: {kind: current, imageUrl, title: title.trim(), location: location.trim(), sortOrder: order, status},
      },
      {
        onSuccess: () => {
          toast.done(t(item ? 'admin.showcase.updated' : 'admin.showcase.created'));
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
        title={t(item ? 'admin.showcase.edit' : 'admin.showcase.add', {kind: t(`admin.showcase.kinds.${current}`)})}
        onClose={onClose}
        busy={busy}
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={adminButton.primary} disabled={busy || uploading}>
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
          <div>
            <div className="grid aspect-video place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-sm text-slate-400">{t('admin.showcase.noImage')}</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                className={adminButton.secondary}
                disabled={uploading || busy}
                onClick={() => fileInput.current?.click()}>
                {uploading ? t('admin.users.dialogs.uploading') : t('admin.showcase.chooseImage')}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-label={t('admin.showcase.chooseImage')}
                onChange={e => pick(e.target.files?.[0])}
              />
              {(submitted && errors.image) || uploadError ? (
                <p role="alert" className="text-xs text-rose-600">
                  {uploadError ?? errors.image}
                </p>
              ) : null}
            </div>
          </div>
          <FormField label={t('admin.showcase.fields.title')}>
            {props => <input {...props} maxLength={200} className={adminInput} value={title} onChange={e => setTitle(e.target.value)} />}
          </FormField>
          {current === 'suggestion' && (
            <FormField label={t('admin.showcase.fields.location')} hint={t('admin.showcase.locationHint')}>
              {props => <input {...props} maxLength={200} className={adminInput} value={location} onChange={e => setLocation(e.target.value)} />}
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('admin.showcase.fields.order')} error={submitted ? errors.order : undefined}>
              {props => (
                <input {...props} type="number" min={0} max={9999} inputMode="numeric" className={`${adminInput} ${invalidInput(submitted ? errors.order : undefined)}`} value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
              )}
            </FormField>
            <FormField label={t('admin.common.status')}>
              {props => (
                <select {...props} className={adminInput} value={status} onChange={e => setStatus(e.target.value as ShowcaseStatus)}>
                  <option value="published">{t('admin.status.published')}</option>
                  <option value="hidden">{t('admin.status.hidden')}</option>
                </select>
              )}
            </FormField>
          </div>
        </div>
      </AdminModal>
    </form>
  );
}
