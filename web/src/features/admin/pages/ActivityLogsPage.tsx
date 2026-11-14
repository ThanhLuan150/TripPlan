import {useTranslation} from 'react-i18next';
import {IoDownloadOutline} from 'react-icons/io5';
import AdminAvatar from '../components/AdminAvatar';
import AdminCard from '../components/AdminCard';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminFilter from '../components/AdminFilter';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminPagination from '../components/AdminPagination';
import AdminSearch from '../components/AdminSearch';
import AdminStatusBadge from '../components/AdminStatusBadge';
import NoResults from '../components/NoResults';
import {adminButton, adminToolbar} from '../components/styles';
import {useAdminActivityLogs} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {downloadCsv} from '../csv';
import {ALL, useTableState} from '../hooks/useTableState';
import {logActionLabel, logLevelBadge, optionsOf} from '../status';
import type {AdminActivityLog} from '../types';

const exportLogs = (logs: AdminActivityLog[]) =>
  downloadCsv(
    ['time', 'actor', 'action', 'target', 'ip', 'level'],
    logs.map(log => [log.at, log.actor, log.action, log.target, log.ip, log.level]),
    'aloca-activity-log.csv',
  );

export default function ActivityLogsPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const {data, isLoading} = useAdminActivityLogs();
  const table = useTableState(data, {
    searchText: log => `${log.actor} ${log.target} ${log.ip}`,
    filters: {
      level: (log, value) => log.level === value,
      action: (log, value) => log.action === value,
    },
    pageSize: 10,
  });

  const columns: AdminColumn<AdminActivityLog>[] = [
    {
      key: 'time',
      header: t('admin.activityLogs.columns.time'),
      cell: log => (
        <span className="whitespace-nowrap tabular-nums">
          {format.dateTime(log.at)}
          <span className="block text-xs text-slate-500">{format.relative(log.at)}</span>
        </span>
      ),
    },
    {
      key: 'actor',
      header: t('admin.activityLogs.columns.actor'),
      cell: log => (
        <div className="flex items-center gap-2.5">
          <AdminAvatar name={log.actor} size="sm" />
          <span className="truncate">{log.actor}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: t('admin.activityLogs.columns.action'),
      cell: log => (
        <span className="font-medium text-slate-900">{t(logActionLabel[log.action] ?? `admin.activityLogs.actions.${log.action}`, {defaultValue: log.action})}</span>
      ),
    },
    {
      key: 'target',
      header: t('admin.activityLogs.columns.target'),
      hideBelow: 'md',
      cell: log => <span className="block max-w-56 truncate">{log.target}</span>,
    },
    {
      key: 'ip',
      header: t('admin.activityLogs.columns.ip'),
      hideBelow: 'xl',
      cell: log => <span className="font-mono text-xs text-slate-500">{log.ip}</span>,
    },
    {
      key: 'level',
      header: t('admin.activityLogs.columns.level'),
      cell: log => (
        <AdminStatusBadge tone={logLevelBadge[log.level].tone}>{t(logLevelBadge[log.level].labelKey)}</AdminStatusBadge>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.activityLogs.title')}
        description={t('admin.activityLogs.description')}
        actions={
          <button
            type="button"
            className={adminButton.secondary}
            disabled={!table.total}
            onClick={() => exportLogs(table.all)}>
            <IoDownloadOutline size={16} aria-hidden />
            {t('admin.common.export')}
          </button>
        }
      />

      <AdminCard>
        <div className={adminToolbar}>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.activityLogs.search')} />
          <AdminFilter
            label={t('admin.activityLogs.columns.action')}
            value={table.filter('action')}
            onChange={value => table.setFilter('action', value)}
            options={[{value: ALL, label: t('admin.activityLogs.allActions')}, ...optionsOf(logActionLabel, t)]}
          />
          <AdminFilter
            label={t('admin.activityLogs.columns.level')}
            value={table.filter('level')}
            onChange={value => table.setFilter('level', value)}
            options={[{value: ALL, label: t('admin.activityLogs.allLevels')}, ...optionsOf(logLevelBadge, t)]}
          />
        </div>
        <AdminDataTable
          caption={t('admin.activityLogs.title')}
          columns={columns}
          rows={table.rows}
          rowKey={log => log.id}
          loading={isLoading}
          empty={<NoResults onReset={table.reset} />}
        />
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>
    </>
  );
}
