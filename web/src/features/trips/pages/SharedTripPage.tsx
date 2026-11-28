import type {ReactNode} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoCalendarOutline, IoEyeOutline, IoLinkOutline, IoLocationOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Spinner from '@/components/ui/Spinner';
import {apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {addCommas, formatDate} from '@/lib/date';
import {tripsApi} from '../api/tripsApi';
import type {SharedTrip} from '../types';

// Public, read only page behind a share link (no sign-in). It shows the plan
// only: no progress, photos or owner details, and nothing can be changed here.
export default function SharedTripPage() {
  const {token} = useParams();
  return (
    <ReadOnlyTripPage
      queryKey={['sharedTrip', token]}
      id={token}
      load={tripsApi.getShared}
      textKeys={{readOnly: 'trips.shared.readOnly', invalidTitle: 'trips.shared.invalidTitle', invalidText: 'trips.shared.invalidText'}}
    />
  );
}

interface ReadOnlyProps {
  queryKey: unknown[];
  id?: string;
  load: (id: string) => Promise<SharedTrip>;
  textKeys: {readOnly: string; invalidTitle: string; invalidText: string};
  // e.g. "save a copy" on a public trip
  actions?: ReactNode | ((trip: SharedTrip) => ReactNode);
}

// Layout shared by the pages that show a plan to visitors: share link and public trip.
export function ReadOnlyTripPage({queryKey, id: token, load, textKeys, actions}: ReadOnlyProps) {
  const {t} = useTranslation();
  const {data, isLoading, error, refetch} = useQuery({
    queryKey,
    enabled: !!token,
    retry: false,
    queryFn: () => load(token!),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (error || !data) {
    // 404: wrong, turned off or deleted link. Other errors (network, 5xx) can be retried.
    const unavailable = apiStatus(error) === 404 || !token;
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 p-4">
        <div className="card flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <IoLinkOutline size={36} className="text-slate-400" />
          <p className="font-semibold text-slate-900">
            {t(unavailable ? textKeys.invalidTitle : 'trips.shared.errorTitle')}
          </p>
          <p className="text-sm text-slate-500">
            {t(unavailable ? textKeys.invalidText : connectionErrorKey(error) ?? 'trips.shared.errorText')}
          </p>
          {unavailable ? (
            <Link to={routes.LandingPage} className="btn btn-primary">
              {t('trips.shared.goHome')}
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => refetch()}>
              {t('common.retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const trip = data;
  return (
    <div className="min-h-dvh bg-slate-50">
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-brand-400 to-brand-800 p-6 text-white shadow-soft">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            <IoEyeOutline size={14} />
            {t(textKeys.readOnly)}
          </p>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">{trip.nameTrip ?? trip.location}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
            <IoCalendarOutline size={16} />
            {`${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/85">
            <IoLocationOutline size={16} />
            {trip.location}
          </p>
          {trip.postContent && (
            <blockquote className="mt-4 rounded-2xl bg-white/15 p-4 text-sm leading-relaxed whitespace-pre-line text-white">
              <p className="mb-1 text-xs font-semibold tracking-wide text-white/75 uppercase">{t('trips.publicTrip.authorNote')}</p>
              {trip.postContent}
            </blockquote>
          )}
          {actions && <div className="mt-4 flex flex-wrap items-center gap-3">{typeof actions === 'function' ? actions(trip) : actions}</div>}
        </div>

        {trip.dataTripDays.map((day, i) => (
          <section key={i} className="card space-y-3 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <span className="text-[10px] font-medium uppercase">{t('trips.detail.dayLabel')}</span>
                <span className="text-lg leading-none font-bold">{i + 1}</span>
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{day.title}</p>
                <p className="text-xs text-slate-500">{formatDate(day.date)}</p>
              </div>
            </div>
            {day.challenges.map(c => (
              <div key={c._id} className="rounded-xl bg-slate-50 p-3">
                <p className="font-medium text-slate-900">{c.challengeSummary}</p>
                {c.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <IoLocationOutline size={13} className="shrink-0" />
                    <span>{c.location}</span>
                  </p>
                )}
              </div>
            ))}
            <p className="text-xs text-slate-500">
              {t('trips.detail.transport')}: {addCommas(day.transportCost)} · {t('trips.detail.food')}:{' '}
              {addCommas(day.foodCost)}
              {day.otherCost ? ` · ${t('trips.detail.other')}: ${addCommas(day.otherCost)}` : ''} VND
            </p>
          </section>
        ))}

        <p className="text-center text-xs text-slate-400">{t('trips.shared.footer')}</p>
      </main>
    </div>
  );
}
