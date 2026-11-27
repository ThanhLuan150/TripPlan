import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoRefreshOutline} from 'react-icons/io5';
import DropdownSelect from '@/components/ui/DropdownSelect';
import FieldError from '@/components/ui/FieldError';
import Toast from '@/components/ui/Toast';
import {apiBody, apiStatus, connectionErrorKey, isAiError} from '@/lib/apiClient';
import {addCommas} from '@/lib/date';
import {tripsApi} from '../api/tripsApi';
import {MAX_AI_EDIT_LENGTH, type AiEditDay, type DayRegeneration, type TripDay} from '../types';

const norm = (name?: string) => (name ?? '').trim().toLowerCase();

// Why no proposal came back (the itinerary is untouched in every case). The AI errors come first:
// an AI outage is a 503 too, which connectionErrorKey would call a database problem.
const proposeErrorKey = (error: unknown) => {
  const code = apiBody<{code?: string}>(error)?.code;
  if (code === 'AI_EMPTY_DAY') {
    return 'trips.dayRegen.empty';
  }
  if (code === 'AI_INVALID_RESPONSE' || apiStatus(error) === 502) {
    return 'trips.dayRegen.invalid';
  }
  if (isAiError(error)) {
    return 'trips.dayRegen.unavailable';
  }
  return connectionErrorKey(error) ?? 'trips.dayRegen.failed';
};

function DayPreview({title, day, existing}: {title: string; day: AiEditDay; existing?: Set<string>}) {
  const {t} = useTranslation();
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-700">{day.title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
        {day.activities.map((activity, i) => (
          <li key={i}>
            {activity.name_location}
            {activity.kept && (
              <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">{t('trips.dayRegen.kept')}</span>
            )}
            {existing && !activity.kept && !existing.has(norm(activity.name_location)) && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {t('trips.dayRegen.newPlace')}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-slate-500">{addCommas(day.transportCost + day.foodCost + day.otherCost)} VND</p>
    </div>
  );
}

// Ask the AI to rewrite ONE day, compare it with the current day, then Accept (saved) or Reject
// (dropped). Only that day is ever changed, and only by Accept.
export default function DayRegeneratePanel({tripId, days}: {tripId: string; days: TripDay[]}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const options = days.filter(day => day._id);
  const [dayId, setDayId] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<DayRegeneration | null>(null);
  const selected = dayId || options[0]?._id || '';
  const tooLong = text.trim().length > MAX_AI_EDIT_LENGTH;

  const notify = (type: 'error' | 'success' | 'info', text2: string) =>
    Toast.show({type, text1: t(type === 'error' ? 'common.failed' : 'common.success'), text2});

  const propose = useMutation({
    mutationFn: () => tripsApi.proposeDayRegeneration(tripId, selected, text.trim() || undefined),
    onSuccess: setResult,
    onError: error => notify('error', t(proposeErrorKey(error))),
  });
  const apply = useMutation({
    mutationFn: (proposalId: string) => tripsApi.applyDayRegeneration(tripId, proposalId),
    onSuccess: () => {
      setResult(null);
      setText('');
      queryClient.invalidateQueries({queryKey: ['trip', tripId]});
      queryClient.invalidateQueries({queryKey: ['trips']});
      notify('success', t('trips.dayRegen.applied'));
    },
    onError: error =>
      notify(
        'error',
        t(connectionErrorKey(error) ?? (apiStatus(error) === 404 || apiStatus(error) === 409 ? 'trips.dayRegen.applyInvalid' : 'trips.dayRegen.applyFailed')),
      ),
  });

  if (options.length === 0) {
    return null;
  }

  const currentDay = days.find(day => day._id === selected);
  const existing = new Set((currentDay?.challenges ?? []).map(c => norm(c.nameLocation)));

  return (
    <section className="card space-y-3 p-4" aria-labelledby="day-regen-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="day-regen-title" className="flex items-center gap-2 font-semibold text-slate-900">
          <IoRefreshOutline size={18} />
          {t('trips.dayRegen.title')}
        </h2>
        <span className="text-xs text-slate-500">{t('trips.dayRegen.hint')}</span>
      </div>

      <DropdownSelect
        label={t('trips.dayRegen.day')}
        value={selected}
        options={options.map(day => ({value: day._id!, label: day.title}))}
        onChange={id => {
          setDayId(id);
          setResult(null);
        }}
      />
      <textarea
        rows={2}
        value={text}
        aria-label={t('trips.dayRegen.placeholder')}
        placeholder={t('trips.dayRegen.placeholder')}
        aria-invalid={tooLong ? true : undefined}
        onChange={event => setText(event.target.value)}
        className="field w-full resize-y"
      />
      <div className="flex items-start justify-between gap-3">
        <FieldError role="alert">{tooLong ? String(t('trips.dayRegen.tooLong', {max: MAX_AI_EDIT_LENGTH})) : undefined}</FieldError>
        <span className="ml-auto text-xs text-slate-400">{t('trips.dayRegen.counter', {length: text.length, max: MAX_AI_EDIT_LENGTH})}</span>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary px-4 py-2 text-sm"
          disabled={propose.isPending || apply.isPending || tooLong}
          onClick={() => {
            setResult(null);
            propose.mutate();
          }}>
          {t('trips.dayRegen.regenerate')}
        </button>
      </div>

      {propose.isPending && <p className="text-sm text-slate-500">{t('trips.dayRegen.loading')}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3" role="group" aria-label={t('trips.dayRegen.previewTitle')}>
          <div>
            <h3 className="font-semibold text-slate-900">{t('trips.dayRegen.previewTitle')}</h3>
            <p className="text-xs text-slate-500">{t('trips.dayRegen.previewHint')}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DayPreview title={t('trips.dayRegen.current')} day={result.current} />
            <DayPreview title={t('trips.dayRegen.proposed')} day={result.proposal.day} existing={existing} />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline px-4 py-2 text-sm"
              disabled={apply.isPending}
              onClick={() => {
                // the server forgets it; the itinerary was never changed, so a failure here does not matter
                Promise.resolve(tripsApi.rejectDayRegeneration(tripId, result.proposal.id)).catch(() => undefined);
                setResult(null);
                notify('info', t('trips.dayRegen.rejected'));
              }}>
              {t('trips.dayRegen.reject')}
            </button>
            <button type="button" className="btn btn-primary px-4 py-2 text-sm" disabled={apply.isPending} onClick={() => apply.mutate(result.proposal.id)}>
              {apply.isPending ? t('trips.dayRegen.saving') : t('trips.dayRegen.accept')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
