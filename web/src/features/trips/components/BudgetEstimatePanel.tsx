import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCheckmark, IoWalletOutline} from 'react-icons/io5';
import FieldError from '@/components/ui/FieldError';
import Toast from '@/components/ui/Toast';
import {apiBody, apiStatus, connectionErrorKey, isAiError} from '@/lib/apiClient';
import {addCommas} from '@/lib/date';
import {tripsApi} from '../api/tripsApi';
import {choiceClass} from './form/styles';
import {amountErrorKey, travelersErrorKey} from '../budgetValidation';
import {MAX_TRAVELERS, SPENDING_LEVELS, type BudgetEstimate, type SpendingLevel, type TripDay} from '../types';

// Why no estimate came back (the saved one is untouched in every case). AI errors come first: an AI
// outage is a 503 too, which connectionErrorKey would call a database problem.
const estimateErrorKey = (error: unknown) => {
  if (apiBody<{code?: string}>(error)?.code === 'AI_INVALID_RESPONSE' || apiStatus(error) === 502) {
    return 'trips.budget.invalid';
  }
  if (isAiError(error)) {
    return 'trips.budget.unavailable';
  }
  if (apiStatus(error) === 400) {
    return 'trips.budget.noItinerary';
  }
  return connectionErrorKey(error) ?? 'trips.budget.failed';
};

// Ask the AI for a budget estimate, view it by category, and adjust the amounts.
// Everything shown here is an ESTIMATE: it is never an expense and never changes the trip.
export default function BudgetEstimatePanel({tripId, days = []}: {tripId: string; days?: TripDay[]}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ['tripBudget', tripId];
  const [travelers, setTravelers] = useState('1');
  const [level, setLevel] = useState<SpendingLevel>('moderate');
  const [touched, setTouched] = useState(false);
  // amounts being edited (as typed), or null when not editing
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const saved = useQuery({queryKey, queryFn: () => tripsApi.budgetEstimate(tripId)});
  const estimate = saved.data ?? null;

  const notify = (type: 'error' | 'success', text2: string) =>
    Toast.show({type, text1: t(type === 'error' ? 'common.failed' : 'common.success'), text2});
  const store = (next: BudgetEstimate) => queryClient.setQueryData(queryKey, next);

  const ask = useMutation({
    mutationFn: () => tripsApi.estimateBudget(tripId, {travelers: Number(travelers), spendingLevel: level}),
    onSuccess: next => {
      store(next);
      setDraft(null);
      notify('success', t('trips.budget.estimated'));
    },
    onError: error => notify('error', t(estimateErrorKey(error))),
  });
  const update = useMutation({
    mutationFn: (amounts: {key: BudgetEstimate['categories'][number]['key']; amount: number}[]) =>
      tripsApi.updateBudgetEstimate(tripId, amounts),
    onSuccess: next => {
      store(next);
      setDraft(null);
      notify('success', t('trips.budget.updated'));
    },
    onError: error => notify('error', t(connectionErrorKey(error) ?? 'trips.budget.updateFailed')),
  });

  // costs suggested when the trip was planned (per person, not actual spending)
  const planned = days.reduce((sum, d) => sum + (d.transportCost ?? 0) + (d.foodCost ?? 0) + (d.otherCost ?? 0), 0);
  const travelersError = touched ? travelersErrorKey(travelers) : null;
  const submit = () => {
    setTouched(true);
    if (!travelersErrorKey(travelers) && !ask.isPending) {
      ask.mutate();
    }
  };

  const draftErrors = draft ? Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, amountErrorKey(value)])) : {};
  const draftValid = draft !== null && Object.values(draftErrors).every(error => !error);
  const draftTotal = draft ? Object.values(draft).reduce((sum, value) => sum + (amountErrorKey(value) ? 0 : Math.round(Number(value))), 0) : 0;

  return (
    <section className="card space-y-3 p-4" aria-labelledby="budget-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="budget-title" className="flex items-center gap-2 font-semibold text-slate-900">
          <IoWalletOutline size={18} />
          {t('trips.budget.title')}
        </h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          {t('trips.budget.badge')}
        </span>
      </div>
      <p className="text-xs text-slate-500">{t('trips.budget.notExpense')}</p>
      {planned > 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600" data-testid="budget-planned">
          {t('trips.budget.planned', {amount: addCommas(planned)})}
        </p>
      )}

      <form
        noValidate
        className="flex flex-wrap items-start gap-3"
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}>
        <div className="max-w-56 text-sm text-slate-700">
          <label htmlFor="budget-travelers">{t('trips.budget.travelers')}</label>
          <input
            id="budget-travelers"
            type="number"
            min={1}
            max={MAX_TRAVELERS}
            value={travelers}
            aria-invalid={travelersError ? true : undefined}
            onChange={event => setTravelers(event.target.value)}
            className="field mt-1 block h-10 w-32 py-0"
          />
          <FieldError role="alert">{travelersError ? String(t(travelersError, {max: MAX_TRAVELERS})) : undefined}</FieldError>
        </div>
        <div className="text-sm text-slate-700">
          <span id="budget-level-label">{t('trips.budget.level')}</span>
          <div role="radiogroup" aria-labelledby="budget-level-label" className="mt-1 flex gap-2">
            {SPENDING_LEVELS.map(value => {
              const selected = level === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLevel(value)}
                  className={`${choiceClass(selected)} flex h-10 items-center gap-1 px-3 text-sm font-semibold ${selected ? 'text-brand-700' : 'text-slate-900'}`}>
                  {t(`trips.budget.levels.${value}`)}
                  {selected && <IoCheckmark size={16} />}
                </button>
              );
            })}
          </div>
        </div>
        <button type="submit" className="btn btn-primary mt-6 h-10 px-4 text-sm" disabled={ask.isPending}>
          {estimate ? t('trips.budget.reestimate') : t('trips.budget.estimate')}
        </button>
      </form>

      {ask.isPending && <p className="text-sm text-slate-500">{t('trips.budget.loading')}</p>}
      {saved.isError && <p className="text-sm text-red-600">{t('trips.budget.loadFailed')}</p>}
      {!saved.isLoading && !saved.isError && !estimate && <p className="text-sm text-slate-500">{t('trips.budget.empty')}</p>}

      {estimate && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3" role="group" aria-label={t('trips.budget.title')}>
          <p className="text-xs text-slate-500">
            {t('trips.budget.forPeople', {count: estimate.travelers, level: t(`trips.budget.levels.${estimate.spendingLevel}`)})}
            {estimate.source === 'manual' && <span className="ml-2 font-semibold text-sky-700">{t('trips.budget.edited')}</span>}
          </p>
          <ul className="divide-y divide-slate-100">
            {estimate.categories.map(category => (
              <li key={category.key} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-slate-800">{t(`trips.budget.categories.${category.key}`)}</span>
                  {category.note && <span className="block text-xs text-slate-500">{category.note}</span>}
                </span>
                {draft ? (
                  <span className="text-right">
                    <input
                      type="number"
                      min={0}
                      value={draft[category.key]}
                      aria-label={t(`trips.budget.categories.${category.key}`)}
                      aria-invalid={draftErrors[category.key] ? true : undefined}
                      onChange={event => setDraft({...draft, [category.key]: event.target.value})}
                      className="field w-40 text-right"
                    />
                    <FieldError role="alert">{draftErrors[category.key] ? String(t(draftErrors[category.key] as string)) : undefined}</FieldError>
                  </span>
                ) : (
                  <span className="whitespace-nowrap font-medium text-slate-900">
                    {addCommas(category.amount)} {estimate.currency}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="flex items-center justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
            <span>{t('trips.budget.total')}</span>
            <span data-testid="budget-total">
              {addCommas(draft ? draftTotal : estimate.total)} {estimate.currency}
            </span>
          </p>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">{t('trips.budget.assumptions')}</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
              {estimate.assumptions.map((assumption, index) => (
                <li key={index}>{assumption}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            {draft ? (
              <>
                <button type="button" className="btn btn-outline px-4 py-2 text-sm" disabled={update.isPending} onClick={() => setDraft(null)}>
                  {t('trips.budget.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 text-sm"
                  disabled={!draftValid || update.isPending}
                  onClick={() => update.mutate(estimate.categories.map(c => ({key: c.key, amount: Math.round(Number(draft[c.key]))})))}>
                  {update.isPending ? t('trips.budget.saving') : t('trips.budget.save')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-outline px-4 py-2 text-sm"
                onClick={() => setDraft(Object.fromEntries(estimate.categories.map(c => [c.key, String(c.amount)])))}>
                {t('trips.budget.edit')}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
