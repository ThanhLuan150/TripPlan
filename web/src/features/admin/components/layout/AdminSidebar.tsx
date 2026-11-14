import {Link, NavLink} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoChevronBack, IoChevronForward, IoClose} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';
import logo from '@/assets/images/Icon.png';
import {adminNav} from '../../navigation';
import {adminIconButton} from '../styles';

export const SIDEBAR_ID = 'admin-sidebar';

// Left menu. Desktop (lg+): always visible, collapsible to icons only.
// Phones / tablets: a drawer opened from the header.
export default function AdminSidebar({
  collapsed,
  onToggleCollapsed,
  open,
  onClose,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const {t} = useTranslation();
  // labels stay readable by screen readers when collapsed
  const label = collapsed ? 'lg:sr-only' : '';

  return (
    <>
      {open && (
        <div
          data-testid="admin-sidebar-backdrop"
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-40 animate-fade-in bg-slate-900/40 lg:hidden"
        />
      )}
      <aside
        id={SIDEBAR_ID}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-[width,translate] duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full max-lg:invisible'
        } ${collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}`}>
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-4">
          <Link
            to={adminRoutes.dashboard}
            onClick={onClose}
            className={`flex min-w-0 items-center gap-2.5 ${collapsed ? 'lg:mx-auto' : ''}`}>
            <img src={logo} alt="" className="size-9 shrink-0 rounded-lg" />
            <span className={`min-w-0 leading-tight ${label}`}>
              <span className="block text-base font-bold tracking-tight text-slate-900">Aloca</span>
              <span className="block text-xs text-slate-500">{t('admin.panel')}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('admin.layout.closeMenu')}
            className={`${adminIconButton} ml-auto lg:hidden`}>
            <IoClose size={20} aria-hidden />
          </button>
        </div>

        <nav aria-label={t('admin.nav.label')} className="flex-1 overflow-y-auto px-3 py-4">
          {adminNav.map(group => (
            <div key={group.labelKey} className="mb-5 last:mb-0">
              <p
                className={`px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase ${
                  collapsed ? 'lg:hidden' : ''
                }`}>
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      title={collapsed ? t(item.labelKey) : undefined}
                      className={({isActive}) =>
                        `flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                          collapsed ? 'lg:justify-center lg:px-0' : ''
                        } ${
                          isActive
                            ? 'bg-brand-50 text-brand-800'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }>
                      <item.icon size={18} aria-hidden className="shrink-0" />
                      <span className={`truncate ${label}`}>{t(item.labelKey)}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-slate-100 p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-controls={SIDEBAR_ID}
            aria-expanded={!collapsed}
            className={`flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${
              collapsed ? 'justify-center px-0' : ''
            }`}>
            {collapsed ? <IoChevronForward size={18} aria-hidden /> : <IoChevronBack size={18} aria-hidden />}
            <span className={label}>{t(collapsed ? 'admin.layout.expand' : 'admin.layout.collapse')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
