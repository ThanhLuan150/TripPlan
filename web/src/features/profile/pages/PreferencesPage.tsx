import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import Page from '@/components/layout/Page';
import ConfirmModal from '@/components/ui/ConfirmModal';
import FieldError from '@/components/ui/FieldError';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {profileApi} from '../api/profileApi';
import {
  MAX_PREFERENCE_NOTES,
  PREFERENCES_KEY,
  PREFERENCE_CATEGORIES,
  preferencesErrorKey,
  type PreferenceCategory,
  type TravelPreferences,
} from '../preferences';


// The user's AI travel preferences: pick the groups they like, add a short note, save, or delete all.
// They are optional: the AI works without them and only uses them to personalize its answers.
export default function PreferencesPage() {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({queryKey: PREFERENCES_KEY, queryFn: profileApi.preferences});
  const [categories, setCategories] = useState<PreferenceCategory[]>([]);
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stored = query.data;
  const hasStored = Boolean(stored && (stored.categories.length > 0 || stored.notes));
  const errorKey = touched ? preferencesErrorKey(categories, notes) : null;

  // the form starts from what is stored
  useEffect(() => {
    if (stored) {
      setCategories(stored.categories);
      setNotes(stored.notes);
    }
  }, [stored]);

  const notify = (type: 'error' | 'success', text2: string) =>
    Toast.show({type, text1: t(type === 'error' ? 'common.failed' : 'common.success'), text2});

  const done = (data: {preferences: TravelPreferences}, messageKey: string) => {
    queryClient.setQueryData(PREFERENCES_KEY, data.preferences);
    setTouched(false);
    notify('success', t(messageKey));
  };
  const save = useMutation({
    mutationFn: () => profileApi.savePreferences({categories, notes: notes.trim()}),
    onSuccess: data => done(data, 'profile.preferences.saved'),
    onError: error => notify('error', t(connectionErrorKey(error) ?? 'profile.preferences.saveFailed')),
  });
  const remove = useMutation({
    mutationFn: profileApi.deletePreferences,
    onSuccess: data => {
      setConfirmDelete(false);
      done(data, 'profile.preferences.deleted');
    },
    onError: error => {
      setConfirmDelete(false);
      notify('error', t(connectionErrorKey(error) ?? 'profile.preferences.deleteFailed'));
    },
  });

  const toggle = (key: PreferenceCategory) =>
    setCategories(current => (current.includes(key) ? current.filter(item => item !== key) : [...current, key]));

  const submit = () => {
    setTouched(true);
    if (!preferencesErrorKey(categories, notes)) {
      save.mutate();
    }
  };

  return (
    <Page title={t('profile.preferences.title')}>
      <div className="card space-y-5 p-5">
        <p className="text-sm text-slate-600">{t('profile.preferences.intro')}</p>

        {query.isLoading && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
        {query.isError && (
          <p className="text-sm text-rose-600">
            {t('profile.preferences.loadFailed')}{' '}
            <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>
              {t('common.retry')}
            </button>
          </p>
        )}

        {!query.isLoading && !query.isError && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-800">{t('profile.preferences.categories')}</legend>
              <div className="flex flex-wrap gap-2">
                {PREFERENCE_CATEGORIES.map(key => {
                  const on = categories.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(key)}
                      className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                        on
                          ? 'bg-brand-500 text-white ring-brand-500'
                          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                      }`}>
                      {t(`profile.preferences.category.${key}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="preferences-notes" className="mb-1 block text-sm font-semibold text-slate-800">
                {t('profile.preferences.notes')}
              </label>
              <textarea
                id="preferences-notes"
                className="field min-h-24 w-full"
                value={notes}
                maxLength={MAX_PREFERENCE_NOTES + 50}
                placeholder={t('profile.preferences.notesPlaceholder')}
                onChange={event => setNotes(event.target.value)}
                onBlur={() => setTouched(true)}
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {notes.trim().length}/{MAX_PREFERENCE_NOTES}
              </p>
              {errorKey && <FieldError>{t(errorKey)}</FieldError>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" disabled={save.isPending} onClick={submit}>
                {save.isPending ? t('profile.saving') : t('profile.save')}
              </button>
              {hasStored && (
                <button
                  type="button"
                  className="btn btn-outline text-rose-600"
                  disabled={remove.isPending}
                  onClick={() => setConfirmDelete(true)}>
                  {t('profile.preferences.delete')}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        visible={confirmDelete}
        danger
        title={t('profile.preferences.deleteTitle')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}>
        {t('profile.preferences.deleteText')}
      </ConfirmModal>
    </Page>
  );
}
