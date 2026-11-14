import {type FormEvent, useState} from 'react';
import {useTranslation} from 'react-i18next';
import Toast from '@/components/ui/Toast';
import {apiBody, apiMessage} from '@/lib/apiClient';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {optionsOf, roleBadge} from '../status';
import type {AdminUser} from '../types';
import FormField from './FormField';
import {useCreateUser} from './hooks';
import {emptyCreateForm, validateCreateForm, type CreateFormValues, invalidInput} from './userForm';

// Add an account: it is active at once (no email confirmation) with the first
// password the admin types.
export default function UserCreateDialog({onClose, onCreated}: {onClose: () => void; onCreated?: (user: AdminUser) => void}) {
  const {t} = useTranslation();
  const create = useCreateUser();
  const [values, setValues] = useState<CreateFormValues>(emptyCreateForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  // field the backend rejected (taken username / email)
  const [taken, setTaken] = useState<string>();
  const errors = validateCreateForm(values);
  const shown = (field: keyof typeof errors) =>
    submitted && errors[field]
      ? t(errors[field]!)
      : taken === field
        ? t(`admin.users.errors.${field}Taken`)
        : undefined;
  const set = <K extends keyof CreateFormValues>(key: K, value: CreateFormValues[K]) => {
    setValues(current => ({...current, [key]: value}));
    setTaken(undefined);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(undefined);
    if (Object.keys(errors).length) {
      return;
    }
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
  };

  const busy = create.isPending;
  return (
    <form onSubmit={submit} noValidate>
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
              <input {...props} className={`${adminInput} ${invalidInput(shown('fullname'))}`} value={values.fullname} onChange={e => set('fullname', e.target.value)} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.username')} error={shown('username')}>
            {props => (
              <input {...props} className={`${adminInput} ${invalidInput(shown('username'))}`} value={values.username} onChange={e => set('username', e.target.value)} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.email')} error={shown('email')}>
            {props => (
              <input {...props} type="email" className={`${adminInput} ${invalidInput(shown('email'))}`} value={values.email} onChange={e => set('email', e.target.value)} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.phone')} error={shown('phone')}>
            {props => (
              <input {...props} type="tel" className={`${adminInput} ${invalidInput(shown('phone'))}`} value={values.phone} onChange={e => set('phone', e.target.value)} autoComplete="off" />
            )}
          </FormField>
          <FormField label={t('admin.users.fields.password')} error={shown('password')} hint={t('admin.users.dialogs.passwordHint')}>
            {props => (
              <input {...props} type="password" className={`${adminInput} ${invalidInput(shown('password'))}`} value={values.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
            )}
          </FormField>
          <FormField label={t('admin.users.columns.role')}>
            {props => (
              <select {...props} className={adminInput} value={values.role} onChange={e => set('role', e.target.value as CreateFormValues['role'])}>
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
