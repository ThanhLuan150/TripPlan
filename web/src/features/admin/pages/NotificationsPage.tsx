import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoAdd, IoCreateOutline, IoTrashOutline} from 'react-icons/io5';
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
import {adminButton, adminToolbar} from '../components/styles';
import {useAdminAnnouncements, useDeleteAnnouncement} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {useAdminToast} from '../hooks/useAdminToast';
import {ALL, useTableState} from '../hooks/useTableState';
import AnnouncementFormDialog from '../notifications/AnnouncementFormDialog';
import {announcementState} from '../notifications/state';
import {campaignStatusBadge, optionsOf} from '../status';
import type {AdminAnnouncement} from '../types';

// Notifications written by the admins and shown to every user in the app.
export default function NotificationsPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const toast = useAdminToast();
  const remove = useDeleteAnnouncement();
  const {data, isLoading} = useAdminAnnouncements();
  const table = useTableState(data, {
    searchText: item => `${item.title} ${item.message}`,
    filters: {status: (item, value) => announcementState(item) === value},
  });
  const [toDelete, setToDelete] = useState<AdminAnnouncement | null>(null);
  // undefined: closed, null: writing a new one, an item: editing
  const [form, setForm] = useState<AdminAnnouncement | null | undefined>(undefined);

  const columns: AdminColumn<AdminAnnouncement>[] = [
    {
      key: 'title',
      header: t('admin.notifications.columns.title'),
      cell: item => (
        <div className="max-w-52 min-w-0 sm:max-w-96">
          <p className="truncate font-medium text-slate-900">{item.title}</p>
          {item.message && <p className="truncate text-xs text-slate-500">{item.message}</p>}
        </div>
      ),
    },
    {
      key: 'time',
      header: t('admin.notifications.columns.time'),
      hideBelow: 'md',
      cell: item => <span className="whitespace-nowrap">{format.dateTime(item.publishAt)}</span>,
    },
    {
      key: 'status',
      header: t('admin.notifications.columns.status'),
      cell: item => {
        const badge = campaignStatusBadge[announcementState(item)];
        return <AdminStatusBadge tone={badge.tone}>{t(badge.labelKey)}</AdminStatusBadge>;
      },
    },
    {
      key: 'actions',
      pinned: true,
      header: <span className="sr-only">{t('admin.common.actions')}</span>,
      align: 'right',
      cell: item => (
        <div className="flex justify-end gap-1">
          <AdminRowAction icon={IoCreateOutline} label={t('admin.common.editItem', {name: item.title})} onClick={() => setForm(item)} />
          <AdminRowAction danger icon={IoTrashOutline} label={t('admin.common.deleteItem', {name: item.title})} onClick={() => setToDelete(item)} />
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.notifications.title')}
        description={t('admin.notifications.description')}
        actions={
          <button type="button" className={adminButton.primary} onClick={() => setForm(null)}>
            <IoAdd size={16} aria-hidden />
            {t('admin.notifications.create')}
          </button>
        }
      />

      <AdminCard>
        <div className={adminToolbar}>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.notifications.search')} />
          <AdminFilter
            label={t('admin.notifications.columns.status')}
            value={table.filter('status')}
            onChange={value => table.setFilter('status', value)}
            options={[{value: ALL, label: t('admin.common.allStatuses')}, ...optionsOf(campaignStatusBadge, t)]}
          />
        </div>
        <AdminDataTable
          caption={t('admin.notifications.title')}
          columns={columns}
          rows={table.rows}
          rowKey={item => item.id}
          loading={isLoading}
          empty={<NoResults onReset={table.reset} />}
        />
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>

      {form !== undefined && <AnnouncementFormDialog item={form ?? undefined} onClose={() => setForm(undefined)} />}
      <AdminConfirmDialog
        open={!!toDelete}
        title={t('admin.notifications.deleteTitle')}
        description={t('admin.notifications.deleteText', {name: toDelete?.title})}
        confirmLabel={t('admin.common.delete')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const item = toDelete!;
          setToDelete(null);
          remove.mutate(item.id, {
            onSuccess: () => toast.done(t('admin.notifications.deleted', {name: item.title})),
            onError: toast.failed,
          });
        }}
      />
    </>
  );
}
