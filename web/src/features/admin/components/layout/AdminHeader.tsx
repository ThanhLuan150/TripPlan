import {useTranslation} from 'react-i18next';
import {IoMenu} from 'react-icons/io5';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import type {AdminNavItem} from '../../navigation';
import {adminIconButton} from '../styles';
import AdminBreadcrumb from './AdminBreadcrumb';
import AdminNotificationMenu from './AdminNotificationMenu';
import AdminUserMenu from './AdminUserMenu';
import {SIDEBAR_ID} from './AdminSidebar';

// Top bar: menu button (phones / tablets), breadcrumb, language, alerts, account.
export default function AdminHeader({
  current,
  menuOpen,
  onOpenMenu,
}: {
  current?: AdminNavItem;
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const {t} = useTranslation();
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 sm:gap-3 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('admin.layout.openMenu')}
        aria-controls={SIDEBAR_ID}
        aria-expanded={menuOpen}
        className={`${adminIconButton} -ml-1.5 size-9 lg:hidden`}>
        <IoMenu size={22} aria-hidden />
      </button>
      <AdminBreadcrumb current={current} />
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="mr-1 hidden sm:block">
          <LanguageSwitcher />
        </div>
        <AdminNotificationMenu />
        <AdminUserMenu />
      </div>
    </header>
  );
}
