import {useState} from 'react';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import Toast from '@/components/ui/Toast';
import {apiBody, apiMessage} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {optionsOf, roleBadge} from '../status';
import type {AdminUser} from '../types';
import FormField from './FormField';
import {useCreateUser} from './hooks';
import {emptyCreateForm, invalidInput, type CreateFormValues} from './userForm';
import {createUserSchema} from '../validation';

// Add an account: it is active at once (no email confirmation) with the first
// password the admin types.
export default function UserCreateDialog({onClose, onCreated}: {onClose: () => void; onCreated?: (user: AdminUser) => void}) {
  const {t} = useTranslation();
  const create = useCreateUser();
  const [error, setError] = useState<string>();
  // field the backend rejected (taken username / email)
  const [taken, setTaken] = useState<string>();

  const formik = useFormik<CreateFormValues>({
    initialValues: emptyCreateForm,
    validationSchema: createUserSchema,
    onSubmit: values => {
      setError(undefined);
      create.mutate(
        {
          fullname: values.fullname.trim(),
          username: values.username.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          role: values.role,
          password: values.password,
        },
        {
          onSuccess: user => {
            Toast.show({type: 'success', text1: t('admin.users.toasts.created')});
            onClose();
            onCreated?.(user);
          },
          onError: e => {
            const field = apiBody<{field?: string}>(e)?.field;
            if (field === 'email' || field === 'username') {
              setTaken(field);
            } else {
              setError(apiMessage(e) ?? t('admin.users.errors.generic'));
            }
          },
        },
      );
    },
  });
  const {values} = formik;
  const shown = (field: keyof CreateFormValues) => {
    const message = fieldError(formik, field);
    return message ? t(message) : taken === field ? t(`admin.users.errors.${field}Taken`) : undefined;
  };
  // Formik's handlers (name = field), and a new value clears the "taken" error
  const bind = (field: keyof CreateFormValues) => ({
    name: field,
    value: values[field],
    onBlur: formik.handleBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      formik.handleChange(e);
      setTaken(undefined);
    },
  });

  const busy = create.isPending;
  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <AdminModal
        title={t('admin.users.add')}
        description={t('admin.users.dialogs.createText')}
        onClose={onClose}
        busy={busy}
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={adminButton.primary} disabled={busy}>
              {busy ? t('admin.users.dialogs.saving') : t('admin.users.dialogs.createAccount')}
            </button>
          </>
        }>
        <div className="space-y-4">
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <FormField label={t('admin.users.fields.fullname')} error={shown('fullname')}>
            {props => (
              <input {...props} className={`${adminInput} ${invalidInput(shown('fullname'))}`} {...bind('fullname')} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.username')} error={shown('username')}>
            {props => (
              <input {...props} className={`${adminInput} ${invalidInput(shown('username'))}`} {...bind('username')} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.email')} error={shown('email')}>
            {props => (
              <input {...props} type="email" className={`${adminInput} ${invalidInput(shown('email'))}`} {...bind('email')} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.phone')} error={shown('phone')}>
            {props => (
              <input {...props} type="tel" className={`${adminInput} ${invalidInput(shown('phone'))}`} {...bind('phone')} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.password')} error={shown('password')} hint={t('admin.users.dialogs.passwordHint')}>
            {props => (
              <input {...props} type="password" className={`${adminInput} ${invalidInput(shown('password'))}`} {...bind('password')} autoComplete="new-password" />
            )}
          </FormField>
          <FormField label={t('admin.users.columns.role')}>
            {props => (
              <select {...props} className={adminInput} {...bind('role')}>
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
