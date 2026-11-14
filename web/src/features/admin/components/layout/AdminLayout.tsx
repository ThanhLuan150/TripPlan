import {useEffect, useState} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {storage} from '@/lib/storage';
import {findAdminNavItem} from '../../navigation';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

// Remembered between visits (like the language: aloca.lang)
export const SIDEBAR_COLLAPSED_KEY = 'aloca.admin.sidebarCollapsed';

// Shell of every /admin page: sidebar + header + the page.
export default function AdminLayout() {
  const {t} = useTranslation();
  const {pathname} = useLocation();
  const current = findAdminNavItem(pathname);
  const [collapsed, setCollapsed] = useState(() => storage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleCollapsed = () => {
    storage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '0' : '1');
    setCollapsed(!collapsed);
  };
  const closeMenu = () => setMenuOpen(false);

  // "Người dùng · Aloca Admin" in the browser tab
  const pageTitle = current ? `${t(current.labelKey)} · ${t('admin.title')}` : t('admin.title');
  useEffect(() => {
    const previous = document.title;
    document.title = pageTitle;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);

  // the drawer (phones / tablets) closes with Escape
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-dvh bg-slate-50">
      <a
        href="#admin-main"
        className="sr-only z-[60] rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {t('admin.layout.skipToContent')}
      </a>
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        open={menuOpen}
        onClose={closeMenu}
      />
      <div
        className={`flex min-h-dvh flex-col transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
        }`}>
        <AdminHeader current={current} menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
