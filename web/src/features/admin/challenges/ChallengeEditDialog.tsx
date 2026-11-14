import {type FormEvent, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {apiMessage} from '@/lib/apiClient';
import AdminModal from '../components/AdminModal';
import {adminButton, adminInput} from '../components/styles';
import {useUpdateChallenge} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import FormField from '../users/FormField';
import {invalidInput} from '../users/userForm';
import type {AdminChallenge} from '../types';

const MAX_POINTS = 1000;

// Edit the name, the description and the points of a challenge (what users
// earn when they complete it).
export default function ChallengeEditDialog({challenge, onClose}: {challenge: AdminChallenge; onClose: () => void}) {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const update = useUpdateChallenge();
  const [name, setName] = useState(challenge.nameLocation);
  const [summary, setSummary] = useState(challenge.challengeSummary);
  const [points, setPoints] = useState(String(challenge.points));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const value = Number(points);
  const errors = {
    name: name.trim() ? undefined : t('admin.challenges.errors.nameRequired'),
    points:
      points.trim() !== '' && Number.isInteger(value) && value >= 0 && value <= MAX_POINTS
        ? undefined
        : t('admin.challenges.errors.points', {max: MAX_POINTS}),
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.name || errors.points) {
      return;
    }
    const changes: Record<string, string | number> = {};
    if (name.trim() !== challenge.nameLocation) changes.nameLocation = name.trim();
    if (summary.trim() !== challenge.challengeSummary) changes.challengeSummary = summary.trim();
    if (value !== challenge.points) changes.points = value;
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
  };

  const busy = update.isPending;
  return (
    <form onSubmit={submit} noValidate>
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
          <FormField label={t('admin.challenges.columns.place')} error={submitted ? errors.name : undefined}>
            {props => (
              <input {...props} className={`${adminInput} ${invalidInput(submitted ? errors.name : undefined)}`} value={name} onChange={e => setName(e.target.value)} />
            )}
          </FormField>
          <FormField label={t('admin.challenges.fields.summary')}>
            {props => (
              <textarea {...props} rows={3} className={`${adminInput} h-auto resize-none py-2`} value={summary} onChange={e => setSummary(e.target.value)} />
            )}
          </FormField>
          <FormField label={t('admin.challenges.columns.points')} error={submitted ? errors.points : undefined}>
            {props => (
              <input {...props} type="number" min={0} max={MAX_POINTS} inputMode="numeric" className={`${adminInput} ${invalidInput(submitted ? errors.points : undefined)}`} value={points} onChange={e => setPoints(e.target.value)} />
            )}
          </FormField>
        </div>
      </AdminModal>
    </form>
  );
}
