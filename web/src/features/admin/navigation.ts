import type {IconType} from 'react-icons';
import {
  IoBarChartOutline,
  IoGridOutline,
  IoImagesOutline,
  IoKeyOutline,
  IoMapOutline,
  IoNotificationsOutline,
  IoPeopleOutline,
  IoReceiptOutline,
  IoSettingsOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoTrophyOutline,
  IoVideocamOutline,
} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';

export interface AdminNavItem {
  to: string;
  labelKey: string;
  icon: IconType;
}

export interface AdminNavGroup {
  labelKey: string;
  items: AdminNavItem[];
}

// Sidebar menu of the admin panel; the breadcrumb and the page titles of the
// browser tab come from here too.
export const adminNav: AdminNavGroup[] = [
  {
    labelKey: 'admin.nav.groups.overview',
    items: [
      {to: adminRoutes.dashboard, labelKey: 'admin.nav.dashboard', icon: IoGridOutline},
      {to: adminRoutes.reports, labelKey: 'admin.nav.reports', icon: IoBarChartOutline},
    ],
  },
  {
    labelKey: 'admin.nav.groups.management',
    items: [
      {to: adminRoutes.users, labelKey: 'admin.nav.users', icon: IoPeopleOutline},
      {to: adminRoutes.trips, labelKey: 'admin.nav.trips', icon: IoMapOutline},
      {to: adminRoutes.challenges, labelKey: 'admin.nav.challenges', icon: IoTrophyOutline},
      {to: adminRoutes.ai, labelKey: 'admin.nav.ai', icon: IoSparklesOutline},
      {to: adminRoutes.home, labelKey: 'admin.nav.home', icon: IoImagesOutline},
      {to: adminRoutes.videos, labelKey: 'admin.nav.videos', icon: IoVideocamOutline},
      {to: adminRoutes.notifications, labelKey: 'admin.nav.notifications', icon: IoNotificationsOutline},
    ],
  },
  {
    labelKey: 'admin.nav.groups.system',
    items: [
      {to: adminRoutes.moderation, labelKey: 'admin.nav.moderation', icon: IoShieldCheckmarkOutline},
      {to: adminRoutes.activityLogs, labelKey: 'admin.nav.activityLogs', icon: IoReceiptOutline},
      {to: adminRoutes.roles, labelKey: 'admin.nav.roles', icon: IoKeyOutline},
      {to: adminRoutes.settings, labelKey: 'admin.nav.settings', icon: IoSettingsOutline},
    ],
  },
];

// The menu entry of a URL (sub-pages such as /admin/users/42 included)
export const findAdminNavItem = (pathname: string) =>
  adminNav
    .flatMap(group => group.items)
    .find(item => pathname === item.to || pathname.startsWith(`${item.to}/`));
