import {useTranslation} from 'react-i18next';
import {
  IoChatbubblesOutline,
  IoSparklesOutline,
  IoPeopleOutline,
} from 'react-icons/io5';
import AdminBarChart from '../components/AdminBarChart';
import AdminCard from '../components/AdminCard';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminPagination from '../components/AdminPagination';
import AdminSearch from '../components/AdminSearch';
import AdminStatCard from '../components/AdminStatCard';
import NoResults from '../components/NoResults';
import {adminToolbar} from '../components/styles';
import {useAdminAi} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {useTableState} from '../hooks/useTableState';
import type {AdminAiChat} from '../types';

// Usage of the AI assistant (Gemini, through the backend chat API).
export default function AiPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const {data, isLoading} = useAdminAi();
  const table = useTableState(data?.chats, {
    searchText: chat => `${chat.title} ${chat.user}`,
  });

  const columns: AdminColumn<AdminAiChat>[] = [
    {
      key: 'title',
      header: t('admin.ai.columns.title'),
      cell: chat => (
        <div className="max-w-44 min-w-0 sm:max-w-72">
          <p className="truncate font-medium text-slate-900">{chat.title}</p>
          <p className="truncate text-xs text-slate-500 md:hidden">{chat.user}</p>
        </div>
      ),
    },
    {key: 'user', header: t('admin.ai.columns.user'), hideBelow: 'md', cell: chat => chat.user},
    {
      key: 'messages',
      header: t('admin.ai.columns.messages'),
      align: 'right',
      cell: chat => <span className="tabular-nums">{chat.messages}</span>,
    },
    {
      key: 'updated',
      header: t('admin.ai.columns.updated'),
      hideBelow: 'lg',
      cell: chat => <span className="whitespace-nowrap">{format.relative(chat.updatedAt)}</span>,
    },
  ];

  return (
    <>
      <AdminPageHeader title={t('admin.ai.title')} description={t('admin.ai.description')} />

      {!data ? (
        <AdminLoadingState variant="cards" />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <AdminStatCard
              label={t('admin.ai.stats.conversations')}
              value={format.number(data.stats.conversations.value)}
              delta={data.stats.conversations.delta}
              deltaLabel={t('admin.common.vsLastMonth')}
              icon={IoChatbubblesOutline}
            />
            <AdminStatCard
              label={t('admin.ai.stats.messages')}
              value={format.compact(data.stats.messages.value)}
              delta={data.stats.messages.delta}
              deltaLabel={t('admin.common.vsLastMonth')}
              icon={IoSparklesOutline}
            />
            <AdminStatCard
              label={t('admin.ai.stats.activeUsers')}
              value={format.number(data.stats.activeUsers.value)}
              icon={IoPeopleOutline}
            />
            <AdminStatCard
              label={t('admin.ai.stats.avgMessages')}
              value={format.number(data.stats.avgMessages.value)}
              icon={IoChatbubblesOutline}
            />
          </div>
          <AdminCard className="mb-6" title={t('admin.ai.dailyMessages')} description={t('admin.ai.dailyMessagesHint')}>
            <div className="p-5">
              <AdminBarChart
                title={t('admin.ai.dailyMessages')}
                data={data.dailyMessages.map(point => ({label: format.day(point.date), value: point.value}))}
                format={format.number}
              />
            </div>
          </AdminCard>
        </>
      )}

      <AdminCard title={t('admin.ai.conversations')}>
        <div className={adminToolbar}>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.ai.search')} />
        </div>
        <AdminDataTable
          caption={t('admin.ai.conversations')}
          columns={columns}
          rows={table.rows}
          rowKey={chat => chat.id}
          loading={isLoading}
          empty={<NoResults onReset={table.reset} />}
        />
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>
    </>
  );
}
