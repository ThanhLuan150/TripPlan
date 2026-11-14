import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  IoChatbubbleEllipsesOutline,
  IoCheckmark,
  IoClose,
  IoImageOutline,
  IoPersonOutline,
  IoVideocamOutline,
} from 'react-icons/io5';
import AdminAvatar from '../components/AdminAvatar';
import AdminCard from '../components/AdminCard';
import AdminConfirmDialog from '../components/AdminConfirmDialog';
import AdminFilter from '../components/AdminFilter';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminPagination from '../components/AdminPagination';
import AdminSearch from '../components/AdminSearch';
import AdminStatusBadge from '../components/AdminStatusBadge';
import NoResults from '../components/NoResults';
import {adminButton, adminToolbar} from '../components/styles';
import {useAdminModeration, useDecideModeration} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {useAdminToast} from '../hooks/useAdminToast';
import {ALL, useTableState} from '../hooks/useTableState';
import {moderationReasonLabel, moderationStatusBadge, moderationTypeLabel, optionsOf} from '../status';
import type {AdminModerationItem, ModerationStatus, ModerationType} from '../types';

const typeIcon: Record<ModerationType, typeof IoImageOutline> = {
  challengePhoto: IoImageOutline,
  chatMessage: IoChatbubbleEllipsesOutline,
  profile: IoPersonOutline,
  video: IoVideocamOutline,
};

const tabs = Object.keys(moderationStatusBadge) as ModerationStatus[];

// Reported content and challenge photos waiting for a decision.
export default function ModerationPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const toast = useAdminToast();
  const decide = useDecideModeration();
  const {data, isLoading} = useAdminModeration();
  const [tab, setTab] = useState<ModerationStatus>('pending');
  const table = useTableState(
    data?.filter(item => item.status === tab),
    {searchText: item => `${item.content} ${item.author}`, filters: {type: (item, value) => item.type === value}, pageSize: 6},
  );
  const [decision, setDecision] = useState<{item: AdminModerationItem; approve: boolean} | null>(null);

  return (
    <>
      <AdminPageHeader title={t('admin.moderation.title')} description={t('admin.moderation.description')} />

      <AdminCard>
        <div className={adminToolbar}>
          <div role="group" aria-label={t('admin.common.status')} className="flex rounded-lg bg-slate-100 p-0.5">
            {tabs.map(status => (
              <button
                key={status}
                type="button"
                aria-pressed={tab === status}
                onClick={() => {
                  setTab(status);
                  table.setPage(1);
                }}
                className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition sm:flex-none ${
                  tab === status ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}>
                {t(moderationStatusBadge[status].labelKey)}
                <span className="text-xs text-slate-400 tabular-nums">
                  {(data ?? []).filter(item => item.status === status).length}
                </span>
              </button>
            ))}
          </div>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.moderation.search')} />
          <AdminFilter
            label={t('admin.moderation.type')}
            value={table.filter('type')}
            onChange={value => table.setFilter('type', value)}
            options={[{value: ALL, label: t('admin.moderation.allTypes')}, ...optionsOf(moderationTypeLabel, t)]}
          />
        </div>

        {isLoading ? (
          <AdminLoadingState variant="table" />
        ) : table.rows.length ? (
          <ul className="divide-y divide-slate-100">
            {table.rows.map(item => {
              const Icon = typeIcon[item.type];
              return (
                <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{t(moderationTypeLabel[item.type])}</span>
                      <span aria-hidden>·</span>
                      <span>{format.relative(item.reportedAt)}</span>
                      <AdminStatusBadge tone="warning">{t(moderationReasonLabel[item.reason])}</AdminStatusBadge>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-900">{item.content}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <AdminAvatar name={item.author} size="sm" />
                      {item.author}
                    </p>
                  </div>
                  {item.status === 'pending' ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className={adminButton.secondary}
                        aria-label={t('admin.moderation.rejectItem', {name: item.content})}
                        onClick={() => setDecision({item, approve: false})}>
                        <IoClose size={16} aria-hidden />
                        {t('admin.moderation.reject')}
                      </button>
                      <button
                        type="button"
                        className={adminButton.primary}
                        aria-label={t('admin.moderation.approveItem', {name: item.content})}
                        onClick={() => setDecision({item, approve: true})}>
                        <IoCheckmark size={16} aria-hidden />
                        {t('admin.moderation.approve')}
                      </button>
                    </div>
                  ) : (
                    <AdminStatusBadge tone={moderationStatusBadge[item.status].tone}>
                      {t(moderationStatusBadge[item.status].labelKey)}
                    </AdminStatusBadge>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <NoResults onReset={table.reset} />
        )}
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>

      <AdminConfirmDialog
        open={!!decision}
        tone={decision?.approve ? 'primary' : 'danger'}
        title={t(decision?.approve ? 'admin.moderation.approveTitle' : 'admin.moderation.rejectTitle')}
        description={t(decision?.approve ? 'admin.moderation.approveText' : 'admin.moderation.rejectText')}
        confirmLabel={t(decision?.approve ? 'admin.moderation.approve' : 'admin.moderation.reject')}
        onCancel={() => setDecision(null)}
        onConfirm={() => {
          const {item, approve} = decision!;
          setDecision(null);
          decide.mutate(
            {id: item.id, status: approve ? 'approved' : 'rejected'},
            {
              onSuccess: () => toast.done(t(approve ? 'admin.moderation.approved' : 'admin.moderation.rejected')),
              onError: toast.failed,
            },
          );
        }}
      />
    </>
  );
}
