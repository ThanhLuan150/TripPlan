import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoSparklesOutline} from 'react-icons/io5';
import FieldError from '@/components/ui/FieldError';
import Toast from '@/components/ui/Toast';
import {apiBody, apiStatus, connectionErrorKey, isAiError} from '@/lib/apiClient';
import {addCommas} from '@/lib/date';
import {tripsApi} from '../api/tripsApi';
import {aiEditErrorKey} from '../aiEditValidation';
import {MAX_AI_EDIT_LENGTH, type AiEditProposal, type TripDay} from '../types';

const norm = (name?: string) => (name ?? '').trim().toLowerCase();

// Why no proposal came back (the stored itinerary is untouched in every case). The AI errors come first:
// an AI outage is a 503 too, which connectionErrorKey would call a database problem.
const proposeErrorKey = (error: unknown) => {
  if (apiBody<{code?: string}>(error)?.code === 'AI_INVALID_RESPONSE' || apiStatus(error) === 502) {
    return 'trips.aiEdit.invalid';
  }
  if (isAiError(error)) {
    return 'trips.aiEdit.unavailable';
  }
  return connectionErrorKey(error) ?? 'trips.aiEdit.failed';
};

// Ask the AI to change the itinerary, preview the proposal, then Accept (saved) or Reject (dropped).
// The stored itinerary is only changed by Accept.
export default function AiEditPanel({tripId, days}: {tripId: string; days: TripDay[]}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [proposal, setProposal] = useState<AiEditProposal | null>(null);
  const errorKey = touched ? aiEditErrorKey(text) : null;

  const notify = (type: 'error' | 'success' | 'info', text2: string) =>
    Toast.show({type, text1: t(type === 'error' ? 'common.failed' : 'common.success'), text2});

  const propose = useMutation({
    mutationFn: (instruction: string) => tripsApi.proposeAiEdit(tripId, instruction),
    onSuccess: setProposal,
    onError: error => notify('error', t(proposeErrorKey(error))),
  });
  const apply = useMutation({
    mutationFn: (proposalId: string) => tripsApi.applyAiEdit(tripId, proposalId),
    onSuccess: () => {
      setProposal(null);
      setText('');
      setTouched(false);
      queryClient.invalidateQueries({queryKey: ['trip', tripId]});
      queryClient.invalidateQueries({queryKey: ['trips']});
      notify('success', t('trips.aiEdit.applied'));
    },
    onError: error =>
      notify(
        'error',
        t(connectionErrorKey(error) ?? (apiStatus(error) === 404 || apiStatus(error) === 409 ? 'trips.aiEdit.applyInvalid' : 'trips.aiEdit.applyFailed')),
      ),
  });

  const submit = () => {
    setTouched(true);
    if (!aiEditErrorKey(text) && !propose.isPending) {
      setProposal(null);
      propose.mutate(text.trim());
    }
  };

  const existing = new Set(days.flatMap(day => day.challenges.map(c => norm(c.nameLocation))));

  return (
    <section className="card space-y-3 p-4" aria-labelledby="ai-edit-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ai-edit-title" className="flex items-center gap-2 font-semibold text-slate-900">
          <IoSparklesOutline size={18} />
          {t('trips.aiEdit.title')}
        </h2>
        <span className="text-xs text-slate-500">{t('trips.aiEdit.hint')}</span>
      </div>

      <form
        noValidate
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}>
        <textarea
          rows={2}
          value={text}
          aria-label={t('trips.aiEdit.placeholder')}
          placeholder={t('trips.aiEdit.placeholder')}
          aria-invalid={errorKey ? true : undefined}
          onChange={event => setText(event.target.value)}
          // Enter sends, Shift+Enter is a new line (not while an IME is composing, e.g. Vietnamese)
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          className="field w-full resize-y"
        />
        <div className="flex items-start justify-between gap-3">
          <FieldError role="alert">{errorKey ? String(t(errorKey, {max: MAX_AI_EDIT_LENGTH})) : undefined}</FieldError>
          <span className="mt-1.5 ml-auto text-xs text-slate-400">
            {t('trips.aiEdit.counter', {length: text.length, max: MAX_AI_EDIT_LENGTH})}
          </span>
        </div>
        <div className="mt-2 flex justify-end">
          <button type="submit" className="btn btn-primary px-4 py-2 text-sm" disabled={propose.isPending}>
            {t('trips.aiEdit.ask')}
          </button>
        </div>
      </form>

      {propose.isPending && <p className="text-sm text-slate-500">{t('trips.aiEdit.loading')}</p>}

      {proposal && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3" role="group" aria-label={t('trips.aiEdit.previewTitle')}>
          <div>
            <h3 className="font-semibold text-slate-900">{t('trips.aiEdit.previewTitle')}</h3>
            <p className="text-xs text-slate-500">
              {t('trips.aiEdit.previewHint')} {t('trips.aiEdit.keptHint')}
            </p>
          </div>
          {proposal.days.map((day, index) => (
            <div key={index} className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">
                {t('trips.aiEdit.day', {n: index + 1})}: {day.title}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                {day.activities.map((activity, i) => (
                  <li key={i}>
                    {activity.name_location}
                    {activity.kept && (
                      <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        {t('trips.aiEdit.kept')}
                      </span>
                    )}
                    {!activity.kept && !existing.has(norm(activity.name_location)) && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {t('trips.aiEdit.newPlace')}
                      </span>
                    )}
                    <span className="block text-xs text-slate-500">{activity.challenge_summary}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">{addCommas(day.transportCost + day.foodCost + day.otherCost)} VND</p>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline px-4 py-2 text-sm"
              disabled={apply.isPending}
              onClick={() => {
                // the server forgets it; the itinerary was never changed, so a failure here does not matter
                Promise.resolve(tripsApi.rejectAiEdit(tripId, proposal.id)).catch(() => undefined);
                setProposal(null);
                notify('info', t('trips.aiEdit.rejected'));
              }}>
              {t('trips.aiEdit.reject')}
            </button>
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-sm"
              disabled={apply.isPending}
              onClick={() => apply.mutate(proposal.id)}>
              {apply.isPending ? t('trips.aiEdit.saving') : t('trips.aiEdit.accept')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
