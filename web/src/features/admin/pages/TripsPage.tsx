import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoEyeOffOutline, IoEyeOutline, IoLinkOutline, IoLocationOutline, IoTrashOutline} from 'react-icons/io5';
import AdminCard from '../components/AdminCard';
import AdminConfirmDialog from '../components/AdminConfirmDialog';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminFilter from '../components/AdminFilter';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminPagination from '../components/AdminPagination';
import AdminRowAction from '../components/AdminRowAction';
import AdminSearch from '../components/AdminSearch';
import AdminStatusBadge from '../components/AdminStatusBadge';
import NoResults from '../components/NoResults';
import {adminToolbar} from '../components/styles';
import {useAdminTrips, useDeleteTrip, useRevokeShare, useUnpublishTrip} from '../hooks/useAdminData';
import TripDetailDialog from '../users/TripDetailDialog';
import {useAdminToast} from '../hooks/useAdminToast';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {ALL, useTableState} from '../hooks/useTableState';
import {optionsOf, tripStatusBadge} from '../status';
import type {AdminTrip} from '../types';

const totalCost = (trip: AdminTrip) => trip.transportCostTotal + trip.foodCostTotal + trip.otherCostTotal;

export default function TripsPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const toast = useAdminToast();
  const remove = useDeleteTrip();
  const unpublish = useUnpublishTrip();
  const revoke = useRevokeShare();
  const {data, isLoading} = useAdminTrips();
  const table = useTableState(data, {
    searchText: trip => `${trip.nameTrip} ${trip.location} ${trip.owner}`,
    filters: {
      location: (trip, value) => trip.location === value,
      status: (trip, value) => trip.status === value,
      visibility: (trip, value) => (trip.visibility ?? 'private') === value,
    },
    // a deleted plan is gone for its owner: it only shows when the admin asks for the "Deleted" status
    initialFilters: {status: 'active'},
  });
  const [viewing, setViewing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminTrip | null>(null);
  const [toUnpublish, setToUnpublish] = useState<AdminTrip | null>(null);
  const [toRevoke, setToRevoke] = useState<AdminTrip | null>(null);
  const locations = [...new Set((data ?? []).map(trip => trip.location))].sort();

  const columns: AdminColumn<AdminTrip>[] = [
    {
      key: 'trip',
      header: t('admin.trips.columns.trip'),
      cell: trip => (
        <div className="max-w-44 min-w-0 sm:max-w-72">
          <p className="truncate font-medium text-slate-900">{trip.nameTrip}</p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <IoLocationOutline size={12} aria-hidden />
            {trip.location}
          </p>
        </div>
      ),
    },
    {key: 'owner', header: t('admin.trips.columns.owner'), hideBelow: 'md', cell: trip => trip.owner},
    {
      key: 'dates',
      header: t('admin.trips.columns.dates'),
      hideBelow: 'lg',
      cell: trip => (
        <span className="whitespace-nowrap">
          {format.date(trip.startDate)}
          <span className="block text-xs text-slate-500">{t('admin.trips.days', {count: trip.days})}</span>
        </span>
      ),
    },
    {
      key: 'challenges',
      header: t('admin.trips.columns.challenges'),
      hideBelow: 'xl',
      align: 'right',
      cell: trip => <span className="tabular-nums">{trip.challenges}</span>,
    },
    {
      key: 'cost',
      header: t('admin.trips.columns.cost'),
      align: 'right',
      cell: trip => <span className="whitespace-nowrap tabular-nums">{format.currency(totalCost(trip))}</span>,
    },
    {
      key: 'status',
      header: t('admin.trips.columns.status'),
      cell: trip => (
        <AdminStatusBadge tone={tripStatusBadge[trip.status].tone}>
          {t(tripStatusBadge[trip.status].labelKey)}
        </AdminStatusBadge>
      ),
    },
    {
      key: 'community',
      header: t('admin.trips.columns.visibility'),
      hideBelow: 'lg',
      cell: trip => {
        const isPost = trip.visibility === 'public';
        return (
          <div className="whitespace-nowrap">
            <AdminStatusBadge tone={isPost ? 'info' : 'neutral'}>
              {t(isPost ? 'admin.trips.visibility.public' : 'admin.trips.visibility.private')}
            </AdminStatusBadge>
            {trip.shared && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <IoLinkOutline size={12} aria-hidden />
                {t('admin.trips.sharedLink')}
              </span>
            )}
            {isPost && (
              <span className="block text-xs text-slate-500 tabular-nums">
                {t('admin.trips.activityValue', {likes: trip.likes ?? 0, saves: trip.saves ?? 0})}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      pinned: true,
      header: <span className="sr-only">{t('admin.common.actions')}</span>,
      align: 'right',
      cell: trip => (
        <div className="flex justify-end gap-1">
          <AdminRowAction icon={IoEyeOutline} label={t('admin.common.viewItem', {name: trip.nameTrip})} onClick={() => setViewing(trip.id)} />
          {trip.shared && trip.status === 'active' && (
            <AdminRowAction
              icon={IoLinkOutline}
              label={t('admin.trips.revokeItem', {name: trip.nameTrip})}
              onClick={() => setToRevoke(trip)}
            />
          )}
          {trip.visibility === 'public' && trip.status === 'active' && (
            <AdminRowAction
              icon={IoEyeOffOutline}
              label={t('admin.trips.unpublishItem', {name: trip.nameTrip})}
              onClick={() => setToUnpublish(trip)}
            />
          )}
          <AdminRowAction
            danger
            icon={IoTrashOutline}
            label={t('admin.common.deleteItem', {name: trip.nameTrip})}
            onClick={() => setToDelete(trip)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader title={t('admin.trips.title')} description={t('admin.trips.description')} />

      <AdminCard>
        <div className={adminToolbar}>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.trips.search')} />
          <AdminFilter
            label={t('admin.trips.destination')}
            value={table.filter('location')}
            onChange={value => table.setFilter('location', value)}
            options={[
              {value: ALL, label: t('admin.trips.allDestinations')},
              ...locations.map(location => ({value: location, label: location})),
            ]}
          />
          <AdminFilter
            label={t('admin.trips.columns.status')}
            value={table.filter('status')}
            onChange={value => table.setFilter('status', value)}
            options={[{value: ALL, label: t('admin.common.allStatuses')}, ...optionsOf(tripStatusBadge, t)]}
          />
          <AdminFilter
            label={t('admin.trips.visibilityFilter')}
            value={table.filter('visibility')}
            onChange={value => table.setFilter('visibility', value)}
            options={[
              {value: ALL, label: t('admin.trips.allVisibility')},
              {value: 'public', label: t('admin.trips.visibility.public')},
              {value: 'private', label: t('admin.trips.visibility.private')},
            ]}
          />
        </div>
        <AdminDataTable
          caption={t('admin.trips.title')}
          columns={columns}
          rows={table.rows}
          rowKey={trip => trip.id}
          loading={isLoading}
          empty={<NoResults onReset={table.reset} />}
        />
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>

      {viewing && <TripDetailDialog tripId={viewing} onClose={() => setViewing(null)} />}
      <AdminConfirmDialog
        open={!!toRevoke}
        title={t('admin.trips.revokeTitle')}
        description={t('admin.trips.revokeText', {name: toRevoke?.nameTrip})}
        confirmLabel={t('admin.trips.revoke')}
        onCancel={() => setToRevoke(null)}
        onConfirm={() => {
          const trip = toRevoke!;
          setToRevoke(null);
          revoke.mutate(trip.id, {
            onSuccess: () => toast.done(t('admin.trips.revoked', {name: trip.nameTrip})),
            onError: toast.failed,
          });
        }}
      />
      <AdminConfirmDialog
        open={!!toUnpublish}
        title={t('admin.trips.unpublishTitle')}
        description={t('admin.trips.unpublishText', {name: toUnpublish?.nameTrip})}
        confirmLabel={t('admin.trips.unpublish')}
        onCancel={() => setToUnpublish(null)}
        onConfirm={() => {
          const trip = toUnpublish!;
          setToUnpublish(null);
          unpublish.mutate(trip.id, {
            onSuccess: () => toast.done(t('admin.trips.unpublished', {name: trip.nameTrip})),
            onError: toast.failed,
          });
        }}
      />
      <AdminConfirmDialog
        open={!!toDelete}
        title={t('admin.trips.deleteTitle')}
        description={t('admin.trips.deleteText', {name: toDelete?.nameTrip})}
        confirmLabel={t('admin.common.delete')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const trip = toDelete!;
          setToDelete(null);
          remove.mutate(trip.id, {
            onSuccess: () => toast.done(t('admin.trips.deleted', {name: trip.nameTrip})),
            onError: toast.failed,
          });
        }}
      />
    </>
  );
}
