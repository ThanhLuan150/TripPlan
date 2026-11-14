import {useTranslation} from 'react-i18next';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminModal from '../components/AdminModal';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminButton} from '../components/styles';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {tripPhaseBadge} from '../status';
import {useAdminTrip} from './hooks';

// Details of one trip of the user: dates, cost and the plan day by day.
export default function TripDetailDialog({tripId, onClose}: {tripId: string; onClose: () => void}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const {data: trip, isLoading, isError} = useAdminTrip(tripId);
  const total = trip ? trip.transportCostTotal + trip.foodCostTotal + trip.otherCostTotal : 0;

  return (
    <AdminModal
      title={trip?.nameTrip || t('admin.users.trips.details')}
      description={trip?.location}
      size="lg"
      onClose={onClose}
      footer={
        <button type="button" className={adminButton.secondary} onClick={onClose}>
          {t('common.close')}
        </button>
      }>
      {isLoading && <AdminLoadingState />}
      {isError && <p role="alert" className="text-sm text-rose-700">{t('admin.users.errors.loadFailed')}</p>}
      {trip && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">{t('admin.users.trips.start')}</dt>
              <dd className="font-medium text-slate-900">{trip.startDate ? format.date(trip.startDate) : '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('admin.users.trips.created')}</dt>
              <dd className="font-medium text-slate-900">{trip.createdAt ? format.date(trip.createdAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('admin.users.trips.days')}</dt>
              <dd className="font-medium text-slate-900">{t('admin.trips.days', {count: trip.days})}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('admin.users.trips.total')}</dt>
              <dd className="font-medium text-slate-900">{format.currency(total)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('admin.users.trips.phaseLabel')}</dt>
              <dd>
                {trip.phase && (
                  <AdminStatusBadge tone={tripPhaseBadge[trip.phase].tone}>{t(tripPhaseBadge[trip.phase].labelKey)}</AdminStatusBadge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('admin.users.trips.challengesCount')}</dt>
              <dd className="font-medium text-slate-900">{format.number(trip.challenges)}</dd>
            </div>
          </dl>
          {trip.plan.length > 0 ? (
            <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {trip.plan.map(day => (
                <li key={day.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800">
                    {day.day}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{day.title || t('admin.users.trips.dayN', {day: day.day})}</p>
                    {day.date && <p className="text-xs text-slate-500">{format.date(day.date)}</p>}
                  </div>
                  <span className="text-sm text-slate-600 tabular-nums">{format.currency(day.cost)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">{t('admin.users.trips.noDays')}</p>
          )}
        </div>
      )}
    </AdminModal>
  );
}
