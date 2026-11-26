import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoCalendarOutline, IoCompassOutline, IoLocationSharp} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Spinner from '@/components/ui/Spinner';
import {connectionErrorKey} from '@/lib/apiClient';
import {addCommas, formatDate} from '@/lib/date';
import {tripsApi} from '../api/tripsApi';

// Trips other people made public: browse them, open one, keep a private copy.
// Only the plan is listed (no owner, progress or photos).
export default function ExplorePage() {
  const {t} = useTranslation();
  const [page, setPage] = useState(1);
  const {data, isLoading, error, refetch} = useQuery({
    queryKey: ['publicTrips', page],
    queryFn: () => tripsApi.listPublic(page),
    placeholderData: previous => previous,
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <IoCompassOutline size={22} className="text-brand-600" />
          {t('trips.explore.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t('trips.explore.subtitle')}</p>
      </div>

      {isLoading && (
        <div className="grid place-items-center py-16">
          <Spinner size={32} />
        </div>
      )}

      {error && !data && (
        <div role="alert" className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-slate-600">{t(connectionErrorKey(error) ?? 'trips.explore.error')}</p>
          <button type="button" className="btn btn-outline" onClick={() => refetch()}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="card p-10 text-center text-sm text-slate-500">{t('trips.explore.empty')}</div>
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map(item => (
              <li key={item._id}>
                <Link
                  to={routes.PublicTrip(item._id)}
                  className="card group block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative h-28 bg-gradient-to-br from-brand-300 to-brand-700">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-3 left-3 flex max-w-[80%] items-center gap-1 text-sm font-semibold text-white">
                      <IoLocationSharp size={16} className="shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="truncate font-semibold text-slate-900">{item.nameTrip ?? item.location}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <IoCalendarOutline size={14} />
                      {`${formatDate(item.startDate)} - ${formatDate(item.endDate)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t('trips.explore.cost', {
                        amount: addCommas(
                          (item.transportCostTotal ?? 0) + (item.foodCostTotal ?? 0) + (item.otherCostTotal ?? 0),
                        ),
                      })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label={t('trips.explore.pagination')} className="flex items-center justify-center gap-3">
              <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('trips.explore.prev')}
              </button>
              <span className="text-sm text-slate-600">{t('trips.explore.page', {page, pages})}</span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}>
                {t('trips.explore.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
