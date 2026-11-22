import {type ReactNode, useState} from 'react';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import Field from '@/components/ui/Field';
import {apiMessage} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import AdminCard from '../components/AdminCard';
import AdminEmptyState from '../components/AdminEmptyState';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminPageHeader from '../components/AdminPageHeader';
import {adminButton, adminInput} from '../components/styles';
import {useAdminSettings, useSaveSettings} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import type {AdminSettings} from '../types';
import {settingsSchema} from '../validation';

// Settings the app reads: its name, the support e-mail and the hotline.
export default function SettingsPage() {
  const {t} = useTranslation();
  const {data, isError, refetch} = useAdminSettings();
  return (
    <>
      <AdminPageHeader title={t('admin.settings.title')} description={t('admin.settings.description')} />
      {data ? (
        <SettingsForm initial={data} />
      ) : isError ? (
        <AdminCard>
          <AdminEmptyState
            title={t('admin.users.errors.loadFailed')}
            description={t('admin.users.errors.loadFailedHint')}
            action={
              <button type="button" className={adminButton.secondary} onClick={() => refetch()}>
                {t('admin.common.refresh')}
              </button>
            }
          />
        </AdminCard>
      ) : (
        <AdminLoadingState />
      )}
    </>
  );
}

function SettingsForm({initial}: {initial: AdminSettings}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const save = useSaveSettings();
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string>();

  const formik = useFormik<AdminSettings>({
    initialValues: initial,
    validationSchema: settingsSchema,
    onSubmit: values => {
      setError(undefined);
      const next = {appName: values.appName.trim(), supportEmail: values.supportEmail.trim(), hotline: values.hotline.trim()};
      save.mutate(next, {
        onSuccess: result => {
          setSaved(result);
          formik.resetForm({values: result});
          toast.done(t('admin.settings.savedToast'));
        },
        onError: e => setError(apiMessage(e) ?? t('admin.common.tryAgain')),
      });
    },
  });
  const {values} = formik;
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const shown = (key: keyof AdminSettings) => {
    const message = fieldError(formik, key);
    return message ? t(message) : undefined;
  };

  const text = (key: keyof AdminSettings, type = 'text') => (
    <Field label={t(`admin.settings.fields.${key}`)} htmlFor={`setting-${key}`} error={shown(key)}>
      <input
        id={`setting-${key}`}
        type={type}
        name={key}
        aria-invalid={!!shown(key)}
        value={values[key]}
        onBlur={formik.handleBlur}
        onChange={formik.handleChange}
        className={adminInput}
      />
    </Field>
  );

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="space-y-6 pb-20">
      <Section title={t('admin.settings.sections.general')} hint={t('admin.settings.sections.generalHint')}>
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('appName')}
          {text('supportEmail', 'email')}
          {text('hotline', 'tel')}
        </div>
      </Section>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">{t(dirty ? 'admin.settings.unsaved' : 'admin.settings.saved')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={adminButton.secondary}
            disabled={!dirty || save.isPending}
            onClick={() => {
              formik.resetForm({values: saved});
            }}>
            {t('admin.settings.reset')}
          </button>
          <button type="submit" className={adminButton.primary} disabled={!dirty || save.isPending}>
            {save.isPending ? t('admin.users.dialogs.saving') : t('admin.settings.save')}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({title, hint, children}: {title: string; hint: string; children: ReactNode}) {
  return (
    <AdminCard title={title} description={hint}>
      <div className="p-5">{children}</div>
    </AdminCard>
  );
}
