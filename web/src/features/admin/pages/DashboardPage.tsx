import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
  IoChatbubblesOutline,
  IoMapOutline,
  IoPeopleOutline,
  IoRefresh,
  IoShieldCheckmarkOutline,
  IoTrophyOutline,
} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';
import AdminAvatar from '../components/AdminAvatar';
import AdminBarChart from '../components/AdminBarChart';
import AdminCard from '../components/AdminCard';
import AdminEmptyState from '../components/AdminEmptyState';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminMeter from '../components/AdminMeter';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminStatCard from '../components/AdminStatCard';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminButton, adminLink} from '../components/styles';
import {useAdminActivityLogs, useAdminDashboard, useAdminModeration} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {logActionLabel, logLevelBadge, moderationReasonLabel, moderationTypeLabel} from '../status';
import type {AdminDashboard} from '../types';

const statCards: {key: keyof AdminDashboard['stats']; labelKey: string; icon: typeof IoPeopleOutline}[] = [
  {key: 'users', labelKey: 'admin.dashboard.stats.users', icon: IoPeopleOutline},
  {key: 'trips', labelKey: 'admin.dashboard.stats.trips', icon: IoMapOutline},
  {key: 'challengesCompleted', labelKey: 'admin.dashboard.stats.challengesCompleted', icon: IoTrophyOutline},
  {key: 'aiChats', labelKey: 'admin.dashboard.stats.aiChats', icon: IoChatbubblesOutline},
];

export default function DashboardPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const {data, refetch, isFetching} = useAdminDashboard();
  const logs = useAdminActivityLogs();
  const moderation = useAdminModeration();
  const pending = moderation.data?.filter(item => item.status === 'pending');
  const topTrips = data ? data.topDestinations[0].trips : 1;

  return (
    <>
      <AdminPageHeader
        title={t('admin.dashboard.title')}
        description={t('admin.dashboard.description')}
        actions={
          <button type="button" className={adminButton.secondary} onClick={() => refetch()} disabled={isFetching}>
            <IoRefresh size={16} aria-hidden />
            {t('admin.common.refresh')}
          </button>
        }
      />

      {!data ? (
        <AdminLoadingState variant="cards" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {statCards.map(card => (
              <AdminStatCard
                key={card.key}
                label={t(card.labelKey)}
                value={format.number(data.stats[card.key].value)}
                delta={data.stats[card.key].delta}
                deltaLabel={t('admin.common.vsLastMonth')}
                icon={card.icon}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <AdminCard
              className="xl:col-span-2"
              title={t('admin.dashboard.newUsers')}
              description={t('admin.dashboard.newUsersHint')}>
              <div className="p-5">
                <AdminBarChart
                  title={t('admin.dashboard.newUsers')}
                  data={data.newUsers.map(point => ({label: format.month(point.date), value: point.value}))}
                  format={format.number}
                />
              </div>
            </AdminCard>
            <AdminCard title={t('admin.dashboard.topDestinations')} description={t('admin.dashboard.topDestinationsHint')}>
              <ol className="space-y-4 p-5">
                {data.topDestinations.map((place, i) => (
                  <li key={place.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">
                        <span className="mr-2 text-slate-400 tabular-nums">{i + 1}</span>
                        {place.name}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {t('admin.dashboard.tripsCount', {count: place.trips, value: format.number(place.trips)})}
                      </span>
                    </div>
                    <AdminMeter ratio={place.trips / topTrips} />
                  </li>
                ))}
              </ol>
            </AdminCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminCard
              title={t('admin.dashboard.recentActivity')}
              actions={
                <Link to={adminRoutes.activityLogs} className={adminLink}>
                  {t('admin.common.viewAll')}
                </Link>
              }>
              {logs.data ? (
                <ul className="divide-y divide-slate-100">
                  {logs.data.slice(0, 6).map(log => (
                    <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                      <AdminAvatar name={log.actor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800">
                          <span className="font-medium">{log.actor}</span> · {t(logActionLabel[log.action])}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {log.target} · {format.relative(log.at)}
                        </p>
                      </div>
                      {/* routine entries need no badge; only what needs attention */}
                      {log.level !== 'info' && (
                        <AdminStatusBadge tone={logLevelBadge[log.level].tone}>
                          {t(logLevelBadge[log.level].labelKey)}
                        </AdminStatusBadge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <AdminLoadingState />
              )}
            </AdminCard>

            <AdminCard
              title={t('admin.dashboard.pendingModeration')}
              description={pending && t('admin.dashboard.pendingCount', {count: pending.length})}
              actions={
                <Link to={adminRoutes.moderation} className={adminLink}>
                  {t('admin.common.viewAll')}
                </Link>
              }>
              {!pending ? (
                <AdminLoadingState />
              ) : pending.length ? (
                <ul className="divide-y divide-slate-100">
                  {pending.slice(0, 5).map(item => (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700">
                        <IoShieldCheckmarkOutline size={14} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-800">{item.content}</p>
                        <p className="text-xs text-slate-500">
                          {t(moderationTypeLabel[item.type])} · {item.author} · {format.relative(item.reportedAt)}
                        </p>
                      </div>
                      <AdminStatusBadge tone="warning">{t(moderationReasonLabel[item.reason])}</AdminStatusBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <AdminEmptyState icon={IoShieldCheckmarkOutline} title={t('admin.moderation.emptyTitle')} />
              )}
            </AdminCard>
          </div>
        </div>
      )}
    </>
  );
}
