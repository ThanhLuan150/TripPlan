import {useRef, useState} from 'react';
import FieldError from '@/components/ui/FieldError';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {fieldError} from '@/lib/forms';
import {uploadErrorKey, uploadImage} from '@/lib/upload';
import AdminSelect from '../components/AdminSelect';
import AdminAvatar from '../components/AdminAvatar';
import AdminModal from '../components/AdminModal';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminButton, adminInput} from '../components/styles';
import {optionsOf, roleBadge, userStatusBadge} from '../status';
import type {AdminUser, AdminUserUpdate} from '../types';
import FormField from './FormField';
import {toFormValues, invalidInput, type UserFormValues} from './userForm';
import {userSchema} from '../validation';

// Edit the profile (photo, name, email, phone) and the role of an account.
// Password and tokens are not part of it; the account status has its own
// dialogs (suspend / reactivate).
export default function UserEditDialog({
  user,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  user: AdminUser;
  busy: boolean;
  error?: string;
  onSubmit: (update: AdminUserUpdate) => void;
  onClose: () => void;
}) {
  const {t} = useTranslation();
  const [image, setImage] = useState(user.image);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const formik = useFormik<UserFormValues>({
    initialValues: toFormValues(user),
    validationSchema: userSchema,
    onSubmit: values => {
      // only what changed
      const update: AdminUserUpdate = {};
      if (values.fullname.trim() !== user.fullname) update.fullname = values.fullname.trim();
      if (values.email.trim().toLowerCase() !== user.email) update.email = values.email.trim();
      if (values.phone.trim() !== user.phone) update.phone = values.phone.trim();
      if (values.role !== user.role) update.role = values.role;
      if (image !== user.image) update.image = image;
      if (!Object.keys(update).length) {
        onClose();
        return;
      }
      onSubmit(update);
    },
  });
  const {values} = formik;
  const shown = (field: keyof UserFormValues) => {
    const message = fieldError(formik, field);
    return message ? t(message) : undefined;
  };
  const bind = (field: keyof UserFormValues) => ({
    name: field,
    value: values[field],
    onBlur: formik.handleBlur,
    onChange: formik.handleChange,
  });

  const pickPhoto = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setUploading(true);
    setUploadError(undefined);
    try {
      setImage(await uploadImage(file));
    } catch (e) {
      setUploadError(t(uploadErrorKey(e) ?? 'admin.users.errors.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <AdminModal
        title={t('admin.users.editUser')}
        description={t('admin.users.dialogs.editText')}
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
          <div className="flex items-center gap-3">
            <div className="shrink-0 [&>*]:size-14 [&>*]:text-xl">
              <AdminAvatar name={values.fullname || user.fullname} src={image} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">@{user.username}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <AdminStatusBadge tone={userStatusBadge[user.status].tone}>
                  {t(userStatusBadge[user.status].labelKey)}
                </AdminStatusBadge>
                <button
                  type="button"
                  className="text-xs font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
                  disabled={uploading || busy}
                  onClick={() => fileInput.current?.click()}>
                  {uploading ? t('admin.users.dialogs.uploading') : t('admin.users.dialogs.changePhoto')}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={t('admin.users.dialogs.changePhoto')}
                  onChange={e => pickPhoto(e.target.files?.[0])}
                />
              </div>
              <FieldError role="alert" className="mt-1">
                {uploadError}
              </FieldError>
            </div>
          </div>

          <FormField label={t('admin.users.fields.fullname')} error={shown('fullname')}>
            {props => (
              <input
                {...props}
                className={`${adminInput} ${invalidInput(shown('fullname'))}`}
                {...bind('fullname')}
                autoComplete="off"
              />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.email')} error={shown('email')}>
            {props => (
              <input
                {...props}
                type="email"
                className={`${adminInput} ${invalidInput(shown('email'))}`}
                {...bind('email')}
                autoComplete="off"
              />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.phone')} error={shown('phone')}>
            {props => (
              <input
                {...props}
                type="tel"
                className={`${adminInput} ${invalidInput(shown('phone'))}`}
                {...bind('phone')}
                autoComplete="off"
              />
            )}
          </FormField>
          <FormField label={t('admin.users.columns.role')}>
            {props => (
              <AdminSelect
                  id={props.id}
                  value={values.role}
                  onChange={value => formik.setFieldValue('role', value)}
                  options={optionsOf(roleBadge, t)}
                />
            )}
          </FormField>
        </div>
      </AdminModal>
    </form>
  );
}
