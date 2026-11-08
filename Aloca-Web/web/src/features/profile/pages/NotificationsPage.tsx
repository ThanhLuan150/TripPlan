import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {IoNotificationsOffOutline} from 'react-icons/io5';
import Page from '@/components/layout/Page';
import {profileApi} from '../api/profileApi';
import genz from '@/assets/images/Genz.png';

export default function NotificationsPage() {
  const {t} = useTranslation();
  const {data, isLoading} = useQuery({
    queryKey: ['notifications'],
    queryFn: profileApi.notifications,
  });

  return (
    <Page title={t('profile.notificationsTitle')}>
      <div className="space-y-3">
        {isLoading &&
          [0, 1, 2].map(i => (
            <div key={i} className="card flex animate-pulse items-center gap-4 p-4">
              <div className="size-12 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        {!isLoading && !data?.length && (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-slate-500">
            <IoNotificationsOffOutline size={36} className="text-slate-300" />
            {t('profile.noNotifications')}
          </div>
        )}
        {data?.map(item => (
          <div key={item.id.toString()} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
            <img src={genz} alt="" className="size-12 shrink-0 rounded-full" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
