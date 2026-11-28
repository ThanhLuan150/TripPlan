import {useRef, useState} from 'react';
import FieldError from '@/components/ui/FieldError';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import {uploadErrorKey, uploadImage} from '@/lib/upload';
import AdminSelect from '../components/AdminSelect';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useSaveShowcase} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminShowcase, ShowcaseKind, ShowcaseStatus} from '../types';
import {showcaseSchema} from '../validation';

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [error, setError] = useState<string>();

  const formik = useFormik({
    initialValues: {
      imageUrl: item?.imageUrl ?? '',
      title: item?.title ?? '',
      location: item?.location ?? '',
      sortOrder: String(item?.sortOrder ?? 0),
      status: (item?.status ?? 'published') as ShowcaseStatus,
    },
    validationSchema: showcaseSchema,
    onSubmit: values => {
      save.mutate(
        {
          id: item?.id,
          item: {
            kind: current,
            imageUrl: values.imageUrl,
            title: values.title.trim(),
            location: values.location.trim(),
            sortOrder: Number(values.sortOrder),
            status: values.status,
          },
        },
        {
          onSuccess: () => {
            toast.done(t(item ? 'admin.showcase.updated' : 'admin.showcase.created'));
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
  const bind = (field: Exclude<keyof typeof values, 'imageUrl'>) => ({
    name: field,
    value: values[field],
    onBlur: formik.handleBlur,
    onChange: formik.handleChange,
  });

  const pick = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setUploading(true);
    setUploadError(undefined);
    try {
      formik.setFieldValue('imageUrl', await uploadImage(file));
    } catch (e) {
      setUploadError(t(uploadErrorKey(e) ?? 'admin.users.errors.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const busy = save.isPending;
  return (
    <form onSubmit={formik.handleSubmit} noValidate>
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
              {values.imageUrl ? (
                <img src={values.imageUrl} alt="" className="size-full object-cover" />
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
              <FieldError role="alert" className="mt-0">
                {uploadError ?? shown('imageUrl')}
              </FieldError>
            </div>
          </div>
          <FormField label={t('admin.showcase.fields.title')}>
            {props => <input {...props} maxLength={200} className={adminInput} {...bind('title')} />}
          </FormField>
          {current === 'suggestion' && (
            <FormField label={t('admin.showcase.fields.location')} hint={t('admin.showcase.locationHint')}>
              {props => <input {...props} maxLength={200} className={adminInput} {...bind('location')} />}
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('admin.showcase.fields.order')} error={shown('sortOrder')}>
              {props => (
                <input {...props} type="number" min={0} max={9999} inputMode="numeric" className={`${adminInput} ${invalidInput(shown('sortOrder'))}`} {...bind('sortOrder')} />
              )}
            </FormField>
            <FormField label={t('admin.common.status')}>
              {props => (
                <AdminSelect
                  id={props.id}
                  value={values.status}
                  onChange={value => formik.setFieldValue('status', value)}
                  options={[
                    {value: 'published', label: t('admin.status.published')},
                    {value: 'hidden', label: t('admin.status.hidden')},
                  ]}
                />
              )}
            </FormField>
          </div>
        </div>
      </AdminModal>
    </form>
  );
}
