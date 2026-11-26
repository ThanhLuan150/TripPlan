import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoChatbubbles, IoLocationSharp, IoSparklesOutline} from 'react-icons/io5';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import DraftBanner from '@/components/ui/DraftBanner';
import FieldError from '@/components/ui/FieldError';
import Spinner from '@/components/ui/Spinner';
import {apiBody, apiStatus, connectionErrorKey, isAiError} from '@/lib/apiClient';
import {areaTypes} from '@/features/trips/data/areaTypes';
import BudgetField from '@/features/trips/components/form/BudgetField';
import {budgetOptions} from '@/features/trips/data/budgets';
import type {BudgetTier} from '@/features/trips/types';
import ProvinceField from '@/features/trips/components/form/ProvinceField';
import {useDraft} from '@/hooks/useDraft';
import {DraftNames} from '@/lib/drafts';
import {formatDate} from '@/lib/date';
import {youtubeId} from '@/lib/youtube';
import {destinationsApi} from '../api';
import {HISTORY_KEY} from '../keys';
import AddToTripDialog from '../components/AddToTripDialog';
import SearchHistory from '../components/SearchHistory';
import {planPrefill} from '../plan';
import {MAX_RECOMMEND_QUERY_LENGTH, type Recommendation, type SearchDetail} from '../types';
import {recommendErrors, type RecommendErrors} from '../validation';

// The AI errors come first: an AI outage is a 503 too, which connectionErrorKey would call a database problem.
const errorKey = (error: unknown) => {
  if (apiBody<{code?: string}>(error)?.code === 'AI_INVALID_RESPONSE' || apiStatus(error) === 502) {
    return 'destinations.invalid';
  }
  if (isAiError(error)) {
    return 'destinations.unavailable';
  }
  return connectionErrorKey(error) ?? 'destinations.failed';
};

function PlaceDetails({item}: {item: Recommendation}) {
  const {t} = useTranslation();
  const place = item.place!;
  const videos = place.videos.filter(video => youtubeId(video.youtubeLink));
  return (
    <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3" role="region" aria-label={t('destinations.detailsOf', {name: item.name})}>
      {place.imageUrl && <img src={place.imageUrl} alt={place.title} className="h-44 w-full rounded-xl object-cover" />}
      <p className="flex items-center gap-1.5 text-sm text-slate-700">
        <IoLocationSharp size={16} className="text-brand-600" />
        {place.title}
        {place.location && <span className="text-slate-500">· {place.location}</span>}
      </p>
      {videos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500">{t('destinations.videos')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {videos.map(video => (
              <li key={video.id}>
                <a href={video.youtubeLink} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                  {video.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({item, onUsed}: {item: Recommendation; onUsed: (tripId?: string) => void}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  return (
    <li className="card space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{item.name}</h3>
          {item.province && <p className="text-xs text-slate-500">{item.province}</p>}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            item.inApp ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
          {item.inApp ? t('destinations.inApp') : t('destinations.aiOnly')}
        </span>
      </div>
      <p className="text-sm text-slate-700">{item.description}</p>
      <p className="text-sm text-slate-600">
        <span className="font-semibold">{t('destinations.why')}: </span>
        {item.reason}
      </p>
      {!item.inApp && <p className="text-xs text-amber-700">{t('destinations.aiOnlyHint')}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary px-4 py-2 text-sm"
          aria-label={t('destinations.planTripFor', {name: item.name})}
          onClick={() => {
            onUsed();
            navigate(routes.TripPlanChoose, {state: planPrefill(item)});
          }}>
          {t('destinations.planTrip')}
        </button>
        <button
          type="button"
          className="btn btn-outline px-4 py-2 text-sm"
          aria-label={t('destinations.addToTripFor', {name: item.name})}
          onClick={() => setAdding(true)}>
          {t('destinations.addToTrip')}
        </button>
      </div>
      {adding && <AddToTripDialog item={item} onClose={() => setAdding(false)} onAdded={onUsed} />}
      {item.inApp && item.place && (
        <>
          <button
            type="button"
            aria-expanded={open}
            className="btn btn-outline px-4 py-2 text-sm"
            onClick={() => setOpen(value => !value)}>
            {open ? t('destinations.hideDetails') : t('destinations.viewDetails')}
          </button>
          {open && <PlaceDetails item={item} />}
        </>
      )}
    </li>
  );
}

// Describe what you look for (plus interests, region, budget) and the AI suggests places.
// The form is kept as a draft while the user types, every answer goes to the history below, and a
// suggestion leads straight to a new plan or to an existing trip. Places the app has no data for are
// labelled as AI-only suggestions.
export default function RecommendPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [budgetTier, setBudgetTier] = useState<BudgetTier | ''>('');
  const budgets = budgetOptions(1);
  const budget = budgets.find(option => option.tier === budgetTier)?.value ?? '';
  // shown once the user tried to send, then kept up to date while they type; a too long request is flagged at once
  const [submitted, setSubmitted] = useState(false);
  const found = recommendErrors({query, interests, region, budget});
  const errors: RecommendErrors = submitted ? found : found.query === 'destinations.tooLong' ? {query: found.query} : {};
  // what is on screen: the answer, its copy in the history, and the earlier suggestion being read again
  const [result, setResult] = useState<{recommendations: Recommendation[]; historyId: string | null} | null>(null);
  const [reading, setReading] = useState<SearchDetail | null>(null);
  const queryClient = useQueryClient();

  // the form as a draft: not saved right after a search (the history has it) and not when empty
  const formValue = {query, interests, region, budgetTier};
  const [sent, setSent] = useState('');
  const unchanged = JSON.stringify(formValue) === sent;
  const draft = useDraft(DraftNames.recommend, formValue, !query.trim() && interests.length === 0 && !region && !budgetTier || unchanged);

  const recommend = useMutation({
    mutationFn: destinationsApi.recommend,
    onSuccess: data => {
      setResult({recommendations: data.recommendations, historyId: data.historyId});
      setReading(null);
      setSent(JSON.stringify(formValue));
      draft.clear();
      queryClient.invalidateQueries({queryKey: HISTORY_KEY});
    },
  });

  // a plan was started from a suggestion: its history entry moves to "Created"
  const markUsed = (tripId?: string) => {
    const id = result?.historyId;
    if (id) {
      Promise.resolve(destinationsApi.setStatus(id, 'created', tripId))
        .catch(() => undefined)
        .finally(() => queryClient.invalidateQueries({queryKey: HISTORY_KEY}));
    }
  };

  // read an earlier suggestion again: its request goes back into the form, so it can be changed and asked again
  const openHistory = (search: SearchDetail) => {
    setQuery(search.query);
    setInterests(search.interests);
    setRegion(search.region);
    setBudgetTier(budgets.find(option => option.value === search.budget)?.tier ?? '');
    setSubmitted(false);
    setResult({recommendations: search.recommendations, historyId: search.id});
    setReading(search);
    setSent(JSON.stringify({
      query: search.query,
      interests: search.interests,
      region: search.region,
      budgetTier: budgets.find(option => option.value === search.budget)?.tier ?? '',
    }));
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const submit = () => {
    const params = {query, interests, region, budget};
    setSubmitted(true);
    if (Object.keys(found).length === 0 && !recommend.isPending) {
      setResult(null);
      setReading(null);
      recommend.mutate(params);
    }
  };
  const toggle = (item: string) =>
    setInterests(value => (value.includes(item) ? value.filter(a => a !== item) : [...value, item]));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <IoSparklesOutline size={22} className="text-brand-600" />
          {t('destinations.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t('destinations.subtitle')}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500">
          <span>{t('destinations.toChatHint')}</span>
          <button
            type="button"
            onClick={() => navigate(routes.Chat)}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
            <IoChatbubbles size={14} aria-hidden />
            {t('destinations.toChat')}
          </button>
        </p>
      </div>

      {draft.pending && (
        <DraftBanner
          savedAt={draft.pending.savedAt}
          onContinue={() => {
            const saved = draft.resume();
            if (saved) {
              setQuery(saved.query);
              setInterests(saved.interests);
              setRegion(saved.region);
              setBudgetTier(saved.budgetTier);
            }
          }}
          onDiscard={draft.discard}
        />
      )}

      <form
        noValidate
        className="card space-y-4 p-4"
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}>
        <div>
          <label htmlFor="rec-query" className="text-sm font-semibold text-slate-800">
            {t('destinations.query')}
          </label>
          <textarea
            id="rec-query"
            rows={2}
            value={query}
            placeholder={t('destinations.queryPlaceholder')}
            aria-invalid={errors.query ? true : undefined}
            onChange={event => setQuery(event.target.value)}
            className="field mt-1 w-full resize-y"
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError role="alert">{errors.query ? String(t(errors.query, {max: MAX_RECOMMEND_QUERY_LENGTH})) : undefined}</FieldError>
            <span className="mt-1.5 ml-auto text-xs text-slate-400">{query.length}/{MAX_RECOMMEND_QUERY_LENGTH}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">{t('destinations.interests')}</p>
          <div role="group" aria-label={t('destinations.interests')} aria-invalid={errors.interests ? true : undefined} className="mt-1 flex flex-wrap gap-2">
            {areaTypes.map(({value, labelKey}) => (
              <button
                key={value}
                type="button"
                aria-pressed={interests.includes(value)}
                onClick={() => toggle(value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  interests.includes(value)
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : `${errors.interests ? 'border-rose-300' : 'border-slate-200'} text-slate-700 hover:border-brand-300 hover:bg-brand-50`
                }`}>
                {t(labelKey)}
              </button>
            ))}
          </div>
          <FieldError role="alert">{errors.interests ? String(t(errors.interests)) : undefined}</FieldError>
        </div>

        <ProvinceField
            value={region}
            onChange={setRegion}
            error={errors.region ? String(t(errors.region)) : undefined}
            title={t('destinations.region')}
            placeholder={t('destinations.anyRegion')}
          />

        <BudgetField
          value={budgetTier}
          options={budgets}
          // choosing the chosen range again clears it: the budget is optional
          onChange={tier => setBudgetTier(value => (value === tier ? '' : tier))}
          error={errors.budget ? String(t(errors.budget)) : undefined}
        />

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary px-4 py-2 text-sm" disabled={recommend.isPending}>
            {t('destinations.ask')}
          </button>
        </div>
      </form>

      {recommend.isPending && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500" role="status">
          <Spinner size={20} />
          {t('destinations.loading')}
        </div>
      )}

      {recommend.isError && (
        <div role="alert" className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-slate-600">{t(errorKey(recommend.error))}</p>
          <button type="button" className="btn btn-outline" onClick={submit}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {result && result.recommendations.length === 0 && (
        <div role="status" className="card p-6 text-center text-sm text-slate-500">
          {t('destinations.empty')}
        </div>
      )}

      {result && result.recommendations.length > 0 && (
        <section aria-label={t('destinations.results')} className="space-y-3">
          {reading && (
            <p role="status" className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
              {t('destinations.historyOpened', {date: formatDate(reading.createdAt)})}
            </p>
          )}
          <p className="text-xs text-slate-500">{t('destinations.disclaimer')}</p>
          <ul className="space-y-3">
            {result.recommendations.map(item => (
              <RecommendationCard key={item.name} item={item} onUsed={markUsed} />
            ))}
          </ul>
        </section>
      )}

      <SearchHistory onOpen={openHistory} />
    </div>
  );
}
