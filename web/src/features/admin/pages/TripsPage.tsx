import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoEyeOutline, IoLocationOutline, IoTrashOutline} from 'react-icons/io5';
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
import {useAdminTrips, useDeleteTrip} from '../hooks/useAdminData';
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
  const {data, isLoading} = useAdminTrips();
  const table = useTableState(data, {
    searchText: trip => `${trip.nameTrip} ${trip.location} ${trip.owner}`,
    filters: {
      location: (trip, value) => trip.location === value,
      status: (trip, value) => trip.status === value,
    },
  });
  const [viewing, setViewing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminTrip | null>(null);
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
      key: 'actions',
      pinned: true,
      header: <span className="sr-only">{t('admin.common.actions')}</span>,
      align: 'right',
      cell: trip => (
        <div className="flex justify-end gap-1">
          <AdminRowAction icon={IoEyeOutline} label={t('admin.common.viewItem', {name: trip.nameTrip})} onClick={() => setViewing(trip.id)} />
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
