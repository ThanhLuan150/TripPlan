import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoDownloadOutline, IoMapOutline, IoPersonAddOutline, IoTrophyOutline, IoWalletOutline} from 'react-icons/io5';
import AdminBarChart from '../components/AdminBarChart';
import AdminCard from '../components/AdminCard';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminFilter from '../components/AdminFilter';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminStatCard from '../components/AdminStatCard';
import {adminButton} from '../components/styles';
import {useAdminReports} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {downloadCsv} from '../csv';
import type {AdminReport, ReportPeriod} from '../types';

type ProvinceRow = AdminReport['provinces'][number];

const periods: Record<ReportPeriod, string> = {
  '7d': 'admin.reports.periods.7d',
  '30d': 'admin.reports.periods.30d',
  '90d': 'admin.reports.periods.90d',
};

const exportReport = (report: AdminReport, period: ReportPeriod) =>
  downloadCsv(
    ['section', 'name', 'value', 'extra'],
    [
      ['stat', 'newUsers', report.stats.newUsers.value, ''],
      ['stat', 'tripsCreated', report.stats.tripsCreated.value, ''],
      ['stat', 'completionRate', report.stats.completionRate.value, ''],
      ['stat', 'avgTripCost', report.stats.avgTripCost.value, ''],
      ...report.tripsCreated.map(point => ['trips', point.date, point.value, ''] as const).map(row => [...row]),
      ...report.provinces.map(row => ['province', row.name, row.trips, row.avgCost]),
    ],
    `aloca-report-${period}.csv`,
  );

export default function ReportsPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const [period, setPeriod] = useState<ReportPeriod>('30d');
  const {data: report} = useAdminReports(period);
  const vsPrevious = t('admin.common.vsPreviousPeriod');

  const columns: AdminColumn<ProvinceRow>[] = [
    {key: 'name', header: t('admin.reports.columns.province'), cell: row => <span className="font-medium text-slate-900">{row.name}</span>},
    {
      key: 'trips',
      header: t('admin.reports.columns.trips'),
      align: 'right',
      cell: row => <span className="tabular-nums">{format.number(row.trips)}</span>,
    },
    {
      key: 'avgCost',
      header: t('admin.reports.columns.avgCost'),
      align: 'right',
      cell: row => <span className="whitespace-nowrap tabular-nums">{format.currency(row.avgCost)}</span>,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.reports.title')}
        description={t('admin.reports.description')}
        actions={
          <>
            <AdminFilter
              label={t('admin.reports.period')}
              value={period}
              onChange={value => setPeriod(value as ReportPeriod)}
              options={(Object.keys(periods) as ReportPeriod[]).map(value => ({value, label: t(periods[value])}))}
            />
            <button type="button" className={adminButton.secondary} disabled={!report} onClick={() => report && exportReport(report, period)}>
              <IoDownloadOutline size={16} aria-hidden />
              {t('admin.common.export')}
            </button>
          </>
        }
      />

      {!report ? (
        <AdminLoadingState variant="cards" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <AdminStatCard
              label={t('admin.reports.stats.newUsers')}
              value={format.number(report.stats.newUsers.value)}
              delta={report.stats.newUsers.delta}
              deltaLabel={vsPrevious}
              icon={IoPersonAddOutline}
            />
            <AdminStatCard
              label={t('admin.reports.stats.tripsCreated')}
              value={format.number(report.stats.tripsCreated.value)}
              delta={report.stats.tripsCreated.delta}
              deltaLabel={vsPrevious}
              icon={IoMapOutline}
            />
            <AdminStatCard
              label={t('admin.reports.stats.completionRate')}
              value={format.percent(report.stats.completionRate.value)}
              delta={report.stats.completionRate.delta}
              deltaLabel={vsPrevious}
              icon={IoTrophyOutline}
            />
            <AdminStatCard
              label={t('admin.reports.stats.avgTripCost')}
              value={format.currency(report.stats.avgTripCost.value)}
              delta={report.stats.avgTripCost.delta}
              deltaLabel={vsPrevious}
              icon={IoWalletOutline}
            />
          </div>

          <div className="grid gap-6 2xl:grid-cols-5">
            <AdminCard className="2xl:col-span-3" title={t('admin.reports.tripsCreated')} description={t(periods[period])}>
              <div className="p-5">
                <AdminBarChart
                  title={t('admin.reports.tripsCreated')}
                  data={report.tripsCreated.map(point => ({label: format.day(point.date), value: point.value}))}
                  format={format.number}
                />
              </div>
            </AdminCard>
            <AdminCard className="2xl:col-span-2" title={t('admin.reports.byProvince')} description={t(periods[period])}>
              <AdminDataTable
                caption={t('admin.reports.byProvince')}
                columns={columns}
                rows={report.provinces}
                rowKey={row => row.name}
                empty={null}
              />
            </AdminCard>
          </div>
        </div>
      )}
    </>
  );
}
