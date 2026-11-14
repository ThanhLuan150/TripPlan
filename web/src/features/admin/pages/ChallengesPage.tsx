import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  IoCheckmarkDoneOutline,
  IoCreateOutline,
  IoFlagOutline,
  IoPeopleOutline,
  IoStarOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import AdminCard from '../components/AdminCard';
import AdminConfirmDialog from '../components/AdminConfirmDialog';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminFilter from '../components/AdminFilter';
import AdminMeter from '../components/AdminMeter';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminPagination from '../components/AdminPagination';
import AdminRowAction from '../components/AdminRowAction';
import AdminSearch from '../components/AdminSearch';
import AdminStatCard from '../components/AdminStatCard';
import NoResults from '../components/NoResults';
import {adminToolbar} from '../components/styles';
import {useAdminChallenges, useDeleteChallenge} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import ChallengeEditDialog from '../challenges/ChallengeEditDialog';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {ALL, useTableState} from '../hooks/useTableState';
import type {AdminChallenge} from '../types';

const sum = (list: AdminChallenge[], pick: (c: AdminChallenge) => number) => list.reduce((s, c) => s + pick(c), 0);

export default function ChallengesPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const toast = useAdminToast();
  const remove = useDeleteChallenge();
  const [toEdit, setToEdit] = useState<AdminChallenge | null>(null);
  const {data, isLoading} = useAdminChallenges();
  const table = useTableState(data, {
    searchText: c => `${c.nameLocation} ${c.location}`,
    filters: {province: (c, value) => c.province === value},
  });
  const [toDelete, setToDelete] = useState<AdminChallenge | null>(null);
  const challenges = data ?? [];
  const provinces = [...new Set(challenges.map(c => c.province))].sort();
  const participants = sum(challenges, c => c.participants);
  const completed = sum(challenges, c => c.completed);

  const columns: AdminColumn<AdminChallenge>[] = [
    {
      key: 'place',
      header: t('admin.challenges.columns.place'),
      cell: c => (
        <div className="max-w-44 min-w-0 sm:max-w-72">
          <p className="truncate font-medium text-slate-900">{c.nameLocation}</p>
          <p className="truncate text-xs text-slate-500">{c.location}</p>
        </div>
      ),
    },
    {key: 'province', header: t('admin.challenges.columns.province'), hideBelow: 'md', cell: c => c.province},
    {
      key: 'points',
      header: t('admin.challenges.columns.points'),
      align: 'right',
      cell: c => <span className="font-medium tabular-nums">{format.number(c.points)}</span>,
    },
    {
      key: 'participants',
      header: t('admin.challenges.columns.participants'),
      hideBelow: 'lg',
      align: 'right',
      cell: c => <span className="tabular-nums">{format.number(c.participants)}</span>,
    },
    {
      key: 'completion',
      header: t('admin.challenges.columns.completion'),
      hideBelow: 'md',
      cell: c => (
        <div className="flex min-w-36 items-center gap-3">
          <AdminMeter ratio={c.participants ? c.completed / c.participants : 0} />
          <span className="w-12 shrink-0 text-right text-xs font-medium text-slate-600 tabular-nums">
            {format.percent(c.participants ? c.completed / c.participants : 0)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: <span className="sr-only">{t('admin.common.actions')}</span>,
      align: 'right',
      cell: c => (
        <div className="flex justify-end gap-1">
          <AdminRowAction icon={IoCreateOutline} label={t('admin.common.editItem', {name: c.nameLocation})} onClick={() => setToEdit(c)} />
          <AdminRowAction
            danger
            icon={IoTrashOutline}
            label={t('admin.common.deleteItem', {name: c.nameLocation})}
            onClick={() => setToDelete(c)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.challenges.title')}
        description={t('admin.challenges.description')}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <AdminStatCard label={t('admin.challenges.stats.total')} value={format.number(challenges.length)} icon={IoFlagOutline} />
        <AdminStatCard label={t('admin.challenges.stats.participants')} value={format.number(participants)} icon={IoPeopleOutline} />
        <AdminStatCard label={t('admin.challenges.stats.completed')} value={format.number(completed)} icon={IoCheckmarkDoneOutline} />
        <AdminStatCard
          label={t('admin.challenges.stats.avgPoints')}
          value={format.number(Math.round(sum(challenges, c => c.points) / Math.max(1, challenges.length)))}
          icon={IoStarOutline}
        />
      </div>

      <AdminCard>
        <div className={adminToolbar}>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.challenges.search')} />
          <AdminFilter
            label={t('admin.challenges.columns.province')}
            value={table.filter('province')}
            onChange={value => table.setFilter('province', value)}
            options={[
              {value: ALL, label: t('admin.challenges.allProvinces')},
              ...provinces.map(province => ({value: province, label: province})),
            ]}
          />
        </div>
        <AdminDataTable
          caption={t('admin.challenges.title')}
          columns={columns}
          rows={table.rows}
          rowKey={c => c.id}
          loading={isLoading}
          empty={<NoResults onReset={table.reset} />}
        />
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>

      {toEdit && <ChallengeEditDialog challenge={toEdit} onClose={() => setToEdit(null)} />}
      <AdminConfirmDialog
        open={!!toDelete}
        title={t('admin.challenges.deleteTitle')}
        description={t('admin.challenges.deleteText', {name: toDelete?.nameLocation})}
        confirmLabel={t('admin.common.delete')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const challenge = toDelete!;
          setToDelete(null);
          remove.mutate(challenge.id, {
            onSuccess: () => toast.done(t('admin.challenges.deleted', {name: challenge.nameLocation})),
            onError: toast.failed,
          });
        }}
      />
    </>
  );
}
