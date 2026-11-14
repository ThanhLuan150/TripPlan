import {useTranslation} from 'react-i18next';
import {IoCheckmarkCircleOutline, IoPauseCircleOutline, IoPeopleOutline, IoPersonAddOutline} from 'react-icons/io5';
import AdminStatCard from '../components/AdminStatCard';
import {useAdminFormat} from '../hooks/useAdminFormat';
import type {AdminUser} from '../types';
import {userCounts} from './userList';

// Total / active / new (last 30 days) / suspended accounts, counted from the
// same list the table shows (deleted accounts are left out).
export default function UserStats({users}: {users: AdminUser[]}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const counts = userCounts(users);
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <AdminStatCard label={t('admin.users.stats.total')} value={format.number(counts.total)} icon={IoPeopleOutline} />
      <AdminStatCard
        label={t('admin.users.stats.active')}
        value={format.number(counts.active)}
        icon={IoCheckmarkCircleOutline}
      />
      <AdminStatCard
        label={t('admin.users.stats.new')}
        value={format.number(counts.created)}
        icon={IoPersonAddOutline}
        delta={counts.createdDelta}
        deltaLabel={t('admin.common.vsPreviousPeriod')}
      />
      <AdminStatCard
        label={t('admin.users.stats.suspended')}
        value={format.number(counts.suspended)}
        icon={IoPauseCircleOutline}
        goodWhen="down"
      />
    </div>
  );
}
