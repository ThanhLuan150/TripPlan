import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoNavigateOutline} from 'react-icons/io5';
import DropdownSelect from '@/components/ui/DropdownSelect';
import Toast from '@/components/ui/Toast';
import {apiBody, apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {formatDistance, formatDuration} from '@/lib/location';
import {tripsApi} from '../api/tripsApi';
import type {RoutePlace, RouteProposal, RouteTotals, TripDay} from '../types';

// Why no proposal came back (the itinerary is untouched in every case)
const proposeErrorKey = (error: unknown) => {
  const code = apiBody<{code?: string}>(error)?.code;
  if (code === 'ROUTE_NOT_ENOUGH_COORDINATES') {
    return 'trips.route.notEnough';
  }
  if (code === 'ROUTE_TOO_MANY_PLACES') {
    return 'trips.route.tooMany';
  }
  return connectionErrorKey(error) ?? 'trips.route.failed';
};

function Order({title, places, totals, source, lang}: {title: string; places: RoutePlace[]; totals: RouteTotals; source: RouteProposal['source']; lang: string}) {
  const {t} = useTranslation();
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-slate-700">
        {places.map(place => (
          <li key={place.id}>{place.name}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-600">
        {t(source === 'road' ? 'trips.route.distanceRoad' : 'trips.route.distanceStraight', {distance: formatDistance(totals.distance, lang)})}
        {totals.duration !== null && ` · ${t('trips.route.duration', {duration: formatDuration(totals.duration)})}`}
      </p>
    </div>
  );
}

// Ask for a better visiting order of ONE day, compare it with the current one, then Accept (saved) or
// Reject (dropped). The itinerary is only changed by Accept, and no place is ever added or removed.
export default function RouteOptimizePanel({tripId, days}: {tripId: string; days: TripDay[]}) {
  const {t, i18n} = useTranslation();
  const queryClient = useQueryClient();
  const options = days.filter(day => day._id && day.challenges.length > 0);
  const [dayId, setDayId] = useState('');
  const [proposal, setProposal] = useState<RouteProposal | null>(null);
  const selected = dayId || options[0]?._id || '';
  const lang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  const notify = (type: 'error' | 'success' | 'info', text2: string) =>
    Toast.show({type, text1: t(type === 'error' ? 'common.failed' : 'common.success'), text2});

  const propose = useMutation({
    mutationFn: (id: string) => tripsApi.proposeRoute(tripId, id),
    onSuccess: setProposal,
    onError: error => notify('error', t(proposeErrorKey(error))),
  });
  const apply = useMutation({
    mutationFn: (proposalId: string) => tripsApi.applyRoute(tripId, proposalId),
    onSuccess: () => {
      setProposal(null);
      queryClient.invalidateQueries({queryKey: ['trip', tripId]});
      notify('success', t('trips.route.applied'));
    },
    onError: error =>
      notify(
        'error',
        t(connectionErrorKey(error) ?? (apiStatus(error) === 404 || apiStatus(error) === 409 ? 'trips.route.applyInvalid' : 'trips.route.applyFailed')),
      ),
  });

  if (options.length === 0) {
    return null;
  }

  return (
    <section className="card space-y-3 p-4" aria-labelledby="route-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="route-title" className="flex items-center gap-2 font-semibold text-slate-900">
          <IoNavigateOutline size={18} />
          {t('trips.route.title')}
        </h2>
        <span className="text-xs text-slate-500">{t('trips.route.hint')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownSelect
          className="min-w-0 flex-1"
          label={t('trips.route.day')}
          value={selected}
          options={options.map(day => ({value: day._id!, label: day.title}))}
          onChange={id => {
            setDayId(id);
            setProposal(null);
          }}
        />
        <button
          type="button"
          className="btn btn-primary px-4 py-2 text-sm"
          disabled={propose.isPending || apply.isPending}
          onClick={() => {
            setProposal(null);
            propose.mutate(selected);
          }}>
          {t('trips.route.optimize')}
        </button>
      </div>

      {propose.isPending && <p className="text-sm text-slate-500">{t('trips.route.loading')}</p>}

      {proposal && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3" role="group" aria-label={t('trips.route.previewTitle')}>
          <div>
            <h3 className="font-semibold text-slate-900">{t('trips.route.previewTitle')}</h3>
            <p className="text-xs text-slate-500">{t(proposal.improved ? 'trips.route.previewHint' : 'trips.route.alreadyBest')}</p>
          </div>
          {proposal.improved && (
            <div className="grid gap-3 md:grid-cols-2">
              <Order title={t('trips.route.current')} places={proposal.currentOrder} totals={proposal.current} source={proposal.source} lang={lang} />
              <Order title={t('trips.route.proposed')} places={proposal.proposedOrder} totals={proposal.proposed} source={proposal.source} lang={lang} />
            </div>
          )}
          {proposal.source === 'straight-line' && <p className="text-xs text-amber-700">{t('trips.route.straightLine')}</p>}
          {proposal.missingCoordinates.length > 0 && (
            <p className="text-xs text-amber-700">
              {t('trips.route.missing', {places: proposal.missingCoordinates.map(place => place.name).join(', ')})}
            </p>
          )}
          <div className="flex justify-end gap-2">
            {proposal.improved && proposal.proposalId ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline px-4 py-2 text-sm"
                  disabled={apply.isPending}
                  onClick={() => {
                    // the server forgets it; the itinerary was never changed, so a failure here does not matter
                    Promise.resolve(tripsApi.rejectRoute(tripId, proposal.proposalId!)).catch(() => undefined);
                    setProposal(null);
                    notify('info', t('trips.route.rejected'));
                  }}>
                  {t('trips.route.reject')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 text-sm"
                  disabled={apply.isPending}
                  onClick={() => apply.mutate(proposal.proposalId!)}>
                  {apply.isPending ? t('trips.route.saving') : t('trips.route.accept')}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-outline px-4 py-2 text-sm" onClick={() => setProposal(null)}>
                {t('trips.route.close')}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
