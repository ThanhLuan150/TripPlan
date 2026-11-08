import axios from 'axios';
import {useQuery} from '@tanstack/react-query';
import {IoNotificationsOffOutline} from 'react-icons/io5';
import Page from '../Page';
import genz from '../../assets/images/Genz.png';

interface NotificationItem {
  id: string | number;
  name: string;
  description: string;
}

export default function Notification() {
  // Same demo data source as the mobile app.
  const {data, isLoading} = useQuery<NotificationItem[]>({
    queryKey: ['getData'],
    queryFn: async () => {
      const ShowNotification = await axios.get(
        'https://645e542e8d08100293fcd90e.mockapi.io/sinhvien',
      );
      return ShowNotification.data;
    },
  });

  return (
    <Page title="Thông báo của bạn">
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
            Bạn chưa có thông báo nào.
          </div>
        )}
        {data?.map(item => (
          <div
            key={item.id.toString()}
            className="card flex items-center gap-4 p-4 transition hover:shadow-md">
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
