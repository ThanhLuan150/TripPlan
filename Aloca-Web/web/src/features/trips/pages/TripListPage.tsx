import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
  IoAdd,
  IoCalendarOutline,
  IoLocationSharp,
  IoMapOutline,
  IoRefresh,
  IoTrashOutline,
} from 'react-icons/io5';
import {routes} from '@/app/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Toast from '@/components/ui/Toast';
import {formatShortDate} from '@/lib/date';
import {images} from '../data/provinceImages';
import {useDeleteTrip, useTrips} from '../hooks/useTrips';
import type {Trip} from '../types';

// Saved plans ("AddNewTrip" on mobile).
export default function TripListPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [itemDelete, setItemDelete] = useState<Trip | null>(null);
  const {data: result, isFetching, isLoading, refetch} = useTrips();
  const deleteTrip = useDeleteTrip();

  // Inverted FlatList on mobile: newest plan first
  const trips = (result ?? []).filter(item => item.status === 'active').slice().reverse();
  const open = (id: string) => navigate(routes.DetailTripScreen(id));

  return (
    <div className="space-y-6 px-4 pt-2 pb-6 md:px-6">
      <Link
        to={routes.TripPlanChoose}
        className="group flex items-center gap-4 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/60 p-5 transition hover:border-brand-500 hover:bg-brand-50">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-lift transition group-hover:scale-105">
          <IoAdd size={28} />
        </span>
        <div>
          <p className="font-semibold text-slate-900">{t('trips.list.add')}</p>
          <p className="text-sm text-slate-500">{t('trips.list.addHint')}</p>
        </div>
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          {t('trips.list.title')}
          {result && <span className="ml-1.5 font-medium text-slate-400">({trips.length})</span>}
        </h2>
        <button
          type="button"
          className="btn btn-ghost px-3 py-2 text-brand-600"
          onClick={() => refetch()}
          disabled={isFetching}>
          <IoRefresh size={18} className={isFetching ? 'animate-spin' : ''} />
          {t('common.refresh')}
        </button>
      </div>

      {isLoading && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <li key={i} className="card animate-pulse overflow-hidden">
              <div className="h-32 bg-slate-200" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {result && trips.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <IoMapOutline size={40} className="text-slate-300" />
          <p className="font-medium text-slate-700">{t('trips.list.emptyTitle')}</p>
          <p className="text-sm text-slate-500">{t('trips.list.emptyText')}</p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((item, index) => (
          <li key={item._id ?? item.nameTrip + index}>
            <div
              role="link"
              tabIndex={0}
              onClick={() => open(item._id)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  open(item._id);
                }
              }}
              className="card group relative cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative h-32 bg-gradient-to-br from-brand-300 to-brand-700">
                {images[item.location] && (
                  <img
                    src={images[item.location]}
                    alt=""
                    loading="lazy"
                    onError={e => (e.currentTarget.style.display = 'none')}
                    className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-3 left-3 flex max-w-[80%] items-center gap-1 text-sm font-semibold text-white">
                  <IoLocationSharp size={16} className="shrink-0" />
                  <span className="truncate">{item.location}</span>
                </span>
              </div>
              <button
                type="button"
                aria-label={t('trips.list.deleteLabel', {name: item.nameTrip})}
                title={t('trips.list.delete')}
                onClick={e => {
                  e.stopPropagation();
                  setItemDelete(item);
                }}
                className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-white/90 text-slate-600 backdrop-blur transition hover:bg-white hover:text-rose-600">
                <IoTrashOutline size={18} />
              </button>
              <div className="p-4">
                <p className="line-clamp-2 font-semibold text-slate-900">{item.nameTrip}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <IoCalendarOutline size={15} />
                  {`${formatShortDate(item.startDate)} - ${formatShortDate(item.endDate)}`}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmModal
        visible={itemDelete !== null}
        title={t('trips.list.deleteTitle')}
        confirmText={t('common.delete')}
        danger
        onCancel={() => setItemDelete(null)}
        onConfirm={() => {
          if (itemDelete) {
            deleteTrip.mutate(itemDelete._id, {
              onError: () =>
                Toast.show({
                  type: 'error',
                  text1: t('common.failed'),
                  text2: t('trips.list.deleteFailed'),
                }),
            });
          }
          setItemDelete(null);
        }}>
        <p className="text-center text-sm text-slate-600">
          {t('trips.list.deleteConfirm', {name: itemDelete?.nameTrip ?? ''})}
        </p>
      </ConfirmModal>
    </div>
  );
}
