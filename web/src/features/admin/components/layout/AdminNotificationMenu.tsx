import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoNotificationsOutline} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';
import {useAdminAlerts} from '../../hooks/useAdminData';
import {useAdminFormat} from '../../hooks/useAdminFormat';
import {useDropdown} from '../../hooks/useDropdown';
import {alertLabel} from '../../status';
import type {AdminAlertType} from '../../types';
import {adminIconButton} from '../styles';

const alertLink: Record<AdminAlertType, string> = {
  newUsers: adminRoutes.users,
  pendingModeration: adminRoutes.moderation,
  aiErrors: adminRoutes.ai,
  reportReady: adminRoutes.reports,
};

// Bell of the admin header: unread count + the latest alerts. "Read" is kept
// in memory only (UI phase, no API).
export default function AdminNotificationMenu() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const {open, toggle, close, ref} = useDropdown();
  const {data = []} = useAdminAlerts();
  const [readIds, setReadIds] = useState<string[]>([]);

  const alerts = data.map(alert => ({...alert, read: alert.read || readIds.includes(alert.id)}));
  const unread = alerts.filter(alert => !alert.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={t('admin.layout.notificationsLabel', {count: unread})}
        className={`${adminIconButton} relative size-9`}>
        <IoNotificationsOutline size={20} aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label={t('admin.layout.notifications')}
          className="fixed inset-x-4 top-[4.25rem] z-50 animate-pop-in rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{t('admin.layout.notifications')}</p>
            <button
              type="button"
              disabled={!unread}
              onClick={() => setReadIds(alerts.map(alert => alert.id))}
              className="text-xs font-medium text-brand-700 transition hover:text-brand-800 disabled:text-slate-400">
              {t('admin.layout.markAllRead')}
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {alerts.map(alert => (
              <li key={alert.id}>
                <Link
                  to={alertLink[alert.type]}
                  onClick={() => {
                    setReadIds(ids => [...ids, alert.id]);
                    close();
                  }}
                  className="flex gap-3 px-4 py-3 transition hover:bg-slate-50">
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${alert.read ? 'bg-transparent' : 'bg-brand-600'}`}
                  />
                  <span className="min-w-0">
                    <span className={`block text-sm ${alert.read ? 'text-slate-600' : 'font-medium text-slate-900'}`}>
                      {t(alertLabel[alert.type], {count: alert.count})}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{format.relative(alert.at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
