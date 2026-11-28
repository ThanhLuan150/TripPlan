import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoCalendarOutline, IoClose, IoCompassOutline, IoLocationSharp, IoSearch} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Spinner from '@/components/ui/Spinner';
import {connectionErrorKey} from '@/lib/apiClient';
import {addCommas, formatDate} from '@/lib/date';
import {tripsApi} from '../api/tripsApi';
import LikeButton from '../components/LikeButton';
import SaveButton from '../components/SaveButton';

// the backend rejects a longer keyword
export const MAX_SEARCH_LENGTH = 100;
// wait for the user to stop typing before asking the server
const SEARCH_DELAY_MS = 350;

// Trips other people made public: browse them, search them, open one, keep a private copy.
// Only the plan is listed (no owner, progress or photos). The keyword lives in the address
// (?q=), so a search can be shared and the Back button works.
export default function ExplorePage() {
  const {t} = useTranslation();
  const [params, setParams] = useSearchParams();
  // the keyword being searched (from the address) and the text in the box
  const q = (params.get('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH);
  const [text, setText] = useState(q);
  const [page, setPage] = useState(1);

  const applyKeyword = (keyword: string) => {
    const next = keyword.trim();
    if (next !== q) {
      setPage(1);
      setParams(next ? {q: next} : {}, {replace: true});
    }
  };

  // typing searches by itself after a short pause
  useEffect(() => {
    if (text.trim() === q) {
      return;
    }
    const timer = window.setTimeout(() => applyKeyword(text), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, q]);

  // Back / Forward (or a link with ?q=) changes the keyword: the box follows
  useEffect(() => {
    setText(current => (current.trim() === q ? current : q));
  }, [q]);

  const {data, isLoading, error, refetch} = useQuery({
    queryKey: ['publicTrips', page, q],
    queryFn: () => tripsApi.listPublic(page, q),
    placeholderData: previous => previous,
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const searching = q !== '';

  const clear = () => {
    setText('');
    applyKeyword('');
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <IoCompassOutline size={22} className="text-brand-600" />
          {t('trips.explore.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t('trips.explore.subtitle')}</p>
      </div>

      <form
        role="search"
        className="relative max-w-xl"
        onSubmit={event => {
          event.preventDefault();
          applyKeyword(text);
        }}>
        <IoSearch size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={text}
          maxLength={MAX_SEARCH_LENGTH}
          aria-label={t('trips.explore.searchLabel')}
          placeholder={t('trips.explore.searchPlaceholder')}
          onChange={event => setText(event.target.value)}
          className="field w-full pr-11 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {text !== '' && (
          <button
            type="button"
            aria-label={t('trips.explore.clearSearch')}
            onClick={clear}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <IoClose size={18} />
          </button>
        )}
      </form>

      {searching && data && data.items.length > 0 && (
        <p className="text-sm text-slate-600" role="status">
          {t('trips.explore.results', {q, count: data.total})}
        </p>
      )}

      {isLoading && (
        <div className="grid place-items-center py-16">
          <Spinner size={32} />
        </div>
      )}

      {error && !data && (
        <div role="alert" className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-slate-600">
            {t(connectionErrorKey(error) ?? (searching ? 'trips.explore.searchFailed' : 'trips.explore.error'))}
          </p>
          <button type="button" className="btn btn-outline" onClick={() => refetch()}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-slate-500">{searching ? t('trips.explore.noResults', {q}) : t('trips.explore.empty')}</p>
          {searching && (
            <>
              <p className="text-xs text-slate-400">{t('trips.explore.noResultsHint')}</p>
              <button type="button" className="btn btn-outline" onClick={clear}>
                {t('trips.explore.clearSearch')}
              </button>
            </>
          )}
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map(item => (
              <li key={item._id} className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
                <Link to={routes.PublicTrip(item._id)} className="group block">
                  <div className="relative h-28 bg-gradient-to-br from-brand-300 to-brand-700">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-3 left-3 flex max-w-[80%] items-center gap-1 text-sm font-semibold text-white">
                      <IoLocationSharp size={16} className="shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="truncate font-semibold text-slate-900">{item.nameTrip ?? item.location}</p>
                    {item.postContent && <p className="line-clamp-2 text-sm text-slate-600">{item.postContent}</p>}
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
                <div className="flex items-center justify-between border-t border-slate-100 px-2 py-1.5">
                  <LikeButton tripId={item._id} liked={item.liked} likesCount={item.likesCount} />
                  <SaveButton tripId={item._id} saved={item.saved} />
                </div>
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
