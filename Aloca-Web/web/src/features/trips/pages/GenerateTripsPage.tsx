import {useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack, IoRefresh, IoSparkles} from 'react-icons/io5';
import {routes} from '@/app/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {apiMessage, connectionErrorKey, isAiError} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';
import {useGeneratedPlans} from '../hooks/useTrips';
import type {GenerateTripParams, PlanDay} from '../types';
import sorry from '@/assets/images/sorry.png';

const budgetLabelKey = {
  low: 'trips.create.budgetLow',
  mid: 'trips.create.budgetMid',
  high: 'trips.create.budgetHigh',
} as const;

export default function GenerateTripsPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const params = useLocation().state as GenerateTripParams | null;
  const [planName, setPlanName] = useState('');
  const [planConfirm, setPlanConfirm] = useState<PlanDay[] | null>(null);
  const {data: result, isFetching, isError, error, refetch} = useGeneratedPlans(params);

  const save = useMutation({
    mutationFn: ({name, days}: {name: string; days: PlanDay[]}) =>
      tripsApi.save(params!, name, days),
    onSuccess: data => navigate(routes.DetailTripScreen(data.tripId), {replace: true}),
    onError: err =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2:
          apiMessage(err) === 'A trip with the same name already exists'
            ? t('trips.generate.duplicateName')
            : t('trips.generate.saveFailed'),
      }),
  });

  if (!params) {
    return <Navigate to={routes.TripPlanChoose} replace />;
  }

  const handleConfirm = () => {
    if (planName.trim() === '') {
      Toast.show({type: 'error', text1: t('common.failed'), text2: t('trips.generate.nameRequired')});
      return;
    }
    if (planConfirm) {
      save.mutate({name: planName.trim(), days: planConfirm});
    }
    setPlanName('');
    setPlanConfirm(null);
  };

  if (isFetching || save.isPending) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="relative grid size-24 place-items-center">
          <Spinner size={96} className="absolute inset-0" />
          <IoSparkles size={34} className="animate-pulse text-brand-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">{t('common.pleaseWait')}</p>
          <p className="mt-1 text-sm text-slate-500">
            {save.isPending
              ? t('trips.generate.saving')
              : t('trips.generate.loading', {location: params.location})}
          </p>
        </div>
      </div>
    );
  }

  if (isError || !result) {
    const overlap = apiMessage(error)?.startsWith('Please choose another day');
    return (
      <div className="px-4 pt-2 pb-6 md:px-6">
        <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <img src={sorry} alt="" className="h-40 object-contain" />
          <h2 className="text-xl font-bold text-slate-900">{t('trips.generate.errorTitle')}</h2>
          <p className="text-sm text-slate-500">
            {overlap
              ? t('trips.generate.overlap')
              : isAiError(error)
                ? t('trips.generate.aiUnavailable')
                : t(connectionErrorKey(error) ?? 'trips.generate.errorText')}
          </p>
          <div className="mt-2 flex w-full gap-3">
            <button type="button" className="btn btn-outline flex-1" onClick={() => navigate(-1)}>
              {t('common.back')}
            </button>
            {!overlap && (
              <button type="button" className="btn btn-primary flex-1" onClick={() => refetch()}>
                <IoRefresh size={18} />
                {t('common.retry')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-6 md:px-6">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={() => navigate(-1)}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-soft ring-1 ring-slate-100 transition hover:bg-slate-50">
          <IoArrowBack size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">
            {t('trips.generate.title', {location: params.location})}
          </h1>
          <p className="truncate text-sm text-slate-500">
            {t('trips.generate.summary', {
              days: params.days,
              people: params.quantity,
              budget: t(budgetLabelKey[params.budgetTier] ?? budgetLabelKey.mid),
            })}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {Object.values(result).map((plan, planIndex) => (
          <section key={planIndex} className="card flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                {t('trips.generate.plan', {n: planIndex + 1})}
              </span>
              <span className="text-sm text-slate-500">{params.location}</span>
            </div>
            <ol className="ml-3 space-y-5 border-l-2 border-brand-100">
              {Object.values(plan).map((day, dayIndex) => (
                <li key={dayIndex} className="relative pl-6">
                  <span className="absolute top-1 -left-[9px] size-4 rounded-full bg-brand-500 ring-4 ring-white" />
                  <p className="font-semibold text-slate-900">
                    <span className="text-brand-600">{t('trips.generate.day', {n: dayIndex + 1})}</span>{' '}
                    · {day.title}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                    {day.activities?.map((activity, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300" />
                        {activity.challenge_summary}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-primary mt-6 h-11 w-full"
              onClick={() => setPlanConfirm(Object.values(plan))}>
              {t('trips.generate.choose')}
            </button>
          </section>
        ))}
      </div>

      <ConfirmModal
        visible={planConfirm !== null}
        title={t('trips.generate.nameTitle')}
        onCancel={() => {
          setPlanConfirm(null);
          setPlanName('');
        }}
        onConfirm={handleConfirm}>
        <input
          className="field"
          maxLength={35}
          autoFocus
          value={planName}
          placeholder={t('trips.generate.namePlaceholder', {
            example: t('trips.generate.nameExample', {location: params.location, days: params.days}),
          })}
          aria-label={t('trips.generate.nameLabel')}
          onChange={e => setPlanName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </ConfirmModal>
    </div>
  );
}
