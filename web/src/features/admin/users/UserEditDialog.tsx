import {type FormEvent, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {uploadErrorKey, uploadImage} from '@/lib/upload';
import AdminAvatar from '../components/AdminAvatar';
import AdminModal from '../components/AdminModal';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminButton, adminInput} from '../components/styles';
import {optionsOf, roleBadge, userStatusBadge} from '../status';
import type {AdminUser, AdminUserUpdate} from '../types';
import FormField from './FormField';
import {toFormValues, validateUserForm, type UserFormValues, invalidInput} from './userForm';

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
  const [values, setValues] = useState<UserFormValues>(() => toFormValues(user));
  const [image, setImage] = useState(user.image);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const errors = validateUserForm(values);
  const shown = (field: keyof typeof errors) => (submitted && errors[field] ? t(errors[field]!) : undefined);
  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) =>
    setValues(current => ({...current, [key]: value}));

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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      return;
    }
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
  };

  return (
    <form onSubmit={submit} noValidate>
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
              {uploadError && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {uploadError}
                </p>
              )}
            </div>
          </div>

          <FormField label={t('admin.users.fields.fullname')} error={shown('fullname')}>
            {props => (
              <input
                {...props}
                className={`${adminInput} ${invalidInput(shown('fullname'))}`}
                value={values.fullname}
                onChange={e => set('fullname', e.target.value)}
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
                value={values.email}
                onChange={e => set('email', e.target.value)}
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
                value={values.phone}
                onChange={e => set('phone', e.target.value)}
                autoComplete="off"
              />
            )}
          </FormField>
          <FormField label={t('admin.users.columns.role')}>
            {props => (
              <select
                {...props}
                className={adminInput}
                value={values.role}
                onChange={e => set('role', e.target.value as UserFormValues['role'])}>
                {optionsOf(roleBadge, t).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </AdminModal>
    </form>
  );
}
