import {useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {IoCheckmarkCircle, IoClose} from 'react-icons/io5';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import Spinner from '@/components/ui/Spinner';
import {apiBody, apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {formatDate} from '@/lib/date';
import {tripsApi} from '@/features/trips/api/tripsApi';
import {MAX_PLACES_PER_DAY, type AddPlaceResult} from '@/features/trips/types';
import {planPrefill} from '../plan';
import type {Recommendation} from '../types';

const errorKey = (error: unknown) => {
  const code = apiBody<{code?: string}>(error)?.code;
  if (code === 'PLACE_ALREADY_IN_TRIP') {
    return 'destinations.addDuplicate';
  }
  if (code === 'DAY_FULL') {
    return 'destinations.addDayFullError';
  }
  // an AI-code 503 cannot happen here: this call does not use the AI
  return (apiStatus(error) === 503 || !apiStatus(error) ? connectionErrorKey(error) : null) ?? 'destinations.addFailed';
};

const radioClass = (selected: boolean, disabled = false) =>
  `flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition ${
    disabled
      ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
      : selected
        ? 'border-brand-500 bg-brand-50 text-slate-900'
        : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50/50'
  }`;

// Add one suggested place to a day of one of the user's trips, in plain steps: choose the trip, choose
// the day, read what will happen, confirm. Nothing is saved before the confirmation.
export default function AddToTripDialog({
  item,
  onClose,
  onAdded,
}: {
  item: Recommendation;
  onClose: () => void;
  // the place is now in this trip
  onAdded?: (tripId: string) => void;
}) {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tripId, setTripId] = useState('');
  const [dayId, setDayId] = useState('');
  const [done, setDone] = useState<AddPlaceResult | null>(null);
  const province = planPrefill(item).location ?? item.province;

  const trips = useQuery({queryKey: ['trips'], queryFn: tripsApi.list});
  const detail = useQuery({
    queryKey: ['trip', tripId],
    enabled: !!tripId,
    queryFn: () => tripsApi.get(tripId),
  });
  const trip = trips.data?.find(entry => entry._id === tripId);
  const days = detail.data?.dataTripDays ?? [];
  const dayIndex = days.findIndex(day => day._id === dayId);
  const dayLabel = dayIndex >= 0 ? t('trips.aiEdit.day', {n: dayIndex + 1}) : '';

  const add = useMutation({
    mutationFn: () =>
      tripsApi.addPlace(tripId, {name: item.name, dayId, province: item.province, summary: item.description}),
    onSuccess: result => {
      setDone(result);
      onAdded?.(tripId);
      queryClient.invalidateQueries({queryKey: ['trip', tripId]});
      queryClient.invalidateQueries({queryKey: ['trips']});
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // trips of the same province first: the likeliest choice
  const sorted = [...(trips.data ?? [])].sort(
    (a, b) => Number(b.location === province) - Number(a.location === province),
  );

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={t('destinations.addTitle', {name: item.name})}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg animate-pop-in overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
          <IoClose size={20} />
        </button>

        {done ? (
          <div className="space-y-4 text-center" role="status">
            <IoCheckmarkCircle size={48} className="mx-auto text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              {t('destinations.addDone', {name: item.name, day: dayLabel})}
            </h2>
            <p className="text-sm text-slate-600">{t('destinations.addDoneHint')}</p>
            {!done.located && <p className="text-xs text-amber-700">{t('destinations.addNotLocated')}</p>}
            <div className="flex justify-center gap-2">
              <button type="button" className="btn btn-outline px-4 py-2 text-sm" onClick={onClose}>
                {t('destinations.addClose')}
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 py-2 text-sm"
                onClick={() => navigate(routes.DetailTripScreen(tripId))}>
                {t('destinations.addViewTrip')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="pr-8 text-lg font-semibold text-slate-900">{t('destinations.addTitle', {name: item.name})}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('destinations.addIntro')}</p>
            </div>

            <section aria-label={t('destinations.addStep1')} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">{t('destinations.addStep1')}</h3>
              {trips.isLoading && (
                <div className="grid place-items-center py-4">
                  <Spinner size={24} />
                </div>
              )}
              {trips.isError && (
                <div role="alert" className="space-y-2 text-center">
                  <p className="text-sm text-slate-600">{t(connectionErrorKey(trips.error) ?? 'destinations.addLoadTripsFailed')}</p>
                  <button type="button" className="btn btn-outline px-3 py-1.5 text-sm" onClick={() => trips.refetch()}>
                    {t('common.retry')}
                  </button>
                </div>
              )}
              {trips.data && trips.data.length === 0 && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-600">{t('destinations.addNoTrips')}</p>
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 text-sm"
                    onClick={() => navigate(routes.TripPlanChoose, {state: planPrefill(item)})}>
                    {t('destinations.addCreate')}
                  </button>
                </div>
              )}
              {sorted.length > 0 && (
                <div role="radiogroup" aria-label={t('destinations.addStep1')} className="max-h-48 space-y-2 overflow-y-auto">
                  {sorted.map(entry => (
                    <button
                      key={entry._id}
                      type="button"
                      role="radio"
                      aria-checked={entry._id === tripId}
                      onClick={() => {
                        setTripId(entry._id);
                        setDayId('');
                        add.reset();
                      }}
                      className={radioClass(entry._id === tripId)}>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{entry.nameTrip ?? entry.location}</span>
                        <span className="block text-xs text-slate-500">
                          {entry.location} · {formatDate(entry.startDate)} - {formatDate(entry.endDate)}
                        </span>
                      </span>
                      {province && entry.location === province && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {t('destinations.addSameProvince')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {sorted.length > 0 && (
              <section aria-label={t('destinations.addStep2')} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-800">{t('destinations.addStep2')}</h3>
                {!tripId && <p className="text-sm text-slate-500">{t('destinations.addPickTripFirst')}</p>}
                {tripId && detail.isLoading && (
                  <div className="grid place-items-center py-4">
                    <Spinner size={24} />
                  </div>
                )}
                {tripId && detail.isError && (
                  <div role="alert" className="space-y-2 text-center">
                    <p className="text-sm text-slate-600">{t(connectionErrorKey(detail.error) ?? 'destinations.addLoadDaysFailed')}</p>
                    <button type="button" className="btn btn-outline px-3 py-1.5 text-sm" onClick={() => detail.refetch()}>
                      {t('common.retry')}
                    </button>
                  </div>
                )}
                {days.length > 0 && (
                  <div role="radiogroup" aria-label={t('destinations.addStep2')} className="space-y-2">
                    {days.map((day, index) => {
                      const full = day.challenges.length >= MAX_PLACES_PER_DAY;
                      return (
                        <button
                          key={day._id ?? index}
                          type="button"
                          role="radio"
                          aria-checked={!!day._id && day._id === dayId}
                          disabled={full || !day._id}
                          onClick={() => {
                            setDayId(day._id ?? '');
                            add.reset();
                          }}
                          className={radioClass(!!day._id && day._id === dayId, full || !day._id)}>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {t('trips.aiEdit.day', {n: index + 1})}
                              {day.title ? `: ${day.title}` : ''}
                            </span>
                            {day.date && <span className="block text-xs text-slate-500">{formatDate(day.date)}</span>}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {full
                              ? t('destinations.addDayFull', {max: MAX_PLACES_PER_DAY})
                              : t('destinations.addDayPlaces', {count: day.challenges.length})}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {trip && dayId && (
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700" role="note">
                <p className="font-semibold text-slate-900">
                  {t('destinations.addSummary', {name: item.name, day: dayLabel, trip: trip.nameTrip ?? trip.location})}
                </p>
                <p className="text-xs text-slate-500">{t('destinations.addGeocodeNote')}</p>
                {!item.inApp && <p className="text-xs text-amber-700">{t('destinations.addUnverified')}</p>}
              </div>
            )}

            {add.isError && (
              <p role="alert" className="text-sm text-rose-600">
                {t(errorKey(add.error))}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline px-4 py-2 text-sm" onClick={onClose}>
                {t('destinations.addCancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 py-2 text-sm"
                disabled={!tripId || !dayId || add.isPending}
                onClick={() => add.mutate()}>
                {add.isPending ? t('destinations.addAdding') : t('destinations.addConfirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
