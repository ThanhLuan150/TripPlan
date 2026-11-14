import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {
  IoAlertCircleOutline,
  IoChatbubblesOutline,
  IoCheckmarkDoneOutline,
  IoCompassOutline,
  IoSparklesOutline,
  IoTrophyOutline,
} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';
import {apiStatus} from '@/lib/apiClient';
import {useProfile} from '@/hooks/useProfile';
import AdminEmptyState from '../components/AdminEmptyState';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminStatCard from '../components/AdminStatCard';
import {adminButton} from '../components/styles';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {useAdminUser} from '../users/hooks';
import UserDetailTabs from '../users/UserDetailTabs';
import UserDialogs, {type UserDialogState} from '../users/UserDialogs';
import UserProfileHeader from '../users/UserProfileHeader';
import {isSelf} from '../users/userRules';

// /admin/users/:id — one account: profile, statistics and the detail tabs.
export default function UserDetailsPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const navigate = useNavigate();
  const {id} = useParams();
  const {user: me} = useProfile();
  const {data, isLoading, isError, error, refetch} = useAdminUser(id);
  const [dialog, setDialog] = useState<UserDialogState | null>(null);

  if (isLoading) {
    return <AdminLoadingState />;
  }
  if (isError || !data) {
    const missing = apiStatus(error) === 404;
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <AdminEmptyState
          icon={IoAlertCircleOutline}
          title={missing ? t('admin.users.notFound') : t('admin.users.errors.loadFailed')}
          description={missing ? t('admin.users.notFoundHint') : t('admin.users.errors.loadFailedHint')}
          action={
            missing ? (
              <Link to={adminRoutes.users} className={adminButton.secondary}>
                {t('admin.users.backToUsers')}
              </Link>
            ) : (
              <button type="button" className={adminButton.secondary} onClick={() => refetch()}>
                {t('admin.common.refresh')}
              </button>
            )
          }
        />
      </div>
    );
  }

  const {user} = data;
  const self = isSelf(user, me?.username);
  return (
    <>
      <UserProfileHeader user={user} self={self} onAction={kind => setDialog({kind, users: [user]})} />

      <section aria-label={t('admin.users.statistics')} className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <AdminStatCard label={t('admin.users.stats.totalTrips')} value={format.number(user.totalTrips)} icon={IoCompassOutline} />
        <AdminStatCard label={t('admin.users.stats.completedTrips')} value={format.number(user.completedTrips)} icon={IoCheckmarkDoneOutline} />
        <AdminStatCard label={t('admin.users.stats.challengesJoined')} value={format.number(user.challengesJoined)} icon={IoTrophyOutline} />
        <AdminStatCard label={t('admin.users.stats.points')} value={format.number(user.experience)} icon={IoSparklesOutline} />
        <AdminStatCard label={t('admin.users.stats.aiConversations')} value={format.number(data.aiConversations)} icon={IoChatbubblesOutline} />
      </section>

      <UserDetailTabs detail={data} />

      <UserDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onDone={kind => {
          if (kind === 'delete') {
            navigate(adminRoutes.users, {replace: true});
          }
        }}
      />
    </>
  );
}
