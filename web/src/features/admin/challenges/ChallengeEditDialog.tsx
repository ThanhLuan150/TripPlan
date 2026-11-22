import {useState} from 'react';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import {fieldError} from '@/lib/forms';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useUpdateChallenge} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminChallenge} from '../types';
import {challengeSchema, MAX_POINTS} from '../validation';

// Edit the name, the description and the points of a challenge (what users
// earn when they complete it).
export default function ChallengeEditDialog({challenge, onClose}: {challenge: AdminChallenge; onClose: () => void}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const update = useUpdateChallenge();
  const [error, setError] = useState<string>();

  const formik = useFormik({
    initialValues: {name: challenge.nameLocation, summary: challenge.challengeSummary, points: String(challenge.points)},
    validationSchema: challengeSchema,
    onSubmit: values => {
      const points = Number(values.points);
      const changes: Record<string, string | number> = {};
      if (values.name.trim() !== challenge.nameLocation) changes.nameLocation = values.name.trim();
      if (values.summary.trim() !== challenge.challengeSummary) changes.challengeSummary = values.summary.trim();
      if (points !== challenge.points) changes.points = points;
      if (!Object.keys(changes).length) {
        onClose();
        return;
      }
      update.mutate(
        {id: challenge.id, update: changes},
        {
          onSuccess: () => {
            toast.done(t('admin.challenges.updated'));
            onClose();
          },
          onError: e => setError(apiMessage(e) ?? t('admin.common.tryAgain')),
        },
      );
    },
  });
  const {values} = formik;
  const shown = (field: 'name' | 'points') => {
    const message = fieldError(formik, field);
    return message ? t(message, {max: MAX_POINTS}) : undefined;
  };
  const bind = (field: keyof typeof values) => ({
    name: field,
    value: values[field],
    onBlur: formik.handleBlur,
    onChange: formik.handleChange,
  });

  const busy = update.isPending;
  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <AdminModal
        title={t('admin.challenges.edit')}
        description={challenge.location}
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
          <FormField label={t('admin.challenges.columns.place')} error={shown('name')}>
            {props => (
              <input {...props} className={`${adminInput} ${invalidInput(shown('name'))}`} {...bind('name')} />
            )}
          </FormField>
          <FormField label={t('admin.challenges.fields.summary')}>
            {props => (
              <textarea {...props} rows={3} className={`${adminInput} h-auto resize-none py-2`} {...bind('summary')} />
            )}
          </FormField>
          <FormField label={t('admin.challenges.columns.points')} error={shown('points')}>
            {props => (
              <input {...props} type="number" min={0} max={MAX_POINTS} inputMode="numeric" className={`${adminInput} ${invalidInput(shown('points'))}`} {...bind('points')} />
            )}
          </FormField>
        </div>
      </AdminModal>
    </form>
  );
}
